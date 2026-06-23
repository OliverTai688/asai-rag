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

interface BffSubgate {
  key: string;
  label: string;
  status: ReleaseGateStatus;
  blockerType: "none" | "source" | "db" | "provider_env" | "operator_approval" | "production_approval";
  evidenceCommand: string;
  detail: string;
}

interface BffSurfaceGate {
  key: string;
  surface: string;
  status: ReleaseGateStatus;
  evidenceCommand: string;
  detail: string;
  subgates?: BffSubgate[];
}

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

function projectFilesExist(paths: string[]) {
  return paths.every((path) => projectFileExists(path));
}

function provenSubgate(key: string, label: string, evidenceCommand: string, detail: string, sourceFiles: string[]) {
  const sourceReady = projectFilesExist(sourceFiles);

  return {
    key,
    label,
    status: sourceReady ? "pass" : "blocked",
    blockerType: sourceReady ? "none" : "source",
    evidenceCommand,
    detail: sourceReady ? detail : "Required source or proof script is missing.",
  } satisfies BffSubgate;
}

function blockedSubgate(
  key: string,
  label: string,
  blockerType: BffSubgate["blockerType"],
  evidenceCommand: string,
  detail: string,
) {
  return {
    key,
    label,
    status: "blocked",
    blockerType,
    evidenceCommand,
    detail,
  } satisfies BffSubgate;
}

function billingBffSubgates() {
  return [
    provenSubgate(
      "checkout_disabled_contract",
      "Checkout disabled contract",
      "pnpm billing:checkout-qa",
      "Server-owned checkout BFF stays disabled and does not issue redirects, provider payloads, orders, transactions, or activation.",
      ["scripts/billing-checkout-qa.mjs", "src/app/api/billing/checkout/route.ts", "src/domains/subscription/checkout.ts"],
    ),
    provenSubgate(
      "ecpay_notify_disabled_skeleton",
      "ECPay notify/query disabled skeleton",
      "pnpm billing:ecpay-disabled-qa",
      "Notification/query routes accept provider-shaped payloads but remain guarded-disabled with duplicate-safe no-write/no-activation posture.",
      [
        "scripts/billing-ecpay-disabled-qa.mjs",
        "src/app/api/billing/ecpay/notify/route.ts",
        "src/app/api/billing/ecpay/query/route.ts",
        "src/domains/subscription/ecpay.ts",
      ],
    ),
    provenSubgate(
      "ecpay_checksum_boundary",
      "Server-only checksum boundary",
      "pnpm billing:ecpay-checkmac-qa",
      "Payment notification checksum validation is server-only and still guarded-disabled before server query and ledger persistence.",
      ["scripts/billing-ecpay-checkmac-qa.mjs", "src/domains/subscription/ecpay-checkmac.ts"],
    ),
    provenSubgate(
      "ledger_idempotency_contract",
      "Ledger idempotency contract",
      "pnpm billing:ledger-idempotency-qa",
      "Shared ledger contract defines uniqueness scope, duplicate-safe write plan, and no activation before confirmed ledger status.",
      ["scripts/billing-ledger-idempotency-qa.mjs", "src/domains/subscription/ledger.ts"],
    ),
    provenSubgate(
      "subscription_ui_consumption",
      "Subscription UI consumption",
      "pnpm billing:subscription-ui-qa",
      "Workspace/bootstrap/sidebar consume the server subscription DTO and do not infer paid capability from browser state.",
      [
        "scripts/billing-subscription-ui-qa.mjs",
        "src/lib/navigation/workspace-sidebar.ts",
        "src/components/layout/role-aware-sidebar.tsx",
      ],
    ),
    provenSubgate(
      "ecpay_server_query_guarded_boundary",
      "ECPay server query guarded boundary",
      "pnpm billing:ecpay-query-boundary-qa",
      "Server query boundary is typed and guarded-disabled: server-owned scope, no browser query, no provider call, no transaction upsert, and no activation.",
      [
        "scripts/billing-ecpay-query-boundary-qa.mjs",
        "src/app/api/billing/ecpay/query/route.ts",
        "src/domains/subscription/ecpay.ts",
      ],
    ),
    blockedSubgate(
      "ecpay_server_query_confirmation",
      "ECPay server query confirmation",
      "provider_env",
      "BFF-402f guarded boundary is proven; provider query proof pending",
      "The guarded server-query boundary exists, but no live/server-to-server ECPay provider query response validation proof exists yet; production payment cannot pass without it.",
    ),
    provenSubgate(
      "payment_transaction_persistence_guarded_contract",
      "Payment transaction persistence guarded contract",
      "pnpm billing:payment-transaction-persistence-qa",
      "PaymentTransaction persistence/upsert contract is typed and guarded-disabled: unique scope, allowlisted summary only, no DB write, no raw provider payload, no order update, and no activation.",
      [
        "scripts/billing-payment-transaction-persistence-qa.mjs",
        "src/domains/subscription/payment-transaction-persistence.ts",
        "src/domains/subscription/ecpay.ts",
      ],
    ),
    blockedSubgate(
      "payment_transaction_persistence",
      "Payment transaction persistence",
      "db",
      "BFF-402g guarded contract is proven; live DB upsert proof pending",
      "The guarded persistence contract exists, but no live PaymentTransaction DB upsert/write proof exists yet.",
    ),
    provenSubgate(
      "confirmed_activation_guarded_contract",
      "Confirmed activation guarded contract",
      "pnpm billing:confirmed-activation-qa",
      "Confirmed activation contract is typed and guarded-disabled: requires confirmed ledger and PaymentTransaction persistence, rejects browser/redirect/client plan signals, and does not mutate organization plan.",
      [
        "scripts/billing-confirmed-activation-qa.mjs",
        "src/domains/subscription/confirmed-activation.ts",
        "src/domains/subscription/ecpay.ts",
      ],
    ),
    blockedSubgate(
      "confirmed_activation",
      "Confirmed activation",
      "source",
      "BFF-402h guarded contract is proven; live activation proof pending",
      "Organization plan activation must stay blocked until live confirmed transaction/query, PaymentTransaction write, and plan mutation proof exist.",
    ),
    blockedSubgate(
      "production_payment_env_callback",
      "Production payment env and callback",
      "production_approval",
      "operator manual-setting + callback proof pending",
      "Production ECPay env, callback domain, and live callback proof require operator setup and approval.",
    ),
    blockedSubgate(
      "refund_void_manual_review",
      "Refund, void, and manual review",
      "operator_approval",
      "explicit approval required",
      "Destructive payment actions remain out of scope until separately approved.",
    ),
  ];
}

