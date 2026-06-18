import type { AuditAction, AuditSensitivity } from "@/generated/prisma/enums";
import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import { canReadPlatformAuditLogs, listPlatformAuditLogs } from "@/lib/platform/platform-read-repository";

const AUDIT_ACTIONS = new Set<AuditAction>([
  "VIEW_SUMMARY",
  "VIEW_SENSITIVE",
  "BREAK_GLASS",
  "IMPERSONATION_START",
  "IMPERSONATION_END",
  "IMPERSONATED_READ",
  "IMPERSONATED_WRITE",
  "BILLING_UPDATE",
  "PLAN_UPDATE",
  "SUPPORT_NOTE",
]);

const AUDIT_SENSITIVITIES = new Set<AuditSensitivity>(["LOW", "MEDIUM", "HIGH", "BREAK_GLASS"]);

function auditAction(value: string | null) {
  if (!value) return undefined;
  return AUDIT_ACTIONS.has(value as AuditAction) ? (value as AuditAction) : null;
}

function auditSensitivity(value: string | null) {
  if (!value) return undefined;
  return AUDIT_SENSITIVITIES.has(value as AuditSensitivity) ? (value as AuditSensitivity) : null;
}

export async function GET(request: Request) {
  try {
    const session = await requirePlatformUser();

    if (!canReadPlatformAuditLogs(session)) {
      return Response.json({ error: "PLATFORM_AUDIT_FORBIDDEN" }, { status: 403 });
    }

    const url = new URL(request.url);
    const action = auditAction(url.searchParams.get("action"));
    const sensitivity = auditSensitivity(url.searchParams.get("sensitivity"));

    if (action === null || sensitivity === null) {
      return Response.json({ error: "INVALID_AUDIT_FILTER" }, { status: 400 });
    }

    return Response.json(
      await listPlatformAuditLogs({
        organizationId: url.searchParams.get("organizationId") ?? undefined,
        action,
        sensitivity,
      }),
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
