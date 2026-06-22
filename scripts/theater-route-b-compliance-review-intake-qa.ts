import assert from "node:assert/strict";
import {
  buildRouteBComplianceReviewIntakeFromFeedbackReview,
  isRouteBComplianceReviewIntake,
} from "../src/domains/theater/route-b-compliance-review-intake";
import { buildTheaterRouteBFeedbackReview } from "../src/domains/theater/route-b-feedback-review";
import { buildRouteBRedLineActionPersistenceState } from "../src/domains/theater/route-b-red-line-action-workflow";
import type { RouteBSessionSnapshot } from "../src/domains/theater/route-b-session";

const checks: string[] = [];

const snapshot: RouteBSessionSnapshot = {
  session: {
    id: "route_b_session_compliance_review_intake",
    routeBEnabled: true,
    routeBSceneId: "route_b_scene_compliance_review_intake",
    routeBSourcePacketId: "route_b_packet_compliance_review_intake",
    clientId: "client_compliance_review_intake",
    spinSessionId: null,
    status: "ACTIVE",
    isDemo: false,
    createdAt: "2026-06-22T13:25:07.000Z",
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
        summary: "共同決策關係仍需確認。",
        factStatus: "UNKNOWN",
        visibilityScope: "GROUP",
      },
    ],
    narratorQuestions: [
      {
        summary: "請確認是否存在代簽風險。",
        factStatus: "UNKNOWN",
      },
    ],
    statePatchCount: 1,
    visibilityRules: [],
    redLineActionState: buildRouteBRedLineActionPersistenceState([
      {
        ruleId: "SIGNATURE_SUBSTITUTION",
        state: "ESCALATE",
        advisorReasonCode: "ESCALATION_REQUESTED",
        updatedAt: "2026-06-22T13:25:10.000Z",
      },
      {
        ruleId: "GUARANTEED_RETURN",
        state: "EVIDENCE_NEEDED",
        advisorReasonCode: "EVIDENCE_PENDING",
        updatedAt: "2026-06-22T13:25:20.000Z",
      },
      {
        ruleId: "PREMIUM_ADVANCE",
        state: "NOT_APPLICABLE",
        advisorReasonCode: "FALSE_POSITIVE_CONTEXT",
        updatedAt: "2026-06-22T13:25:30.000Z",
      },
    ]),
  },
  characters: [
    {
      id: "character_focus",
      routeBCharacterId: "character_focus",
      role: "FOCUS_CLIENT",
      displayName: "測試客戶",
      isFocus: true,
      publicBrief: "保險顧問演練測試角色。",
      knownFacts: [],
      personaHints: [],
      unknowns: [],
      exemplarLines: [],
      statePatchCount: 0,
    },
  ],
  turns: [
    {
      id: "turn_group",
      role: "ADVISOR",
      speakerRouteBCharacterId: null,
      addresseeRouteBCharacterId: null,
      visibilityScope: "GROUP",
      content: "qa-private@example.com 0912-345-678 rawProviderPayload policyNumber token",
      statePatchCount: 0,
      createdAt: "2026-06-22T13:25:40.000Z",
    },
  ],
  visibilityProof: {
    ownerOnlyRead: true,
    scopedTurnColumnsPersisted: true,
    thirdPartyVisibleForDirectMessage: false,
  },
};

const feedbackReview = buildTheaterRouteBFeedbackReview({
  snapshot,
  notApplicableRedLines: [
    {
      redLineId: "PREMIUM_ADVANCE",
      reason: "本輪沒有觀察到代墊保費要求。",
    },
  ],
  now: new Date("2026-06-22T13:26:00.000Z"),
});

const intake = buildRouteBComplianceReviewIntakeFromFeedbackReview({
  feedbackReview,
  now: new Date("2026-06-22T13:27:00.000Z"),
});

