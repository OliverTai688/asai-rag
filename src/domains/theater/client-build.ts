import type { Client, FamilyMember, Policy } from "../client/types";
import { buildTheaterFieldBuildContext } from "../interview/theater-build";
import type { TheaterBuildPacket } from "../interview/types";

export type ClientTheaterBuildStatus = "READY" | "NEEDS_MORE_INFO" | "BLOCKED_SENSITIVE";

export interface ClientTheaterBuildInput {
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  client: Client;
  sessionId?: string;
  now?: string;
}

export interface ClientTheaterBuild {
  status: ClientTheaterBuildStatus;
  knownMaterials: string[];
  warnings: string[];
  missing: string[];
  sourceSummary: {
    clientId: string;
    sourceCounts: {
      familyMembers: number;
      policies: number;
      aiTags: number;
      complianceMissing: number;
    };
  };
  packet: TheaterBuildPacket;
}

export function buildClientTheaterBuild(input: ClientTheaterBuildInput): ClientTheaterBuild {
  const knownMaterials = buildClientTheaterKnownMaterials(input.client);
  const context = buildTheaterFieldBuildContext({
    organizationId: input.organizationId,
    memberId: input.memberId,
    unitId: input.unitId ?? null,
    clientId: input.client.id,
    sessionId: input.sessionId ?? `client_theater_${input.client.id}`,
    currentSegmentId: "theater-focus",
    messages: [],
    knownMaterials,
    now: input.now,
  });

  const warnings = buildWarnings(input.client);
  const missing = buildMissingItems(input.client);
  const blockedBySensitivity = input.client.sensitivityLevel === "HIGHLY_SENSITIVE";
  const packet = blockedBySensitivity ? blockPacketForSensitivity(context.packet, input.client.name) : context.packet;

  return {
    status: blockedBySensitivity ? "BLOCKED_SENSITIVE" : packet.readiness,
    knownMaterials,
    warnings,
    missing,
    sourceSummary: {
      clientId: input.client.id,
      sourceCounts: {
        familyMembers: input.client.family.length,
        policies: input.client.existingPolicies.length,
        aiTags: input.client.aiTags.length,
        complianceMissing: input.client.complianceChecklist.missingItems.length,
      },
    },
    packet,
  };
}

export function buildClientTheaterKnownMaterials(client: Client): string[] {
  const materials: string[] = [
    material("FACT", `focus_client=${client.name}`),
    material("FACT", `scenario=客戶資料建場：${client.name} 的保障脈絡與關係圖演練`),
  ];

  if (client.occupation) materials.push(material("FACT", `${client.name} 的職業是 ${client.occupation}`));
  if (client.annualIncome > 0) materials.push(material("FACT", `${client.name} 年收入約 ${formatCurrency(client.annualIncome)}`));
  materials.push(...client.family.flatMap((member) => buildFamilyMaterials(client.name, member)));
  materials.push(...client.existingPolicies.map((policy) => buildPolicyMaterial(client.name, policy)));
  materials.push(...client.aiTags.slice(0, 6).map((tag) => material("INFERENCE", `AI 缺口線索：${tag}`)));

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

function buildFamilyMaterials(clientName: string, member: FamilyMember): string[] {
  const role = member.relation.includes("配偶") ? "DECISION_MAKER" : "INFLUENCER";
  return [
    material("INFERENCE", `npc=${member.name}|${role}`),
    material("FACT", `relationship=${clientName} 的${member.relation}：${member.name}`),
  ];
}

function buildPolicyMaterial(clientName: string, policy: Policy): string {
  return material("FACT", `${clientName} 已有保單：${policy.provider} ${policy.type}，保額 ${formatCurrency(policy.amount)}`);
}

function buildWarnings(client: Client): string[] {
  const warnings: string[] = [];
  if (client.sensitivityLevel === "SENSITIVE") warnings.push("敏感客戶：進劇場前需確認演練素材邊界。");
  if (client.sensitivityLevel === "HIGHLY_SENSITIVE") warnings.push("高敏感客戶：不可用客戶直建場繞過 reason/riskAccepted gate。");
  if (client.kycStatus !== "COMPLETE") warnings.push(`KYC 尚未完整：${client.kycStatus}。`);
  return warnings;
}

function buildMissingItems(client: Client): string[] {
  const missing = [...client.complianceChecklist.missingItems];
  if (client.family.length === 0) missing.push("尚未建立關係圖人物");
  if (client.existingPolicies.length === 0) missing.push("尚未建立既有保單");
  if (client.aiTags.length === 0) missing.push("尚未有 AI 推論缺口標籤");
  return unique(missing);
}

function blockPacketForSensitivity(packet: TheaterBuildPacket, clientName: string): TheaterBuildPacket {
  const unknowns = unique([
    ...packet.unknowns,
    `${clientName} 是高敏感客戶，客戶資料直建場必須停在 gate，請改從準備包高敏感 approval flow 進入。`,
  ]);

  return {
    ...packet,
    readiness: "NEEDS_MORE_INFO",
    unknowns,
    routeBCompatibility: {
      ...packet.routeBCompatibility,
      canStartSimulation: false,
      migrationNote: `${packet.routeBCompatibility.migrationNote} 高敏感客戶缺 reason/riskAccepted 時不可建場。`,
    },
  };
}

function material(kind: "FACT" | "INFERENCE" | "UNKNOWN", text: string): string {
  return `${kind}: ${text}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}
