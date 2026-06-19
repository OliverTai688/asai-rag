import OpenAI from "openai";
import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import { theaterFieldBuildOutline } from "@/domains/interview/outlines";
import { buildTheaterFieldBuildContext } from "@/domains/interview/theater-build";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  persistTheaterBuildFailure,
  persistTheaterBuildSuccess,
} from "@/lib/theater/theater-build-ai-repository";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const requestSchema = z.object({
  clientId: z.string().trim().max(80).optional(),
  sessionId: z.string().trim().max(120).optional(),
  currentSegmentId: z.string().trim().max(120).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .max(24)
    .default([]),
  knownMaterials: z.array(z.string().trim().max(1200)).max(60).default([]),
});

const SYSTEM_PROMPT = `你是「誠問 AI 劇場導演訪談員」，任務是用劇場場域建構訪綱，訪談保險業務員，逐步建構出一個可演練的客戶劇場場域。

規則：
1. 全程使用繁體中文與白話。
2. 這是一場連續、自然的訪談；依訪綱段落順序逐步帶過，不跳段，也不要因為對方只回一句就急著換段。先把目前段落的核心題用對話問清楚，對方大致回答後再自然帶到下一段。
3. 回覆要短，最多 4 句；一次只問 1 個主要問題。
4. 嚴格區分「已確認事實 / 合理推論 / 待確認未知」，不要把推論說成事實，也不要替業務員杜撰客戶細節。
5. 目標是建構場域（焦點客戶、場景、陪演角色、關係張力、可能異議、敏感點），不是直接開演。
6. 陪演角色（NPC）最多 4 位，優先保留焦點客戶與最關鍵的決策者／影響者。
7. 資料不足時只補問缺口，不要硬生成劇情。
8. 不做商品建議或保證，不製造恐懼壓迫。
9. 後續系統會把訪談整理成「劇場場域建構包」，你現在只需要推進訪談。
10. 每則回覆最後，另起一行只輸出目前聚焦段落的隱藏標記，格式 [[SEG:<段落id>]]（使用下方列出的合法段落 id）；此標記僅供系統顯示進度，請勿在對話中提到或解釋它。`;

function buildOutlineContext(currentSegmentId?: string): string {
  const segments = theaterFieldBuildOutline.segments;
  const currentIndex = Math.max(
    0,
    segments.findIndex((segment) => segment.id === currentSegmentId),
  );

  const segmentLines = segments.map((segment, index) => {
    const marker = index === currentIndex ? "→ 目前段落 " : "  ";
    return `${marker}第 ${segment.order} 段（id:${segment.id}）｜${segment.title}：${segment.coreQuestions
      .map((question) => question.text)
      .join(" / ")}`;
  });

  return [
    `訪綱：${theaterFieldBuildOutline.name}`,
    `進行原則：${theaterFieldBuildOutline.principles.join("；")}`,
    `這是一場連續訪談，請從目前段落開始，依序自然帶過下列各段（不要跳段）：`,
    ...segmentLines,
    `合法段落 id：${segments.map((segment) => segment.id).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  let bodyForFailure: Partial<z.infer<typeof requestSchema>> = {};

  try {
    const session = await requireCurrentMember();
    const parsedBody = requestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_THEATER_BUILD_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    bodyForFailure = body;

    const quota = canUseAiModule(session, AiModule.THEATER);
    if (!quota.allowed) {
      return Response.json(
        {
          error: quota.code,
          remaining: quota.remaining,
          message: "AI 使用額度已用完，請聯絡管理員或升級方案。",
        },
        { status: 429 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      await persistTheaterBuildFailure({
        session,
        body,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const buildContext = buildTheaterFieldBuildContext({
      organizationId: session.organization.id,
      memberId: session.user.id,
      unitId: session.membership.primaryUnitId,
      clientId: body.clientId,
      sessionId: body.sessionId,
      currentSegmentId: body.currentSegmentId,
      messages: body.messages,
      knownMaterials: body.knownMaterials,
    });

    const promptContext = [
      buildOutlineContext(body.currentSegmentId),
      buildContext.promptContext,
      body.knownMaterials.length
        ? `目前已整理素材：\n${body.knownMaterials.map((item) => `- ${item}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\n${promptContext}` },
        ...body.messages.map((message) => ({ role: message.role, content: message.content })),
      ],
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 500,
      temperature: 0.6,
    });

    const encoder = new TextEncoder();
    let requestId: string | undefined;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let totalTokens: number | undefined;
    let assistantContent = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            requestId = chunk.id ?? requestId;
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens;
              completionTokens = chunk.usage.completion_tokens;
              totalTokens = chunk.usage.total_tokens;
            }

            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              assistantContent += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (error) {
          await persistTheaterBuildFailure({
            session,
            body,
            model: MODEL,
            requestId,
            latencyMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : "Theater build stream failed",
          });
          controller.error(error);
          return;
        }

        await persistTheaterBuildSuccess({
          session,
          body,
          assistantContent,
          usage: {
            model: MODEL,
            requestId,
            promptTokens,
            completionTokens,
            totalTokens,
            latencyMs: Date.now() - startedAt,
          },
        });
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    try {
      const session = await requireCurrentMember();
      await persistTheaterBuildFailure({
        session,
        body: bodyForFailure,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Theater build request failed",
      });
    } catch {
      return authErrorResponse(error);
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Theater build request failed" },
      { status: 500 },
    );
  }
}
