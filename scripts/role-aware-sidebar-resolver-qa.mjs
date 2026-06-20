#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, Script } from "node:vm";
import ts from "typescript";

const contractPath = resolve("src/domains/navigation/role-aware-sidebar.ts");
const source = readFileSync(contractPath, "utf8");
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
};

new Script(compiled.outputText, { filename: contractPath }).runInContext(
  createContext(sandbox),
);

const {
  canAccessMemberRoute,
  canAccessOrgAdmin,
  canAccessPlatformTool,
  canManageOrgSettings,
  canReadOrgAggregate,
  canUseAiModule,
  resolveSidebarSections,
} = commonJsModule.exports;

const basePlan = {
  aiEnabled: true,
  clientPortalEnabled: true,
  shareBrandingEnabled: true,
  orgAdminEnabled: true,
  billingEnabled: true,
  maxUnits: 5,
};

const baseFlags = {
  legacySpinNav: false,
  interviewEnabled: true,
  theaterEnabled: true,
  orgAdminBeta: true,
  clientPortalBeta: true,
};

const contexts = {
  collaborator: {
    sessionType: "app",
    surface: "member",
    organizationRole: "COLLABORATOR",
    managedUnitIds: [],
    planCapabilities: basePlan,
    featureFlags: baseFlags,
    isDemo: false,
  },
  member: {
    sessionType: "app",
    surface: "member",
    organizationRole: "MEMBER",
    managedUnitIds: [],
    planCapabilities: basePlan,
    featureFlags: baseFlags,
    isDemo: false,
  },
  manager: {
    sessionType: "app",
    surface: "orgAdmin",
    organizationRole: "MANAGER",
    managedUnitIds: ["unit-north"],
    planCapabilities: basePlan,
    featureFlags: baseFlags,
    isDemo: false,
  },
  managerWithoutUnit: {
    sessionType: "app",
    surface: "orgAdmin",
    organizationRole: "MANAGER",
    managedUnitIds: [],
    planCapabilities: basePlan,
    featureFlags: baseFlags,
    isDemo: false,
  },
  orgAdmin: {
    sessionType: "app",
    surface: "orgAdmin",
    organizationRole: "ORG_ADMIN",
    managedUnitIds: [],
    planCapabilities: basePlan,
    featureFlags: baseFlags,
    isDemo: false,
  },
  orgOwner: {
    sessionType: "app",
    surface: "orgAdmin",
    organizationRole: "ORG_OWNER",
    managedUnitIds: [],
    planCapabilities: basePlan,
    featureFlags: baseFlags,
    isDemo: false,
  },
  support: {
    sessionType: "platform",
    surface: "platform",
    platformRole: "SUPPORT",
    managedUnitIds: [],
    planCapabilities: { ...basePlan, aiEnabled: false },
    featureFlags: baseFlags,
    isDemo: false,
  },
  finance: {
    sessionType: "platform",
    surface: "platform",
    platformRole: "FINANCE",
    managedUnitIds: [],
    planCapabilities: { ...basePlan, aiEnabled: false },
    featureFlags: baseFlags,
    isDemo: false,
  },
  superAdmin: {
    sessionType: "platform",
    surface: "platform",
    platformRole: "SUPER_ADMIN",
    managedUnitIds: [],
    planCapabilities: { ...basePlan, aiEnabled: false },
    featureFlags: baseFlags,
    isDemo: false,
  },
  superAdminInAppSession: {
    sessionType: "app",
    surface: "platform",
    platformRole: "SUPER_ADMIN",
    managedUnitIds: [],
    planCapabilities: basePlan,
    featureFlags: baseFlags,
    isDemo: false,
  },
  clientViewer: {
    sessionType: "token",
    surface: "clientPortal",
    clientRole: "CLIENT_VIEWER",
    managedUnitIds: [],
    planCapabilities: basePlan,
    featureFlags: baseFlags,
    isDemo: false,
  },
  aiDisabledMember: {
    sessionType: "app",
    surface: "member",
    organizationRole: "MEMBER",
    managedUnitIds: [],
    planCapabilities: { ...basePlan, aiEnabled: false },
    featureFlags: baseFlags,
    isDemo: false,
  },
  legacyMember: {
    sessionType: "app",
    surface: "member",
    organizationRole: "MEMBER",
    managedUnitIds: [],
    planCapabilities: basePlan,
    featureFlags: { ...baseFlags, legacySpinNav: true },
    isDemo: false,
  },
};

const checks = [];

function push(ok, label, detail = "") {
  checks.push({ ok, label, detail });
}

function sections(context) {
  return resolveSidebarSections(context);
}

function items(context) {
  return sections(context).flatMap((section) => section.items);
}

function ids(context) {
  return items(context).map((item) => item.id);
}

function hrefs(context) {
  return items(context)
    .map((item) => item.href)
    .filter(Boolean);
}

function hasId(context, id) {
  return ids(context).includes(id);
}

function item(context, id) {
  return items(context).find((entry) => entry.id === id);
}

function hasInternalHref(context) {
  return hrefs(context).some((href) =>
    [
      "/dashboard",
      "/crm",
      "/team",
      "/interview",
      "/theater",
      "/spin",
      "/pre-visit",
      "/reports",
      "/settings",
      "/super-admin",
    ].some((prefix) => href === prefix || href.startsWith(`${prefix}/`)),
  );
}

