import { z } from "zod";
import {
  createCorrectionMemory,
  createMemoryCandidatesFromTurn,
} from "../../domains/interview/memory";
import type {
  InterviewKind,
  InterviewMemory,
  InterviewModality,
  InterviewTurnRole,
} from "../../domains/interview/types";

export const INTERVIEW_REALTIME_MODEL = "gpt-realtime-2";
export const INTERVIEW_REALTIME_TRANSCRIPTION_MODEL = "gpt-realtime-whisper";
export const INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS = 300;
export const OPENAI_REALTIME_CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/client_secrets";

export const realtimeSessionRequestSchema = z.object({
  clientId: z.string().trim().max(80).optional(),
  sessionId: z.string().trim().max(120).optional(),
  currentSegmentId: z.string().trim().max(120).optional(),
  interviewKind: z.enum(["ADVISOR_COMPANION", "THEATER_FIELD_BUILD"]).default("ADVISOR_COMPANION"),
  dryRun: z.boolean().optional(),
});

export type RealtimeSessionRequest = z.infer<typeof realtimeSessionRequestSchema>;

export const realtimeEventSchema = z.object({
  type: z.enum([
    "FINAL_TRANSCRIPT",
    "ASSISTANT_TRANSCRIPT",
    "INTERRUPT",
    "CORRECTION",
    "CONFIRMATION",
  ]),
  sessionId: z.string().trim().max(120),
  clientId: z.string().trim().max(80).optional(),
  turnId: z.string().trim().max(120).optional(),
  providerEventId: z.string().trim().max(160).optional(),
  currentSegmentId: z.string().trim().max(120).optional(),
  interviewKind: z.enum(["ADVISOR_COMPANION", "THEATER_FIELD_BUILD"]).default("ADVISOR_COMPANION"),
  text: z.string().trim().max(4000).optional(),
  transcriptFinal: z.boolean().default(true),
  supersedesMemoryId: z.string().trim().max(160).optional(),
  createdAt: z.string().datetime().optional(),
});

export type RealtimeEventInput = z.infer<typeof realtimeEventSchema>;

export interface RealtimeIdentityContext {
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  clientId?: string | null;
}

export interface SanitizedRealtimeSession {
  provider: "OPENAI" | "DRY_RUN";
  endpoint: "/v1/realtime/client_secrets";
  model: string;
  clientSecret: {
    value: string;
    expiresAt: number;
  };
  session: {
    id?: string;
    type: "realtime";
  };
  ttlSeconds: number;
  rawAudioStored: false;
}

export interface RealtimeEventMirrorResult {
  accepted: true;
  mirroredEventId: string;
  eventType: RealtimeEventInput["type"];
  rawAudioStored: false;
  memoryCandidates: InterviewMemory[];
}

const DISALLOWED_EVENT_KEY_PATTERNS = [
  /authorization/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /api[_-]?key/i,
  /openai/i,
  /server[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /^token$/i,
  /client[_-]?secret/i,
  /^secret$/i,
  /raw[_-]?audio/i,
  /^audio$/i,
  /audio[_-]?data/i,
  /audio[_-]?base64/i,
  /^base64$/i,
  /^pcm$/i,
  /^buffer$/i,
  /^blob$/i,
  /file[_-]?data/i,
];

const SERVER_SECRET_VALUE_PATTERNS = [/sk-[A-Za-z0-9_-]{12,}/, /OPENAI_API_KEY/i, /Bearer\s+sk-/i];

export function buildOpenAIRealtimeClientSecretRequest(input: {
  instructions: string;
  model?: string;
  ttlSeconds?: number;
}) {
  const ttlSeconds = clampTtl(input.ttlSeconds ?? INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS);

  return {
    expires_after: {
      anchor: "created_at",
      seconds: ttlSeconds,
    },
    session: {
      type: "realtime",
      model: input.model ?? INTERVIEW_REALTIME_MODEL,
      instructions: input.instructions,
      audio: {
        input: {
          transcription: {
            model: INTERVIEW_REALTIME_TRANSCRIPTION_MODEL,
            language: "zh",
          },
          noise_reduction: { type: "near_field" },
          turn_detection: {
            type: "server_vad",
            create_response: true,
            interrupt_response: true,
          },
        },
      },
    },
  };
}

export function sanitizeRealtimeClientSecretResponse(
  raw: unknown,
  options: { model?: string; ttlSeconds?: number; provider?: "OPENAI" | "DRY_RUN" } = {},
): SanitizedRealtimeSession {
  const record = asRecord(raw) ?? {};
  const rawClientSecret = asRecord(record.client_secret);
  const rawSession = asRecord(record.session) ?? record;
  const secretValue = stringValue(record.value) ?? stringValue(rawClientSecret?.value);
  const expiresAt = numberValue(record.expires_at) ?? numberValue(rawClientSecret?.expires_at);

  if (!secretValue || !expiresAt) {
    throw new Error("Realtime client secret response missing value or expires_at.");
  }

  return {
    provider: options.provider ?? "OPENAI",
    endpoint: "/v1/realtime/client_secrets",
    model: options.model ?? stringValue(rawSession?.model) ?? INTERVIEW_REALTIME_MODEL,
    clientSecret: {
      value: secretValue,
      expiresAt,
    },
    session: {
      id: stringValue(rawSession?.id),
      type: "realtime",
    },
    ttlSeconds: options.ttlSeconds ?? INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS,
    rawAudioStored: false,
  };
}

export function createDryRunRealtimeClientSecret(
  input: { sessionId?: string; model?: string; ttlSeconds?: number } = {},
): SanitizedRealtimeSession {
  const ttlSeconds = input.ttlSeconds ?? INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS;
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

  return sanitizeRealtimeClientSecretResponse(
    {
      value: `ek_dry_run_${input.sessionId ?? "interview"}`,
      expires_at: expiresAt,
      session: {
        id: `rt_dry_${input.sessionId ?? "interview"}`,
        type: "realtime",
        model: input.model ?? INTERVIEW_REALTIME_MODEL,
      },
    },
    {
      model: input.model ?? INTERVIEW_REALTIME_MODEL,
      ttlSeconds,
      provider: "DRY_RUN",
    },
  );
}

export function findRealtimeEventPayloadViolations(value: unknown): string[] {
  const violations = new Set<string>();
  visitPayload(value, "$", violations);
  return [...violations].sort();
}

export function mirrorRealtimeEventToMemoryCandidates(
  event: RealtimeEventInput,
  identity: RealtimeIdentityContext,
): RealtimeEventMirrorResult {
  const text = event.text?.trim() ?? "";
  const mirroredEventId = event.providerEventId ?? stableMirrorId(event);
  const memoryCandidates = createEventMemoryCandidates(event, identity, mirroredEventId, text);

  return {
    accepted: true,
    mirroredEventId,
    eventType: event.type,
    rawAudioStored: false,
    memoryCandidates,
  };
}

export function responseContainsServerSecret(response: unknown, serverSecret?: string | null): boolean {
  const serialized = JSON.stringify(response);
  if (serverSecret && serialized.includes(serverSecret)) {
    return true;
  }

  return SERVER_SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(serialized));
}

