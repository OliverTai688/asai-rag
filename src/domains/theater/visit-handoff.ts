import type { Client, FamilyMember, Policy } from "../client/types";
import { buildTheaterFieldBuildContext } from "../interview/theater-build";
import type { TheaterBuildPacket } from "../interview/types";
import {
  buildVisitRelationshipConfirmationDeck,
  type VisitRelationshipConfirmationAction,
  type VisitRelationshipConfirmationDeck,
} from "../visit/relationship-confirmation";
import type {
  ObjectionHandling,
  SpinQuestion,
  VisitMaterial,
  VisitQuestionEvidence,
  VisitQuestionEvidenceSource,
  VisitPlan,
  VisitPurpose,
  VisitQuestionEvidenceStatus,
} from "../visit/types";

export type VisitTheaterHandoffStatus = "READY" | "NEEDS_MORE_INFO" | "BLOCKED_SENSITIVE";

export interface VisitTheaterRelationshipConfirmationHandoffSummary {
  cardCount: number;
  highPriorityCount: number;
  byStatus: Record<VisitQuestionEvidenceStatus, number>;
  actions: VisitRelationshipConfirmationAction[];
  localAdvisorStatePersisted: false;
  providerCallAttempted: false;
  aiUsageLogWritten: false;
  writesConfirmedCrmFact: false;
  storesRawProviderPayload: false;
  rawPrivateTranscriptIncluded: false;
}

export interface VisitTheaterSensitivityApproval {
  riskAccepted: boolean;
  reason?: string;
}

export interface VisitTheaterHandoffInput {
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  client: Client;
  visitPlan: VisitPlan;
  sessionId?: string;
  now?: string;
  sensitivityApproval?: VisitTheaterSensitivityApproval;
}

export interface VisitTheaterHandoff {
  status: VisitTheaterHandoffStatus;
  knownMaterials: string[];
  packet: TheaterBuildPacket;
  warnings: string[];
  missing: string[];
  sourceSummary: {
    clientId: string;
    visitPlanId: string;
    sourceCounts: {
      objectives: number;
      spinQuestions: number;
      questionEvidence: number;
      familyMembers: number;
      policies: number;
      objections: number;
      visitMaterials: number;
      relationshipConfirmationCards: number;
    };
    evidenceSummary: {
      questionEvidenceByStatus: Record<VisitQuestionEvidenceStatus, number>;
      questionEvidenceSources: VisitQuestionEvidenceSource[];
      relationshipConfirmation: VisitTheaterRelationshipConfirmationHandoffSummary;
      theaterMaterialCounts: {
        facts: number;
        inferences: number;
        unknowns: number;
      };
    };
  };
}

const DEFAULT_SEGMENT_ID = "theater-focus";

export function buildVisitTheaterHandoff(input: VisitTheaterHandoffInput): VisitTheaterHandoff {
  const now = input.now ?? new Date().toISOString();
  const relationshipConfirmationDeck = buildVisitRelationshipConfirmationDeck(input.client, now);
  const knownMaterials = buildVisitTheaterKnownMaterials(input, relationshipConfirmationDeck);
  const context = buildTheaterFieldBuildContext({
    organizationId: input.organizationId,
    memberId: input.memberId,
    unitId: input.unitId ?? null,
    clientId: input.client.id,
    sessionId: input.sessionId ?? `visit_theater_${input.visitPlan.id}`,
    currentSegmentId: DEFAULT_SEGMENT_ID,
    messages: [],
    knownMaterials,
    now,
  });

  const warnings = buildWarnings(input, relationshipConfirmationDeck);
  const missing = buildMissingItems(input, relationshipConfirmationDeck);
  const blockedBySensitivity = isBlockedBySensitivity(input);
  const packet = blockedBySensitivity ? blockPacketForSensitivity(context.packet, input.client.name) : context.packet;

  return {
    status: blockedBySensitivity ? "BLOCKED_SENSITIVE" : packet.readiness,
    knownMaterials,
    packet,
    warnings,
    missing,
    sourceSummary: {
      clientId: input.client.id,
      visitPlanId: input.visitPlan.id,
      sourceCounts: {
        objectives: input.visitPlan.objectives.length,
        spinQuestions: input.visitPlan.spinQuestions.length,
        questionEvidence: countQuestionEvidence(input.visitPlan.spinQuestions),
        familyMembers: input.client.family.length,
        policies: input.client.existingPolicies.length,
        objections: input.visitPlan.objections.length,
        visitMaterials: input.visitPlan.materials.length,
        relationshipConfirmationCards: relationshipConfirmationDeck.summary.cardCount,
      },
      evidenceSummary: {
        questionEvidenceByStatus: countQuestionEvidenceByStatus(input.visitPlan.spinQuestions),
        questionEvidenceSources: collectQuestionEvidenceSources(input.visitPlan.spinQuestions),
        relationshipConfirmation: summarizeRelationshipConfirmationDeck(relationshipConfirmationDeck),
        theaterMaterialCounts: countTheaterMaterialsByPrefix(knownMaterials),
      },
    },
  };
}

