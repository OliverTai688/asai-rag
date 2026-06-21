import type {
  MeetingActionItem,
  MeetingCitation,
  MeetingDataClass,
  MeetingParticipant,
  MeetingSummary,
  MeetingSummaryGuardEvidence,
  MeetingSummaryItem,
  MeetingTranscriptSource,
  MeetingTranscriptTurn,
} from "../../domains/interview/meeting";
import { buildMeetingSummarySkeleton } from "../../domains/interview/meeting";
import type { Prisma } from "@/generated/prisma/client";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import type { InterviewMeetingSummaryModel } from "@/generated/prisma/models";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getMeetingSessionSnapshotForMember, type MeetingSessionSnapshotDto } from "./meeting-session-repository";

export const MEETING_SUMMARY_SCHEMA_VERSION = "asai.meeting.summary.v1";
export const MEETING_INTERVIEW_KIND = "CLIENT_MEETING";
export const MEETING_AI_MODULE = "MEETING";

export type MeetingPersistenceProvider = "MOCK" | "OPENAI" | "ANTHROPIC";

export interface MeetingSummarySessionScope {
  organizationId: string;
  unitId?: string | null;
  clientId?: string | null;
  sessionId: string;
  ownerId?: string | null;
}

export interface BuildMeetingSummaryPersistenceDraftInput {
  scope: MeetingSummarySessionScope;
  summary: MeetingSummary;
  provider?: MeetingPersistenceProvider | null;
  model?: string | null;
  usageLogId?: string | null;
}

export interface MeetingSummaryPersistenceDraft {
  schemaVersion: typeof MEETING_SUMMARY_SCHEMA_VERSION;
  aiUsageLogModule: typeof MEETING_AI_MODULE;
  interviewKind: typeof MEETING_INTERVIEW_KIND;
  organizationId: string;
  unitId: string | null;
  clientId: string | null;
  sessionId: string;
  ownerId: string | null;
  generatedBy: MeetingSummaryGuardEvidence["generatedBy"];
  headline: string;
  summary: string;
  decisions: MeetingSummaryItem[];
  actionItems: MeetingActionItem[];
  openQuestions: MeetingSummaryItem[];
  participants: MeetingParticipant[];
  citations: MeetingCitation[];
  sourceTurnIds: string[];
  sourceMemoryIds: string[];
  provider: MeetingPersistenceProvider | null;
  model: string | null;
  usageLogId: string | null;
  guardEvidence: MeetingSummaryGuardEvidence;
}

export interface GenerateMeetingSummaryInput {
  mode: "DETERMINISTIC_NO_PROVIDER" | "PROVIDER_JSON";
  overwrite: boolean;
}

export interface PersistedMeetingSummaryDto {
  id: string;
  organizationId: string;
  unitId: string | null;
  clientId: string | null;
  sessionId: string;
  ownerId: string | null;
  generatedBy: string;
  schemaVersion: string;
  headline: string;
  summary: string;
  decisions: MeetingSummaryItem[];
  actionItems: MeetingActionItem[];
  openQuestions: MeetingSummaryItem[];
  participants: MeetingParticipant[];
  citations: MeetingCitation[];
  sourceTurnIds: string[];
  sourceMemoryIds: string[];
  provider: MeetingPersistenceProvider | null;
  model: string | null;
  usageLogId: string | null;
  guardEvidence: MeetingSummaryGuardEvidence | null;
  createdAt: string;
  updatedAt: string;
}

export type GenerateMeetingSummaryResult =
  | {
      status: "created" | "updated";
      summary: PersistedMeetingSummaryDto;
      draft: MeetingSummaryPersistenceDraft;
      source: MeetingSummarySourceEvidence;
      safety: MeetingSummaryRouteSafety;
    }
  | {
      status: "already_exists";
      summary: PersistedMeetingSummaryDto;
      safety: MeetingSummaryRouteSafety;
    }
  | {
      status: "source_empty";
      safety: MeetingSummaryRouteSafety;
    }
  | {
      status: "safety_failed";
      safetyFailures: string[];
      safety: MeetingSummaryRouteSafety;
    };