push(typeof resolveSidebarSections === "function", "resolveSidebarSections is exported");
push(typeof canAccessMemberRoute === "function", "canAccessMemberRoute is exported");
push(typeof canAccessOrgAdmin === "function", "canAccessOrgAdmin is exported");
push(typeof canManageOrgSettings === "function", "canManageOrgSettings is exported");
push(typeof canReadOrgAggregate === "function", "canReadOrgAggregate is exported");
push(typeof canUseAiModule === "function", "canUseAiModule is exported");
push(typeof canAccessPlatformTool === "function", "canAccessPlatformTool is exported");

push(canAccessMemberRoute(contexts.member, "/crm"), "member can access member workspace routes");
push(!canAccessMemberRoute(contexts.member, "/super-admin"), "member route helper rejects platform routes");
push(canUseAiModule(contexts.member), "member can use AI when plan allows it");
push(!canUseAiModule(contexts.aiDisabledMember), "member AI policy honors plan capability off");

push(
  hasId(contexts.collaborator, "clients") &&
    !hasId(contexts.collaborator, "team") &&
    !hasId(contexts.collaborator, "team-settings"),
  "collaborator sees assigned work but no team/org settings",
  ids(contexts.collaborator).join(", "),
);

push(
  hasId(contexts.member, "ask-asai") &&
    hasId(contexts.member, "ai-understand-client") &&
    hasId(contexts.member, "ai-theater") &&
    !hasId(contexts.member, "legacy-spin") &&
    !hasId(contexts.member, "team-settings"),
  "member keeps AI-first workbench and hides legacy/org settings by default",
  ids(contexts.member).join(", "),
);

push(
  hasId(contexts.legacyMember, "legacy-spin"),
  "legacy SPIN appears only when legacySpinNav is enabled",
  ids(contexts.legacyMember).join(", "),
);

push(
  ["ask-asai", "ai-understand-client", "ai-theater"].every((id) =>
    item(contexts.aiDisabledMember, id)?.disabled &&
    item(contexts.aiDisabledMember, id)?.disabledReason === "AI_DISABLED",
  ),
  "AI capability off disables AI workbench instead of pretending success",
);

push(canAccessOrgAdmin(contexts.manager), "scoped manager can enter org admin aggregate surface");
push(!canAccessOrgAdmin(contexts.managerWithoutUnit), "manager without unit scope cannot resolve org aggregate");
push(canReadOrgAggregate(contexts.manager), "manager aggregate policy requires managed unit scope");
push(!canManageOrgSettings(contexts.manager), "manager cannot manage org settings");
push(
  hasId(contexts.manager, "org-home") &&
    hasId(contexts.manager, "coaching-queue") &&
    !hasId(contexts.manager, "seats") &&
    !hasId(contexts.manager, "billing") &&
    !hrefs(contexts.manager).some((href) =>
      ["/crm", "/interview", "/theater", "/spin", "/pre-visit", "/reports"].some(
        (prefix) => href === prefix || href.startsWith(`${prefix}/`),
      ),
    ),
  "manager sees scoped aggregate navigation without member client-detail routes",
  hrefs(contexts.manager).join(", "),
);

push(canManageOrgSettings(contexts.orgAdmin), "org admin can manage org settings");
push(canManageOrgSettings(contexts.orgOwner), "org owner can manage org settings");
push(
  hasId(contexts.orgAdmin, "seats") &&
    hasId(contexts.orgAdmin, "org-settings") &&
    hasId(contexts.orgAdmin, "billing"),
  "org admin sees org management and billing when capabilities allow",
  ids(contexts.orgAdmin).join(", "),
);

push(canAccessPlatformTool(contexts.superAdmin), "super admin platform policy passes in platform session");
push(!canAccessPlatformTool(contexts.superAdminInAppSession), "super admin platform policy rejects app session");
push(sections(contexts.superAdminInAppSession).length === 0, "platform sidebar is empty in app session");
push(
  hasId(contexts.support, "support-cases") &&
    hasId(contexts.support, "provider-status") &&
    !hasId(contexts.support, "plans") &&
    !hasId(contexts.support, "billing-reconcile") &&
    !hasId(contexts.support, "impersonation"),
  "support sees support metadata tools but not plan/billing/impersonation tools",
  ids(contexts.support).join(", "),
);
push(
  hasId(contexts.finance, "billing-reconcile") &&
    hasId(contexts.finance, "ai-usage") &&
    !hasId(contexts.finance, "support-cases") &&
    !hasId(contexts.finance, "impersonation"),
  "finance sees billing/cost aggregate tools only",
  ids(contexts.finance).join(", "),
);

push(
  !hasInternalHref(contexts.clientViewer) &&
    hrefs(contexts.clientViewer).every((href) => href.startsWith("/client")),
  "client viewer never sees internal CRM/team/AI/platform routes",
  hrefs(contexts.clientViewer).join(", "),
);

push(!source.includes("openai") && !source.includes("anthropic"), "resolver has explicit no-provider posture");

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
