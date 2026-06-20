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
  createContext(sandbox)
);

const {
  roleAwareSidebarManifests,
  sidebarContextRequiredFields,
  sidebarContextExamples,
  sidebarMigrationNote,
} = commonJsModule.exports;

const checks = [];

function push(ok, label, detail = "") {
  checks.push({ ok, label, detail });
}

function items(manifest) {
  return manifest.sections.flatMap((section) => section.items);
}

function section(manifest, id) {
  return manifest.sections.find((entry) => entry.id === id);
}

function hrefs(manifest) {
  return items(manifest)
    .map((item) => item.href)
    .filter(Boolean);
}

function startsWithAny(value, prefixes) {
  return prefixes.some((prefix) => value === prefix || value.startsWith(`${prefix}/`));
}

const expectedSurfaces = ["member", "orgAdmin", "platform", "clientPortal"];
const actualSurfaces = Object.keys(roleAwareSidebarManifests).sort();
push(
  expectedSurfaces.every((surface) => actualSurfaces.includes(surface)),
  "all four sidebar surface manifests exist",
  actualSurfaces.join(", ")
);

for (const surface of expectedSurfaces) {
  const manifest = roleAwareSidebarManifests[surface];
  push(Boolean(manifest?.sections?.length), `${surface} manifest has sections`);
  push(
    sidebarContextExamples[surface]?.surface === surface,
    `${surface} context example declares matching surface`
  );
}

const requiredFields = new Set(sidebarContextRequiredFields);
for (const field of [
  "sessionType",
  "surface",
  "organizationRole",
  "platformRole",
  "clientRole",
  "managedUnitIds",
  "planCapabilities",
  "featureFlags",
  "isDemo",
]) {
  push(requiredFields.has(field), `SidebarContext includes ${field}`);
}

const member = roleAwareSidebarManifests.member;
const memberAiItems = section(member, "ai-workbench").items;
const memberAiOrder = memberAiItems
  .filter((item) => item.id !== "legacy-spin")
  .map((item) => item.label);
push(
  JSON.stringify(memberAiOrder) === JSON.stringify(["問誠問 AI", "AI 了解客戶", "AI 劇場演練"]),
  "member AI workbench keeps RES-008 order",
  memberAiOrder.join(" > ")
);

const assistant = memberAiItems.find((item) => item.id === "ask-asai");
push(
  assistant?.kind === "action" && assistant?.action?.type === "openAssistant" && !assistant.href,
  "問誠問 AI is an assistant action, not a route link"
);
push(
  assistant?.dataBoundary === "member-own-assigned-summary",
  "member assistant scope is own/assigned summary only",
  assistant?.dataBoundary
);

const legacySpin = memberAiItems.find((item) => item.id === "legacy-spin");
push(
  legacySpin?.href === "/spin" &&
    legacySpin?.visible === false &&
    legacySpin?.requiresFeatureFlag === "legacySpinNav" &&
    legacySpin?.badge === "legacy" &&
    legacySpin?.visibilityStrategy === "hide",
  "SPIN 舊版 is hidden behind legacySpinNav"
);

const allItems = expectedSurfaces.flatMap((surface) => items(roleAwareSidebarManifests[surface]));
for (const item of allItems) {
  push(Boolean(item.id), `item has id: ${item.label}`);
  push(Boolean(item.ariaLabel), `item has ariaLabel: ${item.id}`);
  push(typeof item.visible === "boolean", `item has visible boolean: ${item.id}`);
  push(Boolean(item.policy), `item has policy key: ${item.id}`);
  push(Boolean(item.dataBoundary), `item has data boundary: ${item.id}`);
  push(
    Boolean(item.href) !== Boolean(item.action),
    `item has exactly one navigation target: ${item.id}`
  );
}

const orgHrefs = hrefs(roleAwareSidebarManifests.orgAdmin);
push(
  !orgHrefs.some((href) => startsWithAny(href, ["/crm", "/interview", "/theater", "/spin", "/pre-visit", "/reports"])),
  "org admin manifest does not expose member detail routes",
  orgHrefs.join(", ")
);
push(
  items(roleAwareSidebarManifests.orgAdmin).every((item) =>
    item.dataBoundary === "org-aggregate" ||
    item.dataBoundary === "org-settings" ||
    item.dataBoundary === "member-own-assigned-summary"
  ),
  "org admin manifest stays aggregate/settings or explicit surface switch"
);

const platformHrefs = hrefs(roleAwareSidebarManifests.platform);
push(
  platformHrefs.every((href) => href.startsWith("/super-admin")),
  "platform manifest is isolated to /super-admin routes",
  platformHrefs.join(", ")
);
push(
  items(roleAwareSidebarManifests.platform).every((item) =>
    item.dataBoundary === "platform-metadata" || item.dataBoundary === "platform-audit"
  ),
  "platform manifest uses platform data boundaries only"
);

const clientHrefs = hrefs(roleAwareSidebarManifests.clientPortal);
push(
  !clientHrefs.some((href) =>
    startsWithAny(href, [
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
    ])
  ),
  "client portal manifest does not expose internal app routes",
  clientHrefs.join(", ")
);
push(
  items(roleAwareSidebarManifests.clientPortal).every((item) => item.dataBoundary === "client-authorized"),
  "client portal manifest uses client-authorized data boundary only"
);

push(
  sidebarMigrationNote.sourceFile === "src/components/layout/sidebar.tsx",
  "migration note points to current sidebar renderer"
);
push(
  sidebarMigrationNote.currentActions.includes("openAssistant"),
  "migration note records assistant action"
);
push(
  !source.includes("openai") && !source.includes("anthropic"),
  "contract has explicit no-provider posture"
);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
