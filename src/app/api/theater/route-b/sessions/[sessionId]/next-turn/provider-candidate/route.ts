import OpenAI from "openai";
import { z } from "zod";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { buildTheaterRouteBNextTurnDraft } from "@/domains/theater/route-b-next-turn";
import {
  runTheaterRouteBNextTurnProviderContract,
  type TheaterRouteBNextTurnProviderAdapter,
  type TheaterRouteBNextTurnProviderInput,
  type TheaterRouteBNextTurnUsageLogDraft,
  type TheaterRouteBNextTurnUsageLogRecord,
  type TheaterRouteBNextTurnUsageLogger,
} from "@/domains/theater/route-b-next-turn-provider";
import { normalizeAiError } from "@/lib/ai/generation-usage-repository";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { canUseAiModule } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRouteBSessionForMember } from "@/lib/theater/route-b-session-bff-repository";

interface RouteBProviderCandidateRouteContext {
  params: Promise<{ sessionId: string }>;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.ROUTE_B_NEXT_TURN_MODEL ?? "gpt-4o-mini";
const QA_PROVIDER_ERROR_MODEL = "asai-qa-forced-invalid-model";

const routeBProviderCandidateInputSchema = z
  .object({
    dryRun: z.boolean().optional().default(false),
  })
  .strict();

const providerCandidateJsonSchema = z.object({
  content: z.string().trim().min(1).max(1200),
});

export async function POST(req: Request, ctx: RouteBProviderCandidateRouteContext) {
  const startedAt = Date.now();

  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const blockedPayloadPaths = findRouteBProviderCandidatePayloadViolations(body);

    if (blockedPayloadPaths.length > 0) {
      return noStoreJson(
        {
          error: "ROUTE_B_PROVIDER_CANDIDATE_PAYLOAD_BLOCKED",
          blockedPayloadPaths,
          providerCallAttempted: false,
          aiUsageLogWritten: false,
          appendCandidateCreated: false,
        },
        { status: 409 },
      );
    }

    const parsedBody = routeBProviderCandidateInputSchema.safeParse(body ?? {});

    if (!parsedBody.success) {
      return noStoreJson(
        {
          error: "INVALID_ROUTE_B_PROVIDER_CANDIDATE_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
          providerCallAttempted: false,
          aiUsageLogWritten: false,
          appendCandidateCreated: false,
        },
        { status: 400 },
      );
    }

    const sessionResult = await getRouteBSessionForMember(session, sessionId);

    if (sessionResult.status === "NOT_FOUND") {
      return noStoreJson(
        {
          error: "ROUTE_B_SESSION_NOT_FOUND",
          providerCallAttempted: false,
          aiUsageLogWritten: false,
          appendCandidateCreated: false,
        },
        { status: 404 },
      );
    }

    const draft = buildTheaterRouteBNextTurnDraft(sessionResult.data);

    if (draft.status !== "READY") {
      const blockedResult = await runTheaterRouteBNextTurnProviderContract({
        draft,
        providerKind: "OPENAI",
        provider: buildBlockedProviderAdapter(),
        usageLogger: buildRouteBNextTurnUsageLogger({
          session,
          sessionId,
          clientId: sessionResult.data.session.clientId,
          latencyStartedAt: startedAt,
        }),
      });

      return noStoreJson(
        {
          error: "ROUTE_B_NEXT_TURN_DRAFT_BLOCKED",
          result: blockedResult,
        },
        { status: 409 },
      );
    }

    const quota = shouldForceQuotaExceededForQa(req, parsedBody.data)
      ? { allowed: false, code: "QUOTA_EXCEEDED" as const, remaining: 0 }
      : canUseAiModule(session, AiModule.THEATER);

    if (!quota.allowed) {
      return noStoreJson(
        {
          error: quota.code,
          remaining: quota.remaining,
          providerCallAttempted: false,
          aiUsageLogWritten: false,
          appendCandidateCreated: false,
          safety: buildGuardSafety({ quotaChecked: true, quotaBlocked: true }),
        },
        { status: 429 },
      );
    }

    if (shouldForceProviderDisabledForQa(req, parsedBody.data) || !process.env.OPENAI_API_KEY) {
      return noStoreJson(
        {
          error: "ROUTE_B_NEXT_TURN_PROVIDER_DISABLED",
          providerCallAttempted: false,
          aiUsageLogWritten: false,
          appendCandidateCreated: false,
          safety: buildGuardSafety({ quotaChecked: true }),
        },
        { status: 503 },
      );
    }

    const result = await runTheaterRouteBNextTurnProviderContract({
      draft,
      providerKind: "OPENAI",
      provider: buildOpenAiNextTurnProviderAdapter({
        model: shouldForceProviderErrorForQa(req, parsedBody.data) ? QA_PROVIDER_ERROR_MODEL : MODEL,
      }),
      usageLogger: buildRouteBNextTurnUsageLogger({
        session,
        sessionId,
        clientId: sessionResult.data.session.clientId,
        latencyStartedAt: startedAt,
      }),
    });

    if (result.status === "PROVIDER_ERROR") {
      return noStoreJson(
        {
          error: "ROUTE_B_NEXT_TURN_PROVIDER_ERROR",
          result,
          safety: buildProviderSafety({ aiUsageLogWritten: true }),
        },
        { status: 502 },
      );
    }

    if (result.status !== "SUCCESS") {
      return noStoreJson(
        {
          error: "ROUTE_B_NEXT_TURN_DRAFT_BLOCKED",
          result,
        },
        { status: 409 },
      );
    }

    return noStoreJson({
      result,
      usageLogId: result.usageLogId,
      provider: result.providerKind,
      model: result.model,
      candidate: result.appendCandidate,
      safety: buildProviderSafety({ aiUsageLogWritten: true }),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

function buildOpenAiNextTurnProviderAdapter(options: { model: string }): TheaterRouteBNextTurnProviderAdapter {
  return {
    async generate(input: TheaterRouteBNextTurnProviderInput) {
      const providerInput = buildTheaterRouteBNextTurnProviderInputFromSafeInput(input);
      const response = await openai.chat.completions.create({
        model: options.model,
        messages: [
          { role: "system", content: ROUTE_B_NEXT_TURN_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(providerInput) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });
      const content = response.choices[0]?.message.content;

      if (!content) {
        throw new Error("Route B next-turn provider returned empty content.");
      }

      const parsed = parseProviderCandidateJson(content);

      if (!parsed.success) {
        throw new Error(parsed.error);
      }

      return {
        model: options.model,
        content: parsed.data.content,
        tokenUsage: {
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
        },
      };
    },
  };
}

function buildTheaterRouteBNextTurnProviderInputFromSafeInput(input: TheaterRouteBNextTurnProviderInput) {
  return {
    agentId: input.agentId,
    actionId: input.actionId,
    registryReadiness: input.registryReadiness,
    session: input.session,
    nextTurn: input.nextTurn,
    persistenceEnvelope: input.persistenceEnvelope,
    promptContext: {
      actionId: input.promptContext.actionId,
      librarySummary: input.promptContext.librarySummary,
      selectedObjections: input.promptContext.selectedObjections,
      redLineCues: input.promptContext.redLineCues,
      promptRules: input.promptContext.promptRules,
      providerBoundary: input.promptContext.providerBoundary,
    },
    outputRules: input.outputRules,
    privacyBoundary: input.privacyBoundary,
    responseSchema: {
      content: "Traditional Chinese roleplay reply, no JSON outside this object, no raw private transcript, no provider payload.",
    },
  };
}

function buildBlockedProviderAdapter(): TheaterRouteBNextTurnProviderAdapter {
  return {
    async generate() {
      throw new Error("Blocked Route B next-turn draft must not call provider.");
    },
  };
}

function buildRouteBNextTurnUsageLogger(options: {
  session: AppSession;
  sessionId: string;
  clientId?: string | null;
  latencyStartedAt: number;
}): TheaterRouteBNextTurnUsageLogger {
  return {
    async writeSuccess(draft) {
      const usageLog = await writeRouteBProviderUsageLog({
        ...options,
        draft,
        error: null,
      });

      return toUsageLogRecord(usageLog.id, draft);
    },
    async writeError(draft) {
      const usageLog = await writeRouteBProviderUsageLog({
        ...options,
        draft,
        error: draft.errorCode ?? "PROVIDER_ERROR",
      });

      return toUsageLogRecord(usageLog.id, draft);
    },
  };
}

async function writeRouteBProviderUsageLog(options: {
  session: AppSession;
  sessionId: string;
  clientId?: string | null;
  latencyStartedAt: number;
  draft: TheaterRouteBNextTurnUsageLogDraft;
  error: string | null;
}) {
  const data = {
    organizationId: options.session.organization.id,
    unitId: options.session.membership.primaryUnitId,
    userId: options.session.user.id,
    clientId: normalizeOptionalId(options.clientId),
    provider: AiProvider.OPENAI,
    module: AiModule.THEATER,
    model: options.draft.model,
    promptTokens: options.draft.inputTokens,
    completionTokens: options.draft.outputTokens,
    totalTokens: sumTokens(options.draft.inputTokens, options.draft.outputTokens),
    latencyMs: Date.now() - options.latencyStartedAt,
    error: options.error,
    traceSource: "theater" as const,
    theaterSessionId: options.sessionId,
  };

  if (options.error) {
    return prisma.aiUsageLog.create({ data, select: { id: true } });
  }

  return prisma.$transaction(async (tx) => {
    const usageLog = await tx.aiUsageLog.create({ data, select: { id: true } });

    await tx.organization.update({
      where: { id: options.session.organization.id },
      data: { monthlyAiUsed: { increment: 1 } },
    });

    return usageLog;
  });
}

function toUsageLogRecord(
  usageLogId: string,
  draft: TheaterRouteBNextTurnUsageLogDraft,
): TheaterRouteBNextTurnUsageLogRecord {
  return {
    ...draft,
    usageLogId,
  };
}

function parseProviderCandidateJson(content: string):
  | { success: true; data: z.infer<typeof providerCandidateJsonSchema> }
  | { success: false; error: string } {
  try {
    const parsed = JSON.parse(content);
    const result = providerCandidateJsonSchema.safeParse(parsed);

    if (!result.success) {
      return { success: false, error: "Route B next-turn provider schema mismatch." };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: normalizeAiError(error, "Route B next-turn provider output was not valid JSON."),
    };
  }
}

function findRouteBProviderCandidatePayloadViolations(value: unknown, path = "body"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findRouteBProviderCandidatePayloadViolations(item, `${path}[${index}]`));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const nextPath = `${path}.${key}`;
      const keyViolation = isUnsafeKey(key) ? [nextPath] : [];
      return [...keyViolation, ...findRouteBProviderCandidatePayloadViolations(item, nextPath)];
    });
  }

  if (typeof value === "string" && isUnsafeText(value)) {
    return [path];
  }

  return [];
}

function isUnsafeKey(key: string): boolean {
  return /(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|rawPrivateTranscript|directPrivateDialog)/i.test(
    key,
  );
}

function isUnsafeText(value: string): boolean {
  return /(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|rawPrivateTranscript|directPrivateDialog)/i.test(
    value,
  );
}

function shouldForceQuotaExceededForQa(req: Request, body: z.infer<typeof routeBProviderCandidateInputSchema>): boolean {
  return process.env.NODE_ENV !== "production" && body.dryRun === true && req.headers.get("x-asai-qa-force-quota-exceeded") === "true";
}

function shouldForceProviderDisabledForQa(req: Request, body: z.infer<typeof routeBProviderCandidateInputSchema>): boolean {
  return process.env.NODE_ENV !== "production" && body.dryRun === true && req.headers.get("x-asai-qa-force-provider-disabled") === "true";
}

function shouldForceProviderErrorForQa(req: Request, body: z.infer<typeof routeBProviderCandidateInputSchema>): boolean {
  return process.env.NODE_ENV !== "production" && body.dryRun === true && req.headers.get("x-asai-qa-force-provider-error") === "true";
}

function buildGuardSafety(options: { quotaChecked: boolean; quotaBlocked?: boolean }) {
  return {
    quotaChecked: options.quotaChecked,
    quotaBlocked: options.quotaBlocked ?? false,
    providerCallAttempted: false,
    aiUsageLogRequired: false,
    aiUsageLogWritten: false,
    appendCandidateCreated: false,
    storesRawProviderPayload: false,
    rawPrivateTranscriptIncluded: false,
    writesConfirmedCrmFact: false,
  };
}

function buildProviderSafety(options: { aiUsageLogWritten: boolean }) {
  return {
    quotaChecked: true,
    providerCallAttempted: true,
    aiUsageLogRequired: true,
    aiUsageLogWritten: options.aiUsageLogWritten,
    storesRawProviderPayload: false,
    rawPrivateTranscriptIncluded: false,
    writesConfirmedCrmFact: false,
  };
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeOptionalId(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function sumTokens(inputTokens: number | undefined, outputTokens: number | undefined) {
  return typeof inputTokens === "number" || typeof outputTokens === "number"
    ? (inputTokens ?? 0) + (outputTokens ?? 0)
    : undefined;
}

const ROUTE_B_NEXT_TURN_SYSTEM_PROMPT = `你是誠問 AI 的 Route B 保險顧問劇場角色引擎。
只根據使用者提供的安全 nextTurn / promptContext 摘要輸出。
不得輸出法律意見、不得宣稱已寫入 CRM 事實、不得包含 raw provider payload、私聊逐字稿、email、電話、保單號、secret、token、cookie、OTP 或 payment data。
只輸出 JSON：{"content":"一段繁體中文角色或旁白回覆，等待顧問確認後才可寫入劇場"}`;
