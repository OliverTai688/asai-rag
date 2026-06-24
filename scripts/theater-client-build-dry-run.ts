import type { Client } from "../src/domains/client/types";
import { buildClientTheaterBuild } from "../src/domains/theater/client-build";

const baseClient: Client = {
  id: "demo_client_theater_build",
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
    },
    {
      id: "mother",
      relation: "母",
      name: "林媽媽",
      age: 70,
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

const readyBuild = buildClientTheaterBuild({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: baseClient,
  sessionId: "client_theater_build_dry_run_ready",
  now: "2026-06-24T00:00:00.000Z",
});

const highSensitiveBuild = buildClientTheaterBuild({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: {
    ...baseClient,
    id: "demo_client_theater_build_high_sensitive",
    sensitivityLevel: "HIGHLY_SENSITIVE",
  },
  sessionId: "client_theater_build_dry_run_blocked",
  now: "2026-06-24T00:00:00.000Z",
});

const sparseBuild = buildClientTheaterBuild({
  organizationId: "org_demo",
  memberId: "member_demo",
  client: {
    ...baseClient,
    id: "demo_client_theater_build_sparse",
    family: [],
    existingPolicies: [],
    aiTags: [],
    complianceChecklist: {
      kycStatus: "MISSING",
      suitabilityStatus: "MISSING",
      consentStatus: "MISSING",
      missingItems: ["KYC", "適合度評估", "個資同意"],
    },
    kycStatus: "MISSING",
  },
  sessionId: "client_theater_build_dry_run_sparse",
  now: "2026-06-24T00:00:00.000Z",
});

const failures: string[] = [];
const readyText = JSON.stringify(readyBuild);
const highSensitiveText = JSON.stringify(highSensitiveBuild);
const sparseText = JSON.stringify(sparseBuild);

if (readyBuild.status !== "READY") failures.push("ready client build did not become READY");
if (readyBuild.packet.readiness !== "READY") failures.push("ready packet did not become READY");
if (!readyBuild.packet.focusClient?.includes("林育誠")) failures.push("focus client was not extracted");
if (!readyBuild.packet.scenario?.includes("客戶資料建場")) failures.push("scenario was not extracted from client build material");
if (readyBuild.sourceSummary.sourceCounts.familyMembers !== 2) failures.push("family member source count mismatch");
if (readyBuild.sourceSummary.sourceCounts.policies !== 1) failures.push("policy source count mismatch");
if (readyBuild.sourceSummary.sourceCounts.aiTags !== 2) failures.push("AI tag source count mismatch");
if (readyBuild.sourceSummary.sourceCounts.complianceMissing !== 1) failures.push("compliance missing source count mismatch");
if (!readyBuild.packet.relationships.some((relationship) => relationship.includes("陳雅婷"))) {
  failures.push("relationship graph member did not reach theater relationships");
}
if (!readyBuild.packet.confirmedFacts.some((fact) => fact.includes("誠問測試保險"))) {
  failures.push("policy did not reach confirmed facts");
}
if (!readyBuild.packet.inferredPersona.some((inference) => inference.includes("教育金缺口"))) {
  failures.push("AI tag did not stay as inference");
}
if (readyBuild.packet.confirmedFacts.some((fact) => fact.includes("教育金缺口"))) {
  failures.push("AI tag inference leaked into confirmed facts");
}
if (!readyBuild.packet.unknowns.some((unknown) => unknown.includes("適合度評估"))) {
  failures.push("compliance missing item did not stay unknown");
}
if (!readyBuild.packet.narratorQuestions.some((question) => question.includes("適合度評估"))) {
  failures.push("narrator question did not include compliance unknown");
}
if (readyBuild.packet.routeBCompatibility.npcCount > readyBuild.packet.routeBCompatibility.maxNpcCount) {
  failures.push("Route B NPC limit was exceeded");
}
if (!readyBuild.packet.routeBCompatibility.canStartSimulation) {
  failures.push("ready client build cannot start setup review");
}

for (const forbidden of [
  "private.client@example.com",
  "0912-345-678",
  "0988-111-222",
  "raw provider payload",
  "token:=secret123",
  "secret123",
]) {
  if (readyText.includes(forbidden) || highSensitiveText.includes(forbidden) || sparseText.includes(forbidden)) {
    failures.push(`forbidden private/provider sentinel leaked: ${forbidden}`);
  }
}

if (highSensitiveBuild.status !== "BLOCKED_SENSITIVE") failures.push("high-sensitive client build was not blocked");
if (highSensitiveBuild.packet.routeBCompatibility.canStartSimulation) {
  failures.push("high-sensitive client build can start simulation without approval");
}
if (!highSensitiveBuild.warnings.some((warning) => warning.includes("高敏感"))) {
  failures.push("high-sensitive warning is missing");
}
if (!highSensitiveBuild.packet.unknowns.some((unknown) => unknown.includes("高敏感客戶"))) {
  failures.push("high-sensitive unknown boundary is missing");
}
if (!highSensitiveBuild.packet.routeBCompatibility.migrationNote.includes("reason/riskAccepted")) {
  failures.push("high-sensitive migration note does not mention reason/riskAccepted");
}

if (sparseBuild.status !== "READY") failures.push("sparse but focusable client build should stay READY for review");
for (const missing of ["尚未建立關係圖人物", "尚未建立既有保單", "尚未有 AI 推論缺口標籤", "KYC"]) {
  if (!sparseBuild.missing.some((item) => item.includes(missing))) failures.push(`missing item not reported: ${missing}`);
}
if (sparseBuild.packet.confirmedFacts.some((fact) => fact.includes("尚未建立關係圖人物"))) {
  failures.push("missing relationship graph item leaked into confirmed facts");
}

if (failures.length > 0) {
  console.error("theater:client-build-dry-run — failed");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("theater:client-build-dry-run — client data theater build contract passed.");
console.log(
  JSON.stringify(
    {
      readyStatus: readyBuild.status,
      focusClient: readyBuild.packet.focusClient,
      npcCount: readyBuild.packet.routeBCompatibility.npcCount,
      sourceCounts: readyBuild.sourceSummary.sourceCounts,
      unknownCount: readyBuild.packet.unknowns.length,
      highSensitiveStatus: highSensitiveBuild.status,
      highSensitiveCanStart: highSensitiveBuild.packet.routeBCompatibility.canStartSimulation,
      sparseMissing: sparseBuild.missing,
      providerCallAttempted: false,
      databaseWriteAttempted: false,
    },
    null,
    2,
  ),
);
