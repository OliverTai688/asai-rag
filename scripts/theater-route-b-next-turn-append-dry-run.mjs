#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "theater-route-b-next-turn-append-dry-run");
const checks = [];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

try {
  execFileSync(
    "pnpm",
    [
      "exec",
      "tsc",
      "--target",
      "ES2022",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "--esModuleInterop",
      "--skipLibCheck",
      "--strict",
      "--outDir",
      outDir,
      "scripts/theater-route-b-next-turn-append-dry-run.ts",
      "src/domains/theater/route-b-next-turn-append.ts",
      "src/domains/theater/route-b-next-turn-provider.ts",
      "src/domains/theater/route-b-next-turn.ts",
      "src/domains/theater/route-b-orchestration.ts",
      "src/domains/theater/route-b-handoff.ts",
      "src/domains/theater/route-b-session.ts",
      "src/domains/interview/types.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "theater-route-b-next-turn-append-dry-run.js")], {
    cwd: root,
    stdio: "inherit",
  });

  runSourceContractChecks();
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

for (const label of checks) {
  console.log(`PASS ${label}`);
}

console.log(
  JSON.stringify(
    {
      sourceContractChecks: checks.length,
      appendRoute:
        "/api/theater/route-b/sessions/[sessionId]/append-candidate",
      confirmedByAdvisorRequired: true,
      usageLogIdRequired: true,
      noProviderCallInAppend: true,
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
    },
    null,
    2,
  ),
);

function runSourceContractChecks() {
  const routeSource = readSource("src/app/api/theater/route-b/sessions/[sessionId]/append-candidate/route.ts");
  const repoSource = readSource("src/lib/theater/route-b-session-bff-repository.ts");
  const pageSource = readSource("src/app/(dashboard)/theater/[sessionId]/page.tsx");
  const manifestSource = readSource("src/domains/ai-protocol/manifest.ts");
  const registryQaSource = readSource("scripts/ai-protocol-registry-qa.ts");

  check(routeSource.includes("confirmedByAdvisor: z.literal(true)"), "append route requires advisor confirmation");
  check(routeSource.includes("usageLogId: z.string().trim().min(8).max(160)"), "append route requires usageLogId");
  check(routeSource.includes("storesRawProviderPayload: z.literal(false)"), "append route rejects raw provider payload candidates");
  check(routeSource.includes("rawPrivateTranscriptIncluded: z.literal(false)"), "append route rejects raw private transcript candidates");
  check(routeSource.includes("writesConfirmedCrmFact: z.literal(false)"), "append route rejects confirmed CRM fact writes");
  check(routeSource.includes("appendRouteBNextTurnCandidateForMember"), "append route calls owner-scoped BFF repository");
  check(routeSource.includes("Cache-Control") && routeSource.includes("no-store"), "append route returns no-store response");

  check(repoSource.includes("buildTheaterRouteBNextTurnAppendConfirmation"), "repository uses domain append confirmation guard");
  check(repoSource.includes("ownerId: session.user.id"), "repository append path is member-owner scoped");
  check(repoSource.includes("actorKind: confirmation.actorKind"), "repository persists Route B actor kind from confirmation");
  check(repoSource.includes("metadata: confirmation.metadata"), "repository persists safe append confirmation metadata");
  check(repoSource.includes("readRouteBActorKind"), "snapshot normalizes legacy TheaterTurn role to Route B actor kind");

  check(pageSource.includes("/append-candidate"), "stage UI posts append candidate endpoint");
  check(pageSource.includes("confirmedByAdvisor: true"), "stage UI sends advisor confirmation");
  check(pageSource.includes("appendCandidate") && pageSource.includes("appendUsageLogId"), "stage UI requires append candidate and usage log id");
  check(pageSource.includes("canConfirmAppend"), "stage UI gates confirmation button");
  check(pageSource.includes("不呼叫 provider") && pageSource.includes("不寫 CRM confirmed fact"), "stage UI explains append safety boundary");
  check(!pageSource.includes("providerPayload"), "stage UI source does not render provider payload sentinel");

  check(manifestSource.includes("route-b-next-turn-append-confirmation"), "AgentFacts manifest names append confirmation action");
  check(manifestSource.includes("TheaterRouteBNextTurnAppendConfirmation"), "AgentFacts manifest references append confirmation DTO");
  check(manifestSource.includes("pnpm theater:route-b-next-turn-append-dry-run"), "AgentFacts manifest lists append dry-run proof");
  check(registryQaSource.includes("route-b-next-turn-append-confirmation"), "registry QA expects append confirmation evidence");
  check(registryQaSource.includes("pnpm theater:route-b-next-turn-append-dry-run"), "registry QA expects append dry-run command");
}

function readSource(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
}
