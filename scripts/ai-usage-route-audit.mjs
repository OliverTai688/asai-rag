#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { Pool } from "pg";

loadEnvFile(".env");

const ROOT = process.cwd();
const API_ROUTE_ROOTS = ["src/app/api/ai", "src/app/api/rag"];
const providerCallPattern =
  /from\s+["']openai["']|new OpenAI|chat\.completions\.create|responses\.create|embeddings\.create|audio\.transcriptions\.create|fetch\(\s*OPENAI|api\.openai\.com|@anthropic-ai|new Anthropic/i;

const routeManifest = [
  providerRoute({
    route: "/api/ai/chat",
    file: "src/app/api/ai/chat/route.ts",
    module: "CHAT",
    inputEvidence: ["chatRequestSchema", ".max(24)", "content: z.string().trim().min(1).max(4000)"],
    successEvidence: ["persistAssistantChatSuccess"],
    errorEvidence: ["persistAssistantChatFailure", "writeAiUsageLogSafely"],
  }),
  providerRoute({
    route: "/api/ai/interview",
    file: "src/app/api/ai/interview/route.ts",
    module: "INTERVIEW",
    inputEvidence: ["interviewRequestSchema", ".max(24)", "content: z.string().trim().min(1).max(4000)"],
    successEvidence: ["persistInterviewTurnSuccess"],
    errorEvidence: ["persistInterviewFailure"],
  }),
  providerRoute({
    route: "/api/ai/interview/outputs",
    file: "src/app/api/ai/interview/outputs/route.ts",
    module: "INTERVIEW",
    inputEvidence: ["interviewOutputRequestSchema", "safeParse"],
    successEvidence: ["persistInterviewOutputSuccess"],
    errorEvidence: ["persistInterviewFailure"],
  }),
  providerRoute({
    route: "/api/ai/interview/realtime-session",
    file: "src/app/api/ai/interview/realtime-session/route.ts",
    module: "INTERVIEW",
    kind: "provider_or_dry_run",
    providerCallEvidence: ["fetch(OPENAI_REALTIME_CLIENT_SECRET_URL", "Authorization: `Bearer ${process.env.OPENAI_API_KEY}`"],
    inputEvidence: ["realtimeSessionRequestSchema", "safeParse"],
    successEvidence: ["writeAiUsageLogSafely"],
    errorEvidence: ["writeAiUsageLogSafely"],
  }),
  {
    route: "/api/ai/interview/realtime-events",
    file: "src/app/api/ai/interview/realtime-events/route.ts",
    module: "INTERVIEW",
    provider: "MOCK",
    kind: "event_mirror_no_external_provider",
    expectedAuth: true,
    expectedQuota: true,
    usageRequired: true,
    providerCallRequired: false,
    inputLimitRequired: true,
    inputEvidence: ["findRealtimeEventPayloadViolations", "realtimeEventSchema", "safeParse"],
    successEvidence: ["writeAiUsageLogSafely"],
    errorEvidence: ["writeAiUsageLogSafely"],
    noProviderEvidence: ["AiProvider.MOCK", "rawAudioStored"],
  },
  deterministicRoute({
    route: "/api/ai/interview/sessions",
    file: "src/app/api/ai/interview/sessions/route.ts",
    module: "INTERVIEW",
    methods: ["POST"],
    inputEvidence: ["createInterviewSessionInputSchema", "safeParse"],
  }),
  deterministicRoute({
    route: "/api/ai/interview/sessions/[sessionId]",
    file: "src/app/api/ai/interview/sessions/[sessionId]/route.ts",
    module: "INTERVIEW",
    methods: ["GET"],
    inputLimitRequired: false,
  }),
  deterministicRoute({
    route: "/api/ai/interview/sessions/[sessionId]/turns",
    file: "src/app/api/ai/interview/sessions/[sessionId]/turns/route.ts",
    module: "INTERVIEW",
    methods: ["POST"],
    inputEvidence: ["appendInterviewTurnInputSchema", "safeParse"],
  }),
  deterministicRoute({
    route: "/api/ai/interview/sessions/[sessionId]/reflections",
    file: "src/app/api/ai/interview/sessions/[sessionId]/reflections/route.ts",
    module: "INTERVIEW",
    methods: ["POST"],
    inputEvidence: ["createInterviewReflectionInputSchema", "safeParse"],
  }),
  deterministicRoute({
    route: "/api/ai/interview/sessions/[sessionId]/reflections/generate",
    file: "src/app/api/ai/interview/sessions/[sessionId]/reflections/generate/route.ts",
    module: "INTERVIEW",
    methods: ["POST"],
    inputEvidence: ["generateInterviewReflectionInputSchema", "safeParse"],
  }),
  deterministicRoute({
    route: "/api/ai/interview/sessions/[sessionId]/plans",
    file: "src/app/api/ai/interview/sessions/[sessionId]/plans/route.ts",
    module: "INTERVIEW",
    methods: ["POST"],
    inputEvidence: ["generateInterviewPlanInputSchema", "safeParse"],
  }),
  deterministicRoute({
    route: "/api/ai/interview/sessions/[sessionId]/writebacks",
    file: "src/app/api/ai/interview/sessions/[sessionId]/writebacks/route.ts",
    module: "INTERVIEW",
    methods: ["GET", "POST"],
    inputEvidence: ["interviewWritebackInputSchema", "safeParse"],
  }),
  deterministicRoute({
    route: "/api/ai/interview/quick-captures",
    file: "src/app/api/ai/interview/quick-captures/route.ts",
    module: "INTERVIEW",
    methods: ["POST"],
    inputEvidence: ["createQuickCaptureBridgeInputSchema", "safeParse"],
    noProviderEvidence: ["requireCurrentMember", "createPersistentQuickCaptureBridge"],
  }),
  deterministicRoute({
    route: "/api/ai/meeting/sessions",
    file: "src/app/api/ai/meeting/sessions/route.ts",
    module: "MEETING",
    methods: ["POST"],
    inputEvidence: ["createMeetingSessionInputSchema", "findMeetingPayloadViolations", "safeParse"],
    noProviderEvidence: ["requireCurrentMember"],
  }),
  deterministicRoute({
    route: "/api/ai/meeting/sessions/[sessionId]",
    file: "src/app/api/ai/meeting/sessions/[sessionId]/route.ts",
    module: "MEETING",
    methods: ["GET"],
    inputLimitRequired: false,
    noProviderEvidence: ["requireCurrentMember", "getMeetingSessionSnapshotForMember"],
  }),
  deterministicRoute({
    route: "/api/ai/meeting/sessions/[sessionId]/turns",
    file: "src/app/api/ai/meeting/sessions/[sessionId]/turns/route.ts",
    module: "MEETING",
    methods: ["POST"],
    inputEvidence: ["appendMeetingTurnInputSchema", "findMeetingPayloadViolations", "safeParse"],
    noProviderEvidence: ["requireCurrentMember", "appendMeetingTurnForMember"],
  }),
  providerRoute({
    route: "/api/ai/meeting/sessions/[sessionId]/summary",
    file: "src/app/api/ai/meeting/sessions/[sessionId]/summary/route.ts",
    module: "MEETING",
    kind: "provider_json_or_deterministic",
    methods: ["GET", "POST"],
    inputEvidence: ["generateMeetingSummaryInputSchema", "findMeetingPayloadViolations", "safeParse"],
    providerCallEvidence: ["chat.completions.create"],
    successEvidence: ["persistMeetingSummaryProviderSuccess"],
    errorEvidence: ["persistMeetingSummaryProviderFailure"],
  }),
  deterministicRoute({
    route: "/api/ai/meeting/sessions/[sessionId]/writebacks",
    file: "src/app/api/ai/meeting/sessions/[sessionId]/writebacks/route.ts",
    module: "MEETING",
    methods: ["GET", "POST"],
    inputEvidence: ["meetingWritebackInputSchema", "findMeetingPayloadViolations", "safeParse"],
    noProviderEvidence: ["requireCurrentMember", "saveMeetingWritebackConfirmation"],
  }),
  providerRoute({
    route: "/api/ai/meeting/sessions/[sessionId]/chat",
    file: "src/app/api/ai/meeting/sessions/[sessionId]/chat/route.ts",
    module: "MEETING",
    kind: "provider_json_or_deterministic",
    methods: ["POST"],
    inputEvidence: ["meetingMemoryChatInputSchema", "findMeetingMemoryChatPayloadViolations", "safeParse"],
    providerCallEvidence: ["chat.completions.create"],
    successEvidence: ["persistMeetingMemoryChatProviderSuccess"],
    errorEvidence: ["persistMeetingMemoryChatProviderFailure"],
    supportFiles: [
      "src/lib/interview/meeting-memory-chat-provider.ts",
      "src/lib/interview/meeting-memory-chat-repository.ts",
    ],
  }),
  providerRoute({
    route: "/api/ai/clients/[clientId]/memory-chat",
    file: "src/app/api/ai/clients/[clientId]/memory-chat/route.ts",
    module: "MEETING",
    kind: "provider_json_or_deterministic",
    methods: ["POST"],
    inputEvidence: ["meetingMemoryChatInputSchema", "findMeetingMemoryChatPayloadViolations", "safeParse"],
    providerCallEvidence: ["chat.completions.create"],
    successEvidence: ["persistMeetingMemoryChatProviderSuccess"],
    errorEvidence: ["persistMeetingMemoryChatProviderFailure"],
    supportFiles: [
      "src/lib/interview/meeting-memory-chat-provider.ts",
      "src/lib/interview/meeting-memory-chat-repository.ts",
    ],
  }),
  providerRoute({
    route: "/api/ai/interview/transcribe",
    file: "src/app/api/ai/interview/transcribe/route.ts",
    module: "INTERVIEW",
    kind: "audio_transcription_provider",
    providerCallEvidence: ["audio.transcriptions.create"],
    inputEvidence: ["MAX_AUDIO_BYTES", "MIN_AUDIO_BYTES", "req.formData"],
    successEvidence: ["writeAiUsageLogSafely"],
    errorEvidence: ["writeAiUsageLogSafely"],
  }),
  providerRoute({
    route: "/api/ai/interview/transcribe-realtime-session",
    file: "src/app/api/ai/interview/transcribe-realtime-session/route.ts",
    module: "INTERVIEW",
    kind: "transcription_secret_provider",
    providerCallEvidence: ["fetch(OPENAI_REALTIME_CLIENT_SECRET_URL", "Authorization: `Bearer ${process.env.OPENAI_API_KEY}`"],
    inputEvidence: ["requireCurrentMember"],
    successEvidence: ["writeAiUsageLogSafely"],
    errorEvidence: ["writeAiUsageLogSafely"],
  }),
  providerRoute({
    route: "/api/ai/report",
    file: "src/app/api/ai/report/route.ts",
    module: "REPORT",
    inputEvidence: ["reportRequestSchema", "prompt: z.string().trim().min(1).max(2000)"],
    successEvidence: ["persistAiGenerationSuccess"],
    errorEvidence: ["persistAiGenerationFailure"],
  }),
  providerRoute({
    route: "/api/ai/spin",
    file: "src/app/api/ai/spin/route.ts",
    module: "SPIN",
    inputEvidence: ["spinRequestSchema", ".max(30)", "content: z.string().trim().max(5000)"],
    successEvidence: ["persistAiGenerationSuccess", "aiUsageLog.create", "writeAiUsageLog"],
    errorEvidence: ["persistAiGenerationFailure", "writeAiUsageLogSafely", "writeAiUsageLog"],
  }),
  providerRoute({
    route: "/api/ai/spin-suggestions",
    file: "src/app/api/ai/spin-suggestions/route.ts",
    module: "SPIN",
    inputEvidence: ["suggestionsRequestSchema", "lastUserMessage: z.string().trim().max(2000)"],
    successEvidence: ["persistAiGenerationSuccess", "aiUsageLog.create", "writeAiUsageLog"],
    errorEvidence: ["persistAiGenerationFailure", "writeAiUsageLogSafely", "writeAiUsageLog"],
  }),
  providerRoute({
    route: "/api/ai/theater-build",
    file: "src/app/api/ai/theater-build/route.ts",
    module: "THEATER",
    inputEvidence: ["requestSchema", ".max(24)", "knownMaterials: z.array(z.string().trim().max(1200)).max(60)"],
    successEvidence: ["persistTheaterBuildSuccess"],
    errorEvidence: ["persistTheaterBuildFailure"],
  }),
  providerRoute({
    route: "/api/ai/theater",
    file: "src/app/api/ai/theater/route.ts",
    module: "THEATER",
    inputEvidence: ["theaterRequestSchema", "personaType: z.enum", ".max(24)"],
    successEvidence: ["persistTheaterCharacterSuccess"],
    errorEvidence: ["persistTheaterFailure"],
  }),
  providerRoute({
    route: "/api/ai/theater/score",
    file: "src/app/api/ai/theater/score/route.ts",
    module: "THEATER",
    inputEvidence: ["theaterScoreRequestSchema", "safeParse"],
    successEvidence: ["persistTheaterScoreSuccess"],
    errorEvidence: ["persistTheaterFailure"],
  }),
  providerRoute({
    route: "/api/ai/visit",
    file: "src/app/api/ai/visit/route.ts",
    module: "VISIT",
    inputEvidence: ["visitRequestSchema", "clientId: z.string().trim().min(1).max(120)"],
    successEvidence: ["persistAiGenerationSuccess"],
    errorEvidence: ["persistAiGenerationFailure"],
  }),
  {
    route: "/api/rag",
    file: "src/app/api/rag/route.ts",
    module: "RAG",
    provider: "OPENAI_TARGET",
    kind: "guarded_disabled",
    expectedAuth: true,
    expectedQuota: true,
    usageRequired: false,
    providerCallRequired: false,
    inputLimitRequired: true,
    inputEvidence: ["querySchema", "safeParse"],
    noProviderEvidence: ["RAG_DISABLED_FOR_PRIVATE_BETA", "disabled_guarded", "providerAttempted"],
    successEvidence: [],
    errorEvidence: [],
  },
];

const discoveredRoutes = discoverApiRoutes();
const discoveryGaps = auditDiscovery(discoveredRoutes, routeManifest);
const sourceResults = routeManifest.map(auditRouteSource);
const dbSummary = await collectDatabaseSummary();
const routesWithGaps = sourceResults.filter((result) => result.status !== "pass");

const result = {
  generatedAt: new Date().toISOString(),
  overall: routesWithGaps.length === 0 && discoveryGaps.length === 0 ? "pass" : "gaps_found",
  routeCount: sourceResults.length,
  providerReadyRouteCount: sourceResults.filter((route) => route.launchPosture === "provider_ready").length,
  noProviderRouteCount: sourceResults.filter((route) => route.launchPosture !== "provider_ready").length,
  routesWithGaps: routesWithGaps.map((route) => route.route),
  discovery: {
    roots: API_ROUTE_ROOTS,
    discoveredRoutes,
    manifestRoutes: routeManifest.map((route) => route.route).sort(),
    gaps: discoveryGaps,
  },
  sourceResults,
  dbSummary,
};

console.log(JSON.stringify(result, null, 2));

if (result.overall !== "pass") {
  process.exitCode = 1;
}

function providerRoute(input) {
  return {
    provider: "OPENAI",
    kind: input.kind ?? "provider_ready",
    expectedAuth: true,
    expectedQuota: true,
    usageRequired: true,
    providerCallRequired: true,
    inputLimitRequired: true,
    providerCallEvidence: input.providerCallEvidence,
    ...input,
  };
}

function deterministicRoute(input) {
  return {
    provider: "NONE",
    kind: "deterministic_bff",
    expectedAuth: true,
    expectedQuota: false,
    usageRequired: false,
    providerCallRequired: false,
    inputLimitRequired: true,
    inputEvidence: [],
    successEvidence: [],
    errorEvidence: [],
    noProviderEvidence: ["requireCurrentMember"],
    ...input,
  };
}

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

  const routeSource = readFileSync(absolutePath, "utf8");
  const source = [routeSource, ...readSupportFileSources(route.supportFiles ?? [])].join("\n");
  const providerCallDetected = providerCallPattern.test(source);
  const checks = {
    routeDiscovered: discoveredRoutes.includes(route.route),
    providerCall:
      route.providerCallRequired === false
        ? !providerCallDetected && tokensPresent(source, route.noProviderEvidence ?? [])
        : tokensPresent(source, route.providerCallEvidence ?? []) || providerCallDetected,
    authGuard: !route.expectedAuth || source.includes("requireCurrentMember"),
    quotaGuard: !route.expectedQuota || source.includes("canUseAiModule"),
    inputLimit: !route.inputLimitRequired || tokensPresent(source, route.inputEvidence ?? ["safeParse"]),
    successUsageEvidence: !route.usageRequired || tokensPresent(source, route.successEvidence ?? []),
    errorUsageEvidence: !route.usageRequired || tokensPresent(source, route.errorEvidence ?? []),
  };
  const gaps = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    route: route.route,
    file: route.file,
    module: route.module,
    provider: route.provider,
    kind: route.kind,
    methods: route.methods ?? ["POST"],
    launchPosture: route.providerCallRequired === false ? route.kind : "provider_ready",
    providerCallDetected,
    usagePosture: route.usageRequired ? "usage_log_required" : "not_required_no_external_provider_call",
    status: gaps.length === 0 ? "pass" : "gap",
    checks,
    gaps,
  };
}

