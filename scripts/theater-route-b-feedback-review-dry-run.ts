import assert from "node:assert/strict";
import {
  buildTheaterRouteBFeedbackReview,
  isTheaterRouteBFeedbackReview,
} from "../src/domains/theater/route-b-feedback-review";
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
    statePatchCount: 1,
    visibilityRules: [
      {
        label: "私聊",
        visibleTo: "ADDRESSEE_ONLY",
        canBeQuotedInGroup: false,
      },
    ],
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
      providerCallAttempted: review.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: review.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: review.persistenceEnvelope.writesConfirmedCrmFact,
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
