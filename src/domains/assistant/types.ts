export type AssistantStepStatus = 'active' | 'done' | 'error';

/** A single visible step in the copilot's reasoning trail (plan → gather → draft). */
export interface AssistantRunStep {
  id: string;
  label: string;
  status: AssistantStepStatus;
}

/** A rich, generated artifact the copilot produced and the panel renders as a card. */
export type AssistantArtifact = {
  id: string;
  kind: 'visit_package';
  clientId: string;
  clientName: string;
  purpose: string;
  /** Full visit preparation package (objectives / SPIN questions / objections / timeline / materials / evidence). */
  data: unknown;
};

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  /** Progressive reasoning steps rendered above the reply (assistant only). */
  steps?: AssistantRunStep[];
  /** Rich artifacts (e.g. a visit package) the assistant generated this turn. */
  artifacts?: AssistantArtifact[];
}

/** Newline-delimited-JSON events streamed by POST /api/ai/chat. */
export type AssistantStreamEvent =
  | { type: 'step'; id: string; label?: string; status: AssistantStepStatus }
  | { type: 'artifact'; artifact: AssistantArtifact }
  | { type: 'text'; content: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface Conversation {
  id: string;
  title: string;
  messages: AssistantMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AssistantSuggestion {
  id: string;
  label: string;
  action: string; // Tool command or shortcut
  context?: string;
  type: 'INFO' | 'ACTION' | 'ALERT';
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  type: 'REPORT_OPENED' | 'OVERDUE' | 'SYSTEM' | 'CHANCE';
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AssistantContext {
  route: string;
  clientId?: string;
  clientName?: string;
}
