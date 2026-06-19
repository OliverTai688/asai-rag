import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { PlatformRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const BREAK_GLASS_SCOPES = ["SENSITIVE_CLIENT_READ", "SENSITIVE_REPORT_READ"] as const;
const BREAK_GLASS_ROLES = new Set<PlatformRole>(["SUPER_ADMIN", "SUPPORT"]);
const MAX_BREAK_GLASS_MINUTES = 30;

export interface PlatformBreakGlassSession {
  user: { id: string; name: string };
  role: PlatformRole;
}

export const platformBreakGlassSchema = z.object({
  targetOrgId: z.string().trim().min(1),
  targetUserId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(20).max(1000),
  scope: z.array(z.enum(BREAK_GLASS_SCOPES)).min(1).max(2),
  expiresAt: z
    .string()
    .trim()
    .refine((value) => Number.isFinite(Date.parse(value)), "expiresAt must be an ISO datetime."),
  riskAccepted: z.literal(true),
});

export type PlatformBreakGlassInput = z.infer<typeof platformBreakGlassSchema>;

function forbidden(error: string, message: string) {
  return {
    ok: false as const,
    status: 403,
    error,
    message,
  };
}

function validateBreakGlass(session: PlatformBreakGlassSession, input: PlatformBreakGlassInput) {
  if (!BREAK_GLASS_ROLES.has(session.role)) {
    return forbidden("ROLE_NOT_ALLOWED", "Finance role cannot perform break-glass sensitive access.");
  }

  const now = Date.now();
  const expiresAt = Date.parse(input.expiresAt);

  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return {
      ok: false as const,
      status: 400,
      error: "INVALID_BREAK_GLASS_EXPIRY",
      message: "Break-glass expiry must be in the future.",
    };
  }

  if (expiresAt - now > MAX_BREAK_GLASS_MINUTES * 60 * 1000) {
    return forbidden(
      "BREAK_GLASS_EXPIRY_TOO_LONG",
      `Break-glass expiry cannot exceed ${MAX_BREAK_GLASS_MINUTES} minutes.`,
    );
  }

  return { ok: true as const };
}

function metadata(input: PlatformBreakGlassInput, actorRole: PlatformRole): Prisma.InputJsonObject {
  return {
    scope: input.scope,
    expiresAt: input.expiresAt,
    actorRole,
    targetUserProvided: Boolean(input.targetUserId),
    riskAccepted: input.riskAccepted,
    responseShape: "counts_only_no_raw_private_payload",
  };
}

async function sensitiveClientSummary(organizationId: string) {
  const [total, sensitive, highlySensitive, kycMissing, kycReviewRequired] = await Promise.all([
    prisma.client.count({ where: { organizationId, status: { not: "ARCHIVED" } } }),
    prisma.client.count({ where: { organizationId, status: { not: "ARCHIVED" }, sensitivity: "SENSITIVE" } }),
    prisma.client.count({
      where: { organizationId, status: { not: "ARCHIVED" }, sensitivity: "HIGHLY_SENSITIVE" },
    }),
    prisma.complianceChecklist.count({
      where: { client: { organizationId, status: { not: "ARCHIVED" } }, kycStatus: "MISSING" },
    }),
    prisma.complianceChecklist.count({
      where: { client: { organizationId, status: { not: "ARCHIVED" } }, kycStatus: "REVIEW_REQUIRED" },
    }),
  ]);

  return {
    resourceType: "CLIENT",
    total,
    sensitive,
    highlySensitive,
    kycMissing,
    kycReviewRequired,
    rawPayloadReturned: false,
  };
}

async function sensitiveReportSummary(organizationId: string) {
  const [total, draft, ready, shared, archived, shares] = await Promise.all([
    prisma.report.count({ where: { organizationId } }),
    prisma.report.count({ where: { organizationId, status: "DRAFT" } }),
    prisma.report.count({ where: { organizationId, status: "READY" } }),
    prisma.report.count({ where: { organizationId, status: "SHARED" } }),
    prisma.report.count({ where: { organizationId, status: "ARCHIVED" } }),
    prisma.reportShare.count({ where: { organizationId } }),
  ]);

  return {
    resourceType: "REPORT",
    total,
    draft,
    ready,
    shared,
    archived,
    shares,
    rawPayloadReturned: false,
  };
}

export async function performPlatformBreakGlass(session: PlatformBreakGlassSession, input: PlatformBreakGlassInput) {
  const decision = validateBreakGlass(session, input);

  if (!decision.ok) {
    return decision;
  }

  const targetOrg = await prisma.organization.findUnique({
    where: { id: input.targetOrgId },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!targetOrg) {
    return { ok: false as const, status: 404, error: "TARGET_ORG_NOT_FOUND" };
  }

  const targetMembership = input.targetUserId
    ? await prisma.organizationMember.findFirst({
        where: {
          organizationId: input.targetOrgId,
          userId: input.targetUserId,
          status: "ACTIVE",
        },
        select: { userId: true },
      })
    : null;

  if (input.targetUserId && !targetMembership) {
    return { ok: false as const, status: 404, error: "TARGET_USER_NOT_FOUND" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const audit = await tx.auditLog.create({
      data: {
        organizationId: input.targetOrgId,
        actorUserId: session.user.id,
        targetUserId: input.targetUserId,
        action: "BREAK_GLASS",
        sensitivity: "BREAK_GLASS",
        resourceType: "PLATFORM_BREAK_GLASS",
        resourceId: input.targetOrgId,
        reason: input.reason,
        metadata: metadata(input, session.role),
      },
      select: { id: true, createdAt: true },
    });

    return {
      ok: true as const,
      audit: {
        id: audit.id,
        action: "BREAK_GLASS",
        sensitivity: "BREAK_GLASS",
        createdAt: audit.createdAt.toISOString(),
      },
    };
  });

  const [clientSummary, reportSummary] = await Promise.all([
    input.scope.includes("SENSITIVE_CLIENT_READ") ? sensitiveClientSummary(input.targetOrgId) : null,
    input.scope.includes("SENSITIVE_REPORT_READ") ? sensitiveReportSummary(input.targetOrgId) : null,
  ]);

  return {
    ...result,
    breakGlass: {
      targetOrg: {
        id: targetOrg.id,
        name: targetOrg.name,
        slug: targetOrg.slug,
        status: targetOrg.status,
      },
      targetUserId: input.targetUserId ?? null,
      scope: input.scope,
      expiresAt: input.expiresAt,
      rawPayloadReturned: false,
    },
    proof: {
      clients: clientSummary,
      reports: reportSummary,
    },
  };
}
