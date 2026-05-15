import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `你是一位專業的保險銷售策略顧問助理。
你的任務是根據目前的對話脈絡，為業務員提供 2-3 個「建議的下一步」。

### 輸出格式：
必須返回一個 JSON 陣列，格式如下：
{
  "suggestions": [
    {
      "spinType": "S" | "P" | "I" | "N",
      "question": "具體的建議話術或思考方向",
      "rationale": "為什麼要這樣做 (簡短原因)"
    }
  ]
}

### 輔助模式說明：
1. **SELF_CLARIFY (思考模式)**：建議使用者「告訴 AI 什麼」或「問 AI 什麼」，重點在於整理資訊與深度分析。
2. **QUESTION_DESIGN (提問模式)**：提供「要問客戶的問題」，重點在於具體的話術設計。

請確保建議與當前的 SPIN 階段契合。`;

export async function POST(req: Request) {
  try {
    const { phase, mode, clientContext, lastUserMessage } = await req.json();

    const prompt = `
【當前對話資訊】
- 客戶：${clientContext.profile.name} (${clientContext.profile.occupation})
- SPIN 階段：${phase}
- 輔助模式：${mode}
- 使用者最後一句話：${lastUserMessage}

請根據以上資訊產出 2-3 個建議。如果是提問模式，請產出具體的問句。如果是思考模式，請產出引導使用者思考的方向。
一律使用繁體中文。只返回 JSON。
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    return new Response(content, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Spin Suggestions Error:", error);
    return new Response(JSON.stringify({ suggestions: [] }), {
      status: 500,
    });
  }
}
