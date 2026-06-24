import type { MeetingActionItem, MeetingCitation, MeetingDataClass, MeetingSummaryItem } from "./meeting";
import type { MeetingRouteBFeedbackAdvisorWritebackBridgeCard } from "./meeting-route-b-feedback-advisor-writeback-bridge";
import type { InterviewWritebackSensitivity, InterviewWritebackTarget } from "./writeback-boundary";

export type MeetingWritebackCandidateKind = "CONFIRMED_FACT" | "INFERENCE" | "UNKNOWN" | "ACTION_ITEM";
export type MeetingWritebackSourceType = "MEETING_DECISION" | "MEETING_ACTION_ITEM" | "MEETING_OPEN_QUESTION";
export type MeetingClientSensitivity = "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE" | null;

export interface MeetingWritebackCandidate {
  id: string;
  kind: MeetingWritebackCandidateKind;
  sourceType: MeetingWritebackSourceType;
  sourceItemId: string;
  text: string;
  target: InterviewWritebackTarget;
  dataClass: MeetingDataClass;
  sensitivity: InterviewWritebackSensitivity;
  citationTurnIds: string[];
  supportingMemoryIds: string[];
  canSelect: boolean;
  requiresReason: boolean;
  reasonHint?: string;
  blockedReason?: string;
  crmWritebackCandidate: boolean;
  writesConfirmedCrmFact: false;
  reviewContext?: MeetingWritebackCandidateReviewContext[];
}

export interface MeetingWritebackCandidateReviewContext {
  source: "theater_route_b_feedback_profile";
  target: "MEETING_WRITEBACK_PREVIEW_CONTEXT";
  contextCardId: string;
  status: "confirmed" | "inference" | "unknown";
  targetLabel: string;
  fieldLabel: string;
  label: string;
  detail: string;
  followUpQuestion: string;
  requiresAdvisorConfirmation: true;
  persistedSummaryRequired: true;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
  writesClientProfile: false;
  writesPolicy: false;
  writesConfirmedCrmFact: false;
}

export interface MeetingWritebackApproval {
  candidateId: string;
  reason?: string;
  riskAccepted?: boolean;
}

export interface MeetingWritebackDecision {
  candidate: MeetingWritebackCandidate;
  status: "CREATABLE" | "BLOCKED" | "SKIPPED";
  reason?: string;
  riskAccepted: boolean;
  blockedReason?: string;
}

export interface BuildMeetingWritebackCandidatesInput {
  clientId: string | null;
  clientWritable: boolean;
  clientSensitivity: MeetingClientSensitivity;
  decisions: MeetingSummaryItem[];
  actionItems: MeetingActionItem[];
  openQuestions: MeetingSummaryItem[];
}

export interface EvaluateMeetingWritebackInput extends BuildMeetingWritebackCandidatesInput {
  selectedCandidateIds: string[];
  approvals?: MeetingWritebackApproval[];
}

const HIGHLY_SENSITIVE_HINTS = [
  "醫療",
  "病",
  "癌",
  "長照",
  "健康",
  "身分證",
  "收入",
  "資產",
  "負債",
  "保單",
  "保費",
  "投資",
];

const SENSITIVE_HINTS = ["家庭", "配偶", "太太", "先生", "小孩", "教育金", "退休", "財務"];

export function buildMeetingWritebackCandidates(
  input: BuildMeetingWritebackCandidatesInput,
): MeetingWritebackCandidate[] {
  return [
    ...input.decisions.map((item, index) =>
      buildCandidate({
        id: `decision-${item.id || index}`,
        sourceType: "MEETING_DECISION",
        sourceItemId: item.id,
        text: item.text,
        dataClass: item.dataClass,
        target: targetForMeetingSummaryItem(item, input.clientId, input.clientWritable),
        clientId: input.clientId,
        clientWritable: input.clientWritable,
        clientSensitivity: input.clientSensitivity,
        citations: item.citations,
      }),
    ),
    ...input.actionItems.map((item, index) =>
      buildCandidate({
        id: `action-${item.id || index}`,
        sourceType: "MEETING_ACTION_ITEM",
        sourceItemId: item.id,
        text: item.text,
        dataClass: item.dataClass,
        target: "FOLLOW_UP_TASK",
        clientId: input.clientId,
        clientWritable: input.clientWritable,
        clientSensitivity: input.clientSensitivity,
        citations: item.citations,
      }),
    ),
    ...input.openQuestions.map((item, index) =>
      buildCandidate({
        id: `question-${item.id || index}`,
        sourceType: "MEETING_OPEN_QUESTION",
        sourceItemId: item.id,
        text: item.text,
        dataClass: item.dataClass,
        target: "FOLLOW_UP_TASK",
        clientId: input.clientId,
        clientWritable: input.clientWritable,
        clientSensitivity: input.clientSensitivity,
        citations: item.citations,
      }),
    ),
  ];
}

