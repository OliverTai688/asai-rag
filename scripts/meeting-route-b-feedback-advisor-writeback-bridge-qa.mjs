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
      proof: "meeting-route-b-feedback-advisor-writeback-bridge-qa",
      providerCallAttempted: false,
      dbConnectionAttempted: false,
      browserLaunched: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesClientProfile: false,
      writesPolicy: false,
      writesConfirmedCrmFact: false,
      checks: checks.length,
    },
    null,
    2,
  ),
);

function runSourceContractAudit() {
  const bridge = readSource("src/domains/interview/meeting-route-b-feedback-advisor-writeback-bridge.ts");
  const meetingWorkspace = readSource("src/components/meeting/meeting-workspace.tsx");
  const manifest = readSource("src/domains/ai-protocol/manifest.ts");
  const registryQa = readSource("scripts/ai-protocol-registry-qa.ts");
  const packageJson = readSource("package.json");

  assertIncludes(
    bridge,
    "buildMeetingRouteBFeedbackAdvisorWritebackBridge",
    "domain helper builds the feedback advisor writeback preview bridge",
  );
  assertIncludes(bridge, "READY_FOR_ADVISOR_REVIEW", "bridge has an explicit ready-for-review status");
  assertIncludes(bridge, "SUMMARY_REQUIRED", "bridge blocks writeback preview until a persisted meeting summary exists");
  assertIncludes(bridge, "MEETING_WRITEBACK_PREVIEW_CONTEXT", "bridge targets meeting writeback preview context only");
  assertIncludes(bridge, "providerCallAttempted: false", "bridge is deterministic no-provider");
  assertIncludes(bridge, "aiUsageLogRequired: false", "bridge does not fake AiUsageLog for no-provider work");
  assertIncludes(bridge, "writesRelationshipGraph: false", "bridge does not write relationship graph");
  assertIncludes(bridge, "writesVisitPlan: false", "bridge does not write VisitPlan");
  assertIncludes(bridge, "writesClientProfile: false", "bridge does not write client profile");
  assertIncludes(bridge, "writesPolicy: false", "bridge does not write policy");
  assertIncludes(bridge, "writesConfirmedCrmFact: false", "bridge does not write confirmed CRM fact");
  assertIncludes(bridge, "returnsSourcePacketId: false", "bridge does not return source packet id");
  assertIncludes(bridge, "returnsRawTheaterSessionId: false", "bridge does not return theater session id");
  assertIncludes(bridge, "returnsRawPersonId: false", "bridge does not return person id");

  assertIncludes(
    meetingWorkspace,
    "buildMeetingRouteBFeedbackAdvisorWritebackBridge",
    "workspace consumes the feedback advisor bridge helper",
  );
  assertIncludes(
    meetingWorkspace,
    "data-testid=\"meeting-route-b-feedback-advisor-writeback-bridge\"",
    "workspace renders feedback advisor writeback preview bridge panel",
  );
  assertIncludes(
    meetingWorkspace,
    "MEETING_WRITEBACK_PREVIEW_CONTEXT",
    "workspace labels the bridge as writeback preview context",
  );
  assertIncludes(meetingWorkspace, "persisted summary required", "workspace communicates summary prerequisite");
  assertIncludes(meetingWorkspace, "advisor confirmation required", "workspace communicates advisor confirmation");
  assertIncludes(meetingWorkspace, "provider: none", "workspace communicates no-provider posture");
  assertIncludes(meetingWorkspace, "AiUsageLog: no-provider", "workspace communicates no fake usage log");
  assertIncludes(meetingWorkspace, "relationship graph: none", "workspace communicates no graph write");
  assertIncludes(meetingWorkspace, "VisitPlan write: none", "workspace communicates no VisitPlan write");
  assertIncludes(meetingWorkspace, "client profile: none", "workspace communicates no client profile write");
  assertIncludes(meetingWorkspace, "policy: none", "workspace communicates no policy write");
  assertIncludes(meetingWorkspace, "CRM fact: no direct write", "workspace communicates no direct CRM fact write");
  assertExcludes(meetingWorkspace, "sourceTheaterSessionId", "workspace does not receive or render source theater session id");
  assertExcludes(meetingWorkspace, "sourcePersonId", "workspace does not receive or render source person id");
  assertExcludes(meetingWorkspace, "sourcePacketId", "workspace does not receive or render route-b source packet id");

  assertIncludes(
    manifest,
    "meeting-route-b-feedback-advisor-writeback-bridge",
    "AgentFacts manifest records feedback advisor writeback bridge capability",
  );
  assertIncludes(
    manifest,
    "route-b-feedback-advisor-writeback-preview-bridge",
    "AgentFacts manifest records feedback advisor writeback preview bridge action",
  );
  assertIncludes(
    manifest,
    "MeetingRouteBFeedbackAdvisorWritebackBridge",
    "AgentFacts manifest records feedback advisor bridge DTO",
  );
  assertIncludes(
    manifest,
    "pnpm meeting:route-b-feedback-advisor-writeback-bridge-qa",
    "AgentFacts manifest advertises feedback advisor bridge proof command",
  );
  assertIncludes(
    registryQa,
    "assertMeetingRouteBFeedbackAdvisorWritebackBridge",
    "registry QA enforces feedback advisor writeback bridge evidence",
  );
  assertIncludes(
    registryQa,
    "pnpm meeting:route-b-feedback-advisor-writeback-bridge-qa",
    "registry QA expects feedback advisor bridge proof command",
  );
  assertIncludes(
    packageJson,
    "\"meeting:route-b-feedback-advisor-writeback-bridge-qa\"",
    "package.json registers feedback advisor bridge proof command",
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
