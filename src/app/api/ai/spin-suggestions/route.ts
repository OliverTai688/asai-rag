import OpenAI from "openai";
import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { getClientForMember } from "@/lib/clients/client-repository";
import {
  normalizeAiError,
  persistAiGenerationFailure,
  persistAiGenerationSuccess,
} from "@/lib/ai/generation-usage-repository";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const suggestionsRequestSchema = z.object({
  phase: z.enum(["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF"]),
  mode: z.enum(["SELF_CLARIFY", "QUESTION_DESIGN"]),
  clientId: z.string().trim().min(1).max(120),
  lastUserMessage: z.string().trim().max(2000).default(""),
});

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
  const startedAt = Date.now();
  let session: AppSession | undefined;
  let scopedClientId: string | undefined;
  let providerAttempted = false;

  try {
    session = await requireCurrentMember();
    const parsedBody = suggestionsRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_SPIN_SUGGESTIONS_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    scopedClientId = body.clientId;
    const quota = canUseAiModule(session, AiModule.SPIN);

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

    const clientData = await getClientForMember(session, body.clientId);

    if (!clientData) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    if (!process.env.OPENAI_API_KEY) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.SPIN,
        model: MODEL,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const prompt = `
【當前對話資訊】
- 客戶：${clientData.name} (${clientData.occupation || "未填寫"})
- SPIN 階段：${body.phase}
- 輔助模式：${body.mode}
- 使用者最後一句話：${body.lastUserMessage}

請根據以上資訊產出 2-3 個建議。如果是提問模式，請產出具體的問句。如果是思考模式，請產出引導使用者思考的方向。
一律使用繁體中文。只返回 JSON。
`;

    providerAttempted = true;
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";

    await persistAiGenerationSuccess({
      session,
      module: AiModule.SPIN,
      clientId: scopedClientId,
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
    if (!session) {
      return authErrorResponse(error);
    }

    if (providerAttempted) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.SPIN,
        model: MODEL,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: normalizeAiError(error, "Spin suggestions failed"),
      });
    }

    return Response.json({ suggestions: [] }, { status: 500 });
  }
}
