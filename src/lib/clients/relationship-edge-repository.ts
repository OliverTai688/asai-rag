import { Prisma } from "@/generated/prisma/client";
import {
  ClientStatus,
  RelationshipEdgeFactStatus,
  RelationshipEdgeType,
} from "@/generated/prisma/enums";
import { canReadClientDetail, canWriteClient } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { toClientDto } from "./client-dto";
import {
  buildRelationshipEdgeShadowBackfill,
  type RelationshipEdgeDraft,
} from "@/domains/client/relationship-edge-shadow";

/**
 * REL-004 — 關係網絡「節點＋邊」持久化。
 *
 * 邊以 backfill 從既有 `FamilyMember`（`parentMemberId` + `relation`）推導（沿用
 * REL-004a 的 deterministic shadow contract），並 upsert 到 `relationship_edges`。
 * backfillKey 讓重跑 idempotent；FamilyMember 仍是節點與相容來源。
 *
 * 邊本身只攜帶 node id、type、factStatus、安全 label 與 allowlisted metadata，
 * 不含 email / phone / policy number / raw provider payload。
 */

export type PersistedRelationshipEdgeDto = {
  id: string;
  clientId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: RelationshipEdgeType;
  factStatus: RelationshipEdgeFactStatus;
  label: string | null;
  derivedFrom: string | null;
  metadata: RelationshipEdgeSafeMetadata | null;
  createdAt: string;
  updatedAt: string;
};

export type RelationshipEdgeSafeMetadata = {
  schemaVersion: string;
  derivedFrom: string;
  relationLabel: string;
  safeSummary: string;
  confidence: string;
  warningCodes: string[];
};

export type RelationshipEdgeBackfillResultDto = {
  status: "OK";
  clientId: string;
  created: number;
  updated: number;
  removed: number;
  total: number;
  edges: PersistedRelationshipEdgeDto[];
  proof: {
    providerCallAttempted: false;
    writesConfirmedCrmFact: false;
  };
};

export type RelationshipEdgeResult<T> =
  | { status: "OK"; data: T }
  | { status: "FORBIDDEN" }
  | { status: "NOT_FOUND" };

const ALLOWED_METADATA_KEYS = [
  "schemaVersion",
  "derivedFrom",
  "relationLabel",
  "safeSummary",
  "confidence",
  "warningCodes",
] as const;

/**
 * 讀取已持久化的 relationship edges（不存在時回空陣列，不自動建立）。
 */
export async function listRelationshipEdgesForClient(
  session: AppSession,
  clientId: string,
): Promise<RelationshipEdgeResult<PersistedRelationshipEdgeDto[]>> {
  const record = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    select: { id: true, organizationId: true, unitId: true, ownerId: true },
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  if (!canReadClientDetail(session, record)) {
    return { status: "FORBIDDEN" };
  }

  const edges = await prisma.relationshipEdge.findMany({
    where: { clientId, organizationId: session.organization.id },
    orderBy: { createdAt: "asc" },
  });

  return { status: "OK", data: edges.map(toPersistedEdgeDto) };
}

/**
 * 從 FamilyMember idempotent backfill relationship edges。
 *
 * - 用 `backfillKey`（= shadow draftId）upsert，重跑不重複。
 * - 只清理「同樣由 backfill 產生、但這次不再出現」的邊（derivedFrom 有值且 backfillKey 不在本次集合）；
 *   手動新增（backfillKey 為 null）的邊不會被刪除。
 */
