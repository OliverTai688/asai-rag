import { VisitPlanStatus as DbVisitPlanStatus } from "@/generated/prisma/enums";
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
import { canReadClientDetail } from "@/lib/auth/policies";
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
const EVIDENCE_SOURCES = new Set<VisitQuestionEvidenceSource>([
  "client_profile",
  "relationship_graph",
  "policy",
  "ai_tag",
  "visit_purpose",
  "unknown",
]);
const EVIDENCE_STATUSES = new Set<VisitQuestionEvidenceStatus>(["confirmed", "inference", "unknown"]);

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

function toDomainStatus(status: DbVisitPlanStatus): VisitPlan["status"] {
  if (status === DbVisitPlanStatus.READY) return "READY";
  if (status === DbVisitPlanStatus.COMPLETED) return "COMPLETED";
  return "DRAFT";
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
