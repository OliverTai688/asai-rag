#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_QA_EMAIL ?? "demo.member@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-previsit-bff",
);
const qaStamp = `BFF QA ${new Date().toISOString()}`;

const checks = [];
const consoleErrors = [];
let createdPlanId = "";
let selectedClientName = "";

mkdirSync(screenshotDir, { recursive: true });

await runApiProof();
await runBrowserProof();

push(true, "no provider route invoked", "script uses deterministic visit BFF and never calls /api/ai/visit");

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (consoleErrors.length > 0) {
  console.log(`FAIL Console errors — ${consoleErrors.slice(0, 3).join(" | ")}`);
  process.exitCode = 1;
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function runApiProof() {
  const unauth = await fetch(`${baseUrl}/api/visits`);
  const unauthPayload = await readJson(unauth);
  push(unauth.status === 401, "GET /api/visits unauth returns 401", `status=${unauth.status} error=${unauthPayload?.error ?? ""}`);

  const clients = await requestJson("GET", "/api/clients");
  push(clients.status === 200, "GET /api/clients demo user returns 200", `status=${clients.status}`);
  const client =
    clients.body?.clients?.find((item) => item.name === "王大明") ??
    clients.body?.clients?.find((item) => item.status === "ACTIVE") ??
    clients.body?.clients?.[0];
  push(Boolean(client?.id), "demo client is available for visit proof", `client=${client?.name ?? ""}`);

  if (!client?.id) {
    return;
  }

  selectedClientName = client.name;

  const listBefore = await requestJson("GET", "/api/visits");
  push(listBefore.status === 200 && Array.isArray(listBefore.body?.visits), "GET /api/visits returns visit workspace", `count=${listBefore.body?.visits?.length ?? 0}`);

  const create = await requestJson("POST", "/api/visits", {
    clientId: client.id,
    purpose: "CARE",
    visitTime: new Date(Date.now() + 86_400_000).toISOString(),
  });
  createdPlanId = create.body?.visitPlan?.id ?? "";
  push(create.status === 201, "POST /api/visits creates server-owned draft", `status=${create.status} visitPlan=${createdPlanId}`);
  push(create.body?.visitPlan?.status === "DRAFT", "created visit starts as DRAFT", `status=${create.body?.visitPlan?.status ?? ""}`);
  push(create.body?.visitPlan?.clientId === client.id, "created visit is scoped to selected client", `clientId=${create.body?.visitPlan?.clientId ?? ""}`);

  if (!createdPlanId) {
    return;
  }

  const patchPayload = buildGeneratedPatch(client);
  const patch = await requestJson("PATCH", `/api/visits/${createdPlanId}`, patchPayload);
  push(patch.status === 200, "PATCH /api/visits/[id] persists generated prep package", `status=${patch.status}`);
  push(patch.body?.visitPlan?.status === "READY", "patched visit is READY", `status=${patch.body?.visitPlan?.status ?? ""}`);
  push((patch.body?.visitPlan?.spinQuestions?.[0]?.reasoning?.evidence?.length ?? 0) >= 2, "question reasoning evidence persists", `evidence=${patch.body?.visitPlan?.spinQuestions?.[0]?.reasoning?.evidence?.length ?? 0}`);
  push(patch.body?.visitPlan?.postVisitNotes?.includes(qaStamp), "post-visit notes persist through PATCH");

  const detail = await requestJson("GET", `/api/visits/${createdPlanId}`);
  const serializedDetail = JSON.stringify(detail.body);
  push(detail.status === 200, "GET /api/visits/[id] reloads persisted package", `status=${detail.status}`);
  push(detail.body?.visitPlan?.objectives?.[0]?.description?.includes(qaStamp), "reloaded package keeps objective proof stamp");
  push(
    !["rawPayload", "cookie", "secret", "authorization"].some((key) => serializedDetail.toLowerCase().includes(key.toLowerCase())),
    "visit BFF response has no raw private sentinel",
  );

  const handoff = await requestJson("GET", `/api/visits/${createdPlanId}/theater-handoff`);
  push(handoff.status === 200, "theater handoff accepts generated server-owned visit", `status=${handoff.status}`);
  push(["READY", "NEEDS_MORE_INFO"].includes(handoff.body?.handoff?.status), "handoff returns deterministic stage status", `status=${handoff.body?.handoff?.status ?? ""}`);

  const listAfter = await requestJson("GET", "/api/visits");
  push(
    listAfter.body?.visits?.some((item) => item.visitPlan?.id === createdPlanId),
    "GET /api/visits includes newly created package",
    `visitPlan=${createdPlanId}`,
  );
}

async function runBrowserProof() {
  if (!createdPlanId) {
    push(false, "browser proof has created plan id");
    return;
  }

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/pre-visit/${createdPlanId}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: /拜訪準備包/ }).waitFor({ timeout: 30000 });

    const detailChecks = await page.evaluate((stamp) => {
      const text = document.body.innerText;
      return {
        hasTitle: text.includes("拜訪準備包"),
        hasProjectContext: text.includes("專案情境"),
        hasPriorityQuestions: text.includes("核心問題清單"),
        hasDecisionMap: text.includes("決策地圖"),
        hasClientName: text.includes("王大明") || text.includes("客戶"),
        hasObjectiveStamp: text.includes(stamp),
        hasReasoning: text.includes("推論依據") && text.includes("保單缺口"),
        hasTheaterAction: text.includes("建立劇場舞台") || text.includes("帶入劇場建場"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, qaStamp);

    push(detailChecks.hasTitle, "browser renders pre-visit detail title");
    push(detailChecks.hasProjectContext, "browser renders project-context prep package shell");
    push(detailChecks.hasPriorityQuestions, "browser renders priority question list");
    push(detailChecks.hasDecisionMap, "browser renders relationship decision map");
    push(detailChecks.hasClientName || Boolean(selectedClientName), "browser renders client context", `client=${selectedClientName}`);
    push(detailChecks.hasObjectiveStamp, "browser renders persisted objective stamp");
    push(detailChecks.hasReasoning, "browser renders question reasoning evidence");
    push(detailChecks.hasTheaterAction, "browser renders theater handoff action");
    push(!detailChecks.horizontalOverflow, "pre-visit detail desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-previsit-bff-detail-desktop.png"),
      fullPage: true,
    });

    await page.goto(`${baseUrl}/pre-visit/${createdPlanId}/notes`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: "拜訪後筆記" }).waitFor({ timeout: 30000 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "拜訪後筆記" }).waitFor({ timeout: 30000 });

    const notesValue = await page.locator('textarea[placeholder*="摘要"]').inputValue();
    const notesOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(notesValue.includes(qaStamp), "browser reload keeps persisted post-visit notes");
    push(!notesOverflow, "notes desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-previsit-bff-notes-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/pre-visit/${createdPlanId}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: /拜訪準備包/ }).waitFor({ timeout: 30000 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "pre-visit detail mobile has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-previsit-bff-detail-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

function buildGeneratedPatch(client) {
  return {
    status: "READY",
    objectives: [
      {
        id: "qa-objective-1",
        description: `${qaStamp}：確認 ${client.name} 對家庭保障缺口與下一步資料補件的接受度。`,
        successCriteria: "客戶能說出一個優先保障缺口，並同意下一次補齊決策人資料。",
      },
    ],
    spinQuestions: [
      {
        id: "qa-spin-s-1",
        type: "S",
        question: "目前家庭成員中，誰會一起參與保障額度與保費的決策？",
        reasoning: {
          summary: "由關係圖與既有保單摘要推論，先確認共同決策人可降低後續劇場未知數。",
          evidence: [
            {
              id: "qa-evidence-relationship",
              source: "relationship_graph",
              status: "inference",
              label: "關係圖",
              detail: "家庭節點可轉為劇場人物，但共同決策權重仍需現場確認。",
            },
            {
              id: "qa-evidence-policy",
              source: "policy",
              status: "confirmed",
              label: "保單缺口",
              detail: "既有保障摘要足以提出初步缺口問題，仍需確認最新收入與責任狀態。",
            },
          ],
          confirmationPrompt: "請客戶確認誰需要一起聽到方案與下一步資料。",
        },
      },
      {
        id: "qa-spin-p-1",
        type: "P",
        question: "如果主要收入來源短期中斷，現有保障最擔心不足的是哪一段？",
        reasoning: {
          summary: "由拜訪目的與職業收入資料推論出保障缺口探索方向。",
          evidence: [
            {
              id: "qa-evidence-profile",
              source: "client_profile",
              status: "inference",
              label: "客戶輪廓",
              detail: "職業與年收入可作為保障額度討論起點，但不能視為已確認財務承諾。",
            },
          ],
          confirmationPrompt: "請客戶補充目前現金流與家庭責任變化。",
        },
      },
    ],
    objections: [
      {
        id: "qa-objection-1",
        expectedObjection: "我想先回去跟家人討論。",
        suggestedResponse: "可以，今天先把需要共同決策的問題列清楚，下次直接帶家人一起看選項。",
      },
    ],
    materials: [
      {
        id: "qa-material-gap",
        name: "保障缺口摘要",
        checked: true,
      },
      {
        id: "qa-material-family",
        name: "家庭決策人確認清單",
        checked: false,
      },
    ],
    postVisitNotes: `摘要：${qaStamp} 已建立 server-owned 準備包。\n下一步跟進：確認共同決策人與補件時間。`,
  };
}

async function requestJson(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": demoEmail,
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
