#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const managerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const orgAggregateEmail = process.env.DEMO_ORG_AGGREGATE_QA_EMAIL ?? process.env.DEMO_OWNER_QA_EMAIL ?? "demo.owner@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ??
    "docs/06_audits-and-reports/screenshots/ai-meeting/amm-008-cross-state",
);
const runId = Date.now().toString(36);
const rawSentinel = `AMM008_RAW_PROVIDER_SENTINEL_${runId}`;
const qaEmail = `amm008-${runId}@asai.local`;
const qaPhone = `AMM008_CONTACT_SENTINEL_${runId}`;
const checks = [];
const consoleErrors = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY for live provider AMM-008 cross-state QA.");
  process.exit(1);
}

mkdirSync(screenshotDir, { recursive: true });

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runCrossStateProof();
} catch (error) {
  push(false, "AMM-008 cross-state proof crashed", error instanceof Error ? error.message : String(error));
} finally {
  await db.end();
}

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (consoleErrors.length > 0) {
  console.log(`FAIL Console errors — ${consoleErrors.slice(0, 5).join(" | ")}`);
  process.exitCode = 1;
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function runCrossStateProof() {
  const usageBefore = await countAiUsageLogs();
  const meetingUsageBefore = await countOpenAiUsageLogs("MEETING");
  const realtimeUsageBefore = await countOpenAiUsageLogs("INTERVIEW");

  const client = await createClient();
  if (!client.id) return;

  await createRelationshipAndPolicySources(client.id);
  const visitPlanId = await createVisit(client.id);
  if (!visitPlanId) return;

  const priorSessionId = await createPriorMeeting(client.id, visitPlanId);
  if (!priorSessionId) return;

  const workspaceProof = await runWorkspaceProviderSummaryProof(client.id, visitPlanId);
  if (!workspaceProof.sessionId) return;

  await runPersistenceProof(visitPlanId, workspaceProof.sessionId);
  await runWritebackProof(client.id, workspaceProof.sessionId);
  await runProviderMemoryChatProof(client.id, workspaceProof.sessionId);
  await runRealtimeUsageProof(client.id, workspaceProof.sessionId);
  await runPrivacyProof(client, workspaceProof.sessionId);

  const rawScan = await scanRawSentinelStorage();
  push(rawScan.turns === 0, "DB proof stores no blocked raw sentinel in meeting turns", `count=${rawScan.turns}`);
  push(rawScan.memories === 0, "DB proof stores no blocked raw sentinel in meeting memories", `count=${rawScan.memories}`);
  push(rawScan.summaries === 0, "DB proof stores no blocked raw sentinel in meeting summaries", `count=${rawScan.summaries}`);
  push(rawScan.events === 0, "DB proof stores no blocked raw sentinel in writeback events", `count=${rawScan.events}`);

  const meetingUsageAfter = await countOpenAiUsageLogs("MEETING");
  const realtimeUsageAfter = await countOpenAiUsageLogs("INTERVIEW");
  const usageAfter = await countAiUsageLogs();

  push(
    meetingUsageAfter.success >= meetingUsageBefore.success + 2,
    "DB usage proof: provider summary and memory-chat successes write MEETING/OpenAI AiUsageLog",
    `${meetingUsageBefore.success}->${meetingUsageAfter.success}`,
  );
  push(
    meetingUsageAfter.error >= meetingUsageBefore.error + 2,
    "DB usage proof: provider summary and memory-chat errors write MEETING/OpenAI AiUsageLog",
    `${meetingUsageBefore.error}->${meetingUsageAfter.error}`,
  );
  push(
    realtimeUsageAfter.total >= realtimeUsageBefore.total + 1,
    "DB usage proof: realtime provider success/error writes INTERVIEW/OpenAI AiUsageLog",
    `${realtimeUsageBefore.total}->${realtimeUsageAfter.total}`,
  );
  push(
    usageAfter >= usageBefore + 5,
    "DB usage proof: cross-state pack records only real provider/dry-run event usage deltas",
    `${usageBefore}->${usageAfter}`,
  );
}

async function createClient() {
  const response = await requestJson("POST", "/api/clients", {
    name: `AMM-008 Cross-state 客戶 ${runId}`,
    birthDate: "1985-08-08",
    occupation: "資訊長",
    annualIncome: 3200000,
    status: "ACTIVE",
    notes: "AMM-008 cross-state QA client.",
  });

  const client = response.body?.client;
  push(response.status === 201 && typeof client?.id === "string", "member creates AMM-008 client", `status=${response.status}`);

  return {
    id: client?.id ?? "",
    name: client?.name ?? "",
  };
}

async function createRelationshipAndPolicySources(clientId) {
  const family = await requestJson("POST", `/api/clients/${clientId}/family-members`, {
    name: `AMM-008 配偶 ${runId}`,
    relation: "配偶",
    age: 42,
  });
  push(family.status === 201, "member creates relationship graph source", `status=${family.status}`);

  const policy = await requestJson("POST", `/api/clients/${clientId}/policies`, {
    type: "醫療實支",
    provider: `AMM-008 保險公司 ${runId}`,
    amount: 2200000,
  });
  push(policy.status === 201, "member creates policy projection source", `status=${policy.status}`);
}

async function createVisit(clientId) {
  const response = await requestJson("POST", "/api/visits", {
    clientId,
    purpose: "FIRST_VISIT",
    visitTime: new Date(Date.now() + 4 * 86_400_000).toISOString(),
  });

  const visitPlanId = response.body?.visitPlan?.id ?? "";
  push(response.status === 201 && Boolean(visitPlanId), "member creates AMM-008 visit plan", `status=${response.status}`);

  return visitPlanId;
}

async function createPriorMeeting(clientId, visitPlanId) {
  const session = await createMeetingSession(clientId, visitPlanId, `AMM-008 過去會議 ${runId}`);
  const sessionId = session.body?.session?.id;
  push(session.status === 201 && typeof sessionId === "string", "member creates prior meeting session", `status=${session.status}`);
  if (typeof sessionId !== "string") return "";

  const turn = await appendTurn(sessionId, {
    role: "USER",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: `已確認醫療缺口是第一順位，配偶會共同決策；客戶希望先比較兩種保障架構 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "prior-meeting",
    issueTags: ["medical-gap", "spouse-decision"],
  });
  push(turn.status === 201, "prior meeting stores cross-meeting memory source", `status=${turn.status}`);

  const summary = await requestJson("POST", `/api/ai/meeting/sessions/${sessionId}/summary`, {
    mode: "DETERMINISTIC_NO_PROVIDER",
    overwrite: true,
  });
  push(summary.status === 201, "prior meeting deterministic summary persists for memory-chat grounding", `status=${summary.status}`);

  return sessionId;
}

async function runWorkspaceProviderSummaryProof(clientId, visitPlanId) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  attachConsole(page, "workspace-desktop");

  try {
    await page.goto(`${baseUrl}/pre-visit/${visitPlanId}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("button", { name: "AI 會議", exact: true }).click();
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });

    const sessionId = await page.getByTestId("meeting-session-id").getAttribute("data-session-id");
    push(Boolean(sessionId), "pre-visit entrypoint creates/resumes meeting workspace", sessionId ? "session-created" : "missing");
    if (!sessionId) return { sessionId: "" };

    const noteResponse = await appendManualNote(
      page,
      `AMM-008 confirmed：客戶確認先補醫療保障，配偶一起看方案；保費上限每月一萬二 ${runId}`,
    );
    const noteBody = await readPlaywrightJson(noteResponse);
    const noteTurnId = noteBody?.turn?.id;
    push(noteResponse.status() === 201 && typeof noteTurnId === "string", "workspace appends manual note turn", `status=${noteResponse.status()}`);

    const transcriptResponse = await appendFinalTranscript(
      page,
      `AMM-008 transcript：推論客戶擔心方案太難懂，需要用家庭責任圖說明；下次補問是否先排癌症一次金 ${runId}`,
    );
    const transcriptBody = await readPlaywrightJson(transcriptResponse);
    const transcriptTurnId = transcriptBody?.turn?.id;
    push(
      transcriptResponse.status() === 201 && typeof transcriptTurnId === "string",
      "workspace appends final transcript turn",
      `status=${transcriptResponse.status()}`,
    );

    const guardBefore = await countOpenAiUsageLogs("MEETING");
    const quota = await requestJson(
      "POST",
      `/api/ai/meeting/sessions/${sessionId}/summary`,
      {
        mode: "PROVIDER_JSON",
        overwrite: true,
        dryRun: true,
      },
      demoEmail,
      { "x-asai-qa-force-quota-exceeded": "true" },
    );
    const guardAfter = await countOpenAiUsageLogs("MEETING");
    push(quota.status === 429 && quota.body?.safety?.providerCallAttempted === false, "provider summary quota 429 blocks before provider", `status=${quota.status}`);
    push(guardAfter.total === guardBefore.total, "provider summary quota writes no fake AiUsageLog", `${guardBefore.total}->${guardAfter.total}`);

    const providerError = await requestJson(
      "POST",
      `/api/ai/meeting/sessions/${sessionId}/summary`,
      {
        mode: "PROVIDER_JSON",
        overwrite: true,
        dryRun: true,
      },
      demoEmail,
      { "x-asai-qa-force-provider-error": "true" },
    );
    push(providerError.status === 502, "provider summary forced error is sanitized", `status=${providerError.status}`);
    pushNoForbiddenPayload(JSON.stringify(providerError.body), "provider summary error response omits raw/private payload");

    const summary = await requestJson("POST", `/api/ai/meeting/sessions/${sessionId}/summary`, {
      mode: "PROVIDER_JSON",
      overwrite: true,
    });
    const summaryBody = summary.body?.summary;
    push(summary.status === 201, "provider summary succeeds from workspace-created meeting", `status=${summary.status}`);
    push(summaryBody?.provider === "OPENAI" && typeof summaryBody?.usageLogId === "string", "provider summary persists provider/model/usageLogId");
    push(
      citationsOnlyUseKnownTurns(summaryBody?.citations, [noteTurnId, transcriptTurnId]),
      "provider summary citations only use stored workspace turns",
    );
    push(providerItemsHaveCitations(summaryBody), "provider summary decisions/actions/questions retain citations");
    pushNoForbiddenPayload(JSON.stringify(summary.body), "provider summary response has no raw provider/contact/private payload");

    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByTestId("meeting-summary-headline").waitFor({ timeout: 60000 });
    const headline = await page.getByTestId("meeting-summary-headline").innerText();
    push(headline.length > 0, "workspace reload reads persisted provider summary from DB", headline.slice(0, 80));
    push(!(await hasHorizontalOverflow(page)), "workspace desktop has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("workspace-desktop:")).length === 0, "workspace desktop console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-008-cross-state-desktop.png"),
      fullPage: true,
    });

    const dbProof = await getMeetingDbProof(sessionId, clientId, visitPlanId);
    push(dbProof.sessionCount === 1, "DB proof: meeting session is CLIENT_MEETING and visit/client scoped", JSON.stringify(dbProof));
    push(dbProof.summaryProviderRows === 1, "DB proof: provider summary row persists once", JSON.stringify(dbProof));
    push(dbProof.summaryCitationCount >= 2, "DB proof: provider summary stores citations", JSON.stringify(dbProof));
    push(dbProof.rawAudioStoredRows === 0, "DB proof: meeting session metadata stores rawAudioStored=false", JSON.stringify(dbProof));

    return { sessionId };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runPersistenceProof(visitPlanId, sessionId) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  attachConsole(page, "workspace-mobile");

  try {
    await page.goto(`${baseUrl}/pre-visit/${visitPlanId}/meeting?sessionId=${encodeURIComponent(sessionId)}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });
    await page.getByTestId("meeting-summary-headline").waitFor({ timeout: 60000 });

    const reloadedSessionId = await page.getByTestId("meeting-session-id").getAttribute("data-session-id");
    push(reloadedSessionId === sessionId, "new mobile browser context restores same meeting session from DB", `${sessionId}->${reloadedSessionId}`);
    push(!(await hasHorizontalOverflow(page)), "workspace mobile has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("workspace-mobile:")).length === 0, "workspace mobile console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-008-cross-state-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runWritebackProof(clientId, sessionId) {
  const preview = await requestJson("GET", `/api/ai/meeting/sessions/${sessionId}/writebacks`);
  const candidates = Array.isArray(preview.body?.candidates) ? preview.body.candidates : [];
  const selectable = candidates.find((candidate) => !candidate.requiresReason) ?? candidates[0];

  push(preview.status === 200 && preview.body?.status === "ready", "owner reads ready writeback preview from provider summary", `status=${preview.status}`);
  push(candidates.length >= 2, "writeback preview contains multiple candidates", `candidates=${candidates.length}`);

  const managerPreview = await requestJson("GET", `/api/ai/meeting/sessions/${sessionId}/writebacks`, undefined, managerEmail);
  push(managerPreview.status === 404, "manager cannot preview member-private meeting writebacks", `status=${managerPreview.status}`);

  const rawBefore = await countMeetingWritebackEvents(sessionId);
  const rawPayload = await requestJson("POST", `/api/ai/meeting/sessions/${sessionId}/writebacks`, {
    candidateIds: selectable?.id ? [selectable.id] : ["missing"],
    providerPayload: `raw provider payload ${rawSentinel}`,
  });
  const rawAfter = await countMeetingWritebackEvents(sessionId);
  push(rawPayload.status === 409, "raw provider/private writeback payload is blocked", `status=${rawPayload.status}`);
  push(rawBefore === rawAfter, "blocked raw writeback payload creates no events", `${rawBefore}->${rawAfter}`);
  push(!JSON.stringify(rawPayload.body).includes(rawSentinel), "blocked raw writeback response does not echo sentinel");

  if (!selectable?.id) return;

  const approvals = selectable.requiresReason
    ? [
        {
          candidateId: selectable.id,
          reason: "AMM-008 QA：顧問人工確認此候選只進入安全寫回邊界。",
          riskAccepted: true,
        },
      ]
    : [];
  const writeback = await requestJson("POST", `/api/ai/meeting/sessions/${sessionId}/writebacks`, {
    candidateIds: [selectable.id],
    approvals,
  });
  push(writeback.status === 201, "owner confirms one writeback candidate", `status=${writeback.status}`);
  push(
    Array.isArray(writeback.body?.createdEvents) && writeback.body.createdEvents.length >= 1,
    "writeback confirmation creates audit event result",
  );

  const dbProof = await getEventProof(clientId, sessionId);
  push(dbProof.total >= 1, "DB proof: meeting writeback creates interaction event", JSON.stringify(dbProof));
  push(dbProof.confirmedCrmFactWrites === 0, "DB proof: meeting writeback never stores confirmed CRM fact write", JSON.stringify(dbProof));
}

async function runProviderMemoryChatProof(clientId, sessionId) {
  const question = "請結合本次與過去會議，整理醫療保障、配偶決策、下一步與待確認問題。";
  const guardBefore = await countOpenAiUsageLogs("MEETING");

  const quota = await requestJson(
    "POST",
    `/api/ai/meeting/sessions/${sessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-quota-exceeded": "true" },
  );
  const guardAfter = await countOpenAiUsageLogs("MEETING");
  push(quota.status === 429 && quota.body?.safety?.providerCallAttempted === false, "provider memory-chat quota 429 blocks before provider", `status=${quota.status}`);
  push(guardAfter.total === guardBefore.total, "provider memory-chat quota writes no fake AiUsageLog", `${guardBefore.total}->${guardAfter.total}`);

  const providerError = await requestJson(
    "POST",
    `/api/ai/meeting/sessions/${sessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-provider-error": "true" },
  );
  push(providerError.status === 502, "provider memory-chat forced error is sanitized", `status=${providerError.status}`);
  pushNoForbiddenPayload(JSON.stringify(providerError.body), "provider memory-chat error response omits raw/private payload");

  const sessionChat = await requestJson("POST", `/api/ai/meeting/sessions/${sessionId}/chat`, {
    mode: "PROVIDER_JSON",
    question,
  });
  push(sessionChat.status === 200 && sessionChat.body?.status === "answered", "provider session memory-chat succeeds", `status=${sessionChat.status}`);
  push(typeof sessionChat.body?.usageLogId === "string", "provider session memory-chat returns usageLogId");
  push(providerAnswerHasCitations(sessionChat.body?.answer), "provider session memory-chat keeps cited facts/inferences/unknowns");
  push((sessionChat.body?.answer?.sourceBreakdown?.MEETING_SUMMARY ?? 0) > 0, "provider session memory-chat cites prior/current meeting summaries");
  pushNoForbiddenPayload(JSON.stringify(sessionChat.body), "provider session memory-chat response has no contact/policy/raw leakage");

  const clientProfileQuestion = "請根據 CRM 客戶檔案說明這位客戶的職業、年收入、狀態與敏感度，並說明這如何影響會議準備。";
  const clientChat = await requestJson("POST", `/api/ai/clients/${clientId}/memory-chat`, {
    mode: "PROVIDER_JSON",
    question: clientProfileQuestion,
  });
  push(clientChat.status === 200 && clientChat.body?.status === "answered", "provider client memory-chat succeeds", `status=${clientChat.status}`);
  push((clientChat.body?.answer?.sourceBreakdown?.CRM_CLIENT ?? 0) > 0, "provider client memory-chat includes CRM projection");
  pushNoForbiddenPayload(JSON.stringify(clientChat.body), "provider client memory-chat response has no contact/policy/raw leakage");

  const managerChat = await requestJson(
    "POST",
    `/api/ai/meeting/sessions/${sessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question,
    },
    managerEmail,
  );
  push(managerChat.status === 404, "manager cannot run provider chat on member-private meeting", `status=${managerChat.status}`);
}

async function runRealtimeUsageProof(clientId, sessionId) {
  const quotaBefore = await countOpenAiUsageLogs("INTERVIEW");
  const quota = await requestJson(
    "POST",
    "/api/ai/interview/realtime-session",
    {
      clientId,
      sessionId,
      currentSegmentId: "amm-008-live-capture",
      interviewKind: "CLIENT_MEETING",
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-quota-exceeded": "true" },
  );
  const quotaAfter = await countOpenAiUsageLogs("INTERVIEW");
  push(quota.status === 429, "realtime quota 429 blocks before provider", `status=${quota.status}`);
  push(quotaAfter.total === quotaBefore.total, "realtime quota writes no fake OPENAI AiUsageLog", `${quotaBefore.total}->${quotaAfter.total}`);

  const realtime = await requestJson("POST", "/api/ai/interview/realtime-session", {
    clientId,
    sessionId,
    currentSegmentId: "amm-008-live-capture",
    interviewKind: "CLIENT_MEETING",
  });
  const succeeded = realtime.status === 200 && realtime.body?.provider === "OPENAI";
  const failedWithProviderLog = realtime.status === 502 && realtime.body?.error === "REALTIME_PROVIDER_ERROR";
  push(succeeded || failedWithProviderLog, "realtime provider path returns success or sanitized provider error", `status=${realtime.status}`);

  if (succeeded) {
    push(realtime.body?.usageLogged === true, "realtime provider success declares usageLogged=true");
    push(realtime.body?.rawAudioStored === false, "realtime provider success declares rawAudioStored=false");
    push(typeof realtime.body?.clientSecret?.value === "string", "realtime provider success returns short-lived client secret to browser only");
    push(!JSON.stringify(realtime.body).includes(process.env.OPENAI_API_KEY ?? "sk-should-not-match"), "realtime response does not expose server API key");
    push(!/sk-[A-Za-z0-9_-]{12,}/.test(JSON.stringify(realtime.body)), "realtime response does not expose server key-like value");
  }

  const rawEvent = await requestJson("POST", "/api/ai/interview/realtime-events", {
    type: "FINAL_TRANSCRIPT",
    sessionId,
    clientId,
    interviewKind: "CLIENT_MEETING",
    text: `raw audio should be blocked ${rawSentinel}`,
    audioBase64: "AAAA",
  });
  push(rawEvent.status === 400 && rawEvent.body?.rawAudioStored === false, "realtime event raw audio payload is rejected", `status=${rawEvent.status}`);
  push(!JSON.stringify(rawEvent.body).includes(rawSentinel), "blocked realtime event response does not echo raw sentinel");
}

async function runPrivacyProof(client, sessionId) {
  const overview = await requestJson("GET", "/api/org/overview", undefined, orgAggregateEmail);
  const overviewText = JSON.stringify(overview.body);
  const forbidden = [
    client.name,
    qaEmail,
    qaPhone,
    rawSentinel,
    runId,
    "AMM-008 confirmed",
    "AMM-008 transcript",
  ].filter(Boolean);
  const leaked = forbidden.filter((item) => overviewText.includes(item));

  push(overview.status === 200, "manager org overview returns aggregate response", `status=${overview.status}`);
  push(leaked.length === 0, "manager org overview does not expose meeting/client detail sentinels", leaked.length ? `leaked=${leaked.join(",")}` : "");

  const managerSnapshot = await requestJson("GET", `/api/ai/meeting/sessions/${sessionId}`, undefined, managerEmail);
  push(managerSnapshot.status === 404, "manager cannot read member-private meeting snapshot", `status=${managerSnapshot.status}`);
}

async function createMeetingSession(clientId, visitPlanId, title) {
  return requestJson("POST", "/api/ai/meeting/sessions", {
    clientId,
    visitPlanId,
    currentSegmentId: "capture",
    title,
  });
}

async function appendTurn(sessionId, body) {
  return requestJson("POST", `/api/ai/meeting/sessions/${sessionId}/turns`, body);
}

async function appendManualNote(page, text) {
  await page.getByRole("tab", { name: "隨筆" }).click();
  await page.getByTestId("meeting-note-input").fill(text);
  const responsePromise = waitForMeetingTurnResponse(page);
  await page.getByRole("button", { name: "加入筆記" }).click();
  return responsePromise;
}

async function appendFinalTranscript(page, text) {
  await page.getByRole("tab", { name: "會議" }).click();
  await page.getByTestId("meeting-transcript-input").fill(text);
  const responsePromise = waitForMeetingTurnResponse(page);
  await page.getByRole("button", { name: "加入 final transcript" }).click();
  return responsePromise;
}

async function waitForMeetingTurnResponse(page) {
  return page.waitForResponse(
    (response) => response.url().includes("/api/ai/meeting/sessions/") && response.url().endsWith("/turns"),
    { timeout: 60000 },
  );
}

async function requestJson(method, path, body, email = demoEmail, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(email ? { "x-asai-demo-user-email": email } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const text = await response.text();
  let parsedBody;

  try {
    parsedBody = JSON.parse(text);
  } catch {
    parsedBody = undefined;
  }

  return { status: response.status, body: parsedBody, text };
}

async function readPlaywrightJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getMeetingDbProof(sessionId, clientId, visitPlanId) {
  const result = await db.query(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM interview_sessions
          WHERE id = $1
            AND client_id = $2
            AND interview_kind::text = 'CLIENT_MEETING'
            AND metadata->>'visitPlanId' = $3
        ) AS session_count,
        (
          SELECT COUNT(*)::int
          FROM interview_meeting_summaries
          WHERE session_id = $1
            AND provider = 'OPENAI'
            AND generated_by = 'provider-json'
            AND usage_log_id IS NOT NULL
        ) AS summary_provider_rows,
        (
          SELECT COALESCE(MAX(jsonb_array_length(citations::jsonb)), 0)::int
          FROM interview_meeting_summaries
          WHERE session_id = $1
        ) AS summary_citation_count,
        (
          SELECT COUNT(*)::int
          FROM interview_sessions
          WHERE id = $1
            AND COALESCE(metadata->>'rawAudioStored', 'false') != 'false'
        ) AS raw_audio_stored_rows
    `,
    [sessionId, clientId, visitPlanId],
  );
  const row = result.rows[0] ?? {};

  return {
    sessionCount: Number(row.session_count ?? 0),
    summaryProviderRows: Number(row.summary_provider_rows ?? 0),
    summaryCitationCount: Number(row.summary_citation_count ?? 0),
    rawAudioStoredRows: Number(row.raw_audio_stored_rows ?? 0),
  };
}

async function getEventProof(clientId, sessionId) {
  const result = await db.query(
    `SELECT
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
      )::int AS total,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'writesConfirmedCrmFact' != 'false'
      )::int AS confirmed_crm_fact_writes
     FROM interaction_events
     WHERE client_id = $1`,
    [clientId, sessionId],
  );
  const row = result.rows[0] ?? {};

  return {
    total: Number(row.total ?? 0),
    confirmedCrmFactWrites: Number(row.confirmed_crm_fact_writes ?? 0),
  };
}

async function countMeetingWritebackEvents(sessionId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM interaction_events
     WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
       AND metadata->>'sessionId' = $1`,
    [sessionId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function scanRawSentinelStorage() {
  const needle = `%${rawSentinel}%`;
  const result = await db.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM interview_turns WHERE content ILIKE $1 OR metadata::text ILIKE $1) AS turns,
        (SELECT COUNT(*)::int FROM interview_memories WHERE text ILIKE $1 OR COALESCE(evidence_text, '') ILIKE $1) AS memories,
        (SELECT COUNT(*)::int FROM interview_meeting_summaries WHERE summary ILIKE $1 OR headline ILIKE $1 OR decisions::text ILIKE $1 OR action_items::text ILIKE $1 OR open_questions::text ILIKE $1 OR citations::text ILIKE $1 OR COALESCE(guard_evidence::text, '') ILIKE $1) AS summaries,
        (SELECT COUNT(*)::int FROM interaction_events WHERE metadata::text ILIKE $1 OR description ILIKE $1 OR title ILIKE $1) AS events
    `,
    [needle],
  );
  const row = result.rows[0] ?? {};

  return {
    turns: Number(row.turns ?? 0),
    memories: Number(row.memories ?? 0),
    summaries: Number(row.summaries ?? 0),
    events: Number(row.events ?? 0),
  };
}

async function countAiUsageLogs() {
  const result = await db.query(`SELECT COUNT(*)::int AS count FROM ai_usage_logs`);
  return Number(result.rows[0]?.count ?? 0);
}

async function countOpenAiUsageLogs(module) {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE error IS NULL)::int AS success,
       COUNT(*) FILTER (WHERE error IS NOT NULL)::int AS error
     FROM ai_usage_logs
     WHERE module = $1
       AND provider = 'OPENAI'`,
    [module],
  );
  const row = result.rows[0] ?? {};

  return {
    total: Number(row.total ?? 0),
    success: Number(row.success ?? 0),
    error: Number(row.error ?? 0),
  };
}

function citationsOnlyUseKnownTurns(citations, knownTurnIds) {
  const known = new Set(knownTurnIds.filter(Boolean));
  return Array.isArray(citations) && citations.length > 0 && citations.every((citation) => known.has(citation.turnId));
}

function providerItemsHaveCitations(summary) {
  if (!summary) return false;

  const items = [
    ...(Array.isArray(summary.decisions) ? summary.decisions : []),
    ...(Array.isArray(summary.actionItems) ? summary.actionItems : []),
    ...(Array.isArray(summary.openQuestions) ? summary.openQuestions : []),
  ];

  return items.length > 0 && items.every((item) => Array.isArray(item.citations) && item.citations.length > 0);
}

function providerAnswerHasCitations(answer) {
  if (!answer) return false;

  const buckets = [
    ...(Array.isArray(answer.facts) ? answer.facts : []),
    ...(Array.isArray(answer.inferences) ? answer.inferences : []),
    ...(Array.isArray(answer.unknowns) ? answer.unknowns : []),
  ];
  const citationIds = new Set((Array.isArray(answer.citations) ? answer.citations : []).map((citation) => citation.id));

  return (
    buckets.length >= 3 &&
    buckets.every((item) => Array.isArray(item.citationIds) && item.citationIds.length > 0 && item.citationIds.every((id) => citationIds.has(id)))
  );
}

function pushNoForbiddenPayload(serialized, label) {
  const forbidden = [
    rawSentinel,
    qaEmail,
    qaPhone,
    "policyNumber",
    "保單號",
    "raw provider payload",
    "provider payload",
    "raw audio",
    "authorization bearer",
    '"providerPayload":',
    '"rawProviderPayload":',
    '"audioBase64":',
    '"cookie":',
    '"otp":',
    '"payment":',
  ];
  const leaked = forbidden.filter((item) => serialized.includes(item));
  push(leaked.length === 0, label, leaked.length > 0 ? `leaked=${leaked.join(",")}` : "");
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  } catch {
    return chromium.launch();
  }
}

function attachConsole(page, scope) {
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") {
      consoleErrors.push(`${scope}: ${text}`);
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(`${scope}: ${error.message}`));
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}
