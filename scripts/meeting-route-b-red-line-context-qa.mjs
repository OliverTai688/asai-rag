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
      proof: "meeting-route-b-red-line-context-qa",
      providerCallAttempted: false,
      dbConnectionAttempted: false,
      browserLaunched: false,
      writesConfirmedCrmFact: false,
      triggersExternalNotification: false,
      checks: checks.length,
    },
    null,
    2,
  ),
);

function runSourceContractAudit() {
  const notesPage = readSource("src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx");
  const meetingWorkspace = readSource("src/components/meeting/meeting-workspace.tsx");
  const visitRoute = readSource("src/app/api/visits/[id]/route-b-red-line-context/route.ts");
  const visitRepository = readSource("src/lib/visits/route-b-red-line-context-repository.ts");
  const manifest = readSource("src/domains/ai-protocol/manifest.ts");
  const registryQa = readSource("scripts/ai-protocol-registry-qa.ts");
  const packageJson = readSource("package.json");

  assertIncludes(notesPage, "/route-b-red-line-context", "notes page loads owner-scoped Route B red-line context BFF");
  assertIncludes(notesPage, "type VisitRouteBRedLineContextResponse = MeetingRouteBRedLineContextDto", "notes page narrows BFF DTO to meeting-safe context");
  assertIncludes(notesPage, "setRouteBRedLineContext({", "notes page maps only safe context fields before passing to workspace");
  assertIncludes(notesPage, "routeBRedLineContext={shouldLoadRouteBRedLineContext ? routeBRedLineContext : null}", "notes page passes red-line context into MeetingWorkspace");
  assertIncludes(notesPage, "routeBRedLineContextLoading={shouldLoadRouteBRedLineContext && isRouteBRedLineContextLoading}", "notes page exposes loading state without raw ID entry");

  assertIncludes(meetingWorkspace, "export interface MeetingRouteBRedLineContextDto", "workspace declares meeting-safe red-line context DTO");
  assertIncludes(meetingWorkspace, "buildRouteBRedLineNoteDraft", "workspace folds red-line context into manual note draft");
  assertIncludes(meetingWorkspace, "mergeInitialNoteDraft", "workspace preserves existing postVisitNotes while appending red-line reminders");
  assertIncludes(meetingWorkspace, "data-testid=\"meeting-route-b-red-line-context\"", "workspace renders Route B red-line context panel");
  assertIncludes(meetingWorkspace, "不顯示劇場 session 或人物 raw ID", "workspace explains raw ID suppression");
  assertIncludes(meetingWorkspace, "provider: none", "workspace communicates no-provider posture");
  assertIncludes(meetingWorkspace, "notification: none", "workspace communicates no external notification");
  assertIncludes(meetingWorkspace, "formal finding: none", "workspace communicates no formal compliance finding");
  assertExcludes(meetingWorkspace, "sourceTheaterSessionId", "workspace does not receive or render source theater session id");
  assertExcludes(meetingWorkspace, "sourceFeedbackReviewId", "workspace does not receive or render source feedback review id");
  assertExcludes(meetingWorkspace, "sourcePacketId", "workspace does not receive or render route-b source packet id");

  assertIncludes(visitRoute, "getVisitRouteBRedLineContextForMember", "visit route delegates owner-scoped context lookup");
  assertIncludes(visitRepository, "browserSuppliedTheaterSessionId: false", "BFF proof rejects browser supplied theater session id");
  assertIncludes(visitRepository, "browserSuppliedPersonId: false", "BFF proof rejects browser supplied person id");
  assertIncludes(visitRepository, "providerCallAttempted: false", "BFF proof remains no-provider");
  assertIncludes(visitRepository, "writesConfirmedCrmFact: false", "BFF proof does not write confirmed CRM fact");

  assertIncludes(manifest, "meeting-route-b-red-line-context-consumption", "AgentFacts manifest records meeting red-line context capability");
  assertIncludes(manifest, "pnpm meeting:route-b-red-line-context-qa", "AgentFacts manifest advertises meeting Route B red-line context proof");
  assertIncludes(registryQa, "meeting-route-b-red-line-context-consumption", "registry QA expects meeting red-line context evidence");
  assertIncludes(registryQa, "pnpm meeting:route-b-red-line-context-qa", "registry QA expects meeting Route B red-line context command");
  assertIncludes(packageJson, "\"meeting:route-b-red-line-context-qa\"", "package.json registers meeting Route B red-line context proof");
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
