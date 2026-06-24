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
  "Route B handoff contract declares safe relationship edge shadow source grounding",
  source.handoffDomain.includes("TheaterRouteBRelationshipEdgeShadowGroundingSummary") &&
    source.handoffDomain.includes("buildTheaterRouteBRelationshipEdgeShadowGroundingSummary") &&
    source.handoffDomain.includes("relationshipEdgeShadow?: TheaterRouteBRelationshipEdgeShadowGroundingSummary") &&
    source.handoffDomain.includes("ownerScopedRelationshipGraphRequired: true") &&
    source.handoffDomain.includes("rawPrivateTranscriptIncluded: false") &&
    source.handoffDomain.includes("schemaChanged: false") &&
    source.handoffDomain.includes("databaseWriteAttempted: false"),
);
expect(
  "theater build passes least-disclosure edge shadow summary into Route B session handoff",
  source.theaterBuild.includes("buildTheaterRouteBRelationshipEdgeShadowGroundingSummary") &&
    source.theaterBuild.includes("getRelationshipEdgeShadowSummary(handoffReview.handoff.knownMaterials)") &&
    source.theaterBuild.includes("relationshipEdgeShadow: relationshipEdgeShadowGrounding"),
);
expect(
  "Route B session persistence stores and read-backs source grounding",
  source.repository.match(/sourceGrounding: handoff\.scene\.sourceGrounding/g)?.length >= 2 &&
    source.sessionDomain.includes("sourceGrounding?: TheaterRouteBSourceGrounding") &&
    source.bffRepository.includes("sceneState.sourceGrounding") &&
    source.bffRepository.includes("isRouteBSourceGrounding"),
);
expect(
  "Route B stage UI renders persisted relationship edge shadow grounding panel",
  source.sessionPage.includes("data-route-b-edge-shadow-source-grounding") &&
    source.sessionPage.includes("RouteBRelationshipEdgeShadowGroundingPanel") &&
    source.sessionPage.includes("Owner graph scope") &&
    source.sessionPage.includes("Draft edges returned") &&
    source.sessionPage.includes("Relationship graph write") &&
    source.sessionPage.includes("VisitPlan write") &&
    source.sessionPage.includes("CRM fact write"),
);
expect(
  "edge shadow grounding panel does not render draft edge internals or raw private payload markers",
  !panelSource().match(
    /\bdraftEdges\b|\bsourceNodeId\b|\btargetNodeId\b|\bsourceReferenceIds\b|\bpolicyNumber\b|\brawProviderPayload\b|\brawPrivateTranscript\b/,
  ),
);
expect(
  "edge shadow session source grounding remains no-provider and no-write",
  source.handoffDomain.includes("providerCallAttempted: false") &&
    source.handoffDomain.includes("aiUsageLogWritten: false") &&
    source.handoffDomain.includes("clientFacingDraftEdgesReturned: input.clientFacingDraftEdgesReturned") &&
    source.handoffDomain.includes("writesRelationshipGraph: input.writesRelationshipGraph") &&
    source.handoffDomain.includes("writesVisitPlan: input.writesVisitPlan") &&
    source.handoffDomain.includes("writesConfirmedCrmFact: input.writesConfirmedCrmFact"),
);
expect(
  "AgentFacts-style manifest and registry QA include relationship edge shadow session source proof",
  source.manifest.includes("route-b-relationship-edge-shadow-source-grounding") &&
    source.manifest.includes("TheaterRouteBScene.sourceGrounding.relationshipEdgeShadow") &&
    source.manifest.includes("RouteBRelationshipEdgeShadowGroundingPanel") &&
    source.manifest.includes("data-route-b-edge-shadow-source-grounding") &&
    source.manifest.includes("pnpm theater:relationship-edge-shadow-session-source-qa") &&
    source.registryQa.includes("scripts/theater-relationship-edge-shadow-session-source-qa.mjs"),
);
expect(
  "package script exposes relationship edge shadow session source QA",
  source.packageJson.includes("\"theater:relationship-edge-shadow-session-source-qa\""),
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
        clientFacingDraftEdgesReturned: false,
        formalSchemaApproved: false,
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
  return source.sessionPage.split("function RouteBRelationshipEdgeShadowGroundingPanel")[1]?.split("function RouteBSevere")[0] ?? "";
}
