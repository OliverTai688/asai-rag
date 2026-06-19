"use client";

import { useMemo } from "react";
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

const MOCK_TEAM_MEMBERS = [
  {
    id: "me",
    name: "王小明 (您)",
    role: "Agent",
    region: "台北一區",
    avatar: "王",
    color: "bg-[#1A3A6B]",
    status: "online",
    tags: ["SPIN 高手", "連戰連捷"],
    stats: {
      closedThisMonth: 4,
      revenue: 284000,
      spinSessions: 12,
      visitPlans: { total: 15, completed: 8, draft: 7 },
      aiInsightHits: 42,
    },
  },
  {
    id: "2",
    name: "李美玲",
    role: "Senior Agent",
    region: "台北二區",
    avatar: "李",
    color: "bg-orange-500",
    status: "online",
    tags: ["Top Performer", "儲蓄險王"],
    stats: {
      closedThisMonth: 7,
      revenue: 512000,
      spinSessions: 21,
      visitPlans: { total: 24, completed: 18, draft: 6 },
      aiInsightHits: 68,
    },
  },
  {
    id: "3",
    name: "張大壯",
    role: "Manager",
    region: "全台",
    avatar: "張",
    color: "bg-emerald-500",
    status: "away",
    tags: ["管理職"],
    stats: {
      closedThisMonth: 2,
      revenue: 198000,
      spinSessions: 8,
      visitPlans: { total: 10, completed: 5, draft: 5 },
      aiInsightHits: 24,
    },
  },
  {
    id: "4",
    name: "陳雅婷",
    role: "Agent",
    region: "新北區",
    avatar: "陳",
    color: "bg-pink-500",
    status: "online",
    tags: ["新人之星"],
    stats: {
      closedThisMonth: 3,
      revenue: 167000,
      spinSessions: 9,
      visitPlans: { total: 12, completed: 4, draft: 8 },
      aiInsightHits: 31,
    },
  },
];

const unitOptions = [
  { id: "all", label: "全通訊處", members: 4, risk: "2 人需介入" },
  { id: "taipei-1", label: "台北一區", members: 1, risk: "節奏穩定" },
  { id: "taipei-2", label: "台北二區", members: 1, risk: "可萃取範例" },
  { id: "new-taipei", label: "新北區", members: 1, risk: "草稿偏多" },
];

const seatSnapshot = {
  used: 4,
  limit: 8,
  pendingInvites: 2,
  collaboratorLimit: 2,
};

const aiUsageSnapshot = {
  used: 642,
  quota: 1000,
  coachingPrompts: 38,
  theaterSessions: 12,
};

const trainingActions = [
  {
    title: "訪前規劃校準",
    owner: "陳雅婷",
    timing: "今日 16:00",
    detail: "草稿量偏高，先協助收斂拜訪準備包。",
  },
  {
    title: "SPIN 節奏演練",
    owner: "張大壯",
    timing: "明日早會",
    detail: "對話量偏低，安排一次情境劇場暖身。",
  },
  {
    title: "最佳做法萃取",
    owner: "李美玲",
    timing: "本週五",
    detail: "將高完成率工作流整理成團隊範本。",
  },
];

