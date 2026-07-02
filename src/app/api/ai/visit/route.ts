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
import { buildAiEvidenceSummary } from "@/domains/visit/ai-evidence-dto";
import { enrichSpinQuestionsWithReasoning } from "@/domains/visit/reasoning";
import {
  VISIT_SYSTEM_PROMPT,
  buildVisitPrompt,
  visitOutputSchema,
} from "@/lib/ai/generators/visit-package";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";
const QA_PROVIDER_ERROR_MODEL = "asai-qa-forced-invalid-model";

const visitPurposeSchema = z.enum(["FIRST_VISIT", "ADD_ON", "RENEWAL", "CARE", "REFERRAL"]);

const visitRequestSchema = z
  .object({
    purpose: visitPurposeSchema,
    goal: z.string().trim().max(500).optional(),
    clientId: z.string().trim().min(1).max(120).optional(),
    client: z
      .object({
        id: z.string().trim().min(1).max(120),
      })
      .passthrough()
      .optional(),
    dryRun: z.boolean().optional().default(false),
  })
  .transform((input) => ({
    purpose: input.purpose,
    goal: input.goal,
    clientId: input.clientId ?? input.client?.id,
    dryRun: input.dryRun,
  }))
  .refine((input) => Boolean(input.clientId), {
    message: "clientId is required.",
    path: ["clientId"],
  });

export async function POST(req: Request) {
  const startedAt = Date.now();
  let session: AppSession | undefined;
  let scopedClientId: string | undefined;
  let providerAttempted = false;
  let model = MODEL;

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
    const quota = shouldForceQuotaExceededForQa(req, body)
      ? { allowed: false, code: "QUOTA_EXCEEDED" as const, remaining: 0 }
      : canUseAiModule(session, AiModule.VISIT);

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
        model,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    model = shouldForceProviderErrorForQa(req, body) ? QA_PROVIDER_ERROR_MODEL : MODEL;
    const userPrompt = buildVisitPrompt(body.purpose, clientData, body.goal);
    providerAttempted = true;
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: VISIT_SYSTEM_PROMPT },
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
        model,
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
        model,
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
        model,
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
    const evidenceSummary = buildAiEvidenceSummary({
      client: clientData,
      purpose: body.purpose,
      questionEvidence: enrichedOutput.spinQuestions.flatMap((question) => question.reasoning?.evidence ?? []),
      objectives: enrichedOutput.objectives,
      objections: enrichedOutput.objections,
      materials: enrichedOutput.materials,
    });

    await persistAiGenerationSuccess({
      session,
      module: AiModule.VISIT,
      clientId: scopedClientId,
      usage: {
        model,
        requestId: response.id,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        latencyMs: Date.now() - startedAt,
      },
    });

    return Response.json({
      ...enrichedOutput,
      evidenceSummary,
    });
  } catch (error) {
    if (!session) {
      return authErrorResponse(error);
    }

    if (providerAttempted) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.VISIT,
        model,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: normalizeAiError(error, "Visit generation failed"),
      });
    }

    return Response.json({ error: "VISIT_AI_GENERATION_FAILED" }, { status: 500 });
  }
}

function shouldForceQuotaExceededForQa(
  req: Request,
  body: { dryRun?: boolean },
): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-quota-exceeded") === "true"
  );
}

function shouldForceProviderErrorForQa(
  req: Request,
  body: { dryRun?: boolean },
): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-provider-error") === "true"
  );
}
