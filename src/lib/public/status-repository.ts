import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import type { PublicCheckoutAvailabilityStatus, PublicStatusDto } from "@/domains/public/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_FEATURE_FLAGS = {
  billingCheckoutEnabled: false,
  aiAssistantEnabled: true,
  publicLeadCaptureEnabled: true,
} as const;

const DEFAULT_PROVIDER_POLICY = {
  paymentProviderMode: "ECPAY_TEST_ONLY",
} as const;

type JsonObject = Record<string, unknown>;

function asObject(value: Prisma.JsonValue | null | undefined): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function boolOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function stringOrDefault<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function publicFileExists(path: string) {
  return existsSync(join(/* turbopackIgnore: true */ process.cwd(), path));
}

export async function getPublicStatus(): Promise<PublicStatusDto> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: {
      featureFlags: true,
      providerPolicy: true,
      updatedAt: true,
    },
  });
  const featureFlags = asObject(settings?.featureFlags);
  const providerPolicy = asObject(settings?.providerPolicy);
  const billingCheckoutEnabled = boolOrDefault(
    featureFlags.billingCheckoutEnabled,
    DEFAULT_FEATURE_FLAGS.billingCheckoutEnabled,
  );
  const aiAssistantEnabled = boolOrDefault(featureFlags.aiAssistantEnabled, DEFAULT_FEATURE_FLAGS.aiAssistantEnabled);
  const publicLeadCaptureEnabled = boolOrDefault(
    featureFlags.publicLeadCaptureEnabled,
    DEFAULT_FEATURE_FLAGS.publicLeadCaptureEnabled,
  );
  const paymentProviderMode = stringOrDefault(
    providerPolicy.paymentProviderMode,
    DEFAULT_PROVIDER_POLICY.paymentProviderMode,
    ["ECPAY_TEST_ONLY", "ECPAY_PRODUCTION_READY_DISABLED", "MANUAL_ONLY"] as const,
  );
  const checkoutStatus = billingCheckoutEnabled && paymentProviderMode === "ECPAY_TEST_ONLY" ? "sandbox" : "disabled";
  const primaryCta = buildPrimaryCta(checkoutStatus, publicLeadCaptureEnabled);

  return {
    version: "asai.public_status.v1",
    generatedAt: new Date().toISOString(),
    updatedAt: settings?.updatedAt.toISOString() ?? new Date(0).toISOString(),
    source: settings ? "database" : "fallback",
    maintenance: {
      status: "operational",
      label: "Private beta operational",
      message: "公開頁面可瀏覽；正式付款、email、notification 與 production launch 仍維持關閉。",
    },
    aiAvailability: {
      status: aiAssistantEnabled ? "available_private_beta" : "disabled",
      label: aiAssistantEnabled ? "AI modules gated behind authenticated workspace" : "AI modules disabled",
      authenticatedOnly: true,
      usageLoggingRequired: true,
      modules: [
        { id: "assistant", label: "誠問 AI 助手", status: aiAssistantEnabled ? "available_private_beta" : "disabled" },
        { id: "interview", label: "AI 了解客戶", status: aiAssistantEnabled ? "available_private_beta" : "disabled" },
        { id: "visit", label: "拜訪準備包", status: aiAssistantEnabled ? "available_private_beta" : "disabled" },
        { id: "theater", label: "AI 劇場演練", status: "guarded_disabled" },
        { id: "rag", label: "RAG knowledge base", status: "guarded_disabled" },
      ],
    },
    checkoutAvailability: {
      status: checkoutStatus,
      label: checkoutStatus === "sandbox" ? "Sandbox checkout disabled" : "Checkout disabled",
      provider: "ECPAY",
      checkoutEnabled: false,
      productionPaymentEnabled: false,
      reason:
        checkoutStatus === "sandbox"
          ? "綠界測試模式可作下一張 BFF-401 proof，但本 public CTA 不啟用付款導轉。"
          : "綠界正式收款尚未完成 callback/query/idempotency proof 與 operator approval。",
    },
    primaryCta,
    leadCapture: {
      status: publicLeadCaptureEnabled ? "enabled_private_beta" : "deferred",
      endpointEnabled: publicLeadCaptureEnabled,
      endpoint: publicLeadCaptureEnabled ? "/api/public/lead" : null,
      consentVersion: "public-beta-2026-06-21",
      reason: publicLeadCaptureEnabled
        ? "Private beta lead capture is enabled with consent, honeypot spam protection, rate limiting, and allowlisted DB persistence."
        : "Public lead capture requires rate limit, spam protection, consent version, allowlisted persistence, and abuse/failure proof.",
      requiredProof: publicLeadCaptureEnabled
        ? ["rate_limit", "honeypot_spam_protection", "consent_version", "allowlisted_persistence", "abuse_failure_proof"]
        : ["rate_limit", "spam_protection", "consent_version", "allowlisted_persistence", "abuse_failure_proof"],
    },
    legalStatus: {
      privacyPage: publicFileExists("src/app/(public)/privacy/page.tsx") ? "available" : "missing",
      termsPage: publicFileExists("src/app/(public)/terms/page.tsx") ? "available" : "missing",
      aiDisclaimer: "private_beta_required",
    },
    externalRegistry: {
      status: "not_public_discovery",
      note: "This endpoint is not a NANDA, AgentFacts, third-party registry, signed publication, or cross-organization agent access surface.",
    },
  };
}

function buildPrimaryCta(checkoutStatus: PublicCheckoutAvailabilityStatus, publicLeadCaptureEnabled: boolean) {
  if (checkoutStatus === "sandbox") {
    return {
      mode: "sandbox_checkout_disabled" as const,
      label: "測試環境結帳暫停",
      href: "/pricing",
      checkoutActionEnabled: false,
    };
  }

  if (publicLeadCaptureEnabled) {
    return {
      mode: "private_beta_lead_capture" as const,
      label: "申請 private beta",
      href: "/pricing#private-beta-lead",
      checkoutActionEnabled: false,
    };
  }

  return {
    mode: "private_beta_invite" as const,
    label: "進入 private beta 入口",
    href: "/login",
    checkoutActionEnabled: false,
  };
}
