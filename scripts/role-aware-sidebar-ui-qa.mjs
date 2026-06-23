#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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

function allItems(model) {
  return model.primarySections.flatMap((section) => section.items);
}

function getItem(model, id) {
  return allItems(model).find((item) => item.id === id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function renderActionMeta(item) {
  if (item.action.type === "href") {
    return item.action.href;
  }

  if (item.action.type === "openAssistant") {
    return `assistant:${item.action.assistantScope}`;
  }

  return `switch:${item.action.targetSurface}`;
}

function renderModel(model, title) {
  const sections = model.primarySections.map((section) => `
    <section data-sidebar-section="${escapeHtml(section.id)}">
      <p class="section-label">${escapeHtml(section.label)}</p>
      <div class="items">
        ${section.items.map((item) => `
          <div
            class="item ${item.disabled ? "is-disabled" : ""} ${item.id === model.activeItemId ? "is-active" : ""}"
            data-sidebar-item="${escapeHtml(item.id)}"
            data-sidebar-boundary="${escapeHtml(item.dataBoundary)}"
            data-sidebar-disabled-reason="${escapeHtml(item.disabledReason ?? "")}"
            ${item.action.type === "openAssistant" ? `data-assistant-scope="${escapeHtml(item.action.assistantScope)}"` : ""}
            aria-label="${escapeHtml(item.ariaLabel)}"
          >
            <span>${escapeHtml(item.icon)}</span>
            <strong>${escapeHtml(item.label)}</strong>
            <small>${escapeHtml(renderActionMeta(item))}</small>
          </div>
        `).join("")}
      </div>
    </section>
  `).join("");
  const switches = model.surfaceSwitches.map((entry) => `
    <div
      class="item ${entry.disabled ? "is-disabled" : ""} ${entry.action.current ? "is-active" : ""}"
      data-sidebar-surface-switch="${escapeHtml(entry.id)}"
      data-sidebar-boundary="${escapeHtml(entry.dataBoundary)}"
      data-sidebar-disabled-reason="${escapeHtml(entry.disabledReason ?? "")}"
      aria-label="${escapeHtml(entry.ariaLabel)}"
    >
      <span>${escapeHtml(entry.icon)}</span>
      <strong>${escapeHtml(entry.label)}</strong>
      <small>${entry.action.current ? "current" : entry.action.href}</small>
    </div>
  `).join("");

  return `
    <aside class="sidebar" data-sidebar-surface="${escapeHtml(model.currentSurface)}">
      <header>
        <strong>誠問 AI</strong>
        <small>${escapeHtml(title)}</small>
      </header>
      <nav aria-label="${escapeHtml(model.currentSurface)} navigation">${sections}</nav>
      <footer>
        <p class="section-label">工作台</p>
        ${switches}
      </footer>
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
const shellPath = resolve("src/components/layout/dashboard-shell.tsx");
const layoutPath = resolve("src/app/(dashboard)/layout.tsx");
const roleAwareSidebarPath = resolve("src/components/layout/role-aware-sidebar.tsx");

const roleAwareExports = loadTsModule(roleAwarePath);
const workspaceExports = loadTsModule(workspacePath, {
  "@/domains/navigation/role-aware-sidebar": roleAwareExports,
});
const { buildWorkspaceSidebarRenderModel } = workspaceExports;

const shellSource = readFileSync(shellPath, "utf8");
const layoutSource = readFileSync(layoutPath, "utf8");
const roleAwareSidebarSource = readFileSync(roleAwareSidebarPath, "utf8");
const legacySidebarDiff = execFileSync("git", ["diff", "--", "src/components/layout/sidebar.tsx"], {
  encoding: "utf8",
});

push(
  shellSource.includes("@/components/layout/role-aware-sidebar") &&
    shellSource.includes("sidebarNavigation") &&
    !shellSource.includes("@/components/layout/sidebar"),
  "dashboard shell renders RoleAwareSidebar instead of legacy sidebar",
);
push(
  layoutSource.includes("buildWorkspaceSidebarRenderModel") &&
    layoutSource.includes("buildBillingSubscriptionCapability") &&
    layoutSource.includes("subscription = await buildBillingSubscriptionCapability(session)") &&
    layoutSource.includes("member: buildWorkspaceSidebarRenderModel(session, \"member\",") &&
    layoutSource.includes("orgAdmin: buildWorkspaceSidebarRenderModel(session, \"orgAdmin\",") &&
    layoutSource.includes("subscription,"),
  "dashboard layout builds member/orgAdmin render models server-side from subscription DTO",
);
push(
  roleAwareSidebarSource.includes("data-sidebar-surface") &&
    roleAwareSidebarSource.includes("data-assistant-scope") &&
    roleAwareSidebarSource.includes("data-sidebar-boundary") &&
    roleAwareSidebarSource.includes("data-subscription-source") &&
    roleAwareSidebarSource.includes("data-checkout-status") &&
    roleAwareSidebarSource.includes("aria-disabled") &&
    roleAwareSidebarSource.includes("motion-reduce:transition-none"),
  "RoleAwareSidebar exposes surface, scope, boundary, subscription, disabled and reduced-motion hooks",
);
push(
  !legacySidebarDiff.includes("RoleAwareSidebar") &&
    !legacySidebarDiff.includes("buildWorkspaceSidebarRenderModel"),
  "legacy sidebar dirty diff remains unrelated to RAS-004b wiring",
);

const memberModel = buildWorkspaceSidebarRenderModel(session({ role: "MEMBER" }), "member", {
  pathname: "/interview",
});
const ownerOrgModel = buildWorkspaceSidebarRenderModel(session({ role: "OWNER" }), "orgAdmin", {
  pathname: "/team/settings",
});

push(memberModel.currentSurface === "member", "member fixture renders member surface");
push(ownerOrgModel.currentSurface === "orgAdmin", "owner fixture renders org admin surface");
push(
  memberModel.subscriptionBoundary.source === "session_plan_capability_fallback",
  "member fixture keeps explicit subscription fallback source when no DTO is injected",
);
push(memberModel.activeItemId === "ai-understand-client", "member fixture activates AI 了解客戶");
push(ownerOrgModel.activeItemId === "org-settings", "owner fixture activates org settings");
push(
  getItem(memberModel, "ask-asai")?.action.type === "openAssistant" &&
    getItem(memberModel, "ask-asai")?.action.assistantScope === "member-own-assigned",
  "member ASAI assistant keeps member-own-assigned scope",
);
push(
  getItem(ownerOrgModel, "org-ask-asai")?.action.type === "openAssistant" &&
    getItem(ownerOrgModel, "org-ask-asai")?.action.assistantScope === "org-aggregate",
  "org ASAI assistant keeps org-aggregate scope",
);

let playwrightProof = false;
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
            grid-template-columns: 240px 240px;
            gap: 24px;
            padding: 24px;
          }
          .sidebar {
            display: flex;
            min-height: 860px;
            flex-direction: column;
            border-right: 1px solid #dedbd2;
            background: #fffefa;
          }
          header, footer, section {
            border-bottom: 1px solid #dedbd2;
            padding: 14px 12px;
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
            letter-spacing: .16em;
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
          @media (max-width: 720px) {
            main {
              grid-template-columns: 1fr;
              padding: 16px;
            }
            .sidebar {
              min-height: auto;
            }
          }
        </style>
      </head>
      <body>
        <main>
          ${renderModel(memberModel, "顧問工作台")}
          ${renderModel(ownerOrgModel, "通訊處工作台")}
        </main>
      </body>
    </html>
  `;
  const browser = await launchChromium(chromium);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({
    path: join(screenshotDir, "ras-004b-sidebar-ui-fixture-desktop.png"),
    fullPage: true,
  });
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(screenshotDir, "ras-004b-sidebar-ui-fixture-mobile.png"),
    fullPage: true,
  });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const visibleAiWorkbench = await page.locator('[data-sidebar-section="ai-workbench"]').first().isVisible();
  await browser.close();
  playwrightProof = !desktopOverflow && !mobileOverflow && visibleAiWorkbench;
  push(playwrightProof, "fixture browser proof has no horizontal overflow and keeps AI workbench visible");
} catch (error) {
  push(false, "fixture browser proof failed", error instanceof Error ? error.message : String(error));
}

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (screenshotDir) {
  console.log(`EVIDENCE ${pathToFileURL(screenshotDir).href}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
