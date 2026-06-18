import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentProvider } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { AppSession } from "@/lib/auth/session";

const BILLING_VISIBILITY = ["OWNER_ONLY", "OWNER_ADMIN", "MANAGER_SUMMARY"] as const;
const DEFAULT_COMPLIANCE_REVIEW = ["NONE", "BASIC", "STRICT"] as const;

type BillingVisibility = (typeof BILLING_VISIBILITY)[number];
type DefaultComplianceReview = (typeof DEFAULT_COMPLIANCE_REVIEW)[number];

export type OrgSettings = {
  profile: {
    displayName: string;
    logoUrl: string;
    brandColor: string;
  };
  clientPortal: {
    enabled: boolean;
    shareBrandingEnabled: boolean;
    defaultCtaLabel: string;
    defaultCtaUrl: string;
  };
  complianceDefaults: {
    requireKycBeforeReport: boolean;
    requireSuitabilityCheck: boolean;
    defaultReviewLevel: DefaultComplianceReview;
  };
  billingVisibility: {
    level: BillingVisibility;
  };
  aiQuota: {
    monthlyQuota: number;
    warningThresholdPercent: number;
  };
};

export type OrgSettingsResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: AppSession["organization"]["plan"];
    logoUrl: string | null;
    brandColor: string | null;
    monthlyAiQuota: number;
    monthlyAiUsed: number;
    paymentProvider: PaymentProvider | null;
    status: AppSession["organization"]["status"];
  };
  settings: OrgSettings;
  planPolicy: {
    maxMembers: number;
    maxCollaborators: number;
    maxUnits: number;
    monthlyAiQuota: number;
    shareBrandingEnabled: boolean;
    clientPortalEnabled: boolean;
  };
  scope: {
    role: AppSession["membership"]["role"];
    unitIds: string[];
    scopedToManagedUnits: boolean;
  };
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canManageBillingVisibility: boolean;
    canEnableShareBranding: boolean;
    canEnableClientPortal: boolean;
  };
};

const orgSettingsSchema = z.object({
  profile: z.object({
    displayName: z.string().trim().min(2).max(80),
    logoUrl: z.string().trim().url().or(z.literal("")),
    brandColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).or(z.literal("")),
  }),
  clientPortal: z.object({
    enabled: z.boolean(),
    shareBrandingEnabled: z.boolean(),
    defaultCtaLabel: z.string().trim().min(1).max(40),
    defaultCtaUrl: z.string().trim().url().or(z.literal("")),
  }),
  complianceDefaults: z.object({
    requireKycBeforeReport: z.boolean(),
    requireSuitabilityCheck: z.boolean(),
    defaultReviewLevel: z.enum(DEFAULT_COMPLIANCE_REVIEW),
  }),
  billingVisibility: z.object({
    level: z.enum(BILLING_VISIBILITY),
  }),
  aiQuota: z.object({
    monthlyQuota: z.number().int().min(0),
    warningThresholdPercent: z.number().int().min(50).max(100),
  }),
});

export const orgSettingsPatchSchema = z
  .object({
    profile: orgSettingsSchema.shape.profile.partial().optional(),
    clientPortal: orgSettingsSchema.shape.clientPortal.partial().optional(),
    complianceDefaults: orgSettingsSchema.shape.complianceDefaults.partial().optional(),
    billingVisibility: orgSettingsSchema.shape.billingVisibility.partial().optional(),
    aiQuota: orgSettingsSchema.shape.aiQuota.pick({ warningThresholdPercent: true }).partial().optional(),
    reason: z.string().trim().min(4).max(240),
  })
  .strict();

export type OrgSettingsPatch = z.infer<typeof orgSettingsPatchSchema>;

type OrgSettingsMergePatch = Omit<OrgSettingsPatch, "reason">;

type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  plan: AppSession["organization"]["plan"];
  status: AppSession["organization"]["status"];
  logoUrl: string | null;
  brandColor: string | null;
  settings: Prisma.JsonValue | null;
  monthlyAiQuota: number;
  monthlyAiUsed: number;
  paymentProvider: PaymentProvider | null;
};

export async function getOrgSettings(session: AppSession): Promise<OrgSettingsResponse> {
  const organization = await prisma.organization.findUnique({
    where: { id: session.organization.id },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      logoUrl: true,
      brandColor: true,
      settings: true,
      monthlyAiQuota: true,
      monthlyAiUsed: true,
      paymentProvider: true,
    },
  });

  if (!organization) {
    throw new Error("Current organization was not found.");
  }

  return buildResponse(session, organization, normalizeSettings(session, organization));
}

export async function updateOrgSettings(
  session: AppSession,
  patch: OrgSettingsPatch,
): Promise<OrgSettingsResponse> {
  if (!canWriteOrgSettings(session)) {
    const error = new Error("ORG_SETTINGS_WRITE_FORBIDDEN");
    error.name = "OrgSettingsForbiddenError";
    throw error;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.organization.id },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      logoUrl: true,
      brandColor: true,
      settings: true,
      monthlyAiQuota: true,
      monthlyAiUsed: true,
      paymentProvider: true,
    },
  });

  if (!organization) {
    throw new Error("Current organization was not found.");
  }

  const currentSettings = normalizeSettings(session, organization);
  const nextSettings = enforceOrgPolicy(session, mergeSettings(currentSettings, patch));

  const updatedOrganization = await prisma.$transaction(async (tx) => {
    const updated = await tx.organization.update({
      where: { id: session.organization.id },
      data: {
        name: nextSettings.profile.displayName,
        logoUrl: nextSettings.profile.logoUrl || null,
        brandColor: nextSettings.profile.brandColor || null,
        settings: nextSettings as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        logoUrl: true,
        brandColor: true,
        settings: true,
        monthlyAiQuota: true,
        monthlyAiUsed: true,
        paymentProvider: true,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorUserId: session.user.id,
        action: "SUPPORT_NOTE",
        sensitivity: "MEDIUM",
        resourceType: "ORG_SETTINGS",
        resourceId: session.organization.id,
        reason: patch.reason,
        metadata: {
          changedSections: Object.keys(patch).filter((key) => key !== "reason"),
          plan: session.organization.plan,
          role: session.membership.role,
          clientPortalEnabled: nextSettings.clientPortal.enabled,
          shareBrandingEnabled: nextSettings.clientPortal.shareBrandingEnabled,
          billingVisibility: nextSettings.billingVisibility.level,
          warningThresholdPercent: nextSettings.aiQuota.warningThresholdPercent,
        },
      },
    });

    return updated;
  });

  return buildResponse(session, updatedOrganization, normalizeSettings(session, updatedOrganization));
}

