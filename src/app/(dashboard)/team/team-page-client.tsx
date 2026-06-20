"use client";

import type { OrgTeamDashboardDto } from "@/domains/org/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  ShieldCheck,
  Target,
  UserPlus,
  Users2,
} from "lucide-react";

interface TeamPageClientProps {
  dashboard: OrgTeamDashboardDto;
}

export function TeamPageClient({ dashboard }: TeamPageClientProps) {
  const priority = dashboard.coachingQueue[0] ?? null;
  const aiUsageRate =
    dashboard.aiUsage.quota > 0
      ? Math.min(100, Math.round((dashboard.aiUsage.used / dashboard.aiUsage.quota) * 100))
      : 0;
  const metrics = [
    {
      label: "需輔導成員",
      value: dashboard.totals.membersNeedingCoaching,
      unit: "人",
      icon: Users2,
    },
    {
      label: "席次使用",
      value: dashboard.seats.used,
      unit: `/${dashboard.seats.limit}`,
      icon: UserPlus,
    },
    {
      label: "規劃完成率",
      value: dashboard.totals.planCoverage,
      unit: "%",
      icon: ClipboardCheck,
    },
    {
      label: "草稿待收斂",
      value: dashboard.totals.draftPlans,
      unit: "份",
      icon: AlertCircle,
    },
    {
      label: "AI 用量",
      value: dashboard.aiUsage.used,
      unit: "次",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-hairline pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full border-hairline text-[11px]">
              Org admin
            </Badge>
            <Badge variant="secondary" className="w-fit rounded-full text-[11px]">
              Aggregate only
            </Badge>
            <Badge variant="outline" className="w-fit rounded-full border-hairline text-[11px]">
              {dashboard.source}
            </Badge>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">通訊處輔導台</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {dashboard.organization.name}・主管只看彙總、訓練與健康訊號，不進入 member 的客戶明細。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 w-fit gap-2 border-hairline">
            <UserPlus className="size-4" />
            邀請成員
          </Button>
          <Button variant="outline" className="h-10 w-fit border-hairline">
            匯出月報
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.units.map((unit, index) => (
          <button
            key={unit.id}
            type="button"
            className="rounded-lg border border-hairline bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-pressed={index === 0}
          >
            <div className="flex items-center justify-between gap-3">
              <Building2 className="size-4 text-muted-foreground" />
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {unit.members} 人
              </span>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium text-ink">{unit.label}</p>
              <p className="text-xs text-muted-foreground">{unit.risk}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <Card className="border-hairline bg-card">
          <CardContent className="grid min-w-0 gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            {priority ? (
              <>
                <div className="min-w-0 space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      今日優先
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      依 server-owned aggregate signals 排序
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                    <div className="flex size-14 items-center justify-center rounded-full border border-hairline bg-paper text-lg font-semibold text-ink">
                      {priority.avatar}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight text-ink">
                          {priority.name}
                        </h2>
                        <Badge variant="outline" className="rounded-full border-hairline text-[11px]">
                          {priority.signal.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm leading-6 text-muted-foreground">
                        <p className="break-words">{priority.signal.reason}</p>
                        <p className="break-words">下一步：{priority.signal.nextAction}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="border-l border-hairline pl-3">
                      <p className="text-xs text-muted-foreground">規劃完成率</p>
                      <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                        {priority.signal.completionRate}%
                      </p>
                    </div>
                    <div className="border-l border-hairline pl-3">
                      <p className="text-xs text-muted-foreground">未收斂草稿</p>
                      <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                        {priority.stats.visitPlans.draft}
                      </p>
                    </div>
                    <div className="border-l border-hairline pl-3">
                      <p className="text-xs text-muted-foreground">輔導訊號</p>
                      <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                        {priority.signal.riskScore}
                      </p>
                    </div>
                  </div>
                </div>
                <Button variant="mono" className="h-11 w-fit min-w-0 max-w-full gap-2">
                  <Target className="size-4" />
                  安排輔導
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Badge variant="secondary" className="rounded-full">
                  今日優先
                </Badge>
                <h2 className="text-2xl font-semibold tracking-tight text-ink">目前沒有需要介入的成員</h2>
                <p className="text-sm text-muted-foreground">可先檢查 AI 使用覆蓋與本週訓練動作。</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-hairline bg-card">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <metric.icon className="size-4 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">30d</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                    {metric.value}
                    <span className="ml-1 font-sans text-xs font-medium tabular-nums text-muted-foreground">
                      {metric.unit}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-hairline bg-card">
          <CardContent className="p-0">
            <div className="flex flex-col gap-2 border-b border-hairline p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">輔導佇列</h2>
                <p className="text-sm text-muted-foreground">
                  以需要介入的下一步排序，排行榜降為參考。
                </p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full border-hairline">
                {dashboard.coachingQueue.length} 位成員
              </Badge>
            </div>

            <div className="divide-y divide-hairline">
              {dashboard.coachingQueue.map((member, index) => (
                <div
                  key={member.id}
                  className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,0.85fr)_minmax(0,1.15fr)_220px] lg:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-paper text-sm font-semibold text-ink">
                      {member.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{member.name}</p>
                        {index === 0 ? (
                          <Badge variant="secondary" className="rounded-full text-[11px]">
                            Priority
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.role}・{member.region}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground">完成率</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {member.signal.completionRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">草稿</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {member.stats.visitPlans.draft}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">SPIN</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {member.stats.spinSessions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">報告</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {member.stats.closedThisMonth}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
                    <div>
                      <p className="text-sm font-medium text-ink">{member.signal.reason}</p>
                      <p className="text-xs text-muted-foreground">{member.signal.nextAction}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 justify-between border-hairline px-3"
                      aria-label={`查看 ${member.name} 的輔導紀錄`}
                    >
                      查看紀錄
                      <ArrowUpRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-6">
          <Card className="border-hairline bg-card">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">席次與邀請</h2>
                  <p className="text-sm text-muted-foreground">依方案上限管理，不顯示個別客戶。</p>
                </div>
                <ShieldCheck className="size-4 text-muted-foreground" />
              </div>
              <div className="space-y-4">
                {[
                  {
                    label: "成員席次",
                    value: dashboard.seats.used,
                    max: dashboard.seats.limit,
                  },
                  {
                    label: "待接受邀請",
                    value: dashboard.seats.pendingInvites,
                    max: dashboard.seats.limit,
                  },
                  {
                    label: "個人版協作者上限",
                    value: dashboard.seats.collaboratorLimit,
                    max: Math.max(1, dashboard.seats.collaboratorLimit),
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono tabular-nums text-ink">
                        {item.value}/{item.max}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-ink"
                        style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="h-10 w-full justify-between border-hairline">
                  管理邀請與席次
                  <ArrowUpRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline bg-card">
            <CardContent className="space-y-5 p-5">
              <div>
                <h2 className="text-base font-semibold text-ink">訓練動作</h2>
                <p className="text-sm text-muted-foreground">下一步以輔導行動排序。</p>
              </div>
              <div className="space-y-3">
                {dashboard.trainingActions.map((action) => (
                  <div key={`${action.title}-${action.owner}`} className="rounded-md border border-hairline p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{action.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.owner}・{action.timing}
                        </p>
                      </div>
                      <Target className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{action.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline bg-card">
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-base font-semibold text-ink">AI 使用覆蓋</h2>
                <p className="text-sm text-muted-foreground">
                  僅顯示彙總用量，供主管調整訓練節奏。
                </p>
              </div>
              {[
                { label: "訪前規劃覆蓋率", value: dashboard.totals.planCoverage },
                {
                  label: "AI quota 使用率",
                  value: aiUsageRate,
                },
                {
                  label: "輔導 prompt 覆蓋",
                  value: Math.min(100, Math.round(dashboard.aiUsage.coachingPrompts * 2.5)),
                },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono tabular-nums text-ink">{item.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="rounded-md border border-hairline p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">劇場演練</span>
                  <span className="font-mono tabular-nums text-ink">
                    {dashboard.aiUsage.theaterSessions} 場
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
