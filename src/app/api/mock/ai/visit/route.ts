import { blockMockApiInProduction } from "../../_lib/mock-api-guard";
import { streamScriptedResponse } from "@/domains/ai-mock/stream";
import { getMockVisitPlan } from "@/domains/ai-mock/scripts/visit";
import { VisitPurpose } from "@/domains/visit/types";

export async function POST(req: Request) {
  const blocked = blockMockApiInProduction();
  if (blocked) return blocked;

  const { purpose, clientId } = await req.json();
  
  // 依客戶 ID + 拜訪目的選擇最適合的 mock 腳本
  const mockData = getMockVisitPlan(purpose as VisitPurpose, clientId as string);
  
  // 模擬 AI 思考延遲
  await new Promise(r => setTimeout(r, 800));

  // 這裡我們返回一個特殊的格式，前端可以解析它
  // 或者我們可以分段 streaming。
  // 為了簡化，我們先返回 JSON，但如果 user 想要 "逐字顯示感"，
  // 前端可以自行模擬，或者是我們在這裡 return 一個包含 JSON 的 stream。
  
  // 實際上，如果我們要 "假 stream" 逐字顯示，
  // 我們可以將整個 mockData 轉為 JSON 字串並串流。
  
  const responseText = JSON.stringify(mockData);

  return new Response(streamScriptedResponse(responseText), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
