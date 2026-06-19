import { RELATION_GENERATION, type Client, type FamilyMember } from "./types";

export type RelationshipGraphFactStatus = "FACT" | "INFERENCE" | "UNKNOWN";

export type RelationshipGraphSourceType =
  | "client_profile"
  | "relationship_graph"
  | "policy_summary"
  | "compliance_checklist"
  | "ai_signal";

export type RelationshipGraphPersonRole =
  | "FOCUS_CLIENT"
  | "DECISION_MAKER"
  | "INFLUENCER"
  | "DEPENDENT"
  | "CONTEXT_PERSON";

export interface RelationshipGraphSourceReference {
  id: string;
  type: RelationshipGraphSourceType;
  label: string;
  factStatus: RelationshipGraphFactStatus;
  summary: string;
}

export interface RelationshipGraphField {
  label: string;
  value: string;
  factStatus: RelationshipGraphFactStatus;
  sourceReferenceIds: string[];
  rationale?: string;
}

export interface RelationshipGraphPersonNode {
  nodeKey: string;
  displayName: string;
  relation: string;
  generation: number;
  role: RelationshipGraphPersonRole;
  roleLabel: string;
  roleFactStatus: RelationshipGraphFactStatus;
  roleRationale: string;
  fields: {
    jobTitle: RelationshipGraphField;
    annualIncome: RelationshipGraphField;
    status: RelationshipGraphField;
    relationshipContext: RelationshipGraphField;
  };
  unknowns: string[];
  sourceReferenceIds: string[];
}

export interface ClientRelationshipGraphReview {
  version: string;
  generatedAt: string;
  clientSummary: {
    name: string;
    status: string;
    sensitivityLevel: string;
    kycStatus: string;
  };
  nodes: RelationshipGraphPersonNode[];
  sourceReferences: RelationshipGraphSourceReference[];
  sourceSummary: {
    nodeCount: number;
    sourceCount: number;
    factFields: number;
    inferenceFields: number;
    unknownFields: number;
  };
  downstreamReadiness: {
    previsit: {
      status: "READY" | "NEEDS_MORE_INFO";
      reason: string;
    };
    theater: {
      status: "READY" | "NEEDS_MORE_INFO" | "BLOCKED_SENSITIVE";
      reason: string;
    };
  };
  evidenceBuckets: {
    facts: string[];
    inferences: string[];
    unknowns: string[];
  };
  suggestedQuestions: string[];
}

const REVIEW_VERSION = "2026-06-20.relationship-graph-review.v1";

const CLIENT_STATUS_LABELS: Record<Client["status"], string> = {
  PROSPECT: "潛在客戶",
  ACTIVE: "服務中",
  CLOSED: "已結案",
};

const SENSITIVITY_LABELS: Record<Client["sensitivityLevel"], string> = {
  NORMAL: "一般",
  SENSITIVE: "敏感",
  HIGHLY_SENSITIVE: "高敏感",
};

const KYC_STATUS_LABELS: Record<Client["kycStatus"], string> = {
  MISSING: "未補齊",
  PARTIAL: "部分完成",
  COMPLETE: "完成",
  REVIEW_REQUIRED: "需複核",
};

const ROLE_LABELS: Record<RelationshipGraphPersonRole, string> = {
  FOCUS_CLIENT: "焦點客戶",
  DECISION_MAKER: "共同決策者",
  INFLUENCER: "影響者",
  DEPENDENT: "保障責任對象",
  CONTEXT_PERSON: "脈絡人物",
};

