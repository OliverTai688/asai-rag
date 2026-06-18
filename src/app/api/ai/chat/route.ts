import OpenAI from "openai";
import { z } from "zod";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  persistAssistantChatFailure,
  persistAssistantChatSuccess,
} from "@/lib/assistant/assistant-chat-repository";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
  context: z
    .object({
      route: z.string().trim().max(120).optional(),
      clientId: z.string().trim().max(80).optional(),
      clientName: z.string().trim().max(120).optional(),
      conversationId: z.string().trim().max(120).optional(),
    })
    .optional(),
});

type ChatRequestBody = z.infer<typeof chatRequestSchema>;

const ALLOWED_TOOL_ROUTES = new Set([
  "/dashboard",
  "/crm",
  "/spin",
  "/theater",
  "/pre-visit",
  "/reports",
  "/team",
  "/issues",
  "/settings",
]);

const SYSTEM_PROMPT = `你是 ASAI（誠問 AI）平台的智能助理，專為保險業務員設計的跨領域副駕駛（Cross-Domain Copilot）。

## 平台功能與頁面
以下是平台所有可用的頁面，當用戶要求導航時，使用對應的工具指令：
- 總覽 / 首頁 → [[TOOL:NAVIGATE:/dashboard]]
- 客戶管理 / CRM → [[TOOL:NAVIGATE:/crm]]
- SPIN 對話 → [[TOOL:NAVIGATE:/spin]]
- 劇場演練 → [[TOOL:NAVIGATE:/theater]]
- 訪前規劃 → [[TOOL:NAVIGATE:/pre-visit]]
- 分析報告 / 高風險報告 → [[TOOL:NAVIGATE:/reports]]
- 團隊管理 → [[TOOL:NAVIGATE:/team]]
- 議題單 → [[TOOL:NAVIGATE:/issues]]
- 個人設定 → [[TOOL:NAVIGATE:/settings]]

## 工具指令格式
當需要導航時，在回應末尾加上：[[TOOL:NAVIGATE:/路徑]]
當需要開啟新增客戶表單時：[[TOOL:OPEN_MODAL:ADD_CLIENT]]
當需要標示洞察面板時：[[TOOL:HIGHLIGHT:INSIGHTS]]

## 你的能力與風格
1. **智能導航**：理解用戶意圖，自動導航至正確頁面，並在導航前先說明你要做什麼
2. **數據洞察**：根據上下文提供業務分析與建議（CRM、SPIN、報告等）
3. **情境感知**：根據 context.route 了解用戶目前在哪個頁面，提供更精準的建議
4. **回覆語言**：一律使用繁體中文，語氣專業但親切
5. **簡潔明瞭**：回覆聚焦在用戶需求，不冗長，最多 3-4 句話

記住：你是一個真實能執行動作的助理，不只是對話，你能真正幫助用戶切換頁面和取得資訊。`;

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const session = await requireCurrentMember();
    const parsedBody = chatRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_CHAT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const quota = canUseAiModule(session, AiModule.CHAT);

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

    const body = parsedBody.data;

    if (!process.env.OPENAI_API_KEY) {
      await persistAssistantChatFailure({
        session,
        body,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const openaiMessages = buildOpenAiMessages(body);
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: openaiMessages,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 500,
      temperature: 0.7,
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
          await persistAssistantChatFailure({
            session,
            body,
            model: MODEL,
            requestId,
            latencyMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : "Assistant stream failed",
          });
          controller.error(error);
          return;
        }

        await persistAssistantChatSuccess({
          session,
          body,
          assistantContent,
          model: MODEL,
          requestId,
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs: Date.now() - startedAt,
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
      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        provider: AiProvider.OPENAI,
        module: AiModule.CHAT,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Assistant request failed",
      });
    } catch {
      return authErrorResponse(error);
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Assistant request failed" },
      { status: 500 },
    );
  }
}

function buildOpenAiMessages(body: ChatRequestBody): OpenAI.Chat.ChatCompletionMessageParam[] {
  const safeContext = body.context;
  const route = safeContext?.route && ALLOWED_TOOL_ROUTES.has(safeContext.route) ? safeContext.route : undefined;
  const contextNote = route
    ? `\n[目前頁面: ${route}${safeContext?.clientName ? `，正在查看客戶: ${safeContext.clientName}` : ""}]`
    : "";

  return [
    { role: "system", content: SYSTEM_PROMPT + contextNote },
    ...body.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}
