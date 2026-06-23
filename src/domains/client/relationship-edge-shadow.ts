import { RELATION_GENERATION, type Client, type FamilyMember } from "./types";
import type { RelationshipGraphEdgeType, RelationshipGraphFactStatus } from "./relationship-graph";

export type RelationshipEdgeShadowDerivedFrom =
  | "family_member_parent_member_id"
  | "root_spouse_relation"
  | "root_social_relation"
  | "root_sibling_relation"
  | "root_generation_relation"
  | "unsupported_root_relation"
  | "missing_parent_member";

export type RelationshipEdgeShadowWarningCode =
  | "MISSING_PARENT_MEMBER"
  | "UNSUPPORTED_ROOT_RELATION"
  | "DUPLICATE_DRAFT_ID";

export interface RelationshipEdgeDraftMetadata {
  schemaVersion: "asai.relationship_edge_shadow.v1";
  derivedFrom: RelationshipEdgeShadowDerivedFrom;
  relationLabel: string;
  safeSummary: string;
  confidence: "high" | "medium" | "low";
  warningCodes: RelationshipEdgeShadowWarningCode[];
}

export interface RelationshipEdgeDraft {
  draftId: string;
  clientId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: RelationshipGraphEdgeType;
  factStatus: RelationshipGraphFactStatus;
  label?: string;
  sourceReferenceIds: string[];
  metadata: RelationshipEdgeDraftMetadata;
}

export interface RelationshipEdgeShadowWarning {
  code: RelationshipEdgeShadowWarningCode;
  memberId: string;
  relation: string;
  message: string;
}

export interface RelationshipEdgeShadowBackfillResult {
  version: "2026-06-23.relationship-edge-shadow.v1";
  generatedAt: string;
  clientId: string;
  sourceMemberCount: number;
  draftEdges: RelationshipEdgeDraft[];
  duplicateDraftIds: string[];
  unsupportedRelations: string[];
  warnings: RelationshipEdgeShadowWarning[];
  counts: {
    total: number;
    byType: Record<RelationshipGraphEdgeType, number>;
    byFactStatus: Record<RelationshipGraphFactStatus, number>;
  };
  proof: {
    schemaChanged: false;
    databaseWriteAttempted: false;
    providerCallAttempted: false;
    generatedClientFacingPayload: false;
  };
}

export interface RelationshipEdgeShadowBffSummary {
  version: RelationshipEdgeShadowBackfillResult["version"];
  generatedAt: string;
  sourceMemberCount: number;
  draftEdgeCount: number;
  duplicateDraftIdCount: number;
  unsupportedRelations: string[];
  warningCodes: RelationshipEdgeShadowWarningCode[];
  counts: RelationshipEdgeShadowBackfillResult["counts"];
  proof: {
    schemaChanged: false;
    databaseWriteAttempted: false;
    providerCallAttempted: false;
    clientFacingDraftEdgesReturned: false;
    formalSchemaApproved: false;
  };
}

interface BuildRelationshipEdgeShadowOptions {
  now?: string;
}

interface DraftInput {
  clientId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: RelationshipGraphEdgeType;
  factStatus: RelationshipGraphFactStatus;
  label: string;
  sourceReferenceIds: string[];
  metadata: RelationshipEdgeDraftMetadata;
}

type DraftInputConfig = Omit<DraftInput, "metadata"> & Omit<RelationshipEdgeDraftMetadata, "schemaVersion" | "relationLabel">;

const SHADOW_VERSION = "2026-06-23.relationship-edge-shadow.v1";
const METADATA_SCHEMA_VERSION = "asai.relationship_edge_shadow.v1";

