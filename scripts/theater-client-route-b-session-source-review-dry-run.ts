import assert from "node:assert/strict";
import type { Client } from "../src/domains/client/types";
import { buildClientRouteBSessionSourceReview } from "../src/domains/theater/client-route-b-session-source-review";

const checks: Array<{ label: string; detail?: string }> = [];

const baseClient: Client = {
  id: "demo_client_route_b_session_source_review",
  name: "林育誠",
  email: "private.client@example.com",
  phone: "0912-345-678",
  birthDate: "1982-03-04",
  occupation: "半導體廠營運長",
  annualIncome: 5200000,
  family: [
    {
      id: "spouse",
      relation: "配偶",
      name: "陳雅婷",
      age: 42,
      phone: "0988-111-222",
      profile: {
        schemaVersion: "2026-06-24.family-member-profile.v1",
        jobTitle: {
          value: "品牌顧問",
          factStatus: "FACT",
          sourceReferenceIds: ["relationship_graph_note_1"],
        },
        annualIncomeOrDependency: {
          value: "收入區間尚未確認",
          factStatus: "UNKNOWN",
          sourceReferenceIds: ["relationship_graph_note_2"],
        },
        personStatus: {
          value: "共同決策者",
          factStatus: "INFERENCE",
          sourceReferenceIds: ["advisor_observation_1"],
        },
        decisionRole: {
          value: "會一起檢查家庭現金流與月繳壓力",
          factStatus: "INFERENCE",
          sourceReferenceIds: ["relationship_graph_note_3"],
        },
        relationshipContext: {
          value: "會一起討論家庭現金流與教育金安排",
          factStatus: "INFERENCE",
          sourceReferenceIds: ["relationship_graph_note_4"],
        },
        sourceReferences: [
          {
            id: "relationship_graph_note_1",
            type: "relationship_graph",
            label: "關係圖",
            summary: "顧問確認配偶會參與家庭保障討論",
            factStatus: "FACT",
          },
        ],
      },
    },
    {
      id: "mother",
      relation: "母",
      name: "林媽媽",
      age: 70,
      profile: {
        schemaVersion: "2026-06-24.family-member-profile.v1",
        personStatus: {
          value: "長照安排需要釐清",
          factStatus: "UNKNOWN",
          sourceReferenceIds: ["relationship_graph_note_5"],
        },
        sourceReferences: [],
      },
    },
  ],
  existingPolicies: [
    {
      id: "policy-1",
      type: "壽險",
      provider: "誠問測試保險",
      amount: 3000000,
    },
  ],
  tags: ["家庭責任"],
  aiTags: ["教育金缺口", "長照責任待釐清"],
  status: "ACTIVE",
  notes: "raw provider payload token:=secret123 should never appear in session source review",
  complianceChecklist: {
    kycStatus: "PARTIAL",
    suitabilityStatus: "MISSING",
    consentStatus: "COMPLETE",
    missingItems: ["適合度評估"],
    reviewedAt: "2026-06-24T00:00:00.000Z",
  },
  sensitivityLevel: "NORMAL",
  kycStatus: "PARTIAL",
  lastInteraction: "2026-06-24T00:00:00.000Z",
};

const readyReview = buildClientRouteBSessionSourceReview({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: baseClient,
  sessionId: "client_route_b_session_source",
  routeBSessionId: "route_b_client_session_source_preview",
  now: "2026-06-24T00:00:00.000Z",
  advisorTurn: {
    id: "advisor_group_latest",
    content: "請先讓最在意家庭現金流的人回應，並提醒我還有哪些未知需要問清楚。qa-private@example.com",
    visibilityScope: "GROUP",
  },
});

const blockedReview = buildClientRouteBSessionSourceReview({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: {
    ...baseClient,
    id: "demo_client_route_b_session_source_high_sensitive",
    sensitivityLevel: "HIGHLY_SENSITIVE",
  },
  sessionId: "client_route_b_session_source_blocked",
  routeBSessionId: "route_b_client_session_source_blocked",
  now: "2026-06-24T00:00:00.000Z",
  advisorTurn: {
    id: "advisor_blocked_latest",
    content: "請開始演練。",
    visibilityScope: "GROUP",
  },
});

