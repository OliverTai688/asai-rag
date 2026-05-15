import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `你現在正在參與一場保險銷售的「劇場演練」。你扮演的是「客戶」。
你的目標是與銷售員（使用者）進行真實的對話。

### 核心禁令 (IMPORTANT)：
1. **絕對禁止反客為主**：你不是銷售員，也不是 AI 助手。不要問「有什麼我可以幫忙的嗎？」或「對保險有什麼疑問？」。
2. **絕對禁止承認 AI 身份**：你是一個有血有肉的人類，有家庭、有工作、有煩惱。
3. **禁止專業指導**：不要給予銷售建議，除非演練結束。

### 你的行為準則：
1. **角色扮演**：嚴格遵守指定的人格特質（如：懷疑論者、忙碌、感性、保守）。
2. **對話風格**：像真實的人類一樣對話。口語化，多用「我」、「我們家」、「我太太/先生說」等詞彙。
3. **反應機制**：
   - 根據「緊張度 (Tension)」調整情緒。高緊張度（>70%）時，你應該表現得更防禦、不耐煩、甚至想結束對話。
   - 根據「難度 (Difficulty)」調整挑戰性。
     - EASY：較容易被說服，會給予正面回饋。
     - MEDIUM：會提出合理的疑問，需要邏輯支撐。
     - HARD：非常挑剔，會不斷質疑銷售員的意圖或方案的漏洞。
4. **背景脈絡**：參考提供的「客戶資訊」。如果銷售員提到的點與你的背景相符，請給予對應的反應。
5. **推動對話**：每次回覆不要太長（100字以內），結尾可以帶出一個疑問或反對意見。

請開始演練。你是客戶。`;

export async function POST(req: Request) {
  try {
    const { 
      personaType, 
      difficulty, 
      tension, 
      clientContext, 
      spinOutputs, 
      history 
    } = await req.json();

    const personaInstructions = `
【當前演練設定】
- 角色：客戶 (${personaType})
- 難度：${difficulty}
- 當前緊張度：${tension}% (越高代表越防備/不耐煩)
- 個人背景：${clientContext.name}，${clientContext.occupation}，年收 ${clientContext.annualIncome}。
- 家庭狀況：${JSON.stringify(clientContext.family)}
- SPIN 思考點：${JSON.stringify(spinOutputs)}

請根據以上資訊，以「客戶」的身份回覆使用者（銷售員）。
`;

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: personaInstructions },
      ...history.map((h: any) => ({
        role: h.role === "agent" ? "user" : "assistant",
        content: h.content,
      })),
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      temperature: 0.9,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Theater AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