export function canWriteOrgSettings(session: AppSession) {
  return session.membership.role === "OWNER" || session.membership.role === "ADMIN";
}

function normalizeSettings(session: AppSession, organization: OrganizationRecord): OrgSettings {
  const defaults = defaultSettings(session, organization);
  const parsed = orgSettingsSchema.partial().safeParse(organization.settings);

  if (!parsed.success) {
    return enforceOrgPolicy(session, defaults);
  }

  return enforceOrgPolicy(session, mergeSettings(defaults, parsed.data));
}

function defaultSettings(session: AppSession, organization: OrganizationRecord): OrgSettings {
  return {
    profile: {
      displayName: organization.name,
      logoUrl: organization.logoUrl ?? "",
      brandColor: organization.brandColor ?? "",
    },
    clientPortal: {
      enabled: session.planCapability.clientPortalEnabled,
      shareBrandingEnabled: session.planCapability.shareBrandingEnabled,
      defaultCtaLabel: "補充資料",
      defaultCtaUrl: "",
    },
    complianceDefaults: {
      requireKycBeforeReport: true,
      requireSuitabilityCheck: true,
      defaultReviewLevel: "BASIC",
    },
    billingVisibility: {
      level: "OWNER_ADMIN",
    },
    aiQuota: {
      monthlyQuota: session.planCapability.monthlyAiQuota,
      warningThresholdPercent: 80,
    },
  };
}

function mergeSettings(current: OrgSettings, patch: OrgSettingsMergePatch): OrgSettings {
  return {
    profile: { ...current.profile, ...patch.profile },
    clientPortal: { ...current.clientPortal, ...patch.clientPortal },
    complianceDefaults: { ...current.complianceDefaults, ...patch.complianceDefaults },
    billingVisibility: { ...current.billingVisibility, ...patch.billingVisibility },
    aiQuota: { ...current.aiQuota, ...patch.aiQuota },
  };
}

function enforceOrgPolicy(session: AppSession, settings: OrgSettings): OrgSettings {
  const canExposeBillingToManager = session.organization.plan === "ENTERPRISE";
  const billingVisibility = canExposeBillingToManager
    ? settings.billingVisibility.level
    : settings.billingVisibility.level === "MANAGER_SUMMARY"
      ? "OWNER_ADMIN"
      : settings.billingVisibility.level;

  return {
    ...settings,
    profile: {
      displayName: settings.profile.displayName.trim(),
      logoUrl: settings.profile.logoUrl.trim(),
      brandColor: settings.profile.brandColor.trim(),
    },
    clientPortal: {
      enabled: session.planCapability.clientPortalEnabled && settings.clientPortal.enabled,
      shareBrandingEnabled: session.planCapability.shareBrandingEnabled && settings.clientPortal.shareBrandingEnabled,
      defaultCtaLabel: settings.clientPortal.defaultCtaLabel.trim() || "補充資料",
      defaultCtaUrl: settings.clientPortal.defaultCtaUrl.trim(),
    },
    billingVisibility: {
      level: billingVisibility,
    },
    aiQuota: {
      monthlyQuota: session.planCapability.monthlyAiQuota,
      warningThresholdPercent: settings.aiQuota.warningThresholdPercent,
    },
  };
}

function buildResponse(
  session: AppSession,
  organization: OrganizationRecord,
  settings: OrgSettings,
): OrgSettingsResponse {
  const canWrite = canWriteOrgSettings(session);

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      logoUrl: organization.logoUrl,
      brandColor: organization.brandColor,
      monthlyAiQuota: organization.monthlyAiQuota,
      monthlyAiUsed: organization.monthlyAiUsed,
      paymentProvider: organization.paymentProvider,
      status: organization.status,
    },
    settings,
    planPolicy: {
      maxMembers: session.planCapability.maxMembers,
      maxCollaborators: session.planCapability.maxCollaborators,
      maxUnits: session.planCapability.maxUnits,
      monthlyAiQuota: session.planCapability.monthlyAiQuota,
      shareBrandingEnabled: session.planCapability.shareBrandingEnabled,
      clientPortalEnabled: session.planCapability.clientPortalEnabled,
    },
    scope: {
      role: session.membership.role,
      unitIds: session.membership.role === "MANAGER" ? session.membership.managedUnitIds : [],
      scopedToManagedUnits: session.membership.role === "MANAGER" && session.membership.managedUnitIds.length > 0,
    },
    permissions: {
      canRead: true,
      canWrite,
      canManageBillingVisibility: canWrite,
      canEnableShareBranding: canWrite && session.planCapability.shareBrandingEnabled,
      canEnableClientPortal: canWrite && session.planCapability.clientPortalEnabled,
    },
  };
}
