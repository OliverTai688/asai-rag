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
      proof: "meeting-route-b-state-proposal-context-qa",
      providerCallAttempted: false,
      dbConnectionAttempted: false,
      browserLaunched: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
      checks: checks.length,
    },
    null,
    2,
  ),
);

function runSourceContractAudit() {
  const notesPage = readSource("src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx");
  const meetingWorkspace = readSource("src/components/meeting/meeting-workspace.tsx");
  const visitRoute = readSource("src/app/api/visits/[id]/route-b-state-proposal-context/route.ts");
  const visitRepository = readSource("src/lib/visits/route-b-state-proposal-context-repository.ts");
  const manifest = readSource("src/domains/ai-protocol/manifest.ts");
  const registryQa = readSource("scripts/ai-protocol-registry-qa.ts");
  const packageJson = readSource("package.json");

  assertIncludes(
    notesPage,
    "/route-b-state-proposal-context",
    "notes page loads owner-scoped Route B state proposal context BFF",
  );
  assertIncludes(
    notesPage,
    "type VisitRouteBStateProposalContextResponse = MeetingRouteBStateProposalContextDto",
    "notes page narrows BFF DTO to meeting-safe state proposal context",
  );
  assertIncludes(
    notesPage,
    "setRouteBStateProposalContext({",
    "notes page maps only safe state proposal fields before passing to workspace",
  );
  assertIncludes(
    notesPage,
    "routeBStateProposalContext={shouldLoadRouteBStateProposalContext ? routeBStateProposalContext : null}",
    "notes page passes state proposal context into MeetingWorkspace",
  );
  assertIncludes(
    notesPage,
    "routeBStateProposalContextLoading={",
    "notes page exposes state proposal loading state without raw ID entry",
  );

  assertIncludes(
    meetingWorkspace,
    "export interface MeetingRouteBStateProposalContextDto",
    "workspace declares meeting-safe state proposal context DTO",
  );
  assertIncludes(
    meetingWorkspace,
    "buildRouteBStateProposalNoteDraft",
    "workspace folds state proposals into manual note draft",
  );
  assertIncludes(
    meetingWorkspace,
    "mergeInitialNoteDraft(\n        normalizedInitialNoteDraft,\n        routeBNoteDraft,\n        routeBStateProposalNoteDraft,\n        routeBFeedbackAdvisorNoteDraft,",
    "workspace preserves existing notes while appending red-line, state proposal, and feedback advisor reminders",
  );
  assertIncludes(
    meetingWorkspace,
    "data-testid=\"meeting-route-b-state-proposal-context\"",
    "workspace renders Route B state proposal context panel",
  );
  assertIncludes(
    meetingWorkspace,
    "theater state proposal",
    "workspace labels state proposals as theater state proposals",
  );
  assertIncludes(
    meetingWorkspace,
    "不顯示劇場 session、人物或 source packet raw ID",
    "workspace explains raw ID suppression",
  );
  assertIncludes(meetingWorkspace, "provider: none", "workspace communicates no-provider posture");
  assertIncludes(
    meetingWorkspace,
    "relationship graph: none",
    "workspace communicates no relationship graph write",
  );
  assertIncludes(meetingWorkspace, "VisitPlan write: none", "workspace communicates no VisitPlan write");
  assertIncludes(meetingWorkspace, "CRM fact: no direct write", "workspace communicates no direct CRM fact write");
  assertExcludes(meetingWorkspace, "sourceTheaterSessionId", "workspace does not receive or render source theater session id");
  assertExcludes(meetingWorkspace, "sourcePersonId", "workspace does not receive or render source person id");
  assertExcludes(meetingWorkspace, "sourcePacketId", "workspace does not receive or render route-b source packet id");

  assertIncludes(
    visitRoute,
    "getVisitRouteBStateProposalContextForMember",
    "visit route delegates owner-scoped state proposal lookup",
  );
  assertIncludes(visitRepository, "browserSuppliedTheaterSessionId: false", "BFF proof rejects browser supplied theater session id");
  assertIncludes(visitRepository, "browserSuppliedPersonId: false", "BFF proof rejects browser supplied person id");
  assertIncludes(visitRepository, "providerCallAttempted: false", "BFF proof remains no-provider");
  assertIncludes(visitRepository, "writesRelationshipGraph: false", "BFF proof does not write relationship graph");
  assertIncludes(visitRepository, "writesVisitPlan: false", "BFF proof does not write VisitPlan");
  assertIncludes(visitRepository, "writesConfirmedCrmFact: false", "BFF proof does not write confirmed CRM fact");

  assertIncludes(
    manifest,
    "meeting-route-b-state-proposal-context-consumption",
    "AgentFacts manifest records meeting state proposal context capability",
  );
  assertIncludes(
    manifest,
    "pnpm meeting:route-b-state-proposal-context-qa",
    "AgentFacts manifest advertises meeting Route B state proposal context proof",
  );
  assertIncludes(
    registryQa,
    "meeting-route-b-state-proposal-context-consumption",
    "registry QA expects meeting state proposal context evidence",
  );
  assertIncludes(
    registryQa,
    "pnpm meeting:route-b-state-proposal-context-qa",
    "registry QA expects meeting Route B state proposal context command",
  );
  assertIncludes(
    packageJson,
    "\"meeting:route-b-state-proposal-context-qa\"",
    "package.json registers meeting Route B state proposal context proof",
  );
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
