import assert from "node:assert/strict";
import type { Client } from "../src/domains/client/types";
import { buildClientRouteBSessionSourceConsumption } from "../src/domains/theater/client-route-b-session-source-consumption";
import { buildClientRouteBSessionSourceReview } from "../src/domains/theater/client-route-b-session-source-review";

const checks: Array<{ label: string; detail?: string }> = [];

const baseClient: Client = {
  id: "demo_client_route_b_source_consumption",
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
  notes: "raw provider payload token:=secret123 should never appear in advisor-visible consumption",
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
  sessionId: "client_route_b_session_source_consumption",
  routeBSessionId: "route_b_client_session_source_consumption_preview",
  now: "2026-06-24T00:00:00.000Z",
  advisorTurn: {
    id: "advisor_group_latest",
    content: "請讓共同決策者先回應家庭現金流壓力，並提醒我還有哪些未知需要問清楚。qa-private@example.com",
    visibilityScope: "GROUP",
  },
});

const blockedReview = buildClientRouteBSessionSourceReview({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: {
    ...baseClient,
    id: "demo_client_route_b_source_consumption_high_sensitive",
    sensitivityLevel: "HIGHLY_SENSITIVE",
  },
  sessionId: "client_route_b_session_source_consumption_blocked",
  routeBSessionId: "route_b_client_session_source_consumption_blocked",
  now: "2026-06-24T00:00:00.000Z",
  advisorTurn: {
    id: "advisor_blocked_latest",
    content: "請開始演練。",
    visibilityScope: "GROUP",
  },
});

const readyConsumption = buildClientRouteBSessionSourceConsumption(readyReview);
const blockedConsumption = buildClientRouteBSessionSourceConsumption(blockedReview);
const familyPanel = readyConsumption.advisorVisiblePanels.find((panel) => panel.id === "familyProfiles");

check(readyReview.status === "READY_FOR_SESSION_SOURCE_REVIEW", "ready review reaches session source review");
check(readyConsumption.status === "READY_FOR_ADVISOR_SOURCE_REVIEW", "ready review reaches advisor-visible consumption");
check(readyConsumption.source === "ClientRouteBSessionSourceReview.sessionSourceReview", "consumption source is session source review");
check(readyConsumption.destinationSurface === "/theater/[sessionId]", "consumption targets Route B session stage surface");
check(readyConsumption.destination === "advisor-visible Route B source grounding panels", "consumption targets advisor-visible source panels");
check(readyConsumption.sessionConsumption.consumes === "RouteBSessionSnapshot.scene.sourceGrounding", "consumption reads session source grounding");
check(readyConsumption.sessionConsumption.currentPersistence === "not-written-this-loop", "consumption keeps source review non-persistence boundary");
check(
  readyConsumption.sessionConsumption.intendedPersistenceTarget === "owner-scoped RouteBSession.sceneState.sourceGrounding",
  "consumption names owner-scoped future persistence target",
);
check(readyConsumption.sessionConsumption.routeBEnabled === false, "consumption keeps Route B production disabled");
check(readyConsumption.sessionConsumption.providerCallsEnabled === false, "consumption keeps provider disabled");
check(readyConsumption.sessionConsumption.routeBProductionStartAllowed === false, "consumption does not allow production start");
check(readyConsumption.sessionConsumption.ownerScopedSessionRequired, "consumption requires owner-scoped session");
check(readyConsumption.sessionConsumption.browserSuppliedSessionIdTrusted === false, "consumption does not trust browser session id");
check(readyConsumption.sessionConsumption.browserSuppliedPersonIdTrusted === false, "consumption does not trust browser person id");
check(readyConsumption.sessionConsumption.stageDataAttributes.includes("data-route-b-family-profile-source-grounding"), "consumption exposes family profile stage hook");
check(Boolean(familyPanel), "family profile advisor panel exists");
check(familyPanel?.destination === "RouteBFamilyProfileGroundingPanel", "family panel destination matches existing stage component");
check(familyPanel?.dataAttribute === "data-route-b-family-profile-source-grounding", "family panel data hook matches existing stage selector");
check(familyPanel?.source === "TheaterRouteBScene.sourceGrounding.familyProfiles", "family panel source matches scene source grounding");
check((familyPanel?.count ?? 0) > 0, "family panel carries field count");
check((familyPanel?.unknownCount ?? 0) > 0, "family panel carries unknown count");
check((familyPanel?.factStatusCounts.FACT ?? 0) > 0, "family panel surfaces FACT count");
check((familyPanel?.factStatusCounts.INFERENCE ?? 0) > 0, "family panel surfaces INFERENCE count");
check((familyPanel?.factStatusCounts.UNKNOWN ?? 0) > 0, "family panel surfaces UNKNOWN count");
check((familyPanel?.previewItems.length ?? 0) > 0, "family panel exposes safe previews");
check(
  Boolean(familyPanel?.previewItems.every((item) => !("value" in item))),
  "family panel preview excludes raw field values",
);
check(readyConsumption.sourceCounts.characterCount >= 3, "consumption sees client and family characters");
check(readyConsumption.sourceCounts.familyProfileMembers >= 3, "consumption counts family profile members");
check(readyConsumption.sourceCounts.familyProfileFields > 0, "consumption counts family profile fields");
check(readyConsumption.sourceCounts.familyProfileUnknowns > 0, "consumption counts family profile unknowns");
check(readyConsumption.proof.sessionSourceReviewPresent, "proof confirms source review is present");
check(readyConsumption.proof.advisorPanelsConnectedToStageSurface, "proof confirms advisor panels are connected to stage surface");
check(readyConsumption.proof.factsInferencesUnknownsVisible, "proof confirms FACT/INFERENCE/UNKNOWN are visible");
check(readyConsumption.proof.providerCallAttempted === false, "proof provider call false");
check(readyConsumption.proof.databaseWriteAttempted === false, "proof DB write false");
check(readyConsumption.proof.aiUsageLogWritten === false, "proof AiUsageLog false on no-provider path");
check(readyConsumption.proof.sourceGroundingPersistedToDatabase === false, "proof source grounding persistence false");
check(readyConsumption.proof.rawPrivateTranscriptIncluded === false, "proof raw private transcript false");
check(readyConsumption.proof.rawProviderPayloadIncluded === false, "proof raw provider payload false");
check(readyConsumption.proof.rawSourceReferenceIdsIncluded === false, "proof raw source reference ids false");
check(readyConsumption.proof.rawMetadataIncluded === false, "proof raw metadata false");
check(readyConsumption.proof.directPrivateDialogReturned === false, "proof direct private dialog false");
check(readyConsumption.proof.writesRelationshipGraph === false, "proof relationship graph write false");
check(readyConsumption.proof.writesVisitPlan === false, "proof VisitPlan write false");
check(readyConsumption.proof.writesClientProfile === false, "proof client profile write false");
check(readyConsumption.proof.writesPolicy === false, "proof policy write false");
check(readyConsumption.proof.writesConfirmedCrmFact === false, "proof confirmed CRM fact write false");
check(familyPanel?.noWriteBoundary.providerCallAttempted === false, "family panel boundary provider call false");
check(familyPanel?.noWriteBoundary.databaseWriteAttempted === false, "family panel boundary DB write false");
check(familyPanel?.noWriteBoundary.rawSourceReferenceIdsIncluded === false, "family panel boundary raw source refs false");
check(familyPanel?.noWriteBoundary.writesConfirmedCrmFact === false, "family panel boundary confirmed CRM fact false");

