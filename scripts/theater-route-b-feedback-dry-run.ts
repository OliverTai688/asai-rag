import assert from "node:assert/strict";
import {
  buildTheaterRouteBFeedbackContract,
  ROUTE_B_FEEDBACK_PERSPECTIVES,
  ROUTE_B_SEVERE_RED_LINES,
  type TheaterRouteBFeedbackPerspectiveId,
} from "../src/domains/theater/route-b-feedback";
import type {
  TheaterRouteBHandoffPacket,
  TheaterRouteBMaterial,
  TheaterRouteBTurnRef,
} from "../src/domains/theater/route-b-handoff";

const checks: Array<{ label: string; detail?: string }> = [];

const handoff: TheaterRouteBHandoffPacket = {
  id: "route_b_feedback_handoff",
  sourcePacketId: "route_b_feedback_packet",
  scene: {
    id: "route_b_feedback_scene",
    sourcePacketId: "route_b_feedback_packet",
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
        exemplarLines: [material("line_focus", "我想先知道這件事有沒有必要。", "INFERENCE", "PERSONA_HINT")],
      },
      {
        id: "character_spouse",
        displayName: "林太太",
        role: "DECISION_MAKER",
        isFocus: false,
        publicBrief: "共同決策者，可能關注現金流。",
        knownFacts: [material("fact_spouse", "林太太會一起討論家庭保障。", "CONFIRMED", "BACKGROUND_FACT")],
        personaHints: [{ label: "可能追問保費負擔", factStatus: "INFERENCE", evidenceIds: ["mem_cashflow"] }],
        unknowns: [],
        exemplarLines: [],
      },
      {
        id: "character_partner",
        displayName: "合夥人",
        role: "INFLUENCER",
        isFocus: false,
        publicBrief: "提醒公司責任風險的影響者。",
        knownFacts: [material("fact_partner", "合夥人曾提醒公司責任風險。", "CONFIRMED", "BACKGROUND_FACT")],
        personaHints: [],
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
    objections: [material("objection_busy", "太忙，想下次再談。", "INFERENCE", "PERSONA_HINT")],
    narratorQuestions: [material("narrator_spouse", "請確認林太太是否會參與本次拜訪。", "UNKNOWN", "NARRATOR_QUESTION")],
    visibilityRules: [
      {
        scope: "GROUP",
        label: "群聊",
        visibleTo: "EVERYONE",
        canBeQuotedInGroup: true,
        writesConfirmedCrmFact: false,
      },
      {
        scope: "PRIVATE",
        label: "私聊",
        visibleTo: "ADDRESSEE_ONLY",
        canBeQuotedInGroup: false,
        writesConfirmedCrmFact: false,
      },
    ],
    statePatches: [
      {
        id: "state_focus_anxiety",
        targetCharacterId: "character_focus_lin",
        summary: "林先生對長期保費承諾提高警覺。",
        factStatus: "INFERENCE",
        visibilityScope: "PRIVATE",
        requiresConfirmation: true,
        writesConfirmedCrmFact: false,
        allowedWriteTargets: ["SCENE_PRIVATE_STATE", "RELATIONSHIP_STATE"],
      },
    ],
  },
  aiUsagePlan: {
    noProviderDuringHandoffBuild: true,
    calls: [
      {
        kind: "DIRECTOR",
        purpose: "選擇下一位發言者與演出指令。",
        requiresAiUsageLog: true,
        logOn: "SUCCESS_AND_PROVIDER_ERROR",
        storesRawProviderPayload: false,
      },
      {
        kind: "CHARACTER",
        purpose: "產生指定角色的回覆。",
        requiresAiUsageLog: true,
        logOn: "SUCCESS_AND_PROVIDER_ERROR",
        storesRawProviderPayload: false,
      },
      {
        kind: "FEEDBACK",
        purpose: "產生五視角質化回饋。",
        requiresAiUsageLog: true,
        logOn: "SUCCESS_AND_PROVIDER_ERROR",
        storesRawProviderPayload: false,
      },
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
    migrationBoundary: "feedback contract proof",
  },
};

const history: TheaterRouteBTurnRef[] = [
  {
    id: "turn_private_spouse",
    speakerCharacterId: "character_partner",
    addresseeCharacterId: "character_spouse",
    visibilityScope: "PRIVATE",
    content: "只給林太太的私聊內容。",
  },
  {
    id: "turn_group_focus",
    speakerCharacterId: "character_focus_lin",
    visibilityScope: "GROUP",
    content: "我想先知道這件事有沒有必要。qa-private@example.com 0912-345-678 should not leak.",
  },
  {
    id: "turn_director",
    visibilityScope: "DIRECTOR_ONLY",
    content: "rawPayload token should not leak.",
  },
];

const allPerspectiveContract = buildTheaterRouteBFeedbackContract({ handoff, history });

check(allPerspectiveContract.agentId === "asai.theater.route_b", "feedback contract is attached to Route B agent id");
check(allPerspectiveContract.registryReadiness === "internal-only", "feedback contract remains internal-only");
check(
  allPerspectiveContract.selectedPerspectives.length === ROUTE_B_FEEDBACK_PERSPECTIVES.length,
  "feedback defaults to all five perspectives",
);
check(
  allPerspectiveContract.selectedPerspectives.map((perspective) => perspective.label).join("|") ===
    "教練的耳朵|客戶的眼睛|沉默裡的需求|守門的良心|決策的橋",
  "feedback preserves five-view labels in accepted order",
);
check(allPerspectiveContract.outputContract.qualitativeOnly, "feedback output is qualitative only");
check(!allPerspectiveContract.outputContract.totalScoreAllowed, "feedback output forbids total score");
check(!allPerspectiveContract.outputContract.rankingAllowed, "feedback output forbids ranking");
check(
  allPerspectiveContract.outputContract.sections.every((section) => section.requiredFields.includes("evidenceBasis")),
  "each perspective requires evidence basis",
);
check(
  allPerspectiveContract.redLineReview.severeSignals.length === ROUTE_B_SEVERE_RED_LINES.length,
  "red-line review includes all severe signals",
);
check(
  allPerspectiveContract.redLineReview.severeSignals.some((signal) => signal.label === "未做 KYC 即推商品"),
  "red-line review covers product-before-KYC signal",
);
check(allPerspectiveContract.redLineReview.canMarkNotApplicable, "red-line review can mark not applicable");
check(!allPerspectiveContract.redLineReview.legalAdviceIncluded, "feedback contract does not claim legal advice");
check(
  allPerspectiveContract.providerBoundary.providerCallAttempted === false &&
    allPerspectiveContract.providerBoundary.aiUsageLogWritten === false,
  "feedback contract does not call provider or fake AiUsageLog",
);
check(
  allPerspectiveContract.providerBoundary.successErrorAiUsageLogRequiredBeforeProviderEnablement,
  "feedback contract keeps success/error AiUsageLog as provider gate",
);
check(
  allPerspectiveContract.persistenceEnvelope.writesConfirmedCrmFact === false &&
    allPerspectiveContract.persistenceEnvelope.requiresAdvisorConfirmation,
  "feedback persistence envelope cannot write confirmed CRM facts without advisor confirmation",
);
check(
  allPerspectiveContract.inputPreview.historyVisibilitySummary.PRIVATE === 1 &&
    allPerspectiveContract.inputPreview.historyVisibilitySummary.DIRECTOR_ONLY === 1,
  "feedback input preview summarizes visibility instead of exposing turn text",
);

const subsetIds: TheaterRouteBFeedbackPerspectiveId[] = ["CLIENT_EYES", "COMPLIANCE_CONSCIENCE"];
const subsetContract = buildTheaterRouteBFeedbackContract({ handoff, history, selectedPerspectiveIds: subsetIds });

check(subsetContract.selectedPerspectives.length === subsetIds.length, "feedback supports selected perspective subset");
check(
  subsetContract.selectedPerspectives.every((perspective) => subsetIds.includes(perspective.id)),
  "feedback selected subset keeps requested perspective ids",
);

const serialized = collectStringValues([allPerspectiveContract, subsetContract]).join("\n");
check(!serialized.includes("@") && !/09\d{2}/.test(serialized), "feedback output contains no email/phone sentinel");
check(
  !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp"].some((sentinel) =>
    serialized.toLowerCase().includes(sentinel.toLowerCase()),
  ),
  "feedback output contains no provider/private sentinel",
);

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

console.log(
  JSON.stringify(
    {
      perspectiveLabels: allPerspectiveContract.selectedPerspectives.map((perspective) => perspective.label),
      severeRedLineLabels: allPerspectiveContract.redLineReview.severeSignals.map((signal) => signal.label),
      totalScoreAllowed: allPerspectiveContract.outputContract.totalScoreAllowed,
      rankingAllowed: allPerspectiveContract.outputContract.rankingAllowed,
      providerCallAttempted: allPerspectiveContract.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: allPerspectiveContract.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: allPerspectiveContract.persistenceEnvelope.writesConfirmedCrmFact,
      subsetPerspectiveIds: subsetContract.selectedPerspectives.map((perspective) => perspective.id),
    },
    null,
    2,
  ),
);

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

function check(condition: boolean, label: string, detail?: string) {
  assert.ok(condition, label);
  checks.push({ label, detail });
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
}
