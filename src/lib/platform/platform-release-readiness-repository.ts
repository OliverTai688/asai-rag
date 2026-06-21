import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import { getAgentProtocolRegistryReadiness } from "@/domains/ai-protocol";
import { prisma, prismaRuntimeDatabaseSource, prismaRuntimeDatabaseUrl } from "@/lib/prisma";
import { getPlatformSettings } from "./platform-settings-repository";

type DecimalLike = { toString(): string } | null | undefined;

export type ReleaseGateStatus = "pass" | "warning" | "blocked";

const STATUS_WEIGHT: Record<ReleaseGateStatus, number> = {
  pass: 0,
  warning: 1,
  blocked: 2,
};

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function numberOrZero(value: number | null | undefined) {
  return value ?? 0;
}

function decimalOrZero(value: DecimalLike) {
  return Number(value?.toString() ?? 0);
}

function percent(used: number, quota: number) {
  if (quota <= 0) return 0;
  return Math.round((used / quota) * 100);
}

function gate(status: ReleaseGateStatus, key: string, label: string, detail: string) {
  return { status, key, label, detail };
}

function worstStatus(statuses: ReleaseGateStatus[]) {
  return statuses.reduce<ReleaseGateStatus>(
    (current, next) => (STATUS_WEIGHT[next] > STATUS_WEIGHT[current] ? next : current),
    "pass",
  );
}

function projectFileExists(path: string) {
  return existsSync(join(/* turbopackIgnore: true */ process.cwd(), path));
}

function bffSurfaceGates() {
  const gates = [
    {
      key: "member_bff",
      surface: "member",
      status: projectFileExists("scripts/bff-dashboard-qa.mjs") ? "pass" : "blocked",
      evidenceCommand: "pnpm bff:dashboard-qa",
      detail: "Member dashboard is expected to use member-scoped BFF DTOs.",
    },
    {
      key: "org_bff",
      surface: "org",
      status: projectFileExists("scripts/bff-org-writes-qa.mjs") ? "pass" : "blocked",
      evidenceCommand: "pnpm bff:org-writes-qa",
      detail: "Org aggregate/write paths require capability and audit proof.",
    },
    {
      key: "ai_bff",
      surface: "ai",
      status: projectFileExists("scripts/bff-ai-boundary-qa.mjs") ? "pass" : "blocked",
      evidenceCommand: "pnpm bff:ai-boundary-qa",
      detail: "AI routes require capability, quota, launch posture, and AiUsageLog proof.",
    },
    {
      key: "client_portal_bff",
      surface: "client",
      status: projectFileExists("scripts/bff-client-portal-qa.mjs") ? "pass" : "blocked",
      evidenceCommand: "pnpm bff:client-portal-qa",
      detail: "Client portal token lifecycle and internal API isolation must be proven.",
    },
    {
      key: "platform_bff",
      surface: "platform",
      status: projectFileExists("scripts/bff-platform-qa.mjs") ? "pass" : "blocked",
      evidenceCommand: "pnpm bff:platform-qa",
      detail: "Platform session separation, metadata-only reads, audit proof ids, and break-glass proof are required.",
    },
    {
      key: "public_bff",
      surface: "public",
      status: "warning",
      evidenceCommand: "pnpm public:pricing-qa",
      detail: "Public pricing proof exists; public status/CTA availability BFF is still tracked by BFF-305.",
    },
    {
      key: "billing_bff",
      surface: "billing",
      status: "blocked",
      evidenceCommand: "BFF-401/BFF-402 pending",
      detail: "Checkout and notification/query idempotency BFF gates are not complete.",
    },
  ] satisfies Array<{
    key: string;
    surface: string;
    status: ReleaseGateStatus;
    evidenceCommand: string;
    detail: string;
  }>;

  return {
    status: worstStatus(gates.map((item) => item.status)),
    gates,
  };
}