export function buildRelationshipEdgeShadowBackfill(
  client: Client,
  options: BuildRelationshipEdgeShadowOptions = {},
): RelationshipEdgeShadowBackfillResult {
  const generatedAt = options.now ?? new Date().toISOString();
  const memberById = new Map(client.family.map((member) => [member.id, member]));
  const draftInputs: DraftInput[] = [];
  const warnings: RelationshipEdgeShadowWarning[] = [];

  for (const member of client.family) {
    const candidate = buildDraftInputForMember(client, member, memberById);
    draftInputs.push(candidate.draft);
    warnings.push(...candidate.warnings);
  }

  const draftEdges: RelationshipEdgeDraft[] = [];
  const seenDraftIds = new Set<string>();
  const duplicateDraftIds: string[] = [];

  for (const input of draftInputs) {
    const draft = toDraftEdge(input);

    if (seenDraftIds.has(draft.draftId)) {
      duplicateDraftIds.push(draft.draftId);
      warnings.push({
        code: "DUPLICATE_DRAFT_ID",
        memberId: sourceMemberIdFromNodeId(input.targetNodeId),
        relation: input.label,
        message: "Duplicate relationship edge draft was detected and skipped.",
      });
      continue;
    }

    seenDraftIds.add(draft.draftId);
    draftEdges.push(draft);
  }

  return {
    version: SHADOW_VERSION,
    generatedAt,
    clientId: client.id,
    sourceMemberCount: client.family.length,
    draftEdges,
    duplicateDraftIds,
    unsupportedRelations: unique(
      warnings.filter((warning) => warning.code === "UNSUPPORTED_ROOT_RELATION").map((warning) => warning.relation),
    ),
    warnings,
    counts: countDraftEdges(draftEdges),
    proof: {
      schemaChanged: false,
      databaseWriteAttempted: false,
      providerCallAttempted: false,
      generatedClientFacingPayload: false,
    },
  };
}

export function assertRelationshipEdgeShadowSafety(result: RelationshipEdgeShadowBackfillResult): string[] {
  const failures: string[] = [];

  if (result.version !== SHADOW_VERSION) failures.push("relationship edge shadow version mismatch");
  if (result.proof.schemaChanged) failures.push("shadow contract must not change schema");
  if (result.proof.databaseWriteAttempted) failures.push("shadow contract must not write database");
  if (result.proof.providerCallAttempted) failures.push("shadow contract must not call provider");
  if (result.proof.generatedClientFacingPayload) failures.push("shadow contract must stay server-only");
  if (result.draftEdges.length !== result.counts.total) failures.push("draft edge total count mismatch");
  if (result.duplicateDraftIds.length > 0) failures.push("duplicate draft ids should be surfaced before migration");

  for (const edge of result.draftEdges) {
    const metadataKeys = Object.keys(edge.metadata).sort();
    const allowedMetadataKeys = ["confidence", "derivedFrom", "relationLabel", "safeSummary", "schemaVersion", "warningCodes"];
    const extraKeys = metadataKeys.filter((key) => !allowedMetadataKeys.includes(key));

    if (extraKeys.length > 0) failures.push(`edge ${edge.draftId} has disallowed metadata keys: ${extraKeys.join(", ")}`);
    if (!edge.sourceNodeId || !edge.targetNodeId) failures.push(`edge ${edge.draftId} is missing node ids`);
    if (!edge.sourceReferenceIds.length) failures.push(`edge ${edge.draftId} is missing source references`);
    if (edge.metadata.schemaVersion !== METADATA_SCHEMA_VERSION) {
      failures.push(`edge ${edge.draftId} metadata schema mismatch`);
    }
  }

  return failures;
}

export function toRelationshipEdgeShadowBffSummary(
  result: RelationshipEdgeShadowBackfillResult,
): RelationshipEdgeShadowBffSummary {
  return {
    version: result.version,
    generatedAt: result.generatedAt,
    sourceMemberCount: result.sourceMemberCount,
    draftEdgeCount: result.draftEdges.length,
    duplicateDraftIdCount: result.duplicateDraftIds.length,
    unsupportedRelations: result.unsupportedRelations,
    warningCodes: unique(result.warnings.map((warning) => warning.code)) as RelationshipEdgeShadowWarningCode[],
    counts: result.counts,
    proof: {
      schemaChanged: false,
      databaseWriteAttempted: false,
      providerCallAttempted: false,
      clientFacingDraftEdgesReturned: false,
      formalSchemaApproved: false,
    },
  };
}