export type ReadMeetingSummaryResult =
  | {
      status: "found";
      summary: PersistedMeetingSummaryDto;
      safety: MeetingSummaryRouteSafety;
    }
  | {
      status: "empty";
      safety: MeetingSummaryRouteSafety;
    };

export interface MeetingSummarySourceEvidence {
  sourceTurnCount: number;
  sourceMemoryCount: number;
  sourceTurnIds: string[];
  sourceMemoryIds: string[];
}

export interface MeetingSummaryRouteSafety {
  scopeSource: "server_session";
  visibilityScope: "member-private";
  providerCallAttempted: boolean;
  aiUsageLogRequired: boolean;
  aiUsageLogWritten: boolean;
  dbWriteAttempted: boolean;
  storesAudioBinary: false;
  storesRawProviderPayload: false;
  storesRawPrivateTranscriptSidecar: false;
  writesConfirmedCrmFact: false;
  generatedBy: "deterministic-skeleton" | "provider-json";
  provider: MeetingPersistenceProvider | null;
  quotaChecked: boolean;
  quotaBlocked: boolean;
}

export type MeetingSummaryGenerationPreparation =
  | {
      status: "ready";
      snapshot: MeetingSessionSnapshotDto;
      clientName: string;
      sourceTurns: MeetingTranscriptTurn[];
      source: MeetingSummarySourceEvidence;
      existingSummary: PersistedMeetingSummaryDto | null;
      safety: MeetingSummaryRouteSafety;
    }
  | {
      status: "already_exists";
      summary: PersistedMeetingSummaryDto;
      safety: MeetingSummaryRouteSafety;
    }
  | {
      status: "source_empty";
      safety: MeetingSummaryRouteSafety;
    };

export interface MeetingSummaryProviderUsage {
  model: string;
  requestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
}

export function buildMeetingSummaryPersistenceDraft(
  input: BuildMeetingSummaryPersistenceDraftInput,
): MeetingSummaryPersistenceDraft {
  const citations = allSummaryCitations(input.summary);

  return {
    schemaVersion: MEETING_SUMMARY_SCHEMA_VERSION,
    aiUsageLogModule: MEETING_AI_MODULE,
    interviewKind: MEETING_INTERVIEW_KIND,
    organizationId: input.scope.organizationId,
    unitId: normalizeOptionalId(input.scope.unitId),
    clientId: normalizeOptionalId(input.scope.clientId),
    sessionId: input.scope.sessionId,
    ownerId: normalizeOptionalId(input.scope.ownerId),
    generatedBy: input.summary.guardEvidence.generatedBy,
    headline: input.summary.headline,
    summary: input.summary.summary,
    decisions: input.summary.decisions,
    actionItems: input.summary.actionItems,
    openQuestions: input.summary.openQuestions,
    participants: input.summary.participants,
    citations,
    sourceTurnIds: uniqueStrings(citations.map((citation) => citation.turnId)),
    sourceMemoryIds: uniqueStrings(citations.flatMap((citation) => citation.memoryIds)),
    provider: input.provider ?? null,
    model: input.model ?? null,
    usageLogId: normalizeOptionalId(input.usageLogId),
    guardEvidence: input.summary.guardEvidence,
  };
}