export function evaluateMeetingWriteback(input: EvaluateMeetingWritebackInput): MeetingWritebackDecision[] {
  const selectedIds = new Set(input.selectedCandidateIds);
  const approvals = new Map((input.approvals ?? []).map((approval) => [approval.candidateId, approval]));
  const candidates = buildMeetingWritebackCandidates(input);

  return candidates.map((candidate) => {
    if (!selectedIds.has(candidate.id)) {
      return {
        candidate,
        status: "SKIPPED",
        riskAccepted: false,
      };
    }

    if (!candidate.canSelect || candidate.target === "BLOCKED") {
      return {
        candidate,
        status: "BLOCKED",
        riskAccepted: false,
        blockedReason: candidate.blockedReason ?? "此會議寫回候選不可建立。",
      };
    }

    const approval = approvals.get(candidate.id);
    const reason = approval?.reason?.trim();
    const riskAccepted = approval?.riskAccepted === true;

    if (candidate.requiresReason && !reason && !riskAccepted) {
      return {
        candidate,
        status: "BLOCKED",
        riskAccepted,
        blockedReason: "高敏感客戶或高敏感會議內容需要填寫確認理由或勾選風險接受。",
      };
    }

    return {
      candidate,
      status: "CREATABLE",
      reason,
      riskAccepted,
    };
  });
}

export function attachFeedbackAdvisorContextToMeetingWritebackCandidates<T extends MeetingWritebackCandidate>(
  candidates: T[],
  feedbackAdvisorBridgeCards: MeetingRouteBFeedbackAdvisorWritebackBridgeCard[] = [],
): T[] {
  if (feedbackAdvisorBridgeCards.length === 0) return candidates;

  return candidates.map((candidate) => {
    const reviewContext = selectFeedbackAdvisorReviewContext(candidate, feedbackAdvisorBridgeCards);
    if (reviewContext.length === 0) return candidate;

    return {
      ...candidate,
      reviewContext,
    };
  });
}

function buildCandidate(input: {
  id: string;
  sourceType: MeetingWritebackSourceType;
  sourceItemId: string;
  text: string;
  target: InterviewWritebackTarget;
  dataClass: MeetingDataClass;
  clientId: string | null;
  clientWritable: boolean;
  clientSensitivity: MeetingClientSensitivity;
  citations: MeetingCitation[];
}): MeetingWritebackCandidate {
  const sensitivity = inferSensitivity(input.text);
  const requiresReason =
    input.target !== "BLOCKED" &&
    (sensitivity === "HIGHLY_SENSITIVE" || input.clientSensitivity === "HIGHLY_SENSITIVE");
  const blockedReason = blockedReasonForCandidate(input.target, input.clientId, input.clientWritable);

  return {
    id: input.id,
    kind: kindForMeetingItem(input.sourceType, input.dataClass),
    sourceType: input.sourceType,
    sourceItemId: input.sourceItemId,
    text: input.text,
    target: input.target,
    dataClass: input.dataClass,
    sensitivity,
    citationTurnIds: unique(input.citations.map((citation) => citation.turnId)),
    supportingMemoryIds: unique(input.citations.flatMap((citation) => citation.memoryIds)),
    canSelect: input.target !== "BLOCKED",
    requiresReason,
    reasonHint: requiresReason ? "請說明為什麼此會議資訊可被建立為候選、洞察或追蹤任務。" : undefined,
    blockedReason,
    crmWritebackCandidate: input.target === "CRM_CANDIDATE",
    writesConfirmedCrmFact: false,
  };
}

