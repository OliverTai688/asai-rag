import { readFileSync } from "node:fs";
import type { Client } from "../src/domains/client/types";
import {
  assertRelationshipEdgeShadowSafety,
  buildRelationshipEdgeShadowBackfill,
  toRelationshipEdgeShadowBffSummary,
  type RelationshipEdgeDraft,
} from "../src/domains/client/relationship-edge-shadow";

const now = "2026-06-23T12:25:43.956Z";
const emailSentinel = "relationship-edge-shadow@example.com";
const phoneSentinel = "0912-222-333";
const policySentinel = "POLICY-EDGE-SHADOW-001";
const providerPayloadSentinel = "rawProviderPayload";
const secretSentinel = "sk-relationship-edge-shadow";
const linkedClientIdSentinel = "client_linked_spouse";

const fixtureClient: Client = {
  id: "client_relationship_edge_shadow",
  name: "林明德",
  email: emailSentinel,
  phone: phoneSentinel,
  birthDate: "1976-08-12",
  occupation: "企業主",
  annualIncome: 6800000,
  family: [
    { id: "father", relation: "父", name: "林父", age: 72 },
    { id: "mother", relation: "母", name: "林母", age: 70 },
    { id: "spouse", relation: "配偶", name: "陳雅雯", age: 45, linkedClientId: linkedClientIdSentinel },
    { id: "sibling", relation: "妹", name: "林妹妹", age: 39 },
    { id: "child", relation: "女", name: "林小芸", age: 13, parentMemberId: "father" },
    { id: "partner", relation: "合作夥伴", name: "張合夥", age: 48 },
    { id: "relative", relation: "親戚", name: "黃親戚", age: 58 },
    { id: "unknown-context", relation: "其他", name: "未知人物", age: 55 },
    { id: "orphan", relation: "子", name: "孤立子女", age: 16, parentMemberId: "missing-parent" },
  ],
  existingPolicies: [{ id: "policy-edge-shadow", type: "醫療險", provider: policySentinel, amount: 1000000 }],
  tags: [],
  aiTags: [
    `需要確認 ${providerPayloadSentinel}`,
    `不要洩漏 ${secretSentinel}`,
  ],
  status: "ACTIVE",
  notes: `private contact ${emailSentinel} ${phoneSentinel}`,
  complianceChecklist: {
    kycStatus: "PARTIAL",
    suitabilityStatus: "MISSING",
    consentStatus: "COMPLETE",
    missingItems: ["適合度評估"],
  },
  sensitivityLevel: "NORMAL",
  kycStatus: "PARTIAL",
  lastInteraction: now,
};

const firstRun = buildRelationshipEdgeShadowBackfill(fixtureClient, { now });
const secondRun = buildRelationshipEdgeShadowBackfill(fixtureClient, { now });
const bffSummary = toRelationshipEdgeShadowBffSummary(firstRun);
const failures = [
  ...assertRelationshipEdgeShadowSafety(firstRun),
  ...assertSourceBoundaries(),
  ...assertResultShape(firstRun),
  ...assertBffSummary(firstRun, bffSummary),
  ...assertIdempotence(firstRun, secondRun),
  ...assertPrivateSentinels(firstRun),
  ...assertPrivateSentinels(bffSummary),
];

