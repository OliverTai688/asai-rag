#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  domain: "src/domains/theater/visit-handoff.ts",
  theaterBuild: "src/app/(dashboard)/theater/build/page.tsx",
  dryRun: "scripts/visit-theater-handoff-dry-run.ts",
  packageJson: "package.json",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(root, file), "utf8")]),
);
const checks = [];
const profilePanelStart = source.theaterBuild.indexOf("function FamilyProfileStageReview");
const profilePanelEnd = source.theaterBuild.indexOf("function RelationshipEdgeShadowReadiness");
const profilePanelBlock =
  profilePanelStart >= 0 && profilePanelEnd > profilePanelStart
    ? source.theaterBuild.slice(profilePanelStart, profilePanelEnd)
    : "";

expect(
  "handoff domain emits family profile stage material and source counts",
  source.domain.includes("VisitTheaterFamilyProfileHandoffSummary") &&
    source.domain.includes("family_profile_field=true") &&
    source.domain.includes("familyProfileFields") &&
    source.domain.includes("summarizeFamilyProfiles"),
);
expect(
  "handoff domain keeps family profile material stage-only and no-write",
  source.domain.includes("advisor_confirmation_required=true") &&
    source.domain.includes("writes_relationship_graph=false") &&
    source.domain.includes("writes_visit_plan=false") &&
    source.domain.includes("writes_confirmed_crm_fact=false") &&
    source.domain.includes("persisted_to_database=false"),
);
expect(
  "handoff summary exposes deterministic no-provider proof flags",
  source.domain.includes("providerCallAttempted: false") &&
    source.domain.includes("aiUsageLogWritten: false") &&
    source.domain.includes("storesRawProviderPayload: false") &&
    source.domain.includes("rawPrivateTranscriptIncluded: false"),
);
expect(
  "theater build parses and renders family profile source review",
  source.theaterBuild.includes("FAMILY_PROFILE_MATERIAL_PREFIX") &&
    source.theaterBuild.includes("getFamilyProfileStageFields") &&
    source.theaterBuild.includes('data-family-profile-stage-review="true"') &&
    source.theaterBuild.includes('SourceCountPill label="人物欄位"') &&
    source.theaterBuild.includes("sourceCounts.familyProfileFields"),
);
expect(
  "family profile review states stage-only metadata.profile boundary",
  profilePanelBlock.includes("Stage-only") &&
    profilePanelBlock.includes("allowlisted metadata.profile") &&
    profilePanelBlock.includes("不寫回關係圖、VisitPlan、CRM 事實或 DB") &&
    profilePanelBlock.includes("不顯示 raw metadata"),
);
expect(
  "family profile review does not render raw/server-only internals",
  !["sourceReferenceIds", "metadata:", "policyNumber", "rawProvider", "rawPrivate", "phone", "email"].some((token) =>
    profilePanelBlock.includes(token),
  ),
);
expect(
  "dry-run proves family profile fact, inference, unknown, and no-write boundaries",
  source.dryRun.includes("family_profile_field=true") &&
    source.dryRun.includes("科技公司財務長") &&
    source.dryRun.includes("保費支出敏感") &&
    source.dryRun.includes("家庭共同預算守門人") &&
    source.dryRun.includes("family profile handoff crossed provider, persistence, graph, VisitPlan, CRM"),
);
expect(
  "package exposes focused family profile theater handoff QA command",
  source.packageJson.includes(
    '"visit:family-profile-theater-handoff-qa": "node scripts/visit-family-profile-theater-handoff-qa.mjs"',
  ),
);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function expect(label, condition) {
  checks.push({ label, status: condition ? "pass" : "fail" });
}
