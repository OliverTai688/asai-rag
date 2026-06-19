import type { InviteRole, PlanConfig, PlanLimitDecision, PlanType, PlanUsageSnapshot } from "./types";

export const DEFAULT_PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  FREE: {
    plan: "FREE",
    displayName: "Free",
    maxMembers: 1,
    maxCollaborators: 0,
    maxUnits: 1,
    monthlyAiQuota: 10,
    shareBrandingEnabled: false,
    clientPortalEnabled: false,
    impersonationAllowed: true,
  },
  STARTER: {
    plan: "STARTER",
    displayName: "Starter",
    maxMembers: 1,
    maxCollaborators: 2,
    maxUnits: 1,
    monthlyAiQuota: 200,
    shareBrandingEnabled: false,
    clientPortalEnabled: false,
    impersonationAllowed: true,
  },
  PRO: {
    plan: "PRO",
    displayName: "Pro",
    maxMembers: 20,
    maxCollaborators: 5,
    maxUnits: 1,
    monthlyAiQuota: 1000,
    shareBrandingEnabled: true,
    clientPortalEnabled: true,
    impersonationAllowed: true,
  },
  ENTERPRISE: {
    plan: "ENTERPRISE",
    displayName: "Enterprise",
    maxMembers: 500,
    maxCollaborators: 25,
    maxUnits: 100,
    monthlyAiQuota: 10000,
    shareBrandingEnabled: true,
    clientPortalEnabled: true,
    impersonationAllowed: true,
  },
};

export function getPlanConfig(plan: PlanType, overrides?: Partial<PlanConfig>): PlanConfig {
  return {
    ...DEFAULT_PLAN_CONFIGS[plan],
    ...overrides,
    plan,
  };
}

export function isCollaboratorRole(role: InviteRole): boolean {
  return role === "COLLABORATOR";
}

export function checkInviteLimit(
  config: PlanConfig,
  usage: Pick<PlanUsageSnapshot, "activeMembers" | "activeCollaborators">,
  inviteRole: InviteRole,
): PlanLimitDecision {
  if (isCollaboratorRole(inviteRole)) {
    return compareLimit({
      used: usage.activeCollaborators,
      limit: config.maxCollaborators,
      code: "MAX_COLLABORATORS_REACHED",
      message: "此方案的協作者名額已滿，請升級方案或聯絡管理員調整上限。",
    });
  }

  return compareLimit({
    used: usage.activeMembers,
    limit: config.maxMembers,
    code: "MAX_MEMBERS_REACHED",
    message: "此方案的成員名額已滿，請升級方案或聯絡管理員調整上限。",
  });
}

export function checkUnitLimit(
  config: PlanConfig,
  usage: Pick<PlanUsageSnapshot, "activeUnits">,
): PlanLimitDecision {
  return compareLimit({
    used: usage.activeUnits,
    limit: config.maxUnits,
    code: "MAX_UNITS_REACHED",
    message: "此方案的組織層級名額已滿，請升級方案或聯絡管理員調整上限。",
  });
}

export function checkMonthlyAiQuota(
  config: PlanConfig,
  usage: Pick<PlanUsageSnapshot, "monthlyAiUsed">,
): PlanLimitDecision {
  return compareLimit({
    used: usage.monthlyAiUsed,
    limit: config.monthlyAiQuota,
    code: "MONTHLY_AI_QUOTA_REACHED",
    message: "此方案的本月 AI 用量已達上限，請升級方案或聯絡管理員調整額度。",
  });
}

function compareLimit({
  used,
  limit,
  code,
  message,
}: {
  used: number;
  limit: number;
  code: NonNullable<PlanLimitDecision["code"]>;
  message: string;
}): PlanLimitDecision {
  if (used < limit) {
    return { allowed: true, used, limit };
  }

  return {
    allowed: false,
    code,
    used,
    limit,
    message,
  };
}
