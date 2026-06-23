import type { Client } from "../src/domains/client/types";
import { buildVisitTheaterHandoff } from "../src/domains/theater/visit-handoff";
import { buildVisitMeetingRelationshipSignalDeck } from "../src/domains/visit/meeting-relationship-signal";
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

const meetingRelationshipSignalDeck = buildVisitMeetingRelationshipSignalDeck({
  visitPlanId: visitPlan.id,
  clientId: demoClient.id,
  generatedAt: "2026-06-20T00:00:00.000Z",
  signals: [
    {
      id: "meeting-summary-1",
      sourceType: "MEETING_SUMMARY_DECISION",
      dataClass: "confirmed",
      text: "太太張麗華會一起決定教育金預算；保單號碼 AB123456 raw provider payload token:=secret123",
      sourceReferenceIds: ["meeting-session-safe-summary"],
    },
    {
      id: "meeting-open-question-1",
      sourceType: "MEETING_OPEN_QUESTION",
      dataClass: "unknown",
      text: "王媽媽是否需要長照安排仍未確認，需要下次拜訪詢問。",
      sourceReferenceIds: ["meeting-session-open-question"],
    },
  ],
});

const handoff = buildVisitTheaterHandoff({
  organizationId: "org_demo",
  memberId: "member_demo",
  client: demoClient,
  visitPlan,
  sessionId: "visit_theater_handoff_demo",
  now: "2026-06-20T00:00:00.000Z",
  meetingRelationshipSignalDeck,
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
  meetingRelationshipSignalDeck,
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
  meetingRelationshipSignalDeck,
  sensitivityApproval: {
    riskAccepted: true,
    reason: "顧問訓練演練，僅使用已確認且必要的拜訪準備包素材。",
  },
});

