export type InterviewMode = "INDEPENDENT" | "CLIENT_CONTEXT";

export type InterviewFramework = "SPIN_HIDDEN" | "SCHEIN_3LAYER";

export type InterviewKind = "ADVISOR_COMPANION" | "THEATER_FIELD_BUILD";

export type InterviewTurnRole = "USER" | "ASSISTANT" | "SYSTEM";

export type InterviewModality = "TEXT" | "VOICE_REALTIME" | "VOICE_TRANSCRIPT_FALLBACK";

export type InterviewOutputFieldType =
  | "text"
  | "list"
  | "table"
  | "rolecard"
  | "relationmap"
  | "spinQuestions"
  | "pq";

export type InterviewMaterialKind = "FACT" | "INFERENCE" | "UNKNOWN";

export type InterviewSessionStatus = "DRAFT" | "ACTIVE" | "READY_TO_REVIEW" | "COMPLETED";

export type InterviewConfidence = "LOW" | "MEDIUM" | "HIGH";

export type InterviewMemoryKind =
  | "UTTERANCE"
  | "CRM_FACT"
  | "SYSTEM_FACT"
  | "CONFIRMED_FACT"
  | "INFERENCE"
  | "UNKNOWN"
  | "REFLECTION"
  | "PLAN"
  | "CORRECTION";

export type InterviewMemorySource =
  | "VOICE_TRANSCRIPT"
  | "TEXT_INPUT"
  | "CRM"
  | "POLICY"
  | "FAMILY_GRAPH"
  | "AI_REFLECTION"
  | "USER_CONFIRMATION"
  | "SYSTEM";

export type InterviewDataClass = "FACT" | "CONFIRMED" | "INFERENCE" | "UNKNOWN" | "INSTRUCTION";

export type InterviewVisibilityScope =
  | "MEMBER_PRIVATE"
  | "CLIENT_RECORD_CANDIDATE"
  | "ORG_AGGREGATE_ONLY"
  | "THEATER_BUILD_PRIVATE";

export type InterviewEmbeddingStatus = "PENDING" | "READY" | "SKIPPED";

export type InterviewRetentionPolicy = "SESSION_ONLY" | "MEMBER_WORKSPACE" | "CLIENT_CANDIDATE" | "THEATER_BUILD";

export type InterviewMemoryImportance = 1 | 2 | 3 | 4 | 5;

export type IssueReadinessLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type IssueEvidenceKind = "FACT" | "CONFIRMED" | "INFERENCE" | "UNKNOWN";

export type IssueReadinessDimension =
  | "FACT_COMPLETENESS"
  | "PROBLEM_REPRESENTATION"
  | "RISK_AND_COPING_APPRAISAL"
  | "DECISION_READINESS"
  | "ADVISOR_ACTIONABILITY";

export interface InterviewQuestion {
  id: string;
  text: string;
}

export interface InterviewSegment {
  order: number;
  id: string;
  title: string;
  subtitle?: string;
  frameworkStep?: "SITUATION" | "PROBLEM" | "IMPLICATION" | "NEED_PAYOFF" | "SYNTHESIS";
  goal: string;
  dataSource: string;
  purpose: string;
  coreQuestions: InterviewQuestion[];
  followUps: InterviewQuestion[];
  guideNote?: string;
}

export interface OutputField {
  key: string;
  label: string;
  type: InterviewOutputFieldType;
  sourceSegments: number[];
  description?: string;
}

export interface InterviewOutline {
  id: string;
  name: string;
  role: string;
  framework: InterviewFramework;
  principles: string[];
  segments: InterviewSegment[];
  outputSchema: OutputField[];
}

export interface InterviewAnswer {
  id: string;
  segmentId: string;
  questionId: string;
  content: string;
  createdAt: string;
}

