#!/usr/bin/env node
import { readFileSync } from "node:fs";

const files = {
  acc: "docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md",
  packageJson: "package.json",
  page: "src/app/(dashboard)/theater/[sessionId]/page.tsx",
  pln: "docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md",
  report: "docs/2_agent-input/generated/agent-loop/reports/2026-06-21_lv3-ita-003f-route-b-stage-map.md",
  sessionUiQa: "scripts/theater-route-b-session-ui-qa.mjs",
  stageGraph: "src/components/theater/route-b-stage-graph.tsx",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")]),
);
const checks = [];

checkAccStageMapSection();
checkPackageCommand();
checkStageMapSourceMarkers();
checkSessionUiProofCommand();
checkOwnerEvidence();

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function checkAccStageMapSection() {
  const section = extractSection(
    source.acc,
    "### 5.1 Route B relationship-graph stage map acceptance",
    "### 5.2 Route B runtime preflight acceptance",
  );
  const checklistLines = [...section.matchAll(/^- \[([ x])\] /gm)].map((match) => match[0]);

  push(checklistLines.length === 12, "ACC-006 stage-map checklist keeps 12 acceptance items", `count=${checklistLines.length}`);
  push(!checklistLines.some((line) => line.startsWith("- [ ]")), "ACC-006 stage-map checklist is reconciled to complete");
  push(
    section.includes("Evidence（2026-06-23 LV3-ROUTE-B-STAGE-MAP-ACCEPTANCE-RECONCILE-001）") &&
      section.includes("DEMO_QA_BASE_URL=http://localhost:3000 pnpm theater:route-b-session-ui-qa") &&
      section.includes("pnpm theater:route-b-stage-map-acceptance-reconcile-qa"),
    "ACC-006 records stage-map evidence and reconciliation command",
  );
}

function checkPackageCommand() {
  push(
    source.packageJson.includes('"theater:route-b-stage-map-acceptance-reconcile-qa"') &&
      source.packageJson.includes("scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs"),
    "package.json exposes reconciliation proof command",
  );
}

function checkStageMapSourceMarkers() {
  const requiredPageMarkers = [
    "function RouteBRelationshipStageMap",
    "RouteBStageGraph",
    "Relationship Stage Map",
    "客戶關係舞台",
    "providerCallAttempted={String(provider.callAttempted)}",
    "usageLogWritten={String(provider.usageLogWritten)}",
    "requiresConfirmation=true",
    "writesConfirmedCrmFact=false",
    "關係證據",
    "factStatus",
    "visibilityScope",
    "選擇 Route B 發話範圍",
    "選擇 Route B 私聊對象",
    "選擇 Route B 狀態更新對象",
    "data-route-b-game-chat-hud=\"true\"",
    "data-route-b-comment-mode=\"true\"",
    "選擇 Route B comment 注記範圍",
    "保存 Route B 情境注記",
    "data-route-b-comment-turn",
    "Comment mode：只作情境注記",
  ];

  for (const marker of requiredPageMarkers) {
    push(source.page.includes(marker), `theater session source includes marker: ${marker}`);
  }

  const requiredStageGraphMarkers = [
    "export function RouteBStageGraph",
    "function StageNode",
    "aria-label={`與 ${character.displayName} 私聊`}",
    "data-route-b-stage-graph=\"relationship-map\"",
    "data-route-b-stage-map=\"desktop\"",
    "data-route-b-stage-map=\"mobile-stack\"",
    "data-route-b-stage-person={character.id}",
    "data-route-b-private-chat-target={character.id}",
    "data-route-b-fact-count={character.knownCount}",
    "data-route-b-inference-count={character.inferenceCount}",
    "data-route-b-unknown-count={character.unknownCount}",
    "data-route-b-state-patch-count={character.statePatchCount}",
    "data-provider-call-attempted=\"false\"",
    "data-ai-usage-log-written=\"false\"",
    "data-writes-confirmed-crm-fact=\"false\"",
    "aria-label=\"客戶關係舞台地圖\"",
    "點選任一人物即可把發話範圍切到私聊",
    "不呼叫 AI、不寫回 CRM 既成事實",
  ];

  for (const marker of requiredStageGraphMarkers) {
    push(source.stageGraph.includes(marker), `RouteBStageGraph source includes marker: ${marker}`);
  }
}

function checkSessionUiProofCommand() {
  const requiredMarkers = [
    "created.body?.session?.provider?.callAttempted === false",
    "created.body?.session?.provider?.usageLogWritten === false",
    "managerRead.status === 404",
    "hasRelationshipStageMap",
    "hasRelationshipEvidence",
    "hasGroupLane",
    "hasPrivateLane",
    "hasProviderGuard",
    "hasNoFakeUsage",
    "hasStateProposalBoundary",
    "hasVisibilityProof",
    "hasHorizontalOverflow",
    "stage-map character click switches composer to private",
    "stage-map character click selects decision-maker addressee",
    "Route B session UI proof writes no fake AiUsageLog",
  ];

  for (const marker of requiredMarkers) {
    push(source.sessionUiQa.includes(marker), `session UI QA covers marker: ${marker}`);
  }
}

function checkOwnerEvidence() {
  push(
    source.pln.includes("ITA-003f/S1 stage-map implementation note") &&
      source.pln.includes("pnpm theater:route-b-session-ui-qa") &&
      source.pln.includes("通過 create persisted session"),
    "PLN-015 records completed ITA-003f/S1 implementation proof",
  );
  push(
    source.report.includes("Selected slice: `ITA-003f/S1 Route B relationship-graph stage map (no-provider)`.") &&
      source.report.includes("PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm theater:route-b-session-ui-qa`") &&
      source.report.includes("AiUsageLog` count unchanged"),
    "2026-06-21 loop report records DB-backed stage-map proof",
  );
}

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) {
    push(false, "ACC-006 stage-map section can be extracted");
    return "";
  }
  push(true, "ACC-006 stage-map section can be extracted");
  return text.slice(start, end);
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
