import OpenAI from "openai";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { advisorCompanionOutline } from "@/domains/interview/outlines";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

interface InterviewMessageInput {
  role: "user" | "assistant";
  content: string;
}

interface InterviewRequestBody {
  organizationId: string;
  unitId?: string;
  userId?: string;
  clientId?: string;
  sessionId?: string;
  currentSegmentId?: string;
  messages?: InterviewMessageInput[];
  knownMaterials?: string[];
}

const SYSTEM_PROMPT = `你是「誠問 AI 訪談 Agent」，任務是用顧問陪談訪綱訪談保險業務員。

規則：
1. 全程使用繁體中文與白話，不提 SPIN 這個術語。
2. 依訪綱段落順序主導訪談，不跳段。
3. 先確認當前段落的核心題；核心題未答完時，持續用自然方式追問。
4. 回覆要短，最多 4 句；一次只問 1 個主要問題。
5. 區分「已知事實、合理推論、待確認」，不要把推論說成事實。
6. 若素材不足，不要硬產出結論，請追問缺口。
7. 不要做商品建議或保證，不要製造恐懼壓迫。
8. 訪談後續會由系統整理成客戶輪廓表與對話準備卡，你現在只需要推進訪談。`;

function buildOutlineContext(currentSegmentId?: string): string {
  const currentSegment = advisorCompanionOutline.segments.find((segment) => segment.id === currentSegmentId)
    ?? advisorCompanionOutline.segments[0];

  return [
    `訪綱：${advisorCompanionOutline.name}`,
    `進行原則：${advisorCompanionOutline.principles.join("；")}`,
    `目前段落：第 ${currentSegment.order} 段｜${currentSegment.title}`,
    `段落目標：${currentSegment.goal}`,
    `核心題：${currentSegment.coreQuestions.map((question) => question.text).join(" / ")}`,
    `可用追問：${currentSegment.followUps.map((question) => question.text).join(" / ")}`,
    currentSegment.guideNote ? `引導重點：${currentSegment.guideNote}` : "",
  ].filter(Boolean).join("\n");
}

function normalizeMessages(messages: InterviewMessageInput[] | undefined): OpenAI.Chat.ChatCompletionMessageParam[] {
  return (messages ?? []).map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  let body: InterviewRequestBody;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.organizationId) {
    return Response.json({ error: "organizationId is required for AiUsageLog" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    await writeAiUsageLogSafely({
      organizationId: body.organizationId,
      unitId: body.unitId,
      userId: body.userId,
      clientId: body.clientId,
      provider: AiProvider.OPENAI,
      module: AiModule.INTERVIEW,
      model: MODEL,
      latencyMs: Date.now() - startedAt,
      error: "OPENAI_API_KEY is not configured",
    });

    return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  const promptContext = [
    buildOutlineContext(body.currentSegmentId),
    body.knownMaterials?.length ? `目前已整理素材：\n${body.knownMaterials.map((item) => `- ${item}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${promptContext}` },
    ...normalizeMessages(body.messages),
  ];

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: openaiMessages,
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
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (error) {
          await writeAiUsageLogSafely({
            organizationId: body.organizationId,
            unitId: body.unitId,
            userId: body.userId,
            clientId: body.clientId,
            provider: AiProvider.OPENAI,
            module: AiModule.INTERVIEW,
            model: MODEL,
            latencyMs: Date.now() - startedAt,
            requestId,
            error: error instanceof Error ? error.message : "Interview stream failed",
          });
          controller.error(error);
          return;
        }

        await writeAiUsageLogSafely({
          organizationId: body.organizationId,
          unitId: body.unitId,
          userId: body.userId,
          clientId: body.clientId,
          provider: AiProvider.OPENAI,
          module: AiModule.INTERVIEW,
          model: MODEL,
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs: Date.now() - startedAt,
          requestId,
        });
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    await writeAiUsageLogSafely({
      organizationId: body.organizationId,
      unitId: body.unitId,
      userId: body.userId,
      clientId: body.clientId,
      provider: AiProvider.OPENAI,
      module: AiModule.INTERVIEW,
      model: MODEL,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Interview request failed",
    });

    return Response.json(
      { error: error instanceof Error ? error.message : "Interview request failed" },
      { status: 500 }
    );
  }
}
