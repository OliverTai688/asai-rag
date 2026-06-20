import type { Client } from "@/domains/client/types";
import type {
  ObjectionHandling,
  VisitMaterial,
  VisitObjective,
  VisitPurpose,
  VisitQuestionEvidence,
  VisitQuestionEvidenceStatus,
} from "@/domains/visit/types";

export type AiEvidenceSummaryItem = {
  id: string;
  source:
    | "client_profile"
    | "relationship_graph"
    | "policy"
    | "ai_tag"
    | "visit_purpose"
    | "compliance"
    | "generated_recommendation"
    | "unknown";
  status: "fact" | "inference" | "unknown";
  label: string;
  detail: string;
};

export type AiRecommendationItem = {
  id: string;
  source: "visit_objective" | "objection_response" | "material" | "report_prompt";
  label: string;
  detail: string;
};

export type AiEvidenceSummaryDto = {
  facts: AiEvidenceSummaryItem[];
  inferences: AiEvidenceSummaryItem[];
  unknowns: AiEvidenceSummaryItem[];
  recommendations: AiRecommendationItem[];
};

export type ProviderSafeClientSnapshot = {
  name: string;
  occupation: string;
  annualIncome: number;
  status: Client["status"];
  sensitivityLevel: Client["sensitivityLevel"];
  kycStatus: Client["kycStatus"];
  family: Array<{
    id: string;
    relation: string;
    name: string;
    age?: number;
    parentMemberId?: string;
  }>;
  existingPolicies: Array<{
    id: string;
    type: string;
    amount: number;
    provider: string;
  }>;
  aiTags: string[];
  complianceChecklist: {
    kycStatus: string;
    suitabilityStatus: string;
    consentStatus: string;
    missingItems: string[];
  };
};

const PURPOSE_LABEL: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

export function buildProviderSafeClientSnapshot(client: Client): ProviderSafeClientSnapshot {
  return {
    name: client.name,
    occupation: client.occupation,
    annualIncome: client.annualIncome,
    status: client.status,
    sensitivityLevel: client.sensitivityLevel,
    kycStatus: client.kycStatus,
    family: client.family.map((member) => ({
      id: member.id,
      relation: member.relation,
      name: member.name,
      age: member.age,
      parentMemberId: member.parentMemberId,
    })),
    existingPolicies: client.existingPolicies.map((policy) => ({
      id: policy.id,
      type: policy.type,
      amount: policy.amount,
      provider: policy.provider,
    })),
    aiTags: client.aiTags,
    complianceChecklist: {
      kycStatus: client.complianceChecklist.kycStatus,
      suitabilityStatus: client.complianceChecklist.suitabilityStatus,
      consentStatus: client.complianceChecklist.consentStatus,
      missingItems: client.complianceChecklist.missingItems,
    },
  };
}

export function buildAiEvidenceSummary(input: {
  client: Client;
  purpose?: VisitPurpose;
  questionEvidence?: VisitQuestionEvidence[];
  objectives?: VisitObjective[];
  objections?: ObjectionHandling[];
  materials?: VisitMaterial[];
  reportPrompt?: string;
}): AiEvidenceSummaryDto {
  const facts: AiEvidenceSummaryItem[] = [];
  const inferences: AiEvidenceSummaryItem[] = [];
  const unknowns: AiEvidenceSummaryItem[] = [];

  for (const item of buildClientEvidence(input.client, input.purpose)) {
    pushByStatus({ facts, inferences, unknowns }, item);
  }

  for (const item of input.questionEvidence ?? []) {
    pushByStatus({ facts, inferences, unknowns }, fromQuestionEvidence(item));
  }

  return {
    facts: dedupeById(facts),
    inferences: dedupeById(inferences),
    unknowns: dedupeById(unknowns),
    recommendations: buildRecommendations(input),
  };
}