export interface InterviewMaterial {
  id: string;
  segmentId: string;
  fieldKey: string;
  kind: InterviewMaterialKind;
  content: string;
  confidence: InterviewConfidence;
  sourceAnswerIds: string[];
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  outlineId: string;
  mode: InterviewMode;
  status: InterviewSessionStatus;
  currentSegmentId: string;
  clientId?: string;
  visitPlanId?: string;
  answers: InterviewAnswer[];
  materials: InterviewMaterial[];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewMemory {
  id: string;
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  clientId?: string | null;
  interviewSessionId: string;
  turnId?: string | null;
  interviewKind: InterviewKind;
  createdAt: string;
  kind: InterviewMemoryKind;
  source: InterviewMemorySource;
  dataClass: InterviewDataClass;
  visibilityScope: InterviewVisibilityScope;
  text: string;
  evidenceText?: string;
  confidence: InterviewConfidence;
  importance: InterviewMemoryImportance;
  issueTags: string[];
  outlineSegmentId?: string;
  pqQuestionIds?: string[];
  embeddingStatus: InterviewEmbeddingStatus;
  retentionPolicy: InterviewRetentionPolicy;
  supersedesMemoryId?: string;
  supersededByMemoryId?: string;
}

export interface InterviewReflection {
  id: string;
  organizationId: string;
  interviewSessionId: string;
  interviewKind: InterviewKind;
  segmentId?: string;
  summary: string;
  confirmedFacts: string[];
  inferredPatterns: string[];
  unknowns: string[];
  issueReadinessImpact?: string;
  theaterBuildImpact?: string;
  recommendedNextFocus: string;
  supportingMemoryIds: string[];
}

export interface InterviewMicroPlan {
  objective: string;
  nextQuestion: string;
  whyThisQuestion: string;
  outlineSegmentId: string;
  issueTags: string[];
  expectedEvidenceType: "FACT" | "VALUE" | "RISK" | "DECISION" | "RELATIONSHIP" | "NEXT_STEP";
  avoid: string[];
  supportingMemoryIds?: string[];
}

export type TheaterBuildReadiness = "READY" | "NEEDS_MORE_INFO";

export type TheaterBuildPersonaConfidence = "CONFIRMED" | "INFERRED" | "UNKNOWN";

export interface TheaterBuildCharacterSeed {
  id: string;
  displayName: string;
  role: "FOCUS_CLIENT" | "DECISION_MAKER" | "INFLUENCER" | "ADVISOR" | "NARRATOR";
  isFocus: boolean;
  knownFacts: string[];
  inferences: string[];
  unknowns: string[];
  personaHints: {
    label: string;
    confidence: TheaterBuildPersonaConfidence;
    evidenceMemoryIds: string[];
  }[];
  exemplarLines: string[];
}

export interface TheaterBuildReflection {
  focusClient?: string;
  scenario?: string;
  confirmedFacts: string[];
  inferredPatterns: string[];
  unknowns: string[];
  necessaryNpcRoles: string[];
  narratorQuestions: string[];
  supportingMemoryIds: string[];
}

export interface TheaterBuildPacket {
  id: string;
  interviewSessionId: string;
  interviewKind: "THEATER_FIELD_BUILD";
  readiness: TheaterBuildReadiness;
  focusClient?: string;
  scenario?: string;
  characters: TheaterBuildCharacterSeed[];
  relationships: string[];
  objections: string[];
  sensitiveNotes: string[];
  confirmedFacts: string[];
  inferredPersona: string[];
  unknowns: string[];
  narratorQuestions: string[];
  supportingMemoryIds: string[];
  routeBCompatibility: {
    npcCount: number;
    maxNpcCount: 4;
    canStartSimulation: boolean;
    migrationNote: string;
  };
}

export interface SegmentProgress {
  segment: InterviewSegment;
  answeredCoreQuestionIds: string[];
  missingCoreQuestionIds: string[];
  canAdvance: boolean;
}

export interface IssueReadinessDefinition {
  level: IssueReadinessLevel;
  label: string;
  systemMeaning: string;
  allowedOutput: string;
}

export interface IssueCategory {
  key: string;
  label: string;
  primaryEvidence: string[];
  typicalNextStep: string;
}

export interface PqQuestion {
  id: string;
  issueKey: string;
  text: string;
  followUp: string;
  dimensions: IssueReadinessDimension[];
}

export type ComplianceFieldKey =
  | "solicitation_context"
  | "identity_relationship"
  | "insurance_purpose_need"
  | "income_financial_status"
  | "existing_commercial_insurance"
  | "recent_policy_actions"
  | "primary_economic_provider"
  | "beneficiary_reasonableness"
  | "senior_suitability"
  | "product_understanding"
  | "risk_tolerance_capacity"
  | "advisor_compliance_notes";

export interface ComplianceFieldDefinition {
  key: ComplianceFieldKey;
  label: string;
  minimumData: string[];
  evidenceKinds: IssueEvidenceKind[];
  pqIntent: string;
}

export interface PqComplianceMapping {
  intentKey: string;
  complianceFieldKey: ComplianceFieldKey;
  defaultQuestion: string;
  allowedRewrite: boolean;
  evidenceKind: IssueEvidenceKind;
  requiresConfirmationBeforeWriteback: boolean;
  riskFlags: string[];
}

export interface IssueReadinessInput {
  issueKey: string;
  evidenceKinds: IssueEvidenceKind[];
  knownFactsCount: number;
  hasProblemRepresentation: boolean;
  hasRiskAndCopingAppraisal: boolean;
  hasDecisionContext: boolean;
  hasAdvisorNextStep: boolean;
}

export interface IssueReadinessResult {
  issueKey: string;
  level: IssueReadinessLevel;
  label: string;
  missingDimensions: IssueReadinessDimension[];
}

export interface InterviewOutputIssueReadiness {
  issueKey: string;
  label: string;
  level: IssueReadinessLevel;
  reason: string;
  nextStep: string;
}

export interface InterviewOutputDraft {
  clientProfile: {
    relationship: string;
    family: string;
    workIncome: string;
    existingCoverage: string;
    knownFacts: string[];
    unknownsToConfirm: string[];
    likelyIssues: string[];
    decisionContext: string;
    communicationNotes: string;
  };
  conversationPrepCard: {
    opening: string;
    talkTracks: string[];
    firstQuestions: string[];
    landmines: string[];
    desiredNextStep: string;
  };
  spinQuestionCandidates: {
    phase: "SITUATION" | "PROBLEM" | "IMPLICATION" | "NEED_PAYOFF";
    question: string;
  }[];
  pqQuestions: string[];
  issueReadiness: InterviewOutputIssueReadiness[];
  personalityInference: string;
  complianceNotes: string[];
  memoryEvidence?: {
    supportingMemoryIds: string[];
    confirmedFactMemoryIds: string[];
    inferenceMemoryIds: string[];
    unknownMemoryIds: string[];
  };
}