function targetForMeetingSummaryItem(
  item: MeetingSummaryItem,
  clientId: string | null,
  clientWritable: boolean,
): InterviewWritebackTarget {
  if (item.dataClass === "INFERENCE") return "INTERVIEW_INSIGHT";
  if (item.dataClass === "UNKNOWN") return "FOLLOW_UP_TASK";
  if (!clientId || !clientWritable) return "BLOCKED";
  return "CRM_CANDIDATE";
}

function kindForMeetingItem(
  sourceType: MeetingWritebackSourceType,
  dataClass: MeetingDataClass,
): MeetingWritebackCandidateKind {
  if (sourceType === "MEETING_ACTION_ITEM") return "ACTION_ITEM";
  if (dataClass === "INFERENCE") return "INFERENCE";
  if (dataClass === "UNKNOWN") return "UNKNOWN";
  return "CONFIRMED_FACT";
}

function blockedReasonForCandidate(target: InterviewWritebackTarget, clientId: string | null, clientWritable: boolean) {
  if (target !== "BLOCKED") return undefined;
  if (!clientId) return "此會議尚未綁定 CRM 客戶，不能建立 CRM 候選。";
  if (!clientWritable) return "目前身份無法寫入此客戶，因此不能建立 CRM 候選。";
  return "此會議候選被寫回邊界阻擋。";
}

function inferSensitivity(text: string): InterviewWritebackSensitivity {
  if (HIGHLY_SENSITIVE_HINTS.some((hint) => text.includes(hint))) {
    return "HIGHLY_SENSITIVE";
  }

  if (SENSITIVE_HINTS.some((hint) => text.includes(hint))) {
    return "SENSITIVE";
  }

  return "NORMAL";
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function selectFeedbackAdvisorReviewContext(
  candidate: MeetingWritebackCandidate,
  cards: MeetingRouteBFeedbackAdvisorWritebackBridgeCard[],
): MeetingWritebackCandidateReviewContext[] {
  const expectedStatus = toFeedbackAdvisorStatus(candidate.dataClass);
  const normalizedCandidate = normalizeForContextMatch(candidate.text);

  return cards
    .filter((card) => card.status === expectedStatus)
    .filter((card) => feedbackAdvisorCardMatchesCandidate(card, normalizedCandidate))
    .slice(0, 3)
    .map(toMeetingWritebackCandidateReviewContext);
}

function toFeedbackAdvisorStatus(dataClass: MeetingDataClass): MeetingWritebackCandidateReviewContext["status"] {
  if (dataClass === "INFERENCE") return "inference";
  if (dataClass === "UNKNOWN") return "unknown";
  return "confirmed";
}

function feedbackAdvisorCardMatchesCandidate(
  card: MeetingRouteBFeedbackAdvisorWritebackBridgeCard,
  normalizedCandidate: string,
): boolean {
  const clues = [card.detail, card.label, card.followUpQuestion, card.fieldLabel, card.targetLabel]
    .map(normalizeForContextMatch)
    .filter((value) => value.length >= 2);

  return clues.some((clue) => normalizedCandidate.includes(clue) || clue.includes(normalizedCandidate));
}

function toMeetingWritebackCandidateReviewContext(
  card: MeetingRouteBFeedbackAdvisorWritebackBridgeCard,
): MeetingWritebackCandidateReviewContext {
  return {
    source: card.source,
    target: card.target,
    contextCardId: card.id,
    status: card.status,
    targetLabel: card.targetLabel,
    fieldLabel: card.fieldLabel,
    label: card.label,
    detail: card.detail,
    followUpQuestion: card.followUpQuestion,
    requiresAdvisorConfirmation: true,
    persistedSummaryRequired: true,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesClientProfile: false,
    writesPolicy: false,
    writesConfirmedCrmFact: false,
  };
}

function normalizeForContextMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "")
    .trim();
}