export function buildVisitTheaterKnownMaterials(
  input: VisitTheaterHandoffInput,
  relationshipConfirmationDeck = buildVisitRelationshipConfirmationDeck(
    input.client,
    input.now ?? new Date().toISOString(),
  ),
): string[] {
  const { client, visitPlan } = input;
  const materials: string[] = [
    material("FACT", `focus_client=${client.name}`),
    material("FACT", `scenario=${buildScenario(client, visitPlan)}`),
    ...buildClientMaterials(client),
    ...visitPlan.objectives.map((objective) =>
      material("FACT", `拜訪目標：${objective.description}；成功條件：${objective.successCriteria}`),
    ),
    ...visitPlan.spinQuestions.flatMap((question) => buildQuestionMaterials(question)),
    ...buildRelationshipConfirmationMaterials(relationshipConfirmationDeck),
    ...visitPlan.objections.map((objection) => buildObjectionMaterial(objection)),
    ...visitPlan.materials.map((visitMaterial) => buildVisitMaterialEvidence(visitMaterial)),
  ];

  if (client.complianceChecklist.missingItems.length > 0) {
    materials.push(material("UNKNOWN", `合規待補：${client.complianceChecklist.missingItems.join("、")}`));
  }
  if (client.kycStatus !== "COMPLETE") {
    materials.push(material("UNKNOWN", `KYC 狀態尚未完整：${client.kycStatus}`));
  }
  if (client.sensitivityLevel !== "NORMAL") {
    materials.push(
      material(
        "UNKNOWN",
        `sensitive=${client.name} 屬${client.sensitivityLevel === "HIGHLY_SENSITIVE" ? "高敏感" : "敏感"}客戶，進劇場前需明確確認使用邊界。`,
      ),
    );
  }

  return unique(materials).slice(0, 60);
}

function buildRelationshipConfirmationMaterials(deck: VisitRelationshipConfirmationDeck): string[] {
  return deck.cards.map((card) =>
    material(
      prefixForEvidence(card.evidenceStatus),
      [
        `relationship_confirmation_card=${card.id}`,
        `relationship=關係確認卡：${card.title}`,
        card.personName ? `person=${card.personName}` : "",
        card.relation ? `relation=${card.relation}` : "",
        `status=${card.evidenceStatus}`,
        `action=${card.action}`,
        `priority=${card.priority}`,
        `source=${card.sourceLabel}`,
        `evidence=${card.evidenceDetail}`,
        `prompt=${card.confirmationPrompt}`,
        "advisor_state=local_only_not_persisted",
        "writes_confirmed_crm_fact=false",
      ]
        .filter(Boolean)
        .join("；"),
    ),
  );
}

function buildClientMaterials(client: Client): string[] {
  const materials: string[] = [];
  if (client.occupation) materials.push(material("FACT", `${client.name} 的職業是 ${client.occupation}`));
  if (client.annualIncome > 0) materials.push(material("FACT", `${client.name} 年收入約 ${formatCurrency(client.annualIncome)}`));
  materials.push(...client.family.flatMap((member) => buildFamilyMaterials(client.name, member)));
  materials.push(...client.existingPolicies.map((policy) => buildPolicyMaterial(client.name, policy)));
  materials.push(...client.aiTags.slice(0, 6).map((tag) => material("INFERENCE", `AI 缺口線索：${tag}`)));
  return materials;
}

