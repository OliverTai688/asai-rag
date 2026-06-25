#!/usr/bin/env node
import { readFileSync } from "node:fs";

const source = readFileSync("scripts/lv3-cross-flow-no-provider-qa.mjs", "utf8");
const checks = [];

function push(condition, label, detail = "") {
  checks.push({ ok: condition, label, detail });
}

function includesAll(label, fragments) {
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  push(missing.length === 0, label, missing.length === 0 ? `${fragments.length} fragments verified` : `missing: ${missing.join(", ")}`);
}

includesAll("cross-flow harness defaults away from shared localhost:3000", [
  "LV3_CROSS_FLOW_DEFAULT_PORT",
  "3085",
  "http://127.0.0.1",
]);

includesAll("cross-flow harness verifies ASAI public-status signature", [
  "probeAsaiPublicStatus",
  "body.version === \"asai.public_status.v1\"",
  "\"aiAvailability\" in body",
  "\"checkoutAvailability\" in body",
  "\"legalStatus\" in body",
]);

includesAll("cross-flow harness warms app before proof pack", [
  "warmAsaiApp",
  "ASAI app root warmup attempted before proof pack",
  "ASAI public status signature verified after warmup",
]);

includesAll("cross-flow harness reuses existing ASAI dev server before spawning another Next dev", [
  "findReachableAsaiBaseUrl",
  "existing ASAI dev server discovered before spawning new proof server",
  "http://127.0.0.1:3000",
]);

includesAll("cross-flow harness avoids wrong-app occupied default port", [
  "default proof base URL occupied by non-ASAI app; using free ASAI proof port",
  "findAvailableBaseUrl",
  "canBindPort",
]);

includesAll("cross-flow harness fails explicit non-ASAI base URL instead of masking it", [
  "baseUrlExplicit",
  "Configured ASAI proof base URL is reachable but failed the public-status signature check",
]);

includesAll("cross-flow harness exposes preflight-only runtime proof mode", [
  "LV3_CROSS_FLOW_PREFLIGHT_ONLY",
  "preflightOnly",
  "LV3 cross-flow preflight-only proof completed",
]);

includesAll("cross-flow harness preserves no-provider AiUsageLog unchanged check", [
  "countAiUsageLogs",
  "proof pack writes no new AiUsageLog",
  "AiUsageLog count check skipped",
]);

for (const check of checks) {
  const status = check.ok ? "PASS" : "FAIL";
  console.log(`${status} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
