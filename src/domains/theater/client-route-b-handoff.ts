import type { Client, FamilyMember } from "../client/types";
import { buildClientTheaterBuild, type ClientTheaterBuild, type ClientTheaterBuildInput } from "./client-build";
import {
  buildTheaterRouteBFamilyProfileGroundingSummary,
  buildTheaterRouteBHandoff,
  type TheaterRouteBFamilyProfileGroundingInput,
  type TheaterRouteBFamilyProfileGroundingSummary,
  type TheaterRouteBFamilyProfileGroundingStatus,
  type TheaterRouteBHandoffPacket,
} from "./route-b-handoff";

export type ClientTheaterRouteBHandoffStatus =
  | "READY_FOR_HANDOFF_REVIEW"
  | "NEEDS_MORE_INFO"
  | "BLOCKED_SENSITIVE";

export interface BuildClientTheaterRouteBHandoffInput extends ClientTheaterBuildInput {
  routeBEnabled?: boolean;
}

export interface ClientTheaterRouteBHandoff {
  status: ClientTheaterRouteBHandoffStatus;
  clientBuild: ClientTheaterBuild;
  handoff: TheaterRouteBHandoffPacket;
  familyProfileGrounding?: TheaterRouteBFamilyProfileGroundingSummary;
  proof: {
    source: "client-theater-build";
    providerCallAttempted: false;
    databaseWriteAttempted: false;
    writesConfirmedCrmFact: false;
    factsInferencesUnknownsSeparated: true;
    highSensitiveBlocked: boolean;
    familyProfileGroundingIncluded: boolean;
    routeBProductionStartAllowed: boolean;
  };
}

export function buildClientTheaterRouteBHandoff(
  input: BuildClientTheaterRouteBHandoffInput,
): ClientTheaterRouteBHandoff {
  const clientBuild = buildClientTheaterBuild(input);
  const familyProfileGrounding = buildClientRouteBFamilyProfileGroundingSummary(input.client);
  const routeBEnabled =
    input.routeBEnabled === true &&
    clientBuild.status !== "BLOCKED_SENSITIVE" &&
    clientBuild.packet.routeBCompatibility.canStartSimulation;
  const handoff = buildTheaterRouteBHandoff(clientBuild.packet, {
    routeBEnabled,
    now: input.now,
    familyProfiles: familyProfileGrounding,
  });

  return {
    status: resolveBridgeStatus(clientBuild),
    clientBuild,
    handoff,
    familyProfileGrounding,
    proof: {
      source: "client-theater-build",
      providerCallAttempted: false,
      databaseWriteAttempted: false,
      writesConfirmedCrmFact: false,
      factsInferencesUnknownsSeparated: true,
      highSensitiveBlocked: clientBuild.status === "BLOCKED_SENSITIVE",
      familyProfileGroundingIncluded: Boolean(familyProfileGrounding),
      routeBProductionStartAllowed: handoff.runtimeActivation.canStartProductionSession,
    },
  };
}

export function buildClientRouteBFamilyProfileGroundingSummary(
  client: Client,
): TheaterRouteBFamilyProfileGroundingSummary | undefined {
  return buildTheaterRouteBFamilyProfileGroundingSummary(buildClientRouteBFamilyProfileGroundingInputs(client));
}

