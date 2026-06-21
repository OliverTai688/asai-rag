import OpenAI from "openai";
import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import { normalizeAiError } from "@/lib/ai/generation-usage-repository";
import { canUseAiModule } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import {
  assertMeetingMemoryChatSafety,
  buildMeetingMemoryChatProviderSafety,
  buildProviderMemoryChatAnswer,
  persistMeetingMemoryChatProviderFailure,
  persistMeetingMemoryChatProviderSuccess,
  prepareClientMemoryChatForMember,
  prepareMeetingMemoryChatForSession,
  type MeetingMemoryChatInput,
  type MeetingMemoryChatPreparation,
  type MeetingMemoryChatProviderUsage,
} from "./meeting-memory-chat-repository";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";
const QA_PROVIDER_ERROR_MODEL = "asai-qa-forced-invalid-model";

const providerMemoryChatItemSchema = z.object({
  text: z.string().trim().min(1).max(700),
  citationIds: z.array(z.string().trim().min(1).max(180)).min(1).max(4),
});

const providerMemoryChatJsonSchema = z.object({
  answer: z.string().trim().min(1).max(1800),
  facts: z.array(providerMemoryChatItemSchema).max(4).default([]),
  inferences: z.array(providerMemoryChatItemSchema).max(4).default([]),
  unknowns: z.array(providerMemoryChatItemSchema).max(4).default([]),
});

type ProviderMemoryChatJson = z.infer<typeof providerMemoryChatJsonSchema>;
type ReadyMemoryChatPreparation = Extract<MeetingMemoryChatPreparation, { status: "ready" }>;

interface ProviderMemoryChatRouteResult {
  response: Response;
  providerAttempted: boolean;
  providerUsageLogged: boolean;
  providerContext?: ReadyMemoryChatPreparation;
  model: string;
}

interface ProviderMemoryChatRouteLabels {
  notFoundError: string;
  notFoundStatus: number;
  clientScopeError?: string;
  groundingEmptyError: string;
  safetyFailedError: string;
  providerDisabledError: string;
  providerEmptyError: string;
  providerSchemaError: string;
  providerCitationError: string;
  providerFailedError: string;
}

export async function generateProviderMemoryChatForSession(
  req: Request,
  session: AppSession,
  sessionId: string,
  input: MeetingMemoryChatInput,
  startedAt: number,
): Promise<ProviderMemoryChatRouteResult> {
  const preparation = await prepareMeetingMemoryChatForSession(session, sessionId, input);

  return generateProviderMemoryChatResponse(req, session, input, startedAt, preparation, {
    notFoundError: "MEETING_SESSION_NOT_FOUND",
    notFoundStatus: 404,
    clientScopeError: "MEETING_CLIENT_SCOPE_REQUIRED",
    groundingEmptyError: "MEETING_MEMORY_GROUNDING_EMPTY",
    safetyFailedError: "MEETING_MEMORY_CHAT_SAFETY_FAILED",
    providerDisabledError: "MEETING_MEMORY_CHAT_PROVIDER_DISABLED",
    providerEmptyError: "MEETING_MEMORY_CHAT_PROVIDER_EMPTY",
    providerSchemaError: "MEETING_MEMORY_CHAT_PROVIDER_SCHEMA_MISMATCH",
    providerCitationError: "MEETING_MEMORY_CHAT_PROVIDER_CITATION_MISMATCH",
    providerFailedError: "MEETING_MEMORY_CHAT_PROVIDER_FAILED",
  });
}

