#!/usr/bin/env node
import { lookup } from "node:dns/promises";
import { existsSync, readFileSync } from "node:fs";
import { Pool } from "pg";

loadEnvFile(".env");

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const requiredTables = [
  "organizations",
  "users",
  "organization_units",
  "organization_members",
  "clients",
  "visit_plans",
  "spin_sessions",
  "theater_sessions",
  "reports",
  "report_shares",
  "plan_configs",
];

const checks = [];

await checkEnvironment();
await checkDatabase();

const failed = checks.filter((check) => check.status === "fail");

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}

async function checkEnvironment() {
  push(Boolean(connectionString), "DIRECT_URL or DATABASE_URL is set", "Demo seed requires one database URL.");

  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("your-project-id")) {
    warn("NEXT_PUBLIC_SUPABASE_URL still looks like a placeholder");
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("your-anon-key")) {
    warn("NEXT_PUBLIC_SUPABASE_ANON_KEY still looks like a placeholder");
  }

  if (process.env.ALLOW_MOCK_API === "true") {
    warn("ALLOW_MOCK_API=true; keep this disabled in production-like environments");
  }
}

async function checkDatabase() {
  if (!connectionString) return;

  const parsed = parseUrl(connectionString);
  if (!parsed) {
    fail("Database URL is parseable", "DIRECT_URL/DATABASE_URL is not a valid URL.");
    return;
  }

  try {
    const result = await lookup(parsed.hostname);
    pass("Database host DNS resolves", `${parsed.hostname} -> ${result.address}`);
  } catch (error) {
    fail("Database host DNS resolves", `${parsed.hostname}: ${error.code ?? error.message}`);
    return;
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000, max: 1 });

  try {
    const client = await pool.connect();
    try {
      const identity = await client.query("SELECT current_database() AS database, current_user AS user");
      const row = identity.rows[0];
      pass("Database connection opens", `${row.database} as ${row.user}`);

      const tableResult = await client.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = ANY($1::text[])`,
        [requiredTables],
      );
      const found = new Set(tableResult.rows.map((table) => table.table_name));
      const missing = requiredTables.filter((table) => !found.has(table));

      push(
        missing.length === 0,
        "Required demo seed tables exist",
        missing.length === 0 ? `${requiredTables.length} tables found` : `Missing: ${missing.join(", ")}`,
      );
    } finally {
      client.release();
    }
  } catch (error) {
    fail("Database connection opens", `${error.code ?? "ERROR"}: ${error.message}`);
  } finally {
    await pool.end();
  }
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function push(condition, label, detail) {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function pass(label, detail) {
  checks.push({ status: "pass", label, detail });
}

function warn(label, detail = "") {
  checks.push({ status: "warn", label, detail });
}

function fail(label, detail) {
  checks.push({ status: "fail", label, detail });
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
