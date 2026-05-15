import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
- 系統設定 → [[TOOL:NAVIGATE:/settings]]

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

## 範例情境
- 用戶說「我想看待開發的客戶清單」→ 解釋有哪些待開發客戶，導航至 /crm
- 用戶說「幫我分析高風險客戶」→ 說明高風險客戶狀況，導航至 /reports
- 用戶說「目前團隊目標達成率」→ 根據一般業務數據回答，提供具體數字（可說明數據來自系統）
- 用戶說「去 SPIN 對話」→ 直接導航，簡短說明

記住：你是一個真實能執行動作的助理，不只是對話，你能真正幫助用戶切換頁面和取得資訊。`;

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  const contextNote = context?.route
    ? `\n[目前頁面: ${context.route}${context.clientName ? `，正在查看客戶: ${context.clientName}` : ""}]`
    : "";

  const systemWithContext = SYSTEM_PROMPT + contextNote;

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemWithContext },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: openaiMessages,
    stream: true,
    max_tokens: 500,
    temperature: 0.7,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          controller.enqueue(encoder.encode(delta));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
