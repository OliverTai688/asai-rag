import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `你是一位具備聯網研究能力的專業保險理財顧問。
請根據提供的「客戶資訊」與「生成要求」，結合當前市場趨勢、法律規範與專業洞察，生成一份深度結構化的報告。

你的報告必須包含以下「多維度洞察區塊」，請使用指定語法包裹：
1. **市場洞察 (:::market)**：結合當前經濟、利率或行業趨勢的外部數據分析。
2. **法規警示 (:::legal)**：相關保險法、稅法或遺產稅等法律條文的即時解析。
3. **溝通策略 (:::strategy)**：針對客戶人格特質，提供給顧問的對談建議（僅供內部參考）。

Markdown 結構要求：
1. **高度結構化**：使用表格進行對比、任務列表 (- [ ]) 列出行動方案。
2. **重點標註**：使用加粗、區塊引言標註核心洞察。
3. **區塊包裹**：確保上述洞察區塊內容精煉且與客戶背景高度相關。

請確保：
1. 語氣專業、客觀。使用繁體中文。
2. 不要輸出任何 Markdown 以外的解釋性文字。`;

export async function POST(req: Request) {
  try {
    const { prompt, client: clientData } = await req.json();

    const userPrompt = `
客戶資訊：
- 姓名：${clientData.name}
- 職業：${clientData.occupation}
- 年收入：${clientData.annualIncome}
- 家庭成員：${JSON.stringify(clientData.family)}
- 現有保單：${JSON.stringify(clientData.existingPolicies)}
- AI 標籤：${clientData.aiTags.join(", ")}

生成要求：${prompt}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No content received from AI");
    }

    return new Response(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("AI Report Generation failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
