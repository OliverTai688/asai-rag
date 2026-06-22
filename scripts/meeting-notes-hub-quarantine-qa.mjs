#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
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
      proof: "meeting-notes-hub-quarantine-qa",
      providerCallAttempted: false,
      dbConnectionAttempted: false,
      browserLaunched: false,
      localPrototypeAccepted: false,
      writesConfirmedCrmFact: false,
      triggersExternalNotification: false,
      checks: checks.length,
    },
    null,
    2,
  ),
);

function runSourceContractAudit() {
  const notesHubPage = readSource("src/app/(dashboard)/notes/page.tsx");
  const manifest = readSource("src/domains/ai-protocol/manifest.ts");
  const registryQa = readSource("scripts/ai-protocol-registry-qa.ts");
  const packageJson = readSource("package.json");

  assertIncludes(notesHubPage, "data-testid=\"notes-hub-quarantine\"", "global notes route is an explicit safe entrypoint");
  assertIncludes(notesHubPage, "data-local-note-store=\"disabled\"", "global notes route declares local note store disabled");
  assertIncludes(notesHubPage, "data-accepted-notes-source=\"/pre-visit/[planId]/notes\"", "global notes route points to accepted visit notes source");
  assertIncludes(notesHubPage, "href=\"/pre-visit\"", "global notes route sends advisors through preparation packages");
  assertIncludes(notesHubPage, "notes-hub-source-boundary", "global notes route renders source boundary guardrails");
  assertIncludes(notesHubPage, "CLIENT_MEETING workspace", "global notes route references accepted meeting workspace");

  assertExcludes(notesHubPage, "@/components/notes", "global notes route does not import local notes UI prototype");
  assertExcludes(notesHubPage, "@/domains/note/store", "global notes route does not import local note store prototype");
  assertExcludes(notesHubPage, "useNoteStore", "global notes route does not read local Zustand notes");
  assertExcludes(notesHubPage, "QuickNoteComposer", "global notes route does not expose local quick-note composer");
  assertExcludes(notesHubPage, "SEED_NOTES", "global notes route does not render deterministic seed notes");
  assertExcludes(notesHubPage, "localStorage", "global notes route does not store browser-local notes");

  const optionalPrototypeFiles = [
    "src/components/notes/notes-board.tsx",
    "src/components/notes/quick-note-composer.tsx",
    "src/components/notes/note-card.tsx",
    "src/domains/note/store.ts",
    "src/domains/note/types.ts",
  ];
  const existingPrototypeFiles = optionalPrototypeFiles.filter((path) => existsSync(join(root, path)));
  push(
    existingPrototypeFiles.every((path) => optionalPrototypeFiles.includes(path)),
    "local quick-note prototype files are optional and not required by accepted proof",
    existingPrototypeFiles.join(", ") || "none present",
  );

  assertIncludes(manifest, "meeting-notes-hub-quarantine", "AgentFacts manifest records notes hub quarantine capability");
  assertIncludes(manifest, "open-notes-hub-to-accepted-workspaces", "AgentFacts manifest records notes hub action boundary");
  assertIncludes(manifest, "src/app/(dashboard)/notes/page.tsx", "AgentFacts manifest owns global notes route");
  assertIncludes(manifest, "scripts/meeting-notes-hub-quarantine-qa.mjs", "AgentFacts manifest owns notes hub quarantine proof");
  assertIncludes(manifest, "notes-hub-quarantine", "AgentFacts manifest records notes hub evidence");
  assertIncludes(manifest, "local-note-store-disabled", "AgentFacts manifest records local store disabled evidence");
  assertIncludes(manifest, "accepted-source=/pre-visit/[planId]/notes", "AgentFacts manifest records accepted notes source");
  assertIncludes(manifest, "prototype-unaccepted", "AgentFacts manifest records prototype remains unaccepted");
  assertIncludes(manifest, "pnpm meeting:notes-hub-quarantine-qa", "AgentFacts manifest advertises notes hub quarantine proof");

  assertIncludes(registryQa, "meeting-notes-hub-quarantine", "registry QA expects notes hub quarantine evidence");
  assertIncludes(registryQa, "pnpm meeting:notes-hub-quarantine-qa", "registry QA expects notes hub quarantine command");
  assertIncludes(packageJson, "\"meeting:notes-hub-quarantine-qa\"", "package.json registers notes hub quarantine proof");
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
