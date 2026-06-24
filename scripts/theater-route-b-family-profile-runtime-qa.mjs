#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  nextTurn: "src/domains/theater/route-b-next-turn.ts",
  providerPromptContext: "src/domains/theater/route-b-provider-prompt-context.ts",
  nextTurnProvider: "src/domains/theater/route-b-next-turn-provider.ts",
  sessionPage: "src/app/(dashboard)/theater/[sessionId]/page.tsx",
  manifest: "src/domains/ai-protocol/manifest.ts",
  registryQa: "scripts/ai-protocol-registry-qa.ts",
  uiQa: "scripts/theater-route-b-next-turn-ui-contract-qa.mjs",
  packageJson: "package.json",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(root, file), "utf8")]),
);
const checks = [];

expect(
  "Route B next-turn draft builds least-disclosure family profile runtime grounding",
  source.nextTurn.includes("TheaterRouteBFamilyProfileRuntimeGrounding") &&
    source.nextTurn.includes("buildFamilyProfileRuntimeGrounding") &&
    source.nextTurn.includes("RouteBSessionSnapshot.scene.sourceGrounding.familyProfiles") &&
    source.nextTurn.includes("providerPromptUsage: \"family-profile-context-only\"") &&
    source.nextTurn.includes("rawMetadataIncluded: false") &&
    source.nextTurn.includes("sourceReferenceIdsIncluded: false") &&
    source.nextTurn.includes("writesRelationshipGraph: false") &&
    source.nextTurn.includes("writesVisitPlan: false") &&
    source.nextTurn.includes("writesConfirmedCrmFact: false"),
);
expect(
  "Route B next-turn draft consumes persisted session source grounding",
  source.nextTurn.includes("familyProfileGrounding: buildFamilyProfileRuntimeGrounding(") &&
    source.nextTurn.includes("handoff.scene.sourceGrounding?.familyProfiles"),
);
expect(
  "Provider prompt context exposes family profile runtime evidence rule",
  source.providerPromptContext.includes("familyProfileGrounding?: TheaterRouteBFamilyProfileRuntimeGrounding") &&
    source.providerPromptContext.includes("familyProfileGrounding: TheaterRouteBFamilyProfileRuntimeGrounding") &&
    source.providerPromptContext.includes("useFamilyProfilesAsRuntimeEvidence: true") &&
    source.providerPromptContext.includes("buildEmptyFamilyProfileGrounding") &&
    source.providerPromptContext.includes("RouteBSessionSnapshot.scene.sourceGrounding.familyProfiles"),
);
expect(
  "Next-turn provider input forwards family profile context into provider prompt context",
  source.nextTurnProvider.includes("familyProfileGrounding: draft.inputSummary.familyProfileGrounding"),
);
expect(
  "Route B session UI renders compact family profile runtime grounding panel",
  source.sessionPage.includes("data-route-b-next-turn-family-profile-runtime-grounding") &&
    source.sessionPage.includes("RouteBNextTurnFamilyProfileRuntimeGroundingPanel") &&
    source.sessionPage.includes("familyProfileRuntimeGrounding?.usedInNextTurnRuntime") &&
    source.sessionPage.includes("Raw metadata") &&
    source.sessionPage.includes("Source refs") &&
    source.sessionPage.includes("Graph write") &&
    source.sessionPage.includes("VisitPlan write") &&
    source.sessionPage.includes("CRM fact write"),
);
expect(
  "Family profile runtime UI panel does not render raw source internals",
  !panelSource().match(/\bstageFieldId\b|\bsourceReferenceIds\.map\b|\bsourceRefs\b|\brawProviderPayload\b|\brawPrivateTranscript\b|\bpolicyNumber\b/),
);
expect(
  "AgentFacts manifest and registry QA include family profile runtime refs",
  source.manifest.includes("route-b-family-profile-runtime-grounding") &&
    source.manifest.includes("TheaterRouteBNextTurnDraft.inputSummary.familyProfileGrounding") &&
    source.manifest.includes("RouteBProviderPromptContext.familyProfileGrounding") &&
    source.manifest.includes("RouteBProviderPromptContext.promptRules.useFamilyProfilesAsRuntimeEvidence=true") &&
    source.manifest.includes("data-route-b-next-turn-family-profile-runtime-grounding") &&
    source.manifest.includes("pnpm theater:route-b-family-profile-runtime-qa") &&
    source.registryQa.includes("TheaterRouteBNextTurnDraft.inputSummary.familyProfileGrounding") &&
    source.registryQa.includes("RouteBProviderPromptContext.promptRules.useFamilyProfilesAsRuntimeEvidence=true"),
);
expect(
  "Package script and UI contract QA expose family profile runtime proof",
  source.packageJson.includes("\"theater:route-b-family-profile-runtime-qa\"") &&
    source.uiQa.includes("data-route-b-next-turn-family-profile-runtime-grounding"),
);

run("pnpm", ["theater:route-b-next-turn-dry-run"]);
run("pnpm", ["theater:route-b-provider-prompt-context-dry-run"]);
run("pnpm", ["theater:route-b-next-turn-ui-contract-qa"]);
run("pnpm", ["theater:family-profile-session-source-qa"]);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}`);
}

console.log(
  JSON.stringify(
    {
      proof: {
        providerCallAttempted: false,
        aiUsageLogWritten: false,
        rawMetadataIncluded: false,
        sourceReferenceIdsIncluded: false,
        rawPrivateTranscriptIncluded: false,
        rawProviderPayloadIncluded: false,
        relationshipGraphWriteAttempted: false,
        visitPlanWriteAttempted: false,
        writesConfirmedCrmFact: false,
      },
    },
    null,
    2,
  ),
);

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function expect(label, condition) {
  checks.push({ label, status: condition ? "pass" : "fail" });
  assert.equal(condition, true, label);
}

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function panelSource() {
  return (
    source.sessionPage
      .split("function RouteBNextTurnFamilyProfileRuntimeGroundingPanel")[1]
      ?.split("function routeBFamilyProfileRuntimeStatusLabel")[0] ?? ""
  );
}
