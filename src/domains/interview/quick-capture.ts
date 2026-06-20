import { createMemoryCandidatesFromTurn, normalizeWhitespace } from "./memory";
import type {
  InterviewDataClass,
  InterviewMemory,
  InterviewModality,
  InterviewTurnRole,
} from "./types";

export type QuickCaptureOrigin = "POST_VISIT_NOTE" | "GLOBAL_QUICK_CAPTURE" | "MEETING_NOTE" | "VOICE_TRANSCRIPT";

export type QuickCaptureAssignment = "PRIVATE_DRAFT" | "CLIENT" | "VISIT_PLAN" | "FOLLOW_UP_REVIEW";

export type QuickCaptureBridgeStatus = "READY" | "BLOCKED";

export type QuickCaptureSensitivity = "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE";

export interface QuickCaptureServerScope {
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  clientId?: string | null;
  visitPlanId?: string | null;
  interviewSessionId?: string | null;
}

export interface QuickCaptureBridgeApproval {
  reason?: string;
  riskAccepted?: boolean;
}

export interface BuildQuickCaptureBridgeInput {
  captureId: string;
  content: string;
  origin: QuickCaptureOrigin;
  assignment: QuickCaptureAssignment;
  serverScope: QuickCaptureServerScope;
  clientProvidedScope?: Partial<QuickCaptureServerScope>;
  createdAt?: string;
  sourceTurnId?: string | null;
  transcriptFinal?: boolean;
  modality?: InterviewModality;
  role?: InterviewTurnRole;
  issueTags?: string[];
  outlineSegmentId?: string;
  approval?: QuickCaptureBridgeApproval;
}

export interface QuickCapturePreparationSupplement {
  id: string;
  label: string;
  dataClass: InterviewDataClass;
  evidenceMemoryIds: string[];
  requiresAdvisorConfirmation: boolean;
}

export interface QuickCaptureTheaterStateProposal {
  id: string;
  summary: string;
  sourceMemoryIds: string[];
  requiresConfirmation: true;
  writesConfirmedCrmFact: false;
}

export interface QuickCaptureCrmWritebackCandidate {
  id: string;
  memoryId: string;
  dataClass: "CONFIRMED";
  requiresConfirmation: true;
  writesConfirmedCrmFact: false;
}

export interface QuickCaptureBridge {
  status: QuickCaptureBridgeStatus;
  captureId: string;
  sourceLabel: string;
  scope: Required<Pick<QuickCaptureServerScope, "organizationId" | "memberId">> &
    Pick<QuickCaptureServerScope, "unitId" | "clientId" | "visitPlanId" | "interviewSessionId">;
  memoryCandidates: InterviewMemory[];
  preparationPackageSupplements: QuickCapturePreparationSupplement[];
  narratorQuestions: string[];
  theaterStateProposals: QuickCaptureTheaterStateProposal[];
  crmWritebackCandidates: QuickCaptureCrmWritebackCandidate[];
  blockedReason?: string;
  safety: {
    sensitivity: QuickCaptureSensitivity;
    linkedToClientOrVisit: boolean;
    highSensitiveGatePassed: boolean;
    clientProvidedScopeIgnored: boolean;
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    rawAudioStored: false;
    rawPrivateTranscriptStored: false;
    writesConfirmedCrmFact: false;
  };
}

