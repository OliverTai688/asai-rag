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
    process: {
      env: {},
    },
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
const bootstrapRoutePath = resolve("src/app/api/workspace/bootstrap/route.ts");
const roleAwareExports = loadTsModule(roleAwarePath);
const workspaceExports = loadTsModule(workspacePath, {
  "@/domains/navigation/role-aware-sidebar": roleAwareExports,
});

const {
  buildWorkspaceBootstrapNavigation,
  buildWorkspaceSidebarContext,
  toWorkspaceBootstrapSurface,
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
      slug: overrides.slug ?? "demo-organization",
      plan: overrides.plan ?? "PRO",
      status: "ACTIVE",
      seatLimit: 20,
      monthlyAiQuota: overrides.monthlyAiQuota ?? 100,
      monthlyAiUsed: overrides.monthlyAiUsed ?? 10,
    },
    planCapability: {
      plan: overrides.plan ?? "PRO",
      maxMembers: 20,
      maxCollaborators: 5,
      maxUnits: overrides.maxUnits ?? 5,
      monthlyAiQuota: overrides.planMonthlyAiQuota ?? 100,
      shareBrandingEnabled: overrides.shareBrandingEnabled ?? true,
      clientPortalEnabled: overrides.clientPortalEnabled ?? true,
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

function sectionIds(navigation) {
  return navigation.sidebarSections.map((section) => section.id);
}

function items(navigation) {
  return navigation.sidebarSections.flatMap((section) => section.items);
}

function itemIds(navigation) {
  return items(navigation).map((item) => item.id);
}

function hasItem(navigation, id) {
  return itemIds(navigation).includes(id);
}

function item(navigation, id) {
  return items(navigation).find((entry) => entry.id === id);
}

function hrefs(navigation) {
  return items(navigation)
    .map((entry) => entry.href)
    .filter(Boolean);
}

function switchEntry(navigation, id) {
  return navigation.surfaceSwitches.find((entry) => entry.id === id);
}

const routeSource = readFileSync(bootstrapRoutePath, "utf8");
const workspaceSource = readFileSync(workspacePath, "utf8");

push(typeof buildWorkspaceBootstrapNavigation === "function", "workspace bootstrap builder is exported");
push(typeof buildWorkspaceSidebarContext === "function", "workspace sidebar context builder is exported");
push(toWorkspaceBootstrapSurface("orgAdmin") === "orgAdmin", "surface parser accepts orgAdmin");
push(toWorkspaceBootstrapSurface("platform") === "member", "surface parser rejects non-workspace surfaces");
push(
  routeSource.includes("buildWorkspaceBootstrapNavigation") &&
    routeSource.includes("navigation") &&
    routeSource.includes("toWorkspaceBootstrapSurface"),
  "/api/workspace/bootstrap wires role-aware navigation into the response",
);
push(
  workspaceSource.includes("nextDocsRead") &&
    workspaceSource.includes("15-route-handlers.md") &&
    workspaceSource.includes("routeGuardDocsRead") &&
    workspaceSource.includes("redirect.md"),
  "workspace bootstrap records Next route handler and redirect docs proof",
);

const memberNavigation = buildWorkspaceBootstrapNavigation(session({ role: "MEMBER" }));
push(memberNavigation.currentSurface === "member", "member defaults to member surface");
push(memberNavigation.defaultSurfaceRedirect === "/dashboard", "member default redirect is dashboard");
push(sectionIds(memberNavigation).includes("ai-workbench"), "member bootstrap includes AI workbench");
push(
  ["ask-asai", "ai-understand-client", "ai-theater"].every((id) =>
    hasItem(memberNavigation, id),
  ),
  "member AI workbench includes assistant, interview, and theater",
  itemIds(memberNavigation).join(", "),
);
push(!hasItem(memberNavigation, "team-settings"), "member bootstrap hides org settings");
push(
  switchEntry(memberNavigation, "org-admin")?.available === false &&
    switchEntry(memberNavigation, "org-admin")?.disabledReason === "ROLE_RESTRICTED",
  "member gets explicit unavailable org surface switch",
);

const agentContext = buildWorkspaceSidebarContext(session({ role: "AGENT" }));
push(agentContext.organizationRole === "MEMBER", "legacy AGENT role maps to member navigation role");

const ownerNavigation = buildWorkspaceBootstrapNavigation(session({ role: "OWNER" }), "orgAdmin");
push(ownerNavigation.currentSurface === "orgAdmin", "owner can request org admin surface");
push(ownerNavigation.defaultSurfaceRedirect === "/team", "org admin redirect is team");
push(hasItem(ownerNavigation, "org-settings"), "owner org surface includes org settings");
push(hasItem(ownerNavigation, "billing"), "owner org surface includes billing when allowed");
push(
  !hrefs(ownerNavigation).some((href) =>
    ["/crm", "/interview", "/theater", "/spin", "/pre-visit", "/reports"].some(
      (prefix) => href === prefix || href.startsWith(`${prefix}/`),
    ),
  ),
  "org admin surface does not mix member client work routes",
  hrefs(ownerNavigation).join(", "),
);

const scopedManagerNavigation = buildWorkspaceBootstrapNavigation(
  session({ role: "MANAGER", managedUnitIds: ["unit-north"] }),
  "orgAdmin",
);
push(scopedManagerNavigation.currentSurface === "orgAdmin", "scoped manager can request org admin surface");
push(hasItem(scopedManagerNavigation, "org-home"), "scoped manager sees org aggregate");
push(!hasItem(scopedManagerNavigation, "org-settings"), "scoped manager does not get org settings item");
push(!hasItem(scopedManagerNavigation, "billing"), "scoped manager does not get billing item");

const unscopedManagerNavigation = buildWorkspaceBootstrapNavigation(
  session({ role: "MANAGER", managedUnitIds: [] }),
  "orgAdmin",
);
push(unscopedManagerNavigation.currentSurface === "member", "unscoped manager is downgraded to member surface");
push(
  switchEntry(unscopedManagerNavigation, "org-admin")?.disabledReason === "UNIT_SCOPE_REQUIRED",
  "unscoped manager org switch records unit-scope requirement",
);
push(!hasItem(unscopedManagerNavigation, "org-home"), "unscoped manager does not receive org aggregate sections");

const quotaExhaustedNavigation = buildWorkspaceBootstrapNavigation(
  session({ role: "MEMBER", monthlyAiQuota: 100, monthlyAiUsed: 100 }),
);
push(
  item(quotaExhaustedNavigation, "ask-asai")?.disabled === true &&
    item(quotaExhaustedNavigation, "ask-asai")?.disabledReason === "AI_DISABLED",
  "AI quota exhausted state disables assistant item instead of faking availability",
);

push(
  workspaceRouteGuardAlignment.workspaceBootstrap.guard === "requireCurrentMember" &&
    workspaceRouteGuardAlignment.orgRoutes.managerScopeStatus === "navigation-policy-aligned" &&
    workspaceRouteGuardAlignment.orgSettingsRoutes.guard === "requireOrgSettingsRoute" &&
    workspaceRouteGuardAlignment.orgSettingsRoutes.apiGuard === "requireOrgSettingsAdmin",
  "route guard alignment records policy-aligned org and org-settings guards",
);
push(
  workspaceSettingsRoutePolicy.memberSettings.allowedRoles.includes("COLLABORATOR") &&
    !workspaceSettingsRoutePolicy.orgSettings.allowedRoles.includes("MANAGER") &&
    workspaceSettingsRoutePolicy.orgSettings.managerMode === "scoped-read-only-or-hidden",
  "settings route policy separates member settings from org settings",
);
push(
  memberNavigation.proof.providerCalls === "none" &&
    memberNavigation.proof.dbWrites === "none",
  "bootstrap navigation proof is no-provider and no-db-write",
);
push(
  !workspaceSource.includes("openai") &&
    !workspaceSource.includes("anthropic") &&
    !routeSource.includes("openai") &&
    !routeSource.includes("anthropic"),
  "workspace bootstrap navigation has no provider imports",
);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
