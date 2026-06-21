"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronLeft,
  FileText,
  Mail,
  Mic,
  Phone,
  ShieldCheck,
  Users,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useClientRecord } from "@/components/crm/use-client-record";
import { type Client, type ClientStatus } from "@/domains/client/types";
import { STRINGS } from "@/lib/i18n/strings";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/hooks/use-mounted";

export default function Client360Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  const { client, isLoading, error } = useClientRecord(clientId);
  const mounted = useMounted();

  if (isLoading && !client) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-hairline bg-card px-5 py-20 text-center">
        <Loader2 className="mb-4 h-7 w-7 animate-spin text-muted-foreground" />
        <p className="text-sm font-semibold text-muted-foreground">載入客戶資料中...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-hairline bg-card px-5 py-20 text-center">
        <p className="mb-2 text-lg font-semibold text-foreground">找不到該客戶</p>
        <p className="mb-4 text-sm text-muted-foreground">
          {error ? `錯誤代碼：${error}` : "可能沒有權限，或客戶已不存在。"}
        </p>
        <Button variant="mono" className="rounded-full" onClick={() => router.push("/crm")}>
          返回客戶列表
        </Button>
      </div>
    );
  }

  const tabs = [
    { name: "總覽", href: `/crm/${clientId}` },
    { name: "關係圖", href: `/crm/${clientId}/relationships` },
    { name: "活動時間軸", href: `/crm/${clientId}/timeline` },
    { name: "報告歷史", href: `/crm/${clientId}/reports` },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Link href="/crm" className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          客戶列表
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{client.name}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <IdentityRail client={client} mounted={mounted} />

        <div className="min-w-0 space-y-5">
          <div className="rounded-lg border border-hairline bg-card p-1">
            <nav className="flex gap-1 overflow-x-auto no-scrollbar" aria-label="客戶資料分頁">
              {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      isActive
                        ? "bg-paper-2 text-foreground"
                        : "text-muted-foreground hover:bg-paper-2 hover:text-foreground"
                    )}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="min-h-[480px]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function IdentityRail({ client, mounted }: { client: Client; mounted: boolean }) {
  const compliance = getComplianceSignal(client);

  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <Card className="overflow-hidden">
        <CardContent className="space-y-5 p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-hairline bg-ink text-paper">
                <Users className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Customer 360
                </p>
                <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                  {client.name}
                </h1>
                <p className="mt-1 truncate text-sm text-muted-foreground">{client.occupation}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={client.status} />
              <Badge variant={compliance.level === "ok" ? "outline" : "warning"} className="h-5 text-[10px] font-semibold">
                {compliance.label}
              </Badge>
            </div>

            <Link
              href={`/pre-visit?clientId=${client.id}&autoCreate=true`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              開始訪前規劃
            </Link>
            <Link
              data-testid="crm-meeting-entrypoint"
              href={`/crm/${client.id}/meeting`}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-hairline bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-hairline-2 hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Mic className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              AI 會議工作台
            </Link>
          </div>

          <div className="grid gap-2 border-t border-hairline pt-4">
            <InfoRow icon={Mail} label="電子郵件" value={mounted ? client.email : "---"} />
            <InfoRow icon={Phone} label="聯絡電話" value={mounted ? client.phone : "---"} />
            <InfoRow icon={Briefcase} label="年收入" value={mounted ? formatCurrency(client.annualIncome) : "---"} />
            <InfoRow icon={FileText} label="保單" value={`${client.existingPolicies.length} 張`} />
            <InfoRow icon={Users} label="家庭成員" value={`${client.family.length} 位`} />
          </div>

          <div className="border-t border-hairline pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              AI 標籤
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mounted && client.aiTags.length > 0 ? (
                client.aiTags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="h-5 text-[10px]">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs font-medium text-muted-foreground">尚未生成分析標籤</span>
              )}
            </div>
          </div>

          <div className="rounded-md border border-dashed border-hairline bg-paper-2/40 p-3">
            <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              編輯資料
            </div>
            <p className="text-[12px] leading-5 text-muted-foreground">
              長表單編輯將於後續 CRM 卡改為 right sheet；本卡先保留資料檢視與下一步主流程。
            </p>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-hairline bg-card px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ClientStatus }) {
  const variants: Record<ClientStatus, "secondary" | "success" | "outline"> = {
    PROSPECT: "secondary",
    ACTIVE: "success",
    CLOSED: "outline",
  };

  return (
    <Badge variant={variants[status]} className="h-5 text-[10px] font-semibold">
      {STRINGS.crm.categories[status]}
    </Badge>
  );
}

function getComplianceSignal(client: Client): { level: "ok" | "watch"; label: string } {
  if (!client.phone || !client.email) return { level: "watch", label: "資料待補" };
  if (client.existingPolicies.length === 0) return { level: "watch", label: "待盤點" };
  return { level: "ok", label: "KYC OK" };
}