function createEventMemoryCandidates(
  event: RealtimeEventInput,
  identity: RealtimeIdentityContext,
  mirroredEventId: string,
  text: string,
): InterviewMemory[] {
  if (!text || event.type === "INTERRUPT") {
    return [];
  }

  const role = turnRoleForEvent(event.type);
  const modality = modalityForEvent(event.type);
  const base = {
    organizationId: identity.organizationId,
    memberId: identity.memberId,
    unitId: identity.unitId,
    clientId: identity.clientId,
    interviewSessionId: event.sessionId,
    turnId: event.turnId ?? mirroredEventId,
    interviewKind: event.interviewKind as InterviewKind,
    role,
    modality,
    content: text,
    transcriptFinal: event.transcriptFinal,
    createdAt: event.createdAt,
    outlineSegmentId: event.currentSegmentId,
  };

  if ((event.type === "CORRECTION" || event.type === "CONFIRMATION") && event.supersedesMemoryId) {
    return [
      createCorrectionMemory({
        ...base,
        supersedesMemoryId: event.supersedesMemoryId,
      }),
    ];
  }

  return createMemoryCandidatesFromTurn({
    ...base,
    dataClass:
      event.type === "CORRECTION" || event.type === "CONFIRMATION" ? "CONFIRMED" : undefined,
    kind: event.type === "CORRECTION" ? "CORRECTION" : undefined,
    source:
      event.type === "CORRECTION" || event.type === "CONFIRMATION"
        ? "USER_CONFIRMATION"
        : undefined,
    confidence:
      event.type === "CORRECTION" || event.type === "CONFIRMATION" ? "HIGH" : undefined,
  });
}

function turnRoleForEvent(type: RealtimeEventInput["type"]): InterviewTurnRole {
  if (type === "ASSISTANT_TRANSCRIPT") return "ASSISTANT";
  return "USER";
}

function modalityForEvent(type: RealtimeEventInput["type"]): InterviewModality {
  if (type === "CORRECTION" || type === "CONFIRMATION") return "VOICE_TRANSCRIPT_FALLBACK";
  return "VOICE_REALTIME";
}

function stableMirrorId(event: RealtimeEventInput): string {
  const content = [event.sessionId, event.type, event.turnId ?? "", event.text ?? ""].join("|");
  let hash = 0;
  for (let index = 0; index < content.length; index += 1) {
    hash = (hash * 31 + content.charCodeAt(index)) >>> 0;
  }

  return `rt_evt_${hash.toString(16)}`;
}

function visitPayload(value: unknown, path: string, violations: Set<string>): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitPayload(item, `${path}[${index}]`, violations));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (DISALLOWED_EVENT_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        violations.add(childPath);
      }
      visitPayload(child, childPath, violations);
    }
    return;
  }

  if (typeof value === "string" && SERVER_SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    violations.add(path);
  }
}

function clampTtl(value: number): number {
  return Math.min(7200, Math.max(10, Math.round(value)));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
