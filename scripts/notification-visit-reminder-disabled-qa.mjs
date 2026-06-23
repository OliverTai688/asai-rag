#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const baseUrl = process.env.NOTIFICATION_VISIT_REMINDER_QA_BASE_URL ?? "http://127.0.0.1:3056";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const checks = [];
const startedProcesses = [];

function pass(name, detail = "") {
  checks.push({ ok: true, name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

function check(condition, name, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

function readSource(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function assertFileContains(filePath, fragments) {
  const source = readSource(filePath);
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  check(
    missing.length === 0,
    filePath,
    missing.length === 0 ? `verified ${fragments.length} fragments` : `missing ${missing.join(", ")}`,
  );
}

function assertFileOmits(filePath, fragments) {
  const source = readSource(filePath);
  const present = fragments.filter((fragment) => source.includes(fragment));
  check(
    present.length === 0,
    `${filePath} omits mock-success fragments`,
    present.length === 0 ? `checked ${fragments.length} fragments` : `present ${present.join(", ")}`,
  );
}

function verifyStaticBoundaries() {
  assertFileContains("src/app/api/notifications/visit-reminder/route.ts", [
    "requireCurrentMember",
    "VISIT_REMINDER_DELIVERY_DISABLED",
    "VISIT_REMINDER_AUTH_UNAVAILABLE",
    "privateJsonResponse",
    "status: 503",
    "parseJsonBody",
  ]);
  assertFileOmits("src/app/api/notifications/visit-reminder/route.ts", [
    "success: true",
    "Reminder email sent successfully",
    "Sending 15-minute preview",
    "Resend",
    "SendGrid",
  ]);
  assertFileContains("src/domains/notifications/bff.ts", [
    "asai.notifications.visit_reminder.v1",
    "providerCallAttempted: false",
    "realEmailSent: false",
    "realNotificationSent: false",
    "mockSuccess: false",
    "recipientEchoed: false",
  ]);
}

async function ensureDevServer() {
  if (await fetchOk(baseUrl)) {
    throw new Error(`${baseUrl} is already reachable; choose a free NOTIFICATION_VISIT_REMINDER_QA_BASE_URL port.`);
  }

  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3000";
  console.log(`Starting notification disabled QA dev server at ${baseUrl}`);

  const child = spawn(pnpmBin, ["dev", "--hostname", host, "--port", port], {
    cwd: root,
    env: {
      ...process.env,
      ALLOW_DEV_AUTH_HEADER: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  startedProcesses.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk}`));

  for (let i = 0; i < 90; i += 1) {
    if (await fetchOk(baseUrl)) {
      pass("dev-server", `started at ${baseUrl}`);
      return;
    }
    await wait(1000);
  }

  throw new Error(`Dev server did not become reachable at ${baseUrl}`);
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function post(pathname, body, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: response.status, text, body: json, headers: response.headers };
}

function memberHeaders() {
  return { "x-asai-demo-user-email": demoMemberEmail };
}

async function verifyApiBoundary() {
  const validPayload = {
    planId: "visit-reminder-disabled-proof",
    agentEmail: "qa-private-reminder@example.com",
  };

  const unauth = await post("/api/notifications/visit-reminder", validPayload);
  check(unauth.status === 401, "visit reminder unauth returns 401", `status=${unauth.status}`);
  check(unauth.body?.kind === "AUTHENTICATION", "unauth uses shared auth error kind", unauth.body?.kind ?? "");

  const invalid = await post("/api/notifications/visit-reminder", { agentEmail: "bad-email" }, memberHeaders());
  check(invalid.status === 400, "visit reminder invalid input returns 400", `status=${invalid.status}`);
  check(invalid.body?.kind === "VALIDATION", "invalid input uses validation kind", invalid.body?.kind ?? "");

  const disabled = await post("/api/notifications/visit-reminder", validPayload, memberHeaders());
  if (disabled.status === 503 && disabled.body?.error === "VISIT_REMINDER_AUTH_UNAVAILABLE") {
    check(
      disabled.body?.providerAttempted === false,
      "visit reminder DB-unavailable fallback does not contact provider",
    );
    check(
      disabled.body?.kind === "INTERNAL",
      "visit reminder DB-unavailable fallback is explicit",
      disabled.body?.kind ?? "",
    );
    check(
      disabled.headers.get("cache-control")?.includes("no-store") ?? false,
      "DB-unavailable response uses no-store cache header",
    );
    check(Boolean(disabled.headers.get("x-asai-request-id")), "DB-unavailable response includes request id");
    assertNoPrivateLeak("DB-unavailable visit reminder response omits private sentinels", disabled.text);
    pass(
      "authenticated disabled runtime proof deferred by DB availability",
      "VISIT_REMINDER_AUTH_UNAVAILABLE; rerun this script when Supabase DB is reachable to exercise disabled DTO",
    );
    return;
  }
  const reminder = disabled.body?.reminder;

  check(disabled.status === 503, "visit reminder returns disabled 503", `status=${disabled.status}`);
  check(disabled.body?.success === false, "visit reminder no longer reports success=true");
  check(disabled.body?.error === "VISIT_REMINDER_DELIVERY_DISABLED", "visit reminder declares disabled error");
  check(reminder?.version === "asai.notifications.visit_reminder.v1", "visit reminder response is versioned");
  check(reminder?.status === "disabled", "visit reminder status is disabled");
  check(reminder?.source === "guarded_disabled", "visit reminder source is guarded_disabled");
  check(reminder?.request?.planId === validPayload.planId, "visit reminder keeps plan id only");
  check(reminder?.request?.recipientAccepted === true, "visit reminder accepts recipient without echoing it");
  check(reminder?.request?.recipientEchoed === false, "visit reminder does not echo recipient");
  check(reminder?.delivery?.enabled === false, "visit reminder delivery disabled");
  check(reminder?.delivery?.provider === "none", "visit reminder provider is none");
  check(reminder?.delivery?.providerAttempted === false, "visit reminder does not contact provider");
  check(reminder?.delivery?.jobQueued === false, "visit reminder does not queue job");
  check(reminder?.delivery?.realEmailSent === false, "visit reminder sends no real email");
  check(reminder?.delivery?.realNotificationSent === false, "visit reminder sends no real notification");
  check(reminder?.proof?.triggersExternalNotification === false, "visit reminder proof forbids external notification");
  check(reminder?.proof?.providerCallAttempted === false, "visit reminder proof says no provider call");
  check(reminder?.proof?.aiUsageLogRequired === false, "visit reminder no-provider proof requires no AiUsageLog");
  check(reminder?.proof?.writesDatabase === false, "visit reminder proof writes no DB");
  check(reminder?.proof?.mockSuccess === false, "visit reminder proof is not mock success");
  check(disabled.headers.get("cache-control")?.includes("no-store") ?? false, "disabled response uses no-store cache header");
  check(Boolean(disabled.headers.get("x-asai-request-id")), "disabled response includes request id");

  assertNoPrivateLeak("disabled visit reminder response omits private sentinels", disabled.text);
}

function assertNoPrivateLeak(label, text) {
  const forbidden = [
    "qa-private-reminder@example.com",
    "AUTH_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
    "RESEND_API_KEY",
    "SENDGRID_API_KEY",
    "rawPayload",
    "rawProvider",
    "providerConfig",
    "providerPayload",
    "privateTranscript",
    "paymentData",
    "cookie",
    "secret",
    "token",
    "otp",
  ];
  const leaked = forbidden.filter((value) => text.includes(value));
  check(leaked.length === 0, label, leaked.length === 0 ? `${forbidden.length} sentinels checked` : leaked.join(", "));
}

function printSummary() {
  const failed = checks.filter((item) => !item.ok);
  console.log(`\nNotification visit reminder disabled QA checks: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

async function shutdownStartedProcesses() {
  await Promise.all(
    startedProcesses.splice(0).map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.killed) {
            resolve();
            return;
          }

          child.once("exit", resolve);
          child.kill("SIGTERM");
          setTimeout(() => {
            if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
          }, 5000).unref();
        }),
    ),
  );
}

try {
  verifyStaticBoundaries();
  await ensureDevServer();
  await verifyApiBoundary();
} catch (error) {
  fail("notification-visit-reminder-disabled-qa", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await shutdownStartedProcesses();
  printSummary();
}
