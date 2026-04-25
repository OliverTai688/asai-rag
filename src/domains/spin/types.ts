export type SpinPhase = 
  | "SITUATION" 
  | "PROBLEM" 
  | "IMPLICATION" 
  | "NEED_PAYOFF" 
  | "COMPLETE";

export type SpinMode = "SELF_CLARIFY" | "QUESTION_DESIGN";

export type SpinMessageType = "CHAT" | "INSIGHT" | "QUESTION" | "SUGGESTION" | "SUMMARY";

export interface SpinMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  type: SpinMessageType;
  content: string;
  phase: SpinPhase;
  createdAt: string;
  metadata?: Record<string, unknown>;
  isStreaming?: boolean;
}

export interface SpinTransition {
  from: SpinPhase;
  to: SpinPhase;
  trigger: "AI" | "USER";
  timestamp: string;
}

export interface SpinSession {
  id: string;
  clientId: string;
  clientName: string;
  phase: SpinPhase;
  mode: SpinMode;
  outputs: {
    SITUATION: string[];
    PROBLEM: string[];
    IMPLICATION: string[];
    NEED_PAYOFF: string[];
  };
  transitions: SpinTransition[];
  summary?: {
    keyInsights: string[];
    keyProblems: string[];
    suggestedActions: string[];
  };
  createdAt: string;
  updatedAt: string;
}
