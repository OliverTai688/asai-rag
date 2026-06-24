import { z } from "zod";
import {
  ClientStatus,
  VisitPlanStatus as DbVisitPlanStatus,
  VisitPurpose as DbVisitPurpose,
} from "@/generated/prisma/enums";
import type { Prisma, VisitPlan as DbVisitPlan } from "@/generated/prisma/client";
import type { Client } from "@/domains/client/types";
import type {
  ObjectionHandling,
  SpinQuestion,
  VisitMaterial,
  VisitObjective,
  VisitPlan,
  VisitQuestionEvidence,
  VisitQuestionEvidenceSource,
  VisitQuestionEvidenceStatus,
} from "@/domains/visit/types";
import { canReadClientDetail, canWriteClient } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { toClientDto, type ClientRecord } from "@/lib/clients/client-dto";

type VisitPlanRecord = DbVisitPlan & {
  client: ClientRecord;
};

export interface VisitPlanWithClient {
  client: Client;
  visitPlan: VisitPlan;
}

const visitPlanInclude = {
  client: {
    include: {
      complianceChecklist: true,
      familyMembers: {
        orderBy: { createdAt: "asc" },
      },
      policies: {
        orderBy: { createdAt: "asc" },
      },
    },
  },
} as const;

const SPIN_TYPES: SpinQuestion["type"][] = ["S", "P", "I", "N"];
const VISIT_PURPOSES = ["FIRST_VISIT", "ADD_ON", "RENEWAL", "CARE", "REFERRAL"] as const;
const VISIT_PLAN_STATUSES = ["DRAFT", "READY", "COMPLETED"] as const;
const EVIDENCE_SOURCE_VALUES = [
  "client_profile",
  "relationship_graph",
  "policy",
  "ai_tag",
  "visit_purpose",
  "theater_route_b_red_line",
  "theater_route_b_state_proposal",
  "unknown",
] as const;
const EVIDENCE_STATUS_VALUES = ["confirmed", "inference", "unknown"] as const;
const EVIDENCE_SOURCES = new Set<VisitQuestionEvidenceSource>(EVIDENCE_SOURCE_VALUES);
const EVIDENCE_STATUSES = new Set<VisitQuestionEvidenceStatus>(EVIDENCE_STATUS_VALUES);

const visitTimeInputSchema = z
  .string()
  .trim()
  .max(80)
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: "INVALID_VISIT_TIME",
  })
  .optional()
  .or(z.literal(""));

const visitQuestionEvidenceInputSchema = z.object({
  id: z.string().trim().min(1).max(80),
  source: z.enum(EVIDENCE_SOURCE_VALUES),
  status: z.enum(EVIDENCE_STATUS_VALUES),
  label: z.string().trim().min(1).max(120),
  detail: z.string().trim().min(1).max(600),
});

const visitQuestionReasoningInputSchema = z.object({
  summary: z.string().trim().min(1).max(800),
  evidence: z.array(visitQuestionEvidenceInputSchema).max(20).default([]),
  confirmationPrompt: z.string().trim().max(500).optional().or(z.literal("")),
});

const visitObjectiveInputSchema = z.object({
  id: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(600),
  successCriteria: z.string().trim().min(1).max(600),
});

const spinQuestionInputSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(["S", "P", "I", "N"]),
  question: z.string().trim().min(1).max(800),
  reasoning: visitQuestionReasoningInputSchema.optional(),
});

const objectionInputSchema = z.object({
  id: z.string().trim().min(1).max(80),
  expectedObjection: z.string().trim().min(1).max(600),
  suggestedResponse: z.string().trim().min(1).max(1000),
});

const materialInputSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  checked: z.boolean().default(false),
  fileUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  sentAt: z.string().trim().max(80).optional().or(z.literal("")),
});

export const createVisitPlanInputSchema = z.object({
  clientId: z.string().trim().min(1).max(120),
  purpose: z.enum(VISIT_PURPOSES).default("FIRST_VISIT"),
  visitTime: visitTimeInputSchema,
});

export const updateVisitPlanInputSchema = z.object({
  purpose: z.enum(VISIT_PURPOSES).optional(),
  status: z.enum(VISIT_PLAN_STATUSES).optional(),
  visitTime: visitTimeInputSchema,
  objectives: z.array(visitObjectiveInputSchema).max(20).optional(),
  spinQuestions: z.array(spinQuestionInputSchema).max(40).optional(),
  objections: z.array(objectionInputSchema).max(20).optional(),
  materials: z.array(materialInputSchema).max(40).optional(),
  postVisitNotes: z.string().max(20_000).optional().or(z.literal("")),
  postVisitAnalysis: z.string().max(20_000).optional().or(z.literal("")),
});

export type CreateVisitPlanInput = z.infer<typeof createVisitPlanInputSchema>;
export type UpdateVisitPlanInput = z.infer<typeof updateVisitPlanInputSchema>;

