import type {
  AuditLogDraft,
  ImpersonationDecision,
  ImpersonationRequest,
  PlatformRole,
  PlatformSessionBoundary,
} from "./types";

const MAX_IMPERSONATION_MINUTES = 60;

export const PLATFORM_SESSION_BOUNDARY: PlatformSessionBoundary = {
  sessionType: "platform",
  allowedRoles: ["SUPER_ADMIN", "SUPPORT", "FINANCE"],
  deniedSessionTypes: ["app", "client", "token"],
};

export function canAccessSuperAdmin(role: PlatformRole): boolean {
  return PLATFORM_SESSION_BOUNDARY.allowedRoles.includes(role);
}

export function evaluateImpersonationRequest(
  request: ImpersonationRequest,
): ImpersonationDecision {
  if (request.actorRole === "FINANCE") {
    return {
      allowed: false,
      code: "ROLE_NOT_ALLOWED",
      message: "Finance role can view billing/support summaries but cannot impersonate users.",
    };
  }

  if (!request.reason.trim()) {
    return {
      allowed: false,
      code: "MISSING_REASON",
      message: "Impersonation requires a break-glass reason.",
    };
  }

  if (request.scope.length === 0) {
    return {
      allowed: false,
      code: "MISSING_SCOPE",
      message: "Impersonation requires at least one explicit scope.",
    };
  }

  const startsAt = Date.parse(request.startsAt);
  const expiresAt = Date.parse(request.expiresAt);

  if (!Number.isFinite(expiresAt) || expiresAt <= startsAt) {
    return {
      allowed: false,
      code: "MISSING_EXPIRY",
      message: "Impersonation requires an expiry after the start time.",
    };
  }

  if (expiresAt - startsAt > MAX_IMPERSONATION_MINUTES * 60 * 1000) {
    return {
      allowed: false,
      code: "EXPIRY_TOO_LONG",
      message: `Impersonation expiry cannot exceed ${MAX_IMPERSONATION_MINUTES} minutes.`,
    };
  }

  return {
    allowed: true,
    message: "Impersonation request is scoped, time-boxed, and ready to audit.",
  };
}

export function createImpersonationAuditDraft(
  request: ImpersonationRequest,
  impersonationSessionId: string,
): AuditLogDraft {
  return {
    organizationId: request.targetOrgId,
    actorUserId: request.actorUserId,
    targetUserId: request.targetUserId,
    impersonationSessionId,
    action: "IMPERSONATION_START",
    sensitivity: "BREAK_GLASS",
    resourceType: "ImpersonationSession",
    resourceId: impersonationSessionId,
    reason: request.reason,
    metadata: {
      scope: request.scope,
      startsAt: request.startsAt,
      expiresAt: request.expiresAt,
    },
  };
}

export function requiresBreakGlassAudit(action: AuditLogDraft["action"]): boolean {
  return action === "VIEW_SENSITIVE" || action === "BREAK_GLASS" || action.startsWith("IMPERSONATED_");
}
