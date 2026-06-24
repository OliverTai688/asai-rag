import assert from "node:assert/strict";
import {
  buildTheaterRouteBFeedbackReview,
  isTheaterRouteBFeedbackReview,
} from "../src/domains/theater/route-b-feedback-review";
import { buildRouteBRedLineActionPersistenceState } from "../src/domains/theater/route-b-red-line-action-workflow";
import type { TheaterRouteBRelationshipEdgeShadowGroundingSummary } from "../src/domains/theater/route-b-handoff";
import type { RouteBSessionSnapshot } from "../src/domains/theater/route-b-session";

const checks: string[] = [];

const snapshot: RouteBSessionSnapshot = {
  session: {
    id: "route_b_session_feedback_review",
    routeBEnabled: true,
    routeBSceneId: "route_b_scene_feedback_review",
    routeBSourcePacketId: "route_b_packet_feedback_review",
    clientId: "client_feedback_review",
    spinSessionId: "spin_feedback_review",
    status: "ACTIVE",
    isDemo: false,
    createdAt: "2026-06-22T06:51:14.000Z",
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
        summary: "林先生與林太太是共同決策關係。",
        factStatus: "CONFIRMED",
        visibilityScope: "GROUP",
        sourceRefs: [{ id: "qa_rel", label: "QA fixture" }],
      },
    ],
    narratorQuestions: [
      {
        summary: "請確認林太太是否參與本次拜訪。",
        factStatus: "UNKNOWN",
      },
    ],
    sourceGrounding: {
      relationshipEdgeShadow: relationshipEdgeShadowGrounding(),
    },
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
        updatedAt: "2026-06-22T06:53:10.000Z",
      },
      {
        ruleId: "PREMIUM_ADVANCE",
        state: "NOT_APPLICABLE",
        advisorReasonCode: "FALSE_POSITIVE_CONTEXT",
        updatedAt: "2026-06-22T06:53:20.000Z",
      },
      {
        ruleId: "GUARANTEED_RETURN",
        state: "EVIDENCE_NEEDED",
        advisorReasonCode: "EVIDENCE_PENDING",
        updatedAt: "2026-06-22T06:53:30.000Z",
      },
    ]),
  },
  characters: [
    {
      id: "character_focus_lin",
      routeBCharacterId: "character_focus_lin",
      role: "FOCUS_CLIENT",
      displayName: "林先生",
      isFocus: true,
      publicBrief: "科技公司營運長，重視效率。",
      knownFacts: [{ summary: "林先生是科技公司營運長。", factStatus: "CONFIRMED" }],
      personaHints: [{ summary: "可能重視效率。", factStatus: "INFERENCE" }],
      unknowns: [{ summary: "尚未確認配偶是否參與決策。", factStatus: "UNKNOWN" }],
      exemplarLines: [],
      statePatchCount: 1,
    },
    {
      id: "character_spouse",
      routeBCharacterId: "character_spouse",
      role: "DECISION_MAKER",
      displayName: "林太太",
      isFocus: false,
      publicBrief: "共同決策者，可能關注現金流。",
      knownFacts: [{ summary: "林太太會一起討論家庭保障。", factStatus: "CONFIRMED" }],
      personaHints: [{ summary: "可能追問保費負擔。", factStatus: "INFERENCE" }],
      unknowns: [],
      exemplarLines: [],
      statePatchCount: 0,
    },
  ],
  turns: [
    {
      id: "turn_group_focus",
      role: "ADVISOR",
      speakerRouteBCharacterId: null,
      addresseeRouteBCharacterId: null,
      visibilityScope: "GROUP",
      content: "我們先釐清家庭保障的共同決策節奏。qa-private@example.com 0912-345-678",
      statePatchCount: 0,
      createdAt: "2026-06-22T06:52:00.000Z",
    },
    {
      id: "turn_private_spouse",
      role: "ADVISOR",
      speakerRouteBCharacterId: null,
      addresseeRouteBCharacterId: "character_spouse",
      visibilityScope: "PRIVATE",
      content: "私聊內容 rawPayload token policyNumber should not be returned.",
      statePatchCount: 1,
      createdAt: "2026-06-22T06:53:00.000Z",
    },
  ],
  visibilityProof: {
    ownerOnlyRead: true,
    scopedTurnColumnsPersisted: true,
    thirdPartyVisibleForDirectMessage: false,
  },
};

