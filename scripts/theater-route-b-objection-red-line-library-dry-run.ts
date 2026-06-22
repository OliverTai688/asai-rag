import assert from "node:assert/strict";
import {
  buildRouteBObjectionRedLineLibrarySummary,
  buildRouteBRedLineReviewPlan,
  buildTheaterRouteBFeedbackContract,
  getRouteBObjectionLibrary,
  getRouteBRedLineLibrary,
  ROUTE_B_SEVERE_RED_LINES,
  selectRouteBObjectionPrompts,
} from "../src/domains/theater/route-b-feedback";
import { buildTheaterRouteBFeedbackReview } from "../src/domains/theater/route-b-feedback-review";
import type { TheaterRouteBHandoffPacket, TheaterRouteBMaterial, TheaterRouteBTurnRef } from "../src/domains/theater/route-b-handoff";
import type { RouteBSessionSnapshot } from "../src/domains/theater/route-b-session";

const checks: string[] = [];

function runQa() {
const objectionLibrary = getRouteBObjectionLibrary();
const redLineLibrary = getRouteBRedLineLibrary();
const summary = buildRouteBObjectionRedLineLibrarySummary();

check(objectionLibrary.length === 12, "Route B objection library contains 12 categories");
check(redLineLibrary.length === 18, "Route B red-line library contains 18 rules");
check(ROUTE_B_SEVERE_RED_LINES.length === 5, "Route B severe red-line subset contains accepted five immediate signals");
check(summary.severeRedLineCount === 5, "library summary keeps five severe red lines");
check(summary.standardRedLineCount === 13, "library summary keeps thirteen post-review red lines");
check(summary.immediateDetectionIds.length === 5, "severe red lines use immediate detection mode");
check(summary.postReviewDetectionIds.length === 13, "standard red lines use post-review detection mode");
check(summary.providerBoundary.providerCallAttempted === false, "library summary does not attempt provider calls");
check(summary.providerBoundary.aiUsageLogWritten === false, "library summary does not fake AiUsageLog");
check(summary.auditBoundary.canMarkNotApplicable, "library summary allows not-applicable review");
check(summary.auditBoundary.keepsAuditRecordWhenNotApplicable, "not-applicable review keeps audit posture");
check(summary.auditBoundary.legalAdviceIncluded === false, "library summary does not include legal advice");
check(summary.auditBoundary.writesConfirmedCrmFact === false, "library summary does not write CRM facts");

const spousePrompts = selectRouteBObjectionPrompts({
  role: "DECISION_MAKER",
  personaHints: ["共同決策者可能追問保費負擔與現金流。"],
  unknowns: ["尚未確認是否需要其他家人共同討論。"],
  maxItems: 3,
});
check(spousePrompts.length === 3, "objection selector respects maxItems");
check(spousePrompts.some((prompt) => prompt.id === "PREMIUM_BURDEN"), "objection selector naturally surfaces premium burden");
check(spousePrompts.some((prompt) => prompt.id === "FAMILY_ALIGNMENT"), "objection selector naturally surfaces family alignment");
check(spousePrompts.every((prompt) => prompt.factBoundary === "roleplay-inference-not-confirmed-fact"), "objections remain roleplay inference, not CRM fact");

const redLinePlan = buildRouteBRedLineReviewPlan([
  {
    redLineId: "PRIVATE_DATA_OVEREXPOSURE",
    reason: "本輪沒有把私聊內容公開給群聊。rawPayload token should be removed.",
  },
]);
check(redLinePlan.length === 18, "red-line review plan covers all 18 rules");
check(
  redLinePlan.some((finding) => finding.redLineId === "PRIVATE_DATA_OVEREXPOSURE" && finding.status === "NOT_APPLICABLE"),
  "standard red line can be marked not applicable while staying in audit review",
);
check(
  redLinePlan.some((finding) => finding.redLineId === "SIGNATURE_SUBSTITUTION" && finding.detectionMode === "IMMEDIATE"),
  "accepted severe red lines keep immediate detection mode",
);
check(
  redLinePlan.some((finding) => finding.redLineId === "MISLEADING_TAX_OR_LEGAL_ADVICE" && finding.detectionMode === "POST_REVIEW"),
  "standard legal/tax red lines stay post-review and do not claim legal advice",
);

const contract = buildTheaterRouteBFeedbackContract({
  handoff,
  history,
});
check(contract.redLineReview.librarySummary.redLineRuleCount === 18, "feedback contract exposes full red-line library summary");
check(contract.redLineReview.severeSignals.length === 5, "feedback contract keeps severe immediate subset");
check(contract.redLineReview.librarySummary.providerBoundary.providerCallAttempted === false, "feedback contract library summary remains no-provider");

const review = buildTheaterRouteBFeedbackReview({
  snapshot,
  notApplicableRedLines: [{ redLineId: "PRIVATE_DATA_OVEREXPOSURE", reason: "本輪沒有公開私聊內容。" }],
  now: new Date("2026-06-22T07:12:13.000Z"),
});
check(review.redLineLibrary.redLineRuleCount === 18, "feedback review records source library rule count");
check(review.redLineFindings.length === 18, "feedback review emits 18 red-line findings");
check(review.redLineFindings.filter((finding) => finding.severity === "SEVERE").length === 5, "feedback review keeps five severe findings");
check(review.redLineFindings.filter((finding) => finding.severity === "STANDARD").length === 13, "feedback review keeps thirteen standard findings");
check(
  review.redLineFindings.some((finding) => finding.redLineId === "PRIVATE_DATA_OVEREXPOSURE" && finding.status === "NOT_APPLICABLE"),
  "feedback review accepts not-applicable standard red line",
);
check(review.providerBoundary.providerCallAttempted === false, "feedback review remains deterministic no-provider");
check(review.providerBoundary.aiUsageLogWritten === false, "feedback review does not fake AiUsageLog");
check(review.persistenceEnvelope.writesConfirmedCrmFact === false, "feedback review does not write confirmed CRM facts");

const serialized = collectStringValues([summary, spousePrompts, redLinePlan, contract, review]).join("\n");
check(!serialized.includes("qa-private@example.com"), "library proof does not leak email sentinel");
check(!/0912[-\s]?345[-\s]?678/.test(serialized), "library proof does not leak phone sentinel");
check(!/rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber/i.test(serialized), "library proof does not leak raw provider/private sentinel");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      objectionPromptCount: summary.objectionPromptCount,
      redLineRuleCount: summary.redLineRuleCount,
      severeRedLineCount: summary.severeRedLineCount,
      standardRedLineCount: summary.standardRedLineCount,
      selectedObjectionIds: spousePrompts.map((prompt) => prompt.id),
      providerCallAttempted: summary.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: summary.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: summary.auditBoundary.writesConfirmedCrmFact,
    },
    null,
    2,
  ),
);
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