function billingBffGate() {
  const subgates = billingBffSubgates();
  const passCount = subgates.filter((item) => item.status === "pass").length;
  const blocked = subgates.filter((item) => item.status === "blocked");

  return {
    key: "billing_bff",
    surface: "billing",
    status: worstStatus(subgates.map((item) => item.status)),
    evidenceCommand: "pnpm bff:release-readiness-qa",
    detail:
      `${passCount}/${subgates.length} billing subgate(s) are proven. ` +
      `Blocked: ${blocked.map((item) => item.key).join(", ")}.`,
    subgates,
  } satisfies BffSurfaceGate;
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
      status: projectFileExists("scripts/public-status-qa.mjs") ? "pass" : "warning",
      evidenceCommand: "pnpm public:status-qa",
      detail: "Public pricing/status/CTA/lead capture uses a public-safe BFF contract with consent, honeypot, rate-limit, and no production payment/email/notification side effect.",
    },
    billingBffGate(),
  ] satisfies BffSurfaceGate[];

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
      "ECPay test flow, checksum validation, callback, and query proof are still missing.",
    ),
    gate(
      bffGates.status,
      "bff_surface_gates",
      "Full-site BFF surface gates",
      `${bffGates.gates.filter((item) => item.status === "pass").length}/${bffGates.gates.length} BFF surface gate(s) have proof commands available; billing subgates keep unfinished payment lifecycle blockers visible.`,
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
