import type { Client, FamilyMember, Policy } from "../client/types";
import type { FamilyMemberProfileFactStatus, FamilyMemberProfileField } from "../client/family-member-profile";
import type { RelationshipEdgeShadowBffSummary } from "../client/relationship-edge-shadow";
import {
  buildRelationshipEdgeShadowBackfill,
  toRelationshipEdgeShadowBffSummary,
} from "../client/relationship-edge-shadow";
import { buildTheaterFieldBuildContext } from "../interview/theater-build";
import type { TheaterBuildPacket } from "../interview/types";
import {
  buildVisitRelationshipConfirmationDeck,
  type VisitRelationshipConfirmationAction,
  type VisitRelationshipConfirmationDeck,
} from "../visit/relationship-confirmation";
import type {
  VisitMeetingRelationshipSignalAction,
  VisitMeetingRelationshipSignalDeck,
  VisitMeetingRelationshipSignalSourceType,
} from "../visit/meeting-relationship-signal";
import { VISIT_MEETING_RELATIONSHIP_SIGNAL_SOURCE_TYPES } from "../visit/meeting-relationship-signal";
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

export interface VisitTheaterMeetingRelationshipSignalHandoffSummary {
  cardCount: number;
  highPriorityCount: number;
  byStatus: Record<VisitQuestionEvidenceStatus, number>;
  bySourceType: Record<VisitMeetingRelationshipSignalSourceType, number>;
  actions: VisitMeetingRelationshipSignalAction[];
  meetingSourceCount: number;
  narratorQuestionCount: number;
  ownerScopedVisitPlanRequired: true;
  providerCallAttempted: false;
  aiUsageLogWritten: false;
  persistedToDatabase: false;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
  writesConfirmedCrmFact: false;
  storesRawProviderPayload: false;
  rawPrivateTranscriptIncluded: false;
}

export interface VisitTheaterRelationshipEdgeShadowHandoffSummary extends RelationshipEdgeShadowBffSummary {
  persistedToDatabase: false;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
  writesConfirmedCrmFact: false;
  storesRawProviderPayload: false;
  rawPrivateTranscriptIncluded: false;
}

