import type {
  Client as DbClient,
  Report as DbReport,
  ReportShare as DbReportShare,
} from "@/generated/prisma/client";
import {
  INTERNAL_ONLY_SECTION_TYPES,
  type Report,
  type ReportSection,
  type ReportSectionType,
  type ShareMeta,
} from "@/domains/report/types";

export type ReportRecord = DbReport & {
  client: Pick<DbClient, "id" | "name" | "organizationId" | "unitId" | "ownerId"> | null;
  shares: DbReportShare[];
};

const SECTION_TYPES: ReportSectionType[] = [
  "situation",
  "problem",
  "implication",
  "recommendation",
  "summary",
  "performance",
  "cover",
  "methodology",
  "analysis",
  "family",
  "action",
  "compliance",
  "appendix",
];

export function toReportDto(record: ReportRecord): Report {
  const internalSections = toSections(record.internalSections ?? record.clientSections);
  const clientSections = toSections(record.clientSections ?? []).length
    ? toSections(record.clientSections)
    : internalSections.filter((section) => !INTERNAL_ONLY_SECTION_TYPES.includes(section.type));

  return {
    id: record.id,
    title: record.title,
    clientId: record.clientId,
    clientName: record.client?.name ?? "未命名客戶",
    spinSessionId: record.spinSessionId ?? undefined,
    theaterSessionId: record.theaterSessionId ?? undefined,
    interviewSessionId: record.interviewSessionId ?? undefined,
    // The member-facing report editor renders the internal sections; the
    // client-safe subset is filtered separately at share time.
    sections: internalSections,
    clientSections,
    share: toShareMeta(record.shares[0]),
    status: record.status,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toSections(value: unknown): ReportSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index): ReportSection | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const title = typeof raw.title === "string" ? raw.title : "";
      const content = typeof raw.content === "string" ? raw.content : "";

      return {
        id: typeof raw.id === "string" && raw.id ? raw.id : `section-${index}`,
        type: normalizeSectionType(raw.type),
        title,
        content,
        isEdited: raw.isEdited === true,
      };
    })
    .filter((section): section is ReportSection => section !== null);
}

function normalizeSectionType(value: unknown): ReportSectionType {
  if (typeof value !== "string") {
    return "summary";
  }

  const normalized = value.toLowerCase() as ReportSectionType;
  return SECTION_TYPES.includes(normalized) ? normalized : "summary";
}

function toShareMeta(record: DbReportShare | undefined): ShareMeta | undefined {
  if (!record) {
    return undefined;
  }

  return {
    token: record.token,
    expiresAt: record.expiresAt?.toISOString(),
    accessCount: record.accessCount,
    lastAccessedAt: record.lastAccessedAt?.toISOString(),
  };
}
