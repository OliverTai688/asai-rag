import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { MessageRole, SessionStatus, SpinMessageType as DbSpinMessageType } from "@/generated/prisma/enums";
import type { Client } from "@/domains/client/types";
import type { SpinMessage, SpinMessageType, SpinPhase, SpinSession, SpinTransition } from "@/domains/spin/types";
import { buildSpinOutline } from "@/domains/spin/outline";
import { canReadClientDetail, canWriteClient } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { toClientDto, type ClientRecord } from "@/lib/clients/client-dto";
import { prisma } from "@/lib/prisma";

const SPIN_PHASES = ["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF", "COMPLETE"] as const;
const SPIN_MODES = ["SELF_CLARIFY", "QUESTION_DESIGN"] as const;
const SPIN_MESSAGE_TYPES = ["CHAT", "INSIGHT", "QUESTION", "SUGGESTION", "SUMMARY"] as const;
const TRANSITION_TRIGGERS = ["AI", "USER"] as const;
const PHASE_ORDER = new Map<SpinPhase, number>(SPIN_PHASES.map((phase, index) => [phase, index]));

const spinOutputsSchema = z.object({
  SITUATION: z.array(z.string().trim().min(1).max(800)).max(80).default([]),
  PROBLEM: z.array(z.string().trim().min(1).max(800)).max(80).default([]),
  IMPLICATION: z.array(z.string().trim().min(1).max(800)).max(80).default([]),
  NEED_PAYOFF: z.array(z.string().trim().min(1).max(800)).max(80).default([]),
});

const spinSummarySchema = z.object({
  keyInsights: z.array(z.string().trim().max(800)).max(40).default([]),
  keyProblems: z.array(z.string().trim().max(800)).max(40).default([]),
  suggestedActions: z.array(z.string().trim().max(800)).max(40).default([]),
});

const spinTransitionSchema = z.object({
  from: z.enum(SPIN_PHASES),
  to: z.enum(SPIN_PHASES),
  trigger: z.enum(TRANSITION_TRIGGERS),
  timestamp: z.string().trim().max(80),
});

export const createSpinSessionInputSchema = z.object({
  clientId: z.string().trim().min(1).max(120),
  visitPlanId: z.string().trim().max(120).optional().or(z.literal("")),
  mode: z.enum(SPIN_MODES).default("SELF_CLARIFY"),
});

export const updateSpinSessionInputSchema = z
  .object({
    phase: z.enum(SPIN_PHASES).optional(),
    mode: z.enum(SPIN_MODES).optional(),
    outputs: spinOutputsSchema.optional(),
    transitions: z.array(spinTransitionSchema).max(40).optional(),
    summary: spinSummarySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export const appendSpinMessageInputSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["user", "assistant"]),
  type: z.enum(SPIN_MESSAGE_TYPES).default("CHAT"),
  content: z.string().trim().min(1).max(12_000),
  phase: z.enum(SPIN_PHASES),
});

export type CreateSpinSessionInput = z.infer<typeof createSpinSessionInputSchema>;
export type UpdateSpinSessionInput = z.infer<typeof updateSpinSessionInputSchema>;
export type AppendSpinMessageInput = z.infer<typeof appendSpinMessageInputSchema>;

export interface SpinSessionSnapshot {
  session: SpinSession;
  messages: SpinMessage[];
  client: Client | null;
  proof: SpinSourceTruthProof;
}

export interface SpinSourceTruthProof {
  source: "spin_sessions";
  noProviderCall: true;
  providerCallAttempted: false;
  aiUsageLogRequired: false;
  reason: string;
}

type ClientRecordForSpin = ClientRecord & {
  organizationId: string;
  unitId: string | null;
  ownerId: string | null;
};

