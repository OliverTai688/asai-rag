#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write",
);
const qaStamp = `Relationship Graph Write QA ${Date.now()}`;

const checks = [];
const consoleErrors = [];
let createdClientId = "";
let browserDeleteMemberName = "";

mkdirSync(screenshotDir, { recursive: true });

await runApiProof();
await runBrowserProof();

push(true, "no provider route invoked", "script uses deterministic client/family BFF only");

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (consoleErrors.length > 0) {
  console.log(`FAIL Console errors - ${consoleErrors.slice(0, 3).join(" | ")}`);
  process.exitCode = 1;
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function runApiProof() {
  const unauth = await fetch(`${baseUrl}/api/clients/not-a-client/family-members/not-a-member`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ relation: "配偶" }),
  });
  const unauthPayload = await readJson(unauth);
  push(unauth.status === 401, "family member PATCH unauth returns 401", `status=${unauth.status} error=${unauthPayload?.error ?? ""}`);

  const created = await createClient();
  createdClientId = created.id;
  if (!createdClientId) return;

  const parent = await createFamilyMember(createdClientId, {
    name: `${qaStamp} 父節點`,
    relation: "配偶",
    age: 43,
  });
  const child = await createFamilyMember(createdClientId, {
    name: `${qaStamp} 待改子節點`,
    relation: "女",
    age: 12,
  });
  const browserDelete = await createFamilyMember(createdClientId, {
    name: `${qaStamp} UI 待刪`,
    relation: "親戚",
    age: 51,
  });
  browserDeleteMemberName = browserDelete.member?.name ?? "";

  push(Boolean(parent.member?.id), "API proof has parent member id");
  push(Boolean(child.member?.id), "API proof has child member id");
  push(Boolean(browserDelete.member?.id), "API proof has browser-delete member id");
  if (!parent.member?.id || !child.member?.id || !browserDelete.member?.id) return;

  const reparent = await memberRequestJson(
    "PATCH",
    `/api/clients/${createdClientId}/family-members/${child.member.id}`,
    { parentMemberId: parent.member.id, relation: "女", phone: "" },
  );
  const reparentedChild = reparent.body?.client?.family?.find((member) => member.id === child.member.id);
  push(reparent.status === 200, "PATCH family member re-parent returns 200", `status=${reparent.status}`);
  push(reparentedChild?.parentMemberId === parent.member.id, "PATCH persists parentMemberId in returned client DTO");

  const selfParent = await memberRequestJson(
    "PATCH",
    `/api/clients/${createdClientId}/family-members/${child.member.id}`,
    { parentMemberId: child.member.id },
  );
  push(selfParent.status === 400 && selfParent.body?.error === "FAMILY_MEMBER_PARENT_SELF", "PATCH rejects self-parenting");

  const cycle = await memberRequestJson(
    "PATCH",
    `/api/clients/${createdClientId}/family-members/${parent.member.id}`,
    { parentMemberId: child.member.id },
  );
  push(cycle.status === 400 && cycle.body?.error === "FAMILY_MEMBER_PARENT_CYCLE", "PATCH rejects relationship graph cycles");

  const managerPatch = await managerRequestJson(
    "PATCH",
    `/api/clients/${createdClientId}/family-members/${child.member.id}`,
    { relation: "子" },
  );
  push([403, 404].includes(managerPatch.status), "manager cannot patch member relationship graph detail", `status=${managerPatch.status}`);

  const deleteParent = await memberRequestJson(
    "DELETE",
    `/api/clients/${createdClientId}/family-members/${parent.member.id}`,
  );
  const afterDeleteFamily = deleteParent.body?.client?.family ?? [];
  const deletedParent = afterDeleteFamily.find((member) => member.id === parent.member.id);
  const childAfterParentDelete = afterDeleteFamily.find((member) => member.id === child.member.id);
  push(deleteParent.status === 200, "DELETE family member returns 200", `status=${deleteParent.status}`);
  push(!deletedParent, "DELETE removes selected family member from returned client DTO");
  push(Boolean(childAfterParentDelete), "DELETE keeps child node after deleting parent");
  push(!childAfterParentDelete?.parentMemberId, "DELETE safely reattaches children to root when deleted parent had no parent");

  const missingDelete = await memberRequestJson(
    "DELETE",
    `/api/clients/${createdClientId}/family-members/${parent.member.id}`,
  );
  push(missingDelete.status === 404, "DELETE missing family member returns 404", `status=${missingDelete.status}`);
}

async function runBrowserProof() {
  if (!createdClientId || !browserDeleteMemberName) {
    push(false, "browser proof has created client and member");
    return;
  }

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoMemberEmail,
    },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());

  try {
    await page.goto(`${baseUrl}/crm/${createdClientId}/relationships`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: "關係人管理" }).waitFor({ timeout: 30000 });
    const deleteButton = page.getByLabel(`刪除 ${browserDeleteMemberName}`);
    await deleteButton.waitFor({ timeout: 30000 });
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-relationship-graph-write-before-delete.png"),
      fullPage: true,
    });

    await deleteButton.click();
    await page.getByText(`${browserDeleteMemberName} 已刪除`).waitFor({ timeout: 30000 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });

    const browserChecks = await page.evaluate((deletedName) => {
      const text = document.body.innerText;
      return {
        hasGraphReview: text.includes("關係圖來源審查"),
        deletedNameGone: !text.includes(deletedName),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, browserDeleteMemberName);
    push(browserChecks.hasGraphReview, "browser still renders relationship graph review after remote delete");
    push(browserChecks.deletedNameGone, "browser delete is remote-confirmed after refresh");
    push(!browserChecks.horizontalOverflow, "relationship graph write desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-relationship-graph-write-after-delete.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function createClient() {
  const name = `${qaStamp} 客戶`;
  const client = await memberRequestJson("POST", "/api/clients", {
    name,
    email: `relationship-write-${Date.now()}@asai.local`,
    phone: "0912-771-662",
    occupation: "家族企業負責人",
    annualIncome: 5800000,
    status: "ACTIVE",
  });
  const id = client.body?.client?.id ?? "";
  push(client.status === 201 && Boolean(id), "POST /api/clients creates graph write QA client", `status=${client.status} client=${id}`);
  return { id, name };
}

async function createFamilyMember(clientId, body) {
  const response = await memberRequestJson("POST", `/api/clients/${clientId}/family-members`, body);
  const family = response.body?.client?.family ?? [];
  const member = findLatestMatchingMember(family, body.name, body.relation);
  push(response.status === 201 && Boolean(member?.id), `POST family member creates ${body.name}`, `status=${response.status}`);
  return { status: response.status, body: response.body, member };
}

function findLatestMatchingMember(family, name, relation) {
  for (let index = family.length - 1; index >= 0; index -= 1) {
    const member = family[index];
    if (member.name === name && member.relation === relation) return member;
  }
  return null;
}

async function memberRequestJson(method, path, body) {
  return requestJson(method, path, demoMemberEmail, body);
}

async function managerRequestJson(method, path, body) {
  return requestJson(method, path, demoManagerEmail, body);
}

async function requestJson(method, path, email, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": email,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
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