export function assertMeetingSummaryPersistenceDraftSafety(
  draft: MeetingSummaryPersistenceDraft,
  knownTurnIds: Iterable<string>,
): string[] {
  const failures: string[] = [];
  const allowedTurnIds = new Set(knownTurnIds);
  const citedTurnIds = new Set(draft.citations.map((citation) => citation.turnId));

  if (!draft.organizationId.trim()) failures.push("missing organizationId");
  if (!draft.sessionId.trim()) failures.push("missing sessionId");
  if (draft.schemaVersion !== MEETING_SUMMARY_SCHEMA_VERSION) failures.push("schema version mismatch");
  if (draft.aiUsageLogModule !== MEETING_AI_MODULE) failures.push("AiUsageLog module mismatch");
  if (draft.interviewKind !== MEETING_INTERVIEW_KIND) failures.push("interview kind mismatch");
  if (draft.guardEvidence.providerCallAttempted && draft.guardEvidence.generatedBy !== "provider-json") {
    failures.push("unexpected provider call attempted");
  }
  if (!draft.guardEvidence.providerCallAttempted && draft.guardEvidence.generatedBy === "provider-json") {
    failures.push("provider summary missing provider call evidence");
  }
  if (draft.guardEvidence.dbWriteAttempted) failures.push("db write attempted");
  if (draft.guardEvidence.storesAudioBinary) failures.push("audio binary storage attempted");
  if (draft.guardEvidence.storesPrivateTranscript) failures.push("raw private transcript storage attempted");
  if (draft.guardEvidence.storesRawProviderPayload) failures.push("raw provider payload storage attempted");
  if (draft.guardEvidence.writesConfirmedCrmFact) failures.push("confirmed CRM write attempted");
  if (draft.provider && !draft.usageLogId) failures.push("provider summary requires usageLogId");
  if (!draft.provider && draft.usageLogId) failures.push("usageLogId set without provider");

  for (const citation of draft.citations) {
    if (!allowedTurnIds.has(citation.turnId)) {
      failures.push(`unknown citation turn ${citation.turnId}`);
    }
  }

  for (const sourceTurnId of draft.sourceTurnIds) {
    if (!citedTurnIds.has(sourceTurnId)) {
      failures.push(`sourceTurnIds contains uncited turn ${sourceTurnId}`);
    }
  }

  if (hasPrivateSentinel(draft)) {
    failures.push("private sentinel leaked into persistence draft");
  }

  return failures;
}

