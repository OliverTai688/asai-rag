export type PlanType = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export type PaymentProvider = "ECPAY" | "MANUAL" | "STRIPE_LEGACY";

export type SubscriptionOrderStatus =
  | "PENDING"
  | "AWAITING_NOTIFICATION"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "MANUAL_REVIEW";

export type PaymentTransactionStatus =
  | "CREATED"
  | "REDIRECTED"
  | "NOTIFIED"
  | "QUERY_CONFIRMED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

export type PlanLimitCode =
  | "MAX_MEMBERS_REACHED"
  | "MAX_COLLABORATORS_REACHED"
  | "MAX_UNITS_REACHED"
  | "MONTHLY_AI_QUOTA_REACHED";

export type InviteRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "AGENT" | "COLLABORATOR";

export interface PlanConfig {
  plan: PlanType;
  displayName: string;
  maxMembers: number;
  maxCollaborators: number;
  maxUnits: number;
  monthlyAiQuota: number;
  shareBrandingEnabled: boolean;
  clientPortalEnabled: boolean;
  impersonationAllowed: boolean;
}

export interface PlanUsageSnapshot {
  activeMembers: number;
  activeCollaborators: number;
  activeUnits: number;
  monthlyAiUsed: number;
}

export interface PlanLimitDecision {
  allowed: boolean;
  code?: PlanLimitCode;
  used?: number;
  limit?: number;
  message?: string;
}

export interface BillingCapabilitySnapshot {
  plan: PlanType;
  seatLimit: number;
  monthlyAiQuota: number;
  shareBrandingEnabled: boolean;
  clientPortalEnabled: boolean;
}

export interface SubscriptionOrderDraft {
  organizationId: string;
  plan: PlanType;
  amount: number;
  currency: "TWD";
  paymentProvider: PaymentProvider;
}

export interface BillingActivationResult {
  status: SubscriptionOrderStatus;
  capabilities?: BillingCapabilitySnapshot;
  message: string;
}
