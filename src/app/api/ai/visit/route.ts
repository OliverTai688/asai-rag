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
import { enrichSpinQuestionsWithReasoning } from "@/domains/visit/reasoning";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const visitPurposeSchema = z.enum(["FIRST_VISIT", "ADD_ON", "RENEWAL", "CARE", "REFERRAL"]);

const visitRequestSchema = z
  .object({
    purpose: visitPurposeSchema,
    clientId: z.string().trim().min(1).max(120).optional(),
    client: z
      .object({
        id: z.string().trim().min(1).max(120),
      })
      .passthrough()
      .optional(),
  })
  .transform((input) => ({
    purpose: input.purpose,
    clientId: input.clientId ?? input.client?.id,
  }))
  .refine((input) => Boolean(input.clientId), {
    message: "clientId is required.",
    path: ["clientId"],
  });

const visitOutputSchema = z.object({
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
                  source: z.enum(["client_profile", "relationship_graph", "policy", "ai_tag", "visit_purpose", "unknown"]),
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
6. 不要輸出任何 JSON 以外的文字。
7. 不需要輸出推論依據，系統會在 server 端依已授權的客戶資料補上 evidence。`;

export async function POST(req: Request) {
  const startedAt = Date.now();
  let session: AppSession | undefined;
  let scopedClientId: string | undefined;
  let providerAttempted = false;

  try {
    session = await requireCurrentMember();
    const parsedBody = visitRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_VISIT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    scopedClientId = body.clientId;
    const quota = canUseAiModule(session, AiModule.VISIT);

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

    const clientData = await getClientForMember(session, body.clientId ?? "");

    if (!clientData) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    if (!process.env.OPENAI_API_KEY) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        model: MODEL,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const userPrompt = buildVisitPrompt(body.purpose, clientData);
    providerAttempted = true;
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message.content;

    if (!content) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        model: MODEL,
        clientId: scopedClientId,
        requestId: response.id,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        latencyMs: Date.now() - startedAt,
        error: "No content received from AI",
      });

      return Response.json({ error: "VISIT_AI_EMPTY_RESPONSE" }, { status: 502 });
    }

    let rawOutput: unknown;

    try {
      rawOutput = JSON.parse(content);
    } catch {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        model: MODEL,
        clientId: scopedClientId,
        requestId: response.id,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        latencyMs: Date.now() - startedAt,
        error: "AI output was not valid JSON",
      });

      return Response.json({ error: "VISIT_AI_INVALID_JSON" }, { status: 502 });
    }

    const parsedOutput = visitOutputSchema.safeParse(rawOutput);

    if (!parsedOutput.success) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        model: MODEL,
        clientId: scopedClientId,
        requestId: response.id,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        latencyMs: Date.now() - startedAt,
        error: "AI output did not match the expected schema",
      });

      return Response.json({ error: "VISIT_AI_SCHEMA_MISMATCH" }, { status: 502 });
    }

    const enrichedOutput = {
      ...parsedOutput.data,
      spinQuestions: enrichSpinQuestionsWithReasoning(parsedOutput.data.spinQuestions, {
        client: clientData,
        purpose: body.purpose,
      }),
    };

    await persistAiGenerationSuccess({
      session,
      module: AiModule.VISIT,
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

    return Response.json(enrichedOutput);
  } catch (error) {
    if (!session) {
      return authErrorResponse(error);
    }

    if (providerAttempted) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        model: MODEL,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: normalizeAiError(error, "Visit generation failed"),
      });
    }

    return Response.json({ error: "VISIT_AI_GENERATION_FAILED" }, { status: 500 });
  }
}

function buildVisitPrompt(purpose: z.infer<typeof visitPurposeSchema>, clientData: Awaited<ReturnType<typeof getClientForMember>>) {
  if (!clientData) {
    return "";
  }

  return `
客戶資訊：
- 姓名：${clientData.name}
- 職業：${clientData.occupation || "未提供"}
- 年收入：${clientData.annualIncome}
- 家庭成員：${JSON.stringify(clientData.family)}
- 現有保單：${JSON.stringify(clientData.existingPolicies)}
- AI 標籤（需求缺口）：${clientData.aiTags.join(", ") || "未提供"}

拜訪目的：${purpose}
`;
}
