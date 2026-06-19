#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

loadEnvFile(".env");

const ROOT = process.cwd();
const routeManifest = [
  {
    route: "/api/ai/chat",
    file: "src/app/api/ai/chat/route.ts",
    module: "CHAT",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistAssistantChatSuccess"],
    errorEvidence: ["persistAssistantChatFailure", "writeAiUsageLogSafely"],
  },
  {
    route: "/api/ai/interview",
    file: "src/app/api/ai/interview/route.ts",
    module: "INTERVIEW",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistInterviewTurnSuccess"],
    errorEvidence: ["persistInterviewFailure"],
  },
  {
    route: "/api/ai/interview/outputs",
    file: "src/app/api/ai/interview/outputs/route.ts",
    module: "INTERVIEW",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistInterviewOutputSuccess"],
    errorEvidence: ["persistInterviewFailure"],
  },
  {
    route: "/api/ai/interview/realtime-session",
    file: "src/app/api/ai/interview/realtime-session/route.ts",
    module: "INTERVIEW",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    providerCallEvidence: ["OPENAI_REALTIME_CLIENT_SECRET_URL", "Authorization: `Bearer ${process.env.OPENAI_API_KEY}`"],
    successEvidence: ["writeAiUsageLogSafely"],
    errorEvidence: ["writeAiUsageLogSafely"],
  },
  {
    route: "/api/ai/interview/realtime-events",
    file: "src/app/api/ai/interview/realtime-events/route.ts",
    module: "INTERVIEW",
    provider: "MOCK",
    providerCallRequired: false,
    disabledEvidence: ["mirrorRealtimeEventToMemoryCandidates", "AiProvider.MOCK", "rawAudioStored"],
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["writeAiUsageLogSafely"],
    errorEvidence: ["writeAiUsageLogSafely"],
  },
  {
    route: "/api/ai/theater",
    file: "src/app/api/ai/theater/route.ts",
    module: "THEATER",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistTheaterCharacterSuccess"],
    errorEvidence: ["persistTheaterFailure"],
  },
  {
    route: "/api/ai/theater/score",
    file: "src/app/api/ai/theater/score/route.ts",
    module: "THEATER",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistTheaterScoreSuccess"],
    errorEvidence: ["persistTheaterFailure"],
  },
  {
    route: "/api/ai/spin",
    file: "src/app/api/ai/spin/route.ts",
    module: "SPIN",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistAiGenerationSuccess", "aiUsageLog.create", "writeAiUsageLog"],
    errorEvidence: ["persistAiGenerationFailure", "writeAiUsageLogSafely", "writeAiUsageLog"],
  },
  {
    route: "/api/ai/spin-suggestions",
    file: "src/app/api/ai/spin-suggestions/route.ts",
    module: "SPIN",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistAiGenerationSuccess", "aiUsageLog.create", "writeAiUsageLog"],
    errorEvidence: ["persistAiGenerationFailure", "writeAiUsageLogSafely", "writeAiUsageLog"],
  },
  {
    route: "/api/ai/visit",
    file: "src/app/api/ai/visit/route.ts",
    module: "VISIT",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistAiGenerationSuccess", "aiUsageLog.create", "writeAiUsageLog"],
    errorEvidence: ["persistAiGenerationFailure", "writeAiUsageLogSafely", "writeAiUsageLog"],
  },
  {
    route: "/api/ai/report",
    file: "src/app/api/ai/report/route.ts",
    module: "REPORT",
    provider: "OPENAI",
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["persistAiGenerationSuccess", "aiUsageLog.create", "writeAiUsageLog"],
    errorEvidence: ["persistAiGenerationFailure", "writeAiUsageLogSafely", "writeAiUsageLog"],
  },
  {
    route: "/api/rag",
    file: "src/app/api/rag/route.ts",
    module: "RAG",
    provider: "OPENAI",
    providerCallRequired: false,
    disabledEvidence: ["RAG_DISABLED_FOR_PRIVATE_BETA", "disabled_guarded", "providerAttempted"],
    expectedAuth: true,
    expectedQuota: true,
    successEvidence: ["AiUsageLog", "aiUsageLog.create", "writeAiUsageLog"],
    errorEvidence: ["writeAiUsageLogSafely", "writeAiUsageLog"],
  },
];

const sourceResults = routeManifest.map(auditRouteSource);
const dbSummary = await collectDatabaseSummary();
const routesWithGaps = sourceResults.filter((result) => result.status !== "pass");

const result = {
  generatedAt: new Date().toISOString(),
  overall: routesWithGaps.length === 0 ? "pass" : "gaps_found",
  routesWithGaps: routesWithGaps.map((route) => route.route),
  sourceResults,
  dbSummary,
};

console.log(JSON.stringify(result, null, 2));

function auditRouteSource(route) {
  const absolutePath = join(ROOT, route.file);

  if (!existsSync(absolutePath)) {
    return {
      route: route.route,
      file: route.file,
      module: route.module,
      provider: route.provider,
      status: "fail",
      gaps: ["route file missing"],
    };
  }

  const source = readFileSync(absolutePath, "utf8");
  const disabledGuarded =
    route.providerCallRequired === false &&
    route.disabledEvidence.every((token) => source.includes(token));
  const checks = {
    providerCall:
      route.providerCallRequired === false
        ? disabledGuarded
        : route.providerCallEvidence
          ? route.providerCallEvidence.every((token) => source.includes(token))
          : /from\s+["']openai["']|new OpenAI|chat\.completions\.create|responses\.create|embeddings\.create/.test(
              source,
            ),
    authGuard: !route.expectedAuth || source.includes("requireCurrentMember"),
    quotaGuard: !route.expectedQuota || source.includes("canUseAiModule"),
    successUsageEvidence:
      route.providerCallRequired === false
        ? disabledGuarded
        : route.successEvidence.some((token) => source.includes(token)),
    errorUsageEvidence:
      route.providerCallRequired === false
        ? disabledGuarded
        : route.errorEvidence.some((token) => source.includes(token)),
  };
  const gaps = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    route: route.route,
    file: route.file,
    module: route.module,
    provider: route.provider,
    launchPosture: route.providerCallRequired === false ? "disabled_guarded" : "provider_ready",
    status: gaps.length === 0 ? "pass" : "gap",
    checks,
    gaps,
  };
}

async function collectDatabaseSummary() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    return {
      status: "skipped",
      reason: "DIRECT_URL/DATABASE_URL not set",
    };
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000, max: 1 });

  try {
    const query = await pool.query(
      `SELECT
         module::text AS module,
         provider::text AS provider,
         count(*)::int AS total,
         count(*) FILTER (WHERE error IS NULL)::int AS success,
         count(*) FILTER (WHERE error IS NOT NULL)::int AS error,
         min(created_at)::text AS first_seen,
         max(created_at)::text AS last_seen
       FROM ai_usage_logs
       WHERE created_at >= date_trunc('month', now())
       GROUP BY module, provider
       ORDER BY module, provider`,
    );

    return {
      status: "pass",
      period: "current_month",
      rows: query.rows,
    };
  } catch (error) {
    return {
      status: "warn",
      reason: `${error.code ?? "ERROR"}: ${error.message}`,
    };
  } finally {
    await pool.end();
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
