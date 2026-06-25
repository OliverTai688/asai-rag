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
let browserChildName = "";
let browserParentName = "";
let rootElderName = "";
let linkedMemberName = "";
let linkedClientId = "";
let linkedClientName = "";
let linkedClientEmail = "";
let linkedClientPhone = "";

mkdirSync(screenshotDir, { recursive: true });

await runApiProof();
await runBrowserProof();
runSourceProof();

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

  const invalidCreate = await memberRequestJson(
    "POST",
    `/api/clients/${createdClientId}/family-members`,
    { relation: "父" },
  );
  push(invalidCreate.status === 400, "POST family member missing name returns 400", `status=${invalidCreate.status}`);

  const missingParentCreate = await memberRequestJson(
    "POST",
    `/api/clients/${createdClientId}/family-members`,
    {
      name: `${qaStamp} 不存在父節點`,
      relation: "子",
      parentMemberId: "fm_missing_parent_for_rel_007",
    },
  );
  push(
    missingParentCreate.status === 400 && missingParentCreate.body?.error === "FAMILY_MEMBER_PARENT_NOT_FOUND",
    "POST rejects dangling parentMemberId",
    `status=${missingParentCreate.status} error=${missingParentCreate.body?.error ?? ""}`,
  );

  const foreignClient = await createClient("foreign");
  const foreignParent = foreignClient.id
    ? await createFamilyMember(foreignClient.id, {
        name: `${qaStamp} 跨客戶父節點`,
        relation: "父",
        age: 70,
      })
    : { member: null };
  const validPostChildWithParent = foreignClient.id && foreignParent.member?.id
    ? await createFamilyMember(foreignClient.id, {
        name: `${qaStamp} POST 父子節點`,
        relation: "子",
        age: 9,
        parentMemberId: foreignParent.member.id,
      })
    : { member: null };
  push(
    validPostChildWithParent.member?.parentMemberId === foreignParent.member?.id,
    "POST persists valid parentMemberId in returned client DTO",
  );
  const crossClientParentCreate = await memberRequestJson(
    "POST",
    `/api/clients/${createdClientId}/family-members`,
    {
      name: `${qaStamp} 跨客戶子節點`,
      relation: "子",
      parentMemberId: foreignParent.member?.id ?? "fm_missing_cross_client_parent",
    },
  );
  push(
    crossClientParentCreate.status === 400 && crossClientParentCreate.body?.error === "FAMILY_MEMBER_PARENT_NOT_FOUND",
    "POST rejects cross-client parentMemberId without leaking parent ownership",
    `status=${crossClientParentCreate.status} error=${crossClientParentCreate.body?.error ?? ""}`,
  );

  const aliasCreate = await memberRequestJson(
    "POST",
    `/api/clients/${createdClientId}/family-members`,
    {
      name: `${qaStamp} 同義詞父節點`,
      relation: "爸爸",
      age: 68,
    },
  );
  const aliasMember = aliasCreate.body?.client?.family?.find((member) => member.name === `${qaStamp} 同義詞父節點`);
  push(
    aliasCreate.status === 201 && aliasMember?.relation === "父",
    "POST normalizes relation aliases before persistence",
    `status=${aliasCreate.status} relation=${aliasMember?.relation ?? ""}`,
  );

  const unknownRelationCreate = await memberRequestJson(
    "POST",
    `/api/clients/${createdClientId}/family-members`,
    {
      name: `${qaStamp} 未知關係節點`,
      relation: "乾親",
      age: 52,
    },
  );
  const unknownRelationMember = unknownRelationCreate.body?.client?.family?.find(
    (member) => member.name === `${qaStamp} 未知關係節點`,
  );
  push(
    unknownRelationCreate.status === 201 && unknownRelationMember?.relation === "其他",
    "POST normalizes unsupported relation to explicit UNKNOWN-generation relation",
    `status=${unknownRelationCreate.status} relation=${unknownRelationMember?.relation ?? ""}`,
  );

  const linkedClient = await createClient("linked-client", memberRequestJson, { phone: "0988-771-663" });
  linkedClientId = linkedClient.id;
  linkedClientName = linkedClient.name;
  linkedClientEmail = linkedClient.email;
  linkedClientPhone = linkedClient.phone;
  const readableLinkedMember = linkedClient.id
    ? await createFamilyMember(createdClientId, {
        name: `${qaStamp} 同時是客戶節點`,
        relation: "配偶",
        age: 45,
        linkedClientId: linkedClient.id,
      })
    : { member: null };
  push(
    readableLinkedMember.member?.linkedClientId === linkedClient.id,
    "POST persists readable linkedClientId in returned client DTO",
  );
  linkedMemberName = readableLinkedMember.member?.name ?? "";

  const graphResponse = await memberRequestJson("GET", `/api/clients/${createdClientId}/relationship-graph`);
  const linkedGraphNode = graphResponse.body?.graph?.nodes?.find(
    (node) => node.displayName === readableLinkedMember.member?.name,
  );
  const serializedGraphResponse = JSON.stringify(graphResponse.body ?? {});
  push(graphResponse.status === 200, "GET relationship graph returns linkedClientId review payload", `status=${graphResponse.status}`);
  push(
    linkedGraphNode?.linkedClient?.canNavigate === true && linkedGraphNode?.linkedClient?.href === `/crm/${linkedClient.id}`,
    "relationship graph marks readable linked client as navigable",
  );
  push(
    linkedGraphNode?.fields?.relationshipContext?.value?.includes(linkedClient.name),
    "relationship graph context names readable linked client",
  );
  push(
    graphResponse.body?.edgeShadow?.linkedClientCandidateCount >= 1,
    "edge-shadow BFF summary counts linked client candidates without returning draft edges",
    `linkedClientCandidateCount=${graphResponse.body?.edgeShadow?.linkedClientCandidateCount ?? ""}`,
  );
  push(
    !serializedGraphResponse.includes(linkedClient.email) && !serializedGraphResponse.includes(linkedClient.phone),
    "relationship graph BFF omits linked client email and phone sentinels",
  );

  const managerOwnedClient = await createClient("manager-linked-client", managerRequestJson);
  if (managerOwnedClient.id) {
    const forbiddenLinkedClientCreate = await memberRequestJson(
      "POST",
      `/api/clients/${createdClientId}/family-members`,
      {
        name: `${qaStamp} 無權連結客戶節點`,
        relation: "朋友",
        linkedClientId: managerOwnedClient.id,
      },
    );
    push(
      forbiddenLinkedClientCreate.status === 400 &&
        forbiddenLinkedClientCreate.body?.error === "FAMILY_MEMBER_LINKED_CLIENT_NOT_FOUND",
      "POST rejects unreadable linkedClientId without leaking target ownership",
      `status=${forbiddenLinkedClientCreate.status} error=${forbiddenLinkedClientCreate.body?.error ?? ""}`,
    );
  } else {
    push(false, "POST rejects unreadable linkedClientId without leaking target ownership", "manager client setup failed");
  }

  const rootElder = await createFamilyMember(createdClientId, {
    name: `${qaStamp} 直接父節點`,
    relation: "父",
    age: 72,
  });
  rootElderName = rootElder.member?.name ?? "";

  const parent = await createFamilyMember(createdClientId, {
    name: `${qaStamp} API 父節點`,
    relation: "父",
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
  const browserChild = await createFamilyMember(createdClientId, {
    name: `${qaStamp} UI 待掛子節點`,
    relation: "女",
    age: 16,
  });
  browserParentName = `${qaStamp} UI 新父節點`;
  browserDeleteMemberName = browserDelete.member?.name ?? "";
  browserChildName = browserChild.member?.name ?? "";

  push(Boolean(rootElder.member?.id), "API proof has root elder member id");
  push(Boolean(parent.member?.id), "API proof has parent member id");
  push(Boolean(child.member?.id), "API proof has child member id");
  push(Boolean(browserDelete.member?.id), "API proof has browser-delete member id");
  push(Boolean(browserChild.member?.id), "API proof has browser parent-mode target child id");
  push(!rootElder.member?.parentMemberId, "root elder member stays attached to primary client through graph inference");
  if (!rootElder.member?.id || !parent.member?.id || !child.member?.id || !browserDelete.member?.id || !browserChild.member?.id) return;

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

  const persisted = await memberRequestJson("GET", `/api/clients/${createdClientId}`);
  const persistedRootElder = persisted.body?.client?.family?.find((member) => member.id === rootElder.member.id);
  push(persisted.status === 200, "GET client reload returns relationship graph family state", `status=${persisted.status}`);
  push(Boolean(persistedRootElder) && !persistedRootElder.parentMemberId, "root elder persists without Client.parentMemberId dependency");
}

async function runBrowserProof() {
  if (
    !createdClientId ||
    !browserDeleteMemberName ||
    !browserChildName ||
    !browserParentName ||
    !rootElderName ||
    !linkedMemberName ||
    !linkedClientId ||
    !linkedClientName
  ) {
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
    await page.getByText(rootElderName).first().waitFor({ timeout: 30000 });
    await page.getByText(browserChildName).first().waitFor({ timeout: 30000 });
    await page.getByText(linkedMemberName).first().waitFor({ timeout: 30000 });
    await page.getByText(linkedClientName).first().waitFor({ timeout: 30000 });
    await page.locator('[data-relationship-graph-source="bff"]').waitFor({ timeout: 30000 });
    const deleteButton = page.getByLabel(`刪除 ${browserDeleteMemberName}`);
    await deleteButton.waitFor({ timeout: 30000 });

    const initialGraphChecks = await page.evaluate((expectedNames) => {
      const text = document.body.innerText;
      const linkedAffordances = Array.from(document.querySelectorAll("[data-linked-client-affordance]"));
      const matchingLinkedAffordance = linkedAffordances.find((element) =>
        (element.textContent ?? "").includes(expectedNames.linkedClientName),
      );
      const linkedAnchor =
        matchingLinkedAffordance instanceof HTMLAnchorElement
          ? matchingLinkedAffordance
          : matchingLinkedAffordance?.querySelector("a");
      const graphSourceElement = document.querySelector("[data-relationship-graph-source]");

      return {
        hasRootElder: text.includes(expectedNames.rootElderName),
        hasBrowserChild: text.includes(expectedNames.browserChildName),
        hasLinkedMember: text.includes(expectedNames.linkedMemberName),
        graphSource: graphSourceElement?.getAttribute("data-relationship-graph-source") ?? "",
        graphStatus: graphSourceElement?.getAttribute("data-relationship-graph-status") ?? "",
        hasLinkedClientAffordance: Boolean(matchingLinkedAffordance),
        linkedClientState: matchingLinkedAffordance?.getAttribute("data-linked-client-state") ?? "",
        linkedClientHref: linkedAnchor?.getAttribute("href") ?? "",
        linkedClientPrivateSentinelLeaked:
          text.includes(expectedNames.linkedClientEmail) || text.includes(expectedNames.linkedClientPhone),
        edgeCount: document.querySelectorAll(".react-flow__edge").length,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, {
      rootElderName,
      browserChildName,
      linkedMemberName,
      linkedClientId,
      linkedClientName,
      linkedClientEmail,
      linkedClientPhone,
    });
    push(initialGraphChecks.hasRootElder, "browser renders root-connected elder node");
    push(initialGraphChecks.hasBrowserChild, "browser renders parent-mode target child node");
    push(initialGraphChecks.hasLinkedMember, "browser renders linked-client family member node");
    push(
      initialGraphChecks.graphSource === "bff" && initialGraphChecks.graphStatus === "ready",
      "browser relationship map consumes BFF graph response",
      `source=${initialGraphChecks.graphSource} status=${initialGraphChecks.graphStatus}`,
    );
    push(
      initialGraphChecks.hasLinkedClientAffordance &&
        initialGraphChecks.linkedClientState === "readable" &&
        initialGraphChecks.linkedClientHref === `/crm/${linkedClientId}`,
      "browser renders readable linked-client CRM navigation affordance",
      `href=${initialGraphChecks.linkedClientHref} state=${initialGraphChecks.linkedClientState}`,
    );
    push(
      !initialGraphChecks.linkedClientPrivateSentinelLeaked,
      "browser linked-client affordance omits linked email and phone sentinels",
    );
    push(initialGraphChecks.edgeCount >= 4, "browser graph renders an edge for each root/family relationship", `edges=${initialGraphChecks.edgeCount}`);
    push(!initialGraphChecks.horizontalOverflow, "relationship graph write desktop has no horizontal overflow before parent create");

    const targetNode = page.locator(".react-flow__node").filter({ hasText: browserChildName }).first();
    await targetNode.click();
    await page.getByRole("button", { name: /新增父節點/ }).click();
    await page.getByLabel("姓名").fill(browserParentName);
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "父", exact: true }).click();
    await page.getByLabel(/年齡/).fill("66");
    await page.getByRole("button", { name: "儲存" }).click();
    await page.getByText("關係人已新增").waitFor({ timeout: 30000 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByText(browserParentName).first().waitFor({ timeout: 30000 });
    await page.locator('[data-relationship-graph-source="bff"]').waitFor({ timeout: 30000 });

    const parentCreateChecks = await page.evaluate((expectedNames) => {
      const text = document.body.innerText;
      const rows = Array.from(document.querySelectorAll("div")).map((element) => element.textContent ?? "");
      const graphSourceElement = document.querySelector("[data-relationship-graph-source]");
      return {
        parentVisible: text.includes(expectedNames.browserParentName),
        childLinkedToParent: rows.some((row) =>
          row.includes(expectedNames.browserChildName) && row.includes(`連結至 ${expectedNames.browserParentName}`),
        ),
        graphSource: graphSourceElement?.getAttribute("data-relationship-graph-source") ?? "",
        graphStatus: graphSourceElement?.getAttribute("data-relationship-graph-status") ?? "",
        edgeCount: document.querySelectorAll(".react-flow__edge").length,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, { browserChildName, browserParentName });
    push(parentCreateChecks.parentVisible, "browser parent-mode create persists new parent after reload");
    push(parentCreateChecks.childLinkedToParent, "browser parent-mode create re-parents target child after reload");
    push(
      parentCreateChecks.graphSource === "bff" && parentCreateChecks.graphStatus === "ready",
      "browser relationship map remains BFF-backed after parent create reload",
      `source=${parentCreateChecks.graphSource} status=${parentCreateChecks.graphStatus}`,
    );
    push(parentCreateChecks.edgeCount >= 5, "browser graph still renders parent/child edges after parent create", `edges=${parentCreateChecks.edgeCount}`);
    push(!parentCreateChecks.horizontalOverflow, "relationship graph write desktop has no horizontal overflow after parent create");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-relationship-graph-write-parent-create.png"),
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

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByText(browserParentName).first().waitFor({ timeout: 30000 });
    const mobileChecks = await page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    push(!mobileChecks.horizontalOverflow, "relationship graph write mobile has no horizontal overflow after parent create");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-relationship-graph-write-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

function runSourceProof() {
  const relationshipMapSource = readFileSync("src/components/crm/RelationshipMap.tsx", "utf8");
  const relationshipsPageSource = readFileSync("src/app/(dashboard)/crm/[clientId]/relationships/page.tsx", "utf8");
  push(
    relationshipMapSource.includes('data-linked-client-state="unavailable"') &&
      relationshipMapSource.includes("linkedClient.canNavigate && linkedClient.href"),
    "RelationshipMap source gates unavailable linked-client navigation",
  );
  push(
    relationshipMapSource.includes("graphReview?: ClientRelationshipGraphReview") &&
      relationshipsPageSource.includes("/api/clients/${clientId}/relationship-graph") &&
      relationshipsPageSource.includes("data-relationship-graph-source={graphSource}"),
    "relationship graph page passes BFF graph review into RelationshipMap",
  );
}

async function createClient(label = "client", request = memberRequestJson, overrides = {}) {
  const name = `${qaStamp} ${label} 客戶`;
  const emailLabel = label.replace(/[^a-z0-9]+/gi, "").toLowerCase() || "client";
  const email = `relationship-write-${Date.now()}-${emailLabel}@asai.local`;
  const phone = overrides.phone ?? "0912-771-662";
  const client = await request("POST", "/api/clients", {
    name,
    email,
    phone,
    occupation: "家族企業負責人",
    annualIncome: 5800000,
    status: "ACTIVE",
    ...overrides,
  });
  const id = client.body?.client?.id ?? "";
  push(client.status === 201 && Boolean(id), "POST /api/clients creates graph write QA client", `status=${client.status} client=${id}`);
  return { id, name, email, phone };
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