function readSupportFileSources(files) {
  return files
    .map((file) => {
      const absolutePath = join(ROOT, file);
      return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
    })
    .filter(Boolean);
}

function tokensPresent(source, tokens) {
  return tokens.length === 0 || tokens.some((token) => source.includes(token));
}

function discoverApiRoutes() {
  return API_ROUTE_ROOTS.flatMap((root) => {
    const absoluteRoot = join(ROOT, root);
    if (!existsSync(absoluteRoot)) return [];

    return walkRouteFiles(absoluteRoot)
      .map((absoluteFile) => routeFromFile(absoluteFile))
      .filter(Boolean);
  }).sort();
}

function walkRouteFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkRouteFiles(absolutePath);
    }

    return entry.isFile() && entry.name === "route.ts" ? [absolutePath] : [];
  });
}

function routeFromFile(absoluteFile) {
  const appRelative = relative(join(ROOT, "src/app"), absoluteFile).split(sep).join("/");
  if (!appRelative.endsWith("/route.ts")) return null;
  return `/${appRelative.replace(/\/route\.ts$/, "")}`;
}

function auditDiscovery(discovered, manifest) {
  const manifestRoutes = new Set(manifest.map((route) => route.route));
  const discoveredRoutes = new Set(discovered);
  const undocumentedRoutes = discovered.filter((route) => !manifestRoutes.has(route));
  const missingRoutes = manifest.map((route) => route.route).filter((route) => !discoveredRoutes.has(route));
  const duplicateRoutes = manifest
    .map((route) => route.route)
    .filter((route, index, routes) => routes.indexOf(route) !== index);

  return [
    ...undocumentedRoutes.map((route) => ({ type: "undocumented_route", route })),
    ...missingRoutes.map((route) => ({ type: "manifest_route_missing_from_filesystem", route })),
    ...duplicateRoutes.map((route) => ({ type: "duplicate_manifest_route", route })),
  ];
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
