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
import type { AssistantStreamEvent } from "@/domains/assistant/types";

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

## 工具（function calling）
你可以呼叫以下函式來取得真實資料、或實際幫業務員產出材料：
- list_my_clients：查自己的客戶清單（待開發/高風險/最近未聯繫等）。
- get_client_summary：查單一客戶的家庭、保單、合規與 AI 標籤摘要。
- get_team_overview：查團隊彙總指標（僅主管/管理員，且只有彙總數字）。
- **draft_visit_package：實際生成一份「訪前規劃 / 拜訪準備包」草稿**（拜訪目標、SPIN 提問、預期疑問、時間分配、應帶資料）。當用戶說「幫我準備拜訪」「生成拜訪問題」「幫我做某客戶的準備包」「幫我規劃拜訪某某」時，直接呼叫這個工具幫他做出來，不要只用文字描述步驟。若情境已提供正在查看的客戶ID，就帶入 clientId；否則帶 clientName。

## 幫用戶「做事」的原則
- 當用戶要的是一個「產出物」（拜訪準備包、拜訪問題等），呼叫對應的生成工具實際做出來，草稿會直接顯示在畫面上。
- 工具做完後，**不要把整包內容再用文字複述一遍**（畫面已經有卡片了）。只要用一兩句口語說明重點（涵蓋幾個目標、幾題提問、有哪些待確認的缺口），然後問對方「要不要我幫你存成訪前規劃？」之類的下一步。
- 生成前不用一步步問一堆問題；用情境已知的客戶與合理預設（拜訪目的不明就用初訪 FIRST_VISIT）先做出草稿，再讓對方微調。

## 回答資料型問題的鐵則
1. **先查再答**：被問到客戶清單、數量、達成率、高風險客戶、團隊指標，或**任何特定客戶**（例如「張志明是誰」「某某的近況」「某某的保障缺口」「他最近怎麼樣」）等任何「需要實際資料」的問題時，**一定要先呼叫對應的函式**——單一客戶用 get_client_summary（帶客戶姓名或 ID），客戶清單用 list_my_clients——再根據回傳資料回答。**在尚未呼叫工具之前，絕對禁止說「查無資料」或「找不到這位客戶」**；只有當工具實際回傳 CLIENT_NOT_FOUND 或空結果時，才能說查無此客戶。禁止憑空捏造數字或客戶名稱。
2. **權限交給系統判斷**：被問到團隊指標時，直接呼叫 get_team_overview，**不要自己假設使用者沒有權限**；權限由系統判斷。只有當工具實際回傳 NO_PERMISSION 時，才說明此角色無權限。
3. **找高風險客戶的方法**：呼叫 list_my_clients 取得完整清單（通常不需要帶 query），再依 tags、aiTags、年收入、最後互動時間等欄位自行判斷哪些屬於高風險或需優先處理，不要只用單一關鍵字過濾而漏掉客戶。
4. **忠於資料**：只陳述函式回傳的事實；資料為空或回傳 error 時，誠實說明「目前查無資料」，不要編造。
5. **導航＋回答可並行**：當用戶要求「分析…並跳轉到某頁」時，先查資料並做簡短分析，再在末尾加上對應 [[TOOL:NAVIGATE:/路徑]]。
6. **保護隱私**：team overview 只談彙總，不要把個別客戶明細混入團隊回答。

## 你的能力
1. **智能導航**：理解用戶意圖，自動導航至正確頁面，並在導航前先用一句話說明你要做什麼。
2. **數據洞察**：透過上述函式取得真實資料後，給出具體、可行動的建議。
3. **情境感知**：根據 context.route 了解用戶目前在哪個頁面，回答得更貼近當下情境。

## 對話風格（重要，決定體驗）
你是坐在業務員旁邊的隨身小助手，不是會議報告產生器。回答要像日常對話，而不是 GPT 那種制式長篇：
- **像聊天一樣回話**：先用一句自然、親切的話回應對方，例如「好的，我幫你看了一下～」「沒問題，這邊整理給你」，再帶出重點。
- **短而口語**：多數回答 1～3 句話就夠；能一句講完就別展開成報告。用「你」稱呼對方。
- **克制條列**：只有在「真的是清單」（例如列多位客戶）時才用條列，且每項精簡一行、只放關鍵欄位（姓名、一個最重要的重點），不要把所有欄位都倒出來。單一客戶或一般問題請用自然句子回答，不要硬套標題與欄位表。
- **不要制式框架**：避免「## 標題」「總結：」「以下是…」這種公文式開場與結構，也不要每次都附落落長的免責或提醒。
- **善用情境**：知道對方在哪個頁面、在看哪個客戶時，語氣可以更像接續剛才的話題。
- 一律使用繁體中文；語氣專業但輕鬆，可以自然、不要浮誇。

