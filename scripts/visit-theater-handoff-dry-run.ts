import type { Client } from "../src/domains/client/types";
import { buildVisitTheaterHandoff } from "../src/domains/theater/visit-handoff";
import { enrichSpinQuestionsWithReasoning } from "../src/domains/visit/reasoning";
import type { SpinQuestion, VisitPlan } from "../src/domains/visit/types";

const demoClient: Client = {
  id: "demo_client_visit_theater",
  name: "王大明",
  email: "secret.client@example.com",
  phone: "0912-345-678",
  birthDate: "1980-01-01",
  occupation: "科技業主管",
  annualIncome: 2200000,
  family: [
    { id: "spouse", relation: "配偶", name: "張麗華" },
    { id: "child", relation: "子", name: "王小明", age: 12 },
    { id: "mother", relation: "母", name: "王媽媽", age: 68 },
    { id: "advisor", relation: "合作夥伴", name: "會計師林先生" },
    { id: "overflow", relation: "朋友", name: "多餘角色" },
  ],
  existingPolicies: [
    { id: "policy-1", type: "醫療險", provider: "Nuva Life", amount: 1000000 },
  ],
  tags: ["高意向"],
  aiTags: ["教育金缺口", "醫療保障不足"],
  status: "ACTIVE",
  complianceChecklist: {
    kycStatus: "MISSING",
    suitabilityStatus: "PARTIAL",
    consentStatus: "COMPLETE",
    missingItems: ["補齊醫療險受益人確認"],
  },
  sensitivityLevel: "NORMAL",
  kycStatus: "MISSING",
  lastInteraction: "2026-06-20T00:00:00.000Z",
};

const questions: SpinQuestion[] = [
  { id: "s1", type: "S", question: "目前家庭主要經濟責任怎麼分配？" },
  { id: "p1", type: "P", question: "現有保障中，你最擔心哪一塊不足？" },
  { id: "i1", type: "I", question: "如果醫療支出突然增加，會影響哪個家庭目標？" },
  { id: "n1", type: "N", question: "如果能先補上教育金與醫療缺口，你希望下一步怎麼安排？" },
];

const visitPlan: VisitPlan = {
  id: "visit_lv3_handoff",
  clientId: demoClient.id,
  purpose: "ADD_ON",
  status: "READY",
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z",
  objectives: [
    {
      id: "obj-1",
      description: "釐清教育金與醫療保障缺口",
      successCriteria: "王大明能說出願意優先處理的保障缺口",
    },
  ],
  spinQuestions: enrichSpinQuestionsWithReasoning(questions, {
    client: demoClient,
    purpose: "ADD_ON",
  }),
  objections: [
    {
      id: "objh-1",
      expectedObjection: "我想先跟太太討論，不要今天決定。",
      suggestedResponse: "先把太太在意的問題列成確認清單，不急著要求今天決定。",
    },
  ],
  materials: [
    { id: "mat-1", name: "既有保單摘要", checked: true },
    { id: "mat-2", name: "醫療險條款更新", checked: false },
  ],
};

const handoff = buildVisitTheaterHandoff({
  organizationId: "org_demo",
  memberId: "member_demo",
  client: demoClient,
  visitPlan,
  sessionId: "visit_theater_handoff_demo",
  now: "2026-06-20T00:00:00.000Z",
});

const highSensitivityHandoff = buildVisitTheaterHandoff({
  organizationId: "org_demo",
  memberId: "member_demo",
  client: {
    ...demoClient,
    id: "demo_client_high_sensitive",
    sensitivityLevel: "HIGHLY_SENSITIVE",
  },
  visitPlan,
  sessionId: "visit_theater_handoff_blocked",
  now: "2026-06-20T00:00:00.000Z",
});

const approvedHighSensitivityHandoff = buildVisitTheaterHandoff({
  organizationId: "org_demo",
  memberId: "member_demo",
  client: {
    ...demoClient,
    id: "demo_client_high_sensitive_approved",
    sensitivityLevel: "HIGHLY_SENSITIVE",
  },
  visitPlan,
  sessionId: "visit_theater_handoff_approved",
  now: "2026-06-20T00:00:00.000Z",
  sensitivityApproval: {
    riskAccepted: true,
    reason: "顧問訓練演練，僅使用已確認且必要的拜訪準備包素材。",
  },
});

const failures: string[] = [];
const serialized = JSON.stringify(handoff);

if (handoff.status !== "READY") failures.push("normal handoff did not become READY");
if (handoff.packet.readiness !== "READY") failures.push("packet readiness is not READY");
if (!handoff.packet.focusClient?.includes("王大明")) failures.push("focus client missing");
if (!handoff.packet.scenario?.includes("教育金")) failures.push("visit objective did not become scenario");
if (handoff.packet.routeBCompatibility.npcCount > 4) failures.push("NPC count exceeded Route B limit");
if (handoff.packet.characters.some((character) => character.displayName === "多餘角色")) {
  failures.push("overflow NPC was not truncated");
}
if (!handoff.packet.relationships.some((relationship) => relationship.includes("張麗華"))) {
  failures.push("relationship graph evidence missing");
}
if (!handoff.packet.objections.some((objection) => objection.includes("太太討論"))) {
  failures.push("visit objection did not transfer to theater packet");
}
if (!handoff.packet.confirmedFacts.some((fact) => fact.includes("既有保單摘要"))) {
  failures.push("checked visit material did not become confirmed fact");
}
if (!handoff.packet.unknowns.some((unknown) => unknown.includes("醫療險條款更新"))) {
  failures.push("unchecked material did not stay unknown");
}
if (!handoff.packet.inferredPersona.some((value) => value.includes("教育金缺口"))) {
  failures.push("AI gap tag did not stay as inference");
}
if (handoff.packet.confirmedFacts.some((fact) => fact.includes("教育金缺口"))) {
  failures.push("inference leaked into confirmed facts");
}
if (!handoff.missing.includes("準備包仍有待確認推論依據")) {
  failures.push("unknown reasoning gap was not surfaced in missing list");
}
if (serialized.includes("secret.client@example.com") || serialized.includes("0912-345-678")) {
  failures.push("private email or phone leaked into handoff output");
}
if (highSensitivityHandoff.status !== "BLOCKED_SENSITIVE") {
  failures.push("high sensitivity client without approval was not blocked");
}
if (highSensitivityHandoff.packet.routeBCompatibility.canStartSimulation) {
  failures.push("blocked high sensitivity packet can start simulation");
}
if (approvedHighSensitivityHandoff.status !== "READY") {
  failures.push("approved high sensitivity handoff should become READY");
}

if (failures.length > 0) {
  console.error("visit:theater-handoff-dry-run — failed");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("visit:theater-handoff-dry-run — visit package to theater handoff passed.");
console.log(
  JSON.stringify(
    {
      status: handoff.status,
      knownMaterials: handoff.knownMaterials.length,
      focusClient: handoff.packet.focusClient,
      scenario: handoff.packet.scenario,
      npcCount: handoff.packet.routeBCompatibility.npcCount,
      relationships: handoff.packet.relationships.length,
      confirmedFacts: handoff.packet.confirmedFacts.length,
      inferences: handoff.packet.inferredPersona.length,
      unknowns: handoff.packet.unknowns.length,
      blockedHighSensitivityStatus: highSensitivityHandoff.status,
      approvedHighSensitivityStatus: approvedHighSensitivityHandoff.status,
    },
    null,
    2,
  ),
);
