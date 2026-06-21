import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { ImpersonationStatus, PlatformRole } from "@/generated/prisma/enums";
import { evaluateImpersonationRequest } from "@/domains/platform/impersonation";
import { prisma } from "@/lib/prisma";

export interface PlatformImpersonationSession {
  user: { id: string; name: string };
  role: PlatformRole;
}

const IMPERSONATION_SCOPES = [
  "ORG_SUMMARY",
  "MEMBER_PROFILE",
  "BILLING",
  "SUPPORT_DIAGNOSTICS",
  "SENSITIVE_REPORT_READ",
  "SENSITIVE_CLIENT_READ",
] as const;

const IMPERSONATION_END_ACTIONS = ["END", "REVOKE"] as const;

export const platformImpersonatedReadProofSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
  scope: z.literal("ORG_SUMMARY").default("ORG_SUMMARY"),
});

export const platformImpersonatedSupportNoteSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
  note: z.string().trim().min(10).max(1000),
  scope: z.literal("SUPPORT_DIAGNOSTICS").default("SUPPORT_DIAGNOSTICS"),
});

export const platformImpersonationStartSchema = z.object({
  targetOrgId: z.string().trim().min(1),
  targetUserId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(10).max(1000),
  scope: z.array(z.enum(IMPERSONATION_SCOPES)).min(1).max(6),
  expiresAt: z
    .string()
    .trim()
    .refine((value) => Number.isFinite(Date.parse(value)), "expiresAt must be an ISO datetime."),
});

export const platformImpersonationEndSchema = z.object({
  action: z.enum(IMPERSONATION_END_ACTIONS),
  reason: z.string().trim().min(10).max(1000),
});

export type PlatformImpersonationStartInput = z.infer<typeof platformImpersonationStartSchema>;
export type PlatformImpersonationEndInput = z.infer<typeof platformImpersonationEndSchema>;
export type PlatformImpersonatedReadProofInput = z.infer<typeof platformImpersonatedReadProofSchema>;
export type PlatformImpersonatedSupportNoteInput = z.infer<typeof platformImpersonatedSupportNoteSchema>;

function userDisplay(user: { id: string; name: string | null; status: string } | null | undefined) {
  if (!user) return null;

  return {
    id: user.id,
    displayName: user.name?.trim() || "未命名使用者",
    status: user.status,
  };
}

function sessionDto(session: {
  id: string;
  actorUserId: string;
  targetUserId: string | null;
  targetOrgId: string;
  reason: string;
  scope: string[];
  status: ImpersonationStatus;
  startsAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  endedReason: string | null;
  createdAt: Date;
  actor?: { id: string; name: string | null; status: string } | null;
  targetUser?: { id: string; name: string | null; status: string } | null;
  targetOrg?: { id: string; name: string; slug: string; status: string } | null;
}) {
  return {
    id: session.id,
    status: session.status,
    reason: session.reason,
    scope: session.scope,
    startsAt: session.startsAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    endedReason: session.endedReason,
    createdAt: session.createdAt.toISOString(),
    actor: userDisplay(session.actor),
    targetUser: userDisplay(session.targetUser),
    targetOrg: session.targetOrg
      ? {
          id: session.targetOrg.id,
          name: session.targetOrg.name,
          slug: session.targetOrg.slug,
          status: session.targetOrg.status,
        }
      : { id: session.targetOrgId, name: "Unknown organization", slug: null, status: null },
  };
}

function startMetadata(input: PlatformImpersonationStartInput, actorRole: PlatformRole): Prisma.InputJsonObject {
  return {
    scope: input.scope,
    expiresAt: input.expiresAt,
    actorRole,
    targetUserProvided: Boolean(input.targetUserId),
  };
}

function endMetadata(input: PlatformImpersonationEndInput, previousStatus: ImpersonationStatus): Prisma.InputJsonObject {
  return {
    endAction: input.action,
    previousStatus,
  };
}

function forbiddenImpersonation(reason: string, message: string) {
  return {
    ok: false as const,
    status: 403,
    error: reason,
    message,
  };
}

