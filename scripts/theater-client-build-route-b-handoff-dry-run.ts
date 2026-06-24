import type { Client } from "../src/domains/client/types";
import { buildClientTheaterRouteBHandoff } from "../src/domains/theater/client-route-b-handoff";

const baseClient: Client = {
  id: "demo_client_route_b_bridge",
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
        relationshipContext: {
          value: "會一起討論家庭現金流與教育金安排",
          factStatus: "INFERENCE",
          sourceReferenceIds: ["relationship_graph_note_3"],
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
          sourceReferenceIds: ["relationship_graph_note_4"],
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
  notes: "raw provider payload token:=secret123 should never appear in theater packet",
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

const readyBridge = buildClientTheaterRouteBHandoff({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: baseClient,
  sessionId: "client_route_b_bridge_ready",
  now: "2026-06-24T00:00:00.000Z",
});

const highSensitiveBridge = buildClientTheaterRouteBHandoff({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: {
    ...baseClient,
    id: "demo_client_route_b_bridge_high_sensitive",
    sensitivityLevel: "HIGHLY_SENSITIVE",
  },
  routeBEnabled: true,
  sessionId: "client_route_b_bridge_blocked",
  now: "2026-06-24T00:00:00.000Z",
});

const failures: string[] = [];
const readyStrings = collectStringValues(readyBridge).join("\n");
const blockedStrings = collectStringValues(highSensitiveBridge).join("\n");
const familyGrounding = readyBridge.handoff.scene.sourceGrounding?.familyProfiles;

if (readyBridge.status !== "READY_FOR_HANDOFF_REVIEW") failures.push("ready client bridge did not become review-ready");
if (readyBridge.clientBuild.status !== "READY") failures.push("ready client build did not remain READY");
if (!readyBridge.handoff.scene.characters.some((character) => character.isFocus && character.displayName === "林育誠")) {
  failures.push("Route B handoff lost the focus client");
}
if (!readyBridge.handoff.scene.characters.some((character) => character.displayName === "陳雅婷")) {
  failures.push("Route B handoff lost the relationship graph decision maker");
}
if (!familyGrounding) failures.push("family profile grounding was not attached to Route B sourceGrounding");
if ((familyGrounding?.memberCount ?? 0) < 3) failures.push("family profile grounding did not include focus client and family members");
if ((familyGrounding?.knownFieldCount ?? 0) < 4) failures.push("family profile grounding known field count is too low");
if ((familyGrounding?.unknownFieldCount ?? 0) < 2) failures.push("family profile grounding unknown field count is too low");
if (familyGrounding?.boundary.sourceReferenceIdsIncluded !== false) {
  failures.push("family profile grounding exposed sourceReferenceIds");
}
if (familyGrounding?.boundary.rawPrivateTranscriptIncluded !== false) {
  failures.push("family profile grounding did not prove raw transcript exclusion");
}
if (familyGrounding?.boundary.writesRelationshipGraph !== false) {
  failures.push("family profile grounding claims relationship graph writes");
}
if (readyBridge.clientBuild.packet.confirmedFacts.some((fact) => fact.includes("教育金缺口"))) {
  failures.push("AI tag inference leaked into confirmed facts");
}
if (!readyBridge.clientBuild.packet.inferredPersona.some((inference) => inference.includes("教育金缺口"))) {
  failures.push("AI tag inference did not reach inferred persona");
}
if (!readyBridge.handoff.scene.narratorQuestions.every((question) => question.factStatus === "UNKNOWN")) {
  failures.push("Route B narrator questions did not preserve UNKNOWN status");
}
if (!readyBridge.proof.familyProfileGroundingIncluded) failures.push("bridge proof did not mark family profile grounding");
if (readyBridge.proof.providerCallAttempted !== false) failures.push("bridge attempted provider");
if (readyBridge.proof.databaseWriteAttempted !== false) failures.push("bridge attempted DB write");
if (readyBridge.proof.writesConfirmedCrmFact !== false) failures.push("bridge writes confirmed CRM fact");
if (readyBridge.proof.routeBProductionStartAllowed !== false) {
  failures.push("Route B production start should stay disabled by default");
}

if (highSensitiveBridge.status !== "BLOCKED_SENSITIVE") failures.push("high-sensitive bridge was not blocked");
if (!highSensitiveBridge.proof.highSensitiveBlocked) failures.push("high-sensitive proof flag missing");
if (highSensitiveBridge.handoff.runtimeActivation.canStartProductionSession) {
  failures.push("high-sensitive bridge can start Route B production session");
}
if (!highSensitiveBridge.clientBuild.packet.unknowns.some((unknown) => unknown.includes("高敏感客戶"))) {
  failures.push("high-sensitive boundary did not remain an unknown/narrator item");
}

for (const forbidden of [
  "private.client@example.com",
  "0912-345-678",
  "0988-111-222",
  "raw provider payload",
  "token:=secret123",
  "secret123",
  "sourceReferenceIds",
  "rawPrivateTranscript",
  "providerPayload",
]) {
  if (readyStrings.includes(forbidden) || blockedStrings.includes(forbidden)) {
    failures.push(`forbidden private/provider sentinel leaked: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error("theater:client-build-route-b-handoff-dry-run — failed");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("theater:client-build-route-b-handoff-dry-run — client build to Route B handoff bridge passed.");
console.log(
  JSON.stringify(
    {
      bridgeStatus: readyBridge.status,
      focusClient: readyBridge.handoff.scene.characters.find((character) => character.isFocus)?.displayName,
      routeBProductionStartAllowed: readyBridge.proof.routeBProductionStartAllowed,
      familyProfileGrounding: {
        memberCount: familyGrounding?.memberCount,
        fieldCount: familyGrounding?.fieldCount,
        knownFieldCount: familyGrounding?.knownFieldCount,
        unknownFieldCount: familyGrounding?.unknownFieldCount,
        sourceReferenceCount: familyGrounding?.sourceReferenceCount,
      },
      highSensitiveStatus: highSensitiveBridge.status,
      highSensitiveCanStart: highSensitiveBridge.handoff.runtimeActivation.canStartProductionSession,
      providerCallAttempted: false,
      databaseWriteAttempted: false,
      writesConfirmedCrmFact: false,
    },
    null,
    2,
  ),
);

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
}
