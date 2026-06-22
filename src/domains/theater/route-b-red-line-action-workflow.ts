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

export type RouteBRedLineActionState = (typeof ROUTE_B_RED_LINE_ACTION_STATES)[number];

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
    currentPersistence: "ui-local-only";
    dbPersistenceAllowedFields: Array<"ruleId" | "state" | "advisorReasonCode" | "updatedAt">;
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
      currentPersistence: "ui-local-only",
      dbPersistenceAllowedFields: ["ruleId", "state", "advisorReasonCode", "updatedAt"],
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
