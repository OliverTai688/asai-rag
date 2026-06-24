import assert from "node:assert/strict";
import type { Client } from "../src/domains/client/types";
import { buildTheaterRouteBFeedbackReview } from "../src/domains/theater/route-b-feedback-review";
import type { RouteBSessionSnapshot } from "../src/domains/theater/route-b-session";
import { buildVisitRouteBFeedbackAdvisorContextFromFeedbackReview } from "../src/domains/visit/route-b-feedback-advisor-context";
import { enrichSpinQuestionsWithReasoning } from "../src/domains/visit/reasoning";
import type { SpinQuestion } from "../src/domains/visit/types";

const checks: string[] = [];

const snapshot: RouteBSessionSnapshot = {
  session: {
    id: "route_b_session_feedback_profile_context",
    routeBEnabled: true,
    routeBSceneId: "route_b_scene_feedback_profile_context",
    routeBSourcePacketId: "route_b_packet_feedback_profile_context",
    clientId: "client_feedback_profile_context",
    spinSessionId: "spin_feedback_profile_context",
    status: "ACTIVE",
    isDemo: false,
    createdAt: "2026-06-24T14:27:51.000Z",
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
        sourceRefs: [{ id: "feedback_profile_rel", label: "QA fixture" }],
      },
    ],
    narratorQuestions: [{ summary: "請確認女兒教育金是否仍是優先順位。", factStatus: "UNKNOWN" }],
    statePatchCount: 0,
    visibilityRules: [],
    sourceGrounding: {
      familyProfiles: {
        memberCount: 3,
        fieldCount: 4,
        knownFieldCount: 3,
        unknownFieldCount: 1,
        sourceReferenceCount: 4,
        byFactStatus: {
          FACT: 1,
          INFERENCE: 2,
          UNKNOWN: 1,
        },
        fields: [
          {
            stageFieldId: "profile-field-1",
            field: "occupationTitle",
            label: "職位/職業",
            person: "陳先生",
            relation: "本人",
            value: "科技公司營運主管 qa-private@example.com",
            factStatus: "FACT",
            sourceReferenceCount: 1,
          },
          {
            stageFieldId: "profile-field-2",
            field: "financialRole",
            label: "財務角色",
            person: "陳太太",
            relation: "配偶",
            value: "可能是共同決策與家庭現金流提醒者 0912-345-678",
            factStatus: "INFERENCE",
            sourceReferenceCount: 1,
          },
          {
            stageFieldId: "profile-field-3",
            field: "relationshipContext",
            label: "關係脈絡",
            person: "女兒",
            relation: "子女",
            value: "教育金需求是否仍優先未知；rawPayload policyNumber should be removed",
            factStatus: "UNKNOWN",
            sourceReferenceCount: 1,
          },
          {
            stageFieldId: "profile-field-4",
            field: "personStatus",
            label: "人物狀態",
            person: "父親",
            relation: "長輩",
            value: "可能需要醫療資源支持，但仍待客戶確認",
            factStatus: "INFERENCE",
            sourceReferenceCount: 1,
          },
        ],
        boundary: {
          ownerScopedRelationshipGraphRequired: true,
          browserSuppliedSessionId: false,
          browserSuppliedPersonId: false,
          providerCallAttempted: false,
          aiUsageLogWritten: false,
          storesRawProviderPayload: false,
          rawPrivateTranscriptIncluded: false,
          rawMetadataIncluded: false,
          sourceReferenceIdsIncluded: false,
          databaseWriteAttempted: false,
          writesRelationshipGraph: false,
          writesVisitPlan: false,
          writesConfirmedCrmFact: false,
        },
      },
    },
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
      unknowns: [{ summary: "尚未確認女兒教育金優先順位。", factStatus: "UNKNOWN" }],
      exemplarLines: [],
      statePatchCount: 0,
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
      createdAt: "2026-06-24T14:28:00.000Z",
    },
  ],
  visibilityProof: {
    ownerOnlyRead: true,
    scopedTurnColumnsPersisted: true,
    thirdPartyVisibleForDirectMessage: false,
  },
};

const client: Client = {
  id: "client_visit_route_b_feedback_profile_context",
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
  lastInteraction: "2026-06-24T00:00:00.000Z",
};

const questions: SpinQuestion[] = [
  { id: "s1", type: "S", question: "目前家庭決策會由誰一起參與？" },
  { id: "p1", type: "P", question: "既有保障中哪一塊最需要先確認？" },
  { id: "i1", type: "I", question: "如果這個缺口沒有處理，會影響哪個家庭安排？" },
  { id: "n1", type: "N", question: "下一步你希望先補哪些佐證再決定？" },
];

