import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { PlatformRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export interface PlatformSettingsSession {
  user: { id: string; name: string };
  role: PlatformRole;
  requireMfa: boolean;
}

const DEFAULT_FEATURE_FLAGS = {
  breakGlassEnabled: true,
  impersonationEnabled: true,
  clientPortalEnabled: false,
  billingCheckoutEnabled: false,
  aiAssistantEnabled: true,
} satisfies Record<
  | "breakGlassEnabled"
  | "impersonationEnabled"
  | "clientPortalEnabled"
  | "billingCheckoutEnabled"
  | "aiAssistantEnabled",
  boolean
>;

const DEFAULT_PROVIDER_POLICY = {
  aiProviderMode: "OPENAI_ONLY",
  paymentProviderMode: "ECPAY_TEST_ONLY",
  productionNotificationsEnabled: false,
  productionEmailEnabled: false,
} as const;

const DEFAULT_SUPPORT_POLICY = {
  maxImpersonationMinutes: 60,
  maxBreakGlassMinutes: 30,
  requireReason: true,
  requireRiskAcceptance: true,
  rawSensitivePayloadAllowed: false,
} as const;

const featureFlagsSchema = z
  .object({
    breakGlassEnabled: z.boolean().optional(),
    impersonationEnabled: z.boolean().optional(),
    clientPortalEnabled: z.boolean().optional(),
    billingCheckoutEnabled: z.boolean().optional(),
    aiAssistantEnabled: z.boolean().optional(),
  })
  .strict();

const providerPolicySchema = z
  .object({
    aiProviderMode: z.enum(["OPENAI_ONLY", "ANTHROPIC_DISABLED", "MOCK_DISABLED"]).optional(),
    paymentProviderMode: z.enum(["ECPAY_TEST_ONLY", "ECPAY_PRODUCTION_READY_DISABLED", "MANUAL_ONLY"]).optional(),
    productionNotificationsEnabled: z.literal(false).optional(),
    productionEmailEnabled: z.literal(false).optional(),
  })
  .strict();

const supportPolicySchema = z
  .object({
    maxImpersonationMinutes: z.number().int().min(5).max(60).optional(),
    maxBreakGlassMinutes: z.number().int().min(5).max(30).optional(),
    requireReason: z.literal(true).optional(),
    requireRiskAcceptance: z.literal(true).optional(),
    rawSensitivePayloadAllowed: z.literal(false).optional(),
  })
  .strict();

export const platformSettingsPatchSchema = z
  .object({
    trialDays: z.number().int().min(0).max(365).optional(),
    featureFlags: featureFlagsSchema.optional(),
    providerPolicy: providerPolicySchema.optional(),
    supportPolicy: supportPolicySchema.optional(),
    reason: z.string().trim().min(10).max(500),
    riskAccepted: z.literal(true),
  })
  .refine(
    (value) =>
      value.trialDays !== undefined ||
      value.featureFlags !== undefined ||
      value.providerPolicy !== undefined ||
      value.supportPolicy !== undefined,
    {
      message: "At least one platform settings field is required.",
      path: ["fields"],
    },
  );

export type PlatformSettingsPatch = z.infer<typeof platformSettingsPatchSchema>;

export function canReadPlatformSettings(session: PlatformSettingsSession) {
  return ["SUPER_ADMIN", "SUPPORT", "FINANCE"].includes(session.role);
}

export function canUpdatePlatformSettings(session: PlatformSettingsSession) {
  return session.role === "SUPER_ADMIN";
}

function asObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function settingsDto(settings: {
  id: string;
  trialDays: number;
  featureFlags: Prisma.JsonValue | null;
  providerPolicy: Prisma.JsonValue | null;
  supportPolicy: Prisma.JsonValue | null;
  updatedAt: Date;
}) {
  return {
    id: settings.id,
    trialDays: settings.trialDays,
    featureFlags: {
      ...DEFAULT_FEATURE_FLAGS,
      ...asObject(settings.featureFlags),
    },
    providerPolicy: {
      ...DEFAULT_PROVIDER_POLICY,
      ...asObject(settings.providerPolicy),
    },
    supportPolicy: {
      ...DEFAULT_SUPPORT_POLICY,
      ...asObject(settings.supportPolicy),
    },
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function patchData(patch: PlatformSettingsPatch) {
  return {
    ...(patch.trialDays !== undefined ? { trialDays: patch.trialDays } : {}),
    ...(patch.featureFlags !== undefined ? { featureFlags: patch.featureFlags } : {}),
    ...(patch.providerPolicy !== undefined ? { providerPolicy: patch.providerPolicy } : {}),
    ...(patch.supportPolicy !== undefined ? { supportPolicy: patch.supportPolicy } : {}),
  };
}

function changedFields(before: ReturnType<typeof settingsDto>, after: ReturnType<typeof settingsDto>) {
  const fields = ["trialDays", "featureFlags", "providerPolicy", "supportPolicy"] as const;

  return fields.filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}

function fieldSnapshot(settings: ReturnType<typeof settingsDto>, fields: ReturnType<typeof changedFields>) {
  const values: Record<string, string | number | boolean | null> = {};

  for (const field of fields) {
    if (field === "trialDays") {
      values[field] = settings[field];
    } else {
      values[field] = JSON.stringify(settings[field]);
    }
  }

  return values as Prisma.InputJsonObject;
}

export async function getPlatformSettings() {
  const settings = await prisma.systemSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      featureFlags: DEFAULT_FEATURE_FLAGS,
      providerPolicy: DEFAULT_PROVIDER_POLICY,
      supportPolicy: DEFAULT_SUPPORT_POLICY,
    },
    update: {},
  });

  return settingsDto(settings);
}

export async function updatePlatformSettings(session: PlatformSettingsSession, patch: PlatformSettingsPatch) {
  const data = patchData(patch);

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.systemSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        featureFlags: DEFAULT_FEATURE_FLAGS,
        providerPolicy: DEFAULT_PROVIDER_POLICY,
        supportPolicy: DEFAULT_SUPPORT_POLICY,
      },
      update: {},
    });

    const before = settingsDto(current);
    const updated = await tx.systemSettings.update({
      where: { id: "default" },
      data,
    });
    const after = settingsDto(updated);
    const fields = changedFields(before, after);

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: "SUPPORT_NOTE",
        sensitivity: "HIGH",
        resourceType: "PLATFORM_SETTINGS",
        resourceId: "default",
        reason: patch.reason,
        metadata: {
          changedFields: fields,
          before: fieldSnapshot(before, fields),
          after: fieldSnapshot(after, fields),
          actorRole: session.role,
          riskAccepted: patch.riskAccepted,
        },
      },
    });

    return {
      settings: after,
      audit: {
        action: "SUPPORT_NOTE",
        sensitivity: "HIGH",
        resourceType: "PLATFORM_SETTINGS",
        changedFields: fields,
      },
    };
  });

  return result;
}
