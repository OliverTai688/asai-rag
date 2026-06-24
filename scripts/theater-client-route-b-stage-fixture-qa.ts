import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Client } from "../src/domains/client/types";
import { buildClientRouteBSessionSourceConsumption } from "../src/domains/theater/client-route-b-session-source-consumption";
import { buildClientRouteBSessionSourceReview } from "../src/domains/theater/client-route-b-session-source-review";
import { buildClientRouteBStageSourceAdapterFixture } from "../src/domains/theater/client-route-b-stage-source-fixture";

const checks: Array<{ label: string; detail?: string }> = [];

const stageSourcePath = "src/app/(dashboard)/theater/[sessionId]/page.tsx";
const stageSource = readFileSync(stageSourcePath, "utf8");

const baseClient: Client = {
  id: "demo_client_route_b_stage_fixture",
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
  notes: "raw provider payload token:=secret123 should never appear in stage fixture",
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
  sessionId: "client_route_b_stage_fixture",
  routeBSessionId: "route_b_client_stage_fixture_preview",
  now: "2026-06-25T00:00:00.000Z",
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
    id: "demo_client_route_b_stage_fixture_high_sensitive",
    sensitivityLevel: "HIGHLY_SENSITIVE",
  },
  sessionId: "client_route_b_stage_fixture_blocked",
  routeBSessionId: "route_b_client_stage_fixture_blocked",
  now: "2026-06-25T00:00:00.000Z",
  advisorTurn: {
    id: "advisor_blocked_latest",
    content: "請開始演練。",
    visibilityScope: "GROUP",
  },
});

const readyConsumption = buildClientRouteBSessionSourceConsumption(readyReview);
const blockedConsumption = buildClientRouteBSessionSourceConsumption(blockedReview);
const readyFixture = buildClientRouteBStageSourceAdapterFixture(readyConsumption);
const blockedFixture = buildClientRouteBStageSourceAdapterFixture(blockedConsumption);
const familyFixture = readyFixture.panels.find((panel) => panel.panelId === "familyProfiles");
const meetingFixture = readyFixture.panels.find((panel) => panel.panelId === "meetingRelationshipSignals");
const edgeFixture = readyFixture.panels.find((panel) => panel.panelId === "relationshipEdgeShadow");

check(readyReview.status === "READY_FOR_SESSION_SOURCE_REVIEW", "ready review reaches source review");
check(readyConsumption.status === "READY_FOR_ADVISOR_SOURCE_REVIEW", "ready consumption reaches advisor panel contract");
check(readyFixture.status === "READY_FOR_STAGE_ADAPTER_FIXTURE", "ready fixture reaches stage adapter fixture status");
check(readyFixture.source === "RouteBSessionSourceReviewConsumption.advisorVisiblePanels", "fixture source is advisor-visible panel consumption");
check(readyFixture.destinationSurface === "/theater/[sessionId]", "fixture targets Route B stage surface");
check(readyFixture.componentFile === stageSourcePath, "fixture component file matches scanned stage source");
check(readyFixture.stageSection === "RouteBSessionStage.aside.sourceGroundingPanels", "fixture targets source grounding aside");
check(readyFixture.panelCount === readyConsumption.advisorVisiblePanelCount, "fixture panel count mirrors consumption panel count");
check(readyFixture.panelCount >= 1, "fixture exposes at least one active source panel");
check(
  readyFixture.stageAdapter.stageDataAttributes.includes("data-route-b-family-profile-source-grounding"),
  "fixture exposes active family profile stage data attribute",
);
check(readyFixture.stageAdapter.consumes === "RouteBSessionSnapshot.scene.sourceGrounding", "fixture consumes Route B session source grounding");
check(readyFixture.stageAdapter.routeBEnabled === false, "fixture keeps Route B production disabled");
check(readyFixture.stageAdapter.providerCallsEnabled === false, "fixture keeps provider disabled");
check(readyFixture.stageAdapter.routeBProductionStartAllowed === false, "fixture disallows production start");
check(readyFixture.stageAdapter.ownerScopedSessionRequired, "fixture requires owner-scoped session");
check(readyFixture.stageAdapter.browserSuppliedSessionIdTrusted === false, "fixture does not trust browser session id");
check(readyFixture.stageAdapter.browserSuppliedPersonIdTrusted === false, "fixture does not trust browser person id");
check(readyFixture.proof.advisorPanelsReady, "proof confirms advisor panels are ready");
check(readyFixture.proof.allPanelsHaveStageSelectors, "proof confirms all panels declare stage selectors");
check(readyFixture.proof.familyProfileSelectorReady, "proof confirms family selector contract");
check(readyFixture.proof.factsInferencesUnknownsVisible, "proof keeps FACT/INFERENCE/UNKNOWN visible");
check(readyFixture.proof.providerCallAttempted === false, "proof provider call false");
check(readyFixture.proof.databaseWriteAttempted === false, "proof DB write false");
check(readyFixture.proof.aiUsageLogWritten === false, "proof AiUsageLog false on no-provider path");
check(readyFixture.proof.sourceGroundingPersistedToDatabase === false, "proof source grounding DB persistence false");
check(readyFixture.proof.rawPrivateTranscriptIncluded === false, "proof raw private transcript false");
check(readyFixture.proof.rawProviderPayloadIncluded === false, "proof raw provider payload false");
check(readyFixture.proof.rawSourceReferenceIdsIncluded === false, "proof raw source reference ids false");
check(readyFixture.proof.rawMetadataIncluded === false, "proof raw metadata false");
check(readyFixture.proof.directPrivateDialogReturned === false, "proof direct private dialog false");
check(readyFixture.proof.writesRelationshipGraph === false, "proof relationship graph write false");
check(readyFixture.proof.writesVisitPlan === false, "proof VisitPlan write false");
check(readyFixture.proof.writesClientProfile === false, "proof client profile write false");
check(readyFixture.proof.writesPolicy === false, "proof policy write false");
check(readyFixture.proof.writesConfirmedCrmFact === false, "proof confirmed CRM fact write false");

