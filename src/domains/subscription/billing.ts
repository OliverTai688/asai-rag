import { getPlanConfig } from "./plan-config";
import type {
  BillingActivationResult,
  PaymentProvider,
  PaymentTransactionStatus,
  PlanType,
  SubscriptionOrderStatus,
} from "./types";

export const DEFAULT_PAYMENT_PROVIDER: PaymentProvider = "ECPAY";

export const ECPAY_CHECKOUT_FLOW = [
  "CREATE_ORDER",
  "REDIRECT_TO_ECPAY",
  "WAIT_SERVER_NOTIFICATION",
  "QUERY_PROVIDER_IF_NEEDED",
  "ACTIVATE_PLAN_CAPABILITIES",
] as const;

export function mapEcpayTradeStatus(status: string): PaymentTransactionStatus {
  switch (status) {
    case "1":
      return "PAID";
    case "0":
      return "FAILED";
    case "10100073":
      return "CANCELLED";
    default:
      return "NOTIFIED";
  }
}

export function deriveOrderStatusFromTransaction(
  status: PaymentTransactionStatus,
): SubscriptionOrderStatus {
  if (status === "PAID" || status === "QUERY_CONFIRMED") return "PAID";
  if (status === "FAILED") return "FAILED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "EXPIRED") return "EXPIRED";
  if (status === "NOTIFIED") return "AWAITING_NOTIFICATION";
  return "PENDING";
}

export function activatePlanFromPaidOrder(plan: PlanType): BillingActivationResult {
  const config = getPlanConfig(plan);

  return {
    status: "PAID",
    capabilities: {
      plan,
      seatLimit: config.maxMembers,
      monthlyAiQuota: config.monthlyAiQuota,
      shareBrandingEnabled: config.shareBrandingEnabled,
      clientPortalEnabled: config.clientPortalEnabled,
    },
    message: "付款已由 server-side notification 或 provider query 確認，可啟用方案能力。",
  };
}

export function rejectRedirectOnlyActivation(): BillingActivationResult {
  return {
    status: "AWAITING_NOTIFICATION",
    message: "已收到付款頁導回，但不得只依前端 redirect 啟用方案；需等待綠界 server notification 或查詢確認。",
  };
}