export function buildClientRelationshipGraphReview(
  client: Client,
  now = new Date().toISOString(),
): ClientRelationshipGraphReview {
  const sourceReferences = buildSourceReferences(client);
  const nodes = [buildPrimaryNode(client), ...client.family.map((member, index) => buildFamilyNode(client, member, index))];
  const fieldCounts = countFieldStatuses(nodes);
  const evidenceBuckets = buildEvidenceBuckets(client, nodes);
  const suggestedQuestions = buildSuggestedQuestions(client, nodes);

  return {
    version: REVIEW_VERSION,
    generatedAt: now,
    clientSummary: {
      name: client.name,
      status: CLIENT_STATUS_LABELS[client.status],
      sensitivityLevel: SENSITIVITY_LABELS[client.sensitivityLevel],
      kycStatus: KYC_STATUS_LABELS[client.kycStatus],
    },
    nodes,
    sourceReferences,
    sourceSummary: {
      nodeCount: nodes.length,
      sourceCount: sourceReferences.length,
      factFields: fieldCounts.FACT,
      inferenceFields: fieldCounts.INFERENCE,
      unknownFields: fieldCounts.UNKNOWN,
    },
    downstreamReadiness: buildDownstreamReadiness(client, nodes),
    evidenceBuckets,
    suggestedQuestions,
  };
}

function buildSourceReferences(client: Client): RelationshipGraphSourceReference[] {
  const references: RelationshipGraphSourceReference[] = [
    {
      id: "client.profile",
      type: "client_profile",
      label: "客戶基本資料",
      factStatus: "FACT",
      summary: `主客戶 ${client.name} 的職業、年收入、狀態與合規狀態。`,
    },
  ];

  client.family.forEach((member, index) => {
    references.push({
      id: familySourceId(index),
      type: "relationship_graph",
      label: `關係節點 ${index + 1}`,
      factStatus: "FACT",
      summary: `${member.relation} ${member.name}${member.age !== undefined ? `，${member.age} 歲` : ""}。`,
    });
  });

  if (client.existingPolicies.length > 0) {
    references.push({
      id: "policy.summary",
      type: "policy_summary",
      label: "既有保單摘要",
      factStatus: "FACT",
      summary: `${client.existingPolicies.length} 張既有保單可作為保障責任脈絡。`,
    });
  }

  references.push({
    id: "compliance.checklist",
    type: "compliance_checklist",
    label: "合規檢核",
    factStatus: client.complianceChecklist.missingItems.length > 0 ? "UNKNOWN" : "FACT",
    summary:
      client.complianceChecklist.missingItems.length > 0
        ? `待補：${client.complianceChecklist.missingItems.join("、")}。`
        : "合規檢核目前已完成。",
  });

  client.aiTags.slice(0, 6).forEach((tag, index) => {
    references.push({
      id: `ai-signal.${index + 1}`,
      type: "ai_signal",
      label: `AI 線索 ${index + 1}`,
      factStatus: "INFERENCE",
      summary: tag,
    });
  });

  return references;
}

function buildPrimaryNode(client: Client): RelationshipGraphPersonNode {
  const unknowns = [
    !client.occupation ? "主客戶職位/職業待確認。" : "",
    client.annualIncome <= 0 ? "主客戶年收入待確認。" : "",
    client.kycStatus !== "COMPLETE" ? `KYC 狀態仍為 ${KYC_STATUS_LABELS[client.kycStatus]}。` : "",
  ].filter(Boolean);

  return {
    nodeKey: "primary",
    displayName: client.name,
    relation: "主客戶",
    generation: 0,
    role: "FOCUS_CLIENT",
    roleLabel: ROLE_LABELS.FOCUS_CLIENT,
    roleFactStatus: "FACT",
    roleRationale: "此節點是目前 CRM record 的焦點人物。",
    fields: {
      jobTitle: client.occupation
        ? field("職位/職業", client.occupation, "FACT", ["client.profile"])
        : field("職位/職業", "待確認", "UNKNOWN", ["client.profile"], "新增客戶時尚未提供職位或職業。"),
      annualIncome:
        client.annualIncome > 0
          ? field("年收入", formatTwd(client.annualIncome), "FACT", ["client.profile"])
          : field("年收入", "待確認", "UNKNOWN", ["client.profile"], "年收入會影響保障缺口與保費承受度。"),
      status: field("客戶狀態", CLIENT_STATUS_LABELS[client.status], "FACT", ["client.profile"]),
      relationshipContext: field("關係脈絡", "拜訪準備包與劇場建場的焦點人物。", "FACT", ["client.profile"]),
    },
    unknowns,
    sourceReferenceIds: ["client.profile", "compliance.checklist"],
  };
}

