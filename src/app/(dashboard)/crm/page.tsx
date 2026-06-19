"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  CalendarClock,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { clientService } from "@/domains/client/service";
import { useClientStore } from "@/domains/client/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { STRINGS } from "@/lib/i18n/strings";
import { Client, ClientStatus } from "@/domains/client/types";
import { cn } from "@/lib/utils";
import { AddClientDialog } from "@/components/crm/add-client-dialog";
import { FormattedTime } from "@/components/ui/formatted-time";
import { useMounted } from "@/lib/hooks/use-mounted";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortMode = "RECENT" | "NAME" | "STATUS";

export default function CRMListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "ALL">("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("RECENT");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mounted = useMounted();
  const allClients = useClientStore((state) => state.clients);

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      try {
        setIsLoadingClients(true);
        setLoadError(null);
        await clientService.fetchClients();
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "CLIENT_LOAD_FAILED");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingClients(false);
        }
      }
    }

    void loadClients();

    return () => {
      cancelled = true;
    };
  }, []);
  
  const filteredClients = useMemo(() => {
    const filtered = allClients.filter(client => {
      const matchSearch = client.name.toLowerCase().includes(search.toLowerCase()) || 
                          client.email.toLowerCase().includes(search.toLowerCase()) ||
                          client.phone.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || client.status === statusFilter;
      return matchSearch && matchStatus;
    });

    return filtered.toSorted((a, b) => {
      if (sortMode === "NAME") return a.name.localeCompare(b.name, "zh-Hant");
      if (sortMode === "STATUS") return a.status.localeCompare(b.status);
      return new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime();
    });
  }, [allClients, search, statusFilter, sortMode]);

  const stats = useMemo(() => {
    return {
      total: allClients.length,
      prospects: allClients.filter((client) => client.status === "PROSPECT").length,
      active: allClients.filter((client) => client.status === "ACTIVE").length,
      needsKyc: allClients.filter((client) => getComplianceSignal(client).level !== "ok").length,
    };
  }, [allClients]);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-3 border-b border-hairline pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            CRM Records
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground">
            {STRINGS.crm.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            快速找到客戶、辨識合規狀態，並接上下一步拜訪動作。
          </p>
        </div>
        <Button 
          variant="mono"
          className="h-11 w-full rounded-full px-5 text-sm font-semibold sm:w-fit"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {STRINGS.crm.addClient}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatPill label="全部客戶" value={stats.total} icon={Users} />
        <StatPill label="潛在客戶" value={stats.prospects} icon={Sparkles} />
        <StatPill label="正式客戶" value={stats.active} icon={UserRound} />
        <StatPill label="需補資料" value={stats.needsKyc} icon={ShieldCheck} />
      </div>

      <Card className="overflow-visible">
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input 
              placeholder="搜尋姓名、Email 或電話" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
            />
          </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <StatusFilter value={statusFilter} onChange={setStatusFilter} />
              <SortControl value={sortMode} onChange={setSortMode} />
              <Button variant="outline" size="sm" className="h-10 gap-2 rounded-lg px-3">
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
                欄位
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
            <p className="text-[12px] font-medium text-muted-foreground">
              顯示 <span className="font-semibold tabular-nums text-foreground">{filteredClients.length}</span> 位客戶
              {statusFilter !== "ALL" && `・${STRINGS.crm.categories[statusFilter]}`}
            </p>
            {(search || statusFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-[12px]"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                }}
              >
                清除篩選
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!mounted || isLoadingClients ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-hairline bg-card py-24">
          <Loader2 className="mb-4 h-7 w-7 animate-spin text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">載入客戶資料中...</p>
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-dashed border-hairline bg-card px-5 py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-hairline bg-paper-2 text-muted-foreground">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-foreground">無法載入客戶資料</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            請確認登入狀態或稍後再試。錯誤代碼：{loadError}
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setLoadError(null);
                setIsLoadingClients(true);
                void clientService.fetchClients()
                  .catch((error: unknown) => {
                    setLoadError(error instanceof Error ? error.message : "CLIENT_LOAD_FAILED");
                  })
                  .finally(() => setIsLoadingClients(false));
              }}
            >
              重新載入
            </Button>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline bg-card px-5 py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-hairline bg-paper-2 text-muted-foreground">
            <Users className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-foreground">找不到客戶</h3>
          <p className="mt-2 text-sm text-muted-foreground">調整關鍵字或狀態篩選，或新增第一位客戶。</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => {setSearch(""); setStatusFilter("ALL");}}>清除篩選</Button>
            <Button variant="mono" className="rounded-full" onClick={() => setIsAddDialogOpen(true)}>新增客戶</Button>
          </div>
        </div>
      ) : (
        <ClientRecordList clients={filteredClients} />
      )}

      <AddClientDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <Card size="sm" className="hover:translate-y-0">
      <CardContent className="flex items-center justify-between gap-3 p-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
          <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: ClientStatus | "ALL";
  onChange: (value: ClientStatus | "ALL") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="h-10 gap-2 rounded-lg px-3">
            <Filter className="h-4 w-4" strokeWidth={1.5} />
            {value === "ALL" ? "所有狀態" : STRINGS.crm.categories[value]}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={() => onChange("ALL")}>所有狀態</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("PROSPECT")}>潛在客戶</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("ACTIVE")}>正式客戶</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("CLOSED")}>結案客戶</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortControl({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (value: SortMode) => void;
}) {
  const labels: Record<SortMode, string> = {
    RECENT: "最近互動",
    NAME: "姓名",
    STATUS: "狀態",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="h-10 gap-2 rounded-lg px-3">
            <ArrowUpDown className="h-4 w-4" strokeWidth={1.5} />
            {labels[value]}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={() => onChange("RECENT")}>最近互動</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("NAME")}>姓名</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("STATUS")}>狀態</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientRecordList({ clients }: { clients: Client[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[920px] text-left">
          <thead className="border-b border-hairline bg-paper-2/60">
            <tr>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">客戶</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">狀態</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">合規 / KYC</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">AI 標籤</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">最近互動</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">下一步</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {clients.map((client) => (
              <tr key={client.id} className="group transition-colors hover:bg-paper-2/70">
                <td className="px-4 py-3">
                  <Link href={`/crm/${client.id}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary">{client.name}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{client.email}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{client.phone}</p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-4 py-3">
                  <ComplianceBadge client={client} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {client.aiTags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="h-5 text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                    {client.aiTags.length > 2 && <span className="text-[10px] font-semibold text-muted-foreground">+{client.aiTags.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <FormattedTime isoString={client.lastInteraction} format="date" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/pre-visit?clientId=${client.id}`} className="inline-flex h-10 items-center gap-1 rounded-md border border-hairline bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:border-hairline-2 hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    規劃拜訪
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActions client={client} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-hairline lg:hidden">
        {clients.map((client) => (
          <div key={client.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/crm/${client.id}`} className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <p className="truncate text-base font-semibold text-foreground">{client.name}</p>
                <p className="mt-1 truncate text-[12px] text-muted-foreground">{client.occupation}・{client.email}</p>
              </Link>
              <RowActions client={client} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={client.status} />
              <ComplianceBadge client={client} />
            </div>

            <div className="flex flex-wrap gap-1">
              {client.aiTags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="h-5 text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-paper-2 px-3 py-2">
              <div className="min-w-0 text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">最近互動</span>
                <span className="mx-1">·</span>
                <FormattedTime isoString={client.lastInteraction} format="date" />
              </div>
              <Link href={`/pre-visit?clientId=${client.id}`} className="inline-flex h-11 shrink-0 items-center gap-1 rounded-md bg-ink px-3 text-[12px] font-semibold text-paper">
                規劃
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
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

function ComplianceBadge({ client }: { client: Client }) {
  const signal = getComplianceSignal(client);
  return (
    <Badge
      variant={signal.level === "ok" ? "outline" : "warning"}
      className={cn("h-5 text-[10px] font-semibold", signal.level === "ok" && "text-muted-foreground")}
    >
      {signal.label}
    </Badge>
  );
}

function getComplianceSignal(client: Client): { level: "ok" | "watch"; label: string } {
  if (!client.phone || !client.email) return { level: "watch", label: "資料待補" };
  if (client.existingPolicies.length === 0) return { level: "watch", label: "待盤點" };
  return { level: "ok", label: "KYC OK" };
}

function RowActions({ client }: { client: Client }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-11 lg:size-10" aria-label={`${client.name} 更多操作`}>
                  <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              }
            />
          }
        />
        <TooltipContent>更多操作</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem>
          <Link href={`/crm/${client.id}`} className="flex w-full items-center gap-2">
            查看詳情
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href={`/pre-visit?clientId=${client.id}`} className="flex w-full items-center gap-2">
            規劃拜訪
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