export async function backfillRelationshipEdgesForClient(
  session: AppSession,
  clientId: string,
): Promise<RelationshipEdgeResult<RelationshipEdgeBackfillResultDto>> {
  const scope = await getWritableClientScope(session, clientId);

  if (scope === "NOT_FOUND") {
    return { status: "NOT_FOUND" };
  }

  if (scope === "FORBIDDEN") {
    return { status: "FORBIDDEN" };
  }

  const record = await prisma.client.findFirst({
    where: { id: clientId, organizationId: session.organization.id },
    include: {
      complianceChecklist: true,
      familyMembers: { orderBy: { createdAt: "asc" } },
      policies: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  const client = toClientDto(record);
  const backfill = buildRelationshipEdgeShadowBackfill(client);
  const drafts = backfill.draftEdges;
  const draftKeys = new Set(drafts.map((draft) => draft.draftId));

  const existing = await prisma.relationshipEdge.findMany({
    where: { clientId, organizationId: session.organization.id },
    select: { id: true, backfillKey: true },
  });
  const existingByKey = new Map(
    existing.filter((edge) => edge.backfillKey).map((edge) => [edge.backfillKey as string, edge.id]),
  );

  let created = 0;
  let updated = 0;

  for (const draft of drafts) {
    const data = draftToEdgeData(session, draft);
    if (existingByKey.has(draft.draftId)) {
      await prisma.relationshipEdge.update({
        where: { id: existingByKey.get(draft.draftId)! },
        data,
      });
      updated += 1;
    } else {
      await prisma.relationshipEdge.create({
        data: { ...data, backfillKey: draft.draftId },
      });
      created += 1;
    }
  }

  // 清理過期的 backfill 邊（曾由 backfill 產生但這次不再出現）；不動手動新增的邊。
  const staleIds = existing
    .filter((edge) => edge.backfillKey && !draftKeys.has(edge.backfillKey))
    .map((edge) => edge.id);

  let removed = 0;
  if (staleIds.length > 0) {
    const result = await prisma.relationshipEdge.deleteMany({
      where: { id: { in: staleIds }, organizationId: session.organization.id },
    });
    removed = result.count;
  }

  const edges = await prisma.relationshipEdge.findMany({
    where: { clientId, organizationId: session.organization.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    status: "OK",
    data: {
      status: "OK",
      clientId,
      created,
      updated,
      removed,
      total: edges.length,
      edges: edges.map(toPersistedEdgeDto),
      proof: {
        providerCallAttempted: false,
        writesConfirmedCrmFact: false,
      },
    },
  };
}

function draftToEdgeData(session: AppSession, draft: RelationshipEdgeDraft) {
  return {
    organizationId: session.organization.id,
    clientId: draft.clientId,
    sourceNodeId: draft.sourceNodeId,
    targetNodeId: draft.targetNodeId,
    type: toEdgeType(draft.type),
    factStatus: toEdgeFactStatus(draft.factStatus),
    label: draft.label ?? null,
    derivedFrom: draft.metadata.derivedFrom,
    metadata: toSafeMetadataInput(draft),
  };
}

function toSafeMetadataInput(draft: RelationshipEdgeDraft): Prisma.InputJsonValue {
  return {
    schemaVersion: draft.metadata.schemaVersion,
    derivedFrom: draft.metadata.derivedFrom,
    relationLabel: draft.metadata.relationLabel,
    safeSummary: draft.metadata.safeSummary,
    confidence: draft.metadata.confidence,
    warningCodes: draft.metadata.warningCodes,
  } satisfies Record<string, unknown> as Prisma.InputJsonValue;
}

function toPersistedEdgeDto(edge: {
  id: string;
  clientId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: RelationshipEdgeType;
  factStatus: RelationshipEdgeFactStatus;
  label: string | null;
  derivedFrom: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): PersistedRelationshipEdgeDto {
  return {
    id: edge.id,
    clientId: edge.clientId,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    type: edge.type,
    factStatus: edge.factStatus,
    label: edge.label,
    derivedFrom: edge.derivedFrom,
    metadata: toSafeMetadataDto(edge.metadata),
    createdAt: edge.createdAt.toISOString(),
    updatedAt: edge.updatedAt.toISOString(),
  };
}

function toSafeMetadataDto(value: Prisma.JsonValue): RelationshipEdgeSafeMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const warningCodes = Array.isArray(record.warningCodes)
    ? record.warningCodes.filter((code): code is string => typeof code === "string")
    : [];

  return {
    schemaVersion: typeof record.schemaVersion === "string" ? record.schemaVersion : "",
    derivedFrom: typeof record.derivedFrom === "string" ? record.derivedFrom : "",
    relationLabel: typeof record.relationLabel === "string" ? record.relationLabel : "",
    safeSummary: typeof record.safeSummary === "string" ? record.safeSummary : "",
    confidence: typeof record.confidence === "string" ? record.confidence : "",
    warningCodes,
  };
}

function toEdgeType(type: RelationshipEdgeDraft["type"]): RelationshipEdgeType {
  return RelationshipEdgeType[type];
}

function toEdgeFactStatus(status: RelationshipEdgeDraft["factStatus"]): RelationshipEdgeFactStatus {
  return RelationshipEdgeFactStatus[status];
}

async function getWritableClientScope(
  session: AppSession,
  clientId: string,
): Promise<"NOT_FOUND" | "FORBIDDEN" | "OK"> {
  const current = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    select: { organizationId: true, unitId: true, ownerId: true },
  });

  if (!current) {
    return "NOT_FOUND";
  }

  if (!canWriteClient(session, current)) {
    return "FORBIDDEN";
  }

  return "OK";
}

// allowlist 自我說明：metadata DTO 只輸出固定 6 個鍵。
export const RELATIONSHIP_EDGE_ALLOWED_METADATA_KEYS = ALLOWED_METADATA_KEYS;
