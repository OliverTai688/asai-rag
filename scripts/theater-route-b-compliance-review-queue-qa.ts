import assert from "node:assert/strict";
import {
  buildRouteBComplianceReviewIntakeFromFeedbackReview,
} from "../src/domains/theater/route-b-compliance-review-intake";
import {
  buildRouteBComplianceReviewQueue,
  isRouteBComplianceReviewQueue,
} from "../src/domains/theater/route-b-compliance-review-queue";
import { buildTheaterRouteBFeedbackReview } from "../src/domains/theater/route-b-feedback-review";
import {
  buildRouteBRedLineActionPersistenceState,
  type RouteBRedLineActionRecord,
} from "../src/domains/theater/route-b-red-line-action-workflow";
import type { RouteBSessionSnapshot } from "../src/domains/theater/route-b-session";

const checks: string[] = [];

const escalationReview = buildTheaterRouteBFeedbackReview({
  snapshot: buildSnapshot("route_b_session_queue_escalation", [
    {
      ruleId: "SIGNATURE_SUBSTITUTION",
      state: "ESCALATE",
      advisorReasonCode: "ESCALATION_REQUESTED",
      updatedAt: "2026-06-22T13:46:11.000Z",
    },
    {
      ruleId: "GUARANTEED_RETURN",
      state: "EVIDENCE_NEEDED",
      advisorReasonCode: "EVIDENCE_PENDING",
      updatedAt: "2026-06-22T13:46:12.000Z",
    },
  ]),
  now: new Date("2026-06-22T13:46:20.000Z"),
});
const watchingReview = buildTheaterRouteBFeedbackReview({
  snapshot: buildSnapshot("route_b_session_queue_watch", [
    {
      ruleId: "PREMIUM_ADVANCE",
      state: "WATCHING",
      advisorReasonCode: "ADVISOR_REVIEWED",
      updatedAt: "2026-06-22T13:46:13.000Z",
    },
    {
      ruleId: "FALSE_MEDICAL_DISCLOSURE",
      state: "NOT_APPLICABLE",
      advisorReasonCode: "FALSE_POSITIVE_CONTEXT",
      updatedAt: "2026-06-22T13:46:14.000Z",
    },
  ]),
  now: new Date("2026-06-22T13:46:21.000Z"),
});

const escalationIntake = buildRouteBComplianceReviewIntakeFromFeedbackReview({
  feedbackReview: escalationReview,
  now: new Date("2026-06-22T13:46:30.000Z"),
});
const watchingIntake = buildRouteBComplianceReviewIntakeFromFeedbackReview({
  feedbackReview: watchingReview,
  now: new Date("2026-06-22T13:46:31.000Z"),
});
const queue = buildRouteBComplianceReviewQueue({
  intakes: [
    {
      session: {
        sessionId: escalationReview.sessionId,
        routeBSceneId: "route_b_scene_queue_escalation",
        routeBSourcePacketId: "route_b_packet_queue_escalation",
        clientId: "client_queue_escalation",
        createdAt: "2026-06-22T13:45:00.000Z",
        updatedAt: "2026-06-22T13:46:40.000Z",
      },
      intake: escalationIntake,
    },
    {
      session: {
        sessionId: watchingReview.sessionId,
        routeBSceneId: "route_b_scene_queue_watch",
        routeBSourcePacketId: "route_b_packet_queue_watch",
        clientId: "client_queue_watch",
        createdAt: "2026-06-22T13:45:10.000Z",
        updatedAt: "2026-06-22T13:46:41.000Z",
      },
      intake: watchingIntake,
    },
  ],
  now: new Date("2026-06-22T13:47:00.000Z"),
});

