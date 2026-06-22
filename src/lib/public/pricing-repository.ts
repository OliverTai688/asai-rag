import { PLAN_DETAILS } from "@/domains/subscription/plans";
import { DEFAULT_PLAN_CONFIGS } from "@/domains/subscription/plan-config";
import type { PlanType } from "@/domains/subscription/types";
import type { PublicPricingDto, PublicStatusDto } from "@/domains/public/types";
import { prisma } from "@/lib/prisma";
import { getPublicStatus, isPublicDatabaseUnavailableError } from "./status-repository";

const planOrder: PlanType[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

type PublicPlanCapabilityConfig = Pick<
  typeof DEFAULT_PLAN_CONFIGS[PlanType],
  | "displayName"
  | "maxMembers"
  | "maxCollaborators"
  | "maxUnits"
  | "monthlyAiQuota"
  | "shareBrandingEnabled"
  | "clientPortalEnabled"
>;

const planMeta: Record<PlanType, { cta: string; highlighted?: boolean; badge?: string }> = {
  FREE: { cta: "免費開始" },
  STARTER: { cta: "選擇 Starter" },
  PRO: { cta: "選擇 Pro", highlighted: true, badge: "最受歡迎" },
  ENTERPRISE: { cta: "聯絡銷售" },
};

type PublicPlanConfigRow = PublicPlanCapabilityConfig & {
  plan: string;
};

export async function getPublicPricing(): Promise<PublicPricingDto> {
  const publicStatus = await getPublicStatus();
  let source: PublicPricingDto["source"] = publicStatus.dbAvailable ? "fallback" : "degraded_local";
  let rows: PublicPlanConfigRow[] = [];

  try {
    rows = await prisma.planConfig.findMany({
      where: { isActive: true },
      select: {
        plan: true,
        displayName: true,
        maxMembers: true,
        maxCollaborators: true,
        maxUnits: true,
        monthlyAiQuota: true,
        shareBrandingEnabled: true,
        clientPortalEnabled: true,
      },
    });
    source = rows.length > 0 ? "database" : source;
  } catch (error) {
    if (!isPublicDatabaseUnavailableError(error)) throw error;
    source = "degraded_local";
  }

  const byPlan = new Map(rows.map((row) => [row.plan as PlanType, row]));

  return {
    source,
    billing: {
      provider: "ECPAY",
      checkoutEnabled: publicStatus.checkoutAvailability.checkoutEnabled,
      mode: "test_ready_manual_enable",
      note: publicStatus.checkoutAvailability.reason,
    },
    availability: {
      checkoutAvailability: publicStatus.checkoutAvailability,
      primaryCta: publicStatus.primaryCta,
      leadCapture: publicStatus.leadCapture,
      legalStatus: publicStatus.legalStatus,
    },
    plans: planOrder.map((plan) => {
      const detail = PLAN_DETAILS[plan];
      const fallback = DEFAULT_PLAN_CONFIGS[plan];
      const config = byPlan.get(plan) ?? fallback;
      const meta = planMeta[plan];

      return {
        id: plan,
        name: config.displayName || detail.name,
        price: detail.price,
        period: detail.period,
        description: detail.description,
        features: toFeatureList(plan, config),
        cta: toPlanCta(plan, publicStatus, meta.cta),
        ctaMode: plan === "ENTERPRISE" ? "enterprise_contact" : publicStatus.primaryCta.mode,
        highlighted: Boolean(meta.highlighted),
        badge: meta.badge,
        capabilities: {
          maxMembers: config.maxMembers,
          maxCollaborators: config.maxCollaborators,
          maxUnits: config.maxUnits,
          monthlyAiQuota: config.monthlyAiQuota,
          shareBrandingEnabled: config.shareBrandingEnabled,
          clientPortalEnabled: config.clientPortalEnabled,
        },
      };
    }),
  };
}

function toPlanCta(plan: PlanType, publicStatus: PublicStatusDto, fallbackLabel: string) {
  if (plan === "ENTERPRISE") return "聯絡導入";
  if (!publicStatus.primaryCta.checkoutActionEnabled) return publicStatus.primaryCta.label;
  return fallbackLabel;
}

function toFeatureList(plan: PlanType, config: PublicPlanCapabilityConfig): string[] {
  if (plan === "FREE") {
    return [
      `${config.maxMembers} 位使用者`,
      "基礎 SPIN 對話練習",
      `每月 ${formatNumber(config.monthlyAiQuota)} 次 AI 互動`,
      "社群支援",
    ];
  }

  if (plan === "STARTER") {
    return [
      "1 位主要使用者",
      `最多 ${config.maxCollaborators} 位協作者`,
      `每月 ${formatNumber(config.monthlyAiQuota)} 次 AI 互動`,
      "Email 支援",
    ];
  }

  if (plan === "PRO") {
    return [
      `${config.maxMembers} 位成員`,
      "團隊績效儀表板",
      `每月 ${formatNumber(config.monthlyAiQuota)} 次 AI 互動`,
      config.clientPortalEnabled ? "客戶入口與分享品牌" : "客戶分享頁",
    ];
  }

  return [
    "企業成員與單位上限可客製",
    `支援最多 ${formatNumber(config.maxUnits)} 個組織單位`,
    `每月 ${formatNumber(config.monthlyAiQuota)} 次以上 AI 互動`,
    "專屬客戶經理與 SLA",
  ];
}

function formatNumber(value: number): string {
  return value.toLocaleString("zh-TW");
}
