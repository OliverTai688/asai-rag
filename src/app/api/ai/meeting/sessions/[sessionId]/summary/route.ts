import OpenAI from "openai";
import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import { buildProviderMeetingSummary } from "@/domains/interview/meeting";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { normalizeAiError } from "@/lib/ai/generation-usage-repository";
import { findMeetingPayloadViolations } from "@/lib/interview/meeting-session-repository";
import {
  buildMeetingSummaryProviderSafety,
  generateMeetingSummaryForMember,
  persistMeetingSummaryProviderFailure,
  persistMeetingSummaryProviderSuccess,
  persistPreparedMeetingSummary,
  prepareMeetingSummaryGenerationForMember,
  readMeetingSummaryForMember,
  type MeetingSummaryGenerationPreparation,
  type MeetingSummaryProviderUsage,
} from "@/lib/interview/meeting-summary-repository";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";
const QA_PROVIDER_ERROR_MODEL = "asai-qa-forced-invalid-model";

const generateMeetingSummaryInputSchema = z
  .object({
    mode: z.enum(["DETERMINISTIC_NO_PROVIDER", "PROVIDER_JSON"]).default("DETERMINISTIC_NO_PROVIDER"),
    overwrite: z.boolean().default(true),
    dryRun: z.boolean().optional().default(false),
  })
  .strict();

const providerMeetingDataClassSchema = z.enum(["CONFIRMED", "FACT", "INFERENCE", "UNKNOWN"]);
const providerParticipantRoleSchema = z.enum(["FOCUS_CLIENT", "FAMILY", "ADVISOR", "OTHER"]);
const providerSummaryItemSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  text: z.string().trim().min(1).max(900),
  dataClass: providerMeetingDataClassSchema,
  citationTurnIds: z.array(z.string().trim().min(1).max(120)).min(1).max(6),
});
const providerActionItemSchema = providerSummaryItemSchema.extend({
  ownerHint: z.string().trim().min(1).max(120).nullable().optional(),
  dueHint: z.string().trim().min(1).max(120).nullable().optional(),
});
const providerMeetingSummarySchema = z.object({
  headline: z.string().trim().min(1).max(240),
  summary: z.string().trim().min(1).max(2400),
  participants: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80).optional(),
        name: z.string().trim().min(1).max(80),
        role: providerParticipantRoleSchema,
        mentionCount: z.coerce.number().int().min(0).max(999).default(1),
      }),
    )
    .max(12)
    .default([]),
  decisions: z.array(providerSummaryItemSchema).max(3).default([]),
  actionItems: z.array(providerActionItemSchema).max(4).default([]),
  openQuestions: z.array(providerSummaryItemSchema).max(4).default([]),
});

type GenerateMeetingSummaryRouteInput = z.infer<typeof generateMeetingSummaryInputSchema>;
type ProviderMeetingSummaryJson = z.infer<typeof providerMeetingSummarySchema>;