for (const panel of readyFixture.panels) {
  check(stageSource.includes(panel.componentName), `stage source contains component ${panel.componentName}`);
  check(stageSource.includes(`${panel.dataAttribute}="true"`), `stage source contains selector ${panel.dataAttribute}`);
  for (const snippet of panel.stageSourceRequiredSnippets) {
    check(stageSource.includes(snippet), `stage source contains required snippet ${snippet}`);
  }
  check(panel.noWriteBoundary.providerCallAttempted === false, `${panel.panelId} provider boundary false`);
  check(panel.noWriteBoundary.databaseWriteAttempted === false, `${panel.panelId} DB boundary false`);
  check(panel.noWriteBoundary.rawSourceReferenceIdsIncluded === false, `${panel.panelId} raw source refs false`);
  check(panel.noWriteBoundary.writesConfirmedCrmFact === false, `${panel.panelId} confirmed CRM fact false`);
}

for (const stageContract of [
  {
    componentName: "RouteBMeetingSignalGroundingPanel",
    dataAttribute: "data-route-b-meeting-signal-source-grounding",
  },
  {
    componentName: "RouteBFamilyProfileGroundingPanel",
    dataAttribute: "data-route-b-family-profile-source-grounding",
  },
  {
    componentName: "RouteBRelationshipEdgeShadowGroundingPanel",
    dataAttribute: "data-route-b-edge-shadow-source-grounding",
  },
]) {
  check(stageSource.includes(stageContract.componentName), `stage source keeps optional component ${stageContract.componentName}`);
  check(stageSource.includes(`${stageContract.dataAttribute}="true"`), `stage source keeps optional selector ${stageContract.dataAttribute}`);
}

check(Boolean(familyFixture), "family fixture exists");
check(familyFixture?.componentName === "RouteBFamilyProfileGroundingPanel", "family fixture component matches stage panel");
check(familyFixture?.dataAttribute === "data-route-b-family-profile-source-grounding", "family fixture data attribute matches stage selector");
check((familyFixture?.expectedSummary.factStatusCounts.FACT ?? 0) > 0, "family fixture surfaces FACT count");
check((familyFixture?.expectedSummary.factStatusCounts.INFERENCE ?? 0) > 0, "family fixture surfaces INFERENCE count");
check((familyFixture?.expectedSummary.factStatusCounts.UNKNOWN ?? 0) > 0, "family fixture surfaces UNKNOWN count");
check((familyFixture?.expectedSummary.previewItemCount ?? 0) > 0, "family fixture exposes safe previews");
if (meetingFixture) {
  check(meetingFixture.componentName === "RouteBMeetingSignalGroundingPanel", "meeting signal fixture component matches stage panel");
  check(meetingFixture.dataAttribute === "data-route-b-meeting-signal-source-grounding", "meeting signal fixture data attribute matches stage selector");
}
if (edgeFixture) {
  check(edgeFixture.componentName === "RouteBRelationshipEdgeShadowGroundingPanel", "edge fixture component matches stage panel");
  check(edgeFixture.dataAttribute === "data-route-b-edge-shadow-source-grounding", "edge fixture data attribute matches stage selector");
}

check(blockedReview.status === "BLOCKED_SENSITIVE", "blocked review remains blocked");
check(blockedConsumption.status === "BLOCKED_SENSITIVE", "blocked consumption remains blocked");
check(blockedFixture.status === "BLOCKED_SENSITIVE", "high-sensitive fixture remains blocked");
check(blockedFixture.panelCount === 0, "high-sensitive fixture exposes no panels");
check(blockedFixture.proof.highSensitiveBlocked, "high-sensitive fixture proof flag true");
check(blockedFixture.proof.providerCallAttempted === false, "high-sensitive fixture provider call false");
check(blockedFixture.proof.databaseWriteAttempted === false, "high-sensitive fixture DB write false");
check(blockedFixture.proof.writesConfirmedCrmFact === false, "high-sensitive fixture confirmed CRM fact false");

const serializedFixture = collectStringValues([readyFixture, blockedFixture]).join("\n");

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
  check(!serializedFixture.toLowerCase().includes(forbidden.toLowerCase()), `forbidden private/provider sentinel excluded: ${forbidden}`);
}

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

console.log(
  JSON.stringify(
    {
      reviewStatus: readyReview.status,
      consumptionStatus: readyConsumption.status,
      fixtureStatus: readyFixture.status,
      destinationSurface: readyFixture.destinationSurface,
      componentFile: readyFixture.componentFile,
      panelCount: readyFixture.panelCount,
      panelContracts: readyFixture.panels.map((panel) => ({
        panelId: panel.panelId,
        componentName: panel.componentName,
        dataAttribute: panel.dataAttribute,
        expectedSummary: panel.expectedSummary,
      })),
      proof: readyFixture.proof,
      highSensitiveStatus: blockedFixture.status,
      highSensitivePanelCount: blockedFixture.panelCount,
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