const getCompletionRate = (completed: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

const getCoachingSignal = (member: (typeof MOCK_TEAM_MEMBERS)[number]) => {
  const completionRate = getCompletionRate(
    member.stats.visitPlans.completed,
    member.stats.visitPlans.total
  );
  const draftCount = member.stats.visitPlans.draft;
  const spinSessions = member.stats.spinSessions;
  const riskScore =
    (100 - completionRate) * 0.45 +
    draftCount * 4 +
    (spinSessions < 10 ? 14 : 0);

  if (completionRate < 45) {
    return {
      completionRate,
      riskScore: Math.round(riskScore),
      reason: "訪前規劃完成率偏低",
      nextAction: "安排 20 分鐘規劃檢查",
      status: "優先輔導",
    };
  }

  if (draftCount >= 7) {
    return {
      completionRate,
      riskScore: Math.round(riskScore),
      reason: "草稿堆積，需要收斂拜訪準備",
      nextAction: "一起清理待完成準備包",
      status: "需要跟進",
    };
  }

  if (spinSessions < 10) {
    return {
      completionRate,
      riskScore: Math.round(riskScore),
      reason: "SPIN 對話量低於團隊節奏",
      nextAction: "安排一次劇場演練",
      status: "節奏偏低",
    };
  }

  return {
    completionRate,
    riskScore: Math.round(riskScore),
    reason: "表現穩定，可萃取最佳做法",
    nextAction: "整理成團隊範例",
    status: "穩定",
  };
};

export function TeamPageClient() {
  const coachingQueue = useMemo(
    () =>
      MOCK_TEAM_MEMBERS.map((member) => ({
        member,
        signal: getCoachingSignal(member),
      })).sort((a, b) => b.signal.riskScore - a.signal.riskScore),
    []
  );

  const priority = coachingQueue[0];
  const teamTotals = useMemo(() => {
    const totalPlans = MOCK_TEAM_MEMBERS.reduce(
      (sum, member) => sum + member.stats.visitPlans.total,
      0
    );
    const completedPlans = MOCK_TEAM_MEMBERS.reduce(
      (sum, member) => sum + member.stats.visitPlans.completed,
      0
    );
    const draftPlans = MOCK_TEAM_MEMBERS.reduce(
      (sum, member) => sum + member.stats.visitPlans.draft,
      0
    );
    const insights = MOCK_TEAM_MEMBERS.reduce(
      (sum, member) => sum + member.stats.aiInsightHits,
      0
    );

    return {
      planCoverage: getCompletionRate(completedPlans, totalPlans),
      draftPlans,
      insights,
      membersNeedingCoaching: coachingQueue.filter(
        (item) => item.signal.status !== "穩定"
      ).length,
    };
  }, [coachingQueue]);

  const metrics = [
    {
      label: "需輔導成員",
      value: teamTotals.membersNeedingCoaching,
      unit: "人",
      icon: Users2,
    },
    {
      label: "席次使用",
      value: seatSnapshot.used,
      unit: `/${seatSnapshot.limit}`,
      icon: UserPlus,
    },
    {
      label: "規劃完成率",
      value: teamTotals.planCoverage,
      unit: "%",
      icon: ClipboardCheck,
    },
    {
      label: "草稿待收斂",
      value: teamTotals.draftPlans,
      unit: "份",
      icon: AlertCircle,
    },
    {
      label: "AI 用量",
      value: aiUsageSnapshot.used,
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
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">通訊處輔導台</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              主管只看彙總、訓練與健康訊號，不進入 member 的客戶明細。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 w-fit border-hairline gap-2">
            <UserPlus className="size-4" />
            邀請成員
          </Button>
          <Button variant="outline" className="h-10 w-fit border-hairline">
            匯出月報
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {unitOptions.map((unit) => (
          <button
            key={unit.id}
            type="button"
            className="rounded-lg border border-hairline bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-pressed={unit.id === "all"}
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
            <div className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  今日優先
                </Badge>
                <span className="text-xs text-muted-foreground">
                  依規劃完成率、草稿量與 SPIN 節奏排序
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                <div className="flex size-14 items-center justify-center rounded-full border border-hairline bg-paper text-lg font-semibold text-ink">
                  {priority.member.avatar}
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">
                      {priority.member.name}
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
                    {priority.member.stats.visitPlans.draft}
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
                {coachingQueue.length} 位成員
              </Badge>
            </div>

            <div className="divide-y divide-hairline">
              {coachingQueue.map(({ member, signal }, index) => (
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
                        {signal.completionRate}%
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
                      <p className="text-[11px] text-muted-foreground">成交</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {member.stats.closedThisMonth}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
                    <div>
                      <p className="text-sm font-medium text-ink">{signal.reason}</p>
                      <p className="text-xs text-muted-foreground">{signal.nextAction}</p>
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
                    value: seatSnapshot.used,
                    max: seatSnapshot.limit,
                  },
                  {
                    label: "待接受邀請",
                    value: seatSnapshot.pendingInvites,
                    max: seatSnapshot.limit,
                  },
                  {
                    label: "個人版協作者上限",
                    value: seatSnapshot.collaboratorLimit,
                    max: seatSnapshot.collaboratorLimit,
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
                {trainingActions.map((action) => (
                  <div key={action.title} className="rounded-md border border-hairline p-3">
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
                { label: "訪前規劃覆蓋率", value: teamTotals.planCoverage },
                {
                  label: "AI quota 使用率",
                  value: Math.min(
                    100,
                    Math.round((aiUsageSnapshot.used / aiUsageSnapshot.quota) * 100)
                  ),
                },
                {
                  label: "輔導 prompt 覆蓋",
                  value: Math.min(100, Math.round(aiUsageSnapshot.coachingPrompts * 2.5)),
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
                    {aiUsageSnapshot.theaterSessions} 場
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
