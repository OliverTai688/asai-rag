import type {
  OrganizationPlan,
  OrganizationStatus,
  PaymentProvider,
} from "@/generated/prisma/enums";
import type { AppSession } from "@/lib/auth/session";

export const BILLING_SUBSCRIPTION_CAPABILITY_CONTRACT_VERSION =
  "asai.billing.subscription_capability.v1";

export type BillingUsageMetric = {
  used: number;
  pending: number;
  committed: number;
  limit: number;
  remaining: number;
  limitExceeded: boolean;
};

export type BillingSubscriptionCapabilityDto = {
  version: typeof BILLING_SUBSCRIPTION_CAPABILITY_CONTRACT_VERSION;
  source: "server_session";
  generatedAt: string;
  organization: {
    id: string;
    slug: string;
    plan: OrganizationPlan;
    status: OrganizationStatus;
  };
  currentPlan: {
    plan: OrganizationPlan;
    status: OrganizationStatus;
    paymentProvider: PaymentProvider | null;
    providerAccountAttached: boolean;
  };
  capability: {
    plan: OrganizationPlan;
    maxMembers: number;
    maxCollaborators: number;
    maxUnits: number;
    monthlyAiQuota: number;
    shareBrandingEnabled: boolean;
    clientPortalEnabled: boolean;
  };
  usage: {
    seats: BillingUsageMetric;
    collaborators: BillingUsageMetric;
    units: BillingUsageMetric;
    aiQuota: BillingUsageMetric;
  };
  checkoutStatus: {
    status: "disabled";
    mode: "production_disabled";
    provider: "ECPAY";
    endpoint: "/api/billing/checkout";
    productionPaymentEnabled: false;
    providerAttempted: false;
    orderCreated: false;
    transactionCreated: false;
    requiredProof: Array<
      | "server_signed_payload"
      | "notify_callback_verification"
      | "query_confirmation"
      | "idempotency"
    >;
  };
  activation: {
    planActivationSource: "confirmed_transaction_or_query_only";
    redirectOnlyActivationAllowed: false;
    browserPlanAssumptionsAllowed: false;
  };
  dataBoundary: {
    providerCredentialsReturned: false;
    providerRawPayloadReturned: false;
    providerAccountIdentifiersReturned: false;
    paymentTokenReturned: false;
    rawCookieReturned: false;
    rawSecretReturned: false;
  };
  safety: {
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    dbWriteAttempted: false;
    readOnlyDbAccess: true;
    rawPaymentDataStored: false;
  };
};

export type BillingSubscriptionCapabilitySnapshot = {
  paymentProvider: PaymentProvider | null;
  providerAccountAttached: boolean;
  activeMembers: number;
  pendingMembers: number;
  activeCollaborators: number;
  activeUnits: number;
};

export function buildBillingSubscriptionCapabilityDto(
  session: AppSession,
  snapshot: BillingSubscriptionCapabilitySnapshot,
): BillingSubscriptionCapabilityDto {
  return {
    version: BILLING_SUBSCRIPTION_CAPABILITY_CONTRACT_VERSION,
    source: "server_session",
    generatedAt: new Date().toISOString(),
    organization: {
      id: session.organization.id,
      slug: session.organization.slug,
      plan: session.organization.plan,
      status: session.organization.status,
    },
    currentPlan: {
      plan: session.organization.plan,
      status: session.organization.status,
      paymentProvider: snapshot.paymentProvider,
      providerAccountAttached: snapshot.providerAccountAttached,
    },
    capability: {
      plan: session.planCapability.plan,
      maxMembers: session.planCapability.maxMembers,
      maxCollaborators: session.planCapability.maxCollaborators,
      maxUnits: session.planCapability.maxUnits,
      monthlyAiQuota: session.planCapability.monthlyAiQuota,
      shareBrandingEnabled: session.planCapability.shareBrandingEnabled,
      clientPortalEnabled: session.planCapability.clientPortalEnabled,
    },
    usage: {
      seats: buildUsageMetric({
        used: snapshot.activeMembers,
        pending: snapshot.pendingMembers,
        limit: session.organization.seatLimit,
      }),
      collaborators: buildUsageMetric({
        used: snapshot.activeCollaborators,
        limit: session.planCapability.maxCollaborators,
      }),
      units: buildUsageMetric({
        used: snapshot.activeUnits,
        limit: session.planCapability.maxUnits,
      }),
      aiQuota: buildUsageMetric({
        used: session.organization.monthlyAiUsed,
        limit: session.organization.monthlyAiQuota,
      }),
    },
    checkoutStatus: {
      status: "disabled",
      mode: "production_disabled",
      provider: "ECPAY",
      endpoint: "/api/billing/checkout",
      productionPaymentEnabled: false,
      providerAttempted: false,
      orderCreated: false,
      transactionCreated: false,
      requiredProof: [
        "server_signed_payload",
        "notify_callback_verification",
        "query_confirmation",
        "idempotency",
      ],
    },
    activation: {
      planActivationSource: "confirmed_transaction_or_query_only",
      redirectOnlyActivationAllowed: false,
      browserPlanAssumptionsAllowed: false,
    },
    dataBoundary: {
      providerCredentialsReturned: false,
      providerRawPayloadReturned: false,
      providerAccountIdentifiersReturned: false,
      paymentTokenReturned: false,
      rawCookieReturned: false,
      rawSecretReturned: false,
    },
    safety: {
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      dbWriteAttempted: false,
      readOnlyDbAccess: true,
      rawPaymentDataStored: false,
    },
  };
}

function buildUsageMetric(input: {
  used: number;
  limit: number;
  pending?: number;
}): BillingUsageMetric {
  const pending = input.pending ?? 0;
  const committed = input.used + pending;

  return {
    used: input.used,
    pending,
    committed,
    limit: input.limit,
    remaining: Math.max(0, input.limit - committed),
    limitExceeded: committed > input.limit,
  };
}
