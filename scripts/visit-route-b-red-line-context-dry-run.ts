import assert from "node:assert/strict";
import type { Client } from "../src/domains/client/types";
import { buildTheaterRouteBFeedbackReview } from "../src/domains/theater/route-b-feedback-review";
import { buildRouteBRedLineActionPersistenceState } from "../src/domains/theater/route-b-red-line-action-workflow";
import type { RouteBSessionSnapshot } from "../src/domains/theater/route-b-session";
import { buildVisitRouteBRedLineContextFromFeedbackReview } from "../src/domains/visit/route-b-red-line-context";
import { enrichSpinQuestionsWithReasoning } from "../src/domains/visit/reasoning";
import type { SpinQuestion } from "../src/domains/visit/types";

const checks: string[] = [];

const snapshot: RouteBSessionSnapshot = {
  session: {
    id: "route_b_session_visit_context",
    routeBEnabled: true,
    routeBSceneId: "route_b_scene_visit_context",
    routeBSourcePacketId: "route_b_packet_visit_context",
    clientId: "client_visit_context",
    spinSessionId: "spin_visit_context",
    status: "ACTIVE",
    isDemo: false,
    createdAt: "2026-06-22T11:41:37.000Z",
    provider: {
      callsEnabled: false,
      callAttempted: false,
      usageLogWritten: false,
      usageLogRequiredFor: ["DIRECTOR", "CHARACTER", "FEEDBACK"],
      storesProviderBody: false,
    },
  },
  scene: {
    relationships: [
      {
        summary: "客戶與配偶為共同決策關係。",
        factStatus: "CONFIRMED",
        visibilityScope: "GROUP",
        sourceRefs: [{ id: "visit_context_rel", label: "QA fixture" }],
      },
    ],
    narratorQuestions: [{ summary: "請確認配偶是否參與下次拜訪。", factStatus: "UNKNOWN" }],
    statePatchCount: 1,
    visibilityRules: [
      {
        label: "私聊",
        visibleTo: "ADDRESSEE_ONLY",
        canBeQuotedInGroup: false,
      },
    ],
    redLineActionState: buildRouteBRedLineActionPersistenceState([
      {
        ruleId: "SIGNATURE_SUBSTITUTION",
        state: "ESCALATE",
        advisorReasonCode: "ESCALATION_REQUESTED",
        updatedAt: "2026-06-22T11:42:00.000Z",
      },
      {
        ruleId: "GUARANTEED_RETURN",
        state: "EVIDENCE_NEEDED",
        advisorReasonCode: "EVIDENCE_PENDING",
        updatedAt: "2026-06-22T11:42:10.000Z",
      },
      {
        ruleId: "PREMIUM_ADVANCE",
        state: "NOT_APPLICABLE",
        advisorReasonCode: "FALSE_POSITIVE_CONTEXT",
        updatedAt: "2026-06-22T11:42:20.000Z",
      },
    ]),
  },
  characters: [
    {
      id: "route_b_focus_client",
      routeBCharacterId: "route_b_focus_client",
      role: "FOCUS_CLIENT",
      displayName: "陳先生",
      isFocus: true,
      publicBrief: "高階主管，重視效率與家庭現金流。",
      knownFacts: [{ summary: "陳先生是高階主管。", factStatus: "CONFIRMED" }],
      personaHints: [{ summary: "可能重視效率。", factStatus: "INFERENCE" }],
      unknowns: [{ summary: "尚未確認配偶是否共同決策。", factStatus: "UNKNOWN" }],
      exemplarLines: [],
      statePatchCount: 1,
    },
  ],
  turns: [
    {
      id: "route_b_private_turn_sentinel",
      role: "ADVISOR",
      speakerRouteBCharacterId: null,
      addresseeRouteBCharacterId: "route_b_focus_client",
      visibilityScope: "PRIVATE",
      content: "private sentinel qa-private@example.com 0912-345-678 rawPayload policyNumber should never reach visit context.",
      statePatchCount: 0,
      createdAt: "2026-06-22T11:43:00.000Z",
    },
  ],
  visibilityProof: {
    ownerOnlyRead: true,
    scopedTurnColumnsPersisted: true,
    thirdPartyVisibleForDirectMessage: false,
  },
};

const client: Client = {
  id: "client_visit_route_b_context",
  name: "陳先生",
  email: "",
  phone: "",
  birthDate: "1982-03-01",
  occupation: "科技公司營運主管",
  annualIncome: 2600000,
  family: [{ id: "spouse", relation: "配偶", name: "陳太太" }],
  existingPolicies: [{ id: "policy-1", type: "壽險", provider: "Nuva Life", amount: 5000000 }],
  tags: [],
  aiTags: ["保障缺口待確認"],
  status: "ACTIVE",
  complianceChecklist: {
    kycStatus: "MISSING",
    suitabilityStatus: "MISSING",
    consentStatus: "MISSING",
    missingItems: ["適合度確認"],
  },
  sensitivityLevel: "NORMAL",
  kycStatus: "MISSING",
  lastInteraction: "2026-06-22T00:00:00.000Z",
};