const review = buildTheaterRouteBFeedbackReview({
  snapshot,
  notApplicableRedLines: [
    {
      redLineId: "PREMIUM_ADVANCE",
      reason: "本輪沒有觀察到代墊保費要求。",
    },
  ],
  now: new Date("2026-06-22T06:54:00.000Z"),
});

check(isTheaterRouteBFeedbackReview(review), "feedback review passes runtime type guard");
check(review.agentId === "asai.theater.route_b", "feedback review is attached to Route B agent id");
check(review.actionId === "route-b-feedback-persistence", "feedback review uses persistence action id");
check(review.status === "DETERMINISTIC_NO_PROVIDER", "feedback review is deterministic no-provider");
check(review.selectedPerspectiveIds.length === 5, "feedback review defaults to five perspectives");
check(review.sections.length === 5, "feedback review emits five qualitative sections");
check(review.outputContract.qualitativeOnly, "feedback review is qualitative only");
check(!review.outputContract.totalScoreAllowed, "feedback review forbids total score");
check(!review.outputContract.rankingAllowed, "feedback review forbids ranking");
check(review.providerBoundary.providerCallAttempted === false, "feedback review does not call provider");
check(review.providerBoundary.aiUsageLogWritten === false, "feedback review does not fake AiUsageLog");
check(review.providerBoundary.storesRawProviderPayload === false, "feedback review forbids raw provider payload storage");
check(review.redLineActionState.consumedByFeedbackReview, "feedback review consumes persisted red-line action state");
check(review.redLineActionState.recordCount === 5, "feedback review action summary keeps all severe red-line records");
check(review.redLineActionState.escalateCount === 1, "feedback review action summary counts escalation actions");
check(review.redLineActionState.evidenceNeededCount === 1, "feedback review action summary counts evidence-needed actions");
check(review.redLineActionState.notApplicableCount === 1, "feedback review action summary counts not-applicable actions");
check(review.redLineActionState.noProviderCall, "feedback review action summary proves no provider call");
check(review.redLineActionState.triggersExternalNotification === false, "feedback review action summary does not trigger notifications");
check(review.redLineActionState.writesConfirmedCrmFact === false, "feedback review action summary does not write CRM facts");
check(review.relationshipEdgeShadowGrounding.usedInFeedbackReview, "feedback review consumes relationship edge shadow grounding");
check(review.relationshipEdgeShadowGrounding.candidateEdgeCount === 3, "feedback review carries edge shadow candidate count");
check(review.relationshipEdgeShadowGrounding.sourceMemberCount === 4, "feedback review carries edge shadow source member count");
check(
  review.relationshipEdgeShadowGrounding.boundary.rawDraftEdgesIncluded === false &&
    review.relationshipEdgeShadowGrounding.boundary.clientFacingDraftEdgesReturned === false &&
    review.relationshipEdgeShadowGrounding.boundary.formalSchemaApproved === false,
  "feedback review keeps edge shadow no-draft/formal-schema-blocked boundary",
);
check(
  review.relationshipEdgeShadowGrounding.boundary.databaseWriteAttempted === false &&
    review.relationshipEdgeShadowGrounding.boundary.writesRelationshipGraph === false &&
    review.relationshipEdgeShadowGrounding.boundary.writesConfirmedCrmFact === false,
  "feedback review keeps edge shadow no-db/no-graph/no-CRM-write boundary",
);
check(review.persistenceEnvelope.requiresAdvisorConfirmation, "feedback review requires advisor confirmation before CRM writeback");
check(review.persistenceEnvelope.writesConfirmedCrmFact === false, "feedback review does not write confirmed CRM facts");
check(review.persistenceEnvelope.storesPrivateLaneTurnContent === false, "feedback review does not store private lane turn content");
check(review.privacyProof.rawPrivateTranscriptReturned === false, "feedback review does not return raw private transcript");
check(review.privacyProof.personalContactReturned === false, "feedback review does not return personal contact fields");
check(review.privacyProof.policyNumberReturned === false, "feedback review does not return policy numbers");
check(
  review.redLineFindings.some((finding) => finding.redLineId === "PREMIUM_ADVANCE" && finding.status === "NOT_APPLICABLE"),
  "red-line review can mark not applicable without deleting audit posture",
);
check(
  review.redLineFindings.some((finding) => finding.redLineId === "SIGNATURE_SUBSTITUTION" && finding.status === "NEEDS_REVIEW"),
  "red-line review keeps unmarked severe signals in needs-review posture",
);
check(
  review.redLineFindings.some((finding) =>
    finding.redLineId === "SIGNATURE_SUBSTITUTION" &&
    finding.actionContext?.state === "ESCALATE" &&
    finding.actionContext.triggersExternalNotification === false
  ),
  "red-line review attaches persisted escalation context without notification",
);
check(
  review.redLineFindings.some((finding) =>
    finding.redLineId === "GUARANTEED_RETURN" &&
    finding.actionContext?.state === "EVIDENCE_NEEDED" &&
    finding.actionContext.writesConfirmedCrmFact === false
  ),
  "red-line review attaches persisted evidence-needed context without CRM fact write",
);
check(
  review.sections.some((section) =>
    section.perspectiveId === "COMPLIANCE_CONSCIENCE" &&
    section.evidenceBasis.some((item) => item.source === "red-line-actions" && item.label === "ACTION_STATE")
  ),
  "compliance perspective cites red-line action state evidence",
);
check(
  review.sections.some((section) =>
    section.evidenceBasis.some((item) => item.source === "relationship-edge-shadow" && item.label === "EDGE_SHADOW" && item.count === 3)
  ),
  "feedback review cites relationship edge shadow as review evidence",
);