const HIGHLY_SENSITIVE_HINTS = [
  "醫療",
  "病史",
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

const SENSITIVE_HINTS = ["家庭", "配偶", "太太", "先生", "小孩", "教育金", "退休", "財務", "決策"];

const SECRET_OR_RAW_PAYLOAD_HINTS = [
  /sk-[a-zA-Z0-9_-]{8,}/,
  /\b(cookie|authorization|bearer|token|otp|secret)\b/i,
  /raw\s+provider\s+payload/i,
  /raw\s+private\s+transcript/i,
];

export function buildQuickCaptureMemoryBridge(input: BuildQuickCaptureBridgeInput): QuickCaptureBridge {
  const content = normalizeWhitespace(input.content);
  const sensitivity = inferQuickCaptureSensitivity(content);
  const linkedToClientOrVisit = input.assignment !== "PRIVATE_DRAFT";
  const approvalReason = normalizeWhitespace(input.approval?.reason ?? "");
  const riskAccepted = input.approval?.riskAccepted === true;
  const highSensitiveGatePassed = sensitivity !== "HIGHLY_SENSITIVE" || !linkedToClientOrVisit || Boolean(approvalReason || riskAccepted);
  const scope = normalizeServerScope(input);
  const sourceLabel = sourceLabelFor(input.origin, input.assignment);

  const baseBridge = (overrides: Partial<QuickCaptureBridge>): QuickCaptureBridge => ({
    status: "READY",
    captureId: input.captureId,
    sourceLabel,
    scope,
    memoryCandidates: [],
    preparationPackageSupplements: [],
    narratorQuestions: [],
    theaterStateProposals: [],
    crmWritebackCandidates: [],
    safety: {
      sensitivity,
      linkedToClientOrVisit,
      highSensitiveGatePassed,
      clientProvidedScopeIgnored: Boolean(input.clientProvidedScope),
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      rawAudioStored: false,
      rawPrivateTranscriptStored: false,
      writesConfirmedCrmFact: false,
    },
    ...overrides,
  });

  if (!content) {
    return baseBridge({
      status: "BLOCKED",
      blockedReason: "Quick-capture note is empty.",
    });
  }

  if (containsSecretOrRawPayload(content)) {
    return baseBridge({
      status: "BLOCKED",
      blockedReason: "Quick-capture note appears to contain a secret, token, cookie, OTP, raw provider payload, or raw private transcript.",
    });
  }

  if (!highSensitiveGatePassed) {
    return baseBridge({
      status: "BLOCKED",
      blockedReason: "High-sensitive quick-capture material needs a reason or riskAccepted before it can be linked to a client or visit.",
    });
  }

  const [memory] = createMemoryCandidatesFromTurn({
    organizationId: scope.organizationId,
    memberId: scope.memberId,
    unitId: scope.unitId,
    clientId: scope.clientId,
    interviewSessionId: scope.interviewSessionId ?? `quick_capture_session_${stableHash(`${scope.organizationId}:${scope.memberId}:${input.captureId}`)}`,
    turnId: input.sourceTurnId ?? `quick_capture_turn_${stableHash(input.captureId)}`,
    interviewKind: "ADVISOR_COMPANION",
    role: input.role ?? "USER",
    modality: input.modality ?? (input.origin === "VOICE_TRANSCRIPT" ? "VOICE_TRANSCRIPT_FALLBACK" : "TEXT"),
    content,
    transcriptFinal: input.transcriptFinal ?? true,
    createdAt: input.createdAt,
    outlineSegmentId: input.outlineSegmentId,
    issueTags: input.issueTags ?? [],
    evidenceText: sourceLabel,
  });

  return baseBridge({
    memoryCandidates: [memory],
    preparationPackageSupplements: buildPreparationSupplements(memory),
    narratorQuestions: buildNarratorQuestions(memory),
    theaterStateProposals: buildTheaterStateProposals(memory),
    crmWritebackCandidates: buildCrmWritebackCandidates(memory),
  });
}

function normalizeServerScope(input: BuildQuickCaptureBridgeInput): QuickCaptureBridge["scope"] {
  return {
    organizationId: input.serverScope.organizationId,
    memberId: input.serverScope.memberId,
    unitId: input.serverScope.unitId ?? null,
    clientId: input.serverScope.clientId ?? null,
    visitPlanId: input.serverScope.visitPlanId ?? null,
    interviewSessionId: input.serverScope.interviewSessionId ?? null,
  };
}

function buildPreparationSupplements(memory: InterviewMemory): QuickCapturePreparationSupplement[] {
  if (memory.dataClass === "UNKNOWN" || memory.dataClass === "INSTRUCTION") return [];

  return [
    {
      id: `prep_${stableHash(memory.id)}`,
      label: memory.dataClass === "INFERENCE" ? "拜訪後推論補強" : "拜訪後已知資料補強",
      dataClass: memory.dataClass,
      evidenceMemoryIds: [memory.id],
      requiresAdvisorConfirmation: memory.dataClass !== "CONFIRMED",
    },
  ];
}

function buildNarratorQuestions(memory: InterviewMemory): string[] {
  if (memory.dataClass !== "UNKNOWN") return [];
  return [`請顧問確認：${memory.text}`];
}

function buildTheaterStateProposals(memory: InterviewMemory): QuickCaptureTheaterStateProposal[] {
  if (memory.dataClass !== "INFERENCE" && memory.dataClass !== "UNKNOWN") return [];

  return [
    {
      id: `state_proposal_${stableHash(memory.id)}`,
      summary: memory.dataClass === "UNKNOWN" ? `待確認狀態：${memory.text}` : `關係/狀態推論：${memory.text}`,
      sourceMemoryIds: [memory.id],
      requiresConfirmation: true,
      writesConfirmedCrmFact: false,
    },
  ];
}

function buildCrmWritebackCandidates(memory: InterviewMemory): QuickCaptureCrmWritebackCandidate[] {
  if (memory.dataClass !== "CONFIRMED" || !memory.clientId) return [];

  return [
    {
      id: `crm_candidate_${stableHash(memory.id)}`,
      memoryId: memory.id,
      dataClass: "CONFIRMED",
      requiresConfirmation: true,
      writesConfirmedCrmFact: false,
    },
  ];
}

function inferQuickCaptureSensitivity(text: string): QuickCaptureSensitivity {
  if (HIGHLY_SENSITIVE_HINTS.some((hint) => text.includes(hint))) return "HIGHLY_SENSITIVE";
  if (SENSITIVE_HINTS.some((hint) => text.includes(hint))) return "SENSITIVE";
  return "NORMAL";
}

function sourceLabelFor(origin: QuickCaptureOrigin, assignment: QuickCaptureAssignment): string {
  const originLabel: Record<QuickCaptureOrigin, string> = {
    POST_VISIT_NOTE: "post_visit_note",
    GLOBAL_QUICK_CAPTURE: "global_quick_capture",
    MEETING_NOTE: "meeting_note",
    VOICE_TRANSCRIPT: "voice_transcript_final",
  };
  return `${originLabel[origin]}:${assignment.toLowerCase()}`;
}

function containsSecretOrRawPayload(text: string): boolean {
  return SECRET_OR_RAW_PAYLOAD_HINTS.some((pattern) => pattern.test(text));
}

function stableHash(value: string): string {
  let hash = 5381;
  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}
