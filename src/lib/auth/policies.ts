import type { AiModule } from "@/generated/prisma/enums";
import type { AppSession, PlatformSession } from "./session";

const ORG_ADMIN_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export interface ClientPolicySubject {
  organizationId: string;
  unitId?: string | null;
  ownerId?: string | null;
}

export function canReadClientDetail(session: AppSession, client: ClientPolicySubject): boolean {
  if (client.organizationId !== session.organization.id) {
    return false;
  }

  return client.ownerId === session.user.id;
}

export function canWriteClient(session: AppSession, client: ClientPolicySubject): boolean {
  return canReadClientDetail(session, client);
}

export function canReadOrgAggregate(
  session: AppSession,
  target: { organizationId: string; unitId?: string | null },
): boolean {
  if (target.organizationId !== session.organization.id) {
    return false;
  }

  if (!ORG_ADMIN_ROLES.has(session.membership.role)) {
    return false;
  }

  if (session.membership.role !== "MANAGER") {
    return true;
  }

  if (session.membership.managedUnitIds.length === 0) {
    return true;
  }

  return Boolean(target.unitId && session.membership.managedUnitIds.includes(target.unitId));
}

export function canUseAiModule(
  session: AppSession,
  module: AiModule,
): { allowed: boolean; code?: "QUOTA_EXCEEDED"; remaining: number } {
  void module;

  const remaining = Math.max(0, session.organization.monthlyAiQuota - session.organization.monthlyAiUsed);

  if (remaining <= 0) {
    return { allowed: false, code: "QUOTA_EXCEEDED", remaining };
  }

  return { allowed: true, remaining };
}

export function canBreakGlass(session: PlatformSession): boolean {
  return session.role === "SUPER_ADMIN" || session.role === "SUPPORT";
}
