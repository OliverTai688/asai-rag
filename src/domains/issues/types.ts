export type AdvisorIssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type AdvisorIssuePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type AdvisorIssueEvidenceKind = "FACT" | "INFERENCE" | "UNKNOWN";

export interface AdvisorIssueEvidenceItem {
  id: string;
  label: string;
  text: string;
  source: string;
}

export interface AdvisorIssueEvidence {
  facts: AdvisorIssueEvidenceItem[];
  inferences: AdvisorIssueEvidenceItem[];
  unknowns: AdvisorIssueEvidenceItem[];
}

export interface AdvisorIssueSourceReference {
  id: string;
  label: string;
  type: "ISSUE_RECORD" | "REPORTER" | "STATUS" | "FEEDBACK";
}

export interface AdvisorIssueReadiness {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
  missingDimensions: string[];
  internalOnly: true;
  clientFacingVisible: false;
}

export interface AdvisorIssueNextAction {
  label: string;
  description: string;
  actionType: "REQUEST_CONTEXT" | "ASSIGN_OWNER" | "RESPOND" | "VERIFY_RESOLUTION" | "CLOSE";
}

export interface AdvisorIssueDto {
  id: string;
  title: string;
  description: string;
  category: string;
  status: AdvisorIssueStatus;
  priority: AdvisorIssuePriority;
  reporterName: string;
  assigneeName: string | null;
  feedback: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
  evidence: AdvisorIssueEvidence;
  sourceReferences: AdvisorIssueSourceReference[];
  internalReadiness: AdvisorIssueReadiness;
  nextAction: AdvisorIssueNextAction;
  actionState: {
    assignedToMe: boolean;
    canUpdateStatus: boolean;
  };
}

export interface AdvisorIssueListDto {
  issues: AdvisorIssueDto[];
  generatedAt: string;
  source: "database";
  visibility: "member-scoped";
}
