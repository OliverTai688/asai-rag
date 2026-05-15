import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `你是一位專業的保險銷售顧問與 AI 助手。
請根據提供的「客戶資訊」與「拜訪目的」，生成一份詳細的「訪前規劃」。

回應必須是純 JSON 格式，且符合以下結構：
{
  "objectives": [
    { "id": "string", "description": "目標描述", "successCriteria": "成功判準" }
  ],
  "spinQuestions": [
    { "id": "string", "type": "S | P | I | N", "question": "問題內容" }
  ],
  "objections": [
    { "id": "string", "expectedObjection": "預期疑問", "suggestedResponse": "建議回應" }
  ],
  "timeline": [
    { "label": "環節名稱", "duration": number }
  ],
  "materials": [
    { "id": "string", "name": "資料名稱", "checked": false }
  ]
}

請確保：
1. SPIN 提問必須符合 S(Situation)、P(Problem)、I(Implication)、N(Need-payoff) 的邏輯，每個類型至少提供 1-2 個問題。
2. 目標要具體且針對該客戶的狀況。
3. 預期疑問要貼合客戶目前的保障缺口（aiTags）與其職業背景。
4. 時間分配總和必須剛好為 60 分鐘。
5. 所有回應使用繁體中文。
6. 不要輸出任何 JSON 以外的文字。`;

export async function POST(req: Request) {
  try {
    const { purpose, client: clientData } = await req.json();

    const userPrompt = `
客戶資訊：
- 姓名：${clientData.name}
- 職業：${clientData.occupation}
- 年收入：${clientData.annualIncome}
- 家庭成員：${JSON.stringify(clientData.family)}
- 現有保單：${JSON.stringify(clientData.existingPolicies)}
- AI 標籤（需求缺口）：${clientData.aiTags.join(", ")}

拜訪目的：${purpose}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No content received from AI");
    }

    return new Response(content, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("AI Generation failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
