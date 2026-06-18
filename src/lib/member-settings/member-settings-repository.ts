import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AppSession } from "@/lib/auth/session";

const WORKSPACE_PATHS = ["/dashboard", "/crm", "/pre-visit", "/reports"] as const;
const AI_TONES = ["balanced", "concise", "coaching"] as const;

type WorkspacePath = (typeof WORKSPACE_PATHS)[number];
type AiTone = (typeof AI_TONES)[number];

export type MemberSettings = {
  profile: {
    displayName: string;
    title: string;
    region: string;
    locale: "zh-TW";
  };
  notifications: {
    reportOpened: boolean;
    spinReminder: boolean;
    teamUpdates: boolean;
    aiDailyInsight: boolean;
  };
  aiPreferences: {
    tone: AiTone;
    dailyInsightLimit: number;
    autoDraftVisitPlan: boolean;
  };
  personalIntegrations: {
    calendarSync: boolean;
    emailDigest: boolean;
  };
  defaultWorkspace: {
    organizationId: string;
    landingPath: WorkspacePath;
  };
};

export type MemberSettingsResponse = {
  settings: MemberSettings;
  user: AppSession["user"];
  membership: AppSession["membership"] & {
    title: string;
    region: string;
  };
  organization: Pick<AppSession["organization"], "id" | "name" | "plan">;
  policy: {
    maxCollaborators: number;
    collaboratorEntryVisible: boolean;
    aiDailyInsightLimitMax: number;
    monthlyAiQuota: number;
  };
};

const memberSettingsSchema = z.object({
  profile: z.object({
    displayName: z.string().trim().min(1).max(80),
    title: z.string().trim().max(80),
    region: z.string().trim().max(80),
    locale: z.literal("zh-TW"),
  }),
  notifications: z.object({
    reportOpened: z.boolean(),
    spinReminder: z.boolean(),
    teamUpdates: z.boolean(),
    aiDailyInsight: z.boolean(),
  }),
  aiPreferences: z.object({
    tone: z.enum(AI_TONES),
    dailyInsightLimit: z.number().int().min(0).max(5),
    autoDraftVisitPlan: z.boolean(),
  }),
  personalIntegrations: z.object({
    calendarSync: z.boolean(),
    emailDigest: z.boolean(),
  }),
  defaultWorkspace: z.object({
    organizationId: z.string().min(1),
    landingPath: z.enum(WORKSPACE_PATHS),
  }),
});

export const memberSettingsPatchSchema = z
  .object({
    profile: memberSettingsSchema.shape.profile.partial().optional(),
    notifications: memberSettingsSchema.shape.notifications.partial().optional(),
    aiPreferences: memberSettingsSchema.shape.aiPreferences.partial().optional(),
    personalIntegrations: memberSettingsSchema.shape.personalIntegrations.partial().optional(),
    defaultWorkspace: memberSettingsSchema.shape.defaultWorkspace.partial().optional(),
  })
  .strict();

export type MemberSettingsPatch = z.infer<typeof memberSettingsPatchSchema>;
type MemberSettingsMergePatch = {
  profile?: Partial<MemberSettings["profile"]>;
  notifications?: Partial<MemberSettings["notifications"]>;
  aiPreferences?: Partial<MemberSettings["aiPreferences"]>;
  personalIntegrations?: Partial<MemberSettings["personalIntegrations"]>;
  defaultWorkspace?: Partial<MemberSettings["defaultWorkspace"]>;
};

export async function getMemberSettings(session: AppSession): Promise<MemberSettingsResponse> {
  const membership = await prisma.organizationMember.findUnique({
    where: { id: session.membership.id },
    select: {
      id: true,
      organizationId: true,
      title: true,
      region: true,
      settings: true,
    },
  });

  if (!membership || membership.organizationId !== session.organization.id) {
    throw new Error("Current membership was not found.");
  }

  return buildResponse(session, membership, normalizeSettings(session, membership.settings, membership));
}

