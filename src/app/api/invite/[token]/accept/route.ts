import { createHash } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const INVITE_EXPIRES_IN_DAYS = 14;

const acceptInviteSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(80).optional().nullable(),
});

function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  const prefix = localPart.slice(0, 2);
  const suffix = localPart.length > 4 ? localPart.slice(-1) : "";

  return `${prefix}${"*".repeat(Math.max(2, localPart.length - prefix.length - suffix.length))}${suffix}@${domain}`;
}

function hashEmail(email: string) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

function isExpired(invitedAt: Date | null) {
  if (!invitedAt) return true;

  const expiresAt = invitedAt.getTime() + INVITE_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsedBody = acceptInviteSchema.safeParse(await req.json().catch(() => null));

  if (!parsedBody.success) {
    return Response.json(
      {
        error: "INVALID_INVITE_ACCEPT_INPUT",
        issues: parsedBody.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const input = parsedBody.data;
  const email = input.email.toLowerCase();
  const invite = await prisma.organizationMember.findUnique({
    where: { id: token },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
      user: {
        select: { id: true, email: true, name: true, status: true },
      },
      primaryUnit: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  if (!invite) {
    return Response.json({ error: "INVITE_NOT_FOUND" }, { status: 404 });
  }

  const emailMasked = maskEmail(invite.user.email);

  if (invite.user.email.toLowerCase() !== email) {
    return Response.json({ error: "INVITE_EMAIL_MISMATCH", emailMasked }, { status: 403 });
  }

  if (invite.status === "ACTIVE") {
    return Response.json({ error: "INVITE_ALREADY_ACCEPTED", emailMasked }, { status: 409 });
  }

  if (invite.status !== "INVITED") {
    return Response.json({ error: "INVITE_NOT_ACCEPTABLE", emailMasked }, { status: 409 });
  }

  if (isExpired(invite.invitedAt)) {
    return Response.json({ error: "INVITE_EXPIRED", emailMasked }, { status: 410 });
  }

  const activeMembershipCount = await prisma.organizationMember.count({
    where: {
      userId: invite.userId,
      status: "ACTIVE",
    },
  });
  const acceptedAt = new Date();
  const [user, membership] = await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.userId },
      data: {
        name: input.name ?? invite.user.name,
        status: "ACTIVE",
      },
      select: { id: true, name: true, email: true },
    }),
    prisma.organizationMember.update({
      where: { id: invite.id },
      data: {
        status: "ACTIVE",
        acceptedAt,
        isDefault: activeMembershipCount === 0 ? true : invite.isDefault,
      },
      select: {
        id: true,
        role: true,
        status: true,
        acceptedAt: true,
        isDefault: true,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: invite.organizationId,
        targetUserId: invite.userId,
        action: "SUPPORT_NOTE",
        sensitivity: "MEDIUM",
        resourceType: "ORG_INVITE_ACCEPT",
        resourceId: invite.id,
        reason: "manual invite token accepted",
        metadata: {
          emailHash: hashEmail(email),
          emailMasked,
          delivery: "manual_token",
          tokenType: "organization_member_id",
        },
      },
      select: { id: true },
    }),
  ]);

  return Response.json({
    invite: {
      membershipId: membership.id,
      status: membership.status,
      role: membership.role,
      acceptedAt: membership.acceptedAt?.toISOString() ?? null,
      isDefault: membership.isDefault,
      emailMasked,
      displayName: user.name,
      organization: {
        id: invite.organization.id,
        name: invite.organization.name,
        slug: invite.organization.slug,
      },
      primaryUnit: invite.primaryUnit
        ? {
            id: invite.primaryUnit.id,
            name: invite.primaryUnit.name,
            type: invite.primaryUnit.type,
          }
        : null,
    },
    nextStep: {
      route: "/login",
      message: "邀請已接受。正式 beta 登入 provider 尚未啟用時，請由 operator 提供受控登入方式。",
    },
  });
}
