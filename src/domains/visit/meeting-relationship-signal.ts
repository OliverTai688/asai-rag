import type { MeetingDataClass } from "../interview/meeting";
import type { MeetingWritebackCandidate } from "../interview/meeting-writeback-boundary";
import type { VisitQuestionEvidenceStatus } from "./types";

export type VisitMeetingRelationshipSignalSourceType =
  | "MEETING_QUICK_NOTE"
  | "MEETING_SUMMARY_DECISION"
  | "MEETING_ACTION_ITEM"
  | "MEETING_OPEN_QUESTION"
  | "MEETING_WRITEBACK_CANDIDATE";

export type VisitMeetingRelationshipSignalAction =
  | "CREATE_CONFIRMATION_CARD"
  | "ASK_IN_NEXT_VISIT"
  | "KEEP_AS_CONTEXT";

export type VisitMeetingRelationshipSignalPriority = "HIGH" | "MEDIUM" | "LOW";

export interface VisitMeetingRelationshipSignalInput {
  id: string;
  sourceType: VisitMeetingRelationshipSignalSourceType;
  text: string;
  dataClass?: MeetingDataClass | VisitQuestionEvidenceStatus;
  sourceReferenceIds?: string[];
}

export interface VisitMeetingRelationshipSignalCard {
  id: string;
  title: string;
  sourceType: VisitMeetingRelationshipSignalSourceType;
  sourceLabel: string;
  safeSummary: string;
  evidenceStatus: VisitQuestionEvidenceStatus;
  recommendedAction: VisitMeetingRelationshipSignalAction;
  priority: VisitMeetingRelationshipSignalPriority;
  confirmationPrompt: string;
  sourceReferenceIds: string[];
  guardrails: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesConfirmedCrmFact: false;
    storesRawProviderPayload: false;
    rawPrivateTranscriptIncluded: false;
    persistedToDatabase: false;
  };
}

export interface VisitMeetingRelationshipSignalDeck {
  agentId: "asai.visit.preparation_package";
  sourceActionId: "meeting-notes-relationship-confirmation-signal";
  visitPlanId: string;
  clientId: string | null;
  generatedAt: string;
  summary: {
    cardCount: number;
    confirmedCount: number;
    inferenceCount: number;
    unknownCount: number;
    highPriorityCount: number;
    meetingSourceCount: number;
  };
  cards: VisitMeetingRelationshipSignalCard[];
  writebackBoundary: {
    currentPersistence: "deterministic-preview-only";
    targetSurface: "/pre-visit/[planId]";
    acceptedSourceTypes: readonly VisitMeetingRelationshipSignalSourceType[];
    requiresAdvisorConfirmation: true;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    minimumAllowedFields: readonly VisitMeetingRelationshipSignalAllowedField[];
    forbiddenFields: readonly string[];
  };
  proof: {
    ownerScopedVisitPlanRequired: true;
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesConfirmedCrmFact: false;
    storesRawProviderPayload: false;
    rawPrivateTranscriptIncluded: false;
    persistedToDatabase: false;
    externalRegistryPublication: false;
  };
}

export interface BuildVisitMeetingRelationshipSignalDeckInput {
  visitPlanId: string;
  clientId?: string | null;
  signals: VisitMeetingRelationshipSignalInput[];
  generatedAt?: string;
}

export const VISIT_MEETING_RELATIONSHIP_SIGNAL_SOURCE_TYPES = [
  "MEETING_QUICK_NOTE",
  "MEETING_SUMMARY_DECISION",
  "MEETING_ACTION_ITEM",
  "MEETING_OPEN_QUESTION",
  "MEETING_WRITEBACK_CANDIDATE",
] as const satisfies readonly VisitMeetingRelationshipSignalSourceType[];

export const VISIT_MEETING_RELATIONSHIP_SIGNAL_ALLOWED_FIELDS = [
  "id",
  "title",
  "sourceType",
  "sourceLabel",
  "safeSummary",
  "evidenceStatus",
  "recommendedAction",
  "priority",
  "confirmationPrompt",
  "sourceReferenceIds",
] as const satisfies readonly (keyof VisitMeetingRelationshipSignalCard)[];

export type VisitMeetingRelationshipSignalAllowedField =
  (typeof VISIT_MEETING_RELATIONSHIP_SIGNAL_ALLOWED_FIELDS)[number];

export const VISIT_MEETING_RELATIONSHIP_SIGNAL_FORBIDDEN_FIELDS = [
  "rawPrivateTranscript",
  "rawProviderPayload",
  "privateTranscriptText",
  "providerPayload",
  "confirmedCrmFact",
  "email",
  "phone",
  "policyNumber",
  "secret",
  "token",
  "cookie",
  "otp",
] as const;