const clientInclude = {
  complianceChecklist: true,
  familyMembers: {
    orderBy: { createdAt: "asc" },
  },
  policies: {
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ClientInclude;

const spinSessionInclude = {
  client: {
    include: clientInclude,
  },
  messages: {
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.SpinSessionInclude;

type SpinSessionRecord = Prisma.SpinSessionGetPayload<{ include: typeof spinSessionInclude }>;

const DEFAULT_OUTPUTS: SpinSession["outputs"] = {
  SITUATION: [],
  PROBLEM: [],
  IMPLICATION: [],
  NEED_PAYOFF: [],
};

export async function listSpinSessionsForMember(session: AppSession): Promise<SpinSessionSnapshot[]> {
  const records = await prisma.spinSession.findMany({
    where: {
      organizationId: session.organization.id,
      ownerId: session.user.id,
      status: { not: SessionStatus.ARCHIVED },
    },
    include: spinSessionInclude,
    orderBy: { updatedAt: "desc" },
  });

  return records.filter((record) => canReadSpinSession(session, record)).map(toSpinSessionSnapshot);
}

export async function createSpinSessionForMember(
  session: AppSession,
  input: CreateSpinSessionInput,
): Promise<SpinSessionSnapshot | null> {
  const client = await getWritableClientScope(session, input.clientId);

  if (!client) {
    return null;
  }

  const id = `spin_${randomUUID().replaceAll("-", "")}`;
  const record = await prisma.spinSession.create({
    data: {
      id,
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId ?? client.unitId,
      clientId: client.id,
      ownerId: session.user.id,
      visitPlanId: input.visitPlanId || null,
      mode: input.mode,
      phase: "SITUATION",
      status: SessionStatus.ACTIVE,
      outputs: toInputJson(DEFAULT_OUTPUTS),
      transitions: toInputJson([]),
      metadata: toInputJson({
        source: "api/spin/sessions",
        noProviderCall: true,
        providerCallAttempted: false,
        writesConfirmedCrmFact: false,
      }),
      isDemo: client.isDemo,
      demoScenario: client.demoScenario,
      demoSeedVersion: client.demoSeedVersion,
    },
    include: spinSessionInclude,
  });

  return toSpinSessionSnapshot(record);
}

export async function getSpinSessionForMember(
  session: AppSession,
  spinSessionId: string,
): Promise<SpinSessionSnapshot | null> {
  const record = await prisma.spinSession.findFirst({
    where: {
      id: spinSessionId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      status: { not: SessionStatus.ARCHIVED },
    },
    include: spinSessionInclude,
  });

  if (!record || !canReadSpinSession(session, record)) {
    return null;
  }

  return toSpinSessionSnapshot(record);
}

export async function updateSpinSessionForMember(
  session: AppSession,
  spinSessionId: string,
  input: UpdateSpinSessionInput,
): Promise<SpinSessionSnapshot | { error: "INVALID_SPIN_PHASE_TRANSITION" } | null> {
  const current = await prisma.spinSession.findFirst({
    where: {
      id: spinSessionId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      status: { not: SessionStatus.ARCHIVED },
    },
    include: spinSessionInclude,
  });

  if (!current || !canReadSpinSession(session, current)) {
    return null;
  }

  if (input.phase && !isAllowedPhaseTransition(current.phase as SpinPhase, input.phase)) {
    return { error: "INVALID_SPIN_PHASE_TRANSITION" };
  }

  const record = await prisma.spinSession.update({
    where: { id: spinSessionId },
    data: {
      ...(input.phase !== undefined ? { phase: input.phase, status: input.phase === "COMPLETE" ? SessionStatus.COMPLETED : current.status } : {}),
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.outputs !== undefined ? { outputs: toInputJson(input.outputs) } : {}),
      ...(input.transitions !== undefined ? { transitions: toInputJson(input.transitions) } : {}),
      ...(input.summary !== undefined ? { summary: toInputJson(input.summary) } : {}),
    },
    include: spinSessionInclude,
  });

  return toSpinSessionSnapshot(record);
}

export async function appendSpinMessageForMember(
  session: AppSession,
  spinSessionId: string,
  input: AppendSpinMessageInput,
): Promise<SpinSessionSnapshot | null> {
  const current = await prisma.spinSession.findFirst({
    where: {
      id: spinSessionId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      status: { not: SessionStatus.ARCHIVED },
    },
    include: spinSessionInclude,
  });

  if (!current || !canReadSpinSession(session, current)) {
    return null;
  }

  const messageId = input.id ?? `spin_msg_${randomUUID().replaceAll("-", "")}`;

  await prisma.spinMessage.upsert({
    where: { id: messageId },
    create: {
      id: messageId,
      sessionId: spinSessionId,
      role: toDbMessageRole(input.role),
      type: input.type as DbSpinMessageType,
      content: input.content,
      phase: input.phase,
      metadata: toInputJson({
        source: "spin_session_bff",
        noProviderCall: true,
        providerCallAttempted: false,
      }),
    },
    update: {
      role: toDbMessageRole(input.role),
      type: input.type as DbSpinMessageType,
      content: input.content,
      phase: input.phase,
    },
  });

  await prisma.spinSession.update({
    where: { id: spinSessionId },
    data: { updatedAt: new Date() },
  });

  return getSpinSessionForMember(session, spinSessionId);
}

export async function buildSpinOutlineForMember(
  session: AppSession,
  spinSessionId: string,
): Promise<{ outline: string; snapshot: SpinSessionSnapshot } | null> {
  const snapshot = await getSpinSessionForMember(session, spinSessionId);

  if (!snapshot) {
    return null;
  }

  return {
    snapshot,
    outline: buildSpinOutline({
      session: snapshot.session,
      clientInfo: {
        name: snapshot.client?.name ?? snapshot.session.clientName,
        occupation: snapshot.client?.occupation,
        income: snapshot.client?.annualIncome,
        family: snapshot.client?.family,
        policies: snapshot.client?.existingPolicies,
      },
    }),
  };
}

export function spinNoProviderProof(reason: string): SpinSourceTruthProof {
  return {
    source: "spin_sessions",
    noProviderCall: true,
    providerCallAttempted: false,
    aiUsageLogRequired: false,
    reason,
  };
}

function canReadSpinSession(session: AppSession, record: SpinSessionRecord): boolean {
  if (record.organizationId !== session.organization.id || record.ownerId !== session.user.id) {
    return false;
  }

  if (!record.client) {
    return true;
  }

  return canReadClientDetail(session, record.client);
}

async function getWritableClientScope(session: AppSession, clientId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: "ARCHIVED" },
    },
    select: {
      id: true,
      organizationId: true,
      unitId: true,
      ownerId: true,
      name: true,
      isDemo: true,
      demoScenario: true,
      demoSeedVersion: true,
    },
  });

  if (!client || !canWriteClient(session, client)) {
    return null;
  }

  return client;
}

