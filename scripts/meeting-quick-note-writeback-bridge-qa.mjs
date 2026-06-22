#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];

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
      proof: "meeting-quick-note-writeback-bridge-qa",
      providerCallAttempted: false,
      dbConnectionAttempted: false,
      browserLaunched: false,
      checks: checks.length,
    },
    null,
    2,
  ),
);

function runSourceContractAudit() {
  const route = readSource("src/app/api/visits/[id]/meeting-quick-notes/route.ts");
  const repository = readSource("src/lib/interview/meeting-session-repository.ts");
  const notesPage = readSource("src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx");
  const meetingWorkspace = readSource("src/components/meeting/meeting-workspace.tsx");
  const manifest = readSource("src/domains/ai-protocol/manifest.ts");
  const registryQa = readSource("scripts/ai-protocol-registry-qa.ts");
  const packageJson = readSource("package.json");

  assertIncludes(route, "appendVisitMeetingQuickNoteForMember(session, visitPlanId", "quick-note route keeps server-owned visit delegation");
  assertNotIncludes(route, "sessionId", "quick-note route still never accepts browser-supplied session id");

  assertIncludes(repository, "VisitMeetingQuickNoteWritebackBridgeDto", "repository exposes quick-note writeback bridge DTO");
  assertIncludes(repository, "buildVisitMeetingQuickNoteWritebackBridge", "repository builds quick-note writeback bridge");
  assertIncludes(repository, "sourceActionId: \"visit-meeting-quick-note-writeback-bridge\"", "bridge carries stable source action id");
  assertIncludes(repository, "status: \"summary_required\"", "bridge requires persisted summary before writeback");
  assertIncludes(repository, "targetSurface: \"/pre-visit/[planId]/meeting\"", "bridge points to accepted meeting workspace surface");
  assertIncludes(repository, "summaryEndpointPattern: \"/api/ai/meeting/sessions/[sessionId]/summary\"", "bridge references summary endpoint pattern");
  assertIncludes(repository, "writebackEndpointPattern: \"/api/ai/meeting/sessions/[sessionId]/writebacks\"", "bridge references writeback endpoint pattern");
  assertIncludes(repository, "advisorConfirmationRequired: true", "bridge requires advisor confirmation");
  assertIncludes(repository, "reasonRiskAcceptedForSensitive: true", "bridge preserves sensitive confirmation boundary");
  assertIncludes(repository, "directCrmWriteDisabled: true", "bridge disables direct CRM fact writes");
  assertIncludes(repository, "writesConfirmedCrmFact: false", "bridge proves no confirmed CRM fact write");
  assertIncludes(repository, "browserSuppliedSessionId: false", "bridge proves session id was not browser supplied");
  assertIncludes(repository, "storesRawProviderPayload: false", "bridge proves no raw provider payload storage");
  assertNotIncludes(repository, "OpenAI", "bridge repository has no provider import");
  assertNotIncludes(repository, "Anthropic", "bridge repository has no provider import");

  assertIncludes(notesPage, "post-visit-meeting-writeback-bridge", "notes page displays quick-note writeback bridge");
  assertIncludes(notesPage, "meetingQuickNoteResult.writebackBridge.acceptedWorkspaceHref", "notes page links to accepted meeting workspace");
  assertIncludes(notesPage, "CRM fact: no direct write", "notes page shows no direct CRM fact write boundary");

  assertIncludes(meetingWorkspace, "meeting-writeback-panel", "meeting workspace owns writeback panel");
  assertIncludes(meetingWorkspace, "/writebacks", "meeting workspace calls writeback endpoint");
  assertIncludes(meetingWorkspace, "先生成摘要", "meeting workspace still shows summary-required state");

  assertIncludes(manifest, "meeting-visit-quick-note-writeback-bridge", "AgentFacts manifest declares bridge capability");
  assertIncludes(manifest, "append-visit-meeting-quick-note-to-writeback", "AgentFacts manifest declares bridge action");
  assertIncludes(manifest, "VisitMeetingQuickNoteWritebackBridgeDto", "AgentFacts manifest cites bridge DTO");
  assertIncludes(manifest, "post-visit-meeting-writeback-bridge", "AgentFacts manifest cites bridge UI evidence");
  assertIncludes(manifest, "pnpm meeting:quick-note-writeback-bridge-qa", "AgentFacts manifest advertises bridge proof command");

  assertIncludes(registryQa, "assertMeetingQuickNoteWritebackBridge", "registry QA checks quick-note writeback bridge");
  assertIncludes(packageJson, "\"meeting:quick-note-writeback-bridge-qa\"", "package.json registers bridge proof command");
}

function readSource(path) {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(source, pattern, label) {
  push(source.includes(pattern), label, pattern);
}

function assertNotIncludes(source, pattern, label) {
  push(!source.includes(pattern), label, pattern);
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