function buildFamilyNode(client: Client, member: FamilyMember, index: number): RelationshipGraphPersonNode {
  const role = inferFamilyRole(member);
  const parentLabel = getParentLabel(client, member);
  const sourceId = familySourceId(index);
  const unknowns = [
    `${member.name} 的職位/職業待確認。`,
    `${member.name} 的年收入或財務依賴關係待確認。`,
    `${member.name} 在保額、保費或受益安排中的狀態待確認。`,
  ];

  return {
    nodeKey: `member-${index + 1}`,
    displayName: member.name,
    relation: member.relation,
    generation: RELATION_GENERATION[member.relation] ?? 0,
    role,
    roleLabel: ROLE_LABELS[role],
    roleFactStatus: "INFERENCE",
    roleRationale: buildRoleRationale(member, role),
    fields: {
      jobTitle: field("職位/職業", "待確認", "UNKNOWN", [sourceId], "關係圖目前只有姓名、關係與年齡等基本欄位。"),
      annualIncome: field("年收入", "待確認", "UNKNOWN", [sourceId], "家庭責任與保費決策仍需訪談確認。"),
      status: field("人物狀態", "待確認", "UNKNOWN", [sourceId], "需確認是否為共同決策者、受扶養人或單純脈絡人物。"),
      relationshipContext: field(
        "關係脈絡",
        `${member.relation}，連結至 ${parentLabel}${member.age !== undefined ? `，年齡 ${member.age} 歲` : ""}。`,
        "FACT",
        [sourceId],
      ),
    },
    unknowns,
    sourceReferenceIds: [sourceId],
  };
}

function inferFamilyRole(member: FamilyMember): RelationshipGraphPersonRole {
  const relation = member.relation;
  const generation = RELATION_GENERATION[relation] ?? 0;

  if (relation.includes("配偶") || relation.includes("合作夥伴")) {
    return "DECISION_MAKER";
  }

  if (generation > 0 || (member.age !== undefined && member.age < 25)) {
    return "DEPENDENT";
  }

  if (generation < 0 || relation.includes("朋友")) {
    return "INFLUENCER";
  }

  return "CONTEXT_PERSON";
}

function buildRoleRationale(member: FamilyMember, role: RelationshipGraphPersonRole): string {
  if (role === "DECISION_MAKER") {
    return "由關係類型推論可能參與保費、保額或受益安排決策，需現場確認。";
  }

  if (role === "DEPENDENT") {
    return "由世代或年齡推論可能是保障責任對象，不能直接視為已確認事實。";
  }

  if (role === "INFLUENCER") {
    return "由關係類型推論可能影響家庭保障排序或購買阻力。";
  }

  return `${member.relation} 目前只作為關係脈絡人物，影響力待訪談確認。`;
}

function getParentLabel(client: Client, member: FamilyMember): string {
  if (!member.parentMemberId) return "主客戶";

  const parent = client.family.find((candidate) => candidate.id === member.parentMemberId);
  return parent ? `${parent.relation} ${parent.name}` : "主客戶";
}

