import OpenAI from "openai";
import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { persistTheaterFailure, persistTheaterScoreSuccess } from "@/lib/theater/theater-ai-repository";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const scoreRequestSchema = z.object({
  sessionId: z.string().trim().max(120).optional(),
  clientId: z.string().trim().max(80).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["agent", "client"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(80),
  clientContext: z.unknown().optional(),
  personaType: z.enum(["CONSERVATIVE", "SKEPTICAL", "BUSY", "EMOTIONAL"]),
});

type ScoreRequestBody = z.infer<typeof scoreRequestSchema>;

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
  const startedAt = Date.now();
  let bodyForFailure: Partial<ScoreRequestBody> = {};

  try {
    const session = await requireCurrentMember();
    const parsedBody = scoreRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_THEATER_SCORE_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    bodyForFailure = body;

    if (process.env.NODE_ENV === "production" && process.env.ENABLE_LEGACY_THEATER_DEMO !== "true") {
      return Response.json(
        {
          error: "THEATER_ROUTE_B_REQUIRED",
          message: "AI 劇場演練新版 Route B 尚未啟用，production 不開放 legacy demo flow。",
        },
        { status: 503 },
      );
    }

    const quota = canUseAiModule(session, AiModule.THEATER);

    if (!quota.allowed) {
      return Response.json(
        {
          error: quota.code,
          remaining: quota.remaining,
          message: "AI 使用額度已用完，請聯絡管理員或升級方案。",
        },
        { status: 429 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      await persistTheaterFailure({
        session,
        body,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SCORING_PROMPT },
        { role: "user", content: `對話紀錄：\n${JSON.stringify(body.history)}\n\n客戶背景：${JSON.stringify(body.clientContext)}\n客戶人格：${body.personaType}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    let score: unknown = {};

    try {
      score = JSON.parse(content ?? "{}");
    } catch {
      await persistTheaterFailure({
        session,
        body,
        model: MODEL,
        requestId: response.id,
        latencyMs: Date.now() - startedAt,
        error: "Theater score output was not valid JSON",
      });

      return Response.json({ error: "Theater score output was not valid JSON" }, { status: 502 });
    }

    await persistTheaterScoreSuccess({
      session,
      body,
      score,
      usage: {
        model: MODEL,
        requestId: response.id,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        latencyMs: Date.now() - startedAt,
      },
    });

    return new Response(content, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    try {
      const session = await requireCurrentMember();
      await persistTheaterFailure({
        session,
        body: bodyForFailure,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Theater scoring failed",
      });
    } catch {
      return authErrorResponse(error);
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Theater scoring failed" },
      { status: 500 },
    );
  }
}
