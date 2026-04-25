export type EventType = "SPIN" | "THEATER" | "REPORT" | "SHARE_OPEN" | "SYSTEM";

export interface InteractionEvent {
  id: string;
  clientId: string;
  clientName: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
