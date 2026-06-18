"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { demoAdminMetrics, demoSubscriptionOrders } from "@/domains/demo/seed-fixtures";
import type { SubscriptionOrderStatus } from "@/domains/subscription/types";

const statusBadge: Record<SubscriptionOrderStatus, "success" | "warning" | "destructive" | "outline"> = {
  PAID: "success",
  PENDING: "warning",
  AWAITING_NOTIFICATION: "warning",
  FAILED: "destructive",
  CANCELLED: "outline",
  EXPIRED: "outline",
  MANUAL_REVIEW: "warning",
};

const statusLabel: Record<SubscriptionOrderStatus, string> = {
  PAID: "已付款",
  PENDING: "待建立",
  AWAITING_NOTIFICATION: "待通知",
  FAILED: "失敗",
  CANCELLED: "已取消",
  EXPIRED: "已逾期",
  MANUAL_REVIEW: "手動審核",
};

const navItems = [
  { label: "儀表板", icon: LayoutDashboard, active: true },
  { label: "訂閱訂單", icon: CreditCard, active: false },
  { label: "系統設定", icon: Settings, active: false },
];

export default function AdminDashboardPage() {
  const [trialDays, setTrialDays] = useState(14);

  const handleSaveTrialDays = () => {
    toast.success(`已更新預設試用天數為 ${trialDays} 天`);
  };

  const pendingOrders = demoSubscriptionOrders.filter((order) =>
    ["PENDING", "AWAITING_NOTIFICATION", "MANUAL_REVIEW"].includes(order.status),
  ).length;
  const failedOrders = demoSubscriptionOrders.filter((order) => order.status === "FAILED").length;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-ink text-sm font-semibold text-paper">
              誠
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">誠問 AI</p>
              <p className="text-[11px] text-muted-foreground">Admin Console</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Admin navigation">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors",
                  item.active
                    ? "bg-ink text-paper"
                    : "text-muted-foreground hover:bg-muted hover:text-ink"
                )}
                aria-pressed={item.active}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <section className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="max-w-2xl space-y-2">
            <Badge variant="outline" className="w-fit rounded-full border-hairline text-[11px]">
              Operations
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">營運控制台</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                監控訂閱收入、試用轉換與近期付款狀態。
              </p>
            </div>
          </div>
          <Card className="border-hairline bg-card">
            <CardContent className="space-y-3 p-4">
              <p className="text-xs text-muted-foreground">需要處理</p>
              <div className="flex items-end gap-3">
                <p className="font-mono text-3xl font-semibold tabular-nums text-ink">
                  {pendingOrders + failedOrders}
                </p>
                <p className="pb-1 text-sm text-muted-foreground">筆訂單</p>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {pendingOrders} 筆處理中，{failedOrders} 筆付款失敗。
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Wallet}
            label="總營收"
            value={`$${demoAdminMetrics.totalRevenue.toLocaleString()}`}
            hint="本月累積"
          />
          <MetricCard
            icon={Users}
            label="活躍訂閱數"
            value={demoAdminMetrics.activeSubscriptions.toString()}
            hint="付費組織數"
          />
          <MetricCard
            icon={TrendingUp}
            label="活躍試用"
            value={demoAdminMetrics.activeTrials.toString()}
            hint="試用中組織"
          />
          <MetricCard
            icon={BarChart3}
            label="轉換率"
            value={`${(demoAdminMetrics.conversionRate * 100).toFixed(0)}%`}
            hint="試用轉付費"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="border-hairline bg-card">
            <CardContent className="space-y-5 p-5">
              <div>
                <h2 className="text-base font-semibold text-ink">試用設定</h2>
                <p className="mt-1 text-sm text-muted-foreground">調整全站預設試用天數。</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial-days">預設試用天數</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="trial-days"
                    type="number"
                    min={0}
                    value={trialDays}
                    onChange={(event) => setTrialDays(Number(event.target.value))}
                    className="h-10 w-28"
                  />
                  <span className="text-sm text-muted-foreground">天</span>
                </div>
              </div>
              <Button variant="mono" onClick={handleSaveTrialDays} className="h-10 w-full">
                儲存設定
              </Button>
            </CardContent>
          </Card>

          <Card className="border-hairline bg-card">
            <CardContent className="p-0">
              <div className="flex flex-col gap-2 border-b border-hairline p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">近期訂閱訂單</h2>
                  <p className="text-sm text-muted-foreground">最新付款與試用轉換紀錄。</p>
                </div>
                <Badge variant="outline" className="w-fit rounded-full border-hairline">
                  {demoSubscriptionOrders.length} 筆
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-medium">訂單編號</th>
                      <th className="px-5 py-3 font-medium">組織</th>
                      <th className="px-5 py-3 font-medium">金額</th>
                      <th className="px-5 py-3 font-medium">狀態</th>
                      <th className="px-5 py-3 font-medium">日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoSubscriptionOrders.map((order) => (
                      <tr key={order.id} className="border-b border-hairline last:border-0">
                        <td className="px-5 py-4 font-mono text-xs tabular-nums text-ink">
                          {order.id}
                        </td>
                        <td className="px-5 py-4 font-medium text-ink">{order.organizationName}</td>
                        <td className="px-5 py-4 font-mono tabular-nums text-ink">
                          ${order.amount.toLocaleString()} {order.currency}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={statusBadge[order.status]} className="rounded-full">
                            {statusLabel[order.status]}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{order.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">30d</span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
