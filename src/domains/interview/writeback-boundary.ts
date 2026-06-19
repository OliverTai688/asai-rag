import type { InterviewKind, InterviewReflection } from "./types";

export type InterviewConfirmationItemKind = "CONFIRMED_FACT" | "INFERENCE" | "UNKNOWN";

export type InterviewWritebackTarget =
  | "CRM_CANDIDATE"
  | "INTERVIEW_INSIGHT"
  | "FOLLOW_UP_TASK"
  | "THEATER_NARRATOR_QUESTION"
  | "BLOCKED";

export type InterviewWritebackSensitivity = "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE";

export interface InterviewConfirmationCandidate {
  id: string;
  kind: InterviewConfirmationItemKind;
  text: string;
  target: InterviewWritebackTarget;
  sensitivity: InterviewWritebackSensitivity;
  supportingMemoryIds: string[];
  canSelect: boolean;
  requiresReason: boolean;
  reasonHint?: string;
  blockedReason?: string;
}

export interface InterviewWritebackApproval {
  candidateId: string;
  reason?: string;
  riskAccepted?: boolean;
}

export interface InterviewWritebackDecision {
  candidate: InterviewConfirmationCandidate;
  status: "CREATABLE" | "BLOCKED" | "SKIPPED";
  reason?: string;
  riskAccepted: boolean;
  blockedReason?: string;
}

export interface BuildInterviewConfirmationCandidatesInput {
  sessionId: string;
  interviewKind: InterviewKind;
  reflection: InterviewReflection;
  clientId?: string | null;
}

export interface EvaluateInterviewWritebackInput extends BuildInterviewConfirmationCandidatesInput {
  selectedCandidateIds: string[];
  approvals?: InterviewWritebackApproval[];
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

export function buildInterviewConfirmationCandidates(
  input: BuildInterviewConfirmationCandidatesInput,
): InterviewConfirmationCandidate[] {
  return [
    ...input.reflection.confirmedFacts.map((text, index) =>
      buildCandidate({
        id: `confirmed-${index}`,
        kind: "CONFIRMED_FACT",
        text,
        target: input.clientId ? "CRM_CANDIDATE" : "BLOCKED",
        clientId: input.clientId,
        supportingMemoryIds: input.reflection.supportingMemoryIds,
      }),
    ),
    ...input.reflection.inferredPatterns.map((text, index) =>
      buildCandidate({
        id: `inference-${index}`,
        kind: "INFERENCE",
        text,
        target: "INTERVIEW_INSIGHT",
        clientId: input.clientId,
        supportingMemoryIds: input.reflection.supportingMemoryIds,
      }),
    ),
    ...input.reflection.unknowns.map((text, index) =>
      buildCandidate({
        id: `unknown-${index}`,
        kind: "UNKNOWN",
        text,
        target: input.interviewKind === "THEATER_FIELD_BUILD" ? "THEATER_NARRATOR_QUESTION" : "FOLLOW_UP_TASK",
        clientId: input.clientId,
        supportingMemoryIds: input.reflection.supportingMemoryIds,
      }),
    ),
  ];
}

export function evaluateInterviewWriteback(input: EvaluateInterviewWritebackInput): InterviewWritebackDecision[] {
  const selectedIds = new Set(input.selectedCandidateIds);
  const approvals = new Map((input.approvals ?? []).map((approval) => [approval.candidateId, approval]));
  const candidates = buildInterviewConfirmationCandidates(input);

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
        blockedReason: candidate.blockedReason ?? "此候選不可寫回。",
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
        blockedReason: "高敏感資料需要填寫確認理由或勾選風險接受。",
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

function buildCandidate(input: {
  id: string;
  kind: InterviewConfirmationItemKind;
  text: string;
  target: InterviewWritebackTarget;
  clientId?: string | null;
  supportingMemoryIds: string[];
}): InterviewConfirmationCandidate {
  const sensitivity = inferSensitivity(input.text);
  const blockedReason =
    input.target === "BLOCKED"
      ? "此 confirmed fact 尚未綁定 CRM 客戶，只能留在訪談內，不能寫成客戶候選。"
      : undefined;

  return {
    id: input.id,
    kind: input.kind,
    text: input.text,
    target: input.target,
    sensitivity,
    supportingMemoryIds: input.supportingMemoryIds,
    canSelect: input.target !== "BLOCKED",
    requiresReason: sensitivity === "HIGHLY_SENSITIVE" && input.target === "CRM_CANDIDATE",
    reasonHint:
      sensitivity === "HIGHLY_SENSITIVE" && input.target === "CRM_CANDIDATE"
        ? "請說明為什麼此高敏感資訊可作為 CRM 候選。"
        : undefined,
    blockedReason,
  };
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
