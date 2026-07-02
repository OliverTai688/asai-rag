import OpenAI from "openai";
import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import type { AppSession } from "@/lib/auth/session";
import { canUseAiModule } from "@/lib/auth/policies";
import { getClientForMember } from "@/lib/clients/client-repository";
import {
  buildAiEvidenceSummary,
  buildProviderSafeClientSnapshot,
  type AiEvidenceSummaryDto,
} from "@/domains/visit/ai-evidence-dto";
import { enrichSpinQuestionsWithReasoning } from "@/domains/visit/reasoning";
import {
  normalizeAiError,
  persistAiGenerationFailure,
  persistAiGenerationSuccess,
} from "@/lib/ai/generation-usage-repository";
import type { SpinQuestion, VisitPurpose } from "@/domains/visit/types";

/**
 * Shared visit-preparation-package generation engine.
 *
 * Both the `/api/ai/visit` route and the global assistant copilot tool call
 * `generateVisitPackage`, so the regulated bits — quota check, session-scoped
 * client resolution, `AiUsageLog`, and the provider-safe prompt — live in one
 * place. The prompt/schema/prompt-builder are exported so the route can reuse
 * them without duplicating the contract.
 */

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

export const VISIT_SYSTEM_PROMPT = `你是一位專業的保險銷售顧問與 AI 助手。
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
6. 不要輸出任何 JSON 以外的文字。
7. 不需要輸出推論依據，系統會在 server 端依已授權的客戶資料補上 evidence。`;

export const visitOutputSchema = z.object({
  objectives: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        successCriteria: z.string(),
      }),
    )
    .default([]),
  spinQuestions: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["S", "P", "I", "N"]),
        question: z.string(),
        reasoning: z
          .object({
            summary: z.string(),
            confirmationPrompt: z.string().optional(),
            evidence: z
              .array(
                z.object({
                  id: z.string(),
                  source: z.enum([
                    "client_profile",
                    "relationship_graph",
                    "policy",
                    "ai_tag",
                    "visit_purpose",
                    "unknown",
                  ]),
                  status: z.enum(["confirmed", "inference", "unknown"]),
                  label: z.string(),
                  detail: z.string(),
                }),
              )
              .default([]),
          })
          .optional(),
      }),
    )
    .default([]),
  objections: z
    .array(
      z.object({
        id: z.string(),
        expectedObjection: z.string(),
        suggestedResponse: z.string(),
      }),
    )
    .default([]),
  timeline: z
    .array(
      z.object({
        label: z.string(),
        duration: z.coerce.number(),
      }),
    )
    .default([]),
  materials: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        checked: z.boolean().catch(false),
      }),
    )
    .default([]),
});

export type VisitPackageOutput = z.infer<typeof visitOutputSchema>;

export type VisitPackage = Omit<VisitPackageOutput, "spinQuestions"> & {
  // Enriched with server-side reasoning/evidence (broader source union than the
  // raw model output), so it uses the domain SpinQuestion type.
  spinQuestions: SpinQuestion[];
  evidenceSummary: AiEvidenceSummaryDto;
};

export function buildVisitPrompt(
  purpose: VisitPurpose,
  clientData: NonNullable<Awaited<ReturnType<typeof getClientForMember>>>,
  goal?: string,
) {
  const safeClient = buildProviderSafeClientSnapshot(clientData);
  const trimmedGoal = goal?.trim();

  return `
客戶資訊：
- 姓名：${safeClient.name}
- 職業：${safeClient.occupation || "未提供"}
- 年收入：${safeClient.annualIncome}
- 客戶狀態：${safeClient.status}
- 敏感等級：${safeClient.sensitivityLevel}
- KYC 狀態：${safeClient.kycStatus}
- 家庭/關係圖摘要：${JSON.stringify(safeClient.family)}
- 現有保單摘要：${JSON.stringify(safeClient.existingPolicies)}
- 合規待補：${safeClient.complianceChecklist.missingItems.join(", ") || "無"}
- AI 標籤（需求缺口）：${safeClient.aiTags.join(", ") || "未提供"}

拜訪目的：${purpose}
${trimmedGoal ? `本次拜訪目標（顧問輸入，請以此為規劃重心）：${trimmedGoal}` : ""}
`;
}