const MAX_SIGNAL_CARDS = 6;
const MAX_SAFE_SUMMARY_LENGTH = 220;
const CONTACT_EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TAIWAN_MOBILE_PATTERN = /09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g;
const POLICY_NUMBER_PATTERN = /(保單(?:號碼|號)?[:：]?\s*)[A-Za-z0-9-]{4,}/g;
const SECRET_TOKEN_PATTERN = /\b(?:sk-[A-Za-z0-9_-]{8,}|bearer\s+[A-Za-z0-9._-]+|token[:=]\s*[A-Za-z0-9._-]+|cookie[:=]\s*[^,\s]+|otp[:=]\s*\d{4,8})\b/gi;
const RAW_PAYLOAD_PATTERN = /\braw\s+(?:provider\s+payload|private\s+transcript)\b/gi;

const SOURCE_LABELS: Record<VisitMeetingRelationshipSignalSourceType, string> = {
  MEETING_QUICK_NOTE: "會議快記",
  MEETING_SUMMARY_DECISION: "會議摘要決議",
  MEETING_ACTION_ITEM: "會議待辦",
  MEETING_OPEN_QUESTION: "會議未解問題",
  MEETING_WRITEBACK_CANDIDATE: "會議寫回候選",
};

const STATUS_SCORE: Record<VisitQuestionEvidenceStatus, number> = {
  unknown: 3,
  inference: 2,
  confirmed: 1,
};

const PRIORITY_SCORE: Record<VisitMeetingRelationshipSignalPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function buildVisitMeetingRelationshipSignalDeck(
  input: BuildVisitMeetingRelationshipSignalDeckInput,
): VisitMeetingRelationshipSignalDeck {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const cards = sortCards(
    input.signals
      .map((signal) => buildCard(signal))
      .filter((card): card is VisitMeetingRelationshipSignalCard => Boolean(card)),
  ).slice(0, MAX_SIGNAL_CARDS);

  return {
    agentId: "asai.visit.preparation_package",
    sourceActionId: "meeting-notes-relationship-confirmation-signal",
    visitPlanId: input.visitPlanId,
    clientId: input.clientId ?? null,
    generatedAt,
    summary: {
      cardCount: cards.length,
      confirmedCount: cards.filter((card) => card.evidenceStatus === "confirmed").length,
      inferenceCount: cards.filter((card) => card.evidenceStatus === "inference").length,
      unknownCount: cards.filter((card) => card.evidenceStatus === "unknown").length,
      highPriorityCount: cards.filter((card) => card.priority === "HIGH").length,
      meetingSourceCount: unique(cards.flatMap((card) => card.sourceReferenceIds)).length,
    },
    cards,
    writebackBoundary: {
      currentPersistence: "deterministic-preview-only",
      targetSurface: "/pre-visit/[planId]",
      acceptedSourceTypes: VISIT_MEETING_RELATIONSHIP_SIGNAL_SOURCE_TYPES,
      requiresAdvisorConfirmation: true,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      minimumAllowedFields: VISIT_MEETING_RELATIONSHIP_SIGNAL_ALLOWED_FIELDS,
      forbiddenFields: VISIT_MEETING_RELATIONSHIP_SIGNAL_FORBIDDEN_FIELDS,
    },
    proof: {
      ownerScopedVisitPlanRequired: true,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      persistedToDatabase: false,
      externalRegistryPublication: false,
    },
  };
}

export function meetingWritebackCandidateToRelationshipSignal(
  candidate: MeetingWritebackCandidate,
): VisitMeetingRelationshipSignalInput {
  return {
    id: candidate.id,
    sourceType: "MEETING_WRITEBACK_CANDIDATE",
    text: candidate.text,
    dataClass: toMeetingDataClass(candidate.kind),
    sourceReferenceIds: [
      `meeting-writeback.${candidate.sourceType}.${candidate.sourceItemId}`,
      ...candidate.citationTurnIds.map((turnId) => `meeting-turn.${turnId}`),
      ...candidate.supportingMemoryIds.map((memoryId) => `meeting-memory.${memoryId}`),
    ],
  };
}

function buildCard(signal: VisitMeetingRelationshipSignalInput): VisitMeetingRelationshipSignalCard | null {
  const safeSummary = sanitizeSafeSummary(signal.text);

  if (!safeSummary) {
    return null;
  }

  const evidenceStatus = normalizeEvidenceStatus(signal.dataClass);
  const recommendedAction = actionFor(evidenceStatus);
  const priority = priorityFor(signal, evidenceStatus);
  const sourceReferenceIds = sanitizeSourceReferenceIds(signal);

  return {
    id: `meeting-signal.${sanitizeId(signal.sourceType)}.${sanitizeId(signal.id)}`,
    title: titleFor(signal.sourceType, evidenceStatus),
    sourceType: signal.sourceType,
    sourceLabel: SOURCE_LABELS[signal.sourceType],
    safeSummary,
    evidenceStatus,
    recommendedAction,
    priority,
    confirmationPrompt: confirmationPromptFor(evidenceStatus, safeSummary),
    sourceReferenceIds,
    guardrails: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      persistedToDatabase: false,
    },
  };
}

