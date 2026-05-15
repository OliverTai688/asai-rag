import { streamScriptedResponse } from "@/domains/ai-mock/stream";

export async function POST(req: Request) {
  const { messages, context } = await req.json();
  const lastUserMsg = messages[messages.length - 1]?.content || "";

  let responseText = "";

  // 1. 命令語句識別 (TOOL CALL SIMULATION)
  if (lastUserMsg.includes("導航") || lastUserMsg.includes("跳轉") || lastUserMsg.includes("去")) {
    if (lastUserMsg.includes("客戶") || lastUserMsg.includes("CRM")) {
      responseText = "好的，正在為您跳轉至客戶管理列表。您可以在這裡看到所有標記為「待開發」的潛在客戶。 [[TOOL:NAVIGATE:/crm]]";
    } else if (lastUserMsg.includes("報告") || lastUserMsg.includes("分析")) {
      responseText = "沒問題，正在幫您生成高風險客戶的詳細分析報告... [[TOOL:NAVIGATE:/reports]]";
    } else if (lastUserMsg.includes("SPIN") || lastUserMsg.includes("對話")) {
      responseText = "好的，正在為您開啟 SPIN 對話列表。建議您可以針對最近的訪談紀錄進行深度分析。 [[TOOL:NAVIGATE:/spin]]";
    } else if (lastUserMsg.includes("劇場") || lastUserMsg.includes("演練")) {
      responseText = "沒問題，幫您進入劇場演練模組。 [[TOOL:NAVIGATE:/theater]]";
    } else if (lastUserMsg.includes("規劃") || lastUserMsg.includes("訪前")) {
      responseText = "好的，正在進入訪前規劃工具。 [[TOOL:NAVIGATE:/pre-visit]]";
    } else if (lastUserMsg.includes("首頁") || lastUserMsg.includes("總覽")) {
      responseText = "沒問題，回到儀表板首頁。 [[TOOL:NAVIGATE:/dashboard]]";
    }
  } else if (lastUserMsg.includes("待開發") && lastUserMsg.includes("清單")) {
    responseText = "根據本週的數據，您共有 5 位標記為「待開發」的高價值客戶，建議優先處理 A 類潛在對象。正在為您導航至 CRM 篩選列表... [[TOOL:NAVIGATE:/crm]]";
  } else if (lastUserMsg.includes("串接") && lastUserMsg.includes("日曆")) {
    responseText = "好的，我已經準備好為您串接 Google Calendar。請點擊首頁上方行事曆面板中的「立即串接」按鈕來完成授權。 [[TOOL:NAVIGATE:/dashboard]]";
  } else if (lastUserMsg.includes("高風險") && lastUserMsg.includes("報告")) {
    responseText = "已偵測到 3 位客戶出現續約風險。我已經整理好詳細的決策報告，請查看。 [[TOOL:NAVIGATE:/reports]]";
  } else if (lastUserMsg.includes("全部頁面") || lastUserMsg.includes("有哪些功能") || lastUserMsg.includes("做什麼")) {
    responseText = "ASAI 平台整合了多個核心功能：\n1. **客戶管理 (CRM)**: 追蹤客戶狀態與標籤。\n2. **SPIN 對話**: 銷售技巧訓練與紀錄。\n3. **劇場演練**: AI 模擬真實銷售情境。\n4. **訪前規劃**: 自動生成拜訪建議。\n5. **分析報告**: 產出專業的決策建議書。\n您想深入了解哪一個部分？";
  } else if (lastUserMsg.includes("建立") && (lastUserMsg.includes("客戶") || lastUserMsg.includes("人"))) {
    responseText = "好的，已為您開啟新增客戶表單。 [[TOOL:OPEN_MODAL:ADD_CLIENT]]";
  } else if (context.clientId && (lastUserMsg.includes("他") || lastUserMsg.includes(context.clientName || ""))) {
    // 當前頁面客戶相關
    responseText = `關於 ${context.clientName}，我注意到他最近有兩個高風險標籤尚未處理。建議我們可以先進行一次 SPIN 二次訪談。 [[TOOL:HIGHLIGHT:INSIGHTS]]`;
  } else {
    // 通用對話
    responseText = "您好！我是您的 ASAI 智能助理。您可以直接要求我「顯示待開發客戶」或「分析高風險報告」，我會直接帶您去對應的頁面。";
  }

  // 模擬思考延遲
  await new Promise(r => setTimeout(r, 600));

  return new Response(streamScriptedResponse(responseText), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
