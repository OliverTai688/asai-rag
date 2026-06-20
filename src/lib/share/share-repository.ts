import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { sanitizeShareEventPayload } from "@/lib/api/sanitize";
import { prisma } from "@/lib/prisma";
import type { Report, ReportSection, ReportSectionType, ShareCtaConfig, ShareMeta } from "@/domains/report/types";

const fallbackCta: ShareCtaConfig = {
  primaryLabel: "查看建議重點",
  primaryHref: "#recommendation",
  secondaryLabel: "登入客戶入口",
  secondaryHref: "/client-login",
};

export interface SharedReportDto {
  report: Report;
  share: ShareMeta;
}

export async function getSharedReportByToken(token: string): Promise<SharedReportDto | null> {
  const share = await prisma.reportShare.findUnique({
    where: { token },
    select: {
      token: true,
      expiresAt: true,
      accessCount: true,
      lastAccessedAt: true,
      ctaConfig: true,
      organization: {
        select: {
          name: true,
          logoUrl: true,
          brandColor: true,
          plan: true,
        },
      },
      unit: {
        select: {
          name: true,
          logoUrl: true,
          brandColor: true,
        },
      },
      report: {
        select: {
          id: true,
          clientId: true,
          title: true,
          clientSections: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!share || isExpired(share.expiresAt)) {
    return null;
  }

  const ctaConfig = toShareCtaConfig(share.ctaConfig);
  const branding = {
    organizationName: share.organization.name,
    unitName: share.unit?.name,
    logoUrl: share.unit?.logoUrl ?? share.organization.logoUrl ?? undefined,
    brandColor: share.unit?.brandColor ?? share.organization.brandColor ?? undefined,
    poweredByLabel: "誠問 AI",
  };
  const portal = {
    enabled: true,
    loginHref: "/client-login",
    visibleScopes: ["授權報告", "預約下一步", "回覆顧問", "補充資料"],
  };
  const shareMeta: ShareMeta = {
    token: share.token,
    expiresAt: share.expiresAt?.toISOString(),
    accessCount: share.accessCount,
    lastAccessedAt: share.lastAccessedAt?.toISOString(),
    branding,
    portal,
    ctaConfig,
  };

  return {
    share: shareMeta,
    report: {
      id: share.report.id,
      clientId: share.report.clientId,
      clientName: share.report.client.name,
      sections: toReportSections(share.report.clientSections),
      share: shareMeta,
      version: share.report.version,
      createdAt: share.report.createdAt.toISOString(),
      updatedAt: share.report.updatedAt.toISOString(),
    },
  };
}

export async function recordShareEvent(input: {
  token: string;
  type: "OPEN" | "SCROLL" | "CLICK" | "EXIT" | "DOWNLOAD";
  payload?: unknown;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ ok: true } | null> {
  const share = await prisma.reportShare.findUnique({
    where: { token: input.token },
    select: {
      id: true,
      organizationId: true,
      unitId: true,
      expiresAt: true,
    },
  });

  if (!share || isExpired(share.expiresAt)) {
    return null;
  }

  await prisma.$transaction([
    prisma.shareEvent.create({
      data: {
        organizationId: share.organizationId,
        unitId: share.unitId,
        shareId: share.id,
        type: input.type,
        payload: sanitizeShareEventPayload(input.payload),
        userAgent: input.userAgent?.slice(0, 600) ?? null,
        ipHash: input.ip ? hashIp(input.ip) : null,
      },
    }),
    prisma.reportShare.update({
      where: { id: share.id },
      data: {
        accessCount: { increment: input.type === "OPEN" ? 1 : 0 },
        ...(input.type === "OPEN" ? { lastAccessedAt: new Date() } : {}),
      },
    }),
  ]);

  return { ok: true };
}

function isExpired(expiresAt: Date | null): boolean {
  return Boolean(expiresAt && expiresAt.getTime() < Date.now());
}

function toReportSections(value: Prisma.JsonValue): ReportSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): ReportSection | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const rawType = String(record.type ?? "SUMMARY").toLowerCase();
      const type = toReportSectionType(rawType);

      return {
        id: `client-section-${index + 1}`,
        type,
        title: String(record.title ?? "報告章節"),
        content: String(record.content ?? ""),
      };
    })
    .filter((section): section is ReportSection => Boolean(section));
}

function toReportSectionType(value: string): ReportSectionType {
  const allowed: ReportSectionType[] = [
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
  return allowed.includes(value as ReportSectionType) ? (value as ReportSectionType) : "recommendation";
}

function toShareCtaConfig(value: Prisma.JsonValue): ShareCtaConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallbackCta;
  }

  const record = value as Record<string, unknown>;
  const primaryLabel = String(record.primaryLabel ?? record.primaryCta ?? fallbackCta.primaryLabel);
  const secondaryLabel = record.secondaryLabel ?? record.secondaryCta;

  return {
    primaryLabel,
    primaryHref: typeof record.primaryHref === "string" ? record.primaryHref : fallbackCta.primaryHref,
    secondaryLabel: typeof secondaryLabel === "string" ? secondaryLabel : fallbackCta.secondaryLabel,
    secondaryHref: typeof record.secondaryHref === "string" ? record.secondaryHref : fallbackCta.secondaryHref,
  };
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
