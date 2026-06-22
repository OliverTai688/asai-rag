import type { Client } from "../src/domains/client/types";
import { buildVisitRelationshipConfirmationDeck } from "../src/domains/visit/relationship-confirmation";

const contactEmailSentinel = "sentinel.relationship@example.com";
const contactPhoneSentinel = "0912-345-678";

const demoClient: Client = {
  id: "demo_client_relationship_confirmation",
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
  existingPolicies: [
    { id: "policy-1", type: "醫療險", provider: "Nuva Life", amount: 900000 },
  ],
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
  lastInteraction: "2026-06-22T00:00:00.000Z",
};

const deck = buildVisitRelationshipConfirmationDeck(demoClient, "2026-06-22T14:28:09.298Z");
const failures: string[] = [];
const serialized = JSON.stringify(deck);

if (deck.agentId !== "asai.visit.preparation_package") failures.push("unexpected agent id");
if (deck.sourceActionId !== "relationship-graph-prep-confirmation-cards") failures.push("unexpected source action id");
if (deck.summary.cardCount === 0) failures.push("no confirmation cards");
if (deck.summary.inferenceCount === 0) failures.push("missing inference cards");
if (deck.summary.unknownCount === 0) failures.push("missing unknown cards");
if (deck.summary.highPriorityCount === 0) failures.push("missing high priority card");
if (!deck.cards.some((card) => card.sourceReferenceIds.some((id) => id.includes("relationship")))) {
  failures.push("relationship graph source references missing");
}
if (!deck.cards.some((card) => card.kind === "person_field")) failures.push("person field cards missing");
if (!deck.cards.some((card) => card.kind === "person_role")) failures.push("person role cards missing");
if (serialized.includes(contactEmailSentinel) || serialized.includes(contactPhoneSentinel)) {
  failures.push("private contact sentinel leaked");
}
if (deck.proof.providerCallAttempted) failures.push("provider call should be false");
if (deck.proof.aiUsageLogWritten) failures.push("ai usage log should be false for no-provider proof");
if (deck.proof.writesConfirmedCrmFact) failures.push("confirmed CRM fact write should be false");
if (deck.proof.storesRawProviderPayload) failures.push("raw provider payload storage should be false");
if (deck.proof.externalRegistryPublication) failures.push("external registry publication should be false");
if (deck.cards.some((card) => card.guardrails.providerCallAttempted)) failures.push("card provider guardrail should be false");
if (deck.cards.some((card) => card.guardrails.writesConfirmedCrmFact)) failures.push("card CRM write guardrail should be false");

if (failures.length > 0) {
  console.error(`visit relationship confirmation dry-run failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      sourceActionId: deck.sourceActionId,
      cardCount: deck.summary.cardCount,
      highPriorityCount: deck.summary.highPriorityCount,
      evidenceStatuses: Array.from(new Set(deck.cards.map((card) => card.evidenceStatus))).sort(),
      cardKinds: Array.from(new Set(deck.cards.map((card) => card.kind))).sort(),
      providerCallAttempted: deck.proof.providerCallAttempted,
      writesConfirmedCrmFact: deck.proof.writesConfirmedCrmFact,
    },
    null,
    2,
  ),
);
