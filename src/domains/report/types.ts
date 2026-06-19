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
  branding?: ShareBranding;
  portal?: SharePortalConfig;
  ctaConfig?: ShareCtaConfig;
}

export interface ShareBranding {
  organizationName: string;
  unitName?: string;
  logoUrl?: string;
  brandColor?: string;
  poweredByLabel?: string;
}

export interface SharePortalConfig {
  enabled: boolean;
  loginHref: string;
  visibleScopes: string[];
}

export interface ShareCtaConfig {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
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
