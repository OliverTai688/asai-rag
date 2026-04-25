export type ReportSectionType = 
  | 'situation' 
  | 'problem' 
  | 'implication' 
  | 'recommendation' 
  | 'summary' 
  | 'performance';

export interface ReportSection {
  id: string;
  type: ReportSectionType;
  title: string;
  content: string;
  isEdited?: boolean;
}

export interface ShareMeta {
  token: string;
  expiresAt?: string;
  accessCount: number;
  lastAccessedAt?: string;
}

export interface Report {
  id: string;
  clientId: string;
  clientName: string;
  spinSessionId?: string;
  theaterSessionId?: string;
  sections: ReportSection[];
  share?: ShareMeta;
  version: number;
  createdAt: string;
  updatedAt: string;
}
