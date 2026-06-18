import OpenAI from "openai";
import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  persistTheaterCharacterSuccess,
  persistTheaterFailure,
  type TheaterAiTurn,
} from "@/lib/theater/theater-ai-repository";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const theaterRequestSchema = z.object({
  sessionId: z.string().trim().max(120).optional(),
  clientId: z.string().trim().max(80).optional(),
  personaType: z.enum(["CONSERVATIVE", "SKEPTICAL", "BUSY", "EMOTIONAL"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  tension: z.coerce.number().int().min(0).max(100).default(30),
  clientContext: z
    .object({
      id: z.string().trim().max(80).optional(),
      name: z.string().trim().max(120).optional(),
      occupation: z.string().trim().max(120).optional(),
      annualIncome: z.union([z.string(), z.number()]).optional(),
      family: z.unknown().optional(),
    })
    .passthrough()
    .optional(),
  spinOutputs: z.unknown().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["agent", "client"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .max(24)
    .default([]),
});

type TheaterRequestBody = z.infer<typeof theaterRequestSchema>;

const SYSTEM_PROMPT = `你現在正在參與一場保險銷售的「劇場演練」。你扮演的是「客戶」。
你的目標是與銷售員（使用者）進行真實的對話。

### 核心禁令 (IMPORTANT)：
1. **絕對禁止反客為主**：你不是銷售員，也不是 AI 助手。不要問「有什麼我可以幫忙的嗎？」或「對保險有什麼疑問？」。
2. **絕對禁止承認 AI 身份**：你是一個有血有肉的人類，有家庭、有工作、有煩惱。
3. **禁止專業指導**：不要給予銷售建議，除非演練結束。

### 你的行為準則：
1. **角色扮演**：嚴格遵守指定的人格特質（如：懷疑論者、忙碌、感性、保守）。
2. **對話風格**：像真實的人類一樣對話。口語化，多用「我」、「我們家」、「我太太/先生說」等詞彙。
3. **反應機制**：
   - 根據「緊張度 (Tension)」調整情緒。高緊張度（>70%）時，你應該表現得更防禦、不耐煩、甚至想結束對話。
   - 根據「難度 (Difficulty)」調整挑戰性。
     - EASY：較容易被說服，會給予正面回饋。
     - MEDIUM：會提出合理的疑問，需要邏輯支撐。
     - HARD：非常挑剔，會不斷質疑銷售員的意圖或方案的漏洞。
4. **背景脈絡**：參考提供的「客戶資訊」。如果銷售員提到的點與你的背景相符，請給予對應的反應。
5. **推動對話**：每次回覆不要太長（100字以內），結尾可以帶出一個疑問或反對意見。

請開始演練。你是客戶。`;

export async function POST(req: Request) {
  const startedAt = Date.now();
  let bodyForFailure: Partial<TheaterRequestBody> = {};

  try {
    const session = await requireCurrentMember();
    const parsedBody = theaterRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_THEATER_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    bodyForFailure = body;

    if (process.env.NODE_ENV === "production" && process.env.ENABLE_LEGACY_THEATER_DEMO !== "true") {
      return Response.json(
        {
          error: "THEATER_ROUTE_B_REQUIRED",
          message: "AI 劇場演練新版 Route B 尚未啟用，production 不開放 legacy demo flow。",
        },
        { status: 503 },
      );
    }

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
      await persistTheaterFailure({
        session,
        body,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const clientContext = body.clientContext;
    const clientName = clientContext?.name ?? "未命名客戶";
    const occupation = clientContext?.occupation ?? "未知職業";
    const annualIncome = clientContext?.annualIncome ?? "未知";
    const family = clientContext?.family ?? {};

    const personaInstructions = `
【當前演練設定】
- 角色：客戶 (${body.personaType})
- 難度：${body.difficulty}
- 當前緊張度：${body.tension}% (越高代表越防備/不耐煩)
- 個人背景：${clientName}，${occupation}，年收 ${annualIncome}。
- 家庭狀況：${JSON.stringify(family)}
- SPIN 思考點：${JSON.stringify(body.spinOutputs ?? {})}

請根據以上資訊，以「客戶」的身份回覆使用者（銷售員）。
`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: personaInstructions },
      ...body.history.map((h: TheaterAiTurn) => ({
        role: h.role === "agent" ? "user" : "assistant",
        content: h.content,
      }) satisfies OpenAI.Chat.ChatCompletionMessageParam),
    ];

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.9,
    });

    let requestId: string | undefined;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let totalTokens: number | undefined;
    let assistantContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            requestId = chunk.id ?? requestId;
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens;
              completionTokens = chunk.usage.completion_tokens;
              totalTokens = chunk.usage.total_tokens;
            }

            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              assistantContent += content;
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
        } catch (error) {
          await persistTheaterFailure({
            session,
            body,
            model: MODEL,
            requestId,
            latencyMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : "Theater stream failed",
          });
          controller.error(error);
          return;
        }

        await persistTheaterCharacterSuccess({
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

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    try {
      const session = await requireCurrentMember();
      await persistTheaterFailure({
        session,
        body: bodyForFailure,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Theater request failed",
      });
    } catch {
      return authErrorResponse(error);
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Theater request failed" },
      { status: 500 },
    );
  }
}