function buildDraftInputForMember(
  client: Client,
  member: FamilyMember,
  memberById: Map<string, FamilyMember>,
): { draft: DraftInput; warnings: RelationshipEdgeShadowWarning[] } {
  const sourceReferenceIds = [`relationship.${member.id}`];

  if (member.parentMemberId) {
    const parent = memberById.get(member.parentMemberId);

    if (parent) {
      return {
        draft: draftInput({
          clientId: client.id,
          sourceNodeId: familyMemberNodeId(parent.id),
          targetNodeId: familyMemberNodeId(member.id),
          type: "PARENT_OF",
          factStatus: "FACT",
          label: member.relation,
          sourceReferenceIds: [`relationship.${parent.id}`, ...sourceReferenceIds],
          derivedFrom: "family_member_parent_member_id",
          safeSummary: "Existing parentMemberId can be backfilled into a parent edge.",
          confidence: "high",
          warningCodes: [],
        }),
        warnings: [],
      };
    }

    const warning: RelationshipEdgeShadowWarning = {
      code: "MISSING_PARENT_MEMBER",
      memberId: member.id,
      relation: member.relation,
      message: "parentMemberId did not match an existing family member; candidate edge falls back to SOCIAL_TIE.",
    };

    return {
      draft: draftInput({
        clientId: client.id,
        sourceNodeId: primaryClientNodeId(client.id),
        targetNodeId: familyMemberNodeId(member.id),
        type: "SOCIAL_TIE",
        factStatus: "UNKNOWN",
        label: member.relation,
        sourceReferenceIds,
        derivedFrom: "missing_parent_member",
        safeSummary: "Missing parent reference needs advisor confirmation before schema migration.",
        confidence: "low",
        warningCodes: [warning.code],
      }),
      warnings: [warning],
    };
  }

  return buildRootConnectedDraftInput(client, member, sourceReferenceIds);
}

function buildRootConnectedDraftInput(
  client: Client,
  member: FamilyMember,
  sourceReferenceIds: string[],
): { draft: DraftInput; warnings: RelationshipEdgeShadowWarning[] } {
  if (isSpouseRelation(member.relation)) {
    return noWarningDraft({
      clientId: client.id,
      sourceNodeId: primaryClientNodeId(client.id),
      targetNodeId: familyMemberNodeId(member.id),
      type: "SPOUSE_OF",
      factStatus: "FACT",
      label: "配偶",
      sourceReferenceIds,
      derivedFrom: "root_spouse_relation",
      safeSummary: "Root spouse relation can be backfilled into a spouse edge.",
      confidence: "high",
      warningCodes: [],
    });
  }

  if (isSocialRelation(member.relation)) {
    const factStatus: RelationshipGraphFactStatus = member.relation === "其他" ? "UNKNOWN" : "FACT";
    return noWarningDraft({
      clientId: client.id,
      sourceNodeId: primaryClientNodeId(client.id),
      targetNodeId: familyMemberNodeId(member.id),
      type: "SOCIAL_TIE",
      factStatus,
      label: member.relation,
      sourceReferenceIds,
      derivedFrom: "root_social_relation",
      safeSummary: "Root social relation can be backfilled as a contextual edge.",
      confidence: factStatus === "UNKNOWN" ? "low" : "high",
      warningCodes: [],
    });
  }

  if (isSiblingRelation(member.relation)) {
    return noWarningDraft({
      clientId: client.id,
      sourceNodeId: primaryClientNodeId(client.id),
      targetNodeId: familyMemberNodeId(member.id),
      type: "SIBLING_OF",
      factStatus: "FACT",
      label: member.relation,
      sourceReferenceIds,
      derivedFrom: "root_sibling_relation",
      safeSummary: "Root sibling relation can be backfilled into a same-rank edge.",
      confidence: "high",
      warningCodes: [],
    });
  }

  const generation = RELATION_GENERATION[member.relation] ?? 0;

  if (generation < 0) {
    return noWarningDraft({
      clientId: client.id,
      sourceNodeId: familyMemberNodeId(member.id),
      targetNodeId: primaryClientNodeId(client.id),
      type: "PARENT_OF",
      factStatus: "FACT",
      label: member.relation,
      sourceReferenceIds,
      derivedFrom: "root_generation_relation",
      safeSummary: "Root elder relation can be backfilled as elder-to-client parent edge.",
      confidence: "high",
      warningCodes: [],
    });
  }

  if (generation > 0) {
    return noWarningDraft({
      clientId: client.id,
      sourceNodeId: primaryClientNodeId(client.id),
      targetNodeId: familyMemberNodeId(member.id),
      type: "PARENT_OF",
      factStatus: "FACT",
      label: member.relation,
      sourceReferenceIds,
      derivedFrom: "root_generation_relation",
      safeSummary: "Root descendant relation can be backfilled as client-to-descendant parent edge.",
      confidence: "high",
      warningCodes: [],
    });
  }

  const warning: RelationshipEdgeShadowWarning = {
    code: "UNSUPPORTED_ROOT_RELATION",
    memberId: member.id,
    relation: member.relation,
    message: "Root relation is ambiguous for a formal edge table and should stay review-gated.",
  };

  return {
    draft: draftInput({
      clientId: client.id,
      sourceNodeId: primaryClientNodeId(client.id),
      targetNodeId: familyMemberNodeId(member.id),
      type: "SOCIAL_TIE",
      factStatus: member.relation === "親戚" ? "INFERENCE" : "UNKNOWN",
      label: member.relation,
      sourceReferenceIds,
      derivedFrom: "unsupported_root_relation",
      safeSummary: "Ambiguous root relation needs advisor confirmation before formal edge persistence.",
      confidence: "low",
      warningCodes: [warning.code],
    }),
    warnings: [warning],
  };
}

