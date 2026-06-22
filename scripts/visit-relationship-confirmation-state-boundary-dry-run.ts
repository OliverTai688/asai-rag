import { readFileSync } from "node:fs";
import type { Client } from "../src/domains/client/types";
import { buildVisitRelationshipConfirmationDeck } from "../src/domains/visit/relationship-confirmation";
import { buildVisitRelationshipConfirmationStateBoundary } from "../src/domains/visit/relationship-confirmation-state";

const contactEmailSentinel = "sentinel.relationship-state@example.com";
const contactPhoneSentinel = "0912-111-222";
const now = "2026-06-22T15:31:25.187Z";

const demoClient: Client = {
  id: "demo_client_relationship_confirmation_state",
  name: "林怡君",
  email: contactEmailSentinel,
  phone: contactPhoneSentinel,
  birthDate: "1982-04-12",
  occupation: "",
  annualIncome: 0,
  family: [
    { id: "spouse", relation: "配偶", name: "陳志明", age: 43 },
    { id: "child", relation: "女", name: "陳小芸", age: 11 },
    { id: "friend", relation: "朋友", name: "周顧問" },
  ],
  existingPolicies: [{ id: "policy-1", type: "醫療險", provider: "Nuva Life", amount: 900000 }],
  tags: [],
  aiTags: ["家庭責任待釐清", "教育金缺口"],
  status: "ACTIVE",
  complianceChecklist: {
    kycStatus: "PARTIAL",
    suitabilityStatus: "MISSING",
    consentStatus: "PARTIAL",
    missingItems: ["適合度評估"],
  },
  sensitivityLevel: "NORMAL",
  kycStatus: "PARTIAL",
  lastInteraction: now,
};

const deck = buildVisitRelationshipConfirmationDeck(demoClient, now);
const firstCard = deck.cards[0];
const secondCard = deck.cards[1];

if (!firstCard || !secondCard) {
  throw new Error("relationship confirmation deck fixture needs at least two cards");
}

const boundary = buildVisitRelationshipConfirmationStateBoundary({
  visitPlanId: "visit_plan_relationship_confirmation_state",
  clientId: demoClient.id,
  deck,
  now,
  states: [
    {
      cardId: firstCard.id,
      state: "confirmed_in_meeting",
      updatedAt: "2026-06-22T15:32:00.000Z",
      safeNoteSummary: `advisor confirmed by phone ${contactPhoneSentinel} and email ${contactEmailSentinel}`,
    },
    {
      cardId: secondCard.id,
      state: "ask_in_interview",
      updatedAt: "not-a-date",
      safeNoteSummary: "turn this into a neutral open question",
    },
    {
      cardId: "missing-card",
      state: "confirmed_in_meeting",
      safeNoteSummary: "should be dropped",
    },
  ],
});

const failures: string[] = [];
const serialized = JSON.stringify(boundary);
const routeSource = readFileSync(
  "src/app/api/visits/[id]/relationship-confirmation-state/route.ts",
  "utf8",
);

if (boundary.agentId !== "asai.visit.preparation_package") failures.push("unexpected agent id");
if (boundary.sourceActionId !== "relationship-confirmation-card-state-boundary") {
  failures.push("unexpected source action id");
}
if (boundary.summary.cardCount !== deck.summary.cardCount) failures.push("card count mismatch");
if (boundary.summary.acceptedRecordCount !== deck.summary.cardCount) failures.push("accepted record count mismatch");
if (boundary.summary.droppedRecordCount !== 1) failures.push("unknown card id was not dropped");
if (boundary.summary.confirmedCount !== 1) failures.push("confirmed state count mismatch");
if (boundary.summary.askInInterviewCount !== 1) failures.push("ask-in-interview state count mismatch");
if (!boundary.storageDecision.requiresProductDecision) failures.push("persistence decision should stay explicit");
if (boundary.storageDecision.currentPersistence !== "local-only-ui-state") failures.push("current persistence mismatch");
if (boundary.proof.providerCallAttempted) failures.push("provider call should be false");
if (boundary.proof.aiUsageLogWritten) failures.push("ai usage log should be false for no-provider proof");
if (boundary.proof.writesConfirmedCrmFact) failures.push("confirmed CRM fact write should be false");
if (boundary.proof.persistedToDatabase) failures.push("boundary must not claim DB persistence");
if (serialized.includes(contactEmailSentinel) || serialized.includes(contactPhoneSentinel)) {
  failures.push("contact sentinel leaked through safe note summary");
}
if (!serialized.includes("[redacted-email]") || !serialized.includes("[redacted-phone]")) {
  failures.push("safe note summary redaction evidence missing");
}

for (const record of boundary.records) {
  const keys = Object.keys(record);
  const disallowedKeys = keys.filter(
    (key) => !["cardId", "state", "updatedAt", "sourceReferenceIds", "safeNoteSummary"].includes(key),
  );

  if (disallowedKeys.length > 0) {
    failures.push(`record ${record.cardId} leaked disallowed fields: ${disallowedKeys.join(", ")}`);
  }
  if (!record.sourceReferenceIds.length) {
    failures.push(`record ${record.cardId} is missing evidence refs`);
  }
}

if (!routeSource.includes("requireCurrentMember")) failures.push("route must require current member");
if (!routeSource.includes("getVisitPlanForMember")) failures.push("route must derive owner-scoped visit plan");
if (!routeSource.includes("buildVisitRelationshipConfirmationStateBoundary")) {
  failures.push("route must use relationship confirmation state boundary");
}
if (routeSource.includes("updateVisitPlanForMember") || routeSource.includes("prisma.")) {
  failures.push("route must not write VisitPlan or use direct prisma persistence");
}
if (!routeSource.includes('"Cache-Control": "no-store"')) failures.push("route response should be no-store");

if (failures.length > 0) {
  console.error(`visit relationship confirmation state boundary dry-run failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      sourceActionId: boundary.sourceActionId,
      cardCount: boundary.summary.cardCount,
      confirmedCount: boundary.summary.confirmedCount,
      askInInterviewCount: boundary.summary.askInInterviewCount,
      droppedRecordCount: boundary.summary.droppedRecordCount,
      currentPersistence: boundary.storageDecision.currentPersistence,
      requiresProductDecision: boundary.storageDecision.requiresProductDecision,
      providerCallAttempted: boundary.proof.providerCallAttempted,
      writesConfirmedCrmFact: boundary.proof.writesConfirmedCrmFact,
      persistedToDatabase: boundary.proof.persistedToDatabase,
    },
    null,
    2,
  ),
);
