#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client as PgClient } from "pg";
import { buildRouteBHandoffFixture } from "./fixtures/route-b-handoff-fixture.mjs";

loadEnvFile(".env");

const runtimeRoutePath = "src/app/api/theater/route-b/runtime/route.ts";
const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];
const handoff = buildRouteBHandoffFixture("route_b_runtime_qa");

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runProof();
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

async function runProof() {
  const beforeUsageCount = await countTheaterUsageLogs();
  const routeSource = readFileSync(runtimeRoutePath, "utf8");

  const unauth = await fetch(`${baseUrl}/api/theater/route-b/runtime`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intent: "SESSION_DRAFT", handoff }),
  });
  const unauthPayload = await readJson(unauth);
  push(unauth.status === 401, "Route B runtime unauth returns 401", `status=${unauth.status} error=${unauthPayload?.error ?? ""}`);

  const invalid = await memberPost({ intent: "SESSION_DRAFT", handoff: { id: "broken" } });
  push(invalid.status === 400, "Route B runtime invalid handoff returns 400", `status=${invalid.status}`);

  const sessionDraft = await memberPost({ intent: "SESSION_DRAFT", handoff, sessionId: "route_b_runtime_qa_session" });
  const sessionText = JSON.stringify(sessionDraft.body);
  push(sessionDraft.status === 200, "Route B session draft dry-run returns 200", `status=${sessionDraft.status}`);
  push(sessionDraft.body?.routeB?.status === "DRY_RUN_READY", "Route B session draft reports dry-run ready");
  push(sessionDraft.body?.routeB?.providerCallAttempted === false, "Route B session draft does not call provider");
  push(sessionDraft.body?.routeB?.aiUsageLogWritten === false, "Route B session draft does not fake AiUsageLog");
  push(sessionDraft.body?.sessionDraft?.characterCount === 3, "Route B session draft includes focus and NPC characters");
  push(
    sessionDraft.body?.privacyProof?.privateVisibility?.thirdPartyVisible === false,
    "Route B privacy proof keeps private turn hidden from third party",
  );
  push(
    sessionDraft.body?.privacyProof?.statePatchesWriteConfirmedCrmFact === false,
    "Route B state patches cannot write confirmed CRM facts",
  );
  pushNoPrivateSentinel(sessionText, "Route B session draft response has no private sentinel");

  const director = await memberPost({
    intent: "DIRECTOR",
    handoff,
    salespersonUtterance: "我想先了解您和太太對家庭保障的共同決策方式。",
    history: [
      {
        id: "history_private_1",
        speakerCharacterId: "character_partner",
        addresseeCharacterId: "character_spouse",
        visibilityScope: "PRIVATE",
        content: "這段私聊含 rawPayload token 0912-345-678 and qa-private@example.com，response 不應回傳。",
      },
      {
        id: "history_group_1",
        speakerCharacterId: "character_focus_lin",
        visibilityScope: "GROUP",
        content: "大家都聽得到的群聊內容。",
      },
      {
        id: "history_group_2",
        speakerCharacterId: "character_focus_lin",
        visibilityScope: "GROUP",
        content: "林先生連續發言，下一輪應避免他繼續主導。",
      },
    ],
  });
  const directorText = JSON.stringify(director.body);
  push(director.status === 503, "Route B director returns guarded-disabled when provider off", `status=${director.status}`);
  push(director.body?.routeB?.status === "GUARDED_DISABLED", "Route B director reports guarded-disabled");
  push(director.body?.routeB?.providerCallAttempted === false, "Route B director does not call provider");
  push(director.body?.routeB?.aiUsageLogWritten === false, "Route B director does not fake AiUsageLog");
  push(director.body?.runtimeInputPreview?.kind === "DIRECTOR", "Route B director response includes safe input preview");
  push(
    director.body?.runtimeInputPreview?.sourceAlignment?.agentId === "asai.theater.route_b" &&
      director.body?.runtimeInputPreview?.sourceAlignment?.actionId === "route-b-director" &&
      director.body?.runtimeInputPreview?.sourceAlignment?.registryReadiness === "internal-only",
    "Route B director preview aligns with internal AgentFacts manifest",
  );
  push(
    director.body?.runtimeInputPreview?.inputContract?.validated === true &&
      director.body?.runtimeInputPreview?.inputContract?.rawPrivateTranscriptIncluded === false,
    "Route B director preview validates safe input contract",
  );
  push(
    director.body?.runtimeInputPreview?.aiUsageLogPlan?.requiredWhenProviderEnabled === true &&
      director.body?.runtimeInputPreview?.aiUsageLogPlan?.logOn === "SUCCESS_AND_PROVIDER_ERROR" &&
      director.body?.runtimeInputPreview?.aiUsageLogPlan?.storesProviderBody === false,
    "Route B director preview carries success/error AiUsageLog plan",
  );
  push(
    director.body?.runtimeInputPreview?.scopedHistoryVisibilitySummary?.GROUP === 2 &&
      director.body?.runtimeInputPreview?.scopedHistoryVisibilitySummary?.PRIVATE === 1,
    "Route B director preview reports scoped history visibility summary",
  );
  push(
    director.body?.runtimeInputPreview?.orchestration?.sourceAlignment?.actionId === "route-b-orchestration" &&
      director.body?.runtimeInputPreview?.orchestration?.registryReadiness === "internal-only",
    "Route B director preview includes internal orchestration preview",
  );
  push(
    director.body?.runtimeInputPreview?.orchestration?.directorDirective?.speakerCharacterId === "character_spouse" &&
      director.body?.runtimeInputPreview?.orchestration?.directorDirective?.guardEvidence?.consecutiveSpeakerBlockedCharacterIds?.includes(
        "character_focus_lin",
      ),
    "Route B orchestration preview applies consecutive-speaker guard",
  );
  push(
    director.body?.runtimeInputPreview?.orchestration?.persistenceEnvelope?.requiresConfirmation === true &&
      director.body?.runtimeInputPreview?.orchestration?.persistenceEnvelope?.writesConfirmedCrmFact === false &&
      director.body?.runtimeInputPreview?.orchestration?.providerBoundary?.providerCallAttempted === false,
    "Route B orchestration preview keeps safe persistence and no-provider boundary",
  );
  push(
    director.body?.runtimeInputPreview?.orchestration?.characterReplyInputPreview?.visibleHistoryCount >= 2,
    "Route B orchestration preview reports visibility-scoped character history count",
  );
  pushNoPrivateSentinel(directorText, "Route B director response has no private sentinel");

  const privateDirector = await memberPost({
    intent: "DIRECTOR",
    handoff,
    salespersonUtterance: "私下請林太太回應每月保費承受區間。",
    visibilityScope: "PRIVATE",
    addresseeCharacterId: "character_spouse",
    history: [
      {
        id: "history_group_private_director",
        speakerCharacterId: "character_focus_lin",
        visibilityScope: "GROUP",
        content: "群聊歷史。",
      },
      {
        id: "history_private_other_addressee",
        speakerCharacterId: "character_focus_lin",
        addresseeCharacterId: "character_partner",
        visibilityScope: "PRIVATE",
        content: "這段給合夥人的私聊不應進林太太 visible history。",
      },
    ],
  });
  push(privateDirector.status === 503, "Route B private director returns guarded-disabled when provider off", `status=${privateDirector.status}`);
  push(
    privateDirector.body?.runtimeInputPreview?.orchestration?.directorDirective?.speakerCharacterId === "character_spouse" &&
      privateDirector.body?.runtimeInputPreview?.orchestration?.directorDirective?.addresseeCharacterId === "character_spouse" &&
      privateDirector.body?.runtimeInputPreview?.orchestration?.directorDirective?.visibilityScope === "PRIVATE",
    "Route B private orchestration preview makes named addressee answer",
  );
  push(
    privateDirector.body?.runtimeInputPreview?.orchestration?.directorDirective?.guardEvidence?.namedAddresseeMustAnswer === true &&
      privateDirector.body?.runtimeInputPreview?.orchestration?.directorDirective?.guardEvidence?.namedAddresseeFound === true &&
      privateDirector.body?.runtimeInputPreview?.orchestration?.directorDirective?.guardEvidence?.privateHistoryScopedToAddressee === true,
    "Route B private orchestration preview proves addressee/private history guard",
  );
  push(
    privateDirector.body?.runtimeInputPreview?.orchestration?.characterReplyInputPreview?.visibleHistoryCount === 2,
    "Route B private orchestration preview excludes unrelated private history",
  );
  pushNoPrivateSentinel(JSON.stringify(privateDirector.body), "Route B private director response has no private sentinel");

  const missingDirector = await memberPost({ intent: "DIRECTOR", handoff });
  push(missingDirector.status === 400, "Route B director missing utterance returns preflight 400", `status=${missingDirector.status}`);
  push(
    missingDirector.body?.error === "ROUTE_B_RUNTIME_PREFLIGHT_INVALID" &&
      missingDirector.body?.runtimeInputPreview?.inputContract?.missingFields?.includes("salespersonUtterance"),
    "Route B director preflight reports stable missing field",
  );

  const missingPrivateAddressee = await memberPost({
    intent: "DIRECTOR",
    handoff,
    visibilityScope: "PRIVATE",
    salespersonUtterance: "私聊必須指定對象。",
  });
  push(missingPrivateAddressee.status === 400, "Route B private director without addressee returns preflight 400", `status=${missingPrivateAddressee.status}`);
  push(
    missingPrivateAddressee.body?.runtimeInputPreview?.inputContract?.missingFields?.includes("addresseeCharacterId"),
    "Route B private director preflight reports stable missing addressee field",
  );

  const character = await memberPost({
    intent: "CHARACTER",
    handoff,
    characterId: "character_spouse",
    addresseeCharacterId: "character_focus_lin",
    visibilityScope: "PRIVATE",
    directorDirective: "請以共同決策者角度追問現金流壓力。",
    history: [
      {
        id: "history_group_2",
        speakerCharacterId: "character_focus_lin",
        visibilityScope: "GROUP",
        content: "群聊歷史。",
      },
      {
        id: "history_private_2",
        speakerCharacterId: "character_focus_lin",
        addresseeCharacterId: "character_partner",
        visibilityScope: "PRIVATE",
        content: "另一位角色的私聊不應進配偶 visible history。",
      },
    ],
  });
  push(character.status === 503, "Route B character returns guarded-disabled when provider off", `status=${character.status}`);
  push(character.body?.runtimeInputPreview?.kind === "CHARACTER", "Route B character response includes safe input preview");
  push(
    character.body?.runtimeInputPreview?.sourceAlignment?.actionId === "route-b-character" &&
      character.body?.runtimeInputPreview?.inputContract?.validated === true,
    "Route B character preview aligns with source contract",
  );
  push(character.body?.runtimeInputPreview?.visibleHistoryCount === 1, "Route B character preview filters private history by addressee");

  const unknownCharacter = await memberPost({
    intent: "CHARACTER",
    handoff,
    characterId: "unknown_character",
    directorDirective: "請回應。",
  });
  push(unknownCharacter.status === 400, "Route B character unknown id returns preflight 400", `status=${unknownCharacter.status}`);
  push(
    unknownCharacter.body?.runtimeInputPreview?.inputContract?.missingFields?.includes("knownCharacterId"),
    "Route B character preflight reports stable unknown character field",
  );

  const feedback = await memberPost({ intent: "FEEDBACK", handoff });
  push(feedback.status === 503, "Route B feedback returns guarded-disabled when provider off", `status=${feedback.status}`);
  push(
    feedback.body?.runtimeInputPreview?.sourceAlignment?.actionId === "route-b-feedback" &&
      feedback.body?.runtimeInputPreview?.aiUsageLogPlan?.callKind === "FEEDBACK",
    "Route B feedback preview aligns with source contract and usage plan",
  );
  push(
    feedback.body?.runtimeInputPreview?.qualitativePerspectives?.length === 5,
    "Route B feedback preview uses five qualitative perspectives",
  );
  push(
    routeSource.includes('status: "PROVIDER_NOT_IMPLEMENTED"') &&
      routeSource.includes("ROUTE_B_PROVIDER_IMPLEMENTATION_MISSING") &&
      routeSource.includes("route-b-orchestration") &&
      routeSource.includes("success/error AiUsageLog proof"),
    "Route B provider-enabled branch remains blocked until usage proof is implemented",
  );

  const afterUsageCount = await countTheaterUsageLogs();
  push(afterUsageCount === beforeUsageCount, "Route B guarded-disabled proof writes no fake AiUsageLog", `before=${beforeUsageCount} after=${afterUsageCount}`);
}

async function memberPost(body) {
  const response = await fetch(`${baseUrl}/api/theater/route-b/runtime`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": demoMemberEmail,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function countTheaterUsageLogs() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs WHERE module = 'THEATER'");
  return Number(result.rows[0]?.count ?? 0);
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function pushNoPrivateSentinel(text, label) {
  push(
    !text.includes("@") &&
      !/09\d{2}/.test(text) &&
      !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp"].some((key) =>
        text.toLowerCase().includes(key.toLowerCase()),
      ),
    label,
  );
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