async function resolveActiveImpersonationSession(
  impersonationSessionId: string,
  session: PlatformImpersonationSession,
  requiredScope: string,
) {
  const current = await prisma.impersonationSession.findUnique({
    where: { id: impersonationSessionId },
    include: {
      actor: { select: { id: true, name: true, status: true } },
      targetUser: { select: { id: true, name: true, status: true } },
      targetOrg: { select: { id: true, name: true, slug: true, status: true } },
    },
  });

  if (!current) {
    return { ok: false as const, status: 404, error: "IMPERSONATION_SESSION_NOT_FOUND" };
  }

  if (current.actorUserId !== session.user.id) {
    return forbiddenImpersonation(
      "IMPERSONATION_ACTOR_MISMATCH",
      "Only the actor who started an impersonation session can use it.",
    );
  }

  if (current.status !== "ACTIVE") {
    return {
      ok: false as const,
      status: 409,
      error: "IMPERSONATION_SESSION_NOT_ACTIVE",
      statusValue: current.status,
    };
  }

  if (current.expiresAt.getTime() <= Date.now()) {
    return forbiddenImpersonation("IMPERSONATION_SESSION_EXPIRED", "Impersonation session has expired.");
  }

  if (!current.scope.includes(requiredScope)) {
    return forbiddenImpersonation(
      "IMPERSONATION_SCOPE_MISMATCH",
      `Impersonation session does not include required scope ${requiredScope}.`,
    );
  }

  return { ok: true as const, impersonationSession: current };
}

export async function startPlatformImpersonation(
  session: PlatformImpersonationSession,
  input: PlatformImpersonationStartInput,
) {
  const startsAt = new Date();
  const decision = evaluateImpersonationRequest({
    actorUserId: session.user.id,
    actorRole: session.role,
    targetOrgId: input.targetOrgId,
    targetUserId: input.targetUserId,
    reason: input.reason,
    scope: input.scope,
    startsAt: startsAt.toISOString(),
    expiresAt: input.expiresAt,
  });

  if (!decision.allowed) {
    return {
      ok: false as const,
      status: 403,
      error: decision.code ?? "IMPERSONATION_FORBIDDEN",
      message: decision.message,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const targetOrg = await tx.organization.findUnique({
      where: { id: input.targetOrgId },
      select: { id: true, name: true, slug: true, status: true },
    });

    if (!targetOrg) {
      return { ok: false as const, status: 404, error: "TARGET_ORG_NOT_FOUND" };
    }

    const targetMembership = input.targetUserId
      ? await tx.organizationMember.findFirst({
          where: {
            organizationId: input.targetOrgId,
            userId: input.targetUserId,
            status: "ACTIVE",
          },
          select: {
            user: { select: { id: true, name: true, status: true } },
          },
        })
      : null;

    if (input.targetUserId && !targetMembership) {
      return { ok: false as const, status: 404, error: "TARGET_USER_NOT_FOUND" };
    }

    const created = await tx.impersonationSession.create({
      data: {
        actorUserId: session.user.id,
        targetUserId: input.targetUserId,
        targetOrgId: input.targetOrgId,
        reason: input.reason,
        scope: input.scope,
        expiresAt: new Date(input.expiresAt),
        metadata: startMetadata(input, session.role),
      },
      include: {
        actor: { select: { id: true, name: true, status: true } },
        targetUser: { select: { id: true, name: true, status: true } },
        targetOrg: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: input.targetOrgId,
        actorUserId: session.user.id,
        targetUserId: input.targetUserId,
        impersonationSessionId: created.id,
        action: "IMPERSONATION_START",
        sensitivity: "BREAK_GLASS",
        resourceType: "IMPERSONATION_SESSION",
        resourceId: created.id,
        reason: input.reason,
        metadata: {
          scope: input.scope,
          startsAt: created.startsAt.toISOString(),
          expiresAt: created.expiresAt.toISOString(),
          actorRole: session.role,
        },
      },
    });

    return {
      ok: true as const,
      impersonationSession: sessionDto(created),
    };
  });

  return result;
}

export async function recordImpersonatedReadProof(
  session: PlatformImpersonationSession,
  impersonationSessionId: string,
  input: PlatformImpersonatedReadProofInput,
) {
  const active = await resolveActiveImpersonationSession(impersonationSessionId, session, input.scope);

  if (!active.ok) {
    return active;
  }

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { id: active.impersonationSession.targetOrgId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        monthlyAiQuota: true,
        monthlyAiUsed: true,
      },
    });

    if (!organization) {
      return { ok: false as const, status: 404, error: "TARGET_ORG_NOT_FOUND" };
    }

    const activeMembers = await tx.organizationMember.count({
      where: { organizationId: active.impersonationSession.targetOrgId, status: "ACTIVE" },
    });
    const clients = await tx.client.count({
      where: { organizationId: active.impersonationSession.targetOrgId, status: { not: "ARCHIVED" } },
    });
    const reports = await tx.report.count({ where: { organizationId: active.impersonationSession.targetOrgId } });

    const audit = await tx.auditLog.create({
      data: {
        organizationId: active.impersonationSession.targetOrgId,
        actorUserId: session.user.id,
        targetUserId: active.impersonationSession.targetUserId,
        impersonationSessionId: active.impersonationSession.id,
        action: "IMPERSONATED_READ",
        sensitivity: "BREAK_GLASS",
        resourceType: "ORGANIZATION_SUMMARY",
        resourceId: organization.id,
        reason: input.reason,
        metadata: {
          scope: input.scope,
          proofType: "tenant_summary",
          fields: ["plan", "status", "monthlyAiQuota", "monthlyAiUsed", "activeMembers", "clients", "reports"],
        },
      },
      select: { id: true, createdAt: true },
    });

    return {
      ok: true as const,
      impersonationSession: sessionDto(active.impersonationSession),
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        status: organization.status,
        usage: {
          monthlyAiQuota: organization.monthlyAiQuota,
          monthlyAiUsed: organization.monthlyAiUsed,
        },
        health: {
          activeMembers,
          clients,
          reports,
        },
      },
      audit: {
        id: audit.id,
        action: "IMPERSONATED_READ",
        sensitivity: "BREAK_GLASS",
        impersonationSessionId: active.impersonationSession.id,
        createdAt: audit.createdAt.toISOString(),
      },
    };
  });

  return result;
}