interface MeetingSummaryRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: MeetingSummaryRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const result = await readMeetingSummaryForMember(session, sessionId);

    if (!result) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "empty") {
      return Response.json(result);
    }

    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: MeetingSummaryRouteContext) {
  const startedAt = Date.now();
  let session: AppSession | undefined;
  let providerAttempted = false;
  let providerUsageLogged = false;
  let providerContext:
    | Extract<MeetingSummaryGenerationPreparation, { status: "ready" }>
    | undefined;
  let model = MODEL;

  try {
    session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const blockedPayloadPaths = findMeetingPayloadViolations(body);

    if (blockedPayloadPaths.length > 0) {
      return Response.json(
        {
          error: "MEETING_PAYLOAD_BLOCKED",
          blockedPayloadPaths,
        },
        { status: 409 },
      );
    }

    const parsedBody = generateMeetingSummaryInputSchema.safeParse(body ?? {});

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_MEETING_SUMMARY_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (parsedBody.data.mode === "PROVIDER_JSON") {
      const providerResult = await generateProviderMeetingSummaryForMember(req, session, sessionId, parsedBody.data, startedAt);

      providerAttempted = providerResult.providerAttempted;
      providerUsageLogged = providerResult.providerUsageLogged;
      providerContext = providerResult.providerContext;
      model = providerResult.model;

      return providerResult.response;
    }

    const result = await generateMeetingSummaryForMember(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "source_empty") {
      return Response.json(
        {
          error: "MEETING_SUMMARY_SOURCE_EMPTY",
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    if (result.status === "already_exists") {
      return Response.json(
        {
          error: "MEETING_SUMMARY_ALREADY_EXISTS",
          summary: result.summary,
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    if (result.status === "safety_failed") {
      return Response.json(
        {
          error: "MEETING_SUMMARY_SAFETY_FAILED",
          safetyFailures: result.safetyFailures,
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    return Response.json(result, { status: result.status === "created" ? 201 : 200 });
  } catch (error) {
    if (!session) {
      return authErrorResponse(error);
    }

    if (providerAttempted && !providerUsageLogged) {
      await persistMeetingSummaryProviderFailure({
        session,
        clientId: providerContext?.snapshot.session.clientId,
        interviewSessionId: providerContext?.snapshot.session.id,
        usage: {
          model,
          latencyMs: Date.now() - startedAt,
        },
        error: normalizeAiError(error, "Meeting summary provider failed"),
      });
    }

    return Response.json({ error: "MEETING_SUMMARY_PROVIDER_FAILED" }, { status: 500 });
  }
}

async function generateProviderMeetingSummaryForMember(
  req: Request,
  session: AppSession,
  sessionId: string,
  input: GenerateMeetingSummaryRouteInput,
  startedAt: number,
): Promise<{
  response: Response;
  providerAttempted: boolean;
  providerUsageLogged: boolean;
  providerContext?: Extract<MeetingSummaryGenerationPreparation, { status: "ready" }>;
  model: string;
}> {
  const preparation = await prepareMeetingSummaryGenerationForMember(session, sessionId, input);
  let providerAttempted = false;
  let providerUsageLogged = false;
  const model = shouldForceProviderErrorForQa(req, input) ? QA_PROVIDER_ERROR_MODEL : MODEL;

  if (!preparation) {
    return {
      response: Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 }),
      providerAttempted,
      providerUsageLogged,
      model,
    };
  }

  if (preparation.status === "source_empty") {
    return {
      response: Response.json(
        {
          error: "MEETING_SUMMARY_SOURCE_EMPTY",
          safety: preparation.safety,
        },
        { status: 409 },
      ),
      providerAttempted,
      providerUsageLogged,
      model,
    };
  }

  if (preparation.status === "already_exists") {
    return {
      response: Response.json(
        {
          error: "MEETING_SUMMARY_ALREADY_EXISTS",
          summary: preparation.summary,
          safety: preparation.safety,
        },
        { status: 409 },
      ),
      providerAttempted,
      providerUsageLogged,
      model,
    };
  }

  const quota = shouldForceQuotaExceededForQa(req, input)
    ? { allowed: false, code: "QUOTA_EXCEEDED" as const, remaining: 0 }
    : canUseAiModule(session, AiModule.MEETING);

  if (!quota.allowed) {
    return {
      response: Response.json(
        {
          error: quota.code,
          remaining: quota.remaining,
          safety: buildMeetingSummaryProviderSafety({
            quotaChecked: true,
            quotaBlocked: true,
            aiUsageLogRequired: false,
          }),
        },
        { status: 429 },
      ),
      providerAttempted,
      providerUsageLogged,
      providerContext: preparation,
      model,
    };
  }

  if (shouldForceProviderDisabledForQa(req, input) || !process.env.OPENAI_API_KEY) {
    return {
      response: Response.json(
        {
          error: "MEETING_SUMMARY_PROVIDER_DISABLED",
          safety: buildMeetingSummaryProviderSafety({
            quotaChecked: true,
            aiUsageLogRequired: false,
          }),
        },
        { status: 503 },
      ),
      providerAttempted,
      providerUsageLogged,
      providerContext: preparation,
      model,
    };
  }

  try {
    providerAttempted = true;
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: MEETING_SUMMARY_PROVIDER_SYSTEM_PROMPT },
        { role: "user", content: buildProviderSummaryPrompt(preparation) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const providerUsage: MeetingSummaryProviderUsage = {
      model,
      requestId: response.id,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      latencyMs: Date.now() - startedAt,
    };
    const content = response.choices[0]?.message.content;

    if (!content) {
      await persistMeetingSummaryProviderFailure({
        session,
        clientId: preparation.snapshot.session.clientId,
        interviewSessionId: preparation.snapshot.session.id,
        usage: providerUsage,
        error: "Meeting summary provider returned empty content",
      });
      providerUsageLogged = true;

      return {
        response: Response.json({ error: "MEETING_SUMMARY_PROVIDER_EMPTY" }, { status: 502 }),
        providerAttempted,
        providerUsageLogged,
        providerContext: preparation,
        model,
      };
    }

    const parsedProviderJson = parseProviderSummaryJson(content);

    if (!parsedProviderJson.success) {
      await persistMeetingSummaryProviderFailure({
        session,
        clientId: preparation.snapshot.session.clientId,
        interviewSessionId: preparation.snapshot.session.id,
        usage: providerUsage,
        error: parsedProviderJson.error,
      });
      providerUsageLogged = true;

      return {
        response: Response.json({ error: "MEETING_SUMMARY_PROVIDER_SCHEMA_MISMATCH" }, { status: 502 }),
        providerAttempted,
        providerUsageLogged,
        providerContext: preparation,
        model,
      };
    }

    const summary = buildProviderMeetingSummary({
      meetingId: preparation.snapshot.session.id,
      clientName: preparation.clientName,
      generatedAt: new Date().toISOString(),
      turns: preparation.sourceTurns,
      ...parsedProviderJson.data,
    });
    const safetyFailures = summary.decisions
      .concat(summary.openQuestions)
      .filter((item) => item.citations.length === 0)
      .map((item) => `${item.id} missing citation`)
      .concat(
        summary.actionItems
          .filter((item) => item.citations.length === 0)
          .map((item) => `${item.id} missing citation`),
      );

    if (safetyFailures.length > 0) {
      await persistMeetingSummaryProviderFailure({
        session,
        clientId: preparation.snapshot.session.clientId,
        interviewSessionId: preparation.snapshot.session.id,
        usage: providerUsage,
        error: "Meeting summary provider cited unknown or missing turns",
      });
      providerUsageLogged = true;

      return {
        response: Response.json(
          {
            error: "MEETING_SUMMARY_PROVIDER_CITATION_MISMATCH",
            safetyFailures,
            safety: buildMeetingSummaryProviderSafety({
              providerCallAttempted: true,
              aiUsageLogWritten: true,
              quotaChecked: true,
            }),
          },
          { status: 502 },
        ),
        providerAttempted,
        providerUsageLogged,
        providerContext: preparation,
        model,
      };
    }

    const usageLogId = await persistMeetingSummaryProviderSuccess({
      session,
      clientId: preparation.snapshot.session.clientId,
      interviewSessionId: preparation.snapshot.session.id,
      usage: providerUsage,
    });
    providerUsageLogged = true;

    const persisted = await persistPreparedMeetingSummary(preparation, summary, {
      provider: "OPENAI",
      model,
      usageLogId,
    });

    if (persisted.status === "safety_failed") {
      return {
        response: Response.json(
          {
            error: "MEETING_SUMMARY_SAFETY_FAILED",
            safetyFailures: persisted.safetyFailures,
            safety: persisted.safety,
          },
          { status: 409 },
        ),
        providerAttempted,
        providerUsageLogged,
        providerContext: preparation,
        model,
      };
    }

    return {
      response: Response.json(persisted, { status: persisted.status === "created" ? 201 : 200 }),
      providerAttempted,
      providerUsageLogged,
      providerContext: preparation,
      model,
    };
  } catch (error) {
    if (providerAttempted) {
      await persistMeetingSummaryProviderFailure({
        session,
        clientId: preparation.snapshot.session.clientId,
        interviewSessionId: preparation.snapshot.session.id,
        usage: {
          model,
          latencyMs: Date.now() - startedAt,
        },
        error: normalizeAiError(error, "Meeting summary provider failed"),
      });
      providerUsageLogged = true;
    }

    return {
      response: Response.json({ error: "MEETING_SUMMARY_PROVIDER_FAILED" }, { status: 502 }),
      providerAttempted,
      providerUsageLogged,
      providerContext: preparation,
      model,
    };
  }
}

const MEETING_SUMMARY_PROVIDER_SYSTEM_PROMPT = `你是誠問 AI 的保險顧問會議摘要引擎。
你只根據使用者提供的 SOURCE_TURNS 產生 JSON，不得引用未提供內容。
每個 decisions、actionItems、openQuestions item 必須提供 citationTurnIds，且只能使用 SOURCE_TURNS 的 id。
不要輸出逐字稿、不要輸出 raw prompt、不要輸出任何 JSON 以外文字。
輸出 JSON schema：
{
  "headline": "string",
  "summary": "string",
  "participants": [{ "name": "string", "role": "FOCUS_CLIENT|FAMILY|ADVISOR|OTHER", "mentionCount": 1 }],
  "decisions": [{ "text": "string", "dataClass": "CONFIRMED|FACT|INFERENCE|UNKNOWN", "citationTurnIds": ["turn-id"] }],
  "actionItems": [{ "text": "string", "ownerHint": "string|null", "dueHint": "string|null", "dataClass": "CONFIRMED|INFERENCE|UNKNOWN", "citationTurnIds": ["turn-id"] }],
  "openQuestions": [{ "text": "string", "dataClass": "UNKNOWN", "citationTurnIds": ["turn-id"] }]
}`;

function buildProviderSummaryPrompt(preparation: Extract<MeetingSummaryGenerationPreparation, { status: "ready" }>): string {
  return JSON.stringify({
    clientName: preparation.clientName,
    meetingId: preparation.snapshot.session.id,
    instructions: [
      "Use Traditional Chinese.",
      "Summarize only from SOURCE_TURNS.",
      "Do not include raw transcript beyond concise summary items.",
      "Every item must cite existing SOURCE_TURNS ids.",
      "Keep facts, inferences, and unknowns separate.",
    ],
    SOURCE_TURNS: preparation.sourceTurns.map((turn) => ({
      id: turn.id,
      speakerRole: turn.speakerRole,
      speakerName: turn.speakerName,
      source: turn.source,
      dataClass: turn.dataClass ?? "FACT",
      occurredAt: turn.occurredAt,
      memoryIds: turn.memoryIds ?? [],
      text: turn.text.slice(0, 900),
    })),
  });
}

function parseProviderSummaryJson(content: string):
  | { success: true; data: ProviderMeetingSummaryJson }
  | { success: false; error: string } {
  try {
    const parsed = JSON.parse(content);
    const schemaResult = providerMeetingSummarySchema.safeParse(parsed);

    if (!schemaResult.success) {
      return { success: false, error: "Provider JSON did not match MeetingSummary schema" };
    }

    return { success: true, data: schemaResult.data };
  } catch {
    return { success: false, error: "Provider output was not valid JSON" };
  }
}

function shouldForceQuotaExceededForQa(req: Request, body: GenerateMeetingSummaryRouteInput): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-quota-exceeded") === "true"
  );
}

function shouldForceProviderDisabledForQa(req: Request, body: GenerateMeetingSummaryRouteInput): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-provider-disabled") === "true"
  );
}

function shouldForceProviderErrorForQa(req: Request, body: GenerateMeetingSummaryRouteInput): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-provider-error") === "true"
  );
}
