import {
  canAccessMemberRoute,
  canAccessOrgAdmin,
  resolveSidebarSections,
  type OrganizationRole,
  type ResolvedSidebarSection,
  type SidebarContext,
  type SidebarFeatureFlags,
  type SidebarPlanCapabilities,
  type SidebarSurface,
} from "@/domains/navigation/role-aware-sidebar";
import type { AppSession } from "@/lib/auth/session";

export type WorkspaceBootstrapSurface = Extract<SidebarSurface, "member" | "orgAdmin">;

export interface WorkspaceSurfaceSwitch {
  readonly id: "member" | "org-admin";
  readonly label: string;
  readonly targetSurface: WorkspaceBootstrapSurface;
  readonly href: string;
  readonly available: boolean;
  readonly current: boolean;
  readonly dataBoundary: "member-own-assigned" | "org-aggregate";
  readonly disabledReason?: "ROLE_RESTRICTED" | "UNIT_SCOPE_REQUIRED" | "PLAN_UPGRADE_REQUIRED";
}

export interface WorkspaceSettingsRoutePolicy {
  readonly memberSettings: {
    readonly href: "/settings";
    readonly allowedRoles: readonly AppSession["membership"]["role"][];
    readonly dataBoundary: "member-own-assigned-summary";
  };
  readonly orgSettings: {
    readonly href: "/team/settings";
    readonly allowedRoles: readonly AppSession["membership"]["role"][];
    readonly managerMode: "scoped-read-only-or-hidden";
    readonly dataBoundary: "org-settings";
  };
}

export interface WorkspaceRouteGuardAlignment {
  readonly workspaceBootstrap: {
    readonly route: "/api/workspace/bootstrap";
    readonly session: "app";
    readonly guard: "requireCurrentMember";
  };
  readonly memberRoutes: {
    readonly session: "app";
    readonly guard: "requireMemberRoute";
    readonly navigationPolicy: "canAccessMemberRoute";
  };
  readonly orgRoutes: {
    readonly session: "app";
    readonly guard: "requireOrgAdminRoute";
    readonly navigationPolicy: "canAccessOrgAdmin";
    readonly managerScopeStatus: "navigation-requires-managed-unit-route-guard-follow-up";
  };
  readonly platformRoutes: {
    readonly session: "platform";
    readonly guard: "requirePlatformRoute";
    readonly navigationPolicy: "platform-surface-not-returned-from-workspace-bootstrap";
  };
  readonly clientRoutes: {
    readonly session: "client-or-token";
    readonly guard: "requireClientPortalUser";
    readonly navigationPolicy: "client-surface-not-returned-from-workspace-bootstrap";
  };
}

export interface WorkspaceNavigationBootstrap {
  readonly currentSurface: WorkspaceBootstrapSurface;
  readonly defaultSurface: WorkspaceBootstrapSurface;
  readonly defaultSurfaceRedirect: "/dashboard" | "/team";
  readonly sidebarContext: SidebarContext;
  readonly sidebarSections: readonly ResolvedSidebarSection[];
  readonly surfaceSwitches: readonly WorkspaceSurfaceSwitch[];
  readonly routeGuardAlignment: WorkspaceRouteGuardAlignment;
  readonly settingsRoutePolicy: WorkspaceSettingsRoutePolicy;
  readonly proof: {
    readonly source: "RAS-003";
    readonly nextDocsRead: "node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md";
    readonly providerCalls: "none";
    readonly dbWrites: "none";
  };
}

const appRoleToNavigationRole = {
  OWNER: "ORG_OWNER",
  ADMIN: "ORG_ADMIN",
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
  AGENT: "MEMBER",
  COLLABORATOR: "COLLABORATOR",
} as const satisfies Record<AppSession["membership"]["role"], OrganizationRole>;

const memberSettingsRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "MEMBER",
  "AGENT",
  "COLLABORATOR",
] as const satisfies readonly AppSession["membership"]["role"][];

const orgSettingsRoles = [
  "OWNER",
  "ADMIN",
] as const satisfies readonly AppSession["membership"]["role"][];

function isOrgAdminRole(role: AppSession["membership"]["role"]) {
  return role === "OWNER" || role === "ADMIN";
}

function isManagerPlusRole(role: AppSession["membership"]["role"]) {
  return isOrgAdminRole(role) || role === "MANAGER";
}

function hasAiQuotaRemaining(session: AppSession) {
  return session.organization.monthlyAiQuota - session.organization.monthlyAiUsed > 0;
}

export function toWorkspaceBootstrapSurface(value: string | null | undefined): WorkspaceBootstrapSurface {
  return value === "orgAdmin" ? "orgAdmin" : "member";
}

export function buildWorkspaceSidebarPlanCapabilities(session: AppSession): SidebarPlanCapabilities {
  const role = session.membership.role;

  return {
    aiEnabled: session.planCapability.monthlyAiQuota > 0 && hasAiQuotaRemaining(session),
    clientPortalEnabled: session.planCapability.clientPortalEnabled,
    shareBrandingEnabled: session.planCapability.shareBrandingEnabled,
    orgAdminEnabled: isManagerPlusRole(role) && session.planCapability.maxUnits > 0,
    billingEnabled: isOrgAdminRole(role),
    maxUnits: session.planCapability.maxUnits,
  };
}