export function buildClientRouteBFamilyProfileGroundingInputs(
  client: Client,
): TheaterRouteBFamilyProfileGroundingInput[] {
  const fields: TheaterRouteBFamilyProfileGroundingInput[] = [];

  pushField(fields, {
    field: "client_occupation",
    label: "職位/職業",
    person: client.name,
    relation: "本人",
    value: client.occupation,
    status: "FACT",
    sourceRefs: ["client_profile"],
  });

  if (client.annualIncome > 0) {
    pushField(fields, {
      field: "client_annual_income",
      label: "年收入",
      person: client.name,
      relation: "本人",
      value: formatCurrency(client.annualIncome),
      status: "FACT",
      sourceRefs: ["client_profile"],
    });
  }

  pushField(fields, {
    field: "client_status",
    label: "客戶狀態",
    person: client.name,
    relation: "本人",
    value: client.status,
    status: "FACT",
    sourceRefs: ["client_profile"],
  });

  if (client.kycStatus !== "COMPLETE") {
    pushField(fields, {
      field: "client_kyc_status",
      label: "KYC 狀態",
      person: client.name,
      relation: "本人",
      value: client.kycStatus,
      status: "UNKNOWN",
      sourceRefs: ["client_compliance"],
    });
  }

  for (const member of client.family) {
    fields.push(...buildFamilyMemberGroundingFields(member));
  }

  for (const item of client.complianceChecklist.missingItems) {
    pushField(fields, {
      field: "compliance_missing_item",
      label: "合規待補",
      person: client.name,
      relation: "本人",
      value: item,
      status: "UNKNOWN",
      sourceRefs: ["client_compliance"],
    });
  }

  for (const tag of client.aiTags.slice(0, 6)) {
    pushField(fields, {
      field: "ai_gap_signal",
      label: "AI 缺口線索",
      person: client.name,
      relation: "本人",
      value: tag,
      status: "INFERENCE",
      sourceRefs: ["client_ai_signal"],
    });
  }

  return fields.slice(0, 24);
}

function buildFamilyMemberGroundingFields(member: FamilyMember): TheaterRouteBFamilyProfileGroundingInput[] {
  const fields: TheaterRouteBFamilyProfileGroundingInput[] = [
    {
      field: "relationship",
      label: "關係",
      person: member.name,
      relation: member.relation,
      value: member.relation,
      status: "FACT",
      sourceRefs: ["relationship_graph"],
    },
  ];

  const profileFields = [
    { field: "job_title", label: "職位/職業", value: member.profile?.jobTitle },
    { field: "annual_income_or_dependency", label: "年收入/依賴", value: member.profile?.annualIncomeOrDependency },
    { field: "person_status", label: "人物狀態", value: member.profile?.personStatus },
    { field: "decision_role", label: "決策角色", value: member.profile?.decisionRole },
    { field: "relationship_context", label: "關係脈絡", value: member.profile?.relationshipContext },
  ];

  for (const profileField of profileFields) {
    if (!profileField.value?.value) continue;

    pushField(fields, {
      field: profileField.field,
      label: profileField.label,
      person: member.name,
      relation: member.relation,
      value: profileField.value.value,
      status: profileField.value.factStatus,
      sourceRefs: profileField.value.sourceReferenceIds,
    });
  }

  return fields;
}

function resolveBridgeStatus(clientBuild: ClientTheaterBuild): ClientTheaterRouteBHandoffStatus {
  if (clientBuild.status === "BLOCKED_SENSITIVE") return "BLOCKED_SENSITIVE";
  if (clientBuild.status === "NEEDS_MORE_INFO" || !clientBuild.packet.routeBCompatibility.canStartSimulation) {
    return "NEEDS_MORE_INFO";
  }
  return "READY_FOR_HANDOFF_REVIEW";
}

function pushField(
  fields: TheaterRouteBFamilyProfileGroundingInput[],
  field: TheaterRouteBFamilyProfileGroundingInput,
) {
  if (!field.value.trim()) return;
  fields.push({
    ...field,
    value: field.value.trim(),
    sourceRefs: [...new Set(field.sourceRefs.map((sourceRef) => sourceRef.trim()).filter(Boolean))],
    status: normalizeFactStatus(field.status),
  });
}

function normalizeFactStatus(
  status: TheaterRouteBFamilyProfileGroundingStatus,
): TheaterRouteBFamilyProfileGroundingStatus {
  return status === "FACT" || status === "INFERENCE" ? status : "UNKNOWN";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}
