#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];
const subProofs = [
  "visit:route-b-state-proposal-context-qa",
  "meeting:route-b-state-proposal-context-qa",
  "meeting:route-b-state-proposal-writeback-bridge-qa",
];

for (const script of subProofs) {
  runSubProof(script);
}

runSourceContractAudit();

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      proof: "lv3-route-b-state-proposal-cross-flow-qa",
      surfaces: ["theater", "visit-preparation", "ai-meeting-notes", "meeting-writeback-preview"],
      providerCallAttempted: false,
      dbConnectionAttempted: false,
      browserLaunched: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
      externalRegistryPublicationAttempted: false,
      subProofs,
      checks: checks.length,
    },
    null,
    2,
  ),
);

function runSubProof(script) {
  const result = spawnSync("pnpm", [script], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  const jsonProof = extractJsonProof(output);

  push(result.status === 0, `sub-proof passes: pnpm ${script}`, `exit=${result.status ?? "null"}`);

  if (!jsonProof) {
    push(false, `sub-proof emits JSON proof: pnpm ${script}`, "missing-json-proof");
    return;
  }

  push(
    jsonProof.status === "pass" || Number.isInteger(jsonProof.checkedCount),
    `sub-proof JSON status is pass or legacy checked-count proof: pnpm ${script}`,
    String(jsonProof.status ?? `checkedCount=${jsonProof.checkedCount ?? "missing"}`),
  );
  push(jsonProof.providerCallAttempted === false, `sub-proof is no-provider: pnpm ${script}`, "providerCallAttempted=false");
  push(jsonProof.dbConnectionAttempted !== true, `sub-proof does not connect to DB: pnpm ${script}`, "dbConnectionAttempted!==true");
  push(jsonProof.browserLaunched !== true, `sub-proof does not launch browser: pnpm ${script}`, "browserLaunched!==true");
  push(jsonProof.writesRelationshipGraph === false, `sub-proof does not write relationship graph: pnpm ${script}`, "writesRelationshipGraph=false");
  push(jsonProof.writesVisitPlan === false, `sub-proof does not write VisitPlan: pnpm ${script}`, "writesVisitPlan=false");
  push(jsonProof.writesConfirmedCrmFact === false, `sub-proof does not write confirmed CRM fact: pnpm ${script}`, "writesConfirmedCrmFact=false");
}

function runSourceContractAudit() {
  const theaterHandoff = readSource("src/domains/theater/route-b-handoff.ts");
  const theaterRepository = readSource("src/lib/theater/route-b-session-bff-repository.ts");
  const visitDomain = readSource("src/domains/visit/route-b-state-proposal-context.ts");
  const visitRepository = readSource("src/lib/visits/route-b-state-proposal-context-repository.ts");
  const visitRoute = readSource("src/app/api/visits/[id]/route-b-state-proposal-context/route.ts");
  const visitPage = readSource("src/app/(dashboard)/pre-visit/[planId]/page.tsx");
  const notesPage = readSource("src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx");
  const meetingWorkspace = readSource("src/components/meeting/meeting-workspace.tsx");
  const writebackBridge = readSource("src/domains/interview/meeting-route-b-state-proposal-writeback-bridge.ts");
  const manifest = readSource("src/domains/ai-protocol/manifest.ts");
  const registryQa = readSource("scripts/ai-protocol-registry-qa.ts");
  const packageJson = readSource("package.json");

  assertIncludes(theaterHandoff, "export interface TheaterRouteBStatePatch", "Route B declares state patch contract");
  assertIncludes(theaterHandoff, "requiresConfirmation: true", "Route B state patches require confirmation");
  assertIncludes(theaterHandoff, "writesConfirmedCrmFact: false", "Route B state patches cannot write confirmed CRM facts");
  assertIncludes(theaterHandoff, "allowedWriteTargets", "Route B state patches have an explicit write-target allowlist");
  assertIncludes(theaterHandoff, "buildTheaterRouteBStatePatch", "Route B state patch builder exists");

  assertIncludes(theaterRepository, "statePatches: statePatch ? [statePatch] : undefined", "turn persistence stores candidate state patches");
  assertIncludes(theaterRepository, "statePatches: [...statePatches, statePatch]", "scene state appends candidate state patches");
  assertIncludes(theaterRepository, "requiresConfirmationBeforeCrmWrite: true", "repository preserves confirmation-before-CRM-write guard");
  assertIncludes(theaterRepository, "writesConfirmedCrmFact: false", "repository preserves no confirmed CRM fact write guard");

  assertIncludes(visitDomain, "buildVisitRouteBStateProposalContext", "visit prep builds state proposal advisor context");
  assertIncludes(visitDomain, "theater_route_b_state_proposal", "visit evidence source is Route B state proposal");
  assertIncludes(visitDomain, "requiresAdvisorConfirmation: true", "visit context requires advisor confirmation");
  assertIncludes(visitDomain, "writesRelationshipGraph: false", "visit context does not write relationship graph");
  assertIncludes(visitDomain, "writesVisitPlan: false", "visit context does not write VisitPlan");
  assertIncludes(visitDomain, "writesConfirmedCrmFact: false", "visit context does not write confirmed CRM facts");
  assertIncludes(visitDomain, "rawTheaterSessionIdReturned: false", "visit context omits raw theater session id");
  assertIncludes(visitDomain, "rawPersonIdReturned: false", "visit context omits raw person id");

  assertIncludes(visitRepository, "routeBSourcePacketId", "visit BFF derives Route B source packet from VisitPlan");
  assertIncludes(visitRepository, "sceneState.statePatches", "visit BFF reads persisted scene state patches");
  assertIncludes(visitRepository, "turn.statePatches", "visit BFF reads persisted turn state patches");
  assertIncludes(visitRepository, "browserSuppliedTheaterSessionId: false", "visit BFF rejects browser theater session scope");
  assertIncludes(visitRepository, "browserSuppliedPersonId: false", "visit BFF rejects browser person scope");
  assertIncludes(visitRepository, "writesRelationshipGraph: false", "visit BFF does not write relationship graph");
  assertIncludes(visitRepository, "writesVisitPlan: false", "visit BFF does not write VisitPlan");
  assertIncludes(visitRepository, "writesConfirmedCrmFact: false", "visit BFF does not write confirmed CRM fact");

  assertIncludes(visitRoute, "getVisitRouteBStateProposalContextForMember", "visit API is backed by owner-scoped repository");
  assertIncludes(visitRoute, "requireCurrentMember", "visit API derives member scope server-side");
  assertIncludes(visitRoute, "Response.json", "visit API returns structured BFF DTO");

  assertIncludes(visitPage, "/route-b-state-proposal-context", "pre-visit detail fetches Route B state proposal context");
  assertIncludes(visitPage, "data-route-b-state-proposal-context", "pre-visit detail renders state proposal panel");
  assertIncludes(visitPage, "requiresConfirmation=true", "pre-visit detail shows confirmation boundary");
  assertIncludes(visitPage, "不寫 relationship graph", "pre-visit detail shows no graph write guardrail");

  assertIncludes(notesPage, "/route-b-state-proposal-context", "meeting notes fetches Route B state proposal context");
  assertIncludes(notesPage, "routeBStateProposalContext", "meeting notes passes safe state proposal DTO into workspace");
  assertIncludes(notesPage, "requiresConfirmation: true", "meeting notes preserves confirmation guard in DTO fallback");

  assertIncludes(meetingWorkspace, "buildRouteBStateProposalNoteDraft", "meeting workspace builds state proposal note draft reminders");
  assertIncludes(meetingWorkspace, "data-testid=\"meeting-route-b-state-proposal-context\"", "meeting workspace renders state proposal context panel");
  assertIncludes(meetingWorkspace, "data-testid=\"meeting-route-b-state-proposal-writeback-bridge\"", "meeting workspace renders writeback preview bridge");
  assertIncludes(meetingWorkspace, "MEETING_WRITEBACK_PREVIEW_CONTEXT", "meeting workspace scopes bridge to writeback preview context");
  assertIncludes(meetingWorkspace, "persisted summary required", "meeting workspace shows persisted summary prerequisite");
  assertIncludes(meetingWorkspace, "advisor confirmation required", "meeting workspace shows advisor confirmation prerequisite");
  assertExcludes(meetingWorkspace, "sourceTheaterSessionId", "meeting workspace does not receive or render raw theater session id");
  assertExcludes(meetingWorkspace, "sourcePersonId", "meeting workspace does not receive or render raw person id");
  assertExcludes(meetingWorkspace, "sourcePacketId", "meeting workspace does not receive or render raw source packet id");

  assertIncludes(writebackBridge, "buildMeetingRouteBStateProposalWritebackBridge", "domain bridge builds writeback preview context");
  assertIncludes(writebackBridge, "SUMMARY_REQUIRED", "domain bridge blocks until persisted summary exists");
  assertIncludes(writebackBridge, "READY_FOR_ADVISOR_REVIEW", "domain bridge exposes advisor review-ready status");
  assertIncludes(writebackBridge, "MEETING_WRITEBACK_PREVIEW_CONTEXT", "domain bridge targets meeting writeback preview context");
  assertIncludes(writebackBridge, "providerCallAttempted: false", "domain bridge is deterministic no-provider");
  assertIncludes(writebackBridge, "aiUsageLogRequired: false", "domain bridge does not fake AiUsageLog");
  assertIncludes(writebackBridge, "writesRelationshipGraph: false", "domain bridge does not write relationship graph");
  assertIncludes(writebackBridge, "writesVisitPlan: false", "domain bridge does not write VisitPlan");
  assertIncludes(writebackBridge, "writesConfirmedCrmFact: false", "domain bridge does not write confirmed CRM fact");
  assertIncludes(writebackBridge, "returnsSourcePacketId: false", "domain bridge does not return source packet id");

  assertIncludes(
    manifest,
    "pnpm lv3:route-b-state-proposal-cross-flow-qa",
    "AgentFacts manifests advertise cross-flow proof command",
  );
  assertIncludes(
    manifest,
    "LV3RouteBStateProposalCrossFlow.proofCommand=pnpm lv3:route-b-state-proposal-cross-flow-qa",
    "AgentFacts manifests include cross-flow proof evidence ref",
  );
  assertIncludes(
    registryQa,
    "assertRouteBStateProposalCrossFlowProof",
    "registry QA enforces cross-flow proof evidence",
  );
  assertIncludes(
    registryQa,
    "pnpm lv3:route-b-state-proposal-cross-flow-qa",
    "registry QA expects cross-flow proof command",
  );
  assertIncludes(
    packageJson,
    "\"lv3:route-b-state-proposal-cross-flow-qa\"",
    "package.json registers cross-flow proof command",
  );
}

function extractJsonProof(output) {
  const jsonStart = output.lastIndexOf("\n{");
  const candidate = jsonStart >= 0 ? output.slice(jsonStart + 1) : output.startsWith("{") ? output : "";

  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function readSource(path) {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(source, pattern, label) {
  push(source.includes(pattern), label, pattern);
}

function assertExcludes(source, pattern, label) {
  push(!source.includes(pattern), label, pattern);
}

function push(condition, label, detail) {
  checks.push({
    label,
    status: condition ? "pass" : "fail",
    detail,
  });
}
