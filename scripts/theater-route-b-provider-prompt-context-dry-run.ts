import {
  buildRouteBProviderPromptContext,
  type RouteBProviderPromptContext,
} from "../src/domains/theater/route-b-provider-prompt-context";
import type { TheaterRouteBMeetingSignalRuntimeGrounding } from "../src/domains/theater/route-b-next-turn";

const checks: Array<{ label: string; detail?: string }> = [];

const context = buildRouteBProviderPromptContext({
  role: "DECISION_MAKER",
  personaHints: ["保費負擔", "另一半需要一起討論", "家庭資料隱私敏感"],
  unknowns: ["尚未確認付款者與共同決策者", "不確定是否已有緊急預備金"],
  meetingRelationshipSignalGrounding: meetingSignalRuntimeGrounding(),
  maxItems: 5,
});

check(context.agentId === "asai.theater.route_b", "prompt context keeps Route B agent id");
check(context.actionId === "route-b-provider-prompt-context", "prompt context declares provider prompt action");
check(context.registryReadiness === "internal-only", "prompt context remains internal-only");
check(context.librarySummary.objectionPromptCount === 12, "prompt context references 12 objection prompts");
check(context.librarySummary.redLineRuleCount === 18, "prompt context references 18 red-line rules");
check(context.librarySummary.severeRedLineCount === 5, "prompt context keeps five severe immediate red lines");
check(context.librarySummary.standardRedLineCount === 13, "prompt context keeps thirteen standard post-review red lines");
check(context.selectedObjections.length === 5, "prompt context selects bounded role-aware objection cues");
check(hasObjection(context, "PREMIUM_BURDEN"), "prompt context selects premium burden cue from hints");
check(hasObjection(context, "FAMILY_ALIGNMENT"), "prompt context selects family alignment cue from hints");
check(hasObjection(context, "PRIVACY_SENSITIVITY"), "prompt context selects privacy sensitivity cue from hints");
check(context.redLineCues.length === 18, "prompt context carries all red-line cues for provider review");
check(
  context.redLineCues.filter((cue) => cue.severity === "SEVERE" && cue.detectionMode === "IMMEDIATE").length === 5,
  "severe red-line cues stay immediate",
);
check(
  context.redLineCues.filter((cue) => cue.severity === "STANDARD" && cue.detectionMode === "POST_REVIEW").length === 13,
  "standard red-line cues stay post-review",
);
check(context.promptRules.useAsRoleplayCoachingContext, "prompt context is roleplay coaching context only");
check(
  context.promptRules.useMeetingRelationshipSignalsAsRuntimeEvidence,
  "prompt context uses meeting signals as runtime evidence only",
);
check(context.promptRules.doNotTreatObjectionsAsConfirmedCrmFacts, "objection cues cannot become confirmed CRM facts");
check(context.promptRules.doNotProvideLegalAdvice, "prompt context forbids legal advice posture");
check(context.promptRules.immediateSevereRedLineIds.length === 5, "prompt rules expose five immediate severe red-line ids");
check(context.promptRules.postReviewRedLineIds.length === 13, "prompt rules expose thirteen post-review red-line ids");
check(context.promptRules.canMarkNotApplicableButKeepAuditRecord, "red-line not-applicable still keeps audit record");
check(!context.providerBoundary.providerCallAttempted, "prompt context does not call provider");
check(!context.providerBoundary.aiUsageLogWritten, "prompt context does not fake AiUsageLog");
check(context.providerBoundary.successErrorAiUsageLogRequiredBeforeProviderEnablement, "provider enablement still requires success/error AiUsageLog");
check(!context.providerBoundary.storesRawProviderPayload, "prompt context forbids raw provider payload storage");
check(!context.providerBoundary.rawPrivateTranscriptAllowed, "prompt context forbids raw private transcript");
check(!context.providerBoundary.directPrivateDialogAllowed, "prompt context forbids direct private dialog");
check(
  context.meetingRelationshipSignalGrounding.usedInNextTurnRuntime,
  "prompt context carries meeting signal runtime grounding",
);
check(context.meetingRelationshipSignalGrounding.cardCount === 2, "prompt context carries safe meeting signal card count");
check(context.meetingRelationshipSignalGrounding.unknownCount === 1, "prompt context carries safe meeting signal unknown count");
check(
  context.meetingRelationshipSignalGrounding.boundary.rawMeetingSessionIdIncluded === false,
  "prompt context excludes raw meeting session id",
);
check(
  context.meetingRelationshipSignalGrounding.boundary.rawPersonIdIncluded === false,
  "prompt context excludes raw person id",
);
check(
  context.meetingRelationshipSignalGrounding.boundary.sourceReferenceIdsIncluded === false,
  "prompt context excludes source reference ids",
);
check(context.redLineCues.every((cue) => !cue.legalAdviceIncluded), "red-line cues contain no legal advice");
check(context.redLineCues.every((cue) => !cue.writesConfirmedCrmFact), "red-line cues cannot write confirmed CRM facts");
checkNoSentinel(context, "prompt context excludes private/provider sentinel text");

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

