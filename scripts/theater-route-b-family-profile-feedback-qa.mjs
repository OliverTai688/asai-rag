#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  feedback: "src/domains/theater/route-b-feedback.ts",
  feedbackProvider: "src/domains/theater/route-b-feedback-provider.ts",
  feedbackReview: "src/domains/theater/route-b-feedback-review.ts",
  sessionPage: "src/app/(dashboard)/theater/[sessionId]/page.tsx",
  manifest: "src/domains/ai-protocol/manifest.ts",
  registryQa: "scripts/ai-protocol-registry-qa.ts",
  feedbackUiQa: "scripts/theater-route-b-feedback-review-ui-contract-qa.mjs",
  packageJson: "package.json",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(root, file), "utf8")]),
);
const checks = [];

expect(
  "Route B feedback contract builds least-disclosure family profile grounding",
  source.feedback.includes("TheaterRouteBFeedbackFamilyProfileGrounding") &&
    source.feedback.includes("buildFamilyProfileFeedbackGrounding") &&
    source.feedback.includes("buildFamilyProfileRuntimeGrounding(source)") &&
    source.feedback.includes("options.handoff.scene.sourceGrounding?.familyProfiles") &&
    source.feedback.includes('providerPromptUsage: "family-profile-feedback-context-only"') &&
    source.feedback.includes("...runtimeGrounding.boundary") &&
    source.feedback.includes("writesClientProfile: false") &&
    source.feedback.includes("writesPolicy: false") &&
    source.feedback.includes("factStatusCounts: runtimeGrounding.factStatusCounts"),
);
expect(
  "Feedback provider input forwards family profile grounding into prompt context",
  source.feedbackProvider.includes("familyProfileGrounding: toRuntimeFamilyProfilePromptGrounding(contract.familyProfileGrounding)") &&
    source.feedbackProvider.includes("family profile unknown fields") &&
    source.feedbackProvider.includes('providerPromptUsage: "family-profile-context-only"'),
);
expect(
  "Feedback review writes feedback-specific family profile evidence",
  source.feedbackReview.includes("familyProfileGrounding: TheaterRouteBFeedbackFamilyProfileGrounding") &&
    source.feedbackReview.includes("buildFamilyProfileFeedbackGrounding(options.snapshot.scene.sourceGrounding?.familyProfiles)") &&
    source.feedbackReview.includes('"family-profile-grounding"') &&
    source.feedbackReview.includes("家族人物 profile 已確認欄位數") &&
    source.feedbackReview.includes("persistenceEnvelope.writesClientProfile") &&
    source.feedbackReview.includes("persistenceEnvelope.writesPolicy"),
);
expect(
  "Route B session UI renders feedback family profile grounding panel",
  source.sessionPage.includes("data-route-b-feedback-family-profile-grounding") &&
    source.sessionPage.includes("review?.familyProfileGrounding") &&
    source.sessionPage.includes("scene.sourceGrounding.familyProfiles") &&
    source.sessionPage.includes("Raw metadata") &&
    source.sessionPage.includes("Source refs") &&
    source.sessionPage.includes("Provider call") &&
    source.sessionPage.includes("DB write") &&
    source.sessionPage.includes("Graph write") &&
    source.sessionPage.includes("VisitPlan write") &&
    source.sessionPage.includes("Client profile write") &&
    source.sessionPage.includes("Policy write") &&
    source.sessionPage.includes("CRM fact write"),
);
expect(
  "Feedback family profile UI panel does not render raw source internals",
  !panelSource().match(/\bstageFieldId\b|\bsourceReferenceIds\.map\b|\bsourceRefs\b|\brawProviderPayload\b|\brawPrivateTranscript\b|\bpolicyNumber\b/),
);
expect(
  "AgentFacts manifest and registry QA include feedback family profile refs",
  source.manifest.includes("route-b-feedback-family-profile-grounding") &&
    source.manifest.includes("TheaterRouteBFeedbackContract.familyProfileGrounding") &&
    source.manifest.includes("TheaterRouteBFeedbackProviderInput.promptContext.familyProfileGrounding") &&
    source.manifest.includes("TheaterRouteBFeedbackReview.familyProfileGrounding") &&
    source.manifest.includes("data-route-b-feedback-family-profile-grounding") &&
    source.manifest.includes("pnpm theater:route-b-family-profile-feedback-qa") &&
    source.registryQa.includes("route-b-feedback-family-profile-grounding") &&
    source.registryQa.includes("TheaterRouteBFeedbackReview.familyProfileGrounding.boundary.writesClientProfile=false") &&
    source.registryQa.includes("pnpm theater:route-b-family-profile-feedback-qa"),
);
expect(
  "Package script and UI contract QA expose family profile feedback proof",
  source.packageJson.includes('"theater:route-b-family-profile-feedback-qa"') &&
    source.feedbackUiQa.includes("data-route-b-feedback-family-profile-grounding") &&
    source.feedbackUiQa.includes("TheaterRouteBFeedbackReview.familyProfileGrounding"),
);

run("pnpm", ["theater:route-b-feedback-dry-run"]);
run("pnpm", ["theater:route-b-feedback-provider-dry-run"]);
run("pnpm", ["theater:route-b-feedback-review-qa"]);
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
        clientProfileWriteAttempted: false,
        policyWriteAttempted: false,
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
      .split('data-route-b-feedback-family-profile-grounding="true"')[1]
      ?.split('<div className="space-y-2">')[0] ?? ""
  );
}