function normalizeEvidenceStatus(value: VisitMeetingRelationshipSignalInput["dataClass"]): VisitQuestionEvidenceStatus {
  if (value === "CONFIRMED" || value === "FACT" || value === "confirmed") {
    return "confirmed";
  }

  if (value === "INFERENCE" || value === "inference") {
    return "inference";
  }

  if (value === "UNKNOWN" || value === "unknown") {
    return "unknown";
  }

  return "unknown";
}

function actionFor(status: VisitQuestionEvidenceStatus): VisitMeetingRelationshipSignalAction {
  if (status === "unknown") {
    return "ASK_IN_NEXT_VISIT";
  }

  if (status === "inference") {
    return "CREATE_CONFIRMATION_CARD";
  }

  return "KEEP_AS_CONTEXT";
}

function priorityFor(
  signal: VisitMeetingRelationshipSignalInput,
  status: VisitQuestionEvidenceStatus,
): VisitMeetingRelationshipSignalPriority {
  const text = signal.text;
  const highRelationshipHints = ["決策", "配偶", "小孩", "受益", "收入", "保單", "保費", "家庭", "關係"];

  if (status === "unknown") {
    return "HIGH";
  }

  if (highRelationshipHints.some((hint) => text.includes(hint))) {
    return status === "inference" ? "HIGH" : "MEDIUM";
  }

  if (signal.sourceType === "MEETING_ACTION_ITEM" || signal.sourceType === "MEETING_OPEN_QUESTION") {
    return "MEDIUM";
  }

  return "LOW";
}

function titleFor(
  sourceType: VisitMeetingRelationshipSignalSourceType,
  status: VisitQuestionEvidenceStatus,
): string {
  if (status === "unknown") {
    return "會議留下的關係待確認問題";
  }

  if (status === "inference") {
    return "會議推論出的關係訊號";
  }

  if (sourceType === "MEETING_ACTION_ITEM") {
    return "會議待辦中的關係線索";
  }

  return "會議已知的關係脈絡";
}

function confirmationPromptFor(status: VisitQuestionEvidenceStatus, safeSummary: string): string {
  if (status === "unknown") {
    return `請在下一次拜訪用開放式問題確認：${safeSummary}`;
  }

  if (status === "inference") {
    return `請先標為推論，不要寫成客戶事實；下一次拜訪確認：${safeSummary}`;
  }

  return `請顧問確認是否可作為拜訪準備脈絡；仍不得直接寫入 CRM confirmed fact：${safeSummary}`;
}

function toMeetingDataClass(kind: MeetingWritebackCandidate["kind"]): MeetingDataClass {
  if (kind === "CONFIRMED_FACT") return "CONFIRMED";
  if (kind === "INFERENCE") return "INFERENCE";
  if (kind === "UNKNOWN") return "UNKNOWN";
  return "UNKNOWN";
}

function sanitizeSafeSummary(value: string): string {
  return collapseWhitespace(value)
    .replace(CONTACT_EMAIL_PATTERN, "[redacted-email]")
    .replace(TAIWAN_MOBILE_PATTERN, "[redacted-phone]")
    .replace(POLICY_NUMBER_PATTERN, "$1[redacted-policy]")
    .replace(SECRET_TOKEN_PATTERN, "[redacted-secret]")
    .replace(RAW_PAYLOAD_PATTERN, "[redacted-raw-payload]")
    .slice(0, MAX_SAFE_SUMMARY_LENGTH)
    .trim();
}

function sanitizeSourceReferenceIds(signal: VisitMeetingRelationshipSignalInput): string[] {
  const fallback = `meeting-signal.${sanitizeId(signal.sourceType)}.${sanitizeId(signal.id)}`;
  const values = signal.sourceReferenceIds?.length ? signal.sourceReferenceIds : [fallback];
  const sanitized = values
    .map((value) => {
      if (CONTACT_EMAIL_PATTERN.test(value) || TAIWAN_MOBILE_PATTERN.test(value)) {
        return "redacted-source-reference";
      }

      return collapseWhitespace(value).replace(/[^A-Za-z0-9_.:/-]/g, "_").slice(0, 120);
    })
    .filter(Boolean);

  return unique(sanitized.length ? sanitized : [fallback]).slice(0, 8);
}

function sortCards(cards: VisitMeetingRelationshipSignalCard[]) {
  return [...cards].sort((left, right) => {
    const priorityDiff = PRIORITY_SCORE[right.priority] - PRIORITY_SCORE[left.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const statusDiff = STATUS_SCORE[right.evidenceStatus] - STATUS_SCORE[left.evidenceStatus];
    if (statusDiff !== 0) return statusDiff;

    return left.id.localeCompare(right.id);
  });
}

function sanitizeId(value: string): string {
  return collapseWhitespace(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "signal";
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