check(blockedReview.status === "BLOCKED_SENSITIVE", "blocked review remains blocked");
check(blockedConsumption.status === "BLOCKED_SENSITIVE", "high-sensitive consumption remains blocked");
check(blockedConsumption.advisorVisiblePanelCount === 0, "high-sensitive consumption exposes no panels");
check(blockedConsumption.proof.highSensitiveBlocked, "high-sensitive proof flag remains true");
check(blockedConsumption.proof.providerCallAttempted === false, "high-sensitive path provider call false");
check(blockedConsumption.proof.databaseWriteAttempted === false, "high-sensitive path DB write false");
check(blockedConsumption.proof.writesConfirmedCrmFact === false, "high-sensitive path confirmed CRM fact false");

const serializedConsumption = collectStringValues([readyConsumption, blockedConsumption]).join("\n");

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
  check(!serializedConsumption.toLowerCase().includes(forbidden.toLowerCase()), `forbidden private/provider sentinel excluded: ${forbidden}`);
}

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

console.log(
  JSON.stringify(
    {
      reviewStatus: readyReview.status,
      consumptionStatus: readyConsumption.status,
      destinationSurface: readyConsumption.destinationSurface,
      stageDataAttributes: readyConsumption.sessionConsumption.stageDataAttributes,
      advisorVisiblePanelCount: readyConsumption.advisorVisiblePanelCount,
      sourceCounts: readyConsumption.sourceCounts,
      familyPanel: {
        destination: familyPanel?.destination,
        dataAttribute: familyPanel?.dataAttribute,
        factStatusCounts: familyPanel?.factStatusCounts,
        noWriteBoundary: familyPanel?.noWriteBoundary,
      },
      proof: readyConsumption.proof,
      highSensitiveStatus: blockedConsumption.status,
      highSensitivePanelCount: blockedConsumption.advisorVisiblePanelCount,
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