console.log(
  JSON.stringify(
    {
      actionId: context.actionId,
      objectionPromptCount: context.librarySummary.objectionPromptCount,
      redLineRuleCount: context.librarySummary.redLineRuleCount,
      selectedObjectionIds: context.selectedObjections.map((cue) => cue.id),
      severeRedLineCount: context.librarySummary.severeRedLineCount,
      standardRedLineCount: context.librarySummary.standardRedLineCount,
      providerCallAttempted: context.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: context.providerBoundary.aiUsageLogWritten,
      successErrorAiUsageLogRequiredBeforeProviderEnablement:
        context.providerBoundary.successErrorAiUsageLogRequiredBeforeProviderEnablement,
      legalAdviceIncluded: context.redLineCues.some((cue) => cue.legalAdviceIncluded),
      writesConfirmedCrmFact: context.redLineCues.some((cue) => cue.writesConfirmedCrmFact),
      meetingSignalRuntimeCardCount: context.meetingRelationshipSignalGrounding.cardCount,
      meetingSignalRuntimeUnknownCount: context.meetingRelationshipSignalGrounding.unknownCount,
      meetingSignalSourceReferenceIdsIncluded:
        context.meetingRelationshipSignalGrounding.boundary.sourceReferenceIdsIncluded,
    },
    null,
    2,
  ),
);

function hasObjection(context: RouteBProviderPromptContext, id: RouteBProviderPromptContext["selectedObjections"][number]["id"]) {
  return context.selectedObjections.some((cue) => cue.id === id);
}

function meetingSignalRuntimeGrounding(): TheaterRouteBMeetingSignalRuntimeGrounding {
  return {
    source: "RouteBSessionSnapshot.scene.sourceGrounding.meetingRelationshipSignals",
    usedInNextTurnRuntime: true,
    providerPromptUsage: "roleplay-evidence-context-only",
    cardCount: 2,
    unknownCount: 1,
    narratorQuestionCount: 1,
    cards: [
      {
        cardLabel: "signal-1",
        status: "inference",
        factBoundary: "roleplay-evidence-context-not-confirmed-crm-fact",
        sourceLabel: "AI Meeting",
        action: "ASK_IN_NEXT_VISIT",
        actionLabel: "next-visit-question",
        priority: "high",
        priorityLabel: "high",
        summary: "林太太可能是現金流與預算決策的主要影響者。",
      },
      {
        cardLabel: "signal-2",
        status: "unknown",
        factBoundary: "roleplay-evidence-context-not-confirmed-crm-fact",
        sourceLabel: "AI Meeting",
        action: "CREATE_CONFIRMATION_CARD",
        actionLabel: "confirmation-card",
        priority: "medium",
        priorityLabel: "medium",
        summary: "尚未確認家庭保障排序是否由夫妻共同決定。",
      },
    ],
    narratorQuestions: ["請確認家庭保障排序與預算決策是否需要林太太共同參與。"],
    boundary: {
      rawMeetingSessionIdIncluded: false,
      rawPersonIdIncluded: false,
      sourceReferenceIdsIncluded: false,
      rawTranscriptIncluded: false,
      rawProviderPayloadIncluded: false,
      personalContactIncluded: false,
      policyIdentifierIncluded: false,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
    },
  };
}

function check(condition: boolean, label: string, detail?: string) {
  if (!condition) {
    throw new Error(`FAIL ${label}${detail ? ` - ${detail}` : ""}`);
  }
  checks.push({ label, detail });
}

function checkNoSentinel(value: unknown, label: string) {
  const serialized = JSON.stringify(value);
  check(!/qa-private@example\.com/i.test(serialized), label);
  check(!/0912[-\s]?345[-\s]?678/.test(serialized), label);
  check(!/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber)\b/i.test(serialized), label);
}
