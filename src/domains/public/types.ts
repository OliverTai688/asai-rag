export type PublicSurfaceSource = "database" | "fallback";

export type PublicMaintenanceStatus = "operational" | "maintenance";

export type PublicAiAvailabilityStatus = "available_private_beta" | "disabled";

export type PublicCheckoutAvailabilityStatus = "disabled" | "sandbox";

export type PublicPrimaryCtaMode = "private_beta_invite" | "private_beta_lead_capture" | "sandbox_checkout_disabled";

export type PublicLeadCaptureStatus = "enabled_private_beta" | "deferred";

export type PublicLeadSource = "landing" | "pricing" | "footer" | "manual";

export type PublicLeadPlanInterest = "FREE" | "STARTER" | "PRO" | "ENTERPRISE" | "UNSURE";

export interface PublicStatusDto {
  version: "asai.public_status.v1";
  generatedAt: string;
  updatedAt: string;
  source: PublicSurfaceSource;
  maintenance: {
    status: PublicMaintenanceStatus;
    label: string;
    message: string;
  };
  aiAvailability: {
    status: PublicAiAvailabilityStatus;
    label: string;
    authenticatedOnly: boolean;
    usageLoggingRequired: boolean;
    modules: Array<{
      id: "assistant" | "interview" | "visit" | "theater" | "rag";
      label: string;
      status: PublicAiAvailabilityStatus | "guarded_disabled";
    }>;
  };
  checkoutAvailability: {
    status: PublicCheckoutAvailabilityStatus;
    label: string;
    provider: "ECPAY";
    checkoutEnabled: boolean;
    productionPaymentEnabled: false;
    reason: string;
  };
  primaryCta: {
    mode: PublicPrimaryCtaMode;
    label: string;
    href: string;
    checkoutActionEnabled: boolean;
  };
  leadCapture: {
    status: PublicLeadCaptureStatus;
    endpointEnabled: boolean;
    endpoint: "/api/public/lead" | null;
    consentVersion: string;
    reason: string;
    requiredProof: string[];
  };
  legalStatus: {
    privacyPage: "available" | "missing";
    termsPage: "available" | "missing";
    aiDisclaimer: "private_beta_required";
  };
  externalRegistry: {
    status: "not_public_discovery";
    note: string;
  };
}

export interface PublicPricingPlanDto {
  id: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaMode: PublicStatusDto["primaryCta"]["mode"] | "enterprise_contact";
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
  availability: Pick<PublicStatusDto, "checkoutAvailability" | "primaryCta" | "leadCapture" | "legalStatus">;
  source: PublicSurfaceSource;
}
