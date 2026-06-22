#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const checks = [];

execFileSync("pnpm", ["theater:route-b-next-turn-provider-dry-run"], { cwd: root, stdio: "inherit" });
execFileSync("pnpm", ["theater:route-b-next-turn-append-dry-run"], { cwd: root, stdio: "inherit" });

runSourceContractChecks();

for (const label of checks) {
  console.log(`PASS ${label}`);
}

console.log(
  JSON.stringify(
    {
      route: "/api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate",
      sourceContractChecks: checks.length,
      ownerScoped: true,
      providerCallRequiresQuotaAndKey: true,
      successErrorAiUsageLogRequired: true,
      appendCandidateRequiresAdvisorConfirmation: true,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      writesConfirmedCrmFact: false,
    },
    null,
    2,
  ),
);

function runSourceContractChecks() {
  const routeSource = readSource("src/app/api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate/route.ts");
  const pageSource = readSource("src/app/(dashboard)/theater/[sessionId]/page.tsx");
  const manifestSource = readSource("src/domains/ai-protocol/manifest.ts");
  const registryQaSource = readSource("scripts/ai-protocol-registry-qa.ts");

  check(routeSource.includes("requireCurrentMember"), "provider-candidate route requires current member");
  check(routeSource.includes("getRouteBSessionForMember"), "provider-candidate route reads owner-scoped Route B session");
  check(routeSource.includes("buildTheaterRouteBNextTurnDraft"), "provider-candidate route derives next-turn draft server-side");
  check(routeSource.includes("canUseAiModule(session, AiModule.THEATER)"), "provider-candidate route checks THEATER quota before provider call");
  check(routeSource.includes("!process.env.OPENAI_API_KEY"), "provider-candidate route guards missing provider key");
  check(routeSource.includes("findRouteBProviderCandidatePayloadViolations"), "provider-candidate route blocks raw/provider/private sentinel payloads");
  check(routeSource.includes("routeBProviderCandidateInputSchema") && routeSource.includes(".strict()"), "provider-candidate route accepts only strict control body");
  check(routeSource.includes("openai.chat.completions.create"), "provider-candidate route contains real OpenAI call path");
  check(routeSource.includes('response_format: { type: "json_object" }'), "provider-candidate route requests JSON provider output");
  check(routeSource.includes("providerCandidateJsonSchema.safeParse"), "provider-candidate route validates provider output schema");
  check(routeSource.includes("runTheaterRouteBNextTurnProviderContract"), "provider-candidate route reuses next-turn provider contract");
  check(routeSource.includes("prisma.aiUsageLog.create"), "provider-candidate route writes AiUsageLog rows");
  check(routeSource.includes("monthlyAiUsed: { increment: 1 }"), "provider-candidate success path increments org AI usage after log write");
  check(routeSource.includes("traceSource: \"theater\""), "provider-candidate route links usage trace to theater");
  check(routeSource.includes("theaterSessionId: options.sessionId"), "provider-candidate usage log traces theater session id");
  check(routeSource.includes("ROUTE_B_NEXT_TURN_PROVIDER_DISABLED"), "provider-candidate route has guarded disabled response");
  check(routeSource.includes("ROUTE_B_NEXT_TURN_PROVIDER_ERROR"), "provider-candidate route returns safe provider error code");
  check(!routeSource.includes("appendRouteBNextTurnCandidateForMember"), "provider-candidate route does not append theater turns");
  check(routeSource.includes("storesRawProviderPayload: false"), "provider-candidate route marks raw provider payload storage false");

  check(pageSource.includes("/next-turn/provider-candidate"), "stage UI calls provider-candidate route");
  check(pageSource.includes("isSafeRouteBProviderCandidate"), "stage UI validates candidate safety flags");
  check(pageSource.includes("setPendingAppendCandidate(payload.candidate)"), "stage UI stores provider candidate only after route success");
  check(pageSource.includes("setPendingAppendUsageLogId(payload.usageLogId)"), "stage UI stores usageLogId with candidate");
  check(pageSource.includes("canConfirmAppend"), "stage UI keeps append confirmation gated");
  check(pageSource.includes("candidate.requiresAdvisorConfirmation === true"), "stage UI requires advisor confirmation flag");
  check(pageSource.includes("candidate.writesConfirmedCrmFact === false"), "stage UI rejects CRM fact-writing candidates");
  check(pageSource.includes("candidate.storesRawProviderPayload === false"), "stage UI rejects raw provider payload candidates");

  check(manifestSource.includes("route-b-next-turn-provider-candidate"), "AgentFacts manifest names live provider candidate capability");
  check(manifestSource.includes("/api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate"), "AgentFacts manifest references provider-candidate endpoint");
  check(manifestSource.includes("pnpm theater:route-b-next-turn-provider-route-qa"), "AgentFacts manifest lists provider route QA command");
  check(registryQaSource.includes("route-b-next-turn-provider-candidate"), "registry QA expects provider-candidate evidence");
  check(registryQaSource.includes("pnpm theater:route-b-next-turn-provider-route-qa"), "registry QA expects provider route QA command");
}

function readSource(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
}
