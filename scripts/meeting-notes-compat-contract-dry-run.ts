import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  readMeetingSessionMetadataVisitPlanId,
  selectLatestMeetingSessionCandidate,
} from "../src/domains/interview/meeting-session-lookup";

interface ContractCheck {
  label: string;
  status: "pass" | "fail";
  detail?: string;
}

const root = process.cwd();
const checks: ContractCheck[] = [];

runLatestSessionLookupProof();
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
      proof: "meeting-notes-compat-contract-dry-run",
      providerCallAttempted: false,
      dbConnectionAttempted: false,
      browserLaunched: false,
      checks: checks.length,
    },
    null,
    2,
  ),
);

function runLatestSessionLookupProof() {
  const candidates = [
    {
      id: "direct-client-meeting-latest",
      metadata: {
        source: "meeting_capture_bff",
        visitPlanId: null,
      },
    },
    {
      id: "visit-plan-meeting-latest",
      metadata: {
        source: "meeting_capture_bff",
        visitPlanId: "visit-plan-001",
      },
    },
    {
      id: "visit-plan-meeting-older",
      metadata: {
        source: "meeting_capture_bff",
        visitPlanId: "visit-plan-001",
      },
    },
    {
      id: "foreign-visit-plan-meeting",
      metadata: {
        source: "meeting_capture_bff",
        visitPlanId: "visit-plan-foreign",
      },
    },
    {
      id: "legacy-null-metadata-meeting",
      metadata: null,
    },
  ];

  const visitMatch = selectLatestMeetingSessionCandidate(candidates, { visitPlanId: "visit-plan-001" });
  assertEquals(
    visitMatch?.id,
    "visit-plan-meeting-latest",
    "latest lookup selects first matching visit-scoped CLIENT_MEETING",
  );

  const directMatch = selectLatestMeetingSessionCandidate(candidates, { visitPlanId: null });
  assertEquals(
    directMatch?.id,
    "direct-client-meeting-latest",
    "client-direct lookup selects sessions without visitPlanId metadata",
  );

  const missingMatch = selectLatestMeetingSessionCandidate(candidates, { visitPlanId: "visit-plan-missing" });
  assertEquals(missingMatch, null, "latest lookup returns null when visitPlanId has no owner-scoped candidate");

  assertEquals(
    readMeetingSessionMetadataVisitPlanId({ visitPlanId: "visit-plan-001" }),
    "visit-plan-001",
    "metadata reader accepts non-empty visitPlanId",
  );
  assertEquals(
    readMeetingSessionMetadataVisitPlanId({ visitPlanId: "   " }),
    null,
    "metadata reader treats blank visitPlanId as client-direct",
  );
  assertEquals(readMeetingSessionMetadataVisitPlanId(null), null, "metadata reader tolerates null metadata");
}

function runSourceContractAudit() {
  const notesPage = readSource("src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx");
  const meetingWorkspace = readSource("src/components/meeting/meeting-workspace.tsx");
  const sessionsRoute = readSource("src/app/api/ai/meeting/sessions/route.ts");
  const sessionRepository = readSource("src/lib/interview/meeting-session-repository.ts");
  const manifest = readSource("src/domains/ai-protocol/manifest.ts");
  const packageJson = readSource("package.json");

  assertIncludes(notesPage, "data-testid=\"notes-meeting-bridge\"", "notes page exposes bridge test id");
  assertIncludes(notesPage, "data-testid=\"post-visit-notes-textarea\"", "notes page keeps legacy postVisitNotes editor");
  assertIncludes(notesPage, "data-testid=\"post-visit-notes-saved-state\"", "notes page keeps legacy saved-state proof");
  assertIncludes(notesPage, "<MeetingWorkspace", "notes page embeds accepted MeetingWorkspace");
  assertIncludes(notesPage, "initialNoteDraft={notes}", "notes page seeds processed notes text into meeting draft");
  assertIncludes(notesPage, "preferExistingSession", "notes page asks meeting workspace to reuse existing session");

  assertIncludes(meetingWorkspace, "type MeetingSessionLatestResponse", "workspace has latest-session response contract");
  assertIncludes(meetingWorkspace, "preferExistingSession", "workspace supports existing-session preference");
  assertIncludes(meetingWorkspace, "readLatestMeetingSession", "workspace calls latest-session lookup before create");
  assertIncludes(meetingWorkspace, "normalizeInitialNoteDraft", "workspace normalizes initial note draft");

  assertIncludes(sessionsRoute, "export async function GET", "meeting sessions route exposes no-provider latest lookup");
  assertIncludes(sessionsRoute, "MEETING_SESSION_SCOPE_REQUIRED", "latest lookup rejects missing client/visit scope");
  assertIncludes(sessionsRoute, "findMeetingPayloadViolations(input)", "latest lookup keeps payload guard");
  assertIncludes(sessionsRoute, "findLatestMeetingSessionForMember", "latest lookup delegates to repository scope guard");

  assertIncludes(
    sessionRepository,
    "selectLatestMeetingSessionCandidate",
    "repository uses pure latest-session candidate selector",
  );
  assertIncludes(
    sessionRepository,
    "findMeetingPayloadViolations",
    "repository keeps raw provider/private payload guard",
  );

  assertIncludes(manifest, "meeting-notes-compat-bridge", "AgentFacts manifest keeps notes bridge capability");
  assertIncludes(
    manifest,
    "pnpm meeting:notes-compat-contract-dry-run",
    "AgentFacts manifest advertises no-DB contract fallback proof",
  );
  assertIncludes(
    packageJson,
    "\"meeting:notes-compat-contract-dry-run\"",
    "package.json registers no-DB contract fallback command",
  );
  assertIncludes(packageJson, "\"meeting:notes-compat-qa\"", "package.json keeps full browser/API/DB proof command");
}

function readSource(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(source: string, pattern: string, label: string) {
  push(source.includes(pattern), label, pattern);
}

function assertEquals<T>(actual: T, expected: T, label: string) {
  push(Object.is(actual, expected), label, `expected=${String(expected)} actual=${String(actual)}`);
}

function push(condition: boolean, label: string, detail?: string) {
  checks.push({
    label,
    status: condition ? "pass" : "fail",
    detail,
  });
}
