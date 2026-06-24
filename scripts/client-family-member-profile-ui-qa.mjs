#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const checks = [];
const consoleErrors = [];

loadEnvFile(".env");

const runBrowserProofRequested =
  process.argv.includes("--browser") || Boolean(process.env.CLIENT_FAMILY_PROFILE_UI_QA_BASE_URL);
const baseUrl =
  process.env.CLIENT_FAMILY_PROFILE_UI_QA_BASE_URL ??
  process.env.DEMO_QA_BASE_URL ??
  process.argv.find((arg) => arg.startsWith("http")) ??
  "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const screenshotDir = resolve(
  process.env.CLIENT_FAMILY_PROFILE_UI_QA_SCREENSHOT_DIR ??
    "docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph",
);
const qaStamp = `REL-006d ${Date.now()}`;
const qaPrivateEmail = `rel-006d-${Date.now()}@asai.local`;
const qaPrivatePhone = "0912-006-006";

const pageSource = readFileSync("src/app/(dashboard)/crm/[clientId]/relationships/page.tsx", "utf8");
const profileContractSource = readFileSync("src/domains/client/family-member-profile.ts", "utf8");
const repositorySource = readFileSync("src/lib/clients/client-repository.ts", "utf8");
const serviceSource = readFileSync("src/domains/client/service.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const accSource = readFileSync(
  "docs/08_acceptance-and-qa/ACC-016_relationship-network-graph-acceptance-framework-v1.0.md",
  "utf8",
);

const saveSlice = sliceBetween(pageSource, "async function handleSaveProfile", "async function handleClearProfile");
const payloadSlice = sliceBetween(pageSource, "function buildProfilePayload", "function familyProfileAdvisorSourceId");
const editorSlice = sliceBetween(pageSource, "function FamilyProfileEditor", "function createProfileDraft");
const familySchemaSlice = sliceBetween(
  repositorySource,
  "export const createFamilyMemberInputSchema",
  "export const updateFamilyMemberInputSchema",
);

push(
  pageSource.includes('data-family-profile-editor="true"') &&
    pageSource.includes("data-family-profile-editor-row") &&
    pageSource.includes("data-family-profile-field") &&
    pageSource.includes("人物資料"),
  "relationship graph renders an advisor-editable family profile panel",
);
push(
  ["jobTitle", "annualIncomeOrDependency", "personStatus", "decisionRole", "relationshipContext"].every(
    (field) => pageSource.includes(field),
  ),
  "profile editor covers job title, income/dependency, person status, decision role, and relationship context",
);
push(
  ["FACT", "INFERENCE", "UNKNOWN"].every((status) => pageSource.includes(status)) &&
    editorSlice.includes("PROFILE_STATUS_OPTIONS"),
  "profile editor requires explicit FACT/INFERENCE/UNKNOWN status per field",
);
push(
  saveSlice.includes("clientService.updateFamilyMemberRemote(clientId, member.id") &&
    saveSlice.includes("profile: profilePayload") &&
    serviceSource.includes("updateFamilyMemberRemote: async (clientId: string, memberId: string"),
  "profile save uses existing family-member BFF service boundary",
);
push(
  pageSource.includes("profile: null") &&
    pageSource.includes("handleClearProfile") &&
    repositorySource.includes("mergeFamilyMemberProfileIntoMetadata(target.metadata, input.profile)"),
  "profile clear path maps to metadata.profile removal through repository helper",
);
push(
  payloadSlice.includes("sourceReferenceIds: [familyProfileAdvisorSourceId(member.id)]") &&
    payloadSlice.includes('type: "relationship_graph"') &&
    payloadSlice.includes('label: "顧問輸入"') &&
    payloadSlice.includes("aggregateProfileFactStatus"),
  "profile payload carries relationship-graph source references for source review",
);
push(
  profileContractSource.includes("schemaVersion: z.literal(FAMILY_MEMBER_PROFILE_SCHEMA_VERSION).optional()") &&
    pageSource.includes("FAMILY_MEMBER_PROFILE_SCHEMA_VERSION"),
  "BFF input schema and UI payload share the stable family profile schema version",
);
push(
  profileContractSource.includes(".strict()") &&
    profileContractSource.includes("findUnsafeProfilePaths") &&
    profileContractSource.includes("rawTranscript|rawPayload|providerPayload") &&
    profileContractSource.includes("policyNumber"),
  "family profile schema remains strict and rejects private/provider/policy sentinels",
);
push(
  !/organizationId|ownerId|userId|unitId/.test(familySchemaSlice) &&
    !/organizationId|ownerId|userId|unitId/.test(payloadSlice),
  "family profile UI cannot supply organization/user/unit scope",
);
push(
  !/rawMetadata|metadata\.profile|record\.metadata/.test(pageSource) &&
    !pageSource.includes("JSON.stringify(member.profile") &&
    !pageSource.includes("sourceReferences.map"),
  "UI renders profile summary and editor fields without exposing raw metadata/source reference internals",
);
push(
  !/openai|anthropic|aiUsageLog|providerPayload|rawPrivateTranscript|policyNumber/i.test(pageSource) &&
    !/openai|anthropic/i.test(serviceSource),
  "profile editor has no provider call, AiUsageLog requirement, raw transcript, or policy-number handling",
);
push(
  !repositorySource.includes("prisma.visitPlan") &&
    !repositorySource.includes("model RelationshipEdge") &&
    repositorySource.includes("getWritableClientScope(session, clientId)") &&
    repositorySource.includes("canWriteClient(session, current)"),
  "profile writeback stays scoped to existing FamilyMember.metadata and does not create VisitPlan/RelationshipEdge writes",
);
push(
  packageJson.scripts?.["client:family-member-profile-ui-qa"] ===
    "node scripts/client-family-member-profile-ui-qa.mjs",
  "package.json exposes REL-006d UI QA command",
);
push(
  accSource.includes("REL-006d") && accSource.includes("client:family-member-profile-ui-qa"),
  "ACC-016 records REL-006d evidence command",
);

