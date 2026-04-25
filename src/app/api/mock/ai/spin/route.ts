import { streamScriptedResponse } from "@/domains/ai-mock/stream";

export async function POST(req: Request) {
  const { phase, mode, clientContext, messages } = await req.json();
  const lastMessage = messages[messages.length - 1]?.content || "";

  let responseText = "";

  // 1. 基礎情境邏輯 (MOCK)
  if (mode === "SELF_CLARIFY") {
    switch (phase) {
      case "SITUATION":
        responseText = `了解。針對 ${clientContext.profile.name} 的情境（${clientContext.profile.occupation}），我們需要先釐清他目前的經濟支柱角色。[[INSIGHT:客戶目前的年收入為 ${clientContext.profile.income}，屬於家庭主要經濟來源]] 你可以試著詢問他關於工作穩定度或者是家庭開銷佔比的細節。例如：「目前的年收入中，大概有多少比例是固定支出呢？」[[QUESTION:目前的年收入中，大概有多少比例是固定支出呢？]]\n\n如果這部分已經釐清，請點擊下方按鈕進入下一步。 [[PHASE_COMPLETE]]`;
        break;
      case "PROBLEM":
        responseText = `很好。既然我們知道他的固定開銷很大，下一步要引發「問題」。[[INSIGHT:高額固定支出導致風險抵抗力低]] 你可以問他：如果這份收入突然中斷，目前的存款可以支撐家庭多久？[[QUESTION:如果收入突然中斷，目前的存款可以支撐家庭多久？]] 這會讓他意識到現有保障的不足。`;
        break;
      default:
        responseText = `基於目前 ${phase} 階段，我建議你繼續深入探討客戶對風險的感知度。[[SUGGESTION:引導客戶談論對未來的擔憂]]`;
    }
  } else {
    // QUESTION_DESIGN Mode
    responseText = `好的，我為你設計了幾個可以直接詢問 ${clientContext.profile.name} 的問題：\n\n1. 「像您在科技業工作，平時壓力大嗎？有沒有想過萬一身體真的吃不消，目前的保險能幫您分擔多少？」[[QUESTION:像您在科技業工作，平時壓力大嗎？]]\n2. 「我看您標籤有提到教育金焦慮，如果您現在的收入出現變數，小孩的補習費會受影響嗎？」[[QUESTION:如果您現在的收入出現變數，小孩的補習費會受影響嗎？]]\n\n[[INSIGHT:透過焦慮點（教育金）切入是高勝率做法]]`;
  }

  // 模擬思考延遲
  await new Promise(r => setTimeout(r, 600));

  return new Response(streamScriptedResponse(responseText), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
