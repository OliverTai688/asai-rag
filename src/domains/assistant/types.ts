export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

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
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AssistantContext {
  route: string;
  clientId?: string;
  clientName?: string;
}