export async function recordImpersonatedSupportNote(
  session: PlatformImpersonationSession,
  impersonationSessionId: string,
  input: PlatformImpersonatedSupportNoteInput,
) {
  const active = await resolveActiveImpersonationSession(impersonationSessionId, session, input.scope);

  if (!active.ok) {
    return active;
  }

  await prisma.auditLog.create({
    data: {
      organizationId: active.impersonationSession.targetOrgId,
      actorUserId: session.user.id,
      targetUserId: active.impersonationSession.targetUserId,
      impersonationSessionId: active.impersonationSession.id,
      action: "IMPERSONATED_WRITE",
      sensitivity: "BREAK_GLASS",
      resourceType: "IMPERSONATION_SUPPORT_NOTE",
      resourceId: active.impersonationSession.id,
      reason: input.reason,
      metadata: {
        scope: input.scope,
        proofType: "support_note_audit_only",
        noteLength: input.note.length,
      },
    },
  });

  return {
    ok: true as const,
    impersonationSession: sessionDto(active.impersonationSession),
    supportNote: {
      persistedBusinessData: false,
      noteLength: input.note.length,
    },
    audit: {
      action: "IMPERSONATED_WRITE",
      sensitivity: "BREAK_GLASS",
      impersonationSessionId: active.impersonationSession.id,
    },
  };
}

export async function endPlatformImpersonation(
  session: PlatformImpersonationSession,
  impersonationSessionId: string,
  input: PlatformImpersonationEndInput,
) {
  if (session.role === "FINANCE") {
    return {
      ok: false as const,
      status: 403,
      error: "ROLE_NOT_ALLOWED",
      message: "Finance role can view billing/support summaries but cannot end impersonation sessions.",
    };
  }

  const nextStatus: ImpersonationStatus = input.action === "REVOKE" ? "REVOKED" : "ENDED";

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.impersonationSession.findUnique({
      where: { id: impersonationSessionId },
      include: {
        actor: { select: { id: true, name: true, status: true } },
        targetUser: { select: { id: true, name: true, status: true } },
        targetOrg: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    if (!current) {
      return { ok: false as const, status: 404, error: "IMPERSONATION_SESSION_NOT_FOUND" };
    }

    if (current.status !== "ACTIVE") {
      return {
        ok: false as const,
        status: 409,
        error: "IMPERSONATION_SESSION_NOT_ACTIVE",
        statusValue: current.status,
      };
    }

    const updated = await tx.impersonationSession.update({
      where: { id: impersonationSessionId },
      data: {
        status: nextStatus,
        endedAt: new Date(),
        endedReason: input.reason,
        metadata: endMetadata(input, current.status),
      },
      include: {
        actor: { select: { id: true, name: true, status: true } },
        targetUser: { select: { id: true, name: true, status: true } },
        targetOrg: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: current.targetOrgId,
        actorUserId: session.user.id,
        targetUserId: current.targetUserId,
        impersonationSessionId: current.id,
        action: "IMPERSONATION_END",
        sensitivity: "BREAK_GLASS",
        resourceType: "IMPERSONATION_SESSION",
        resourceId: current.id,
        reason: input.reason,
        metadata: {
          endAction: input.action,
          previousStatus: current.status,
          nextStatus,
          actorRole: session.role,
        },
      },
    });

    return {
      ok: true as const,
      impersonationSession: sessionDto(updated),
      audit: {
        action: "IMPERSONATION_END",
        sensitivity: "BREAK_GLASS",
        endAction: input.action,
      },
    };
  });

  return result;
}