export async function prepareMeetingSummaryGenerationForMember(
  session: AppSession,
  sessionId: string,
  input: Pick<GenerateMeetingSummaryInput, "overwrite">,
): Promise<MeetingSummaryGenerationPreparation | null> {
  const snapshot = await getMeetingSessionSnapshotForMember(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const existing = await prisma.interviewMeetingSummary.findFirst({
    where: {
      sessionId: snapshot.session.id,
      organizationId: session.organization.id,
      ownerId: session.user.id,
    },
  });

  if (existing && !input.overwrite) {
    return {
      status: "already_exists",
      summary: toPersistedMeetingSummaryDto(existing),
      safety: meetingSummaryRouteSafety(false),
    };
  }

  if (snapshot.turns.length === 0) {
    return {
      status: "source_empty",
      safety: meetingSummaryRouteSafety(false),
    };
  }

  const sourceTurns = toMeetingTranscriptTurns(snapshot);
  const clientName = await resolveMeetingClientName(snapshot);
  const sourceMemoryIds = uniqueStrings(snapshot.memories.map((memory) => memory.id));

  return {
    status: "ready",
    snapshot,
    clientName,
    sourceTurns,
    source: {
      sourceTurnCount: snapshot.turns.length,
      sourceMemoryCount: snapshot.memories.length,
      sourceTurnIds: sourceTurns.map((turn) => turn.id),
      sourceMemoryIds,
    },
    existingSummary: existing ? toPersistedMeetingSummaryDto(existing) : null,
    safety: meetingSummaryRouteSafety(false),
  };
}

export async function persistPreparedMeetingSummary(
  preparation: Extract<MeetingSummaryGenerationPreparation, { status: "ready" }>,
  summary: MeetingSummary,
  input: {
    provider: MeetingPersistenceProvider | null;
    model: string | null;
    usageLogId: string | null;
  },
): Promise<GenerateMeetingSummaryResult> {
  const draft = buildMeetingSummaryPersistenceDraft({
    scope: {
      organizationId: preparation.snapshot.session.organizationId,
      unitId: preparation.snapshot.session.unitId,
      clientId: preparation.snapshot.session.clientId,
      sessionId: preparation.snapshot.session.id,
      ownerId: preparation.snapshot.session.ownerId,
    },
    summary,
    provider: input.provider,
    model: input.model,
    usageLogId: input.usageLogId,
  });
  const safetyFailures = assertMeetingSummaryPersistenceDraftSafety(
    draft,
    preparation.snapshot.turns.map((turn) => turn.id),
  );

  if (safetyFailures.length > 0) {
    return {
      status: "safety_failed",
      safetyFailures,
      safety: meetingSummaryRouteSafety(false, {
        providerCallAttempted: Boolean(input.provider),
        aiUsageLogRequired: Boolean(input.provider),
        aiUsageLogWritten: Boolean(input.usageLogId),
        generatedBy: summary.guardEvidence.generatedBy,
        provider: input.provider,
      }),
    };
  }

  const record = await prisma.interviewMeetingSummary.upsert({
    where: { sessionId: draft.sessionId },
    create: toMeetingSummaryCreateInput(draft),
    update: toMeetingSummaryUpdateInput(draft),
  });

  return {
    status: preparation.existingSummary ? "updated" : "created",
    summary: toPersistedMeetingSummaryDto(record),
    draft,
    source: preparation.source,
    safety: meetingSummaryRouteSafety(true, {
      providerCallAttempted: Boolean(input.provider),
      aiUsageLogRequired: Boolean(input.provider),
      aiUsageLogWritten: Boolean(input.usageLogId),
      generatedBy: summary.guardEvidence.generatedBy,
      provider: input.provider,
    }),
  };
}

export async function persistMeetingSummaryProviderSuccess(input: {
  session: AppSession;
  clientId?: string | null;
  interviewSessionId: string;
  usage: MeetingSummaryProviderUsage;
}): Promise<string> {
  const log = await prisma.$transaction(async (tx) => {
    const usageLog = await tx.aiUsageLog.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        userId: input.session.user.id,
        clientId: normalizeOptionalId(input.clientId),
        provider: AiProvider.OPENAI,
        module: AiModule.MEETING,
        model: input.usage.model,
        requestId: input.usage.requestId,
        promptTokens: input.usage.promptTokens,
        completionTokens: input.usage.completionTokens,
        totalTokens: input.usage.totalTokens,
        latencyMs: input.usage.latencyMs,
        traceSource: "interview",
        interviewSessionId: input.interviewSessionId,
      },
      select: { id: true },
    });

    await tx.organization.update({
      where: { id: input.session.organization.id },
      data: {
        monthlyAiUsed: { increment: 1 },
      },
    });

    return usageLog;
  });

  return log.id;
}

export async function persistMeetingSummaryProviderFailure(input: {
  session: AppSession;
  clientId?: string | null;
  interviewSessionId?: string | null;
  usage: MeetingSummaryProviderUsage;
  error: string;
}): Promise<void> {
  await writeAiUsageLogSafely({
    organizationId: input.session.organization.id,
    unitId: input.session.membership.primaryUnitId ?? undefined,
    userId: input.session.user.id,
    clientId: normalizeOptionalId(input.clientId) ?? undefined,
    provider: AiProvider.OPENAI,
    module: AiModule.MEETING,
    model: input.usage.model,
    requestId: input.usage.requestId,
    promptTokens: input.usage.promptTokens,
    completionTokens: input.usage.completionTokens,
    totalTokens: input.usage.totalTokens,
    latencyMs: input.usage.latencyMs,
    error: input.error.slice(0, 500),
    trace: {
      traceSource: "interview",
      interviewSessionId: normalizeOptionalId(input.interviewSessionId) ?? undefined,
    },
  });
}

export function buildMeetingSummaryProviderSafety(
  overrides: Partial<
    Pick<
      MeetingSummaryRouteSafety,
      "providerCallAttempted" | "aiUsageLogRequired" | "aiUsageLogWritten" | "dbWriteAttempted" | "quotaChecked" | "quotaBlocked"
    >
  > = {},
): MeetingSummaryRouteSafety {
  return meetingSummaryRouteSafety(overrides.dbWriteAttempted ?? false, {
    providerCallAttempted: overrides.providerCallAttempted ?? false,
    aiUsageLogRequired: overrides.aiUsageLogRequired ?? true,
    aiUsageLogWritten: overrides.aiUsageLogWritten ?? false,
    generatedBy: "provider-json",
    provider: "OPENAI",
    quotaChecked: overrides.quotaChecked ?? true,
    quotaBlocked: overrides.quotaBlocked ?? false,
  });
}

