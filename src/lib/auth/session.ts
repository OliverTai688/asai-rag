import { cookies, headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type {
  MemberRole,
  OrganizationPlan,
  OrganizationStatus,
  PlatformRole,
} from "@/generated/prisma/enums";

const DEV_AUTH_HEADER = "x-asai-demo-user-email";
export const CLIENT_PORTAL_TOKEN_HEADER = "x-asai-client-token";
export const CLIENT_PORTAL_TOKEN_COOKIE = "asai_client_share_token";

interface SupabaseUser {
  id: string;
  email?: string;
}

export interface AuthHealth {
  provider: "AUTH_JS";
  authSecretConfigured: boolean;
  demoCredentialsAllowed: boolean;
  legacySupabaseConfigured: boolean;
}

export interface WorkspacePlanCapability {
  plan: OrganizationPlan;
  maxMembers: number;
  maxCollaborators: number;
  maxUnits: number;
  monthlyAiQuota: number;
  shareBrandingEnabled: boolean;
  clientPortalEnabled: boolean;
}

export interface SessionOrganization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  status: OrganizationStatus;
  seatLimit: number;
  monthlyAiQuota: number;
  monthlyAiUsed: number;
}

export interface AppSession {
  sessionType: "app";
  user: {
    id: string;
    email: string;
    name: string;
    supabaseAuthId: string | null;
  };
  membership: {
    id: string;
    organizationId: string;
    role: MemberRole;
    primaryUnitId: string | null;
    managedUnitIds: string[];
  };
  organization: SessionOrganization;
  planCapability: WorkspacePlanCapability;
  authHealth: AuthHealth;
}

export interface ClientSession {
  sessionType: "client";
  shareId: string;
  shareToken: string;
  reportId: string;
  clientId: string;
  organizationId: string;
  unitId: string | null;
  authHealth: AuthHealth;
}

export interface PlatformSession {
  sessionType: "platform";
  user: AppSession["user"];
  role: PlatformRole;
  requireMfa: boolean;
  authHealth: AuthHealth;
}

export function getAuthHealth(): AuthHealth {
  return {
    provider: "AUTH_JS",
    authSecretConfigured: Boolean(process.env.AUTH_SECRET) || process.env.NODE_ENV !== "production",
    demoCredentialsAllowed: isDevAuthHeaderAllowed(),
    legacySupabaseConfigured: isSupabaseAuthConfigured(),
  };
}

