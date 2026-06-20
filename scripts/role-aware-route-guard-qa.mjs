#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, Script } from "node:vm";
import ts from "typescript";

function loadTsModule(modulePath, requireMap = {}) {
  const source = readFileSync(modulePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const commonJsModule = { exports: {} };
  const sandbox = {
    exports: commonJsModule.exports,
    module: commonJsModule,
    process: { env: {} },
    require: (id) => {
      if (requireMap[id]) {
        return requireMap[id];
      }

      throw new Error(`Unexpected require in QA sandbox: ${id}`);
    },
  };

  new Script(compiled.outputText, { filename: modulePath }).runInContext(
    createContext(sandbox),
  );

  return commonJsModule.exports;
}

const roleAwarePath = resolve("src/domains/navigation/role-aware-sidebar.ts");
const workspacePath = resolve("src/lib/navigation/workspace-sidebar.ts");
const currentWorkspacePath = resolve("src/lib/auth/current-workspace.ts");
const routeGuardsPath = resolve("src/lib/auth/route-guards.ts");
const teamPagePath = resolve("src/app/(dashboard)/team/page.tsx");
const teamSettingsPagePath = resolve("src/app/(dashboard)/team/settings/page.tsx");
const orgSettingsRoutePath = resolve("src/app/api/org/settings/route.ts");

const roleAwareExports = loadTsModule(roleAwarePath);
const workspaceExports = loadTsModule(workspacePath, {
  "@/domains/navigation/role-aware-sidebar": roleAwareExports,
});

const {
  canManageWorkspaceOrgSettings,
  canReadWorkspaceOrgAggregate,
  resolveWorkspaceRouteAccess,
  workspaceRouteGuardAlignment,
  workspaceSettingsRoutePolicy,
} = workspaceExports;

const checks = [];

function push(ok, label, detail = "") {
  checks.push({ ok, label, detail });
}

function session(overrides = {}) {
  const role = overrides.role ?? "MEMBER";

  return {
    sessionType: "app",
    user: {
      id: `user-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@example.test`,
      name: `${role} Fixture`,
      supabaseAuthId: null,
    },
    membership: {
      id: `membership-${role.toLowerCase()}`,
      organizationId: "org-demo",
      role,
      primaryUnitId: overrides.primaryUnitId ?? null,
      managedUnitIds: overrides.managedUnitIds ?? [],
    },
    organization: {
      id: "org-demo",
      name: "Demo Organization",
      slug: "demo-organization",
      plan: "PRO",
      status: "ACTIVE",
      seatLimit: 20,
      monthlyAiQuota: 100,
      monthlyAiUsed: 10,
    },
    planCapability: {
      plan: "PRO",
      maxMembers: 20,
      maxCollaborators: 5,
      maxUnits: overrides.maxUnits ?? 5,
      monthlyAiQuota: 100,
      shareBrandingEnabled: true,
      clientPortalEnabled: true,
    },
    authHealth: {
      provider: "AUTH_JS",
      authSecretConfigured: true,
      runtimeDatabaseConfigured: true,
      demoCredentialsAllowed: true,
      legacySupabaseConfigured: false,
    },
  };
}

function access(role, href, managedUnitIds = []) {
  return resolveWorkspaceRouteAccess(session({ role, managedUnitIds }), href);
}

const owner = session({ role: "OWNER" });
const admin = session({ role: "ADMIN" });
const scopedManager = session({ role: "MANAGER", managedUnitIds: ["unit-north"] });
const unscopedManager = session({ role: "MANAGER", managedUnitIds: [] });
const member = session({ role: "MEMBER" });

push(typeof resolveWorkspaceRouteAccess === "function", "route access resolver is exported");
push(canReadWorkspaceOrgAggregate(owner), "owner can read org aggregate");
push(canReadWorkspaceOrgAggregate(admin), "admin can read org aggregate");
push(canReadWorkspaceOrgAggregate(scopedManager), "scoped manager can read org aggregate");
push(!canReadWorkspaceOrgAggregate(unscopedManager), "unscoped manager cannot read org aggregate");
push(!canReadWorkspaceOrgAggregate(member), "member cannot read org aggregate");
push(canManageWorkspaceOrgSettings(owner), "owner can manage org settings");
push(canManageWorkspaceOrgSettings(admin), "admin can manage org settings");
push(!canManageWorkspaceOrgSettings(scopedManager), "scoped manager cannot manage org settings");
push(!canManageWorkspaceOrgSettings(member), "member cannot manage org settings");

push(access("MEMBER", "/settings").allowed, "member can hand-type /settings");
push(!access("MEMBER", "/team").allowed, "member cannot hand-type /team");
push(access("MEMBER", "/team").redirectIfDenied === "/dashboard", "member /team denial returns dashboard");
push(!access("MEMBER", "/team/settings").allowed, "member cannot hand-type /team/settings");
push(access("MEMBER", "/team/settings").redirectIfDenied === "/dashboard", "member org settings denial returns dashboard");
push(access("MANAGER", "/team", ["unit-north"]).allowed, "scoped manager can hand-type /team");
push(!access("MANAGER", "/team/settings", ["unit-north"]).allowed, "scoped manager cannot hand-type /team/settings");
push(access("MANAGER", "/team/settings", ["unit-north"]).redirectIfDenied === "/team", "scoped manager org settings denial returns team");
push(!access("MANAGER", "/team/billing", ["unit-north"]).allowed, "scoped manager cannot hand-type /team/billing");
push(access("MANAGER", "/team/billing", ["unit-north"]).redirectIfDenied === "/team", "scoped manager billing denial returns team");
push(!access("MANAGER", "/team/seats", ["unit-north"]).allowed, "scoped manager cannot hand-type /team/seats");
push(!access("MANAGER", "/api/org/units", ["unit-north"]).allowed, "scoped manager cannot call /api/org/units");
push(!access("MANAGER", "/team", []).allowed, "unscoped manager cannot hand-type /team");
push(access("MANAGER", "/team", []).redirectIfDenied === "/dashboard", "unscoped manager org aggregate denial returns dashboard");
push(!access("OWNER", "/super-admin").allowed, "app owner cannot enter platform route through workspace policy");
push(!access("OWNER", "/client/reports").allowed, "app owner cannot enter client portal route through workspace policy");
push(access("OWNER", "/team/billing").allowed, "owner can hand-type /team/billing");
push(access("OWNER", "/team/settings").allowed, "owner can hand-type /team/settings");
push(access("ADMIN", "/api/org/settings").allowed, "admin can call /api/org/settings");
push(!access("MANAGER", "/api/org/settings", ["unit-north"]).allowed, "manager cannot call /api/org/settings");

push(
  workspaceRouteGuardAlignment.orgRoutes.managerScopeStatus === "navigation-policy-aligned" &&
    workspaceRouteGuardAlignment.orgSettingsRoutes.guard === "requireOrgSettingsRoute" &&
    workspaceRouteGuardAlignment.orgSettingsRoutes.apiGuard === "requireOrgSettingsAdmin",
  "workspace guard alignment records org aggregate and org settings guards",
);
push(
  !workspaceSettingsRoutePolicy.orgSettings.allowedRoles.includes("MANAGER") &&
    workspaceSettingsRoutePolicy.memberSettings.allowedRoles.includes("MANAGER"),
  "settings policy keeps member settings open but org settings owner/admin only",
);

const currentWorkspaceSource = readFileSync(currentWorkspacePath, "utf8");
const routeGuardsSource = readFileSync(routeGuardsPath, "utf8");
const teamPageSource = readFileSync(teamPagePath, "utf8");
const teamSettingsPageSource = readFileSync(teamSettingsPagePath, "utf8");
const orgSettingsRouteSource = readFileSync(orgSettingsRoutePath, "utf8");

push(
  currentWorkspaceSource.includes("canReadWorkspaceOrgAggregate") &&
    currentWorkspaceSource.includes("requireOrgSettingsAdmin") &&
    currentWorkspaceSource.includes("canManageWorkspaceOrgSettings"),
  "current-workspace guard helpers use role-aware workspace policy",
);
push(
  routeGuardsSource.includes("export async function requireOrgSettingsRoute") &&
    routeGuardsSource.includes("canReadWorkspaceOrgAggregate") &&
    routeGuardsSource.includes("canManageWorkspaceOrgSettings") &&
    routeGuardsSource.includes('redirect("/team")') &&
    routeGuardsSource.includes('redirect("/dashboard")'),
  "route-guards expose org settings split and denial redirects",
);
push(teamPageSource.includes("requireOrgAdminRoute"), "/team uses org aggregate route guard");
push(teamSettingsPageSource.includes("requireOrgSettingsRoute"), "/team/settings uses org settings route guard");
push(
  orgSettingsRouteSource.includes("requireOrgSettingsAdmin") &&
    !orgSettingsRouteSource.includes("requireOrgAdmin"),
  "/api/org/settings uses org settings API guard",
);
push(
  !currentWorkspaceSource.includes("openai") &&
    !currentWorkspaceSource.includes("anthropic") &&
    !routeGuardsSource.includes("openai") &&
    !routeGuardsSource.includes("anthropic"),
  "route guard alignment has no provider imports",
);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
