#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  theaterBuild: "src/app/(dashboard)/theater/build/page.tsx",
  sessionPage: "src/app/(dashboard)/theater/[sessionId]/page.tsx",
  handoffDomain: "src/domains/theater/route-b-handoff.ts",
  sessionDomain: "src/domains/theater/route-b-session.ts",
  repository: "src/lib/theater/route-b-session-repository.ts",
  bffRepository: "src/lib/theater/route-b-session-bff-repository.ts",
  manifest: "src/domains/ai-protocol/manifest.ts",
  registryQa: "scripts/ai-protocol-registry-qa.ts",
  packageJson: "package.json",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(root, file), "utf8")]),
);
const checks = [];

expect(
  "Route B handoff contract declares safe family profile source grounding",
  source.handoffDomain.includes("TheaterRouteBFamilyProfileGroundingSummary") &&
    source.handoffDomain.includes("buildTheaterRouteBFamilyProfileGroundingSummary") &&
    source.handoffDomain.includes("familyProfiles?: TheaterRouteBFamilyProfileGroundingSummary") &&
    source.handoffDomain.includes("rawMetadataIncluded: false") &&
    source.handoffDomain.includes("sourceReferenceIdsIncluded: false") &&
    source.handoffDomain.includes("databaseWriteAttempted: false"),
);
expect(
  "theater build passes family profile stage fields into Route B session handoff",
  source.theaterBuild.includes("buildTheaterRouteBFamilyProfileGroundingSummary") &&
    source.theaterBuild.includes("getFamilyProfileStageFields(handoffReview.handoff.knownMaterials)") &&
    source.theaterBuild.includes("familyProfiles: familyProfileGrounding"),
);
expect(
  "Route B session persistence and readback carry family profile source grounding",
  source.repository.match(/sourceGrounding: handoff\.scene\.sourceGrounding/g)?.length >= 2 &&
    source.sessionDomain.includes("sourceGrounding?: TheaterRouteBSourceGrounding") &&
    source.bffRepository.includes("sceneState.sourceGrounding") &&
    source.bffRepository.includes("isRouteBSourceGrounding"),
);
expect(
  "Route B stage UI renders persisted family profile grounding panel",
  source.sessionPage.includes("data-route-b-family-profile-source-grounding") &&
    source.sessionPage.includes("RouteBFamilyProfileGroundingPanel") &&
    source.sessionPage.includes("Raw metadata") &&
    source.sessionPage.includes("Source reference ids") &&
    source.sessionPage.includes("Relationship graph write") &&
    source.sessionPage.includes("VisitPlan write") &&
    source.sessionPage.includes("CRM fact write"),
);
expect(
  "family profile grounding panel does not render raw metadata or source reference ids",
  !panelSource().match(
    /\brawMetadata\b|\bsourceReferenceIds\b|\bsourceRefs\b|\bpolicyNumber\b|\brawProviderPayload\b|\brawPrivateTranscript\b/,
  ),
);
expect(
  "family profile session source grounding remains no-provider and no-write",
  source.handoffDomain.includes("providerCallAttempted: false") &&
    source.handoffDomain.includes("aiUsageLogWritten: false") &&
    source.handoffDomain.includes("storesRawProviderPayload: false") &&
    source.handoffDomain.includes("writesRelationshipGraph: false") &&
    source.handoffDomain.includes("writesVisitPlan: false") &&
    source.handoffDomain.includes("writesConfirmedCrmFact: false"),
);
expect(
  "AgentFacts-style manifest and registry QA include family profile session source proof",
  source.manifest.includes("route-b-family-profile-source-grounding") &&
    source.manifest.includes("TheaterRouteBScene.sourceGrounding.familyProfiles") &&
    source.manifest.includes("RouteBFamilyProfileGroundingPanel") &&
    source.manifest.includes("data-route-b-family-profile-source-grounding") &&
    source.manifest.includes("pnpm theater:family-profile-session-source-qa") &&
    source.registryQa.includes("scripts/theater-family-profile-session-source-qa.mjs"),
);
expect(
  "package script exposes family profile session source QA",
  source.packageJson.includes("\"theater:family-profile-session-source-qa\""),
);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}`);
}

console.log(
  JSON.stringify(
    {
      proof: {
        providerCallAttempted: false,
        aiUsageLogRequired: false,
        databaseWriteAttempted: false,
        relationshipGraphWriteAttempted: false,
        visitPlanWriteAttempted: false,
        writesConfirmedCrmFact: false,
        rawMetadataRendered: false,
        sourceReferenceIdsRendered: false,
        rawProviderPayloadRendered: false,
        rawPrivateTranscriptRendered: false,
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
}

function panelSource() {
  return source.sessionPage.split("function RouteBFamilyProfileGroundingPanel")[1]?.split("function RouteBRelationshipEdgeShadowGroundingPanel")[0] ?? "";
}
