import {
  buildRouteBProviderPromptContext,
  type RouteBProviderPromptContext,
  type RouteBProviderPromptRedLineCue,
} from "./route-b-provider-prompt-context";

export interface RouteBSevereRedLineWarningCue {
  id: RouteBProviderPromptRedLineCue["id"];
  label: string;
  severity: "SEVERE";
  detectionMode: "IMMEDIATE";
  triggerSignals: string[];
  advisorReminder: string;
  evidencePolicy: "requires-evidence-or-mark-not-applicable";
  falsePositiveHandling: "can-mark-not-applicable-but-keep-audit-record";
  status: "WATCHLIST_ONLY";
  legalAdviceIncluded: false;
  writesConfirmedCrmFact: false;
}

export interface RouteBSevereRedLineWarningPreview {
  agentId: "asai.theater.route_b";
  actionId: "route-b-severe-red-line-warning-preview";
  registryReadiness: "internal-only";
  sourceActionId: RouteBProviderPromptContext["actionId"];
  warningCount: number;
  warnings: RouteBSevereRedLineWarningCue[];
  displayRules: {
    showAsAdvisorWarningOnly: true;
    doNotBlockConversationAutomatically: true;
    doNotProvideLegalAdvice: true;
    doNotTreatAsComplianceFindingWithoutEvidence: true;
    allowMarkNotApplicableButKeepAuditRecord: true;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    successErrorAiUsageLogRequiredBeforeProviderEnablement: true;
    storesRawProviderPayload: false;
  };
  privacyBoundary: {
    rawPrivateTranscriptAllowed: false;
    directPrivateDialogAllowed: false;
    warningPreviewStoresTranscript: false;
    warningPreviewWritesClientData: false;
  };
}

export function buildRouteBSevereRedLineWarningPreview(
  context: RouteBProviderPromptContext = buildRouteBProviderPromptContext(),
): RouteBSevereRedLineWarningPreview {
  const warnings = context.redLineCues.filter(isSevereImmediateCue).map(toWarningCue);

  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-severe-red-line-warning-preview",
    registryReadiness: "internal-only",
    sourceActionId: context.actionId,
    warningCount: warnings.length,
    warnings,
    displayRules: {
      showAsAdvisorWarningOnly: true,
      doNotBlockConversationAutomatically: true,
      doNotProvideLegalAdvice: true,
      doNotTreatAsComplianceFindingWithoutEvidence: true,
      allowMarkNotApplicableButKeepAuditRecord: true,
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      successErrorAiUsageLogRequiredBeforeProviderEnablement: true,
      storesRawProviderPayload: false,
    },
    privacyBoundary: {
      rawPrivateTranscriptAllowed: false,
      directPrivateDialogAllowed: false,
      warningPreviewStoresTranscript: false,
      warningPreviewWritesClientData: false,
    },
  };
}

function isSevereImmediateCue(cue: RouteBProviderPromptRedLineCue): cue is RouteBProviderPromptRedLineCue & {
  severity: "SEVERE";
  detectionMode: "IMMEDIATE";
} {
  return cue.severity === "SEVERE" && cue.detectionMode === "IMMEDIATE";
}

function toWarningCue(cue: RouteBProviderPromptRedLineCue & { severity: "SEVERE"; detectionMode: "IMMEDIATE" }): RouteBSevereRedLineWarningCue {
  return {
    id: cue.id,
    label: cue.label,
    severity: cue.severity,
    detectionMode: cue.detectionMode,
    triggerSignals: cue.triggerSignals,
    advisorReminder: cue.advisorReminder,
    evidencePolicy: cue.evidencePolicy,
    falsePositiveHandling: cue.falsePositiveHandling,
    status: "WATCHLIST_ONLY",
    legalAdviceIncluded: cue.legalAdviceIncluded,
    writesConfirmedCrmFact: cue.writesConfirmedCrmFact,
  };
}
