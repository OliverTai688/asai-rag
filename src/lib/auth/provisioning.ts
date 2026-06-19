import { prisma } from "@/lib/prisma";

type ProvisionInput = {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  emailVerifiedAt?: Date | null;
};

function slugifyEmail(email: string) {
  return email
    .split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "advisor";
}

async function uniqueOrgSlug(email: string) {
  const base = `workspace-${slugifyEmail(email)}`;
  let slug = base;
  let suffix = 1;

  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

export async function provisionPersonalWorkspace(input: ProvisionInput) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });

  if (existingUser?.memberships[0]) {
    return existingUser;
  }

  const slug = await uniqueOrgSlug(email);
  const displayName = input.name?.trim() || email.split("@")[0] || "Advisor";

  return prisma.$transaction(async (tx) => {
    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: displayName,
            avatarUrl: input.avatarUrl ?? existingUser.avatarUrl,
            passwordHash: input.passwordHash ?? existingUser.passwordHash,
            emailVerifiedAt: input.emailVerifiedAt ?? existingUser.emailVerifiedAt,
            status: "ACTIVE",
          },
        })
      : await tx.user.create({
          data: {
            email,
            name: displayName,
            avatarUrl: input.avatarUrl ?? null,
            passwordHash: input.passwordHash ?? null,
            emailVerifiedAt: input.emailVerifiedAt ?? null,
            status: "ACTIVE",
          },
        });

    const organization = await tx.organization.create({
      data: {
        name: `${displayName} 的工作區`,
        slug,
        plan: "FREE",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const unit = await tx.organizationUnit.create({
      data: {
        organizationId: organization.id,
        type: "BRANCH",
        name: "主要通訊處",
        slug: "main",
        isActive: true,
      },
      select: { id: true },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        primaryUnitId: unit.id,
        role: "OWNER",
        status: "ACTIVE",
        title: "Owner",
        isDefault: true,
        acceptedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        targetUserId: user.id,
        action: "SUPPORT_NOTE",
        sensitivity: "MEDIUM",
        resourceType: "PUBLIC_SIGNUP",
        resourceId: user.id,
        reason: "public level-3 signup workspace created",
        metadata: {
          authMethods: {
            password: Boolean(input.passwordHash),
            emailVerified: Boolean(input.emailVerifiedAt),
          },
        },
      },
    });

    return user;
  });
}
