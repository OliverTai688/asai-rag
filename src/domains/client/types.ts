import type { FamilyMemberProfile } from "./family-member-profile";

export type ClientStatus = "PROSPECT" | "ACTIVE" | "CLOSED";

export type ClientComplianceStatus = "MISSING" | "PARTIAL" | "COMPLETE" | "REVIEW_REQUIRED";

export type ClientSensitivityLevel = "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE";

export interface ClientComplianceChecklist {
  kycStatus: ClientComplianceStatus;
  suitabilityStatus: ClientComplianceStatus;
  consentStatus: ClientComplianceStatus;
  missingItems: string[];
  reviewedAt?: string;
}

export const DEFAULT_CLIENT_COMPLIANCE: ClientComplianceChecklist = {
  kycStatus: "MISSING",
  suitabilityStatus: "MISSING",
  consentStatus: "MISSING",
  missingItems: ["KYC", "適合度評估", "個資同意"],
};

export type RelationshipType =
  // 祖父母輩
  | "祖父" | "祖母" | "外公" | "外婆"
  // 父母輩直系
  | "父" | "母"
  // 父母輩旁支
  | "叔叔" | "伯伯" | "舅舅" | "姑姑" | "阿姨"
  // 配偶
  | "配偶"
  // 同輩直系
  | "兄" | "弟" | "姐" | "妹"
  // 同輩旁支
  | "堂哥" | "堂弟" | "堂姐" | "堂妹"
  | "表哥" | "表弟" | "表姐" | "表妹"
  // 子女直系
  | "子" | "女"
  // 子女旁支（兄弟姐妹之子）
  | "姪子" | "姪女" | "外甥" | "外甥女"
  // 孫輩
  | "孫子" | "孫女" | "外孫" | "外孫女"
  // 其他
  | "親戚" | "朋友" | "合作夥伴" | "其他";

// 世代層級：負數 = 長輩，0 = 同輩，正數 = 晚輩
export const RELATION_GENERATION: Record<string, number> = {
  "祖父": -2, "祖母": -2, "外公": -2, "外婆": -2,
  "父": -1, "母": -1, "叔叔": -1, "伯伯": -1, "舅舅": -1, "姑姑": -1, "阿姨": -1,
  "配偶": 0,
  "兄": 0, "弟": 0, "姐": 0, "妹": 0,
  "堂哥": 0, "堂弟": 0, "堂姐": 0, "堂妹": 0,
  "表哥": 0, "表弟": 0, "表姐": 0, "表妹": 0,
  "子": 1, "女": 1, "姪子": 1, "姪女": 1, "外甥": 1, "外甥女": 1,
  "孫子": 2, "孫女": 2, "外孫": 2, "外孫女": 2,
};

export const RELATION_GROUPS = {
  長輩: ["祖父", "祖母", "外公", "外婆", "父", "母", "叔叔", "伯伯", "舅舅", "姑姑", "阿姨"] as RelationshipType[],
  同輩: ["配偶", "兄", "弟", "姐", "妹", "堂哥", "堂弟", "堂姐", "堂妹", "表哥", "表弟", "表姐", "表妹"] as RelationshipType[],
  晚輩: ["子", "女", "孫子", "孫女", "外孫", "外孫女", "姪子", "姪女", "外甥", "外甥女"] as RelationshipType[],
  其他: ["親戚", "朋友", "合作夥伴", "其他"] as RelationshipType[],
};

const RELATION_TYPE_SET = new Set<string>(Object.values(RELATION_GROUPS).flat());

const RELATION_ALIASES: Record<string, RelationshipType> = {
  爸爸: "父",
  爸: "父",
  父親: "父",
  媽媽: "母",
  媽: "母",
  母親: "母",
  老公: "配偶",
  丈夫: "配偶",
  先生: "配偶",
  老婆: "配偶",
  太太: "配偶",
  妻子: "配偶",
  兒子: "子",
  兒: "子",
  女兒: "女",
  女子: "女",
};

export function normalizeRelationshipType(relation: string): RelationshipType {
  const trimmed = relation.trim();

  if (RELATION_TYPE_SET.has(trimmed)) {
    return trimmed as RelationshipType;
  }

  return RELATION_ALIASES[trimmed] ?? "其他";
}

export function hasKnownRelationGeneration(relation: string): boolean {
  return Object.prototype.hasOwnProperty.call(RELATION_GENERATION, normalizeRelationshipType(relation));
}

export function getRelationGeneration(relation: string): number {
  return RELATION_GENERATION[normalizeRelationshipType(relation)] ?? 0;
}

export type FamilyMemberLinkedClientAvailability = "READABLE" | "UNAVAILABLE";

export interface FamilyMemberLinkedClientSummary {
  availability: FamilyMemberLinkedClientAvailability;
  displayName: string;
  status?: ClientStatus;
  href?: string;
}

export interface FamilyMember {
  id: string;
  relation: RelationshipType | string;
  name: string;
  age?: number;
  phone?: string;
  linkedClientId?: string;
  linkedClient?: FamilyMemberLinkedClientSummary;
  parentMemberId?: string; // 連結至哪個成員（undefined = 直接連結主客戶）
  profile?: FamilyMemberProfile;
}

export interface Policy {
  id: string;
  type: string;
  amount: number;
  provider: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  occupation: string;
  annualIncome: number;
  family: FamilyMember[];
  existingPolicies: Policy[];
  tags: string[];
  aiTags: string[];
  status: ClientStatus;
  notes?: string;
  complianceChecklist: ClientComplianceChecklist;
  sensitivityLevel: ClientSensitivityLevel;
  kycStatus: ClientComplianceStatus;
  lastInteraction: string;
}
