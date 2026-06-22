import {
  buildRouteBSevereRedLineWarningPreview,
  type RouteBSevereRedLineWarningCue,
  type RouteBSevereRedLineWarningPreview,
} from "./route-b-severe-red-line-preview";

export const ROUTE_B_RED_LINE_ACTION_STATES = [
  "WATCHING",
  "EVIDENCE_NEEDED",
  "NOT_APPLICABLE",
  "ESCALATE",
] as const;

export const ROUTE_B_RED_LINE_ACTION_REASON_CODES = [
  "ADVISOR_REVIEWED",
  "EVIDENCE_PENDING",
  "FALSE_POSITIVE_CONTEXT",
  "ESCALATION_REQUESTED",
] as const;

export type RouteBRedLineActionState = (typeof ROUTE_B_RED_LINE_ACTION_STATES)[number];
export type RouteBRedLineActionReasonCode = (typeof ROUTE_B_RED_LINE_ACTION_REASON_CODES)[number];

export interface RouteBRedLineActionOption {
  state: RouteBRedLineActionState;
  label: string;
  summary: string;
  requiresAdvisorReasonCode: boolean;
  requiresEvidenceReference: boolean;
  triggersExternalNotification: false;
}

export interface RouteBRedLineActionCard {
  ruleId: RouteBSevereRedLineWarningCue["id"];
  label: string;
  severity: "SEVERE";
  detectionMode: "IMMEDIATE";
  triggerSignals: string[];
  advisorReminder: string;
  evidencePolicy: RouteBSevereRedLineWarningCue["evidencePolicy"];
  defaultState: "WATCHING";
  allowedStates: RouteBRedLineActionState[];
  options: RouteBRedLineActionOption[];
  guardEvidence: {
    legalAdviceIncluded: false;
    writesConfirmedCrmFact: false;
    autoBlockConversation: false;
    formalFindingWithoutEvidence: false;
  };
}

export interface RouteBSevereRedLineActionWorkflow {
  agentId: "asai.theater.route_b";
  actionId: "route-b-severe-red-line-action-workflow";
  registryReadiness: "internal-only";
  sourceActionId: RouteBSevereRedLineWarningPreview["actionId"];
  actionCount: number;
  cards: RouteBRedLineActionCard[];
  workflowBoundary: {
    advisorVisibleOnly: true;
    noLegalAdvice: true;
    noFormalFindingWithoutEvidence: true;
    noAutoBlock: true;
    notApplicableKeepsAuditRecord: true;
  };
  persistenceEnvelope: {
    currentPersistence: "owner-scoped-scene-state";
    dbPersistenceAllowedFields: Array<"ruleId" | "state" | "advisorReasonCode" | "updatedAt">;
    ownerScopedSessionOnly: true;
    rawPrivateTranscriptAllowed: false;
    rawProviderPayloadAllowed: false;
    directPrivateDialogAllowed: false;
    writesConfirmedCrmFact: false;
    triggersExternalNotification: false;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    successErrorAiUsageLogRequiredBeforeProviderEnablement: true;
  };
}

export interface RouteBRedLineActionRecord {
  ruleId: RouteBRedLineActionCard["ruleId"];
  state: RouteBRedLineActionState;
  advisorReasonCode: RouteBRedLineActionReasonCode;
  updatedAt: string;
}

export interface RouteBRedLineActionPersistenceState {
  agentId: "asai.theater.route_b";
  actionId: "route-b-severe-red-line-action-persistence";
  registryReadiness: "internal-only";
  sourceActionId: RouteBSevereRedLineActionWorkflow["actionId"];
  recordCount: number;
  records: RouteBRedLineActionRecord[];
  actionSummary: {
    watchingCount: number;
    evidenceNeededCount: number;
    notApplicableCount: number;
    escalateCount: number;
  };
  workflowBoundary: RouteBSevereRedLineActionWorkflow["workflowBoundary"];
  persistenceEnvelope: RouteBSevereRedLineActionWorkflow["persistenceEnvelope"];
  providerBoundary: RouteBSevereRedLineActionWorkflow["providerBoundary"];
}