function readinessLabel(status: ReleaseGateStatus) {
  if (status === "pass") return "Private beta gate clear";
  if (status === "warning") return "Needs operator review";
  return "Blocked before production";
}

export async function getPlatformReleaseReadiness() {
  const currentMonth = monthStart();
  const settings = await getPlatformSettings();
  const aiProtocolRegistry = getAgentProtocolRegistryReadiness();

  const [organizations, aiTotals, aiErrors, usageByModule, pendingBillingOrders] = await Promise.all([
    prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isDemo: true,
        monthlyAiQuota: true,
        monthlyAiUsed: true,
      },
      orderBy: [{ monthlyAiUsed: "desc" }, { updatedAt: "desc" }],
      take: 100,
    }),
    prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: currentMonth } },
      _count: { _all: true },
      _sum: { totalTokens: true, costUsd: true },
    }),
    prisma.aiUsageLog.count({
      where: { createdAt: { gte: currentMonth }, error: { not: null } },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["module"],
      where: { createdAt: { gte: currentMonth } },
      _count: { _all: true },
      _sum: { totalTokens: true, costUsd: true },
      orderBy: { module: "asc" },
    }),
    prisma.subscriptionOrder.count({ where: { status: { in: ["PENDING", "FAILED"] } } }),
  ]);

  const quotaOrganizations = organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    isDemo: organization.isDemo,
    monthlyAiQuota: organization.monthlyAiQuota,
    monthlyAiUsed: organization.monthlyAiUsed,
    usagePercent: percent(organization.monthlyAiUsed, organization.monthlyAiQuota),
  }));
  const quotaWarnings = quotaOrganizations.filter((organization) => organization.usagePercent >= 80);
  const quotaBlocked = quotaOrganizations.filter((organization) => organization.usagePercent >= 100);
  const quotaStatus: ReleaseGateStatus =
    quotaBlocked.length > 0 ? "blocked" : quotaWarnings.length > 0 ? "warning" : "pass";

  const productionEmailDisabled = settings.providerPolicy.productionEmailEnabled === false;
  const productionNotificationsDisabled = settings.providerPolicy.productionNotificationsEnabled === false;
  const billingCheckoutDisabled = settings.featureFlags.billingCheckoutEnabled === false;
  const mockApiDisabled = process.env.ALLOW_MOCK_API !== "true";
  const authSecretConfigured = Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);
  const runtimeDatabaseConfigured = Boolean(prismaRuntimeDatabaseUrl);
  const monitoringConfigured = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
  const privacyTermsReady =
    projectFileExists("src/app/(public)/privacy/page.tsx") &&
    projectFileExists("src/app/(public)/terms/page.tsx");
  const backupRunbookReady = projectFileExists("docs/08_acceptance-and-qa/ACC-007_release-rollback-and-backup-runbook.md");
  const ecpayChecklistReady = projectFileExists("docs/08_acceptance-and-qa/ACC-008_ecpay-test-flow-checklist.md");
  const bffGates = bffSurfaceGates();

  const controls = [
    gate(quotaStatus, "ai_quota", "AI quota guard", `${quotaWarnings.length} organization(s) at or above 80% usage.`),
    gate(mockApiDisabled ? "pass" : "blocked", "mock_api", "Mock API disabled", "ALLOW_MOCK_API must stay false outside dev/test."),
    gate(
      productionEmailDisabled ? "pass" : "blocked",
      "production_email",
      "Production email disabled",
      "Real email sends require explicit production approval.",
    ),
    gate(
      productionNotificationsDisabled ? "pass" : "blocked",
      "production_notifications",
      "Production notifications disabled",
      "Real notifications require explicit production approval.",
    ),
    gate(
      billingCheckoutDisabled ? "pass" : "blocked",
      "billing_checkout",
      "Billing checkout disabled",
      "ECPay checkout remains disabled until callback/query proof is complete.",
    ),
    gate(
      authSecretConfigured ? "pass" : "blocked",
      "auth_secret",
      "AUTH_SECRET configured",
      "Production Auth.js sessions require operator-provided AUTH_SECRET or NEXTAUTH_SECRET.",
    ),
    gate(
      runtimeDatabaseConfigured ? "pass" : "blocked",
      "runtime_database",
      "Runtime database configured",
      runtimeDatabaseConfigured
        ? `DB-backed routes have a runtime connection env (${prismaRuntimeDatabaseSource ?? "configured"}).`
        : "DB-backed routes require DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, DIRECT_URL, or POSTGRES_URL_NON_POOLING.",
    ),
    gate(
      monitoringConfigured ? "pass" : "blocked",
      "monitoring",
      "Error monitoring configured",
      "Sentry or equivalent DSN is required before public production.",
    ),
    gate(
      privacyTermsReady ? "pass" : "blocked",
      "legal_pages",
      "Privacy and terms pages",
      "Privacy policy, terms, and AI disclaimer still require release approval.",
    ),
    gate(
      backupRunbookReady ? "pass" : "blocked",
      "backup_restore",
      "Backup/restore runbook",
      "DB backup, restore drill, and migration rollback note must be documented.",
    ),
    gate(
      ecpayChecklistReady ? "pass" : "blocked",
      "ecpay_checklist",
      "ECPay test checklist",
      "ECPay test flow, CheckMacValue, callback, and query proof are still missing.",
    ),
    gate(
      bffGates.status,
      "bff_surface_gates",
      "Full-site BFF surface gates",
      `${bffGates.gates.filter((item) => item.status === "pass").length}/${bffGates.gates.length} BFF surface gate(s) have proof commands available.`,
    ),
  ];

  const overallStatus = worstStatus(controls.map((item) => item.status));
  const blockerCount = controls.filter((item) => item.status === "blocked").length;
  const warningCount = controls.filter((item) => item.status === "warning").length;

  return {
    generatedAt: new Date().toISOString(),
    periodStart: currentMonth.toISOString(),
    organizations: {
      total: organizations.length,
      active: organizations.filter((organization) => organization.status === "ACTIVE").length,
      demo: organizations.filter((organization) => organization.isDemo).length,
    },
    overall: {
      status: overallStatus,
      label: readinessLabel(overallStatus),
      blockerCount,
      warningCount,
    },
    aiUsage: {
      requests: aiTotals._count._all,
      totalTokens: numberOrZero(aiTotals._sum.totalTokens),
      estimatedCostUsd: decimalOrZero(aiTotals._sum.costUsd),
      errorCount: aiErrors,
      byModule: usageByModule.map((group) => ({
        module: group.module,
        requests: group._count._all,
        totalTokens: numberOrZero(group._sum.totalTokens),
        estimatedCostUsd: decimalOrZero(group._sum.costUsd),
      })),
    },
    aiProtocol: {
      scope: aiProtocolRegistry.scope,
      summary: aiProtocolRegistry.summary,
      agents: aiProtocolRegistry.agents.map((agent) => ({
        agentId: agent.agentId,
        displayName: agent.displayName,
        module: agent.module,
        status: agent.status,
        registryReadiness: agent.registryReadiness,
        ownerSurface: agent.ownerSurface,
        endpointCount: agent.interfaceSummary.endpointCount,
        actionCount: agent.interfaceSummary.actionCount,
        providerCostPosture: agent.quotaCost.providerCostPosture,
        aiUsageLogPolicy: agent.quotaCost.aiUsageLogPolicy,
        knownBlockers: agent.proof.knownBlockers,
      })),
      safety: aiProtocolRegistry.safety,
    },
    quota: {
      status: quotaStatus,
      organizationsAtWarning: quotaWarnings.length,
      organizationsAtLimit: quotaBlocked.length,
      topOrganizations: quotaOrganizations.slice(0, 5),
    },
    productionControls: {
      providerPolicy: settings.providerPolicy,
      featureFlags: settings.featureFlags,
      pendingBillingOrders,
      controls,
    },
    bffGates,
  };
}
