import { blockMockApiInProduction } from "../../_lib/mock-api-guard";
import { streamScriptedResponse } from "@/domains/ai-mock/stream";

export async function POST(req: Request) {
  const blocked = blockMockApiInProduction();
  if (blocked) return blocked;

  const { 
    personaType, 
    tension, 
    spinOutputs
  } = await req.json();

  let responseText = "";

  // 根據人格生成行為
  if (personaType === 'SKEPTICAL') {
    if (tension > 70) {
      responseText = "（皺眉）你說的這些數據我聽很多了，但實際上有多少人真的領到過？我還是覺得你們保險公司都是收錢快、賠錢慢。";
    } else {
      responseText = "所以照你這麼說，這 500 萬的保障在十年後還能維持同樣的購買力嗎？考慮到通膨，我並不是很確定這筆投資是否划算。";
    }
  } else if (personaType === 'BUSY') {
    responseText = "好的，我知道了。還有重點嗎？我五分鐘後還有個會。能不能直接告訴我如果你這套方案能解決我剛才說的問題？";
  } else if (personaType === 'EMOTIONAL') {
    responseText = "唉，你說的對，我真的很怕萬一我怎麼了，小孩還那麼小...（眼眶微紅）你剛才提到的那個保障真的能保證他在大學前的學費都沒問題嗎？";
  } else {
    // CONSERVATIVE
    responseText = "聽起來是不錯啦，但我可能要跟我太太商量一下。畢竟這是一筆不小的支出，我們家向來都很謹慎。你有沒有更詳細的書面資料可以讓我帶回去看？";
  }

  // 模擬推拉標籤 (Objections from SPIN)
  if (spinOutputs.PROBLEM.length > 0 && Math.random() > 0.7) {
    const randomProblem = spinOutputs.PROBLEM[Math.floor(Math.random() * spinOutputs.PROBLEM.length)];
    responseText += `\n\n不過你剛才提到的那個「${randomProblem}」，我真的覺得現在處理會不會太早了？`;
  }

  // 模擬思考延遲
  await new Promise(r => setTimeout(r, 800));

  return new Response(streamScriptedResponse(responseText), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