function noWarningDraft(input: DraftInputConfig): { draft: DraftInput; warnings: RelationshipEdgeShadowWarning[] } {
  return { draft: draftInput(input), warnings: [] };
}

function draftInput(input: DraftInputConfig): DraftInput {
  return {
    clientId: input.clientId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    type: input.type,
    factStatus: input.factStatus,
    label: input.label,
    sourceReferenceIds: input.sourceReferenceIds,
    metadata: {
      schemaVersion: METADATA_SCHEMA_VERSION,
      derivedFrom: input.derivedFrom,
      relationLabel: input.label,
      safeSummary: input.safeSummary,
      confidence: input.confidence,
      warningCodes: input.warningCodes,
    },
  };
}

function toDraftEdge(input: DraftInput): RelationshipEdgeDraft {
  return {
    draftId: [
      "relationship-edge-draft",
      input.clientId,
      input.type,
      input.sourceNodeId,
      input.targetNodeId,
      slug(input.label),
    ].join(":"),
    clientId: input.clientId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    type: input.type,
    factStatus: input.factStatus,
    label: input.label,
    sourceReferenceIds: unique(input.sourceReferenceIds),
    metadata: input.metadata,
  };
}

function countDraftEdges(draftEdges: RelationshipEdgeDraft[]): RelationshipEdgeShadowBackfillResult["counts"] {
  const byType: Record<RelationshipGraphEdgeType, number> = {
    PARENT_OF: 0,
    SPOUSE_OF: 0,
    SIBLING_OF: 0,
    CHILD_OF: 0,
    SOCIAL_TIE: 0,
  };
  const byFactStatus: Record<RelationshipGraphFactStatus, number> = {
    FACT: 0,
    INFERENCE: 0,
    UNKNOWN: 0,
  };

  for (const edge of draftEdges) {
    byType[edge.type] += 1;
    byFactStatus[edge.factStatus] += 1;
  }

  return {
    total: draftEdges.length,
    byType,
    byFactStatus,
  };
}

function primaryClientNodeId(clientId: string): string {
  return `client:${clientId}:primary`;
}

function familyMemberNodeId(memberId: string): string {
  return `family-member:${memberId}`;
}

function sourceMemberIdFromNodeId(nodeId: string): string {
  return nodeId.startsWith("family-member:") ? nodeId.replace("family-member:", "") : nodeId;
}

function isSpouseRelation(relation: string): boolean {
  return relation.includes("配偶");
}

function isSiblingRelation(relation: string): boolean {
  return ["兄", "弟", "姐", "妹", "堂哥", "堂弟", "堂姐", "堂妹", "表哥", "表弟", "表姐", "表妹"].includes(relation);
}

function isSocialRelation(relation: string): boolean {
  return ["朋友", "合作夥伴", "其他"].includes(relation);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