export const ROUTE_B_RED_LINE_ACTION_OPTIONS: RouteBRedLineActionOption[] = [
  {
    state: "WATCHING",
    label: "觀察中",
    summary: "保留提醒，不建立正式法遵判斷。",
    requiresAdvisorReasonCode: false,
    requiresEvidenceReference: false,
    triggersExternalNotification: false,
  },
  {
    state: "EVIDENCE_NEEDED",
    label: "需要佐證",
    summary: "要求補齊可被審閱的佐證，再決定是否升級或排除。",
    requiresAdvisorReasonCode: false,
    requiresEvidenceReference: true,
    triggersExternalNotification: false,
  },
  {
    state: "NOT_APPLICABLE",
    label: "標示不適用",
    summary: "標示為疑似誤判，但仍保留 audit posture。",
    requiresAdvisorReasonCode: true,
    requiresEvidenceReference: false,
    triggersExternalNotification: false,
  },
  {
    state: "ESCALATE",
    label: "升級審閱",
    summary: "建立需主管或法遵查看的狀態；不發真實通知。",
    requiresAdvisorReasonCode: true,
    requiresEvidenceReference: true,
    triggersExternalNotification: false,
  },
];

export function buildRouteBSevereRedLineActionWorkflow(
  preview: RouteBSevereRedLineWarningPreview = buildRouteBSevereRedLineWarningPreview(),
): RouteBSevereRedLineActionWorkflow {
  const cards = preview.warnings.map(toActionCard);

  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-severe-red-line-action-workflow",
    registryReadiness: "internal-only",
    sourceActionId: preview.actionId,
    actionCount: cards.length,
    cards,
    workflowBoundary: {
      advisorVisibleOnly: true,
      noLegalAdvice: true,
      noFormalFindingWithoutEvidence: true,
      noAutoBlock: true,
      notApplicableKeepsAuditRecord: true,
    },
    persistenceEnvelope: {
      currentPersistence: "owner-scoped-scene-state",
      dbPersistenceAllowedFields: ["ruleId", "state", "advisorReasonCode", "updatedAt"],
      ownerScopedSessionOnly: true,
      rawPrivateTranscriptAllowed: false,
      rawProviderPayloadAllowed: false,
      directPrivateDialogAllowed: false,
      writesConfirmedCrmFact: false,
      triggersExternalNotification: false,
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      successErrorAiUsageLogRequiredBeforeProviderEnablement: true,
    },
  };
}

export function isRouteBRedLineActionState(value: string): value is RouteBRedLineActionState {
  return ROUTE_B_RED_LINE_ACTION_STATES.some((state) => state === value);
}

export function isRouteBRedLineActionReasonCode(value: string): value is RouteBRedLineActionReasonCode {
  return ROUTE_B_RED_LINE_ACTION_REASON_CODES.some((reasonCode) => reasonCode === value);
}

export function buildRouteBRedLineActionRecordsFromStateMap(
  actionStates: Record<string, RouteBRedLineActionState>,
  workflow: RouteBSevereRedLineActionWorkflow = buildRouteBSevereRedLineActionWorkflow(),
  updatedAt = new Date().toISOString(),
): RouteBRedLineActionRecord[] {
  return workflow.cards.map((card) => {
    const state = actionStates[card.ruleId] ?? card.defaultState;

    return {
      ruleId: card.ruleId,
      state,
      advisorReasonCode: defaultReasonCodeForState(state),
      updatedAt,
    };
  });
}

export function buildRouteBRedLineActionPersistenceState(
  inputRecords: readonly RouteBRedLineActionRecord[] = [],
  workflow: RouteBSevereRedLineActionWorkflow = buildRouteBSevereRedLineActionWorkflow(),
  updatedAt = new Date().toISOString(),
): RouteBRedLineActionPersistenceState {
  const records = sanitizeRouteBRedLineActionRecords(inputRecords, workflow, updatedAt);
  const actionSummary = {
    watchingCount: records.filter((record) => record.state === "WATCHING").length,
    evidenceNeededCount: records.filter((record) => record.state === "EVIDENCE_NEEDED").length,
    notApplicableCount: records.filter((record) => record.state === "NOT_APPLICABLE").length,
    escalateCount: records.filter((record) => record.state === "ESCALATE").length,
  };

  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-severe-red-line-action-persistence",
    registryReadiness: "internal-only",
    sourceActionId: workflow.actionId,
    recordCount: records.length,
    records,
    actionSummary,
    workflowBoundary: workflow.workflowBoundary,
    persistenceEnvelope: workflow.persistenceEnvelope,
    providerBoundary: workflow.providerBoundary,
  };
}