export async function listVisitPlansForMember(session: AppSession): Promise<VisitPlanWithClient[]> {
  const records = await prisma.visitPlan.findMany({
    where: {
      organizationId: session.organization.id,
      status: { not: DbVisitPlanStatus.ARCHIVED },
    },
    include: visitPlanInclude,
    orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }],
  });

  return records
    .filter((record) => canReadClientDetail(session, record.client))
    .map((record) => ({
      client: toClientDto(record.client),
      visitPlan: toVisitPlanDto(record),
    }));
}

export async function getVisitPlanForMember(
  session: AppSession,
  visitPlanId: string,
): Promise<VisitPlanWithClient | null> {
  const record = await prisma.visitPlan.findFirst({
    where: {
      id: visitPlanId,
      organizationId: session.organization.id,
      status: { not: DbVisitPlanStatus.ARCHIVED },
    },
    include: visitPlanInclude,
  });

  if (!record || !canReadClientDetail(session, record.client)) {
    return null;
  }

  return {
    client: toClientDto(record.client),
    visitPlan: toVisitPlanDto(record),
  };
}

export async function createVisitPlanForMember(
  session: AppSession,
  input: CreateVisitPlanInput,
): Promise<VisitPlanWithClient | null> {
  const clientScope = await getWritableClientScope(session, input.clientId);

  if (!clientScope) {
    return null;
  }

  const record = await prisma.visitPlan.create({
    data: {
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId ?? clientScope.unitId,
      ownerId: session.user.id,
      clientId: input.clientId,
      purpose: input.purpose as DbVisitPurpose,
      status: DbVisitPlanStatus.DRAFT,
      scheduledAt: parseVisitDate(input.visitTime),
      objectives: [],
      spinQuestions: [],
      objections: [],
      materials: [],
      isDemo: clientScope.isDemo,
      demoScenario: clientScope.demoScenario,
      demoSeedVersion: clientScope.demoSeedVersion,
    },
    include: visitPlanInclude,
  });

  return {
    client: toClientDto(record.client),
    visitPlan: toVisitPlanDto(record),
  };
}

export async function updateVisitPlanForMember(
  session: AppSession,
  visitPlanId: string,
  input: UpdateVisitPlanInput,
): Promise<VisitPlanWithClient | null> {
  const current = await prisma.visitPlan.findFirst({
    where: {
      id: visitPlanId,
      organizationId: session.organization.id,
      status: { not: DbVisitPlanStatus.ARCHIVED },
    },
    select: {
      client: {
        select: {
          organizationId: true,
          unitId: true,
          ownerId: true,
        },
      },
    },
  });

  if (!current || !canWriteClient(session, current.client)) {
    return null;
  }

  const data: Prisma.VisitPlanUpdateInput = {
    ...(input.purpose !== undefined ? { purpose: input.purpose as DbVisitPurpose } : {}),
    ...(input.status !== undefined ? { status: toDbStatus(input.status) } : {}),
    ...(input.visitTime !== undefined ? { scheduledAt: parseVisitDate(input.visitTime) } : {}),
    ...(input.objectives !== undefined ? { objectives: toInputJson(input.objectives) } : {}),
    ...(input.spinQuestions !== undefined ? { spinQuestions: toInputJson(input.spinQuestions) } : {}),
    ...(input.objections !== undefined ? { objections: toInputJson(input.objections) } : {}),
    ...(input.materials !== undefined ? { materials: toInputJson(input.materials) } : {}),
    ...(input.postVisitNotes !== undefined ? { postVisitNotes: input.postVisitNotes || null } : {}),
    ...(input.postVisitAnalysis !== undefined ? { postVisitAnalysis: input.postVisitAnalysis || null } : {}),
  };

  const record = await prisma.visitPlan.update({
    where: { id: visitPlanId },
    data,
    include: visitPlanInclude,
  });

  return {
    client: toClientDto(record.client),
    visitPlan: toVisitPlanDto(record),
  };
}

function toVisitPlanDto(record: VisitPlanRecord): VisitPlan {
  return {
    id: record.id,
    clientId: record.clientId,
    purpose: record.purpose,
    status: toDomainStatus(record.status),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    visitTime: record.scheduledAt?.toISOString(),
    objectives: parseObjectives(record.objectives),
    spinQuestions: parseSpinQuestions(record.spinQuestions),
    objections: parseObjections(record.objections),
    materials: parseMaterials(record.materials),
    postVisitNotes: record.postVisitNotes ?? undefined,
    postVisitAnalysis: record.postVisitAnalysis ?? undefined,
    feedback: undefined,
  };
}

function toDbStatus(status: VisitPlan["status"]): DbVisitPlanStatus {
  if (status === "READY") return DbVisitPlanStatus.READY;
  if (status === "COMPLETED") return DbVisitPlanStatus.COMPLETED;
  return DbVisitPlanStatus.DRAFT;
}