function buildClientEvidence(client: Client, purpose?: VisitPurpose): AiEvidenceSummaryItem[] {
  const items: AiEvidenceSummaryItem[] = [];
  const profileParts = [
    client.status ? `狀態：${client.status}` : null,
    client.occupation ? `職位/職業：${client.occupation}` : null,
    client.annualIncome > 0 ? `年收入：約 ${formatCurrency(client.annualIncome)}` : null,
  ].filter(Boolean);

  if (profileParts.length > 0) {
    items.push({
      id: "client-profile",
      source: "client_profile",
      status: "fact",
      label: "客戶輪廓",
      detail: profileParts.join("；"),
    });
  } else {
    items.push({
      id: "client-profile-unknown",
      source: "client_profile",
      status: "unknown",
      label: "客戶輪廓缺口",
      detail: "尚未確認職位、收入或目前狀態。",
    });
  }

  if (client.family.length > 0) {
    items.push({
      id: "relationship-graph",
      source: "relationship_graph",
      status: "fact",
      label: "關係圖",
      detail: client.family
        .slice(0, 6)
        .map((member) => `${member.relation} ${member.name}${member.age ? `（${member.age}歲）` : ""}`)
        .join("、"),
    });
  } else {
    items.push({
      id: "relationship-graph-unknown",
      source: "relationship_graph",
      status: "unknown",
      label: "關係圖缺口",
      detail: "尚未建立家庭或影響者節點。",
    });
  }

  if (client.existingPolicies.length > 0) {
    items.push({
      id: "policies",
      source: "policy",
      status: "fact",
      label: "既有保障",
      detail: client.existingPolicies
        .slice(0, 5)
        .map((policy) => `${policy.provider} ${policy.type} ${formatCurrency(policy.amount)}`)
        .join("、"),
    });
  } else {
    items.push({
      id: "policies-unknown",
      source: "policy",
      status: "unknown",
      label: "保障缺口",
      detail: "尚未確認既有保單或保障額度。",
    });
  }

  if (client.aiTags.length > 0) {
    items.push({
      id: "ai-tags",
      source: "ai_tag",
      status: "inference",
      label: "AI 缺口線索",
      detail: client.aiTags.slice(0, 6).join("、"),
    });
  } else {
    items.push({
      id: "ai-tags-unknown",
      source: "ai_tag",
      status: "unknown",
      label: "AI 缺口線索",
      detail: "尚未累積可用的缺口標籤。",
    });
  }

  items.push({
    id: "compliance-status",
    source: "compliance",
    status: "fact",
    label: "合規狀態",
    detail: `KYC：${client.complianceChecklist.kycStatus}；適合度：${client.complianceChecklist.suitabilityStatus}；同意：${client.complianceChecklist.consentStatus}`,
  });

  if (client.complianceChecklist.missingItems.length > 0) {
    items.push({
      id: "compliance-missing",
      source: "compliance",
      status: "unknown",
      label: "合規待補",
      detail: client.complianceChecklist.missingItems.join("、"),
    });
  }

  if (purpose) {
    items.push({
      id: "visit-purpose",
      source: "visit_purpose",
      status: "inference",
      label: "拜訪目的推論",
      detail: `本次任務設定為「${PURPOSE_LABEL[purpose]}」，準備包會優先整理與此目的相關的問題與材料。`,
    });
  }

  return items;
}

function fromQuestionEvidence(item: VisitQuestionEvidence): AiEvidenceSummaryItem {
  return {
    id: `question-${item.id}`,
    source: item.source,
    status: mapQuestionEvidenceStatus(item.status),
    label: item.label,
    detail: item.detail,
  };
}

function mapQuestionEvidenceStatus(status: VisitQuestionEvidenceStatus): AiEvidenceSummaryItem["status"] {
  if (status === "confirmed") return "fact";
  if (status === "inference") return "inference";
  return "unknown";
}

function buildRecommendations(input: {
  objectives?: VisitObjective[];
  objections?: ObjectionHandling[];
  materials?: VisitMaterial[];
  reportPrompt?: string;
}): AiRecommendationItem[] {
  return [
    ...(input.objectives ?? []).slice(0, 4).map((objective) => ({
      id: `objective-${objective.id}`,
      source: "visit_objective" as const,
      label: objective.description,
      detail: objective.successCriteria,
    })),
    ...(input.objections ?? []).slice(0, 4).map((objection) => ({
      id: `objection-${objection.id}`,
      source: "objection_response" as const,
      label: objection.expectedObjection,
      detail: objection.suggestedResponse,
    })),
    ...(input.materials ?? []).slice(0, 4).map((material) => ({
      id: `material-${material.id}`,
      source: "material" as const,
      label: material.name,
      detail: material.checked ? "已列入準備清單。" : "建議拜訪前確認是否需要攜帶或補齊。",
    })),
    ...(input.reportPrompt
      ? [
          {
            id: "report-prompt",
            source: "report_prompt" as const,
            label: "報告生成要求",
            detail: truncate(input.reportPrompt, 220),
          },
        ]
      : []),
  ];
}

function pushByStatus(
  buckets: Pick<AiEvidenceSummaryDto, "facts" | "inferences" | "unknowns">,
  item: AiEvidenceSummaryItem,
) {
  if (item.status === "fact") {
    buckets.facts.push(item);
    return;
  }

  if (item.status === "inference") {
    buckets.inferences.push(item);
    return;
  }

  buckets.unknowns.push(item);
}

function dedupeById(items: AiEvidenceSummaryItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "TWD",
  }).format(value);
}
