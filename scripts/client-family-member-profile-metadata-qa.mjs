#!/usr/bin/env node
import { readFileSync } from "node:fs";

const checks = [];

const contractSource = readFileSync("src/domains/client/family-member-profile.ts", "utf8");
const typeSource = readFileSync("src/domains/client/types.ts", "utf8");
const repositorySource = readFileSync("src/lib/clients/client-repository.ts", "utf8");
const dtoSource = readFileSync("src/lib/clients/client-dto.ts", "utf8");
const graphSource = readFileSync("src/domains/client/relationship-graph.ts", "utf8");
const graphRepositorySource = readFileSync("src/lib/clients/relationship-graph-repository.ts", "utf8");
const itemRouteSource = readFileSync("src/app/api/clients/[id]/family-members/[memberId]/route.ts", "utf8");
const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const familySchemaSlice = repositorySource.slice(
  repositorySource.indexOf("export const createFamilyMemberInputSchema"),
  repositorySource.indexOf("export const updateFamilyMemberInputSchema"),
);

push(
  contractSource.includes('FAMILY_MEMBER_PROFILE_SCHEMA_VERSION = "2026-06-24.family-member-profile.v1"') &&
    contractSource.includes("export interface FamilyMemberProfile") &&
    contractSource.includes("jobTitle?: FamilyMemberProfileField") &&
    contractSource.includes("annualIncomeOrDependency?: FamilyMemberProfileField") &&
    contractSource.includes("personStatus?: FamilyMemberProfileField") &&
    contractSource.includes("decisionRole?: FamilyMemberProfileField") &&
    contractSource.includes("relationshipContext?: FamilyMemberProfileField"),
  "profile contract defines allowlisted fields and stable schema version",
);
push(
  contractSource.includes(".strict()") &&
    contractSource.includes("findUnsafeProfilePaths") &&
    contractSource.includes("rawTranscript|rawPayload|providerPayload") &&
    contractSource.includes("policyNumber") &&
    contractSource.includes("保單號") &&
    contractSource.includes("BEGIN (?:RSA |OPENSSH |PRIVATE )?KEY"),
  "profile contract rejects extra keys and private/provider/payment/policy sentinels",
);
push(
  contractSource.includes("extractFamilyMemberProfile") &&
    contractSource.includes("familyMemberProfileStoredSchema.safeParse(metadata.profile)") &&
    contractSource.includes("mergeFamilyMemberProfileIntoMetadata"),
  "profile helpers read/write only metadata.profile",
);
push(
  typeSource.includes('import type { FamilyMemberProfile } from "./family-member-profile"') &&
    typeSource.includes("profile?: FamilyMemberProfile"),
  "FamilyMember DTO type exposes allowlisted profile field",
);
push(
  repositorySource.includes("profile: familyMemberProfileInputSchema.nullish()") &&
    repositorySource.includes("mergeFamilyMemberProfileIntoMetadata(null, input.profile)") &&
    repositorySource.includes("mergeFamilyMemberProfileIntoMetadata(target.metadata, input.profile)") &&
    repositorySource.includes("metadata: toNullableInputJson"),
  "family member create/update repository writes allowlisted profile into metadata.profile",
);
push(
  !/organizationId|ownerId|userId|unitId/.test(familySchemaSlice),
  "family member write schemas do not accept browser-supplied org/user/unit scope",
);
push(
  repositorySource.includes("getWritableClientScope(session, clientId)") &&
    repositorySource.includes("organizationId: session.organization.id") &&
    repositorySource.includes("canWriteClient(session, current)") &&
    repositorySource.includes("where: { clientId }") &&
    repositorySource.includes("const target = members.find((member) => member.id === memberId)"),
  "family member profile writes are scoped by current member, client ownership, and member/client match",
);
push(
  itemRouteSource.includes("requireCurrentMember()") &&
    itemRouteSource.includes("updateFamilyMemberInputSchema.safeParse"),
  "family member PATCH route is current-member guarded and schema parsed",
);
push(
  dtoSource.includes("profile: extractFamilyMemberProfile(record.metadata)") && !dtoSource.includes("metadata: record.metadata"),
  "client DTO exposes extracted profile, not raw metadata",
);
push(
  graphRepositorySource.includes("organizationId: session.organization.id") &&
    graphRepositorySource.includes("canReadClientDetail(session, record)"),
  "relationship graph BFF read is organization/member scoped",
);
push(
  graphSource.includes("const profile = member.profile") &&
    graphSource.includes('"annualIncomeOrDependency"') &&
    graphSource.includes("profileSourceReferenceIds") &&
    graphSource.includes("buildFamilyProfileSourceReferences") &&
    graphSource.includes("jobTitle.factStatus === \"UNKNOWN\"") &&
    graphSource.includes("status.factStatus === \"UNKNOWN\""),
  "relationship graph uses metadata profile and keeps missing fields as UNKNOWN",
);
push(
  graphSource.includes("familyProfileSourceId(index, reference.id)") &&
    graphSource.includes("mapFamilyProfileSourceType"),
  "relationship graph maps profile source refs into source review",
);
push(
  schemaSource.includes("model FamilyMember") && schemaSource.includes("metadata        Json?"),
  "REL-006 reuses existing FamilyMember.metadata Json field",
);
push(!schemaSource.includes("model RelationshipEdge"), "REL-006 does not add formal RelationshipEdge schema");
push(!repositorySource.includes("prisma.visitPlan"), "family profile repository does not write VisitPlan");
push(!repositorySource.includes("aiUsageLog"), "family profile repository does not fake AiUsageLog");
push(!/openai|anthropic/i.test(repositorySource), "family profile repository has no provider call");
push(
  packageJson.scripts?.["client:family-member-profile-metadata-qa"] ===
    "node scripts/client-family-member-profile-metadata-qa.mjs",
  "package.json exposes family member profile metadata QA command",
);

const failed = checks.filter((check) => check.status === "fail");

console.log(
  JSON.stringify(
    {
      status: failed.length === 0 ? "pass" : "fail",
      schemaVersion: "2026-06-24.family-member-profile.v1",
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      dbConnectionAttempted: false,
      browserLaunched: false,
      writesRelationshipEdgeTable: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
      externalRegistryPublicationAttempted: false,
      checks,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exit(1);
}

function push(condition, label) {
  checks.push({ status: condition ? "pass" : "fail", label });
}