const reviewPayload = readyReview.sessionSourceReview;
const familyProfiles = reviewPayload?.sourceGroundingReview.familyProfiles;

check(readyReview.status === "READY_FOR_SESSION_SOURCE_REVIEW", "ready client reaches session source review");
check(readyReview.nextTurnContext.status === "READY_FOR_PROVIDER_DISABLED_PREVIEW", "review keeps provider-disabled context");
check(Boolean(reviewPayload), "ready review builds session source review payload");
check(reviewPayload?.source === "ClientRouteBNextTurnContext.sessionSnapshot.scene.sourceGrounding", "review source is next-turn session snapshot source grounding");
check(reviewPayload?.destination === "RouteBSessionSnapshot.scene.sourceGrounding", "review destination is persisted session source grounding");
check(reviewPayload?.sessionShape.routeBEnabled === false, "session shape keeps Route B production disabled");
check(reviewPayload?.sessionShape.providerCallsEnabled === false, "session shape keeps provider disabled");
check((reviewPayload?.sessionShape.providerUsageLogRequiredFor.length ?? 0) > 0, "session shape keeps future AiUsageLog requirement");
check(reviewPayload?.persistenceBoundary.currentPersistence === "not-written-this-loop", "review declares current persistence as not written");
check(reviewPayload?.persistenceBoundary.intendedPersistenceTarget === "owner-scoped RouteBSession.sceneState.sourceGrounding", "review names owner-scoped source grounding persistence target");
check(reviewPayload?.persistenceBoundary.providerCallAttempted === false, "review does not call provider");
check(reviewPayload?.persistenceBoundary.databaseWriteAttempted === false, "review does not write database");
check(reviewPayload?.persistenceBoundary.sourceGroundingPersistedToDatabase === false, "review does not persist source grounding");
check(reviewPayload?.persistenceBoundary.storesRawProviderPayload === false, "review stores no raw provider payload");
check(reviewPayload?.persistenceBoundary.rawPrivateTranscriptIncluded === false, "review excludes raw private transcript");
check(reviewPayload?.persistenceBoundary.rawSourceReferenceIdsIncluded === false, "review excludes raw source reference ids");
check(reviewPayload?.persistenceBoundary.rawMetadataIncluded === false, "review excludes raw metadata");
check(reviewPayload?.persistenceBoundary.writesRelationshipGraph === false, "review cannot write relationship graph");
check(reviewPayload?.persistenceBoundary.writesVisitPlan === false, "review cannot write VisitPlan");
check(reviewPayload?.persistenceBoundary.writesClientProfile === false, "review cannot write client profile");
check(reviewPayload?.persistenceBoundary.writesPolicy === false, "review cannot write policy");
check(reviewPayload?.persistenceBoundary.writesConfirmedCrmFact === false, "review cannot write confirmed CRM fact");
check((reviewPayload?.sceneShape.characterCount ?? 0) >= 3, "session source review sees client and family characters");
check(Boolean(reviewPayload?.sceneShape.sourceGroundingKeys.includes("familyProfiles")), "session source review sees familyProfiles source grounding");
check((familyProfiles?.memberCount ?? 0) >= 3, "family profile review includes focus client and family");
check((familyProfiles?.fieldCount ?? 0) > 0, "family profile review includes fields");
check((familyProfiles?.knownFieldCount ?? 0) > 0, "family profile review keeps known facts");
check((familyProfiles?.unknownFieldCount ?? 0) > 0, "family profile review keeps unknown fields");
check((familyProfiles?.byFactStatus.FACT ?? 0) > 0, "family profile review counts FACT");
check((familyProfiles?.byFactStatus.INFERENCE ?? 0) > 0, "family profile review counts INFERENCE");
check((familyProfiles?.byFactStatus.UNKNOWN ?? 0) > 0, "family profile review counts UNKNOWN");
check(familyProfiles?.boundary.sourceReferenceIdsIncluded === false, "family profile review boundary excludes source reference ids");
check(familyProfiles?.boundary.rawMetadataIncluded === false, "family profile review boundary excludes raw metadata");
check(familyProfiles?.boundary.databaseWriteAttempted === false, "family profile review boundary writes no DB");
check(familyProfiles?.boundary.writesRelationshipGraph === false, "family profile review boundary writes no graph");
check(familyProfiles?.boundary.writesVisitPlan === false, "family profile review boundary writes no VisitPlan");
check(familyProfiles?.boundary.writesConfirmedCrmFact === false, "family profile review boundary writes no confirmed CRM fact");
check(
  (familyProfiles?.fieldPreviews.length ?? 0) > 0 && Boolean(familyProfiles?.fieldPreviews.every((field) => !("value" in field))),
  "family profile field previews exclude raw values",
);
check(readyReview.proof.factsInferencesUnknownsSeparated, "proof confirms fact/inference/unknown separation");
check(readyReview.proof.familyProfileGroundingReviewed, "proof confirms family profile grounding reviewed");
check(readyReview.proof.sessionSourceGroundingReady, "proof confirms session source grounding ready");
check(readyReview.proof.providerCallAttempted === false, "proof provider call false");
check(readyReview.proof.databaseWriteAttempted === false, "proof DB write false");
check(readyReview.proof.aiUsageLogWritten === false, "proof AiUsageLog false for no-provider path");
check(readyReview.proof.sourceGroundingPersistedToDatabase === false, "proof source grounding not persisted");
check(readyReview.proof.rawSourceReferenceIdsIncluded === false, "proof raw source reference ids false");
check(readyReview.proof.rawMetadataIncluded === false, "proof raw metadata false");
check(readyReview.proof.writesClientProfile === false, "proof client profile write false");
check(readyReview.proof.writesPolicy === false, "proof policy write false");
check(readyReview.proof.writesConfirmedCrmFact === false, "proof confirmed CRM fact write false");