export async function generateProviderMemoryChatForClient(
  req: Request,
  session: AppSession,
  clientId: string,
  input: MeetingMemoryChatInput,
  startedAt: number,
): Promise<ProviderMemoryChatRouteResult> {
  const preparation = await prepareClientMemoryChatForMember(session, clientId, input);

  return generateProviderMemoryChatResponse(req, session, input, startedAt, preparation, {
    notFoundError: "CLIENT_MEMORY_CHAT_FORBIDDEN",
    notFoundStatus: 403,
    groundingEmptyError: "CLIENT_MEMORY_GROUNDING_EMPTY",
    safetyFailedError: "CLIENT_MEMORY_CHAT_SAFETY_FAILED",
    providerDisabledError: "CLIENT_MEMORY_CHAT_PROVIDER_DISABLED",
    providerEmptyError: "CLIENT_MEMORY_CHAT_PROVIDER_EMPTY",
    providerSchemaError: "CLIENT_MEMORY_CHAT_PROVIDER_SCHEMA_MISMATCH",
    providerCitationError: "CLIENT_MEMORY_CHAT_PROVIDER_CITATION_MISMATCH",
    providerFailedError: "CLIENT_MEMORY_CHAT_PROVIDER_FAILED",
  });
}

async function generateProviderMemoryChatResponse(
  req: Request,
  session: AppSession,
  input: MeetingMemoryChatInput,
  startedAt: number,
  preparation: MeetingMemoryChatPreparation | null,
  labels: ProviderMemoryChatRouteLabels,
): Promise<ProviderMemoryChatRouteResult> {
  let providerAttempted = false;
  let providerUsageLogged = false;
  const model = shouldForceProviderErrorForQa(req, input) ? QA_PROVIDER_ERROR_MODEL : MODEL;

  if (!preparation) {
    return {
      response: Response.json({ error: labels.notFoundError }, { status: labels.notFoundStatus }),
      providerAttempted,
      providerUsageLogged,
      model,
    };
  }

  if (preparation.status === "client_scope_missing") {
    return {
      response: Response.json(
        {
          error: labels.clientScopeError ?? labels.notFoundError,
          safety: preparation.safety,
        },
        { status: 409 },
      ),
      providerAttempted,
      providerUsageLogged,
      model,
    };
  }

  if (preparation.status === "grounding_empty") {
    return {
      response: Response.json(
        {
          error: labels.groundingEmptyError,
          safety: preparation.safety,
        },
        { status: 409 },
      ),
      providerAttempted,
      providerUsageLogged,
      model,
    };
  }

  if (preparation.status === "safety_failed") {
    return {
      response: Response.json(
        {
          error: labels.safetyFailedError,
          safetyFailures: preparation.safetyFailures,
          safety: preparation.safety,
        },
        { status: 409 },
      ),
      providerAttempted,
      providerUsageLogged,
      model,
    };
  }

  const readyPreparation = preparation as ReadyMemoryChatPreparation;

  const quota = shouldForceQuotaExceededForQa(req, input)
    ? { allowed: false, code: "QUOTA_EXCEEDED" as const, remaining: 0 }
    : canUseAiModule(session, AiModule.MEETING);

  if (!quota.allowed) {
    return {
      response: Response.json(
        {
          error: quota.code,
          remaining: quota.remaining,
          safety: buildMeetingMemoryChatProviderSafety({
            quotaChecked: true,
            quotaBlocked: true,
            aiUsageLogRequired: false,
          }),
        },
        { status: 429 },
      ),
      providerAttempted,
      providerUsageLogged,
      providerContext: readyPreparation,
      model,
    };
  }

  if (shouldForceProviderDisabledForQa(req, input) || !process.env.OPENAI_API_KEY) {
    return {
      response: Response.json(
        {
          error: labels.providerDisabledError,
          safety: buildMeetingMemoryChatProviderSafety({
            quotaChecked: true,
            aiUsageLogRequired: false,
          }),
        },
        { status: 503 },
      ),
      providerAttempted,
      providerUsageLogged,
      providerContext: readyPreparation,
      model,
    };
  }

  try {
    providerAttempted = true;
    const providerResponse = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: MEETING_MEMORY_CHAT_PROVIDER_SYSTEM_PROMPT },
        { role: "user", content: buildProviderMemoryChatPrompt(readyPreparation) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const usage: MeetingMemoryChatProviderUsage = {
      model,
      requestId: providerResponse.id,
      promptTokens: providerResponse.usage?.prompt_tokens,
      completionTokens: providerResponse.usage?.completion_tokens,
      totalTokens: providerResponse.usage?.total_tokens,
      latencyMs: Date.now() - startedAt,
    };
    const content = providerResponse.choices[0]?.message.content;

    if (!content) {
      await persistMeetingMemoryChatProviderFailure({
        session,
        clientId: readyPreparation.clientId,
        interviewSessionId: readyPreparation.sessionId,
        usage,
        error: "Meeting memory chat provider returned empty content",
      });
      providerUsageLogged = true;

      return {
        response: Response.json({ error: labels.providerEmptyError }, { status: 502 }),
        providerAttempted,
        providerUsageLogged,
        providerContext: readyPreparation,
        model,
      };
    }

    const parsedProviderJson = parseProviderMemoryChatJson(content);

    if (!parsedProviderJson.success) {
      await persistMeetingMemoryChatProviderFailure({
        session,
        clientId: readyPreparation.clientId,
        interviewSessionId: readyPreparation.sessionId,
        usage,
        error: parsedProviderJson.error,
      });
      providerUsageLogged = true;

      return {
        response: Response.json({ error: labels.providerSchemaError }, { status: 502 }),
        providerAttempted,
        providerUsageLogged,
        providerContext: readyPreparation,
        model,
      };
    }

    const citationFailures = providerCitationFailures(parsedProviderJson.data, readyPreparation);

    if (citationFailures.length > 0) {
      await persistMeetingMemoryChatProviderFailure({
        session,
        clientId: readyPreparation.clientId,
        interviewSessionId: readyPreparation.sessionId,
        usage,
        error: "Meeting memory chat provider cited unknown or missing sources",
      });
      providerUsageLogged = true;

      return {
        response: Response.json(
          {
            error: labels.providerCitationError,
            safetyFailures: citationFailures,
            safety: buildMeetingMemoryChatProviderSafety({
              providerCallAttempted: true,
              aiUsageLogWritten: true,
              quotaChecked: true,
            }),
          },
          { status: 502 },
        ),
        providerAttempted,
        providerUsageLogged,
        providerContext: readyPreparation,
        model,
      };
    }

    const answer = buildProviderMemoryChatAnswer({
      question: readyPreparation.question,
      answer: parsedProviderJson.data.answer,
      facts: parsedProviderJson.data.facts,
      inferences: parsedProviderJson.data.inferences,
      unknowns: parsedProviderJson.data.unknowns,
      citations: readyPreparation.answer.citations,
      fallback: readyPreparation.answer,
    });
    const safetyFailures = assertMeetingMemoryChatSafety(answer);

    if (safetyFailures.length > 0) {
      await persistMeetingMemoryChatProviderFailure({
        session,
        clientId: readyPreparation.clientId,
        interviewSessionId: readyPreparation.sessionId,
        usage,
        error: `Meeting memory chat safety failed: ${safetyFailures.join(", ")}`,
      });
      providerUsageLogged = true;

      return {
        response: Response.json(
          {
            error: labels.safetyFailedError,
            safetyFailures,
            safety: buildMeetingMemoryChatProviderSafety({
              providerCallAttempted: true,
              aiUsageLogWritten: true,
              quotaChecked: true,
            }),
          },
          { status: 409 },
        ),
        providerAttempted,
        providerUsageLogged,
        providerContext: readyPreparation,
        model,
      };
    }

    const usageLogId = await persistMeetingMemoryChatProviderSuccess({
      session,
      clientId: readyPreparation.clientId,
      interviewSessionId: readyPreparation.sessionId,
      usage,
    });
    providerUsageLogged = true;

    return {
      response: Response.json({
        status: "answered",
        clientId: readyPreparation.clientId,
        sessionId: readyPreparation.sessionId,
        answer,
        provider: "OPENAI",
        model,
        usageLogId,
        safety: buildMeetingMemoryChatProviderSafety({
          providerCallAttempted: true,
          aiUsageLogWritten: true,
          quotaChecked: true,
        }),
      }),
      providerAttempted,
      providerUsageLogged,
      providerContext: readyPreparation,
      model,
    };
  } catch (error) {
    if (providerAttempted) {
      await persistMeetingMemoryChatProviderFailure({
        session,
        clientId: readyPreparation.clientId,
        interviewSessionId: readyPreparation.sessionId,
        usage: {
          model,
          latencyMs: Date.now() - startedAt,
        },
        error: normalizeAiError(error, "Meeting memory chat provider failed"),
      });
      providerUsageLogged = true;
    }

    return {
      response: Response.json({ error: labels.providerFailedError }, { status: 502 }),
      providerAttempted,
      providerUsageLogged,
      providerContext: readyPreparation,
      model,
    };
  }
}