export function buildWorkspaceSidebarFeatureFlags(session: AppSession): SidebarFeatureFlags {
  const isManagerPlus = isManagerPlusRole(session.membership.role);

  return {
    legacySpinNav:
      process.env.NEXT_PUBLIC_LEGACY_SPIN_NAV === "true" ||
      process.env.LEGACY_SPIN_NAV === "true",
    interviewEnabled: true,
    theaterEnabled: true,
    orgAdminBeta: isManagerPlus,
    clientPortalBeta: session.planCapability.clientPortalEnabled,
  };
}

export function buildWorkspaceSidebarContext(
  session: AppSession,
  surface: WorkspaceBootstrapSurface = "member",
): SidebarContext {
  return {
    sessionType: "app",
    surface,
    organizationRole: appRoleToNavigationRole[session.membership.role],
    managedUnitIds: session.membership.managedUnitIds,
    planCapabilities: buildWorkspaceSidebarPlanCapabilities(session),
    featureFlags: buildWorkspaceSidebarFeatureFlags(session),
    isDemo: session.organization.slug.includes("demo"),
  };
}

export function getDefaultWorkspaceSurface(session: AppSession): WorkspaceBootstrapSurface {
  void session;

  return "member";
}

function getOrgAdminDisabledReason(context: SidebarContext): WorkspaceSurfaceSwitch["disabledReason"] {
  if (context.organizationRole !== "ORG_OWNER" &&
    context.organizationRole !== "ORG_ADMIN" &&
    context.organizationRole !== "MANAGER") {
    return "ROLE_RESTRICTED";
  }

  if (!context.planCapabilities.orgAdminEnabled) {
    return "PLAN_UPGRADE_REQUIRED";
  }

  if (context.organizationRole === "MANAGER" && context.managedUnitIds.length === 0) {
    return "UNIT_SCOPE_REQUIRED";
  }

  return "ROLE_RESTRICTED";
}

export function buildWorkspaceSurfaceSwitches(
  session: AppSession,
  currentSurface: WorkspaceBootstrapSurface,
): readonly WorkspaceSurfaceSwitch[] {
  const memberContext = buildWorkspaceSidebarContext(session, "member");
  const orgAdminContext = buildWorkspaceSidebarContext(session, "orgAdmin");
  const orgAdminAvailable = canAccessOrgAdmin(orgAdminContext);

  return [
    {
      id: "member",
      label: "顧問工作台",
      targetSurface: "member",
      href: "/dashboard",
      available: canAccessMemberRoute(memberContext),
      current: currentSurface === "member",
      dataBoundary: "member-own-assigned",
    },
    {
      id: "org-admin",
      label: "通訊處管理",
      targetSurface: "orgAdmin",
      href: "/team",
      available: orgAdminAvailable,
      current: currentSurface === "orgAdmin",
      dataBoundary: "org-aggregate",
      disabledReason: orgAdminAvailable ? undefined : getOrgAdminDisabledReason(orgAdminContext),
    },
  ];
}

export const workspaceRouteGuardAlignment = {
  workspaceBootstrap: {
    route: "/api/workspace/bootstrap",
    session: "app",
    guard: "requireCurrentMember",
  },
  memberRoutes: {
    session: "app",
    guard: "requireMemberRoute",
    navigationPolicy: "canAccessMemberRoute",
  },
  orgRoutes: {
    session: "app",
    guard: "requireOrgAdminRoute",
    navigationPolicy: "canAccessOrgAdmin",
    managerScopeStatus: "navigation-requires-managed-unit-route-guard-follow-up",
  },
  platformRoutes: {
    session: "platform",
    guard: "requirePlatformRoute",
    navigationPolicy: "platform-surface-not-returned-from-workspace-bootstrap",
  },
  clientRoutes: {
    session: "client-or-token",
    guard: "requireClientPortalUser",
    navigationPolicy: "client-surface-not-returned-from-workspace-bootstrap",
  },
} as const satisfies WorkspaceRouteGuardAlignment;

export const workspaceSettingsRoutePolicy = {
  memberSettings: {
    href: "/settings",
    allowedRoles: memberSettingsRoles,
    dataBoundary: "member-own-assigned-summary",
  },
  orgSettings: {
    href: "/team/settings",
    allowedRoles: orgSettingsRoles,
    managerMode: "scoped-read-only-or-hidden",
    dataBoundary: "org-settings",
  },
} as const satisfies WorkspaceSettingsRoutePolicy;

export function buildWorkspaceBootstrapNavigation(
  session: AppSession,
  requestedSurface: WorkspaceBootstrapSurface = getDefaultWorkspaceSurface(session),
): WorkspaceNavigationBootstrap {
  const requestedContext = buildWorkspaceSidebarContext(session, requestedSurface);
  const currentSurface =
    requestedSurface === "orgAdmin" && !canAccessOrgAdmin(requestedContext)
      ? "member"
      : requestedSurface;
  const sidebarContext = buildWorkspaceSidebarContext(session, currentSurface);

  return {
    currentSurface,
    defaultSurface: getDefaultWorkspaceSurface(session),
    defaultSurfaceRedirect: currentSurface === "orgAdmin" ? "/team" : "/dashboard",
    sidebarContext,
    sidebarSections: resolveSidebarSections(sidebarContext),
    surfaceSwitches: buildWorkspaceSurfaceSwitches(session, currentSurface),
    routeGuardAlignment: workspaceRouteGuardAlignment,
    settingsRoutePolicy: workspaceSettingsRoutePolicy,
    proof: {
      source: "RAS-003",
      nextDocsRead: "node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md",
      providerCalls: "none",
      dbWrites: "none",
    },
  };
}