function toDomainStatus(status: DbVisitPlanStatus): VisitPlan["status"] {
  if (status === DbVisitPlanStatus.READY) return "READY";
  if (status === DbVisitPlanStatus.COMPLETED) return "COMPLETED";
  return "DRAFT";
}

function parseVisitDate(value: string | undefined | null): Date | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return new Date(normalized);
}

function toInputJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function parseObjectives(value: Prisma.JsonValue | null): VisitObjective[] {
  return asArray(value).map((item, index) => {
    if (isRecord(item)) {
      return {
        id: readString(item.id) || `objective-${index + 1}`,
        description: readString(item.description) || readString(item.title) || "拜訪目標待補",
        successCriteria: readString(item.successCriteria) || readString(item.success) || "現場確認是否達成。",
      };
    }

    return {
      id: `objective-${index + 1}`,
      description: String(item),
      successCriteria: "現場確認是否達成。",
    };
  });
}

function parseSpinQuestions(value: Prisma.JsonValue | null): SpinQuestion[] {
  return asArray(value).map((item, index) => {
    if (isRecord(item)) {
      return {
        id: readString(item.id) || `question-${index + 1}`,
        type: readSpinType(item.type, index),
        question: readString(item.question) || readString(item.text) || "問題待補",
        reasoning: parseReasoning(item.reasoning),
      };
    }

    return {
      id: `question-${index + 1}`,
      type: SPIN_TYPES[index % SPIN_TYPES.length],
      question: String(item),
    };
  });
}

function parseReasoning(value: unknown): SpinQuestion["reasoning"] {
  if (!isRecord(value)) return undefined;

  return {
    summary: readString(value.summary) || "此問題來自拜訪準備包的既有資料。",
    confirmationPrompt: readString(value.confirmationPrompt) || undefined,
    evidence: asArray(value.evidence).map(parseEvidence),
  };
}

function parseEvidence(item: unknown, index: number): VisitQuestionEvidence {
  if (!isRecord(item)) {
    return {
      id: `evidence-${index + 1}`,
      source: "unknown",
      status: "unknown",
      label: "待確認",
      detail: String(item),
    };
  }

  return {
    id: readString(item.id) || `evidence-${index + 1}`,
    source: readEvidenceSource(item.source),
    status: readEvidenceStatus(item.status),
    label: readString(item.label) || "準備包依據",
    detail: readString(item.detail) || readString(item.text) || "待補依據內容",
  };
}

function parseObjections(value: Prisma.JsonValue | null): ObjectionHandling[] {
  return asArray(value).map((item, index) => {
    if (isRecord(item)) {
      return {
        id: readString(item.id) || `objection-${index + 1}`,
        expectedObjection: readString(item.expectedObjection) || readString(item.title) || readString(item.objection) || "可能異議待補",
        suggestedResponse: readString(item.suggestedResponse) || readString(item.response) || "建議回應待補。",
      };
    }

    return {
      id: `objection-${index + 1}`,
      expectedObjection: String(item),
      suggestedResponse: "現場先確認真實顧慮，再回應。",
    };
  });
}

function parseMaterials(value: Prisma.JsonValue | null): VisitMaterial[] {
  return asArray(value).map((item, index) => {
    if (isRecord(item)) {
      return {
        id: readString(item.id) || `material-${index + 1}`,
        name: readString(item.name) || readString(item.title) || "拜訪材料待補",
        checked: readBoolean(item.checked),
        fileUrl: readString(item.fileUrl) || undefined,
        sentAt: readString(item.sentAt) || undefined,
      };
    }

    return {
      id: `material-${index + 1}`,
      name: String(item),
      checked: false,
    };
  });
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function readSpinType(value: unknown, index: number): SpinQuestion["type"] {
  if (value === "S" || value === "P" || value === "I" || value === "N") {
    return value;
  }

  return SPIN_TYPES[index % SPIN_TYPES.length];
}

function readEvidenceSource(value: unknown): VisitQuestionEvidenceSource {
  if (typeof value === "string" && EVIDENCE_SOURCES.has(value as VisitQuestionEvidenceSource)) {
    return value as VisitQuestionEvidenceSource;
  }

  return "unknown";
}

function readEvidenceStatus(value: unknown): VisitQuestionEvidenceStatus {
  if (typeof value === "string" && EVIDENCE_STATUSES.has(value as VisitQuestionEvidenceStatus)) {
    return value as VisitQuestionEvidenceStatus;
  }

  return "unknown";
}

async function getWritableClientScope(session: AppSession, clientId: string) {
  const current = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    select: {
      organizationId: true,
      unitId: true,
      ownerId: true,
      isDemo: true,
      demoScenario: true,
      demoSeedVersion: true,
    },
  });

  if (!current || !canWriteClient(session, current)) {
    return null;
  }

  return current;
}