const MEETING_MEMORY_CHAT_PROVIDER_SYSTEM_PROMPT = `你是誠問 AI 的保險顧問會議記憶對答引擎。
你只能根據使用者提供的 ALLOWED_CITATIONS 回答，不得引用未提供內容。
必須區分 facts、inferences、unknowns；不要把推論或未知事項寫成已確認事實。
每個 facts/inferences/unknowns item 必須提供 citationIds，且只能使用 ALLOWED_CITATIONS 的 id。
不要輸出逐字稿、raw prompt、provider payload、個資聯絡方式、保單號或任何 JSON 以外文字。
輸出 JSON schema：
{
  "answer": "string",
  "facts": [{ "text": "string", "citationIds": ["citation-id"] }],
  "inferences": [{ "text": "string", "citationIds": ["citation-id"] }],
  "unknowns": [{ "text": "string", "citationIds": ["citation-id"] }]
}`;

function buildProviderMemoryChatPrompt(preparation: ReadyMemoryChatPreparation): string {
  return JSON.stringify({
    question: preparation.question,
    instructions: [
      "Use Traditional Chinese.",
      "Answer only from ALLOWED_CITATIONS.",
      "Keep facts, inferences, and unknowns separate.",
      "Keep the answer concise and advisor-actionable.",
      "Do not create CRM facts or claim that anything has been written back.",
    ],
    ALLOWED_CITATIONS: preparation.answer.citations.map((citation) => ({
      id: citation.id,
      sourceType: citation.sourceType,
      sourceLabel: citation.sourceLabel,
      dataClass: citation.dataClass,
      occurredAt: citation.occurredAt,
      snippet: citation.snippet,
    })),
  });
}

