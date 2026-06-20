#!/usr/bin/env node
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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

const checks = [];

function push(ok, label, detail = "") {
  checks.push({ ok, label, detail });
}

function appSession(overrides = {}) {
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

function navContext(overrides = {}) {
  return {
    sessionType: overrides.sessionType ?? "app",
    surface: overrides.surface ?? "member",
    organizationRole: overrides.organizationRole,
    platformRole: overrides.platformRole,
    clientRole: overrides.clientRole,
    managedUnitIds: overrides.managedUnitIds ?? [],
    planCapabilities: overrides.planCapabilities ?? basePlan,
    featureFlags: overrides.featureFlags ?? baseFlags,
    isDemo: false,
  };
}

function allItemsFromRenderModel(model) {
  return model.primarySections.flatMap((section) => section.items);
}

function allResolvedItems(sections) {
  return sections.flatMap((section) => section.items);
}

function getRenderItem(model, id) {
  return allItemsFromRenderModel(model).find((item) => item.id === id);
}

function section(modelOrSections, id) {
  const sections = Array.isArray(modelOrSections)
    ? modelOrSections
    : modelOrSections.primarySections;

  return sections.find((entry) => entry.id === id);
}

function hrefsFromResolvedSections(sections) {
  return allResolvedItems(sections)
    .map((item) => item.href)
    .filter(Boolean);
}

function hrefsFromRenderModel(model) {
  return allItemsFromRenderModel(model)
    .map((item) => item.action.type === "href" ? item.action.href : undefined)
    .filter(Boolean);
}

function hasInternalMemberRoute(hrefs) {
  return hrefs.some((href) =>
    [
      "/dashboard",
      "/crm",
      "/interview",
      "/theater",
      "/spin",
      "/pre-visit",
      "/reports",
      "/issues",
      "/settings",
      "/team",
    ].some((prefix) => href === prefix || href.startsWith(`${prefix}/`)),
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function actionSummary(item) {
  if ("action" in item && item.action?.type === "openAssistant") {
    return `assistant:${item.action.assistantScope}`;
  }

  if ("action" in item && item.action?.type === "switchSurface") {
    return `switch:${item.action.targetSurface ?? "unknown"}`;
  }

  if ("href" in item && item.href) {
    return item.href;
  }

  if (item.action?.type === "href") {
    return item.action.href;
  }

  if (item.action?.type === "openAssistant") {
    return `assistant:${item.action.assistantScope}`;
  }

  if (item.action?.type === "switchSurface") {
    return `switch:${item.action.targetSurface}`;
  }

  return "action";
}

function renderItems(items, activeItemId = "") {
  return items.map((item) => `
    <div
      class="item ${item.disabled ? "is-disabled" : ""} ${item.id === activeItemId ? "is-active" : ""}"
      tabindex="0"
      title="${escapeHtml(item.ariaLabel)}"
      aria-label="${escapeHtml(item.ariaLabel)}"
      data-sidebar-item="${escapeHtml(item.id)}"
      data-sidebar-boundary="${escapeHtml(item.dataBoundary)}"
      data-sidebar-disabled-reason="${escapeHtml(item.disabledReason ?? "")}"
      ${item.action?.type === "openAssistant" ? `data-assistant-scope="${escapeHtml(item.action.assistantScope)}"` : ""}
    >
      <span aria-hidden="true">${escapeHtml(item.icon)}</span>
      <strong>${escapeHtml(item.label)}</strong>
      <small>${escapeHtml(actionSummary(item))}</small>
    </div>
  `).join("");
}

function renderModel(model, title) {
  const sections = model.primarySections.map((entry) => `
    <section data-sidebar-section="${escapeHtml(entry.id)}">
      <p class="section-label">${escapeHtml(entry.label)}</p>
      <div class="items">
        ${renderItems(entry.items, model.activeItemId)}
      </div>
    </section>
  `).join("");
  const switches = renderItems(model.surfaceSwitches, "");

  return `
    <aside class="sidebar" data-sidebar-surface="${escapeHtml(model.currentSurface)}">
      <header>
        <strong>誠問 AI</strong>
        <small>${escapeHtml(title)}</small>
      </header>
      <nav aria-label="${escapeHtml(title)}">${sections}</nav>
      <footer>
        <p class="section-label">工作台</p>
        <div class="items">${switches}</div>
      </footer>
    </aside>
  `;
}

function renderResolvedSections(sections, title, surface) {
  const renderedSections = sections.map((entry) => `
    <section data-sidebar-section="${escapeHtml(entry.id)}">
      <p class="section-label">${escapeHtml(entry.label)}</p>
      <div class="items">
        ${renderItems(entry.items, "")}
      </div>
    </section>
  `).join("");

  return `
    <aside class="sidebar" data-sidebar-surface="${escapeHtml(surface)}">
      <header>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(surface)}</small>
      </header>
      <nav aria-label="${escapeHtml(title)}">${renderedSections}</nav>
    </aside>
  `;
}

async function launchChromium(chromium) {
  const channels = [
    process.env.PLAYWRIGHT_CHANNEL,
    "msedge",
    "chrome",
    undefined,
  ].filter((channel, index, list) => list.indexOf(channel) === index);

  let lastError;
  for (const channel of channels) {
    try {
      return channel ? await chromium.launch({ channel }) : await chromium.launch();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

const roleAwarePath = resolve("src/domains/navigation/role-aware-sidebar.ts");
const workspacePath = resolve("src/lib/navigation/workspace-sidebar.ts");
const roleAwareExports = loadTsModule(roleAwarePath);
const workspaceExports = loadTsModule(workspacePath, {
  "@/domains/navigation/role-aware-sidebar": roleAwareExports,
});

const { resolveSidebarSections } = roleAwareExports;
const {
  buildWorkspaceSidebarRenderModel,
  resolveWorkspaceRouteAccess,
  workspaceRouteGuardAlignment,
} = workspaceExports;

const memberModel = buildWorkspaceSidebarRenderModel(appSession({ role: "MEMBER" }), "member", {
  pathname: "/interview",
});
const collaboratorModel = buildWorkspaceSidebarRenderModel(appSession({ role: "COLLABORATOR" }), "member", {
  pathname: "/crm",
});
const scopedManagerModel = buildWorkspaceSidebarRenderModel(
  appSession({ role: "MANAGER", managedUnitIds: ["unit-north"] }),
  "orgAdmin",
  { pathname: "/team" },
);
const unscopedManagerModel = buildWorkspaceSidebarRenderModel(
  appSession({ role: "MANAGER", managedUnitIds: [] }),
  "orgAdmin",
  { pathname: "/team" },
);
const ownerOrgModel = buildWorkspaceSidebarRenderModel(appSession({ role: "OWNER" }), "orgAdmin", {
  pathname: "/team/settings",
});

const platformSections = resolveSidebarSections(navContext({
  sessionType: "platform",
  surface: "platform",
  platformRole: "SUPER_ADMIN",
  planCapabilities: { ...basePlan, aiEnabled: false },
}));
const supportSections = resolveSidebarSections(navContext({
  sessionType: "platform",
  surface: "platform",
  platformRole: "SUPPORT",
  planCapabilities: { ...basePlan, aiEnabled: false },
}));
const financeSections = resolveSidebarSections(navContext({
  sessionType: "platform",
  surface: "platform",
  platformRole: "FINANCE",
  planCapabilities: { ...basePlan, aiEnabled: false },
}));
const appSessionPlatformSections = resolveSidebarSections(navContext({
  sessionType: "app",
  surface: "platform",
  platformRole: "SUPER_ADMIN",
}));
const clientSections = resolveSidebarSections(navContext({
  sessionType: "token",
  surface: "clientPortal",
  clientRole: "CLIENT_VIEWER",
}));

const memberAiItems = section(memberModel, "ai-workbench")?.items.map((item) => item.id) ?? [];
push(
  memberModel.primarySections[0]?.id === "today" &&
    memberModel.primarySections[1]?.id === "ai-workbench" &&
    memberAiItems.slice(0, 3).join(",") === "ask-asai,ai-understand-client,ai-theater",
  "member desktop/sidebar fixture keeps 今日 then AI 工作台 order",
  memberAiItems.join(", "),
);
push(
  getRenderItem(memberModel, "ask-asai")?.action.type === "openAssistant" &&
    getRenderItem(memberModel, "ask-asai")?.action.assistantScope === "member-own-assigned" &&
    !getRenderItem(memberModel, "team-settings"),
  "member assistant scope stays member-own-assigned and hides org settings",
);
push(
  getRenderItem(collaboratorModel, "clients") &&
    !getRenderItem(collaboratorModel, "team") &&
    !getRenderItem(collaboratorModel, "billing"),
  "collaborator sees assigned client work but not org/billing navigation",
);
push(
  scopedManagerModel.currentSurface === "orgAdmin" &&
    getRenderItem(scopedManagerModel, "org-home") &&
    getRenderItem(scopedManagerModel, "org-ask-asai")?.action.assistantScope === "org-aggregate" &&
    !getRenderItem(scopedManagerModel, "billing") &&
    !getRenderItem(scopedManagerModel, "org-settings"),
  "scoped manager gets org aggregate and org ASAI scope but no billing/settings write nav",
);
push(
  unscopedManagerModel.currentSurface === "member" &&
    unscopedManagerModel.surfaceSwitches.find((entry) => entry.id === "org-admin")?.disabledReason === "UNIT_SCOPE_REQUIRED",
  "unscoped manager is downgraded to member surface with unit-scope reason",
);
push(
  getRenderItem(ownerOrgModel, "org-settings") &&
    getRenderItem(ownerOrgModel, "billing") &&
    !hrefsFromRenderModel(ownerOrgModel).some((href) =>
      ["/crm", "/interview", "/theater", "/pre-visit", "/reports"].some((prefix) =>
        href === prefix || href.startsWith(`${prefix}/`),
      ),
    ),
  "owner org surface has settings/billing and no member client-work hrefs",
);
push(
  !hasInternalMemberRoute(hrefsFromResolvedSections(platformSections)) &&
    allResolvedItems(platformSections).some((item) => item.id === "tenant-health"),
  "super admin platform fixture has platform nav without member routes",
);
push(
  !hasInternalMemberRoute(hrefsFromResolvedSections(clientSections)) &&
    allResolvedItems(clientSections).some((item) => item.id === "client-reports"),
  "client viewer fixture has client portal nav without internal dashboard routes",
);
push(
  allResolvedItems(supportSections).some((item) => item.id === "support-cases") &&
    !allResolvedItems(supportSections).some((item) => item.id === "billing-reconcile"),
  "support role sees support tools but not finance billing tools",
);
push(
  allResolvedItems(financeSections).some((item) => item.id === "billing-reconcile") &&
    !allResolvedItems(financeSections).some((item) => item.id === "support-impersonation"),
  "finance role sees billing summary tools but not impersonation",
);
push(
  appSessionPlatformSections.length === 0,
  "app session cannot resolve platform sidebar even with SUPER_ADMIN role",
);

const member = appSession({ role: "MEMBER" });
const scopedManager = appSession({ role: "MANAGER", managedUnitIds: ["unit-north"] });
const owner = appSession({ role: "OWNER" });
push(!resolveWorkspaceRouteAccess(member, "/team/settings").allowed, "member cannot hand-type org settings");
push(!resolveWorkspaceRouteAccess(scopedManager, "/team/billing").allowed, "manager cannot hand-type billing write route");
push(!resolveWorkspaceRouteAccess(scopedManager, "/team/seats").allowed, "manager cannot hand-type seats write route");
push(!resolveWorkspaceRouteAccess(scopedManager, "/api/org/units").allowed, "manager cannot call org units write API family");
push(!resolveWorkspaceRouteAccess(owner, "/super-admin").allowed, "app owner session cannot enter super-admin route");
push(!resolveWorkspaceRouteAccess(owner, "/client/reports").allowed, "app owner session cannot enter client portal route");
push(resolveWorkspaceRouteAccess(owner, "/team/billing").allowed, "owner can access billing write route");
push(
  workspaceRouteGuardAlignment.platformRoutes.session === "platform" &&
    workspaceRouteGuardAlignment.clientRoutes.session === "client-or-token",
  "route alignment records platform/client session split",
);

let screenshotDir = "";
try {
  const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
  const { chromium } = require("playwright-core");
  screenshotDir = resolve("docs/06_audits-and-reports/screenshots/modern-ui/sidebar-role-aware");
  mkdirSync(screenshotDir, { recursive: true });

  const html = `
    <!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <style>
          :root {
            color-scheme: light;
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
            background: #f7f6f2;
            color: #111111;
          }
          body {
            margin: 0;
            min-height: 100vh;
            overflow-x: hidden;
          }
          main {
            display: grid;
            grid-template-columns: repeat(4, minmax(216px, 1fr));
            gap: 18px;
            padding: 18px;
          }
          .dark-band {
            grid-column: 1 / -1;
            border: 1px solid #3d3d3d;
            background: #111111;
            color: #fffefa;
            padding: 18px;
          }
          .sidebar {
            display: flex;
            min-height: 820px;
            flex-direction: column;
            border: 1px solid #dedbd2;
            background: #fffefa;
          }
          header, footer, section {
            border-bottom: 1px solid #dedbd2;
            padding: 12px;
          }
          header {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          small, .section-label {
            color: #5d5a53;
            font-size: 11px;
          }
          .section-label {
            margin: 0 0 8px;
            text-transform: uppercase;
            letter-spacing: .12em;
            font-weight: 700;
          }
          .items {
            display: grid;
            gap: 4px;
          }
          .item {
            position: relative;
            display: grid;
            grid-template-columns: 20px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            min-height: 40px;
            padding: 0 10px;
            border-radius: 3px;
            color: #35332e;
            outline-offset: 2px;
          }
          .item:focus {
            outline: 2px solid #1A3A6B;
          }
          .item small {
            grid-column: 2;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .item.is-active {
            background: #111111;
            color: #fffefa;
          }
          .item.is-active::before {
            content: "";
            position: absolute;
            left: 0;
            top: 10px;
            bottom: 10px;
            width: 1px;
            background: #1A3A6B;
          }
          .item.is-disabled {
            color: #8a867d;
          }
          .dark-band .sidebar {
            min-height: auto;
            border-color: #4c4c4c;
            background: #181818;
            color: #fffefa;
          }
          .dark-band header,
          .dark-band footer,
          .dark-band section {
            border-bottom-color: #4c4c4c;
          }
          .dark-band .item,
          .dark-band small,
          .dark-band .section-label {
            color: #e8e4d8;
          }
          @media (max-width: 920px) {
            main {
              grid-template-columns: 1fr;
              padding: 14px;
            }
            .sidebar {
              min-height: auto;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            * {
              scroll-behavior: auto !important;
              transition-duration: 0.01ms !important;
            }
          }
        </style>
      </head>
      <body>
        <main>
          ${renderModel(memberModel, "member desktop/mobile")}
          ${renderModel(ownerOrgModel, "org admin desktop/mobile")}
          ${renderResolvedSections(platformSections, "platform route fixture", "platform")}
          ${renderResolvedSections(clientSections, "client/share fixture", "clientPortal")}
          <div class="dark-band">
            ${renderModel(scopedManagerModel, "dark mode scoped manager")}
          </div>
        </main>
      </body>
    </html>
  `;

  const browser = await launchChromium(chromium);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({
    path: join(screenshotDir, "ras-005-cross-role-matrix-desktop.png"),
    fullPage: true,
  });
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const unlabeledItems = await page.locator("[data-sidebar-item]:not([aria-label])").count();
  await page.keyboard.press("Tab");
  const focusedItem = await page.evaluate(() => Boolean(document.activeElement?.getAttribute("data-sidebar-item")));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(screenshotDir, "ras-005-cross-role-matrix-mobile.png"),
    fullPage: true,
  });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const firstMobileAiVisible = await page.locator('[data-sidebar-section="ai-workbench"]').first().isVisible();
  await browser.close();

  push(consoleErrors.length === 0, "fixture browser console error count is 0", consoleErrors.join(" | "));
  push(!desktopOverflow, "fixture desktop has no horizontal overflow");
  push(!mobileOverflow, "fixture mobile has no horizontal overflow");
  push(unlabeledItems === 0, "fixture sidebar items all have aria-label");
  push(focusedItem, "fixture keyboard focus can land on sidebar item");
  push(firstMobileAiVisible, "fixture mobile first member sidebar keeps AI workbench visible");
} catch (error) {
  push(false, "fixture cross-role browser proof failed", error instanceof Error ? error.message : String(error));
}

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (screenshotDir) {
  console.log(`EVIDENCE ${pathToFileURL(screenshotDir).href}`);
}

console.log("NOTE fixture-only proof: no production auth/session or DB-backed Browser proof is claimed.");
console.log("NOTE providerCalls=none dbWrites=none");

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
