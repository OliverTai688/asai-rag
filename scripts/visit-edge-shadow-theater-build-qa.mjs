#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  domain: "src/domains/theater/visit-handoff.ts",
  theaterBuild: "src/app/(dashboard)/theater/build/page.tsx",
  packageJson: "package.json",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(root, file), "utf8")]),
);
const checks = [];
const edgePanelStart = source.theaterBuild.indexOf("function RelationshipEdgeShadowReadiness");
const edgePanelEnd = source.theaterBuild.indexOf("function ClientBuildSourceReviewPanel");
const edgePanelBlock =
  edgePanelStart >= 0 && edgePanelEnd > edgePanelStart ? source.theaterBuild.slice(edgePanelStart, edgePanelEnd) : "";

expect(
  "handoff domain emits relationship edge shadow least-disclosure material",
  source.domain.includes("relationship_edge_shadow_summary=true") &&
    source.domain.includes("client_facing_draft_edges_returned=false") &&
    source.domain.includes("formal_schema_approved=false") &&
    source.domain.includes("writes_relationship_graph=false") &&
    source.domain.includes("persisted_to_database=false"),
);
expect(
  "theater build parses relationship edge shadow material",
  source.theaterBuild.includes("RELATIONSHIP_EDGE_SHADOW_MATERIAL_PREFIX") &&
    source.theaterBuild.includes("getRelationshipEdgeShadowSummary") &&
    source.theaterBuild.includes("candidate_edges") &&
    source.theaterBuild.includes("formal_schema_approved"),
);
expect(
  "theater build source review surfaces edge shadow count and readiness panel",
  source.theaterBuild.includes('SourceCountPill\n            label="邊候選"') &&
    source.theaterBuild.includes("relationshipEdgeShadowCandidates") &&
    source.theaterBuild.includes('data-edge-shadow-readiness="true"'),
);
expect(
  "edge shadow readiness panel states formal schema and no-write boundary",
  edgePanelBlock.includes("正式 RelationshipEdge schema 尚未核可") &&
    edgePanelBlock.includes("不寫回關係圖、VisitPlan 或 CRM 事實") &&
    edgePanelBlock.includes("不持久化 DB"),
);
expect(
  "edge shadow readiness panel does not render server-only draft internals",
  !["sourceNodeId", "targetNodeId", "sourceReferenceIds", "metadata", "policyNumber", "rawProvider", "rawPrivate"].some(
    (token) => edgePanelBlock.includes(token),
  ),
);
expect(
  "package exposes focused edge shadow theater build QA command",
  source.packageJson.includes('"visit:edge-shadow-theater-build-qa": "node scripts/visit-edge-shadow-theater-build-qa.mjs"'),
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
