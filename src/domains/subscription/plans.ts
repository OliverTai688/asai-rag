import { DEFAULT_PLAN_CONFIGS } from "./plan-config";
import type { PlanType } from "./types";

export interface PlanDetail {
  id: PlanType;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
}

export const PLAN_DETAILS: Record<PlanType, PlanDetail> = {
  FREE: {
    id: "FREE",
    name: "Free",
    price: "$0",
    period: "/月",
    description: "個人輕量試用，體驗核心拜訪流程",
    features: [
      `${DEFAULT_PLAN_CONFIGS.FREE.maxMembers} 位使用者`,
      "基礎 SPIN 對話練習",
      `每月 ${DEFAULT_PLAN_CONFIGS.FREE.monthlyAiQuota} 次 AI 互動`,
      "社群支援",
    ],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    price: "$29",
    period: "/月",
    description: "適合個人業務員的日常拜訪準備",
    features: [
      "1 位主要使用者",
      `最多 ${DEFAULT_PLAN_CONFIGS.STARTER.maxCollaborators} 位協作者`,
      `每月 ${DEFAULT_PLAN_CONFIGS.STARTER.monthlyAiQuota} 次 AI 互動`,
      "Email 支援",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: "$79",
    period: "/月",
    description: "團隊主管追蹤績效與輔導的首選",
    features: [
      `${DEFAULT_PLAN_CONFIGS.PRO.maxMembers} 位成員`,
      "團隊績效儀表板",
      `每月 ${DEFAULT_PLAN_CONFIGS.PRO.monthlyAiQuota.toLocaleString("zh-TW")} 次 AI 互動`,
      "優先支援與訓練",
    ],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "客製化導入、整合與專屬服務",
    features: [
      "企業成員與單位上限可客製",
      "支援總公司、區部、通訊處",
      "SSO / API 客製整合",
      "專屬客戶經理與 SLA",
    ],
  },
};