function buildFamilyMaterials(clientName: string, member: FamilyMember): string[] {
  const role = inferCharacterRole(member.relation);
  return [
    material("INFERENCE", `npc=${member.name}|${role}`),
    material("FACT", `relationship=${clientName} 的${member.relation}：${member.name}`),
  ];
}

function buildPolicyMaterial(clientName: string, policy: Policy): string {
  return material("FACT", `${clientName} 已有保單：${policy.provider} ${policy.type}，保額 ${formatCurrency(policy.amount)}`);
}

function buildQuestionMaterials(question: SpinQuestion): string[] {
  const evidence = question.reasoning?.evidence ?? [];
  const questionText = `${question.type} 題「${question.question}」`;

  if (evidence.length === 0) {
    return [material("UNKNOWN", `${questionText} 尚未帶推論依據，進劇場前需由顧問確認。`)];
  }

  return evidence.flatMap((item) => {
    const prefix = prefixForEvidence(item.status);
    const detail = `${questionText} 依據：${item.label} - ${item.detail}`;
    if (item.source === "relationship_graph") {
      return [material(prefix, `relationship=${detail}`)];
    }
    if (item.source === "unknown") {
      return [material("UNKNOWN", detail)];
    }
    return [material(prefix, detail)];
  });
}

function buildObjectionMaterial(objection: ObjectionHandling): string {
  return material("INFERENCE", `objection=${objection.expectedObjection}；建議回應：${objection.suggestedResponse}`);
}

function buildVisitMaterialEvidence(visitMaterial: VisitMaterial): string {
  if (visitMaterial.checked) return material("FACT", `拜訪材料已確認：${visitMaterial.name}`);
  return material("UNKNOWN", `拜訪材料待確認：${visitMaterial.name}`);
}

function buildScenario(client: Client, visitPlan: VisitPlan): string {
  const objective = visitPlan.objectives[0]?.description;
  const purpose = PURPOSE_LABEL[visitPlan.purpose];
  return objective ? `${purpose}：${objective}` : `${purpose}：${client.name} 的拜訪準備包演練`;
}

function buildWarnings(
  input: VisitTheaterHandoffInput,
  relationshipConfirmationDeck: VisitRelationshipConfirmationDeck,
): string[] {
  const warnings: string[] = [];
  if (input.client.sensitivityLevel === "SENSITIVE") warnings.push("敏感客戶：進劇場前需確認演練素材邊界。");
  if (input.client.sensitivityLevel === "HIGHLY_SENSITIVE") {
    warnings.push("高敏感客戶：必須具備 reason 與 riskAccepted 才能建場。");
  }
  if (input.client.kycStatus !== "COMPLETE") warnings.push(`KYC 尚未完整：${input.client.kycStatus}。`);
  if (input.visitPlan.spinQuestions.some((question) => !question.reasoning?.evidence.length)) {
    warnings.push("部分準備包問題尚未具備推論依據。");
  }
  if (relationshipConfirmationDeck.summary.cardCount > 0) {
    warnings.push("關係確認卡已帶入劇場作為待確認素材；顧問勾選狀態尚未持久化。");
  }
  return warnings;
}

function buildMissingItems(
  input: VisitTheaterHandoffInput,
  relationshipConfirmationDeck: VisitRelationshipConfirmationDeck,
): string[] {
  const missing = [...input.client.complianceChecklist.missingItems];
  if (input.visitPlan.materials.some((item) => !item.checked)) missing.push("拜訪材料尚未全部確認");
  if (input.visitPlan.spinQuestions.some((question) => question.reasoning?.evidence.some((item) => item.status === "unknown"))) {
    missing.push("準備包仍有待確認推論依據");
  }
  if (relationshipConfirmationDeck.summary.unknownCount > 0) {
    missing.push("關係確認卡仍有未知關係/欄位待現場確認");
  }
  return unique(missing);
}

function isBlockedBySensitivity(input: VisitTheaterHandoffInput): boolean {
  if (input.client.sensitivityLevel !== "HIGHLY_SENSITIVE") return false;
  return !input.sensitivityApproval?.riskAccepted || !input.sensitivityApproval.reason?.trim();
}