function parseProviderMemoryChatJson(content: string):
  | { success: true; data: ProviderMemoryChatJson }
  | { success: false; error: string } {
  try {
    const parsed = JSON.parse(content);
    const schemaResult = providerMemoryChatJsonSchema.safeParse(parsed);

    if (!schemaResult.success) {
      return { success: false, error: "Provider JSON did not match MeetingMemoryChat schema" };
    }

    return { success: true, data: schemaResult.data };
  } catch {
    return { success: false, error: "Provider output was not valid JSON" };
  }
}

function providerCitationFailures(data: ProviderMemoryChatJson, preparation: ReadyMemoryChatPreparation): string[] {
  const allowedCitationIds = new Set(preparation.answer.citations.map((citation) => citation.id));
  const failures: string[] = [];
  const items = [
    ...data.facts.map((item, index) => ({ kind: "fact", index, item })),
    ...data.inferences.map((item, index) => ({ kind: "inference", index, item })),
    ...data.unknowns.map((item, index) => ({ kind: "unknown", index, item })),
  ];

  for (const { kind, index, item } of items) {
    if (item.citationIds.length === 0) {
      failures.push(`${kind}-${index + 1} missing citation`);
    }

    for (const citationId of item.citationIds) {
      if (!allowedCitationIds.has(citationId)) {
        failures.push(`${kind}-${index + 1} unknown citation ${citationId}`);
      }
    }
  }

  return failures;
}

function shouldForceQuotaExceededForQa(req: Request, body: MeetingMemoryChatInput): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-quota-exceeded") === "true"
  );
}

function shouldForceProviderDisabledForQa(req: Request, body: MeetingMemoryChatInput): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-provider-disabled") === "true"
  );
}

function shouldForceProviderErrorForQa(req: Request, body: MeetingMemoryChatInput): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-provider-error") === "true"
  );
}
