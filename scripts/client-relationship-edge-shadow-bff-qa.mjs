#!/usr/bin/env node
import { readFileSync } from "node:fs";

const checks = [];
const repositorySource = readFileSync("src/lib/clients/relationship-graph-repository.ts", "utf8");
const domainSource = readFileSync("src/domains/client/relationship-edge-shadow.ts", "utf8");
const graphQaSource = readFileSync("scripts/client-relationship-graph-qa.mjs", "utf8");
const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

push(
  repositorySource.includes("type { RelationshipEdgeShadowBffSummary }") &&
    repositorySource.includes("toRelationshipEdgeShadowBffSummary(buildRelationshipEdgeShadowBackfill(client))"),
  "relationship graph repository builds BFF-safe edge shadow summary",
);
push(
  repositorySource.includes("edgeShadow: RelationshipEdgeShadowBffSummary") &&
    repositorySource.includes("edgeShadow,"),
  "relationship graph BFF response exposes edgeShadow summary field",
);
push(
  !repositorySource.includes("draftEdges") && !repositorySource.includes("RelationshipEdgeDraft"),
  "relationship graph repository does not expose server-only draft edges",
);
push(
  domainSource.includes("export interface RelationshipEdgeShadowBffSummary") &&
    domainSource.includes("clientFacingDraftEdgesReturned: false") &&
    domainSource.includes("formalSchemaApproved: false"),
  "relationship edge shadow domain defines approval-gated BFF summary proof",
);
push(
  graphQaSource.includes("relationship graph response includes edge shadow BFF summary") &&
    graphQaSource.includes("edge shadow BFF summary omits server-only draft edge payload"),
  "relationship graph API/browser QA asserts edgeShadow summary boundary",
);
push(
  !schemaSource.includes("model RelationshipEdge"),
  "REL-004b keeps Prisma schema unchanged until formal RelationshipEdge approval",
);
push(
  packageJson.scripts?.["client:relationship-edge-shadow-bff-qa"] ===
    "node scripts/client-relationship-edge-shadow-bff-qa.mjs",
  "package.json exposes edge shadow BFF contract QA script",
);

console.log(JSON.stringify({ status: checks.every((check) => check.status === "pass") ? "pass" : "fail", checks }, null, 2));

if (checks.some((check) => check.status === "fail")) {
  process.exit(1);
}

function push(condition, label) {
  checks.push({ status: condition ? "pass" : "fail", label });
}
