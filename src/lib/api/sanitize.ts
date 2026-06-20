import type { Prisma } from "@/generated/prisma/client";

type SafeJsonPrimitive = string | number | boolean;

type SafeFieldSpec = {
  type: "string" | "number" | "boolean";
  maxLength?: number;
};

const shareEventFieldSpec = {
  section: { type: "string", maxLength: 160 },
  href: { type: "string", maxLength: 160 },
  scrollDepth: { type: "number" },
  label: { type: "string", maxLength: 160 },
  source: { type: "string", maxLength: 160 },
} satisfies Record<string, SafeFieldSpec>;

const clientPortalPayloadFieldSpec = {
  preferredTime: { type: "string", maxLength: 120 },
  contactMethod: { type: "string", maxLength: 80 },
  topic: { type: "string", maxLength: 160 },
} satisfies Record<string, SafeFieldSpec>;

const auditMetadataFieldSpec = {
  source: { type: "string", maxLength: 120 },
  action: { type: "string", maxLength: 120 },
  resourceType: { type: "string", maxLength: 80 },
  resourceId: { type: "string", maxLength: 160 },
  status: { type: "string", maxLength: 80 },
  reason: { type: "string", maxLength: 240 },
  riskAccepted: { type: "boolean" },
  module: { type: "string", maxLength: 80 },
  provider: { type: "string", maxLength: 80 },
  count: { type: "number" },
} satisfies Record<string, SafeFieldSpec>;

export function sanitizeShareEventPayload(value: unknown): Prisma.InputJsonValue | undefined {
  return sanitizeWhitelistRecord(value, shareEventFieldSpec);
}

export function sanitizeClientPortalResponseMetadata(input: {
  source: string;
  responseType: string;
  shareId: string;
  reportId: string;
  payload?: unknown;
}): Prisma.InputJsonObject {
  const metadata: Prisma.InputJsonObject = {
    source: sanitizeString(input.source, 80) ?? "client_portal",
    responseType: sanitizeString(input.responseType, 80) ?? "UNKNOWN",
    shareId: sanitizeString(input.shareId, 120) ?? "",
    reportId: sanitizeString(input.reportId, 120) ?? "",
  };
  const safePayload = sanitizeWhitelistRecord(input.payload, clientPortalPayloadFieldSpec);

  if (safePayload && typeof safePayload === "object" && !Array.isArray(safePayload)) {
    Object.assign(metadata, safePayload);
  }

  return metadata;
}

export function sanitizeAuditMetadata(value: unknown): Prisma.InputJsonObject | undefined {
  const metadata = sanitizeWhitelistRecord(value, auditMetadataFieldSpec);
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : undefined;
}

export function sanitizeWhitelistRecord(
  value: unknown,
  spec: Record<string, SafeFieldSpec>,
): Prisma.InputJsonObject | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const output: Record<string, SafeJsonPrimitive> = {};

  for (const [key, fieldSpec] of Object.entries(spec)) {
    const safeValue = toSafeField(record[key], fieldSpec);

    if (safeValue !== undefined) {
      output[key] = safeValue;
    }
  }

  return Object.keys(output).length > 0 ? (output as Prisma.InputJsonObject) : undefined;
}

function toSafeField(value: unknown, spec: SafeFieldSpec): SafeJsonPrimitive | undefined {
  if (spec.type === "string") {
    return sanitizeString(value, spec.maxLength ?? 160);
  }

  if (spec.type === "number") {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  if (spec.type === "boolean") {
    return typeof value === "boolean" ? value : undefined;
  }

  return undefined;
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const text = value.trim().slice(0, maxLength);
  return text.length > 0 ? text : undefined;
}
