export type VisitPurpose = 
  | "FIRST_VISIT"  // 初訪
  | "ADD_ON"       // 加保
  | "RENEWAL"      // 續約
  | "CARE"         // 關懷
  | "REFERRAL";    // 轉介紹

export type VisitPlanStatus = "DRAFT" | "READY" | "COMPLETED";

export interface VisitObjective {
  id: string;
  description: string;
  successCriteria: string;
}

export interface SpinQuestion {
  id: string;
  type: "S" | "P" | "I" | "N";
  question: string;
  reasoning?: VisitQuestionReasoning;
}

export type VisitQuestionEvidenceSource =
  | "client_profile"
  | "relationship_graph"
  | "policy"
  | "ai_tag"
  | "visit_purpose"
  | "theater_route_b_red_line"
  | "unknown";

export type VisitQuestionEvidenceStatus = "confirmed" | "inference" | "unknown";

export interface VisitQuestionEvidence {
  id: string;
  source: VisitQuestionEvidenceSource;
  status: VisitQuestionEvidenceStatus;
  label: string;
  detail: string;
}

export interface VisitQuestionReasoning {
  summary: string;
  evidence: VisitQuestionEvidence[];
  confirmationPrompt?: string;
}

export interface ObjectionHandling {
  id: string;
  expectedObjection: string;
  suggestedResponse: string;
}

export interface VisitMaterial {
  id: string;
  name: string;
  checked: boolean;
  fileUrl?: string; // Link to the actual PDF/Document
  sentAt?: string;  // History tracking: when was this sent to the client?
}

export interface VisitPlan {
  id: string;
  clientId: string;
  purpose: VisitPurpose;
  status: VisitPlanStatus;
  createdAt: string;
  updatedAt: string;
  visitTime?: string; // ISO string for scheduled visit
  
  // 區塊 C: 目標
  objectives: VisitObjective[];
  
  // 區塊 D: SPIN 提問劇本
  spinQuestions: SpinQuestion[];
  
  // 區塊 E: 預期疑問與回應
  objections: ObjectionHandling[];
  
  // 區塊 G: 資料清單
  materials: VisitMaterial[];
  
  // 區塊 H: 拜訪後記
  postVisitNotes?: string;
  postVisitAnalysis?: string; // AI 分析與下一步建議

  // 協作與回饋
  feedback?: {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
  }[];
}
