import {
  Activity,
  AlertTriangle,
  Clock,
  CreditCard,
  FileSearch,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PLATFORM_SESSION_BOUNDARY,
  evaluateImpersonationRequest,
} from "@/domains/platform/impersonation";
import { requirePlatformRoute } from "@/lib/auth/route-guards";
import {
  getPlatformReleaseReadiness,
  type ReleaseGateStatus,
} from "@/lib/platform/platform-release-readiness-repository";

const now = new Date("2026-06-18T10:00:00+08:00");
const sampleDecision = evaluateImpersonationRequest({
  actorUserId: "platform_support_demo",
  actorRole: "SUPPORT",
  targetOrgId: "demo_org_asai_personal",
  targetUserId: "demo_user_member",
  reason: "客戶回報分享頁權限錯誤，需要限時確認授權狀態。",
  scope: ["ORG_SUMMARY", "SUPPORT_DIAGNOSTICS"],
  startsAt: now.toISOString(),
  expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
});

const auditRows = [
  {
    action: "IMPERSONATION_START",
    actor: "support@sincere-ai.internal",
    target: "demo-asai-personal",
    sensitivity: "BREAK_GLASS",
    time: "10:00",
  },
  {
    action: "BILLING_UPDATE",
    actor: "finance@sincere-ai.internal",
    target: "永信保險經紀",
    sensitivity: "MEDIUM",
    time: "09:42",
  },
  {
    action: "VIEW_SUMMARY",
    actor: "admin@sincere-ai.internal",
    target: "平台彙總",
    sensitivity: "LOW",
    time: "09:20",
  },
];