function toSpinSessionSnapshot(record: SpinSessionRecord): SpinSessionSnapshot {
  return {
    session: toSpinSessionDto(record),
    messages: record.messages.map(toSpinMessageDto),
    client: record.client ? toClientDto(record.client as ClientRecordForSpin) : null,
    proof: spinNoProviderProof("SPIN session BFF reads and writes persisted spin_sessions/spin_messages without provider calls."),
  };
}

function toSpinSessionDto(record: SpinSessionRecord): SpinSession {
  const outputs = parseOutputs(record.outputs);
  return {
    id: record.id,
    clientId: record.clientId ?? "",
    clientName: record.client?.name ?? "未指定客戶",
    phase: record.phase as SpinPhase,
    mode: record.mode,
    outputs,
    transitions: parseTransitions(record.transitions),
    summary: parseSummary(record.summary),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toSpinMessageDto(record: SpinSessionRecord["messages"][number]): SpinMessage {
  return {
    id: record.id,
    sessionId: record.sessionId,
    role: record.role === MessageRole.USER ? "user" : "assistant",
    type: record.type as SpinMessageType,
    content: record.content,
    phase: record.phase as SpinPhase,
    createdAt: record.createdAt.toISOString(),
    metadata: asMetadata(record.metadata),
  };
}

function parseOutputs(value: Prisma.JsonValue | null): SpinSession["outputs"] {
  const parsed = spinOutputsSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...DEFAULT_OUTPUTS };
}

function parseTransitions(value: Prisma.JsonValue | null): SpinTransition[] {
  const parsed = z.array(spinTransitionSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function parseSummary(value: Prisma.JsonValue | null): SpinSession["summary"] | undefined {
  const parsed = spinSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function asMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function isAllowedPhaseTransition(currentPhase: SpinPhase, nextPhase: SpinPhase) {
  if (currentPhase === nextPhase) {
    return true;
  }

  if (nextPhase === "COMPLETE") {
    return true;
  }

  const currentIndex = PHASE_ORDER.get(currentPhase);
  const nextIndex = PHASE_ORDER.get(nextPhase);

  return currentIndex !== undefined && nextIndex !== undefined && nextIndex === currentIndex + 1;
}

function toDbMessageRole(role: AppendSpinMessageInput["role"]) {
  return role === "user" ? MessageRole.USER : MessageRole.ASSISTANT;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
