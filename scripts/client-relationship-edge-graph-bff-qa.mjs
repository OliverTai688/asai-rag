#!/usr/bin/env node
import { readFileSync } from "node:fs";

const checks = [];

const packageJson = readText("package.json");
const repository = readText("src/lib/clients/relationship-graph-repository.ts");
const graphQa = readText("scripts/client-relationship-graph-qa.mjs");
const route = readText("src/app/api/clients/[id]/relationship-graph/route.ts");

const relationshipEdgeQuery =
  repository.match(/prisma\.relationshipEdge\.findMany\(\{[\s\S]*?\n    \}\);/)?.[0] ?? "";

push(
  packageJson.includes('"client:relationship-edge-graph-bff-qa"') &&
    packageJson.includes("node scripts/client-relationship-edge-graph-bff-qa.mjs"),
  "package exposes relationship edge graph BFF source QA",
);

push(
  repository.includes("export type RelationshipEdgePersistenceBffSummary"),
  "relationship graph repository exports formal edge persistence BFF summary type",
);
push(
  /export type ClientRelationshipGraphResponse = \{[\s\S]*edgePersistence: RelationshipEdgePersistenceBffSummary;[\s\S]*\};/.test(
    repository,
  ),
  "relationship graph response includes edgePersistence summary",
);
push(repository.includes("edgePersistence,"), "relationship graph response returns edgePersistence data");
push(repository.includes("RelationshipEdgeType"), "repository imports formal RelationshipEdgeType enum");
push(repository.includes("RelationshipEdgeFactStatus"), "repository imports formal RelationshipEdgeFactStatus enum");
push(
  repository.includes("RELATIONSHIP_EDGE_PERSISTENCE_SUMMARY_VERSION") &&
    repository.includes("2026-06-27.relationship-edge-persistence-summary.v1"),
  "edge persistence summary has stable version",
);
push(
  repository.includes('status: "READY" | "EMPTY" | "UNAVAILABLE"') &&
    repository.includes('status: edges.length > 0 ? "READY" : "EMPTY"') &&
    repository.includes('status: "UNAVAILABLE"'),
  "edge persistence summary exposes ready/empty/unavailable states",
);
push(
  repository.includes("RELATIONSHIP_EDGE_TYPES") &&
    repository.includes("RELATIONSHIP_EDGE_FACT_STATUSES") &&
    repository.includes("countsByType") &&
    repository.includes("countsByFactStatus"),
  "edge persistence summary exposes safe aggregate counts",
);

push(
  relationshipEdgeQuery.includes("prisma.relationshipEdge.findMany") &&
    relationshipEdgeQuery.includes("clientId,") &&
    relationshipEdgeQuery.includes("organizationId: session.organization.id") &&
    relationshipEdgeQuery.includes("type: true") &&
    relationshipEdgeQuery.includes("factStatus: true"),
  "repository reads formal edges with client and organization scope",
);
push(
  !["sourceNodeId: true", "targetNodeId: true", "metadata: true", "backfillKey: true"].some((token) =>
    relationshipEdgeQuery.includes(token),
  ),
  "formal edge BFF query does not select raw edge payload fields",
);
push(
  !["prisma.relationshipEdge.create", "prisma.relationshipEdge.update", "prisma.relationshipEdge.deleteMany"].some((token) =>
    repository.includes(token),
  ),
  "relationship graph BFF summary is read-only for formal edges",
);

for (const proofToken of [
  "formalSchemaAvailable: true",
  "organizationScoped: true",
  "queriedRelationshipEdgeTable",
  "clientFacingRawEdgesReturned: false",
  "dbWriteAttempted: false",
  "providerCallAttempted: false",
  "aiUsageLogWritten: false",
  "writesConfirmedCrmFact: false",
  "RELATIONSHIP_EDGE_QUERY_UNAVAILABLE",
]) {
  push(repository.includes(proofToken), `edge persistence proof includes ${proofToken}`);
}

push(
  route.includes("return Response.json(result.data") &&
    route.includes("cache-control") &&
    route.includes("no-store"),
  "relationship graph route returns repository DTO with no-store",
);
push(
  graphQa.includes("edgePersistence?.version") &&
    graphQa.includes("edge persistence summary exposes explicit readiness status") &&
    graphQa.includes("edge persistence summary omits raw persisted edge payload"),
  "live relationship graph QA now verifies formal edge persistence summary boundary",
);
push(
  !/rawProviderPayload|rawPrivateTranscript|rawTranscript|secret|otp|paymentData/.test(`${repository}\n${route}`),
  "runtime source omits raw provider/private/payment sentinel fields",
);
push(
  !/\bAiUsageLog\b|prisma\.aiUsageLog|createAiUsageLog/.test(`${repository}\n${route}`),
  "source proof: no provider call path and no fake AiUsageLog write",
);

for (const check of checks) {
  console.log(`${check.status === "pass" ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function readText(path) {
  return readFileSync(path, "utf8");
}
