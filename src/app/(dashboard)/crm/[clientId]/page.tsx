"use client";

import { useParams } from "next/navigation";
import { useClientRecord } from "@/components/crm/use-client-record";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, FileText, HeartPulse, Sparkles, Users } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function ClientOverviewPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { client } = useClientRecord(clientId);

  if (!client) return null;

  const totalCoverage = client.existingPolicies.reduce((sum, policy) => sum + policy.amount, 0);
  const familySignal =
    client.family.length > 0
      ? `${client.family.length} 位家庭成員需納入保障視角`
      : "尚未建立家庭責任資料";
  const policySignal =
    client.existingPolicies.length > 0
      ? `${client.existingPolicies.length} 張保單，總保額 ${formatCurrency(totalCoverage)}`
      : "尚未建立既有保單盤點";
  const aiTags = client.aiTags.length > 0 ? client.aiTags : ["保障盤點", "下一步訪談"];
  const nextBestActions = [
    client.family.length > 0 ? "先確認家庭責任與主要受扶養人" : "先補齊家庭與受益人背景",
    client.existingPolicies.length > 0 ? "比對既有保單與目前收入責任" : "建立第一版保障缺口基準",
    "用 SPIN 問題收斂面談焦點",
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
        <Card className="min-h-[320px]">
          <CardHeader className="gap-3 border-b border-hairline pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge variant="secondary" className="h-5 text-[10px] font-semibold">
                  下一步判斷
                </Badge>
                <CardTitle className="max-w-2xl text-2xl font-semibold tracking-tight">
                  先把訪談聚焦在家庭責任、既有保單與缺口優先順序。
                </CardTitle>
              </div>
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2 text-foreground sm:flex">
                <Sparkles className="h-5 w-5" strokeWidth={1.5} />
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              基於職業、家庭成員與保單資料，這一頁只整理顧問下一次談話需要知道的事；
              產生訪前規劃的主行動已固定在左側客戶欄，避免同屏多個 CTA 互相搶焦。
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 pt-1 md:grid-cols-3">
            {nextBestActions.map((action, index) => (
              <div key={action} className="rounded-md border border-hairline bg-card p-4">
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-md bg-ink text-xs font-semibold tabular-nums text-paper">
                  {index + 1}
                </div>
                <p className="text-sm font-semibold leading-6 text-foreground">{action}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-hairline pb-4">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" strokeWidth={1.5} />
              需要先釐清
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignalRow
              label="保障盤點"
              value={policySignal}
              tone={client.existingPolicies.length > 0 ? "ok" : "watch"}
            />
            <SignalRow
              label="家庭責任"
              value={familySignal}
              tone={client.family.length > 0 ? "ok" : "watch"}
            />
            <SignalRow
              label="收入責任"
              value={`${formatCurrency(client.annualIncome)} 年收入，可作為保額與保費承受度基準`}
              tone="ok"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <SummaryCard
          icon={Users}
          label="家庭網絡"
          value={`${client.family.length} 位`}
          description={
            client.family.length > 0
              ? client.family.map((member) => member.relation).slice(0, 3).join("、")
              : "尚未補齊家庭角色"
          }
        />
        <SummaryCard
          icon={FileText}
          label="既有保單"
          value={`${client.existingPolicies.length} 張`}
          description={client.existingPolicies[0]?.type ?? "待建立保單清單"}
        />
        <SummaryCard
          icon={HeartPulse}
          label="AI 標籤"
          value={`${aiTags.length} 個`}
          description={aiTags.slice(0, 3).join("、")}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="border-b border-hairline pb-4">
            <CardTitle>保障缺口摘要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistItem checked={client.existingPolicies.length > 0}>
              已有保單資料，可先做保障類型與保額覆蓋比對。
            </ChecklistItem>
            <ChecklistItem checked={client.family.length > 0}>
              家庭角色已建立，適合用家庭責任切入下一輪訪談。
            </ChecklistItem>
            <ChecklistItem checked={client.tags.length > 0}>
              顧問標籤可作為面談開場與風險偏好線索。
            </ChecklistItem>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-hairline pb-4">
            <CardTitle>可用談話線索</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[...client.tags, ...aiTags].slice(0, 8).map((tag) => (
                <Badge key={tag} variant="secondary" className="h-6 text-[11px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              後續可在訪前規劃中把這些線索轉成 SPIN 問題與面談備忘；本頁保留為掃描用摘要。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SignalRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "watch";
}) {
  return (
    <div className="rounded-md border border-hairline bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <Badge variant={tone === "ok" ? "outline" : "warning"} className="h-5 text-[10px]">
          {tone === "ok" ? "可用" : "待補"}
        </Badge>
      </div>
      <p className="text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
          <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistItem({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border border-hairline bg-card p-3">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-hairline bg-paper-2">
        {checked ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        )}
      </div>
      <p className="text-sm leading-6 text-foreground">{children}</p>
    </div>
  );
}