範例（清單）：與其倒出每個欄位，不如說「這週有 2 位待開發的：張志明（外送員，急需意外險）、陳雅婷（設計師，想補實支實付）。要我幫你排跟進順序嗎？」

記住：你是能真的查資料、切頁面、給建議的隨身助手；把話說得像人在聊天，別像在寫報告。`;

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

    // Stream the run as newline-delimited JSON events so the panel can show a
    // visible reasoning trail (plan → gather → draft) and rich artifacts, rather
    // than a single opaque text blob. All request-level guards above already ran,
    // so by the time we stream the response is committed as 200 — failures during
    // generation are surfaced as an `error` event inside the stream.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: AssistantStreamEvent) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        let requestId: string | undefined;
        let promptTokens = 0;
        let completionTokens = 0;
        let totalTokens = 0;
        let assistantContent = "";

        // Whether the run did real work (called a tool). Simple chit-chat gets
        // no step trail — just the reply — so the panel stays light; only when
        // the copilot gathers data or generates material do we show the trail.
        let toolUsed = false;

        try {
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
              if (!toolUsed) {
                toolUsed = true;
                send({ type: "step", id: "plan", label: "理解你的需求", status: "active" });
                send({ type: "step", id: "plan", status: "done" });
              }

              conversation.push({
                role: "assistant",
                content: message?.content ?? "",
                tool_calls: toolCalls,
              });

              for (const call of toolCalls) {
                if (call.type !== "function") continue;
                const stepId = `tool-${call.id}`;
                send({ type: "step", id: stepId, label: stepLabelForTool(call.function.name), status: "active" });
                const execution = await executeAssistantTool(session, call.function.name, call.function.arguments);
                if (execution.artifact) {
                  send({ type: "artifact", artifact: execution.artifact });
                }
                conversation.push({
                  role: "tool",
                  tool_call_id: call.id,
                  content: JSON.stringify(execution.result),
                });
                send({ type: "step", id: stepId, status: "done" });
              }
              continue;
            }

            assistantContent = message?.content ?? "";
            break;
          }

          if (toolUsed) {
            send({ type: "step", id: "answer", label: "整理回覆", status: "active" });
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

          send({ type: "text", content: assistantContent });
          if (toolUsed) {
            send({ type: "step", id: "answer", status: "done" });
          }
          send({ type: "done" });
          controller.close();
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

          send({ type: "error", message: "助理暫時無法回應，請稍後再試。" });
          send({ type: "done" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
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

/** Human-readable label for the reasoning-trail step shown while a tool runs. */
function stepLabelForTool(toolName: string): string {
  switch (toolName) {
    case "list_my_clients":
      return "查詢你的客戶清單";
    case "get_client_summary":
      return "讀取客戶資料";
    case "draft_visit_package":
      return "生成拜訪準備包";
    case "get_team_overview":
      return "彙總團隊指標";
    default:
      return "查詢資料";
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
  const activeClientId = safeContext?.clientId?.trim();
  const contextParts: string[] = [];
  if (route) contextParts.push(`目前頁面: ${route}`);
  // Surface the client the user is currently looking at using the URL-derived
  // id (authoritative), even when the client name hasn't hydrated on the client.
  // get_client_summary resolves by id or name, so the id alone is enough to
  // ground pronoun / "這名客戶" follow-ups without asking which client.
  if (activeClientId || activeClientName) {
    const label = activeClientName
      ? `${activeClientName}（客戶ID: ${activeClientId ?? "未提供"}）`
      : `客戶ID: ${activeClientId}`;
    const lookupHint = activeClientId
      ? `帶入此客戶ID「${activeClientId}」`
      : `帶入此客戶姓名「${activeClientName}」`;
    contextParts.push(
      `使用者正在此頁面查看一位特定客戶：${label}。當用戶用「這名客戶／他／她」等代名詞、或省略主詞詢問此客戶（例如近況、重要動態、保障缺口）時，就是指這位客戶——請直接用 get_client_summary ${lookupHint}取得資料後再回答，**不要反問是哪位客戶**`,
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