check(isRouteBComplianceReviewQueue(queue), "compliance-review queue passes runtime type guard");
check(queue.agentId === "asai.theater.route_b", "queue is attached to Route B agent id");
check(queue.actionId === "route-b-red-line-compliance-review-queue", "queue uses compliance-review queue action id");
check(queue.sourceActionId === "route-b-red-line-compliance-review-intake", "queue source action is intake");
check(queue.registryReadiness === "internal-only", "queue remains internal-only");
check(queue.status === "DETERMINISTIC_NO_PROVIDER", "queue is deterministic no-provider");
check(queue.itemCount === 1, "queue excludes sessions without review candidates");
check(queue.candidateCount === 2, "queue totals candidate count");
check(queue.needsEvidenceCount === 1, "queue totals evidence-needed count");
check(queue.escalationCount === 1, "queue totals escalation count");
check(queue.items[0]?.sessionId === escalationReview.sessionId, "queue keeps the actionable session first");
check(queue.items[0]?.topSeverity === "SEVERE", "queue records top severity");
check(queue.reviewBoundary.disabledQueueOnly === true, "queue is disabled-only");
check(queue.reviewBoundary.createsFormalFinding === false, "queue does not create formal finding");
check(queue.reviewBoundary.triggersExternalNotification === false, "queue does not trigger notification");
check(queue.reviewBoundary.providerCallAttempted === false, "queue does not call provider");
check(queue.reviewBoundary.writesConfirmedCrmFact === false, "queue does not write confirmed CRM fact");
check(queue.providerBoundary.aiUsageLogWritten === false, "queue does not fake AiUsageLog");
check(queue.persistenceBoundary.persistsQueueRecord === false, "queue does not persist queue records");
check(queue.persistenceBoundary.persistsCandidateRecord === false, "queue does not persist candidate records");
check(queue.persistenceBoundary.rawPrivateTranscriptAllowed === false, "queue forbids private transcript persistence");
check(queue.persistenceBoundary.rawProviderPayloadAllowed === false, "queue forbids raw provider payload persistence");
check(queue.privacyProof.personalContactReturned === false, "queue does not return personal contact");
check(queue.privacyProof.policyNumberReturned === false, "queue does not return policy number");
check(queue.privacyProof.paymentDataReturned === false, "queue does not return payment data");

const serializedValues = collectStringValues(queue).join("\n");
check(!serializedValues.includes("queue-private@example.com"), "queue does not leak email sentinel");
check(!/0912[-\s]?345[-\s]?678/.test(serializedValues), "queue does not leak phone sentinel");
check(!/rawProviderPayload|policyNumber|token|cookie|secret|otp|payment/i.test(serializedValues), "queue does not leak unsafe payload values");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      agentId: queue.agentId,
      actionId: queue.actionId,
      itemCount: queue.itemCount,
      candidateCount: queue.candidateCount,
      providerCallAttempted: queue.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: queue.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: queue.reviewBoundary.writesConfirmedCrmFact,
      triggersExternalNotification: queue.reviewBoundary.triggersExternalNotification,
      createsFormalFinding: queue.reviewBoundary.createsFormalFinding,
    },
    null,
    2,
  ),
);

function buildSnapshot(sessionId: string, records: RouteBRedLineActionRecord[]): RouteBSessionSnapshot {
  return {
    session: {
      id: sessionId,
      routeBEnabled: true,
      routeBSceneId: `route_b_scene_${sessionId}`,
      routeBSourcePacketId: `route_b_packet_${sessionId}`,
      clientId: `client_${sessionId}`,
      spinSessionId: null,
      status: "ACTIVE",
      isDemo: false,
      createdAt: "2026-06-22T13:45:00.000Z",
      provider: {
        callsEnabled: false,
        callAttempted: false,
        usageLogWritten: false,
        usageLogRequiredFor: ["DIRECTOR", "CHARACTER", "FEEDBACK"],
        storesProviderBody: false,
      },
    },
    scene: {
      relationships: [],
      narratorQuestions: [],
      statePatchCount: 0,
      visibilityRules: [],
      redLineActionState: buildRouteBRedLineActionPersistenceState(records),
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
        content: "queue-private@example.com 0912-345-678 rawProviderPayload policyNumber token",
        statePatchCount: 0,
        createdAt: "2026-06-22T13:45:30.000Z",
      },
    ],
    visibilityProof: {
      ownerOnlyRead: true,
      scopedTurnColumnsPersisted: true,
      thirdPartyVisibleForDirectMessage: false,
    },
  };
}

function check(condition: boolean, label: string) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectStringValues(item));

  return Object.values(value).flatMap((item) => collectStringValues(item));
}