function buildDownstreamReadiness(client: Client, nodes: RelationshipGraphPersonNode[]): ClientRelationshipGraphReview["downstreamReadiness"] {
  const familyNodeCount = nodes.length - 1;
  const unknownFields = countFieldStatuses(nodes).UNKNOWN;
  const hasRelationshipContext = familyNodeCount > 0;
  const previsitReady = hasRelationshipContext || client.existingPolicies.length > 0 || client.occupation || client.annualIncome > 0;
  const theaterBlocked = client.sensitivityLevel === "HIGHLY_SENSITIVE";

  return {
    previsit: {
      status: previsitReady ? "READY" : "NEEDS_MORE_INFO",
      reason: previsitReady
        ? `可用 ${familyNodeCount} 位關係人、${client.existingPolicies.length} 張保單與 ${unknownFields} 個待確認欄位生成拜訪問題。`
        : "缺少關係人、保單、職業或收入線索，建議先用 AI 訪談補資料。",
    },
    theater: {
      status: theaterBlocked ? "BLOCKED_SENSITIVE" : hasRelationshipContext ? "READY" : "NEEDS_MORE_INFO",
      reason: theaterBlocked
        ? "高敏感客戶不可由關係圖直接建場，需走 reason/riskAccepted gate。"
        : hasRelationshipContext
          ? "已有可轉為劇場人物的關係節點；推論角色需保留待確認標記。"
          : "尚未有劇場人物節點，建議先補共同決策者或主要受扶養人。",
    },
  };
}

function buildEvidenceBuckets(client: Client, nodes: RelationshipGraphPersonNode[]): ClientRelationshipGraphReview["evidenceBuckets"] {
  const facts = [
    `${client.name} 是主客戶，狀態為 ${CLIENT_STATUS_LABELS[client.status]}。`,
    ...client.family.slice(0, 6).map((member) => `${member.name} 是${client.name}的${member.relation}。`),
    ...client.existingPolicies.slice(0, 3).map((policy) => `${client.name} 已有 ${policy.provider} ${policy.type}。`),
  ];
  const inferences = nodes
    .filter((node) => node.roleFactStatus === "INFERENCE")
    .slice(0, 6)
    .map((node) => `${node.displayName} 可能是${node.roleLabel}：${node.roleRationale}`);
  const unknowns = unique(nodes.flatMap((node) => node.unknowns)).slice(0, 8);

  return { facts, inferences, unknowns };
}

function buildSuggestedQuestions(client: Client, nodes: RelationshipGraphPersonNode[]): string[] {
  const questions: string[] = [];
  const hasSpouse = client.family.some((member) => member.relation.includes("配偶"));
  const hasDependents = nodes.some((node) => node.role === "DEPENDENT");

  if (client.family.length === 0) {
    questions.push("這次拜訪需要一起納入哪些共同決策者或主要受扶養人？");
  }

  if (hasSpouse) {
    questions.push("配偶在保額、保費或受益安排上通常扮演什麼角色？");
  }

  if (hasDependents) {
    questions.push("哪些晚輩或受扶養人的生活費、教育費或照護費需要納入保障缺口？");
  }

  if (client.annualIncome <= 0) {
    questions.push("目前年收入或可承擔保費範圍大約落在哪個區間？");
  }

  if (client.existingPolicies.length === 0) {
    questions.push("目前已有哪幾張保單，誰是被保險人與受益人？");
  }

  return unique(questions).slice(0, 5);
}

function countFieldStatuses(nodes: RelationshipGraphPersonNode[]): Record<RelationshipGraphFactStatus, number> {
  const initial: Record<RelationshipGraphFactStatus, number> = {
    FACT: 0,
    INFERENCE: 0,
    UNKNOWN: 0,
  };

  return nodes.reduce((counts, node) => {
    counts[node.roleFactStatus] += 1;

    Object.values(node.fields).forEach((item) => {
      counts[item.factStatus] += 1;
    });

    return counts;
  }, initial);
}

function field(
  label: string,
  value: string,
  factStatus: RelationshipGraphFactStatus,
  sourceReferenceIds: string[],
  rationale?: string,
): RelationshipGraphField {
  return {
    label,
    value,
    factStatus,
    sourceReferenceIds,
    ...(rationale ? { rationale } : {}),
  };
}

function familySourceId(index: number): string {
  return `relationship.${index + 1}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function formatTwd(value: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}