if (!hasFailures() && runBrowserProofRequested) {
  await runBrowserProof();
}

if (consoleErrors.length > 0) {
  push(false, "browser console error 0", consoleErrors.slice(0, 3).join(" | "));
}

const failed = checks.filter((check) => check.status === "fail");

console.log(
  JSON.stringify(
    {
      status: failed.length === 0 ? "pass" : "fail",
      slice: "REL-006d",
      proofType: "source-ui-contract",
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      dbConnectionAttempted: runBrowserProofRequested,
      browserLaunched: runBrowserProofRequested,
      demoTestWriteAttempted: runBrowserProofRequested,
      writesRelationshipEdgeTable: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
      exposesBrowserSuppliedOrgScope: false,
      externalRegistryPublicationAttempted: false,
      checks,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exit(1);
}

function push(condition, label) {
  checks.push({ status: condition ? "pass" : "fail", label });
}

function pushDetail(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function hasFailures() {
  return checks.some((check) => check.status === "fail");
}

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, Math.max(startIndex, 0));

  if (startIndex === -1) return "";
  if (endIndex === -1) return source.slice(startIndex);

  return source.slice(startIndex, endIndex);
}

async function runBrowserProof() {
  mkdirSync(screenshotDir, { recursive: true });

  const clientId = await createClient();
  const member = clientId ? await createFamilyMember(clientId) : null;

  push(Boolean(clientId && member?.id), "browser proof seeded demo client and family member");

  if (!clientId || !member?.id) return;

  const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
  const { chromium } = require("playwright-core");
  const browser = await launchChromium(chromium);

  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: { "x-asai-demo-user-email": demoMemberEmail },
    });
    await runProfileEditorPageProof(desktopContext, clientId, member, {
      label: "desktop",
      screenshotName: "rel-006d-family-profile-editor-desktop.png",
      saveProfile: true,
    });
    await desktopContext.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: { "x-asai-demo-user-email": demoMemberEmail },
    });
    await runProfileEditorPageProof(mobileContext, clientId, member, {
      label: "mobile",
      screenshotName: "rel-006d-family-profile-editor-mobile.png",
      saveProfile: false,
    });
    await mobileContext.close();
  } finally {
    await browser.close();
  }

  const readback = await memberRequestJson("GET", `/api/clients/${clientId}`);
  const readbackMember = readback.body?.client?.family?.find((candidate) => candidate.id === member.id);
  const profile = readbackMember?.profile;

  pushDetail(readback.status === 200, "browser proof API readback returns client", `status=${readback.status}`);
  push(
    profile?.jobTitle?.value === "家族企業共同決策者" &&
      profile?.jobTitle?.factStatus === "FACT" &&
      profile?.relationshipContext?.factStatus === "INFERENCE",
    "browser proof saved advisor profile fields through BFF and DTO readback",
  );
  push(
    Array.isArray(profile?.sourceReferences) &&
      profile.sourceReferences.some((reference) => reference.type === "relationship_graph"),
    "browser proof readback includes relationship_graph source reference",
  );
}

