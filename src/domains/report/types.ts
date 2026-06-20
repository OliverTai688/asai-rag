export type ReportSectionType =
  // legacy / SPIN 構面（保留向後相容）
  | 'situation'
  | 'problem'
  | 'implication'
  | 'recommendation'
  | 'summary'
  | 'performance'
  // 結構化報告新增構面
  | 'cover'        // 執行摘要 / 封面
  | 'methodology'  // 方法論：SPIN 探詢脈絡（內部）
  | 'analysis'     // 分析：風險與保障缺口
  | 'family'       // 家庭保障藍圖
  | 'action'       // 行動計畫
  | 'compliance'   // 合規聲明與後續
  | 'appendix';    // 附錄

/**
 * 報告用途 / 目標：決定產生的結構化區塊組合與長度。
 */
export type ReportPurpose =
  | 'comprehensive'      // 全面需求分析報告
  | 'proposal'           // 方案建議書
  | 'policy_review'      // 保單健檢報告
  | 'family_protection'  // 家庭保障規劃
  | 'retirement'         // 退休與資產規劃
  | 'follow_up';         // 回訪追蹤摘要

/**
 * 僅內部可見、客戶版報告會過濾掉的構面。
 */
export const INTERNAL_ONLY_SECTION_TYPES: ReportSectionType[] = ['performance', 'methodology'];

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
  title?: string;
  clientId: string;
  clientName: string;
  purpose?: ReportPurpose;
  goal?: string;
  spinSessionId?: string;
  theaterSessionId?: string;
  interviewSessionId?: string;
  sections: ReportSection[];
  clientSections?: ReportSection[];
  share?: ShareMeta;
  status?: "DRAFT" | "READY" | "SHARED" | "ARCHIVED";
  version: number;
  createdAt: string;
  updatedAt: string;
}
