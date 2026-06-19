#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.PUBLIC_PRICING_QA_BASE_URL ?? process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new Client({ connectionString: dbUrl });
await db.connect();

try {
  const dbPlans = await getDbPlanConfigs();
  const response = await get("/api/public/pricing");
  const text = JSON.stringify(response.body);

  push(response.status === 200, "GET /api/public/pricing returns 200", `status=${response.status}`);
  push(Array.isArray(response.body?.plans), "Pricing DTO includes plans array");
  push(response.body?.plans?.length === 4, "Pricing DTO returns four public plans", `count=${response.body?.plans?.length ?? 0}`);
  push(response.body?.source === "database", "Pricing DTO reads DB-backed PlanConfig", `source=${response.body?.source ?? "missing"}`);
  push(response.body?.billing?.provider === "ECPAY", "Pricing DTO exposes ECPay provider", response.body?.billing?.provider ?? "missing");
  push(response.body?.billing?.checkoutEnabled === false, "Pricing DTO keeps checkout disabled until payment proof", String(response.body?.billing?.checkoutEnabled));

  for (const plan of ["FREE", "STARTER", "PRO", "ENTERPRISE"]) {
    const apiPlan = response.body?.plans?.find((item) => item.id === plan);
    const dbPlan = dbPlans.get(plan);

    push(Boolean(apiPlan), `${plan} exists in pricing DTO`);
    push(Boolean(dbPlan), `${plan} exists in plan_configs table`);

    if (apiPlan && dbPlan) {
      push(apiPlan.capabilities.maxMembers === dbPlan.max_members, `${plan} maxMembers matches DB`, `${apiPlan.capabilities.maxMembers}/${dbPlan.max_members}`);
      push(apiPlan.capabilities.maxCollaborators === dbPlan.max_collaborators, `${plan} maxCollaborators matches DB`, `${apiPlan.capabilities.maxCollaborators}/${dbPlan.max_collaborators}`);
      push(apiPlan.capabilities.maxUnits === dbPlan.max_units, `${plan} maxUnits matches DB`, `${apiPlan.capabilities.maxUnits}/${dbPlan.max_units}`);
      push(apiPlan.capabilities.monthlyAiQuota === dbPlan.monthly_ai_quota, `${plan} monthlyAiQuota matches DB`, `${apiPlan.capabilities.monthlyAiQuota}/${dbPlan.monthly_ai_quota}`);
    }
  }

  const forbidden = [
    "stripeCustomerId",
    "stripeSubscriptionId",
    "providerCustomerId",
    "providerSubscriptionId",
    "rawPayload",
    "AUTH_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
  ];
  const leaked = forbidden.filter((value) => text.includes(value));
  push(
    leaked.length === 0,
    "Pricing DTO omits private billing/env fields",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${leaked.join(", ")}`,
  );

  console.log(
    JSON.stringify(
      {
        source: response.body?.source,
        plans: response.body?.plans?.map((plan) => ({
          id: plan.id,
          maxMembers: plan.capabilities?.maxMembers,
          maxCollaborators: plan.capabilities?.maxCollaborators,
          maxUnits: plan.capabilities?.maxUnits,
          monthlyAiQuota: plan.capabilities?.monthlyAiQuota,
        })),
        billing: response.body?.billing,
      },
      null,
      2,
    ),
  );
} finally {
  await db.end();
}

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function getDbPlanConfigs() {
  const result = await db.query(
    `SELECT plan, max_members, max_collaborators, max_units, monthly_ai_quota
     FROM plan_configs
     WHERE is_active = true`,
  );

  return new Map(result.rows.map((row) => [row.plan, row]));
}

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return parseResponse(response);
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body };
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
