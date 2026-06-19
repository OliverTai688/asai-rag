import { PLAN_DETAILS } from "@/domains/subscription/plans";
import { DEFAULT_PLAN_CONFIGS } from "@/domains/subscription/plan-config";
import type { PlanType } from "@/domains/subscription/types";
import { prisma } from "@/lib/prisma";

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

export interface PublicPricingPlanDto {
  id: PlanType;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
  capabilities: {
    maxMembers: number;
    maxCollaborators: number;
    maxUnits: number;
    monthlyAiQuota: number;
    shareBrandingEnabled: boolean;
    clientPortalEnabled: boolean;
  };
}

export interface PublicPricingDto {
  plans: PublicPricingPlanDto[];
  billing: {
    provider: "ECPAY";
    checkoutEnabled: boolean;
    mode: "test_ready_manual_enable";
    note: string;
  };
  source: "database" | "fallback";
}

const planMeta: Record<PlanType, { cta: string; highlighted?: boolean; badge?: string }> = {
  FREE: { cta: "免費開始" },
  STARTER: { cta: "選擇 Starter" },
  PRO: { cta: "選擇 Pro", highlighted: true, badge: "最受歡迎" },
  ENTERPRISE: { cta: "聯絡銷售" },
};

export async function getPublicPricing(): Promise<PublicPricingDto> {
  const rows = await prisma.planConfig.findMany({
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
  const byPlan = new Map(rows.map((row) => [row.plan as PlanType, row]));
  const source = rows.length > 0 ? "database" : "fallback";

  return {
    source,
    billing: {
      provider: "ECPAY",
      checkoutEnabled: false,
      mode: "test_ready_manual_enable",
      note: "綠界付款流程尚未開啟正式收款；正式 checkout 需 server notification/query 驗證後才啟用方案。",
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
        cta: meta.cta,
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