export async function getAppSession(): Promise<AppSession | null> {
  const authHealth = getAuthHealth();
  let authSession = null;
  try {
    authSession = await auth();
  } catch (error) {
    console.warn("[auth] Failed to retrieve session. The session cookie might be invalid or the AUTH_SECRET may have changed.", error);
  }
  const nextAuthUserId = authSession?.user?.id;
  const nextAuthEmail = authSession?.user?.email?.toLowerCase();
  const devEmail = nextAuthUserId || nextAuthEmail ? null : await getDevelopmentUserEmail();

  if (!nextAuthUserId && !nextAuthEmail && !devEmail) {
    return null;
  }

  const nextAuthUserLookup = nextAuthUserId
    ? [
        { id: nextAuthUserId },
        ...(isUuid(nextAuthUserId) ? [{ supabaseAuthId: nextAuthUserId }] : []),
      ]
    : [];

  const dbUser = await prisma.user.findFirst({
    where: nextAuthUserId || nextAuthEmail
      ? {
          OR: [
            ...nextAuthUserLookup,
            ...(nextAuthEmail ? [{ email: nextAuthEmail }] : []),
          ],
          status: "ACTIVE",
        }
      : {
          email: devEmail?.toLowerCase(),
          status: "ACTIVE",
        },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          organization: true,
          managedUnitScopes: {
            where: { isActive: true },
            select: { id: true },
          },
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!dbUser || dbUser.memberships.length === 0) {
    return null;
  }

  const preferredOrganizationId = (await headers()).get("x-asai-organization-id");
  const membership =
    dbUser.memberships.find((item) => item.organizationId === preferredOrganizationId) ??
    dbUser.memberships.find((item) => item.isDefault) ??
    dbUser.memberships[0];

  const planConfig = await prisma.planConfig.findUnique({
    where: { plan: membership.organization.plan },
  });

  return {
    sessionType: "app",
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      supabaseAuthId: dbUser.supabaseAuthId,
    },
    membership: {
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
      primaryUnitId: membership.primaryUnitId,
      managedUnitIds: membership.managedUnitScopes.map((unit) => unit.id),
    },
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      plan: membership.organization.plan,
      status: membership.organization.status,
      seatLimit: membership.organization.seatLimit,
      monthlyAiQuota: membership.organization.monthlyAiQuota,
      monthlyAiUsed: membership.organization.monthlyAiUsed,
    },
    planCapability: {
      plan: membership.organization.plan,
      maxMembers: planConfig?.maxMembers ?? membership.organization.seatLimit,
      maxCollaborators: planConfig?.maxCollaborators ?? 0,
      maxUnits: planConfig?.maxUnits ?? 1,
      monthlyAiQuota: planConfig?.monthlyAiQuota ?? membership.organization.monthlyAiQuota,
      shareBrandingEnabled: planConfig?.shareBrandingEnabled ?? false,
      clientPortalEnabled: planConfig?.clientPortalEnabled ?? false,
    },
    authHealth,
  };
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const appSession = await getAppSession();

  if (!appSession) {
    return null;
  }

  const platformUser = await prisma.platformUser.findFirst({
    where: {
      userId: appSession.user.id,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!platformUser) {
    return null;
  }

  return {
    sessionType: "platform",
    user: appSession.user,
    role: platformUser.role,
    requireMfa: platformUser.requireMfa,
    authHealth: appSession.authHealth,
  };
}

export async function getClientSession(): Promise<ClientSession | null> {
  const headerToken = (await headers()).get(CLIENT_PORTAL_TOKEN_HEADER);
  const cookieToken = (await cookies()).get(CLIENT_PORTAL_TOKEN_COOKIE)?.value;
  const token = normalizePortalToken(headerToken ?? cookieToken);

  if (!token) {
    return null;
  }

  const share = await prisma.reportShare.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      organizationId: true,
      unitId: true,
      reportId: true,
      expiresAt: true,
      report: {
        select: {
          clientId: true,
        },
      },
    },
  });

  if (!share || (share.expiresAt && share.expiresAt.getTime() < Date.now())) {
    return null;
  }

  return {
    sessionType: "client",
    shareId: share.id,
    shareToken: share.token,
    reportId: share.reportId,
    clientId: share.report.clientId,
    organizationId: share.organizationId,
    unitId: share.unitId,
    authHealth: getAuthHealth(),
  };
}

function normalizePortalToken(value: string | null | undefined): string | null {
  const token = value?.trim();
  if (!token || token.length > 240) {
    return null;
  }

  return token;
}

export async function getRequestSupabaseUser(): Promise<SupabaseUser | null> {
  const token = await getBearerToken();
  const config = getSupabaseConfig();

  if (!token || !config) {
    return null;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const user = (await response.json()) as Partial<SupabaseUser>;

  if (!user.id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email?.toLowerCase(),
  };
}

async function getBearerToken(): Promise<string | null> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice("bearer ".length).trim();
  }

  const cookieStore = await cookies();
  const directToken = cookieStore.get("sb-access-token")?.value ?? cookieStore.get("asai_access_token")?.value;

  if (directToken) {
    return directToken;
  }

  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.startsWith("sb-") || !cookie.name.endsWith("-auth-token")) {
      continue;
    }

    const parsedToken = parseSupabaseAuthCookie(cookie.value);
    if (parsedToken) {
      return parsedToken;
    }
  }

  return null;
}

function parseSupabaseAuthCookie(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as unknown;

    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0];
    }

    if (isRecord(parsed)) {
      if (typeof parsed.access_token === "string") {
        return parsed.access_token;
      }

      const currentSession = parsed.currentSession;
      if (isRecord(currentSession) && typeof currentSession.access_token === "string") {
        return currentSession.access_token;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getDevelopmentUserEmail(): Promise<string | null> {
  if (!isDevAuthHeaderAllowed()) {
    return null;
  }

  const email = (await headers()).get(DEV_AUTH_HEADER);
  return email?.trim().toLowerCase() || null;
}

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("your-project-id") || anonKey.includes("your-anon-key")) {
    return null;
  }

  return { url, anonKey };
}

function isSupabaseAuthConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

function isDevAuthHeaderAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_AUTH_HEADER === "true";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
