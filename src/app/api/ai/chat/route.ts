import OpenAI from "openai";
import { z } from "zod";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  ensureAssistantConversation,
  persistAssistantChatFailure,
  persistAssistantChatSuccess,
} from "@/lib/assistant/assistant-chat-repository";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import { ASSISTANT_TOOLS, executeAssistantTool } from "@/lib/assistant/assistant-tools";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";
const MAX_TOOL_ROUNDS = 3;

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

## 導航工具指令格式（寫在回應文字裡）
當需要導航時，在回應末尾加上：[[TOOL:NAVIGATE:/路徑]]
當需要開啟新增客戶表單時：[[TOOL:OPEN_MODAL:ADD_CLIENT]]
當需要標示洞察面板時：[[TOOL:HIGHLIGHT:INSIGHTS]]

## 資料查詢工具（function calling）
你可以呼叫以下函式來取得「目前登入業務員」的真實資料，再依資料回答：
- list_my_clients：查自己的客戶清單（待開發/高風險/最近未聯繫等）。
- get_client_summary：查單一客戶的家庭、保單、合規與 AI 標籤摘要。
- get_team_overview：查團隊彙總指標（僅主管/管理員，且只有彙總數字）。

## 回答資料型問題的鐵則
1. **先查再答**：被問到客戶清單、數量、達成率、高風險客戶、團隊指標，或**任何特定客戶**（例如「張志明是誰」「某某的近況」「某某的保障缺口」「他最近怎麼樣」）等任何「需要實際資料」的問題時，**一定要先呼叫對應的函式**——單一客戶用 get_client_summary（帶客戶姓名或 ID），客戶清單用 list_my_clients——再根據回傳資料回答。**在尚未呼叫工具之前，絕對禁止說「查無資料」或「找不到這位客戶」**；只有當工具實際回傳 CLIENT_NOT_FOUND 或空結果時，才能說查無此客戶。禁止憑空捏造數字或客戶名稱。
2. **權限交給系統判斷**：被問到團隊指標時，直接呼叫 get_team_overview，**不要自己假設使用者沒有權限**；權限由系統判斷。只有當工具實際回傳 NO_PERMISSION 時，才說明此角色無權限。
3. **找高風險客戶的方法**：呼叫 list_my_clients 取得完整清單（通常不需要帶 query），再依 tags、aiTags、年收入、最後互動時間等欄位自行判斷哪些屬於高風險或需優先處理，不要只用單一關鍵字過濾而漏掉客戶。
4. **忠於資料**：只陳述函式回傳的事實；資料為空或回傳 error 時，誠實說明「目前查無資料」，不要編造。
5. **導航＋回答可並行**：當用戶要求「分析…並跳轉到某頁」時，先查資料並做簡短分析，再在末尾加上對應 [[TOOL:NAVIGATE:/路徑]]。
6. **保護隱私**：team overview 只談彙總，不要把個別客戶明細混入團隊回答。

## 你的能力與風格
1. **智能導航**：理解用戶意圖，自動導航至正確頁面，並在導航前先說明你要做什麼。
2. **數據洞察**：透過上述函式取得真實資料後，提供具體的業務分析與建議。
3. **情境感知**：根據 context.route 了解用戶目前在哪個頁面，提供更精準的建議。
4. **回覆語言**：一律使用繁體中文，語氣專業但親切。
5. **簡潔明瞭**：回覆聚焦在用戶需求，不冗長；列客戶清單時可用條列。

記住：你是一個真實能執行動作的助理，能查真實資料、切換頁面並給出有依據的建議。`;

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

    const { conversationId, clientId } = await ensureAssistantConversation({ session, body });

    let requestId: string | undefined;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let assistantContent = "";

    try {
      // Resolve any data-tool calls first so the model can ground its answer in the
      // caller's real, session-scoped data, then settle on a final text answer.
      const conversation = buildOpenAiMessages(body);

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const isFinalRound = round === MAX_TOOL_ROUNDS;
        const completion = await client.chat.completions.create({
          model: MODEL,
          messages: conversation,
          tools: ASSISTANT_TOOLS,
          tool_choice: isFinalRound ? "none" : "auto",
          max_tokens: 700,
          temperature: 0.5,
        });

        requestId = completion.id ?? requestId;
        if (completion.usage) {
          promptTokens += completion.usage.prompt_tokens ?? 0;
          completionTokens += completion.usage.completion_tokens ?? 0;
          totalTokens += completion.usage.total_tokens ?? 0;
        }

        const message = completion.choices[0]?.message;
        const toolCalls = message?.tool_calls ?? [];

        if (!isFinalRound && toolCalls.length > 0) {
          conversation.push({
            role: "assistant",
            content: message?.content ?? "",
            tool_calls: toolCalls,
          });

          for (const call of toolCalls) {
            if (call.type !== "function") continue;
            const result = await executeAssistantTool(session, call.function.name, call.function.arguments);
            conversation.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            });
          }
          continue;
        }

        assistantContent = message?.content ?? "";
        break;
      }
    } catch (error) {
      await persistAssistantChatFailure({
        session,
        body,
        conversationId,
        clientId,
        model: MODEL,
        requestId,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Assistant completion failed",
      });

      return Response.json(
        { error: error instanceof Error ? error.message : "Assistant completion failed" },
        { status: 500 },
      );
    }

    await persistAssistantChatSuccess({
      session,
      body,
      conversationId,
      clientId,
      assistantContent,
      model: MODEL,
      requestId,
      promptTokens: promptTokens || undefined,
      completionTokens: completionTokens || undefined,
      totalTokens: totalTokens || undefined,
      latencyMs: Date.now() - startedAt,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        if (assistantContent) {
          controller.enqueue(encoder.encode(assistantContent));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Assistant-Conversation-Id": conversationId,
      },
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
  // Match the exact route, or a sub-route like /crm/<clientId> back to its allowed base.
  const rawRoute = safeContext?.route;
  const route = rawRoute
    ? ALLOWED_TOOL_ROUTES.has(rawRoute)
      ? rawRoute
      : [...ALLOWED_TOOL_ROUTES].find((base) => rawRoute.startsWith(`${base}/`))
    : undefined;

  const activeClientName = safeContext?.clientName?.trim();
  const contextParts: string[] = [];
  if (route) contextParts.push(`目前頁面: ${route}`);
  if (activeClientName) {
    contextParts.push(
      `正在查看客戶: ${activeClientName}（若用戶以代名詞或省略主詞詢問此客戶，請先用 get_client_summary 取得其資料再回答）`,
    );
  }
  const contextNote = contextParts.length > 0 ? `\n[${contextParts.join("；")}]` : "";

  return [
    { role: "system", content: SYSTEM_PROMPT + contextNote },
    ...body.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}
