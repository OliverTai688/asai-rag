#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];
const handoff = buildHandoffFixture();

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
        id: "history_group_1",
        speakerCharacterId: "character_focus_lin",
        visibilityScope: "GROUP",
        content: "大家都聽得到的群聊內容。",
      },
      {
        id: "history_private_1",
        speakerCharacterId: "character_focus_lin",
        addresseeCharacterId: "character_spouse",
        visibilityScope: "PRIVATE",
        content: "這段私聊含 rawPayload token 0912-345-678 and qa-private@example.com，response 不應回傳。",
      },
    ],
  });
  const directorText = JSON.stringify(director.body);
  push(director.status === 503, "Route B director returns guarded-disabled when provider off", `status=${director.status}`);
  push(director.body?.routeB?.status === "GUARDED_DISABLED", "Route B director reports guarded-disabled");
  push(director.body?.routeB?.providerCallAttempted === false, "Route B director does not call provider");
  push(director.body?.routeB?.aiUsageLogWritten === false, "Route B director does not fake AiUsageLog");
  push(director.body?.runtimeInputPreview?.kind === "DIRECTOR", "Route B director response includes safe input preview");
  pushNoPrivateSentinel(directorText, "Route B director response has no private sentinel");

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
  push(character.body?.runtimeInputPreview?.visibleHistoryCount === 1, "Route B character preview filters private history by addressee");

  const feedback = await memberPost({ intent: "FEEDBACK", handoff });
  push(feedback.status === 503, "Route B feedback returns guarded-disabled when provider off", `status=${feedback.status}`);
  push(
    feedback.body?.runtimeInputPreview?.qualitativePerspectives?.length === 5,
    "Route B feedback preview uses five qualitative perspectives",
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

function material(id, text, factStatus, use) {
  return {
    id,
    text,
    factStatus,
    use,
    sourceRefs: [{ id: `${id}_source`, label: "QA fixture", factStatus }],
  };
}

function buildHandoffFixture() {
  return {
    id: "route_b_runtime_qa_handoff",
    sourcePacketId: "route_b_runtime_qa_packet",
    scene: {
      id: "route_b_runtime_qa_scene",
      sourcePacketId: "route_b_runtime_qa_packet",
      title: "林先生的家庭保障劇場",
      scenario: "釐清林先生與配偶對家庭保障的共同決策。",
      readiness: "READY",
      characters: [
        {
          id: "character_focus_lin",
          displayName: "林先生",
          role: "FOCUS_CLIENT",
          isFocus: true,
          publicBrief: "科技公司營運長，重視效率。",
          knownFacts: [material("fact_focus_job", "林先生是科技公司營運長。", "CONFIRMED", "BACKGROUND_FACT")],
          personaHints: [{ label: "可能重視效率", factStatus: "INFERENCE", evidenceIds: ["mem_efficiency"] }],
          unknowns: [material("unknown_spouse", "尚未確認配偶是否參與決策。", "UNKNOWN", "NARRATOR_QUESTION")],
          exemplarLines: [material("line_focus", "我想先知道這件事有沒有必要。", "INFERENCE", "PERSONA_HINT")],
        },
        {
          id: "character_spouse",
          displayName: "林太太",
          role: "DECISION_MAKER",
          isFocus: false,
          publicBrief: "共同決策者，可能關注現金流。",
          knownFacts: [material("fact_spouse", "林太太會一起討論家庭保障。", "CONFIRMED", "BACKGROUND_FACT")],
          personaHints: [{ label: "可能追問保費負擔", factStatus: "INFERENCE", evidenceIds: ["mem_cashflow"] }],
          unknowns: [],
          exemplarLines: [],
        },
        {
          id: "character_partner",
          displayName: "合夥人",
          role: "INFLUENCER",
          isFocus: false,
          publicBrief: "提醒公司責任風險的影響者。",
          knownFacts: [material("fact_partner", "合夥人曾提醒公司責任風險。", "CONFIRMED", "BACKGROUND_FACT")],
          personaHints: [],
          unknowns: [],
          exemplarLines: [],
        },
      ],
      relationships: [
        {
          id: "relation_spouse",
          summary: "林先生與林太太是共同決策關係。",
          factStatus: "CONFIRMED",
          visibilityScope: "GROUP",
          sourceRefs: [{ id: "rel_source", label: "QA fixture", factStatus: "CONFIRMED" }],
        },
      ],
      objections: [material("objection_busy", "太忙，想下次再談。", "INFERENCE", "PERSONA_HINT")],
      narratorQuestions: [material("narrator_spouse", "請確認林太太是否會參與本次拜訪。", "UNKNOWN", "NARRATOR_QUESTION")],
      visibilityRules: [
        {
          scope: "GROUP",
          label: "群聊",
          visibleTo: "EVERYONE",
          canBeQuotedInGroup: true,
          writesConfirmedCrmFact: false,
        },
        {
          scope: "PRIVATE",
          label: "私聊",
          visibleTo: "ADDRESSEE_ONLY",
          canBeQuotedInGroup: false,
          writesConfirmedCrmFact: false,
        },
      ],
      statePatches: [
        {
          id: "state_focus_anxiety",
          targetCharacterId: "character_focus_lin",
          summary: "林先生對長期保費承諾提高警覺。",
          factStatus: "INFERENCE",
          visibilityScope: "PRIVATE",
          requiresConfirmation: true,
          writesConfirmedCrmFact: false,
          allowedWriteTargets: ["SCENE_PRIVATE_STATE", "RELATIONSHIP_STATE"],
        },
      ],
    },
    aiUsagePlan: {
      noProviderDuringHandoffBuild: true,
      calls: [
        {
          kind: "DIRECTOR",
          purpose: "選擇下一位發言者與演出指令。",
          requiresAiUsageLog: true,
          logOn: "SUCCESS_AND_PROVIDER_ERROR",
          storesRawProviderPayload: false,
        },
        {
          kind: "CHARACTER",
          purpose: "產生指定角色的回覆。",
          requiresAiUsageLog: true,
          logOn: "SUCCESS_AND_PROVIDER_ERROR",
          storesRawProviderPayload: false,
        },
        {
          kind: "FEEDBACK",
          purpose: "產生五視角質化回饋。",
          requiresAiUsageLog: true,
          logOn: "SUCCESS_AND_PROVIDER_ERROR",
          storesRawProviderPayload: false,
        },
      ],
    },
    runtimeActivation: {
      routeBEnabled: true,
      canStartProductionSession: true,
      rollbackNote: "Provider disabled 時只停在 guarded-disabled，不宣稱 production multi-character theater。",
    },
    compatibility: {
      legacyPersonaTypeStrategy: "compatibility-only",
      legacyTensionStrategy: "statePatches only",
      legacyScoreStrategy: "qualitative feedback only",
      migrationBoundary: "runtime gate proof",
    },
  };
}
