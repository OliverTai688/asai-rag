export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  description?: string;
  location?: string;
  attendees?: string[];
  type: 'MEETING' | 'TASK' | 'FOLLOW_UP';
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  source: 'INTERNAL' | 'GOOGLE';
}

export interface CalendarState {
  events: CalendarEvent[];
  isGoogleConnected: boolean;
}
