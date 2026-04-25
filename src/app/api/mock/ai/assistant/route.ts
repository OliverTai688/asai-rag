import { streamScriptedResponse } from "@/domains/ai-mock/stream";

export async function POST(req: Request) {
  const { messages, context } = await req.json();
  const lastUserMsg = messages[messages.length - 1]?.content || "";

  let responseText = "";

  // 1. 命令語句識別 (TOOL CALL SIMULATION)
  if (lastUserMsg.includes("導航") || lastUserMsg.includes("跳轉")) {
    if (lastUserMsg.includes("客戶") || lastUserMsg.includes("CRM")) {
      responseText = "好的，正在為您跳轉至客戶管理列表。 [[TOOL:NAVIGATE:/crm]]";
    } else if (lastUserMsg.includes("報告")) {
      responseText = "沒問題，幫您打開報告列表。 [[TOOL:NAVIGATE:/reports]]";
    }
  } else if (lastUserMsg.includes("建立") && (lastUserMsg.includes("客戶") || lastUserMsg.includes("人"))) {
    responseText = "好的，已為您開啟新增客戶表單。 [[TOOL:OPEN_MODAL:ADD_CLIENT]]";
  } else if (context.clientId && (lastUserMsg.includes("他") || lastUserMsg.includes(context.clientName || ""))) {
    // 當前頁面客戶相關
    responseText = `關於 ${context.clientName}，我注意到他最近有兩個高風險標籤尚未處理。建議我們可以先進行一次 SPIN 二次訪談。 [[TOOL:HIGHLIGHT:INSIGHTS]]`;
  } else {
    // 通用對話
    responseText = "您好！我是您的 ASAI 智能助理。我可以幫您管理客戶、規劃 SPIN 銷售策略，或者進行模擬演練。請問今天想從哪裡開始？";
  }

  // 模擬思考延遲
  await new Promise(r => setTimeout(r, 600));

  return new Response(streamScriptedResponse(responseText), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