export default async function SuperAdminPage() {
  await requirePlatformRoute();
  const readiness = await getPlatformReleaseReadiness();
  const maxQuotaUsage = readiness.quota.topOrganizations[0]?.usagePercent ?? 0;
  const highRiskControls = readiness.productionControls.controls.filter(
    (control) => control.status !== "pass",
  );
  const metrics = [
    {
      label: "Active orgs",
      value: String(readiness.organizations.active),
      helper: `${readiness.organizations.demo} demo / ${readiness.organizations.total} total`,
      icon: Activity,
    },
    {
      label: "AI usage",
      value: `${maxQuotaUsage}%`,
      helper: `${readiness.aiUsage.requests} request(s), ${readiness.aiUsage.errorCount} error(s)`,
      icon: FileSearch,
    },
    {
      label: "Billing queue",
      value: String(readiness.productionControls.pendingBillingOrders),
      helper: "pending / failed orders",
      icon: CreditCard,
    },
    {
      label: "Release blockers",
      value: String(readiness.overall.blockerCount),
      helper: `${readiness.overall.warningCount} warning(s)`,
      icon: AlertTriangle,
    },
  ];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-hairline pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full border-hairline">
                Platform session
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Separate from app/client
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">Super admin 控制台</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                預設只看彙總、用量、付款、事件與支援資訊。查看敏感內容或 impersonation 必須有 reason、scope、expiry 與 audit log。
              </p>
            </div>
          </div>
          <Button variant="mono" className="h-10 w-fit gap-2">
            <LockKeyhole className="size-4" />
            Break-glass request
          </Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-hairline bg-card">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <metric.icon className="size-4 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">platform</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-ink">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="border-hairline bg-card">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ServerCog className="size-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold text-ink">Release readiness</h2>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Production controls are read-only here. Blocked items stay visible until operator approval
                    or release evidence is complete.
                  </p>
                </div>
                <ReadinessBadge status={readiness.overall.status} label={readiness.overall.label} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <ReadinessMetric label="Blockers" value={String(readiness.overall.blockerCount)} />
                <ReadinessMetric label="Warnings" value={String(readiness.overall.warningCount)} />
                <ReadinessMetric label="AI cost" value={`$${readiness.aiUsage.estimatedCostUsd.toFixed(4)}`} />
              </div>
              <div className="divide-y divide-hairline rounded-lg border border-hairline">
                {readiness.productionControls.controls.map((control) => (
                  <div
                    key={control.key}
                    className="grid gap-3 p-4 md:grid-cols-[150px_minmax(0,1fr)] md:items-start"
                  >
                    <ReadinessBadge status={control.status} label={control.status} compact />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{control.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{control.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline bg-card">
            <CardContent className="space-y-5 p-5">
              <div>
                <h2 className="text-base font-semibold text-ink">AI quota warning</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Organizations at or above 80% monthly quota require operator review before expanding beta access.
                </p>
              </div>
              <div className="space-y-3">
                {readiness.quota.topOrganizations.map((organization) => (
                  <div key={organization.id} className="rounded-lg border border-hairline p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-ink">{organization.name}</p>
                      <Badge
                        variant={organization.usagePercent >= 100 ? "destructive" : organization.usagePercent >= 80 ? "warning" : "outline"}
                        className="rounded-full"
                      >
                        {organization.usagePercent}%
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {organization.monthlyAiUsed} / {organization.monthlyAiQuota} monthly AI unit(s)
                    </p>
                  </div>
                ))}
                {readiness.quota.topOrganizations.length === 0 ? (
                  <p className="rounded-lg border border-hairline p-3 text-sm text-muted-foreground">
                    No organization quota records yet.
                  </p>
                ) : null}
              </div>
              {highRiskControls.length > 0 ? (
                <div className="rounded-lg border border-hairline bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    Next release blocker
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink">{highRiskControls[0].label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{highRiskControls[0].detail}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="border-hairline bg-card">
            <CardContent className="p-0">
              <div className="border-b border-hairline p-5">
                <h2 className="text-base font-semibold text-ink">Impersonation gate</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Support 可以限時接管；Finance 不可 impersonate。所有操作都要寫 AuditLog。
                </p>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-3">
                <PolicyTile
                  icon={ShieldCheck}
                  label="Allowed platform roles"
                  value={PLATFORM_SESSION_BOUNDARY.allowedRoles.join(" / ")}
                />
                <PolicyTile icon={Clock} label="Expiry" value="必填，最多 60 分鐘" />
                <PolicyTile icon={UserRoundCog} label="Scope" value="必填，不允許全域無痕接管" />
              </div>
              <div className="border-t border-hairline p-5">
                <div className="rounded-lg border border-hairline bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">Sample support request</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        客戶回報分享頁權限錯誤，需要限時確認授權狀態。
                      </p>
                    </div>
                    <Badge
                      variant={sampleDecision.allowed ? "success" : "destructive"}
                      className="w-fit rounded-full"
                    >
                      {sampleDecision.allowed ? "Audit-ready" : "Blocked"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{sampleDecision.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline bg-card">
            <CardContent className="space-y-5 p-5">
              <div>
                <h2 className="text-base font-semibold text-ink">Break-glass rules</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  敏感讀取不在預設視圖中出現。
                </p>
              </div>
              {[
                "無 reason 不可 impersonate。",
                "無 expiry 不可 impersonate。",
                "Support 不可永久接管帳號。",
                "所有敏感讀寫必須帶 impersonationSessionId。",
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-3 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm leading-6 text-ink">{rule}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="border-hairline bg-card">
            <CardContent className="p-0">
              <div className="border-b border-hairline p-5">
                <h2 className="text-base font-semibold text-ink">Audit trail</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  範例顯示 audit metadata，不顯示客戶明細或對話全文。
                </p>
              </div>
              <div className="divide-y divide-hairline">
                {auditRows.map((row) => (
                  <div key={`${row.action}-${row.time}`} className="grid gap-3 p-5 md:grid-cols-[180px_minmax(0,1fr)_120px] md:items-center">
                    <div>
                      <p className="font-mono text-xs font-semibold text-ink">{row.action}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.time}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{row.actor}</p>
                      <p className="truncate text-xs text-muted-foreground">target: {row.target}</p>
                    </div>
                    <Badge variant={row.sensitivity === "BREAK_GLASS" ? "destructive" : "outline"} className="w-fit rounded-full">
                      {row.sensitivity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline bg-card">
            <CardContent className="space-y-5 p-5">
              <div>
                <h2 className="text-base font-semibold text-ink">Default visibility</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Super admin 預設不讀敏感內容。
                </p>
              </div>
              {[
                "Organization plan / billing status",
                "AI usage cost and quota",
                "Error, support, audit event metadata",
                "No client detail without break-glass",
              ].map((item) => (
                <div key={item} className="rounded-md border border-hairline p-3 text-sm text-ink">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function PolicyTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-hairline p-4">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ReadinessMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function ReadinessBadge({
  status,
  label,
  compact = false,
}: {
  status: ReleaseGateStatus;
  label: string;
  compact?: boolean;
}) {
  const variant = status === "pass" ? "success" : status === "warning" ? "warning" : "destructive";

  return (
    <Badge variant={variant} className={`rounded-full ${compact ? "capitalize" : ""}`}>
      {label}
    </Badge>
  );
}