function blockPacketForSensitivity(packet: TheaterBuildPacket, clientName: string): TheaterBuildPacket {
  const unknowns = unique([
    ...packet.unknowns,
    `${clientName} 是高敏感客戶，尚未提供建場 reason/riskAccepted，必須先停在待確認。`,
  ]);
  return {
    ...packet,
    readiness: "NEEDS_MORE_INFO",
    unknowns,
    narratorQuestions: unique([
      ...packet.narratorQuestions,
      "請先確認這次演練使用高敏感客戶資料的理由與風險接受範圍。",
    ]),
    routeBCompatibility: {
      ...packet.routeBCompatibility,
      canStartSimulation: false,
      migrationNote: "高敏感客戶尚未完成建場確認；不得啟動 Theater Route B 或 legacy 演練。",
    },
  };
}

function prefixForEvidence(status: VisitQuestionEvidenceStatus): "FACT" | "INFERENCE" | "UNKNOWN" {
  if (status === "confirmed") return "FACT";
  if (status === "inference") return "INFERENCE";
  return "UNKNOWN";
}

function inferCharacterRole(relation: string): "DECISION_MAKER" | "INFLUENCER" {
  if (relation.includes("配偶")) return "DECISION_MAKER";
  if (relation.includes("父") || relation.includes("母")) return "INFLUENCER";
  return "INFLUENCER";
}

function countQuestionEvidence(questions: SpinQuestion[]): number {
  return questions.reduce((count, question) => count + (question.reasoning?.evidence.length ?? 0), 0);
}

function collectQuestionEvidence(questions: SpinQuestion[]): VisitQuestionEvidence[] {
  return questions.flatMap((question) => question.reasoning?.evidence ?? []);
}

function countQuestionEvidenceByStatus(
  questions: SpinQuestion[],
): Record<VisitQuestionEvidenceStatus, number> {
  const counts: Record<VisitQuestionEvidenceStatus, number> = {
    confirmed: 0,
    inference: 0,
    unknown: 0,
  };

  for (const evidence of collectQuestionEvidence(questions)) {
    counts[evidence.status] += 1;
  }

  return counts;
}

function collectQuestionEvidenceSources(questions: SpinQuestion[]): VisitQuestionEvidenceSource[] {
  return Array.from(new Set(collectQuestionEvidence(questions).map((evidence) => evidence.source))).sort();
}

function summarizeRelationshipConfirmationDeck(
  deck: VisitRelationshipConfirmationDeck,
): VisitTheaterRelationshipConfirmationHandoffSummary {
  const byStatus: Record<VisitQuestionEvidenceStatus, number> = {
    confirmed: 0,
    inference: 0,
    unknown: 0,
  };

  for (const card of deck.cards) {
    byStatus[card.evidenceStatus] += 1;
  }

  return {
    cardCount: deck.summary.cardCount,
    highPriorityCount: deck.summary.highPriorityCount,
    byStatus,
    actions: Array.from(new Set(deck.cards.map((card) => card.action))).sort(),
    localAdvisorStatePersisted: false,
    providerCallAttempted: deck.proof.providerCallAttempted,
    aiUsageLogWritten: deck.proof.aiUsageLogWritten,
    writesConfirmedCrmFact: deck.proof.writesConfirmedCrmFact,
    storesRawProviderPayload: deck.proof.storesRawProviderPayload,
    rawPrivateTranscriptIncluded: deck.proof.rawPrivateTranscriptIncluded,
  };
}

function countTheaterMaterialsByPrefix(materials: string[]): VisitTheaterHandoff["sourceSummary"]["evidenceSummary"]["theaterMaterialCounts"] {
  return materials.reduce(
    (counts, item) => {
      if (item.startsWith("FACT:")) counts.facts += 1;
      if (item.startsWith("INFERENCE:")) counts.inferences += 1;
      if (item.startsWith("UNKNOWN:")) counts.unknowns += 1;
      return counts;
    },
    { facts: 0, inferences: 0, unknowns: 0 },
  );
}

function material(prefix: "FACT" | "INFERENCE" | "UNKNOWN", body: string): string {
  return `${prefix}: ${sanitizeMaterialText(body)}`;
}

function sanitizeMaterialText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[phone removed]")
    .trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "TWD",
  }).format(value);
}

const PURPOSE_LABEL: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};