function material(
  id: string,
  text: string,
  factStatus: TheaterRouteBMaterial["factStatus"],
  use: TheaterRouteBMaterial["use"],
): TheaterRouteBMaterial {
  return {
    id,
    text,
    factStatus,
    use,
    sourceRefs: [{ id: `${id}_source`, label: "QA fixture", factStatus }],
  };
}

const handoff: TheaterRouteBHandoffPacket = {
  id: "route_b_objection_red_line_handoff",
  sourcePacketId: "route_b_objection_red_line_packet",
  scene: {
    id: "route_b_objection_red_line_scene",
    sourcePacketId: "route_b_objection_red_line_packet",
    title: "林先生的家庭保障劇場",
    scenario: "釐清林先生與配偶對家庭保障的共同決策。",
    readiness: "READY",
    characters: [
      {
        id: "character_focus_lin",
        displayName: "林先生",
        role: "FOCUS_CLIENT",
        isFocus: true,
        publicBrief: "科技公司營運長，重視效率。",
        knownFacts: [material("fact_focus_job", "林先生是科技公司營運長。", "CONFIRMED", "BACKGROUND_FACT")],
        personaHints: [{ label: "可能重視效率", factStatus: "INFERENCE", evidenceIds: ["mem_efficiency"] }],
        unknowns: [material("unknown_spouse", "尚未確認配偶是否參與決策。", "UNKNOWN", "NARRATOR_QUESTION")],
        exemplarLines: [],
      },
      {
        id: "character_spouse",
        displayName: "林太太",
        role: "DECISION_MAKER",
        isFocus: false,
        publicBrief: "共同決策者，可能關注現金流。",
        knownFacts: [material("fact_spouse", "林太太會一起討論家庭保障。", "CONFIRMED", "BACKGROUND_FACT")],
        personaHints: [{ label: "可能追問保費負擔。", factStatus: "INFERENCE", evidenceIds: ["mem_cashflow"] }],
        unknowns: [],
        exemplarLines: [],
      },
    ],
    relationships: [
      {
        id: "relation_spouse",
        summary: "林先生與林太太是共同決策關係。",
        factStatus: "CONFIRMED",
        visibilityScope: "GROUP",
        sourceRefs: [{ id: "rel_source", label: "QA fixture", factStatus: "CONFIRMED" }],
      },
    ],
    objections: [material("objection_cashflow", "每個月多一筆保費會不會太重？", "INFERENCE", "PERSONA_HINT")],
    narratorQuestions: [material("narrator_spouse", "請確認林太太是否會參與本次拜訪。", "UNKNOWN", "NARRATOR_QUESTION")],
    visibilityRules: [
      { scope: "GROUP", label: "群聊", visibleTo: "EVERYONE", canBeQuotedInGroup: true, writesConfirmedCrmFact: false },
      { scope: "PRIVATE", label: "私聊", visibleTo: "ADDRESSEE_ONLY", canBeQuotedInGroup: false, writesConfirmedCrmFact: false },
    ],
    statePatches: [],
  },
  aiUsagePlan: {
    noProviderDuringHandoffBuild: true,
    calls: [
      { kind: "DIRECTOR", purpose: "選擇下一位發言者與演出指令。", requiresAiUsageLog: true, logOn: "SUCCESS_AND_PROVIDER_ERROR", storesRawProviderPayload: false },
      { kind: "CHARACTER", purpose: "產生指定角色的回覆。", requiresAiUsageLog: true, logOn: "SUCCESS_AND_PROVIDER_ERROR", storesRawProviderPayload: false },
      { kind: "FEEDBACK", purpose: "產生五視角質化回饋。", requiresAiUsageLog: true, logOn: "SUCCESS_AND_PROVIDER_ERROR", storesRawProviderPayload: false },
    ],
  },
  runtimeActivation: {
    routeBEnabled: true,
    canStartProductionSession: true,
    rollbackNote: "Provider disabled 時只停在 guarded-disabled，不宣稱 production multi-character theater。",
  },
  compatibility: {
    legacyPersonaTypeStrategy: "compatibility-only",
    legacyTensionStrategy: "statePatches only",
    legacyScoreStrategy: "qualitative feedback only",
    migrationBoundary: "objection-red-line source library proof",
  },
};