const questions: SpinQuestion[] = [
  { id: "s1", type: "S", question: "目前家庭決策會由誰一起參與？" },
  { id: "p1", type: "P", question: "既有保障中哪一塊最需要先確認？" },
  { id: "i1", type: "I", question: "如果這個缺口沒有處理，會影響哪個家庭安排？" },
  { id: "n1", type: "N", question: "下一步你希望先補哪些佐證再決定？" },
];

const review = buildTheaterRouteBFeedbackReview({
  snapshot,
  now: new Date("2026-06-22T11:44:00.000Z"),
});
const context = buildVisitRouteBRedLineContextFromFeedbackReview(review);
const enriched = enrichSpinQuestionsWithReasoning(questions, {
  client,
  purpose: "ADD_ON",
  routeBRedLineContext: context,
});

check(context.agentId === "asai.visit.preparation_package", "visit context is attached to visit preparation agent");
check(context.actionId === "route-b-red-line-action-visit-prep-consumption", "visit context declares downstream consumption action");
check(context.sourceActionId === "route-b-red-line-action-feedback-consumption", "visit context consumes feedback review action context");
check(context.registryReadiness === "internal-only", "visit context remains internal-only");
check(context.summary.escalateCount === 1, "visit context counts escalation reminders");
check(context.summary.evidenceNeededCount === 1, "visit context counts evidence-needed reminders");
check(context.summary.notApplicableCount === 1, "visit context preserves not-applicable audit posture");
check(context.outputContract.factsInferencesUnknownsSeparated, "visit context keeps facts/inferences/unknowns separated");
check(context.outputContract.advisorContextOnly, "visit context is advisor-context only");
check(context.outputContract.writesConfirmedCrmFact === false, "visit context does not write confirmed CRM facts");
check(context.outputContract.triggersExternalNotification === false, "visit context does not trigger notification");
check(context.providerBoundary.providerCallAttempted === false, "visit context does not call provider");
check(context.providerBoundary.aiUsageLogWritten === false, "visit context does not fake AiUsageLog");
check(context.privacyProof.rawPrivateTranscriptReturned === false, "visit context does not return raw private transcript");

const situationQuestion = enriched.find((question) => question.type === "S");
const downstreamQuestions = enriched.filter((question) => question.type !== "S");
check(Boolean(situationQuestion), "situation question exists");
check(
  !situationQuestion?.reasoning?.evidence.some((item) => item.source === "theater_route_b_red_line"),
  "situation question does not foreground red-line context",
);
check(
  downstreamQuestions.every((question) =>
    question.reasoning?.evidence.some((item) => item.source === "theater_route_b_red_line"),
  ),
  "problem/implication/need-payoff questions consume red-line context",
);
check(
  downstreamQuestions.some((question) =>
    question.reasoning?.evidence.some((item) => item.status === "unknown" && item.detail.includes("需要佐證")),
  ),
  "visit package marks evidence-needed context as unknown",
);
check(
  downstreamQuestions.some((question) => question.reasoning?.confirmationPrompt?.includes("升級審閱")),
  "visit package adds escalation/evidence confirmation prompt",
);

const serialized = collectStringValues({ context, enriched }).join("\n");
check(!serialized.includes("qa-private@example.com"), "visit context does not leak email sentinel");
check(!/0912[-\s]?345[-\s]?678/.test(serialized), "visit context does not leak phone sentinel");
check(
  !/rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber/i.test(serialized),
  "visit context does not leak unsafe payload keys",
);

console.log(
  JSON.stringify(
    {
      status: "pass",
      checkedCount: checks.length,
      actionId: context.actionId,
      sourceActionId: context.sourceActionId,
      contextItemCount: context.summary.itemCount,
      escalateCount: context.summary.escalateCount,
      evidenceNeededCount: context.summary.evidenceNeededCount,
      consumedQuestionIds: downstreamQuestions.map((question) => question.id),
      providerCallAttempted: context.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: context.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: context.outputContract.writesConfirmedCrmFact,
      triggersExternalNotification: context.outputContract.triggersExternalNotification,
    },
    null,
    2,
  ),
);

function check(condition: boolean, label: string) {
  assert.equal(condition, true, label);
  checks.push(label);
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
  }

  return [];
}
