export type TheaterPersonaType = 
  | 'CONSERVATIVE' 
  | 'SKEPTICAL' 
  | 'BUSY' 
  | 'EMOTIONAL';

export interface TheaterPersona {
  id: string;
  type: TheaterPersonaType;
  traits: string[];
  communicationStyle: string;
  objectionStyle: string;
}

export type TheaterDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface TheaterSession {
  id: string;
  spinSessionId: string;
  clientId: string;
  clientName: string;
  personaType: TheaterPersonaType;
  difficulty: TheaterDifficulty;
  tension: number; // 0 - 100
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface TheaterTurn {
  id: string;
  sessionId: string;
  role: 'agent' | 'client';
  content: string;
  tensionDelta?: number;
  createdAt: string;
}

export interface TheaterScore {
  empathy: number;
  questioning: number;
  clarity: number;
  objectionHandling: number;
  closing: number;
  missedOpportunities: string[];
  improvedPhrasing: string[];
}
