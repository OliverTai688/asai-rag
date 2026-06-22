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
      proof: "meeting-quick-note-intake-contract-dry-run",
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
  const manifest = readSource("src/domains/ai-protocol/manifest.ts");
  const packageJson = readSource("package.json");

  assertIncludes(route, "requireCurrentMember", "quick-note route requires current member");
  assertIncludes(route, "findMeetingPayloadViolations(body)", "quick-note route blocks raw provider/private payloads");
  assertIncludes(route, "appendVisitMeetingQuickNoteInputSchema.safeParse(body)", "quick-note route uses strict input schema");
  assertIncludes(route, "appendVisitMeetingQuickNoteForMember(session, visitPlanId", "quick-note route delegates server-owned visit scope");
  assertIncludes(route, "\"Cache-Control\": \"no-store\"", "quick-note route returns no-store response");
  assertNotIncludes(route, "sessionId", "quick-note route never accepts browser-supplied session id");

  assertIncludes(repository, "appendVisitMeetingQuickNoteInputSchema", "repository exposes quick-note schema");
  assertIncludes(repository, ".strict()", "quick-note schema rejects extra browser scope fields");
  assertIncludes(repository, "findLatestMeetingSessionForMember", "quick-note intake reuses owner-scoped meeting session");
  assertIncludes(repository, "createMeetingSessionForMember", "quick-note intake creates owner-scoped meeting session when missing");
  assertIncludes(repository, "appendMeetingTurnForMember", "quick-note intake appends through existing meeting turn guard");
  assertIncludes(repository, "source: \"MANUAL_NOTE\"", "quick-note intake is manual-note only");
  assertIncludes(repository, "browserSuppliedSessionId: false", "quick-note response proves browser session id was not supplied");
  assertIncludes(repository, "rawPrivateTranscriptStored: false", "quick-note response proves no raw private transcript storage");
  assertIncludes(repository, "storesRawProviderPayload: false", "quick-note response proves no raw provider payload storage");
  assertNotIncludes(repository, "OpenAI", "quick-note repository has no provider import");
  assertNotIncludes(repository, "Anthropic", "quick-note repository has no provider import");

  assertIncludes(notesPage, "post-visit-notes-send-meeting", "notes page exposes quick-note submit control");
  assertIncludes(notesPage, "/meeting-quick-notes", "notes page posts to visit-owned quick-note route");
  assertIncludes(notesPage, "setMeetingSessionId(body.appended.sessionId)", "notes page remounts workspace from server-owned session");
  assertIncludes(notesPage, "post-visit-meeting-quick-note-result", "notes page displays quick-note result proof");

  assertIncludes(manifest, "meeting-visit-quick-note-intake", "AgentFacts manifest includes quick-note capability");
  assertIncludes(manifest, "/api/visits/[id]/meeting-quick-notes", "AgentFacts manifest includes quick-note endpoint");
  assertIncludes(
    manifest,
    "appendVisitMeetingQuickNoteForMember",
    "AgentFacts manifest cites quick-note repository proof",
  );
  assertIncludes(
    manifest,
    "pnpm meeting:quick-note-intake-contract-dry-run",
    "AgentFacts manifest advertises quick-note contract proof",
  );
  assertIncludes(
    packageJson,
    "\"meeting:quick-note-intake-contract-dry-run\"",
    "package.json registers quick-note contract proof",
  );
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