const subsetReview = buildTheaterRouteBFeedbackReview({
  snapshot,
  selectedPerspectiveIds: ["CLIENT_EYES", "COMPLIANCE_CONSCIENCE"],
  now: new Date("2026-06-22T06:55:00.000Z"),
});
check(subsetReview.sections.length === 2, "feedback review supports selected perspective subset");
check(
  subsetReview.selectedPerspectiveIds.join("|") === "CLIENT_EYES|COMPLIANCE_CONSCIENCE",
  "feedback review preserves requested perspective order",
);

const serialized = collectStringValues([review, subsetReview]).join("\n");
check(!serialized.includes("qa-private@example.com"), "feedback review does not leak email sentinel");
check(!/0912[-\s]?345[-\s]?678/.test(serialized), "feedback review does not leak phone sentinel");
check(!/rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber/i.test(serialized), "feedback review does not leak unsafe payload keys");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      agentId: review.agentId,
      actionId: review.actionId,
      selectedPerspectiveCount: review.selectedPerspectiveIds.length,
      redLineCount: review.redLineFindings.length,
      redLineActionRecordCount: review.redLineActionState.recordCount,
      redLineEscalateCount: review.redLineActionState.escalateCount,
      redLineEvidenceNeededCount: review.redLineActionState.evidenceNeededCount,
      redLineNotApplicableCount: review.redLineActionState.notApplicableCount,
      edgeShadowCandidateCount: review.relationshipEdgeShadowGrounding.candidateEdgeCount,
      edgeShadowSourceMemberCount: review.relationshipEdgeShadowGrounding.sourceMemberCount,
      edgeShadowRawDraftEdgesIncluded: review.relationshipEdgeShadowGrounding.boundary.rawDraftEdgesIncluded,
      edgeShadowWritesRelationshipGraph: review.relationshipEdgeShadowGrounding.boundary.writesRelationshipGraph,
      providerCallAttempted: review.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: review.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: review.persistenceEnvelope.writesConfirmedCrmFact,
      triggersExternalNotification: review.redLineActionState.triggersExternalNotification,
    },
    null,
    2,
  ),
);

function relationshipEdgeShadowGrounding(): TheaterRouteBRelationshipEdgeShadowGroundingSummary {
  return {
    sourceMemberCount: 4,
    candidateEdgeCount: 3,
    edgeTypeCounts: {
      SPOUSE: 1,
      INFLUENCE: 1,
      UNKNOWN_RELATION: 1,
    },
    factStatusCounts: {
      FACT: 1,
      INFERENCE: 1,
      UNKNOWN: 1,
    },
    warningCodes: ["RELATIONSHIP_EDGE_SCHEMA_NOT_APPROVED"],
    unsupportedRelationCount: 1,
    boundary: {
      ownerScopedRelationshipGraphRequired: true,
      browserSuppliedSessionId: false,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      schemaChanged: false,
      databaseWriteAttempted: false,
      clientFacingDraftEdgesReturned: false,
      formalSchemaApproved: false,
      persistedToDatabase: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
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
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStringValues);
  }
  return [];
}