const history: TheaterRouteBTurnRef[] = [
  {
    id: "turn_group_focus",
    speakerCharacterId: "character_focus_lin",
    visibilityScope: "GROUP",
    content: "我擔心現金流和家庭共識。qa-private@example.com 0912-345-678",
  },
];

const snapshot: RouteBSessionSnapshot = {
  session: {
    id: "route_b_session_objection_red_line",
    routeBEnabled: true,
    routeBSceneId: "route_b_objection_red_line_scene",
    routeBSourcePacketId: "route_b_objection_red_line_packet",
    clientId: "client_objection_red_line",
    spinSessionId: null,
    status: "ACTIVE",
    isDemo: false,
    createdAt: "2026-06-22T07:12:13.000Z",
    provider: {
      callsEnabled: false,
      callAttempted: false,
      usageLogWritten: false,
      usageLogRequiredFor: ["DIRECTOR", "CHARACTER", "FEEDBACK"],
      storesProviderBody: false,
    },
  },
  scene: {
    relationships: handoff.scene.relationships.map(({ summary, factStatus, visibilityScope, sourceRefs }) => ({
      summary,
      factStatus,
      visibilityScope,
      sourceRefs,
    })),
    narratorQuestions: handoff.scene.narratorQuestions.map(({ text, factStatus }) => ({ summary: text, factStatus })),
    statePatchCount: 0,
    visibilityRules: [{ label: "私聊", visibleTo: "ADDRESSEE_ONLY", canBeQuotedInGroup: false }],
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
      createdAt: "2026-06-22T07:13:00.000Z",
    },
  ],
  visibilityProof: {
    ownerOnlyRead: true,
    scopedTurnColumnsPersisted: true,
    thirdPartyVisibleForDirectMessage: false,
  },
};

runQa();