check(isRouteBComplianceReviewIntake(intake), "compliance-review intake passes runtime type guard");
check(intake.agentId === "asai.theater.route_b", "intake is attached to Route B agent id");
check(intake.actionId === "route-b-red-line-compliance-review-intake", "intake uses compliance-review action id");
check(intake.registryReadiness === "internal-only", "intake remains internal-only");
check(intake.status === "DETERMINISTIC_NO_PROVIDER", "intake is deterministic no-provider");
check(intake.sourceActionId === "route-b-red-line-action-feedback-consumption", "intake source action is feedback consumption");
check(intake.sourceSurface === "theater-route-b-feedback-review", "intake source surface is feedback review");
check(intake.candidateCount === 2, "intake only emits escalation/evidence-needed candidates");
check(
  intake.candidates.some((candidate) =>
    candidate.ruleId === "SIGNATURE_SUBSTITUTION" &&
    candidate.actionState === "ESCALATE" &&
    candidate.reviewStatus === "CANDIDATE_REVIEW_REQUIRED"
  ),
  "intake emits escalation as review candidate",
);
check(
  intake.candidates.some((candidate) =>
    candidate.ruleId === "GUARANTEED_RETURN" &&
    candidate.actionState === "EVIDENCE_NEEDED" &&
    candidate.reviewStatus === "NEEDS_EVIDENCE"
  ),
  "intake emits evidence-needed as evidence candidate",
);
check(
  !intake.candidates.some((candidate) => candidate.ruleId === "PREMIUM_ADVANCE"),
  "intake excludes not-applicable actions from candidate queue",
);
check(intake.reviewBoundary.createsFormalFinding === false, "intake does not create formal finding");
check(intake.reviewBoundary.triggersExternalNotification === false, "intake does not trigger notification");
check(intake.reviewBoundary.providerCallAttempted === false, "intake does not call provider");
check(intake.reviewBoundary.writesConfirmedCrmFact === false, "intake does not write confirmed CRM fact");
check(intake.providerBoundary.aiUsageLogWritten === false, "intake does not fake AiUsageLog");
check(intake.persistenceBoundary.persistsCandidateRecord === false, "intake does not persist candidate records");
check(intake.persistenceBoundary.rawPrivateTranscriptAllowed === false, "future persistence forbids private transcript");
check(intake.persistenceBoundary.directPrivateDialogAllowed === false, "future persistence forbids direct private dialog");
check(intake.persistenceBoundary.rawProviderPayloadAllowed === false, "future persistence forbids raw provider payload");
check(intake.privacyProof.personalContactReturned === false, "intake does not return personal contact");
check(intake.privacyProof.policyNumberReturned === false, "intake does not return policy number");
check(intake.privacyProof.paymentDataReturned === false, "intake does not return payment data");
check(
  intake.candidates.every((candidate) =>
    candidate.evidenceRefs.length === 3 &&
    candidate.proof.noFormalFinding &&
    candidate.proof.triggersExternalNotification === false &&
    candidate.proof.writesConfirmedCrmFact === false
  ),
  "all candidates carry evidence refs and safety proof",
);

const candidateKeys = Object.keys(intake.candidates[0] ?? {}).sort();
check(
  candidateKeys.join("|") ===
    [
      "actionState",
      "advisorReasonCode",
      "createdAt",
      "evidenceRefs",
      "id",
      "label",
      "proof",
      "reviewStatus",
      "ruleId",
      "safeSummary",
      "severity",
      "sourceActionId",
      "sourceFeedbackReviewId",
      "sourceSurface",
      "updatedAt",
    ].sort().join("|"),
  "candidate DTO stays on the allowlisted field set",
);

const serializedValues = collectStringValues(intake).join("\n");
check(!serializedValues.includes("qa-private@example.com"), "intake does not leak email sentinel");
check(!/0912[-\s]?345[-\s]?678/.test(serializedValues), "intake does not leak phone sentinel");
check(!/rawProviderPayload|policyNumber|token|cookie|secret|otp|payment/i.test(serializedValues), "intake does not leak unsafe payload values");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      agentId: intake.agentId,
      actionId: intake.actionId,
      candidateCount: intake.candidateCount,
      providerCallAttempted: intake.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: intake.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: intake.reviewBoundary.writesConfirmedCrmFact,
      triggersExternalNotification: intake.reviewBoundary.triggersExternalNotification,
      createsFormalFinding: intake.reviewBoundary.createsFormalFinding,
    },
    null,
    2,
  ),
);

function check(condition: boolean, label: string) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStringValues);
  }
  return [];
}