const failures: string[] = [];
const serialized = JSON.stringify(handoff);
const evidenceSummary = handoff.sourceSummary.evidenceSummary;
const relationshipConfirmation = evidenceSummary.relationshipConfirmation;
const meetingRelationshipSignals = evidenceSummary.meetingRelationshipSignals;

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
if (!handoff.packet.relationships.some((relationship) => relationship.includes("S 題"))) {
  failures.push("relationship question evidence did not reach theater stage relationships");
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
if (!handoff.packet.unknowns.some((unknown) => unknown.includes("N 題"))) {
  failures.push("need-payoff unknown reasoning did not stay unknown in theater packet");
}
if (!handoff.packet.inferredPersona.some((value) => value.includes("教育金缺口"))) {
  failures.push("AI gap tag did not stay as inference");
}
if (handoff.packet.confirmedFacts.some((fact) => fact.includes("教育金缺口"))) {
  failures.push("inference leaked into confirmed facts");
}
if (evidenceSummary.questionEvidenceByStatus.confirmed < 1) failures.push("confirmed evidence summary missing");
if (evidenceSummary.questionEvidenceByStatus.inference < 1) failures.push("inference evidence summary missing");
if (evidenceSummary.questionEvidenceByStatus.unknown < 1) failures.push("unknown evidence summary missing");
for (const expectedSource of ["relationship_graph", "policy", "ai_tag", "unknown"] as const) {
  if (!evidenceSummary.questionEvidenceSources.includes(expectedSource)) {
    failures.push(`evidence source ${expectedSource} missing from handoff summary`);
  }
}
if (evidenceSummary.theaterMaterialCounts.facts < 1) failures.push("fact material count missing");
if (evidenceSummary.theaterMaterialCounts.inferences < 1) failures.push("inference material count missing");
if (evidenceSummary.theaterMaterialCounts.unknowns < 1) failures.push("unknown material count missing");
if (handoff.sourceSummary.sourceCounts.relationshipConfirmationCards < 1) {
  failures.push("relationship confirmation source count missing");
}
if (handoff.sourceSummary.sourceCounts.meetingRelationshipSignals < 1) {
  failures.push("meeting relationship signal source count missing");
}
if (relationshipConfirmation.cardCount < 1) failures.push("relationship confirmation card summary missing");
if (relationshipConfirmation.highPriorityCount < 1) failures.push("relationship confirmation high-priority summary missing");
if (relationshipConfirmation.byStatus.inference + relationshipConfirmation.byStatus.unknown < 1) {
  failures.push("relationship confirmation inference/unknown boundary missing");
}
if (!relationshipConfirmation.actions.includes("ASK_OPEN_QUESTION")) {
  failures.push("relationship confirmation open-question action missing");
}
if (relationshipConfirmation.localAdvisorStatePersisted) {
  failures.push("relationship confirmation advisor local state was incorrectly marked persisted");
}
if (relationshipConfirmation.providerCallAttempted || relationshipConfirmation.aiUsageLogWritten) {
  failures.push("relationship confirmation handoff should be deterministic no-provider");
}
if (relationshipConfirmation.writesConfirmedCrmFact) {
  failures.push("relationship confirmation handoff wrote confirmed CRM fact");
}
if (relationshipConfirmation.storesRawProviderPayload || relationshipConfirmation.rawPrivateTranscriptIncluded) {
  failures.push("relationship confirmation handoff leaked raw provider/private transcript fields");
}
if (!handoff.knownMaterials.some((item) => item.includes("relationship_confirmation_card="))) {
  failures.push("relationship confirmation cards did not enter theater knownMaterials");
}
if (!handoff.knownMaterials.some((item) => item.includes("advisor_state=local_only_not_persisted"))) {
  failures.push("relationship confirmation local-only advisor state was not explicit in theater materials");
}
if (!handoff.knownMaterials.some((item) => item.includes("meeting_relationship_signal_card="))) {
  failures.push("meeting relationship signal cards did not enter theater knownMaterials");
}
if (!handoff.knownMaterials.some((item) => item.includes("writes_relationship_graph=false"))) {
  failures.push("meeting relationship signal relationship-graph write boundary missing");
}
if (handoff.packet.confirmedFacts.some((fact) => fact.includes("relationship_confirmation_card="))) {
  failures.push("relationship confirmation card leaked into confirmed theater facts");
}
if (
  meetingRelationshipSignals.byStatus.unknown > 0 &&
  !handoff.packet.narratorQuestions.some((question) => question.includes("meeting_relationship_signal_card="))
) {
  failures.push("unknown meeting relationship signal cards did not become narrator confirmation questions");
}
if (
  relationshipConfirmation.byStatus.unknown > 0 &&
  !handoff.packet.narratorQuestions.some((question) => question.includes("relationship_confirmation_card="))
) {
  failures.push("unknown relationship confirmation cards did not become narrator confirmation questions");
}
if (
  relationshipConfirmation.byStatus.unknown > 0 &&
  !handoff.missing.includes("關係確認卡仍有未知關係/欄位待現場確認")
) {
  failures.push("unknown relationship confirmation cards were not surfaced in missing list");
}
if (!handoff.warnings.includes("關係確認卡已帶入劇場作為待確認素材；顧問勾選狀態尚未持久化。")) {
  failures.push("relationship confirmation local-state warning missing");
}
if (!handoff.warnings.includes("會議關係訊號已帶入劇場作為待確認素材；不會寫回關係圖、VisitPlan 或 CRM 事實。")) {
  failures.push("meeting relationship signal no-write warning missing");
}
if (!handoff.missing.includes("會議關係訊號仍有未知關係脈絡待下一次拜訪確認")) {
  failures.push("unknown meeting relationship signal gap was not surfaced in missing list");
}
if (!handoff.missing.includes("準備包仍有待確認推論依據")) {
  failures.push("unknown reasoning gap was not surfaced in missing list");
}
if (
  serialized.includes("secret.client@example.com") ||
  serialized.includes("0912-345-678") ||
  serialized.includes("AB123456") ||
  serialized.includes("raw provider payload") ||
  serialized.includes("secret123")
) {
  failures.push("private email, phone, policy, raw payload, or secret leaked into handoff output");
}
if (meetingRelationshipSignals.cardCount < 1) failures.push("meeting relationship signal summary missing");
if (meetingRelationshipSignals.highPriorityCount < 1) failures.push("meeting relationship signal high-priority summary missing");
if (!meetingRelationshipSignals.actions.includes("ASK_IN_NEXT_VISIT")) {
  failures.push("meeting relationship signal next-visit action missing");
}
if (!meetingRelationshipSignals.ownerScopedVisitPlanRequired) {
  failures.push("meeting relationship signal owner-scope proof missing");
}
if (
  meetingRelationshipSignals.providerCallAttempted ||
  meetingRelationshipSignals.aiUsageLogWritten ||
  meetingRelationshipSignals.persistedToDatabase ||
  meetingRelationshipSignals.writesRelationshipGraph ||
  meetingRelationshipSignals.writesVisitPlan ||
  meetingRelationshipSignals.writesConfirmedCrmFact
) {
  failures.push("meeting relationship signal handoff crossed provider, persistence, graph, VisitPlan, or CRM write boundary");
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
      questionEvidenceByStatus: evidenceSummary.questionEvidenceByStatus,
      questionEvidenceSources: evidenceSummary.questionEvidenceSources,
      relationshipConfirmation,
      meetingRelationshipSignals,
      theaterMaterialCounts: evidenceSummary.theaterMaterialCounts,
      blockedHighSensitivityStatus: highSensitivityHandoff.status,
      approvedHighSensitivityStatus: approvedHighSensitivityHandoff.status,
    },
    null,
    2,
  ),
);