if (failures.length > 0) {
  console.error(`client relationship edge shadow QA failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      version: firstRun.version,
      draftEdgeCount: firstRun.draftEdges.length,
      sourceMemberCount: firstRun.sourceMemberCount,
      linkedClientCandidateCount: firstRun.linkedClientCandidateCount,
      counts: firstRun.counts,
      warningCodes: firstRun.warnings.map((warning) => warning.code),
      unsupportedRelations: firstRun.unsupportedRelations,
      duplicateDraftIds: firstRun.duplicateDraftIds.length,
      proof: firstRun.proof,
      bffSummary,
    },
    null,
    2,
  ),
);

function assertResultShape(result: ReturnType<typeof buildRelationshipEdgeShadowBackfill>): string[] {
  const shapeFailures: string[] = [];
  const edgeTypes = new Set(result.draftEdges.map((edge) => edge.type));
  const factStatuses = new Set(result.draftEdges.map((edge) => edge.factStatus));
  const metadataDerivedFrom = new Set(result.draftEdges.map((edge) => edge.metadata.derivedFrom));
  const draftIds = new Set(result.draftEdges.map((edge) => edge.draftId));

  if (result.version !== "2026-06-23.relationship-edge-shadow.v1") shapeFailures.push("unexpected shadow version");
  if (result.generatedAt !== now) shapeFailures.push("generatedAt should be deterministic when now is passed");
  if (result.sourceMemberCount !== fixtureClient.family.length) shapeFailures.push("source member count mismatch");
  if (result.draftEdges.length !== fixtureClient.family.length + 1) {
    shapeFailures.push("linkedClientId member should produce an additional cross-client candidate edge");
  }
  if (result.linkedClientCandidateCount !== 1) shapeFailures.push("linked client candidate count mismatch");
  if (draftIds.size !== result.draftEdges.length) shapeFailures.push("draft ids are not unique");
  if (!edgeTypes.has("PARENT_OF")) shapeFailures.push("missing PARENT_OF candidate");
  if (!edgeTypes.has("SPOUSE_OF")) shapeFailures.push("missing SPOUSE_OF candidate");
  if (!edgeTypes.has("SIBLING_OF")) shapeFailures.push("missing SIBLING_OF candidate");
  if (!edgeTypes.has("SOCIAL_TIE")) shapeFailures.push("missing SOCIAL_TIE candidate");
  if (!factStatuses.has("FACT")) shapeFailures.push("missing FACT candidate");
  if (!factStatuses.has("INFERENCE")) shapeFailures.push("missing INFERENCE candidate");
  if (!factStatuses.has("UNKNOWN")) shapeFailures.push("missing UNKNOWN candidate");
  if (!metadataDerivedFrom.has("family_member_parent_member_id")) shapeFailures.push("missing parentMemberId candidate");
  if (!metadataDerivedFrom.has("root_generation_relation")) shapeFailures.push("missing generation candidate");
  if (!metadataDerivedFrom.has("root_spouse_relation")) shapeFailures.push("missing spouse candidate");
  if (!metadataDerivedFrom.has("root_sibling_relation")) shapeFailures.push("missing sibling candidate");
  if (!metadataDerivedFrom.has("root_social_relation")) shapeFailures.push("missing social candidate");
  if (!metadataDerivedFrom.has("unsupported_root_relation")) shapeFailures.push("missing unsupported relation candidate");
  if (!metadataDerivedFrom.has("missing_parent_member")) shapeFailures.push("missing missing-parent candidate");
  if (!metadataDerivedFrom.has("linked_client_relation")) shapeFailures.push("missing linked client candidate");
  if (result.duplicateDraftIds.length !== 0) shapeFailures.push("duplicate guard should report zero duplicate ids for fixture");
  if (!result.unsupportedRelations.includes("親戚")) shapeFailures.push("unsupported relation warning should include 親戚");
  if (!result.warnings.some((warning) => warning.code === "MISSING_PARENT_MEMBER")) {
    shapeFailures.push("missing parent warning not reported");
  }
  if (!result.warnings.some((warning) => warning.code === "UNSUPPORTED_ROOT_RELATION")) {
    shapeFailures.push("unsupported root relation warning not reported");
  }
  if (result.proof.schemaChanged || result.proof.databaseWriteAttempted || result.proof.providerCallAttempted) {
    shapeFailures.push("proof flags must stay no-schema/no-db/no-provider");
  }

  const childEdge = findEdge(result.draftEdges, "family-member:father", "family-member:child", "PARENT_OF");
  if (!childEdge) shapeFailures.push("parentMemberId child edge missing");
  if (childEdge && !childEdge.sourceReferenceIds.includes("relationship.father")) {
    shapeFailures.push("parentMemberId edge should include parent source reference");
  }

  const fatherEdge = findEdge(result.draftEdges, "family-member:father", `client:${fixtureClient.id}:primary`, "PARENT_OF");
  if (!fatherEdge) shapeFailures.push("root elder edge missing");

  const orphanEdge = findEdge(result.draftEdges, `client:${fixtureClient.id}:primary`, "family-member:orphan", "SOCIAL_TIE");
  if (!orphanEdge || orphanEdge.factStatus !== "UNKNOWN") {
    shapeFailures.push("missing-parent fallback should produce UNKNOWN SOCIAL_TIE");
  }

  const linkedClientEdge = findEdge(result.draftEdges, "family-member:spouse", `linked-client:${linkedClientIdSentinel}`, "SOCIAL_TIE");
  if (!linkedClientEdge || linkedClientEdge.metadata.derivedFrom !== "linked_client_relation") {
    shapeFailures.push("linkedClientId should produce a cross-client SOCIAL_TIE candidate");
  }

  const relativeEdge = findEdge(result.draftEdges, `client:${fixtureClient.id}:primary`, "family-member:relative", "SOCIAL_TIE");
  if (!relativeEdge || relativeEdge.factStatus !== "INFERENCE") {
    shapeFailures.push("ambiguous relative should produce INFERENCE SOCIAL_TIE");
  }

  return shapeFailures;
}

function assertBffSummary(
  result: ReturnType<typeof buildRelationshipEdgeShadowBackfill>,
  summary: ReturnType<typeof toRelationshipEdgeShadowBffSummary>,
): string[] {
  const summaryFailures: string[] = [];
  const serialized = JSON.stringify(summary);
  const forbiddenServerOnlyKeys = [
    "draftEdges",
    "draftId",
    "clientId",
    "sourceNodeId",
    "targetNodeId",
    "sourceReferenceIds",
    "metadata",
    "safeSummary",
    "relationLabel",
  ];

  if (summary.version !== result.version) summaryFailures.push("BFF summary version mismatch");
  if (summary.sourceMemberCount !== result.sourceMemberCount) summaryFailures.push("BFF summary source count mismatch");
  if (summary.draftEdgeCount !== result.draftEdges.length) summaryFailures.push("BFF summary draft count mismatch");
  if (summary.linkedClientCandidateCount !== result.linkedClientCandidateCount) {
    summaryFailures.push("BFF summary linked client candidate count mismatch");
  }
  if (summary.duplicateDraftIdCount !== result.duplicateDraftIds.length) {
    summaryFailures.push("BFF summary duplicate draft count mismatch");
  }
  if (summary.counts.total !== result.counts.total) summaryFailures.push("BFF summary total count mismatch");
  if (!summary.warningCodes.includes("MISSING_PARENT_MEMBER")) summaryFailures.push("BFF summary missing parent warning code");
  if (!summary.warningCodes.includes("UNSUPPORTED_ROOT_RELATION")) {
    summaryFailures.push("BFF summary missing unsupported relation warning code");
  }
  if (summary.proof.schemaChanged || summary.proof.databaseWriteAttempted || summary.proof.providerCallAttempted) {
    summaryFailures.push("BFF summary proof flags must stay no-schema/no-db/no-provider");
  }
  if (summary.proof.clientFacingDraftEdgesReturned || summary.proof.formalSchemaApproved) {
    summaryFailures.push("BFF summary must not claim draft-edge payload or formal schema approval");
  }

  for (const key of forbiddenServerOnlyKeys) {
    if (serialized.includes(key)) summaryFailures.push(`BFF summary leaked server-only key: ${key}`);
  }
  if (serialized.includes(linkedClientIdSentinel)) {
    summaryFailures.push("BFF summary leaked linked client id");
  }

  return summaryFailures;
}

function assertIdempotence(
  firstRun: ReturnType<typeof buildRelationshipEdgeShadowBackfill>,
  secondRun: ReturnType<typeof buildRelationshipEdgeShadowBackfill>,
): string[] {
  const firstJson = JSON.stringify(firstRun);
  const secondJson = JSON.stringify(secondRun);
  return firstJson === secondJson ? [] : ["relationship edge shadow dry-run is not idempotent"];
}

function assertPrivateSentinels(result: object): string[] {
  const serialized = JSON.stringify(result);
  const forbidden = [
    emailSentinel,
    phoneSentinel,
    policySentinel,
    providerPayloadSentinel,
    secretSentinel,
    "rawPrivateTranscript",
    "rawProviderPayload",
    "policyNumber",
    "cookie",
    "authorization",
    "otp",
  ];

  return forbidden
    .filter((sentinel) => serialized.toLowerCase().includes(sentinel.toLowerCase()))
    .map((sentinel) => `serialized shadow contract leaked forbidden sentinel: ${sentinel}`);
}

function assertSourceBoundaries(): string[] {
  const domainSource = readFileSync("src/domains/client/relationship-edge-shadow.ts", "utf8");
  const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts?: Record<string, string> };
  const sourceFailures: string[] = [];

  if (domainSource.includes("@/generated") || domainSource.includes("prisma.") || domainSource.includes("from \"@/lib/prisma\"")) {
    sourceFailures.push("relationship edge shadow domain must not import generated prisma or prisma singleton");
  }
  if (schemaSource.includes("model RelationshipEdge")) {
    sourceFailures.push("REL-004a must not add RelationshipEdge Prisma schema");
  }
  if (packageJson.scripts?.["client:relationship-edge-shadow-qa"] !== "node scripts/client-relationship-edge-shadow-qa.mjs") {
    sourceFailures.push("package.json missing client:relationship-edge-shadow-qa script");
  }

  return sourceFailures;
}

function findEdge(
  edges: RelationshipEdgeDraft[],
  sourceNodeId: string,
  targetNodeId: string,
  type: RelationshipEdgeDraft["type"],
): RelationshipEdgeDraft | undefined {
  return edges.find((edge) => edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId && edge.type === type);
}