export async function generateMeetingSummaryForMember(
  session: AppSession,
  sessionId: string,
  input: GenerateMeetingSummaryInput,
): Promise<GenerateMeetingSummaryResult | null> {
  const snapshot = await getMeetingSessionSnapshotForMember(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const existing = await prisma.interviewMeetingSummary.findFirst({
    where: {
      sessionId: snapshot.session.id,
      organizationId: session.organization.id,
      ownerId: session.user.id,
    },
  });

  if (existing && !input.overwrite) {
    return {
      status: "already_exists",
      summary: toPersistedMeetingSummaryDto(existing),
      safety: meetingSummaryRouteSafety(false),
    };
  }

  if (snapshot.turns.length === 0) {
    return {
      status: "source_empty",
      safety: meetingSummaryRouteSafety(false),
    };
  }

  const clientName = await resolveMeetingClientName(snapshot);
  const summary = buildMeetingSummarySkeleton({
    meetingId: snapshot.session.id,
    clientName,
    generatedAt: new Date().toISOString(),
    turns: toMeetingTranscriptTurns(snapshot),
  });
  const draft = buildMeetingSummaryPersistenceDraft({
    scope: {
      organizationId: snapshot.session.organizationId,
      unitId: snapshot.session.unitId,
      clientId: snapshot.session.clientId,
      sessionId: snapshot.session.id,
      ownerId: snapshot.session.ownerId,
    },
    summary,
    provider: null,
    model: null,
    usageLogId: null,
  });
  const safetyFailures = assertMeetingSummaryPersistenceDraftSafety(
    draft,
    snapshot.turns.map((turn) => turn.id),
  );

  if (safetyFailures.length > 0) {
    return {
      status: "safety_failed",
      safetyFailures,
      safety: meetingSummaryRouteSafety(false),
    };
  }

  const record = await prisma.interviewMeetingSummary.upsert({
    where: { sessionId: draft.sessionId },
    create: toMeetingSummaryCreateInput(draft),
    update: toMeetingSummaryUpdateInput(draft),
  });

  return {
    status: existing ? "updated" : "created",
    summary: toPersistedMeetingSummaryDto(record),
    draft,
    source: {
      sourceTurnCount: snapshot.turns.length,
      sourceMemoryCount: snapshot.memories.length,
      sourceTurnIds: draft.sourceTurnIds,
      sourceMemoryIds: draft.sourceMemoryIds,
    },
    safety: meetingSummaryRouteSafety(true),
  };
}

export async function readMeetingSummaryForMember(
  session: AppSession,
  sessionId: string,
): Promise<ReadMeetingSummaryResult | null> {
  const snapshot = await getMeetingSessionSnapshotForMember(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const existing = await prisma.interviewMeetingSummary.findFirst({
    where: {
      sessionId: snapshot.session.id,
      organizationId: session.organization.id,
      ownerId: session.user.id,
    },
  });

  if (!existing) {
    return {
      status: "empty",
      safety: meetingSummaryRouteSafety(false),
    };
  }

  return {
    status: "found",
    summary: toPersistedMeetingSummaryDto(existing),
    safety: meetingSummaryRouteSafety(false),
  };
}

function allSummaryCitations(summary: MeetingSummary): MeetingCitation[] {
  const byKey = new Map<string, MeetingCitation>();
  const items: Array<MeetingSummaryItem | MeetingActionItem> = [
    ...summary.decisions,
    ...summary.actionItems,
    ...summary.openQuestions,
  ];

  for (const item of items) {
    for (const citation of item.citations) {
      const key = `${citation.turnId}:${citation.occurredAt}:${citation.snippet}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          ...citation,
          memoryIds: uniqueStrings(citation.memoryIds),
        });
      }
    }
  }

  return [...byKey.values()];
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function uniqueStrings(values: Iterable<string | null | undefined>): string[] {
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    seen.add(normalized);
  }

  return [...seen];
}

function hasPrivateSentinel(value: MeetingSummaryPersistenceDraft): boolean {
  const serialized = JSON.stringify(value);
  return ["sk-", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "policyNumber", "cookie", "otp"].some((sentinel) =>
    serialized.includes(sentinel),
  );
}

function toMeetingTranscriptTurns(snapshot: MeetingSessionSnapshotDto): MeetingTranscriptTurn[] {
  const memoryIdsByTurn = new Map<string, string[]>();
  const dataClassByTurn = new Map<string, MeetingDataClass>();

  for (const memory of snapshot.memories) {
    if (!memory.turnId) continue;

    const ids = memoryIdsByTurn.get(memory.turnId) ?? [];
    ids.push(memory.id);
    memoryIdsByTurn.set(memory.turnId, ids);

    const previous = dataClassByTurn.get(memory.turnId);
    dataClassByTurn.set(memory.turnId, mergeMeetingDataClass(previous, memory.dataClass));
  }

  return snapshot.turns.map((turn, index) => ({
    id: turn.id,
    speakerName: resolveMeetingSpeakerName(turn.role, index),
    speaker: resolveMeetingSpeakerName(turn.role, index),
    speakerRole: turn.role === "ASSISTANT" ? "ADVISOR" : "FOCUS_CLIENT",
    text: turn.content,
    occurredAt: turn.occurredAt,
    source: toMeetingTranscriptSource(turn.modality),
    dataClass: dataClassByTurn.get(turn.id),
    memoryIds: uniqueStrings(memoryIdsByTurn.get(turn.id) ?? []),
  }));
}

async function resolveMeetingClientName(snapshot: MeetingSessionSnapshotDto): Promise<string> {
  if (!snapshot.session.clientId) {
    return snapshot.session.title ?? "未指定客戶";
  }

  const client = await prisma.client.findFirst({
    where: {
      id: snapshot.session.clientId,
      organizationId: snapshot.session.organizationId,
      ownerId: snapshot.session.ownerId ?? undefined,
      status: { not: "ARCHIVED" },
    },
    select: { name: true },
  });

  return client?.name ?? snapshot.session.title ?? "未指定客戶";
}

function toMeetingSummaryCreateInput(draft: MeetingSummaryPersistenceDraft): Prisma.InterviewMeetingSummaryUncheckedCreateInput {
  return {
    organizationId: draft.organizationId,
    unitId: draft.unitId,
    clientId: draft.clientId,
    sessionId: draft.sessionId,
    ownerId: draft.ownerId,
    generatedBy: draft.generatedBy,
    schemaVersion: draft.schemaVersion,
    headline: draft.headline,
    summary: draft.summary,
    decisions: toJsonInput(draft.decisions),
    actionItems: toJsonInput(draft.actionItems),
    openQuestions: toJsonInput(draft.openQuestions),
    participants: toJsonInput(draft.participants),
    citations: toJsonInput(draft.citations),
    sourceTurnIds: draft.sourceTurnIds,
    sourceMemoryIds: draft.sourceMemoryIds,
    provider: draft.provider,
    model: draft.model,
    usageLogId: draft.usageLogId,
    guardEvidence: toJsonInput(draft.guardEvidence),
  };
}

function toMeetingSummaryUpdateInput(draft: MeetingSummaryPersistenceDraft): Prisma.InterviewMeetingSummaryUncheckedUpdateInput {
  return {
    organizationId: draft.organizationId,
    unitId: draft.unitId,
    clientId: draft.clientId,
    ownerId: draft.ownerId,
    generatedBy: draft.generatedBy,
    schemaVersion: draft.schemaVersion,
    headline: draft.headline,
    summary: draft.summary,
    decisions: toJsonInput(draft.decisions),
    actionItems: toJsonInput(draft.actionItems),
    openQuestions: toJsonInput(draft.openQuestions),
    participants: toJsonInput(draft.participants),
    citations: toJsonInput(draft.citations),
    sourceTurnIds: draft.sourceTurnIds,
    sourceMemoryIds: draft.sourceMemoryIds,
    provider: draft.provider,
    model: draft.model,
    usageLogId: draft.usageLogId,
    guardEvidence: toJsonInput(draft.guardEvidence),
  };
}

function toPersistedMeetingSummaryDto(record: InterviewMeetingSummaryModel): PersistedMeetingSummaryDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    unitId: record.unitId,
    clientId: record.clientId,
    sessionId: record.sessionId,
    ownerId: record.ownerId,
    generatedBy: record.generatedBy,
    schemaVersion: record.schemaVersion,
    headline: record.headline,
    summary: record.summary,
    decisions: record.decisions as unknown as MeetingSummaryItem[],
    actionItems: record.actionItems as unknown as MeetingActionItem[],
    openQuestions: record.openQuestions as unknown as MeetingSummaryItem[],
    participants: record.participants as unknown as MeetingParticipant[],
    citations: record.citations as unknown as MeetingCitation[],
    sourceTurnIds: record.sourceTurnIds,
    sourceMemoryIds: record.sourceMemoryIds,
    provider: record.provider,
    model: record.model,
    usageLogId: record.usageLogId,
    guardEvidence: record.guardEvidence as unknown as MeetingSummaryGuardEvidence | null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function meetingSummaryRouteSafety(
  dbWriteAttempted: boolean,
  overrides: Partial<
    Pick<
      MeetingSummaryRouteSafety,
      | "providerCallAttempted"
      | "aiUsageLogRequired"
      | "aiUsageLogWritten"
      | "generatedBy"
      | "provider"
      | "quotaChecked"
      | "quotaBlocked"
    >
  > = {},
): MeetingSummaryRouteSafety {
  return {
    scopeSource: "server_session",
    visibilityScope: "member-private",
    providerCallAttempted: overrides.providerCallAttempted ?? false,
    aiUsageLogRequired: overrides.aiUsageLogRequired ?? false,
    aiUsageLogWritten: overrides.aiUsageLogWritten ?? false,
    dbWriteAttempted,
    storesAudioBinary: false,
    storesRawProviderPayload: false,
    storesRawPrivateTranscriptSidecar: false,
    writesConfirmedCrmFact: false,
    generatedBy: overrides.generatedBy ?? "deterministic-skeleton",
    provider: overrides.provider ?? null,
    quotaChecked: overrides.quotaChecked ?? false,
    quotaBlocked: overrides.quotaBlocked ?? false,
  };
}

function resolveMeetingSpeakerName(role: "USER" | "ASSISTANT" | "SYSTEM", index: number): string {
  if (role === "ASSISTANT") return "顧問";
  if (role === "SYSTEM") return "系統";
  return `會議參與者 ${index + 1}`;
}

function toMeetingTranscriptSource(modality: "TEXT" | "VOICE_REALTIME" | "VOICE_TRANSCRIPT_FALLBACK"): MeetingTranscriptSource {
  if (modality === "VOICE_REALTIME" || modality === "VOICE_TRANSCRIPT_FALLBACK") return "MIC";
  return "TEXT";
}

function mergeMeetingDataClass(
  left: MeetingDataClass | undefined,
  right: MeetingDataClass | "INSTRUCTION",
): MeetingDataClass {
  const normalizedRight = normalizeMemoryDataClass(right);
  if (!left) return normalizedRight;
  if (left === "UNKNOWN" || normalizedRight === "UNKNOWN") return "UNKNOWN";
  if (left === "INFERENCE" || normalizedRight === "INFERENCE") return "INFERENCE";
  if (left === "CONFIRMED" || normalizedRight === "CONFIRMED") return "CONFIRMED";
  return "FACT";
}

function normalizeMemoryDataClass(value: MeetingDataClass | "INSTRUCTION"): MeetingDataClass {
  if (value === "UNKNOWN" || value === "INFERENCE" || value === "CONFIRMED" || value === "FACT") return value;
  return "FACT";
}