export interface VisitTheaterFamilyProfileHandoffSummary {
  memberCount: number;
  profiledMemberCount: number;
  fieldCount: number;
  knownFieldCount: number;
  sourceReferenceCount: number;
  byFactStatus: Record<FamilyMemberProfileFactStatus, number>;
  providerCallAttempted: false;
  aiUsageLogWritten: false;
  persistedToDatabase: false;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
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
  meetingRelationshipSignalDeck?: VisitMeetingRelationshipSignalDeck | null;
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
      meetingRelationshipSignals: number;
      relationshipEdgeShadowCandidates: number;
      familyProfileFields: number;
    };
    evidenceSummary: {
      questionEvidenceByStatus: Record<VisitQuestionEvidenceStatus, number>;
      questionEvidenceSources: VisitQuestionEvidenceSource[];
      relationshipConfirmation: VisitTheaterRelationshipConfirmationHandoffSummary;
      meetingRelationshipSignals: VisitTheaterMeetingRelationshipSignalHandoffSummary;
      relationshipEdgeShadow: VisitTheaterRelationshipEdgeShadowHandoffSummary;
      familyProfiles: VisitTheaterFamilyProfileHandoffSummary;
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
  const meetingRelationshipSignalDeck = input.meetingRelationshipSignalDeck ?? null;
  const relationshipEdgeShadow = buildVisitTheaterRelationshipEdgeShadowSummary(input.client, now);
  const familyProfiles = summarizeFamilyProfiles(input.client);
  const knownMaterials = buildVisitTheaterKnownMaterials(
    input,
    relationshipConfirmationDeck,
    meetingRelationshipSignalDeck,
    relationshipEdgeShadow,
  );
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

  const warnings = buildWarnings(
    input,
    relationshipConfirmationDeck,
    meetingRelationshipSignalDeck,
    relationshipEdgeShadow,
  );
  const missing = buildMissingItems(
    input,
    relationshipConfirmationDeck,
    meetingRelationshipSignalDeck,
    relationshipEdgeShadow,
  );
  const blockedBySensitivity = isBlockedBySensitivity(input);
  const packetWithMeetingQuestions = addMeetingSignalNarratorQuestions(context.packet, meetingRelationshipSignalDeck);
  const packet = blockedBySensitivity
    ? blockPacketForSensitivity(packetWithMeetingQuestions, input.client.name)
    : packetWithMeetingQuestions;

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
        meetingRelationshipSignals: meetingRelationshipSignalDeck?.summary.cardCount ?? 0,
        relationshipEdgeShadowCandidates: relationshipEdgeShadow.draftEdgeCount,
        familyProfileFields: familyProfiles.fieldCount,
      },
      evidenceSummary: {
        questionEvidenceByStatus: countQuestionEvidenceByStatus(input.visitPlan.spinQuestions),
        questionEvidenceSources: collectQuestionEvidenceSources(input.visitPlan.spinQuestions),
        relationshipConfirmation: summarizeRelationshipConfirmationDeck(relationshipConfirmationDeck),
        meetingRelationshipSignals: summarizeMeetingRelationshipSignalDeck(meetingRelationshipSignalDeck),
        relationshipEdgeShadow,
        familyProfiles,
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
  meetingRelationshipSignalDeck = input.meetingRelationshipSignalDeck ?? null,
  relationshipEdgeShadow = buildVisitTheaterRelationshipEdgeShadowSummary(
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
    ...buildMeetingRelationshipSignalMaterials(meetingRelationshipSignalDeck),
    ...buildRelationshipEdgeShadowMaterials(relationshipEdgeShadow),
    ...buildFamilyProfileMaterials(client),
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

function buildVisitTheaterRelationshipEdgeShadowSummary(
  client: Client,
  now: string,
): VisitTheaterRelationshipEdgeShadowHandoffSummary {
  const summary = toRelationshipEdgeShadowBffSummary(buildRelationshipEdgeShadowBackfill(client, { now }));

  return {
    ...summary,
    persistedToDatabase: false,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesConfirmedCrmFact: false,
    storesRawProviderPayload: false,
    rawPrivateTranscriptIncluded: false,
  };
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

function buildMeetingRelationshipSignalMaterials(deck: VisitMeetingRelationshipSignalDeck | null): string[] {
  if (!deck?.cards.length) return [];

  return deck.cards.map((card) =>
    material(
      prefixForEvidence(card.evidenceStatus),
      [
        `meeting_relationship_signal_card=${card.id}`,
        `relationship=會議關係訊號：${card.title}`,
        `status=${card.evidenceStatus}`,
        `action=${card.recommendedAction}`,
        `priority=${card.priority}`,
        `source_type=${card.sourceType}`,
        `source=${card.sourceLabel}`,
        `summary=${card.safeSummary}`,
        `prompt=${card.confirmationPrompt}`,
        card.sourceReferenceIds.length > 0 ? `source_refs=${card.sourceReferenceIds.slice(0, 3).join(",")}` : "",
        "advisor_confirmation_required=true",
        "persisted_to_database=false",
        "writes_relationship_graph=false",
        "writes_visit_plan=false",
        "writes_confirmed_crm_fact=false",
      ]
        .filter(Boolean)
        .join("；"),
    ),
  );
}

function buildRelationshipEdgeShadowMaterials(summary: VisitTheaterRelationshipEdgeShadowHandoffSummary): string[] {
  if (summary.draftEdgeCount === 0) return [];

  const typeCounts = Object.entries(summary.counts.byType)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${type}:${count}`)
    .join(",");
  const statusCounts = Object.entries(summary.counts.byFactStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${status}:${count}`)
    .join(",");

  return [
    material(
      summary.warningCodes.length > 0 ? "UNKNOWN" : "INFERENCE",
      [
        "relationship_edge_shadow_summary=true",
        `candidate_edges=${summary.draftEdgeCount}`,
        `source_members=${summary.sourceMemberCount}`,
        `edge_types=${typeCounts || "none"}`,
        `fact_status=${statusCounts || "none"}`,
        summary.warningCodes.length > 0 ? `warning_codes=${summary.warningCodes.join(",")}` : "warning_codes=none",
        summary.unsupportedRelations.length > 0 ? `unsupported_relations=${summary.unsupportedRelations.join(",")}` : "",
        "client_facing_draft_edges_returned=false",
        "formal_schema_approved=false",
        "writes_relationship_graph=false",
        "writes_visit_plan=false",
        "writes_confirmed_crm_fact=false",
        "persisted_to_database=false",
      ]
        .filter(Boolean)
        .join("；"),
    ),
  ];
}

function buildFamilyProfileMaterials(client: Client): string[] {
  return client.family.flatMap((member) =>
    familyProfileFieldEntries(member).map(({ field, key, label }) =>
      material(
        prefixForFamilyProfileFactStatus(field.factStatus),
        [
          "family_profile_field=true",
          fieldPart("field", key),
          fieldPart("label", label),
          fieldPart("person", member.name),
          fieldPart("relation", member.relation),
          fieldPart("value", field.value),
          fieldPart("status", field.factStatus),
          `relationship=人物脈絡：${member.name}（${member.relation}）${label}：${field.value}`,
          field.sourceReferenceIds.length > 0 ? fieldPart("source_refs", field.sourceReferenceIds.slice(0, 3).join(",")) : "",
          field.rationale ? fieldPart("rationale", field.rationale) : "",
          "advisor_confirmation_required=true",
          "writes_relationship_graph=false",
          "writes_visit_plan=false",
          "writes_confirmed_crm_fact=false",
          "persisted_to_database=false",
        ]
          .filter(Boolean)
          .join("；"),
      ),
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
  meetingRelationshipSignalDeck: VisitMeetingRelationshipSignalDeck | null,
  relationshipEdgeShadow: VisitTheaterRelationshipEdgeShadowHandoffSummary,
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
  if (meetingRelationshipSignalDeck?.summary.cardCount) {
    warnings.push("會議關係訊號已帶入劇場作為待確認素材；不會寫回關係圖、VisitPlan 或 CRM 事實。");
  }
  if (relationshipEdgeShadow.draftEdgeCount > 0) {
    warnings.push("RelationshipEdge shadow summary 已帶入劇場作為 edge-model readiness；不回傳 draft edges、不寫回關係圖。");
  }
  if (relationshipEdgeShadow.warningCodes.length > 0) {
    warnings.push("RelationshipEdge shadow summary 含待確認 warning；正式 edge table migration 前仍需人工審查。");
  }
  if (summarizeFamilyProfiles(input.client).fieldCount > 0) {
    warnings.push("Family profile metadata 已帶入劇場建場來源審查；只作 stage grounding，不寫回關係圖、VisitPlan 或 CRM 事實。");
  }
  return warnings;
}

function buildMissingItems(
  input: VisitTheaterHandoffInput,
  relationshipConfirmationDeck: VisitRelationshipConfirmationDeck,
  meetingRelationshipSignalDeck: VisitMeetingRelationshipSignalDeck | null,
  relationshipEdgeShadow: VisitTheaterRelationshipEdgeShadowHandoffSummary,
): string[] {
  const missing = [...input.client.complianceChecklist.missingItems];
  if (input.visitPlan.materials.some((item) => !item.checked)) missing.push("拜訪材料尚未全部確認");
  if (input.visitPlan.spinQuestions.some((question) => question.reasoning?.evidence.some((item) => item.status === "unknown"))) {
    missing.push("準備包仍有待確認推論依據");
  }
  if (relationshipConfirmationDeck.summary.unknownCount > 0) {
    missing.push("關係確認卡仍有未知關係/欄位待現場確認");
  }
  if (meetingRelationshipSignalDeck?.summary.unknownCount) {
    missing.push("會議關係訊號仍有未知關係脈絡待下一次拜訪確認");
  }
  if (!relationshipEdgeShadow.proof.formalSchemaApproved) {
    missing.push("正式 RelationshipEdge schema 尚未核可；劇場只能使用安全摘要，不可寫回關係圖");
  }
  if (relationshipEdgeShadow.warningCodes.length > 0) {
    missing.push("RelationshipEdge shadow summary 仍有待確認 warning");
  }
  if (summarizeFamilyProfiles(input.client).byFactStatus.UNKNOWN > 0) {
    missing.push("Family profile metadata 仍有 UNKNOWN 人物欄位待現場確認");
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

function addMeetingSignalNarratorQuestions(
  packet: TheaterBuildPacket,
  deck: VisitMeetingRelationshipSignalDeck | null,
): TheaterBuildPacket {
  const questions =
    deck?.cards
      .filter((card) => card.evidenceStatus === "unknown" || card.recommendedAction === "ASK_IN_NEXT_VISIT")
      .map((card) => `meeting_relationship_signal_card=${card.id}：${card.confirmationPrompt}`) ?? [];

  if (questions.length === 0) return packet;

  return {
    ...packet,
    narratorQuestions: unique([...packet.narratorQuestions, ...questions]),
  };
}

function prefixForEvidence(status: VisitQuestionEvidenceStatus): "FACT" | "INFERENCE" | "UNKNOWN" {
  if (status === "confirmed") return "FACT";
  if (status === "inference") return "INFERENCE";
  return "UNKNOWN";
}

function prefixForFamilyProfileFactStatus(status: FamilyMemberProfileFactStatus): "FACT" | "INFERENCE" | "UNKNOWN" {
  return status;
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

function summarizeMeetingRelationshipSignalDeck(
  deck: VisitMeetingRelationshipSignalDeck | null,
): VisitTheaterMeetingRelationshipSignalHandoffSummary {
  const byStatus: Record<VisitQuestionEvidenceStatus, number> = {
    confirmed: 0,
    inference: 0,
    unknown: 0,
  };
  const bySourceType = Object.fromEntries(
    VISIT_MEETING_RELATIONSHIP_SIGNAL_SOURCE_TYPES.map((sourceType) => [sourceType, 0]),
  ) as Record<VisitMeetingRelationshipSignalSourceType, number>;

  for (const card of deck?.cards ?? []) {
    byStatus[card.evidenceStatus] += 1;
    bySourceType[card.sourceType] += 1;
  }

  return {
    cardCount: deck?.summary.cardCount ?? 0,
    highPriorityCount: deck?.summary.highPriorityCount ?? 0,
    byStatus,
    bySourceType,
    actions: Array.from(new Set((deck?.cards ?? []).map((card) => card.recommendedAction))).sort() as VisitMeetingRelationshipSignalAction[],
    meetingSourceCount: deck?.summary.meetingSourceCount ?? 0,
    narratorQuestionCount:
      deck?.cards.filter((card) => card.evidenceStatus === "unknown" || card.recommendedAction === "ASK_IN_NEXT_VISIT")
        .length ?? 0,
    ownerScopedVisitPlanRequired: true,
    providerCallAttempted: deck?.proof.providerCallAttempted ?? false,
    aiUsageLogWritten: deck?.proof.aiUsageLogWritten ?? false,
    persistedToDatabase: deck?.proof.persistedToDatabase ?? false,
    writesRelationshipGraph: deck?.writebackBoundary.writesRelationshipGraph ?? false,
    writesVisitPlan: deck?.writebackBoundary.writesVisitPlan ?? false,
    writesConfirmedCrmFact: deck?.proof.writesConfirmedCrmFact ?? false,
    storesRawProviderPayload: deck?.proof.storesRawProviderPayload ?? false,
    rawPrivateTranscriptIncluded: deck?.proof.rawPrivateTranscriptIncluded ?? false,
  };
}

function summarizeFamilyProfiles(client: Client): VisitTheaterFamilyProfileHandoffSummary {
  const byFactStatus: Record<FamilyMemberProfileFactStatus, number> = {
    FACT: 0,
    INFERENCE: 0,
    UNKNOWN: 0,
  };
  let fieldCount = 0;
  let knownFieldCount = 0;
  let profiledMemberCount = 0;
  const sourceReferenceIds = new Set<string>();

  for (const member of client.family) {
    const entries = familyProfileFieldEntries(member);
    if (entries.length > 0) profiledMemberCount += 1;

    for (const { field } of entries) {
      fieldCount += 1;
      byFactStatus[field.factStatus] += 1;
      if (field.factStatus !== "UNKNOWN") knownFieldCount += 1;
      for (const sourceReferenceId of field.sourceReferenceIds) sourceReferenceIds.add(sourceReferenceId);
    }

    for (const sourceReference of member.profile?.sourceReferences ?? []) {
      sourceReferenceIds.add(sourceReference.id);
    }
  }

  return {
    memberCount: client.family.length,
    profiledMemberCount,
    fieldCount,
    knownFieldCount,
    sourceReferenceCount: sourceReferenceIds.size,
    byFactStatus,
    providerCallAttempted: false,
    aiUsageLogWritten: false,
    persistedToDatabase: false,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesConfirmedCrmFact: false,
    storesRawProviderPayload: false,
    rawPrivateTranscriptIncluded: false,
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

function fieldPart(key: string, value: string): string {
  return `${key}=${sanitizeMaterialText(value).replace(/[;；\n]+/g, " ").trim()}`;
}

function familyProfileFieldEntries(member: FamilyMember): Array<{
  key: "jobTitle" | "annualIncomeOrDependency" | "personStatus" | "decisionRole" | "relationshipContext";
  label: string;
  field: FamilyMemberProfileField;
}> {
  const profile = member.profile;
  if (!profile) return [];

  return [
    { key: "jobTitle", label: "職位/職業", field: profile.jobTitle },
    { key: "annualIncomeOrDependency", label: "年收入/財務依賴", field: profile.annualIncomeOrDependency },
    { key: "personStatus", label: "人物狀態", field: profile.personStatus },
    { key: "decisionRole", label: "決策角色", field: profile.decisionRole },
    { key: "relationshipContext", label: "關係脈絡", field: profile.relationshipContext },
  ].filter((entry): entry is {
    key: "jobTitle" | "annualIncomeOrDependency" | "personStatus" | "decisionRole" | "relationshipContext";
    label: string;
    field: FamilyMemberProfileField;
  } => Boolean(entry.field?.value));
}

function sanitizeMaterialText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[phone removed]")
    .replace(/(保單(?:號碼|號)?[:：]?\s*)[A-Za-z0-9-]{4,}/g, "$1[policy removed]")
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{8,}|bearer\s+[A-Za-z0-9._-]+|token\s*[:=]{1,2}\s*[A-Za-z0-9._-]+|cookie\s*[:=]{1,2}\s*[^,\s]+|otp\s*[:=]{1,2}\s*\d{4,8})\b/gi,
      "[secret removed]",
    )
    .replace(/\braw\s+(?:provider\s+payload|private\s+transcript)\b/gi, "[raw payload removed]")
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