export interface GenerateVisitPackageInput {
  clientId: string;
  purpose: VisitPurpose;
  goal?: string;
}

export type GenerateVisitPackageResult =
  | {
      ok: true;
      clientId: string;
      clientName: string;
      purpose: VisitPurpose;
      package: VisitPackage;
    }
  | {
      ok: false;
      code: "QUOTA_EXCEEDED" | "CLIENT_NOT_FOUND" | "PROVIDER_NOT_CONFIGURED" | "GENERATION_FAILED";
      message: string;
    };

/**
 * Generate a visit preparation package for a client owned by the session member.
 * Enforces quota, resolves the client server-side, and writes an `AiUsageLog`
 * for both success and failure. Never throws — returns a discriminated result so
 * callers (the copilot tool) can surface quota/not-found gracefully.
 */
export async function generateVisitPackage(
  session: AppSession,
  input: GenerateVisitPackageInput,
): Promise<GenerateVisitPackageResult> {
  const startedAt = Date.now();

  const quota = canUseAiModule(session, AiModule.VISIT);
  if (!quota.allowed) {
    return {
      ok: false,
      code: "QUOTA_EXCEEDED",
      message: "AI 使用額度已用完，請聯絡管理員或升級方案。",
    };
  }

  const clientData = await getClientForMember(session, input.clientId);
  if (!clientData) {
    return { ok: false, code: "CLIENT_NOT_FOUND", message: "找不到這位客戶，或你沒有存取權限。" };
  }

  if (!process.env.OPENAI_API_KEY) {
    await persistAiGenerationFailure({
      session,
      module: AiModule.VISIT,
      model: MODEL,
      clientId: input.clientId,
      latencyMs: Date.now() - startedAt,
      error: "OPENAI_API_KEY is not configured",
    });
    return { ok: false, code: "PROVIDER_NOT_CONFIGURED", message: "AI 服務尚未設定，請稍後再試。" };
  }

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: VISIT_SYSTEM_PROMPT },
        { role: "user", content: buildVisitPrompt(input.purpose, clientData, input.goal) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message.content;
    const usage = {
      model: MODEL,
      requestId: response.id,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      latencyMs: Date.now() - startedAt,
    };

    if (!content) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        clientId: input.clientId,
        error: "No content received from AI",
        ...usage,
      });
      return { ok: false, code: "GENERATION_FAILED", message: "AI 沒有回傳內容，請再試一次。" };
    }

    let rawOutput: unknown;
    try {
      rawOutput = JSON.parse(content);
    } catch {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        clientId: input.clientId,
        error: "AI output was not valid JSON",
        ...usage,
      });
      return { ok: false, code: "GENERATION_FAILED", message: "AI 回傳格式有誤，請再試一次。" };
    }

    const parsedOutput = visitOutputSchema.safeParse(rawOutput);
    if (!parsedOutput.success) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        clientId: input.clientId,
        error: "AI output did not match the expected schema",
        ...usage,
      });
      return { ok: false, code: "GENERATION_FAILED", message: "AI 回傳的結構不完整，請再試一次。" };
    }

    const spinQuestions = enrichSpinQuestionsWithReasoning(parsedOutput.data.spinQuestions, {
      client: clientData,
      purpose: input.purpose,
    });
    const evidenceSummary = buildAiEvidenceSummary({
      client: clientData,
      purpose: input.purpose,
      questionEvidence: spinQuestions.flatMap((question) => question.reasoning?.evidence ?? []),
      objectives: parsedOutput.data.objectives,
      objections: parsedOutput.data.objections,
      materials: parsedOutput.data.materials,
    });

    await persistAiGenerationSuccess({
      session,
      module: AiModule.VISIT,
      clientId: input.clientId,
      usage,
    });

    return {
      ok: true,
      clientId: input.clientId,
      clientName: clientData.name,
      purpose: input.purpose,
      package: { ...parsedOutput.data, spinQuestions, evidenceSummary },
    };
  } catch (error) {
    await persistAiGenerationFailure({
      session,
      module: AiModule.VISIT,
      model: MODEL,
      clientId: input.clientId,
      latencyMs: Date.now() - startedAt,
      error: normalizeAiError(error, "Visit generation failed"),
    });
    return { ok: false, code: "GENERATION_FAILED", message: "拜訪準備包生成失敗，請稍後再試。" };
  }
}