export function sanitizeRouteBRedLineActionRecords(
  inputRecords: readonly RouteBRedLineActionRecord[],
  workflow: RouteBSevereRedLineActionWorkflow = buildRouteBSevereRedLineActionWorkflow(),
  updatedAt = new Date().toISOString(),
): RouteBRedLineActionRecord[] {
  const byRuleId = new Map(inputRecords.map((record) => [record.ruleId, record]));

  return workflow.cards.map((card) => {
    const record = byRuleId.get(card.ruleId);
    const state = record && isRouteBRedLineActionState(record.state) ? record.state : card.defaultState;
    const advisorReasonCode = record && isRouteBRedLineActionReasonCode(record.advisorReasonCode)
      ? record.advisorReasonCode
      : defaultReasonCodeForState(state);

    return {
      ruleId: card.ruleId,
      state,
      advisorReasonCode,
      updatedAt: sanitizeIsoTimestamp(record?.updatedAt, updatedAt),
    };
  });
}

export function isRouteBRedLineActionPersistenceState(value: unknown): value is RouteBRedLineActionPersistenceState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const state = value as Partial<RouteBRedLineActionPersistenceState>;

  return (
    state.agentId === "asai.theater.route_b" &&
    state.actionId === "route-b-severe-red-line-action-persistence" &&
    state.registryReadiness === "internal-only" &&
    state.sourceActionId === "route-b-severe-red-line-action-workflow" &&
    Array.isArray(state.records) &&
    state.records.every(isRouteBRedLineActionRecord)
  );
}

export function summarizeRouteBRedLineActionWorkflow(workflow: RouteBSevereRedLineActionWorkflow) {
  return {
    actionId: workflow.actionId,
    sourceActionId: workflow.sourceActionId,
    actionCount: workflow.actionCount,
    stateCount: ROUTE_B_RED_LINE_ACTION_STATES.length,
    noProvider: !workflow.providerBoundary.providerCallAttempted,
    noFakeUsageLog: !workflow.providerBoundary.aiUsageLogWritten,
    noConfirmedCrmFact: !workflow.persistenceEnvelope.writesConfirmedCrmFact,
    noExternalNotification: !workflow.persistenceEnvelope.triggersExternalNotification,
  };
}

function isRouteBRedLineActionRecord(value: unknown): value is RouteBRedLineActionRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as Partial<RouteBRedLineActionRecord>;

  return (
    typeof record.ruleId === "string" &&
    typeof record.state === "string" &&
    isRouteBRedLineActionState(record.state) &&
    typeof record.advisorReasonCode === "string" &&
    isRouteBRedLineActionReasonCode(record.advisorReasonCode) &&
    typeof record.updatedAt === "string"
  );
}

function defaultReasonCodeForState(state: RouteBRedLineActionState): RouteBRedLineActionReasonCode {
  if (state === "EVIDENCE_NEEDED") return "EVIDENCE_PENDING";
  if (state === "NOT_APPLICABLE") return "FALSE_POSITIVE_CONTEXT";
  if (state === "ESCALATE") return "ESCALATION_REQUESTED";
  return "ADVISOR_REVIEWED";
}

function sanitizeIsoTimestamp(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return fallback;

  return new Date(timestamp).toISOString();
}

function toActionCard(warning: RouteBSevereRedLineWarningCue): RouteBRedLineActionCard {
  return {
    ruleId: warning.id,
    label: warning.label,
    severity: warning.severity,
    detectionMode: warning.detectionMode,
    triggerSignals: warning.triggerSignals,
    advisorReminder: warning.advisorReminder,
    evidencePolicy: warning.evidencePolicy,
    defaultState: "WATCHING",
    allowedStates: [...ROUTE_B_RED_LINE_ACTION_STATES],
    options: ROUTE_B_RED_LINE_ACTION_OPTIONS,
    guardEvidence: {
      legalAdviceIncluded: false,
      writesConfirmedCrmFact: false,
      autoBlockConversation: false,
      formalFindingWithoutEvidence: false,
    },
  };
}