check(blockedReview.status === "BLOCKED_SENSITIVE", "high-sensitive client remains blocked");
check(blockedReview.sessionSourceReview === undefined, "high-sensitive client does not build review payload");
check(blockedReview.proof.highSensitiveBlocked, "high-sensitive proof flag remains true");
check(blockedReview.proof.providerCallAttempted === false, "high-sensitive path does not call provider");
check(blockedReview.proof.databaseWriteAttempted === false, "high-sensitive path does not write DB");
check(blockedReview.proof.writesConfirmedCrmFact === false, "high-sensitive path writes no confirmed CRM fact");

const serializedReview = collectStringValues([readyReview.sessionSourceReview, blockedReview]).join("\n");

for (const forbidden of [
  "private.client@example.com",
  "qa-private@example.com",
  "0912-345-678",
  "0988-111-222",
  "raw provider payload",
  "token:=secret123",
  "secret123",
  "rawPayload",
  "providerPayload",
  "rawPrivateTranscript",
  "authorization",
  "cookie",
  "otp",
  "payment",
]) {
  check(!serializedReview.toLowerCase().includes(forbidden.toLowerCase()), `forbidden private/provider sentinel excluded: ${forbidden}`);
}

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

console.log(
  JSON.stringify(
    {
      status: readyReview.status,
      nextTurnStatus: readyReview.nextTurnContext.status,
      sourceGroundingKeys: reviewPayload?.sceneShape.sourceGroundingKeys,
      sessionCurrentPersistence: reviewPayload?.persistenceBoundary.currentPersistence,
      intendedPersistenceTarget: reviewPayload?.persistenceBoundary.intendedPersistenceTarget,
      familyProfileMemberCount: familyProfiles?.memberCount,
      familyProfileFieldCount: familyProfiles?.fieldCount,
      factStatusCounts: familyProfiles?.byFactStatus,
      providerCallAttempted: readyReview.proof.providerCallAttempted,
      databaseWriteAttempted: readyReview.proof.databaseWriteAttempted,
      aiUsageLogWritten: readyReview.proof.aiUsageLogWritten,
      sourceGroundingPersistedToDatabase: readyReview.proof.sourceGroundingPersistedToDatabase,
      writesConfirmedCrmFact: readyReview.proof.writesConfirmedCrmFact,
      highSensitiveStatus: blockedReview.status,
      highSensitiveReviewBuilt: Boolean(blockedReview.sessionSourceReview),
    },
    null,
    2,
  ),
);

function check(condition: boolean, label: string, detail?: string) {
  assert.ok(condition, label);
  checks.push({ label, detail });
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((entry) => collectStringValues(entry));
  return Object.values(value).flatMap((entry) => collectStringValues(entry));
}
