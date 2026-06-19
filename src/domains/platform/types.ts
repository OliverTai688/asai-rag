export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "FINANCE";

export type ImpersonationStatus = "ACTIVE" | "ENDED" | "EXPIRED" | "REVOKED";

export type AuditAction =
  | "VIEW_SUMMARY"
  | "VIEW_SENSITIVE"
  | "BREAK_GLASS"
  | "IMPERSONATION_START"
  | "IMPERSONATION_END"
  | "IMPERSONATED_READ"
  | "IMPERSONATED_WRITE"
  | "BILLING_UPDATE"
  | "PLAN_UPDATE"
  | "SUPPORT_NOTE";

export type AuditSensitivity = "LOW" | "MEDIUM" | "HIGH" | "BREAK_GLASS";

export type ImpersonationScope =
  | "ORG_SUMMARY"
  | "MEMBER_PROFILE"
  | "BILLING"
  | "SUPPORT_DIAGNOSTICS"
  | "SENSITIVE_REPORT_READ"
  | "SENSITIVE_CLIENT_READ";

export interface PlatformSessionBoundary {
  sessionType: "platform";
  allowedRoles: PlatformRole[];
  deniedSessionTypes: Array<"app" | "client" | "token">;
}

export interface ImpersonationRequest {
  actorUserId: string;
  actorRole: PlatformRole;
  targetOrgId: string;
  targetUserId?: string;
  reason: string;
  scope: ImpersonationScope[];
  startsAt: string;
  expiresAt: string;
}

export interface ImpersonationDecision {
  allowed: boolean;
  code?: "ROLE_NOT_ALLOWED" | "MISSING_REASON" | "MISSING_SCOPE" | "MISSING_EXPIRY" | "EXPIRY_TOO_LONG";
  message: string;
}

export interface AuditLogDraft {
  organizationId?: string;
  actorUserId?: string;
  targetUserId?: string;
  impersonationSessionId?: string;
  action: AuditAction;
  sensitivity: AuditSensitivity;
  resourceType: string;
  resourceId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}
