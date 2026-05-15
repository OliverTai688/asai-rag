import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SCORING_PROMPT = `你是一位專業的銷售教練。
請根據銷售員與客戶（AI）的對話紀錄，進行全方位的評分與分析。

請輸出 JSON 格式的數據，包含以下欄位：
1. empathy (0-100): 同理心分數
2. questioning (0-100): 提問技巧分數
3. clarity (0-100): 解說清晰度分數
4. objectionHandling (0-100): 異議處理分數
5. closing (0-100): 締結力分數
6. missedOpportunities: 陣列，描述銷售員錯失的關鍵成交契機或回應點（繁體中文）
7. improvedPhrasing: 陣列，格式為 "原話 -> 建議優化後的說法"（繁體中文）

請確保：
- 評價客觀且具有建設性。
- 分數要反映真實表現，不要全是高分。
- 建議話術要具備實戰性。
- 只輸出 JSON 字串，不要有其他文字。`;

export async function POST(req: Request) {
  try {
    const { history, clientContext, personaType } = await req.json();

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SCORING_PROMPT },
        { role: "user", content: `對話紀錄：\n${JSON.stringify(history)}\n\n客戶背景：${JSON.stringify(clientContext)}\n客戶人格：${personaType}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    return new Response(content, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Scoring AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
