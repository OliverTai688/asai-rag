#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, Script } from "node:vm";
import ts from "typescript";

function loadTsModule(modulePath, requireMap = {}, env = {}) {
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
      env,
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
const sidebarPath = resolve("src/components/layout/sidebar.tsx");
const roleAwareExports = loadTsModule(roleAwarePath);
const workspaceEnv = {};
const workspaceExports = loadTsModule(
  workspacePath,
  {
    "@/domains/navigation/role-aware-sidebar": roleAwareExports,
  },
  workspaceEnv,
);

const {
  buildWorkspaceSidebarRenderModel,
  resolveWorkspaceSidebarActiveItemId,
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
      monthlyAiQuota: overrides.monthlyAiQuota ?? 100,
      monthlyAiUsed: overrides.monthlyAiUsed ?? 10,
    },
    planCapability: {
      plan: "PRO",
      maxMembers: 20,
      maxCollaborators: 5,
      maxUnits: overrides.maxUnits ?? 5,
      monthlyAiQuota: overrides.planMonthlyAiQuota ?? 100,
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

function items(model) {
  return model.primarySections.flatMap((section) => section.items);
}

function item(model, id) {
  return items(model).find((entry) => entry.id === id);
}

function section(model, id) {
  return model.primarySections.find((entry) => entry.id === id);
}

function hrefs(model) {
  return items(model)
    .map((entry) => entry.action.type === "href" ? entry.action.href : null)
    .filter(Boolean);
}

function surfaceSwitch(model, id) {
  return model.surfaceSwitches.find((entry) => entry.id === id);
}

function hasMemberClientWorkRoute(model) {
  return hrefs(model).some((href) =>
    ["/crm", "/interview", "/theater", "/spin", "/pre-visit", "/reports"].some(
      (prefix) => href === prefix || href.startsWith(`${prefix}/`),
    ),
  );
}

const workspaceSource = readFileSync(workspacePath, "utf8");
const sidebarSource = readFileSync(sidebarPath, "utf8");
let sidebarDiff = "";
try {
  sidebarDiff = execFileSync("git", ["diff", "--", "src/components/layout/sidebar.tsx"], {
    encoding: "utf8",
  });
} catch (error) {
  sidebarDiff = String(error);
}

push(typeof buildWorkspaceSidebarRenderModel === "function", "sidebar render model builder is exported");
push(typeof resolveWorkspaceSidebarActiveItemId === "function", "active item resolver is exported");
push(
  workspaceSource.includes("dirtySidebarFileTouched: false") &&
    !sidebarSource.includes("buildWorkspaceSidebarRenderModel") &&
    !sidebarDiff.includes("buildWorkspaceSidebarRenderModel"),
  "RAS-004a does not wire or overwrite existing sidebar.tsx dirty changes",
);
push(
  !workspaceSource.includes("openai") &&
    !workspaceSource.includes("anthropic"),
  "sidebar render adapter has no provider import path",
);

const memberModel = buildWorkspaceSidebarRenderModel(
  session({ role: "MEMBER" }),
  "member",
  { pathname: "/interview/session-1" },
);
const memberAiItems = section(memberModel, "ai-workbench")?.items.map((entry) => entry.id) ?? [];
push(memberModel.currentSurface === "member", "member renderer stays on member surface");
push(
  memberModel.primarySections[0]?.id === "today" &&
    memberModel.primarySections[1]?.id === "ai-workbench",
  "member first screen starts with today and AI workbench",
);
push(
  memberAiItems.slice(0, 3).join(",") === "ask-asai,ai-understand-client,ai-theater",
  "member AI workbench keeps ASAI, interview, theater order",
  memberAiItems.join(","),
);
push(
  item(memberModel, "ask-asai")?.action.type === "openAssistant" &&
    item(memberModel, "ask-asai")?.action.assistantScope === "member-own-assigned",
  "member assistant action stays scoped to member-own-assigned data",
);
push(memberModel.activeItemId === "ai-understand-client", "interview pathname activates AI 了解客戶");
push(
  buildWorkspaceSidebarRenderModel(session({ role: "MEMBER" }), "member", {
    pathname: "/theater/route-b-session",
  }).activeItemId === "ai-theater",
  "theater pathname activates AI 劇場演練",
);
push(!item(memberModel, "legacy-spin"), "legacy SPIN is hidden when feature flag is off");
push(
  surfaceSwitch(memberModel, "org-admin")?.disabled === true &&
    surfaceSwitch(memberModel, "org-admin")?.disabledReason === "ROLE_RESTRICTED",
  "member surface switch exposes unavailable org admin with reason",
);

workspaceEnv.LEGACY_SPIN_NAV = "true";
const legacyMemberModel = buildWorkspaceSidebarRenderModel(
  session({ role: "MEMBER" }),
  "member",
  { pathname: "/spin/session-1" },
);
push(item(legacyMemberModel, "legacy-spin")?.badge === "legacy", "legacy SPIN appears only with legacy flag");
push(legacyMemberModel.activeItemId === "legacy-spin", "legacy SPIN route can activate legacy item when enabled");
delete workspaceEnv.LEGACY_SPIN_NAV;

const ownerOrgModel = buildWorkspaceSidebarRenderModel(
  session({ role: "OWNER" }),
  "orgAdmin",
  { pathname: "/team/settings" },
);
push(ownerOrgModel.currentSurface === "orgAdmin", "owner renderer can enter org admin surface");
push(!hasMemberClientWorkRoute(ownerOrgModel), "org admin renderer does not mix member client work routes");
push(
  item(ownerOrgModel, "org-ask-asai")?.action.type === "openAssistant" &&
    item(ownerOrgModel, "org-ask-asai")?.action.assistantScope === "org-aggregate",
  "org assistant action stays scoped to org aggregate data",
);
push(ownerOrgModel.activeItemId === "org-settings", "team settings pathname activates org settings, not team home");
push(
  item(ownerOrgModel, "switch-member")?.action.type === "switchSurface" &&
    item(ownerOrgModel, "switch-member")?.action.targetSurface === "member" &&
    item(ownerOrgModel, "switch-member")?.action.href === "/dashboard" &&
    item(ownerOrgModel, "switch-member")?.disabled === false,
  "org admin renderer carries a usable switch back to member surface",
);

const scopedManagerOrgModel = buildWorkspaceSidebarRenderModel(
  session({ role: "MANAGER", managedUnitIds: ["unit-north"] }),
  "orgAdmin",
  { pathname: "/team/coaching" },
);
push(scopedManagerOrgModel.currentSurface === "orgAdmin", "scoped manager can render org admin surface");
push(item(scopedManagerOrgModel, "org-home"), "scoped manager gets org aggregate home");
push(!item(scopedManagerOrgModel, "org-settings"), "scoped manager does not render org settings");
push(!item(scopedManagerOrgModel, "billing"), "scoped manager does not render billing");
push(scopedManagerOrgModel.activeItemId === "coaching-queue", "scoped manager coaching pathname activates coaching queue");

const unscopedManagerModel = buildWorkspaceSidebarRenderModel(
  session({ role: "MANAGER", managedUnitIds: [] }),
  "orgAdmin",
);
push(unscopedManagerModel.currentSurface === "member", "unscoped manager is downgraded to member render surface");
push(
  surfaceSwitch(unscopedManagerModel, "org-admin")?.disabledReason === "UNIT_SCOPE_REQUIRED",
  "unscoped manager org switch keeps unit-scope disabled reason",
);

const quotaExhaustedModel = buildWorkspaceSidebarRenderModel(
  session({ role: "MEMBER", monthlyAiQuota: 100, monthlyAiUsed: 100 }),
);
push(
  item(quotaExhaustedModel, "ask-asai")?.disabled === true &&
    item(quotaExhaustedModel, "ask-asai")?.disabledReason === "AI_DISABLED",
  "AI quota exhausted render item is disabled instead of fake-success",
);
push(
  memberModel.proof.source === "RAS-004a" &&
    memberModel.proof.consumes === "RAS-003 workspace bootstrap navigation" &&
    memberModel.proof.providerCalls === "none" &&
    memberModel.proof.dbWrites === "none" &&
    memberModel.proof.dirtySidebarFileTouched === false,
  "render model proof records no-provider/no-db-write/sidebar-not-touched posture",
);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
