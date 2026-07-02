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
    price: "NT$300",
    period: "/月",
    description: "適合個人業務員，獨立準備每一次拜訪",
    features: [
      "適合個人使用",
      `每月 ${DEFAULT_PLAN_CONFIGS.STARTER.monthlyAiQuota} 次 AI 互動`,
      "用量剩餘 20% 時提醒購買",
      "Email 支援",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: "NT$600",
    period: "/月",
    description: "含通訊處團隊管理，適合帶團隊的主管",
    features: [
      "含通訊處團隊管理功能",
      "每人獨立 AI 用量，為個人用量的 5 倍",
      "用量剩餘 20% 時提醒購買",
      "團隊績效儀表板",
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
