import type {
  ClientComplianceChecklist,
  ClientComplianceStatus,
  ClientSensitivityLevel,
  ClientStatus,
} from "./types";

export type RelatedListFactStatus = "FACT" | "INFERENCE" | "UNKNOWN";
export type RelatedListPriority = "LOW" | "MEDIUM" | "HIGH";

export interface RelatedListSourceReference {
  id: string;
  source: "client_profile" | "family" | "policy" | "visit" | "report" | "timeline" | "compliance" | "unknown";
  factStatus: RelatedListFactStatus;
  label: string;
  detail: string;
}

export interface ClientRelatedListsDto {
  client: {
    id: string;
    name: string;
    status: ClientStatus;
    occupation: string;
    annualIncome: number;
    familyCount: number;
    policyCount: number;
    sensitivityLevel: ClientSensitivityLevel;
    kycStatus: ClientComplianceStatus;
    complianceChecklist: ClientComplianceChecklist;
  };
  lists: {
    policies: ClientPolicyRelatedList;
    timeline: ClientTimelineRelatedList;
    reports: ClientReportRelatedList;
    gapAnalysis: ClientGapAnalysisRelatedList;
  };
  sourceSummary: {
    generatedAt: string;
    counts: {
      familyMembers: number;
      policies: number;
      visitPlans: number;
      reports: number;
      timelineEvents: number;
      gapItems: number;
    };
    provider: "none";
    noProviderReason: string;
  };
}

export interface ClientPolicyRelatedList {
  summary: {
    count: number;
    totalInsuredAmount: number;
    largestInsuredAmount: number;
    activeCount: number;
    unknownStatusCount: number;
  };
  items: ClientPolicyRelatedListItem[];
}

export interface ClientPolicyRelatedListItem {
  id: string;
  category: string;
  productName: string;
  provider: string;
  insuredAmount: number;
  premium: number;
  currency: string;
  status: string;
  effectiveDate?: string;
  expiresAt?: string;
  source: RelatedListSourceReference;
}

export interface ClientTimelineRelatedList {
  summary: {
    count: number;
    latestAt?: string;
    typeLabels: string[];
  };
  items: ClientTimelineRelatedListItem[];
}

export interface ClientTimelineRelatedListItem {
  id: string;
  type: string;
  label: string;
  title: string;
  description: string;
  occurredAt: string;
  source: RelatedListSourceReference;
}

export interface ClientReportRelatedList {
  summary: {
    count: number;
    sharedCount: number;
    readyCount: number;
    latestUpdatedAt?: string;
  };
  items: ClientReportRelatedListItem[];
}

export interface ClientReportRelatedListItem {
  id: string;
  title: string;
  status: string;
  version: number;
  sectionCount: number;
  clientSectionCount: number;
  isShared: boolean;
  shareAccessCount: number;
  visitPlanId?: string;
  spinSessionId?: string;
  theaterSessionId?: string;
  interviewSessionId?: string;
  createdAt: string;
  updatedAt: string;
  source: RelatedListSourceReference;
}

export interface ClientGapAnalysisRelatedList {
  summary: {
    totalCurrentCoverage: number;
    totalSuggestedCoverage: number;
    totalGap: number;
    completionRate: number;
    urgentCount: number;
    unknownCount: number;
  };
  items: ClientGapAnalysisRelatedListItem[];
}

export interface ClientGapAnalysisRelatedListItem {
  id: string;
  category: string;
  currentCoverage: number;
  suggestedCoverage: number;
  gap: number;
  completionRate: number;
  priority: RelatedListPriority;
  rationale: string;
  evidence: RelatedListSourceReference[];
}