async function runProfileEditorPageProof(context, clientId, member, options) {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${options.label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleErrors.push(`${options.label}: ${error.message}`));

  try {
    await page.goto(`${baseUrl}/crm/${clientId}/relationships`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: "關係人管理" }).waitFor({ timeout: 30000 });
    await page.getByText(member.name).first().waitFor({ timeout: 30000 });
    await page
      .locator(`[data-family-profile-editor-row="${member.id}"]`)
      .getByRole("button", { name: "人物資料" })
      .click();
    await page.locator('[data-family-profile-editor="true"]').waitFor({ timeout: 30000 });

    const editorOpenChecks = await page.evaluate(() => ({
      hasEditor: Boolean(document.querySelector('[data-family-profile-editor="true"]')),
      fieldCount: document.querySelectorAll("[data-family-profile-field]").length,
    }));
    push(editorOpenChecks.hasEditor, `${options.label} browser renders family profile editor`);
    push(editorOpenChecks.fieldCount >= 5, `${options.label} browser renders five profile fields`);

    if (options.saveProfile) {
      await page.locator('[data-family-profile-field="jobTitle"] input').fill("家族企業共同決策者");
      await page.locator('[data-family-profile-field="jobTitle"] select').selectOption("FACT");
      await page.locator('[data-family-profile-field="jobTitle"] textarea').fill("顧問在關係圖手動輸入。");
      await page.locator('[data-family-profile-field="relationshipContext"] input').fill("會影響家庭保障決策");
      await page.locator('[data-family-profile-field="relationshipContext"] select').selectOption("INFERENCE");
      await page
        .locator('[data-family-profile-field="relationshipContext"] textarea')
        .fill("由家庭角色與顧問訪談脈絡推論，仍需拜訪確認。");
      await page.getByRole("button", { name: "儲存" }).click();
      await page.getByText("2 欄").waitFor({ timeout: 30000 });
    }

    const pageChecks = await page.evaluate(({ memberId, privateEmail, privatePhone }) => {
      const rowText =
        document.querySelector(`[data-family-profile-editor-row="${memberId}"]`)?.textContent ?? "";
      return {
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        hidesPrivateEmail: !rowText.includes(privateEmail),
        hidesPrivatePhone: !rowText.includes(privatePhone),
        hidesRawMetadata: !/raw metadata|metadata\.profile|sourceReferences/i.test(rowText),
      };
    }, { memberId: member.id, privateEmail: qaPrivateEmail, privatePhone: qaPrivatePhone });

    push(!pageChecks.horizontalOverflow, `${options.label} browser has no horizontal overflow`);
    push(pageChecks.hidesPrivateEmail && pageChecks.hidesPrivatePhone, `${options.label} browser hides contact sentinels`);
    push(pageChecks.hidesRawMetadata, `${options.label} browser hides raw metadata/source internals copy`);

    await page.screenshot({ path: resolve(screenshotDir, options.screenshotName), fullPage: true });
  } finally {
    await page.close();
  }
}

async function createClient() {
  const response = await memberRequestJson("POST", "/api/clients", {
    name: `${qaStamp} 人物資料 UI 客戶`,
    email: qaPrivateEmail,
    phone: qaPrivatePhone,
    occupation: "家庭保障決策者",
    annualIncome: 3600000,
    status: "ACTIVE",
  });
  const id = response.body?.client?.id ?? "";
  pushDetail(response.status === 201 && Boolean(id), "browser proof POST /api/clients creates demo client", `status=${response.status}`);
  return id;
}

async function createFamilyMember(clientId) {
  const response = await memberRequestJson("POST", `/api/clients/${clientId}/family-members`, {
    name: `${qaStamp} 配偶`,
    relation: "配偶",
    age: 42,
  });
  const member = response.body?.client?.family?.find((candidate) => candidate.name === `${qaStamp} 配偶`);
  pushDetail(
    response.status === 201 && Boolean(member?.id),
    "browser proof POST family member creates profile editor target",
    `status=${response.status}`,
  );
  return member ?? null;
}

async function memberRequestJson(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": demoMemberEmail,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

async function launchChromium(chromium) {
  const candidates = [
    process.env.PLAYWRIGHT_CHANNEL,
    "msedge",
    "chrome",
    undefined,
  ];

  let lastError = null;
  for (const channel of candidates) {
    try {
      return channel ? await chromium.launch({ channel }) : await chromium.launch();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const contents = readFileSync(path, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