export async function updateMemberSettings(
  session: AppSession,
  patch: MemberSettingsPatch,
): Promise<MemberSettingsResponse> {
  const membership = await prisma.organizationMember.findUnique({
    where: { id: session.membership.id },
    select: {
      id: true,
      organizationId: true,
      title: true,
      region: true,
      settings: true,
    },
  });

  if (!membership || membership.organizationId !== session.organization.id) {
    throw new Error("Current membership was not found.");
  }

  const currentSettings = normalizeSettings(session, membership.settings, membership);
  const nextSettings = enforceMemberPolicy(session, mergeSettings(currentSettings, patch));

  const updatedMembership = await prisma.organizationMember.update({
    where: { id: session.membership.id },
    data: {
      settings: nextSettings as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      organizationId: true,
      title: true,
      region: true,
      settings: true,
    },
  });

  return buildResponse(session, updatedMembership, normalizeSettings(session, updatedMembership.settings, updatedMembership));
}

function normalizeSettings(
  session: AppSession,
  rawSettings: Prisma.JsonValue | null,
  membership: { title: string | null; region: string | null },
): MemberSettings {
  const defaults = defaultSettings(session, membership);
  const parsed = memberSettingsSchema.partial().safeParse(rawSettings);

  if (!parsed.success) {
    return enforceMemberPolicy(session, defaults);
  }

  return enforceMemberPolicy(session, mergeSettings(defaults, parsed.data));
}

function defaultSettings(
  session: AppSession,
  membership: { title: string | null; region: string | null },
): MemberSettings {
  return {
    profile: {
      displayName: session.user.name,
      title: membership.title ?? "顧問",
      region: membership.region ?? "未設定",
      locale: "zh-TW",
    },
    notifications: {
      reportOpened: true,
      spinReminder: true,
      teamUpdates: session.membership.role !== "AGENT",
      aiDailyInsight: true,
    },
    aiPreferences: {
      tone: "balanced",
      dailyInsightLimit: Math.min(3, getAiDailyInsightLimitMax(session)),
      autoDraftVisitPlan: true,
    },
    personalIntegrations: {
      calendarSync: false,
      emailDigest: true,
    },
    defaultWorkspace: {
      organizationId: session.organization.id,
      landingPath: "/dashboard",
    },
  };
}

function mergeSettings(current: MemberSettings, patch: MemberSettingsMergePatch): MemberSettings {
  return {
    profile: { ...current.profile, ...patch.profile },
    notifications: { ...current.notifications, ...patch.notifications },
    aiPreferences: { ...current.aiPreferences, ...patch.aiPreferences },
    personalIntegrations: { ...current.personalIntegrations, ...patch.personalIntegrations },
    defaultWorkspace: { ...current.defaultWorkspace, ...patch.defaultWorkspace },
  };
}

function enforceMemberPolicy(session: AppSession, settings: MemberSettings): MemberSettings {
  const aiDailyInsightLimitMax = getAiDailyInsightLimitMax(session);

  return {
    ...settings,
    profile: {
      ...settings.profile,
      locale: "zh-TW",
    },
    aiPreferences: {
      ...settings.aiPreferences,
      dailyInsightLimit: Math.min(settings.aiPreferences.dailyInsightLimit, aiDailyInsightLimitMax),
    },
    defaultWorkspace: {
      organizationId: session.organization.id,
      landingPath: WORKSPACE_PATHS.includes(settings.defaultWorkspace.landingPath)
        ? settings.defaultWorkspace.landingPath
        : "/dashboard",
    },
  };
}

function buildResponse(
  session: AppSession,
  membership: { title: string | null; region: string | null },
  settings: MemberSettings,
): MemberSettingsResponse {
  return {
    settings,
    user: session.user,
    membership: {
      ...session.membership,
      title: membership.title ?? "",
      region: membership.region ?? "",
    },
    organization: {
      id: session.organization.id,
      name: session.organization.name,
      plan: session.organization.plan,
    },
    policy: {
      maxCollaborators: session.planCapability.maxCollaborators,
      collaboratorEntryVisible:
        session.membership.role === "OWNER" && session.planCapability.maxCollaborators > 0,
      aiDailyInsightLimitMax: getAiDailyInsightLimitMax(session),
      monthlyAiQuota: session.planCapability.monthlyAiQuota,
    },
  };
}

function getAiDailyInsightLimitMax(session: AppSession): number {
  if (session.planCapability.monthlyAiQuota <= 0) {
    return 0;
  }

  return Math.max(1, Math.min(5, Math.floor(session.planCapability.monthlyAiQuota / 30)));
}