const review = buildTheaterRouteBFeedbackReview({
  snapshot,
  now: new Date("2026-06-24T14:29:00.000Z"),
});
const context = buildVisitRouteBFeedbackAdvisorContextFromFeedbackReview(review);
const enriched = enrichSpinQuestionsWithReasoning(questions, {
  client,
  purpose: "ADD_ON",
  routeBFeedbackAdvisorContext: context,
});

check(context.agentId === "asai.visit.preparation_package", "feedback advisor context is attached to visit prep agent");
check(context.actionId === "route-b-feedback-family-profile-advisor-context", "context declares downstream action id");
check(context.sourceActionId === "route-b-feedback-persistence", "context consumes Route B feedback persistence");
check(context.registryReadiness === "internal-only", "context remains internal-only");
check(context.summary.itemCount === 4, "context maps all safe profile fields");
check(context.summary.confirmedCount === 1, "context counts confirmed profile fields");
check(context.summary.inferenceCount === 2, "context counts inference profile fields");
check(context.summary.unknownCount === 1, "context counts unknown profile fields");
check(context.summary.profiledMemberCount === 3, "context preserves safe member count");
check(context.summary.fieldCount === 4, "context preserves safe field count");
check(context.outputContract.factsInferencesUnknownsSeparated, "context keeps facts/inferences/unknowns separated");
check(context.outputContract.requiresAdvisorConfirmation, "context requires advisor confirmation");
check(context.outputContract.writesRelationshipGraph === false, "context does not write relationship graph");
check(context.outputContract.writesVisitPlan === false, "context does not write VisitPlan");
check(context.outputContract.writesClientProfile === false, "context does not write client profile");
check(context.outputContract.writesPolicy === false, "context does not write policy");
check(context.outputContract.writesConfirmedCrmFact === false, "context does not write confirmed CRM fact");
check(context.providerBoundary.providerCallAttempted === false, "context does not call provider");
check(context.providerBoundary.aiUsageLogWritten === false, "context does not fake AiUsageLog");
check(context.privacyProof.rawTheaterSessionIdReturned === false, "context does not return raw theater session id");
check(context.privacyProof.rawPersonIdReturned === false, "context does not return raw person id");
check(context.privacyProof.sourceReferenceIdsReturned === false, "context does not return source reference ids");

const situationQuestion = enriched.find((question) => question.type === "S");
const downstreamQuestions = enriched.filter((question) => question.type !== "S");
check(Boolean(situationQuestion), "situation question exists");
check(
  !situationQuestion?.reasoning?.evidence.some((item) => item.source === "theater_route_b_feedback_profile"),
  "situation question does not foreground feedback profile context",
);
check(
  downstreamQuestions.every((question) =>
    question.reasoning?.evidence.some((item) => item.source === "theater_route_b_feedback_profile"),
  ),
  "problem/implication/need-payoff questions consume feedback profile context",
);
check(
  downstreamQuestions.some((question) =>
    question.reasoning?.evidence.some((item) => item.status === "unknown" && item.detail.includes("未知待補問")),
  ),
  "visit package preserves unknown profile context",
);
check(
  downstreamQuestions.some((question) => question.reasoning?.confirmationPrompt?.includes("client profile")),
  "visit package adds no-write confirmation prompt",
);

const serialized = collectStringValues({ context, enriched }).join("\n");
check(!serialized.includes("qa-private@example.com"), "context does not leak email sentinel");
check(!/0912[-\s]?345[-\s]?678/.test(serialized), "context does not leak phone sentinel");
check(
  !/rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber/i.test(serialized),
  "context does not leak unsafe payload keys",
);

console.log(
  JSON.stringify(
    {
      status: "pass",
      checkedCount: checks.length,
      actionId: context.actionId,
      sourceActionId: context.sourceActionId,
      contextItemCount: context.summary.itemCount,
      confirmedCount: context.summary.confirmedCount,
      inferenceCount: context.summary.inferenceCount,
      unknownCount: context.summary.unknownCount,
      consumedQuestionIds: downstreamQuestions.map((question) => question.id),
      providerCallAttempted: context.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: context.providerBoundary.aiUsageLogWritten,
      writesRelationshipGraph: context.outputContract.writesRelationshipGraph,
      writesVisitPlan: context.outputContract.writesVisitPlan,
      writesClientProfile: context.outputContract.writesClientProfile,
      writesPolicy: context.outputContract.writesPolicy,
      writesConfirmedCrmFact: context.outputContract.writesConfirmedCrmFact,
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
