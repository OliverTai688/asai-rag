import type { Client } from "../src/domains/client/types";
import { enrichSpinQuestionsWithReasoning } from "../src/domains/visit/reasoning";
import type { SpinQuestion } from "../src/domains/visit/types";

const demoClient: Client = {
  id: "demo_client_lv3_reasoning",
  name: "王大明",
  email: "",
  phone: "",
  birthDate: "1980-01-01",
  occupation: "科技業主管",
  annualIncome: 2200000,
  family: [
    { id: "spouse", relation: "配偶", name: "張麗華" },
    { id: "child", relation: "子", name: "王小明", age: 12 },
  ],
  existingPolicies: [
    { id: "policy-1", type: "醫療險", provider: "Nuva Life", amount: 1000000 },
  ],
  tags: [],
  aiTags: ["教育金缺口", "醫療保障不足"],
  status: "ACTIVE",
  complianceChecklist: {
    kycStatus: "MISSING",
    suitabilityStatus: "MISSING",
    consentStatus: "MISSING",
    missingItems: [],
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

const enriched = enrichSpinQuestionsWithReasoning(questions, {
  client: demoClient,
  purpose: "ADD_ON",
});

const failures: string[] = [];

if (enriched.length !== questions.length) failures.push("question count changed");
if (enriched.some((question) => !question.reasoning?.summary)) failures.push("missing reasoning summary");
if (enriched.some((question) => !question.reasoning?.evidence.length)) failures.push("missing evidence");
if (!enriched.some((question) => question.reasoning?.evidence.some((item) => item.source === "relationship_graph"))) {
  failures.push("relationship graph evidence missing");
}
if (!enriched.some((question) => question.reasoning?.evidence.some((item) => item.source === "policy"))) {
  failures.push("policy evidence missing");
}
if (!enriched.some((question) => question.reasoning?.evidence.some((item) => item.status === "inference"))) {
  failures.push("inference label missing");
}
if (!enriched.some((question) => question.reasoning?.evidence.some((item) => item.status === "unknown"))) {
  failures.push("unknown label missing");
}
if (JSON.stringify(enriched).includes("phone")) failures.push("private phone field leaked");

if (failures.length > 0) {
  console.error(`visit reasoning dry-run failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      questions: enriched.length,
      evidenceSources: Array.from(
        new Set(enriched.flatMap((question) => question.reasoning?.evidence.map((item) => item.source) ?? [])),
      ).sort(),
      evidenceStatuses: Array.from(
        new Set(enriched.flatMap((question) => question.reasoning?.evidence.map((item) => item.status) ?? [])),
      ).sort(),
    },
    null,
    2,
  ),
);
