"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  ListFilter,
  Loader2,
  Plus,
  Search,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormattedTime } from "@/components/ui/formatted-time";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { demoQuickstart, getQuickstartStep } from "@/domains/demo/quickstart";
import { previsitTourSteps } from "@/domains/demo/tour-steps";
import { resolveClientFromList } from "@/domains/client/id-aliases";
import { clientService } from "@/domains/client/service";
import { useClientStore } from "@/domains/client/store";
import { type Client } from "@/domains/client/types";
import { useVisitStore } from "@/domains/visit/store";
import { type VisitPlan, type VisitPlanStatus, type VisitPurpose } from "@/domains/visit/types";
import { cn } from "@/lib/utils";

const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

const STATUS_LABELS: Record<VisitPlanStatus, string> = {
  DRAFT: "待準備",
  READY: "可拜訪",
  COMPLETED: "已完成",
};

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: "全部狀態",
  DRAFT: STATUS_LABELS.DRAFT,
  READY: STATUS_LABELS.READY,
  COMPLETED: STATUS_LABELS.COMPLETED,
};

const SORT_LABELS: Record<SortMode, string> = {
  TIME_ASC: "時間最近",
  UPDATED_DESC: "最近更新",
};

type ViewMode = "ALL" | "UPCOMING";
type StatusFilter = "ALL" | VisitPlanStatus;
type SortMode = "TIME_ASC" | "UPDATED_DESC";

function PreVisitListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQuickstart = searchParams.get("demo") === "quickstart";
  const { plans, createEmptyPlan } = useVisitStore();
  const { clients } = useClientStore();
  const autoCreatedRef = useRef(false);
  const preselectedClientParamRef = useRef<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(!isQuickstart);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("TIME_ASC");
  const [query, setQuery] = useState("");
  const [newPlanClientId, setNewPlanClientId] = useState("");
  const [newPlanPurpose, setNewPlanPurpose] = useState<VisitPurpose>("FIRST_VISIT");
  const [newPlanTime, setNewPlanTime] = useState("");

  const selectedClientId = newPlanClientId || (isQuickstart ? demoQuickstart.clientId : "");
  const selectedPurpose = newPlanClientId
    ? newPlanPurpose
    : isQuickstart
      ? (demoQuickstart.purpose as VisitPurpose)
      : newPlanPurpose;
  const selectedClient = clients.find((client) => client.id === selectedClientId);

  useEffect(() => {
    if (isQuickstart) return;

    let cancelled = false;

    async function loadClients() {
      try {
        setIsLoadingClients(true);
        setClientLoadError(null);
        await clientService.fetchClients();
      } catch (error) {
        if (!cancelled) {
          setClientLoadError(error instanceof Error ? error.message : "CLIENT_LOAD_FAILED");
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
  }, [isQuickstart]);

  useEffect(() => {
    const requestedClientId = searchParams.get("clientId");

    if (isQuickstart || !requestedClientId || requestedClientId === preselectedClientParamRef.current) {
      return;
    }

    const resolvedClient = resolveClientFromList(clients, requestedClientId);

    if (!resolvedClient) return;

    preselectedClientParamRef.current = requestedClientId;
    queueMicrotask(() => setNewPlanClientId(resolvedClient.id));
  }, [clients, isQuickstart, searchParams]);

  useEffect(() => {
    const autoCreate = searchParams.get("autoCreate");
    const requestedClientId = searchParams.get("clientId");

    if (autoCreatedRef.current || autoCreate !== "true" || !requestedClientId) {
      return;
    }

    const resolvedClient = resolveClientFromList(clients, requestedClientId);

    if (!resolvedClient) return;

    autoCreatedRef.current = true;
    const planId = createEmptyPlan(resolvedClient.id, "FIRST_VISIT");
    router.replace(`/pre-visit/${planId}${isQuickstart ? "?demo=quickstart" : ""}`);
  }, [clients, createEmptyPlan, isQuickstart, router, searchParams]);

  const planRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...plans]
      .filter((plan) => {
        const client = resolveClientFromList(clients, plan.clientId);
        const matchesStatus = statusFilter === "ALL" || plan.status === statusFilter;
        const matchesView =
          viewMode === "ALL" ||
          (Boolean(plan.visitTime) && plan.status !== "COMPLETED");
        const matchesQuery =
          !normalizedQuery ||
          client?.name.toLowerCase().includes(normalizedQuery) ||
          PURPOSE_LABELS[plan.purpose].toLowerCase().includes(normalizedQuery);

        return matchesStatus && matchesView && matchesQuery;
      })
      .sort((a, b) => {
        if (sortMode === "UPDATED_DESC") {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }

        if (a.visitTime && b.visitTime) {
          return new Date(a.visitTime).getTime() - new Date(b.visitTime).getTime();
        }
        if (a.visitTime) return -1;
        if (b.visitTime) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [clients, plans, query, sortMode, statusFilter, viewMode]);

  const activePlans = plans.filter((plan) => plan.status !== "COMPLETED").length;
  const readyPlans = plans.filter((plan) => plan.status === "READY").length;
  const draftPlans = plans.filter((plan) => plan.status === "DRAFT").length;
  const nextPlan = [...plans]
    .filter((plan) => plan.visitTime && plan.status !== "COMPLETED")
    .sort((a, b) => new Date(a.visitTime ?? 0).getTime() - new Date(b.visitTime ?? 0).getTime())[0];

  const handleCreatePlan = () => {
    if (!selectedClientId) return;
    const planId = createEmptyPlan(selectedClientId, selectedPurpose, newPlanTime || undefined);
    setIsDialogOpen(false);
    setNewPlanClientId("");
    setNewPlanPurpose("FIRST_VISIT");
    setNewPlanTime("");
    router.push(`/pre-visit/${planId}${isQuickstart ? "?demo=quickstart" : ""}`);
  };

  if (isQuickstart) {
    return (
      <QuickstartPreVisitStart
        clientName={selectedClient?.name ?? demoQuickstart.clientName}
        occupation={selectedClient?.occupation ?? "示範客戶"}
        onStart={handleCreatePlan}
      />
    );
  }

  if (isLoadingClients) {
    return <PreVisitLoadingState />;
  }

  if (clientLoadError) {
    return <PreVisitClientLoadError error={clientLoadError} />;
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-4 border-b border-hairline pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Visit planning
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">訪前規劃</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            先選客戶、目的與時間，快速建立 AI 準備包；列表只保留客戶、目的、時間、狀態與下一步。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/pre-visit?demo=quickstart"
            className="inline-flex h-9 items-center justify-center rounded-full border border-hairline bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-2 hover:border-hairline-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            試跑示範
          </Link>
          <CreatePlanDialog
            clients={clients}
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            selectedClient={selectedClient}
            selectedClientId={selectedClientId}
            selectedPurpose={selectedPurpose}
            newPlanTime={newPlanTime}
            onClientChange={setNewPlanClientId}
            onPurposeChange={setNewPlanPurpose}
            onTimeChange={setNewPlanTime}
            onCreate={handleCreatePlan}
          />
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="待處理" value={`${activePlans} 件`} helper="尚未完成" />
        <MetricCard label="可拜訪" value={`${readyPlans} 件`} helper="準備包已就緒" />
        <MetricCard label="草稿" value={`${draftPlans} 件`} helper="需要補內容" />
        <MetricCard
          label="下一次"
          value={nextPlan?.visitTime ? formatVisitDate(nextPlan.visitTime) : "--"}
          helper={nextPlan ? getClientName(clients, nextPlan.clientId) : "尚未排程"}
        />
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-lg border border-hairline bg-card p-1">
              {[
                { value: "ALL", label: "全部" },
                { value: "UPCOMING", label: "即將拜訪" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setViewMode(option.value as ViewMode)}
                  className={cn(
                    "h-8 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    viewMode === option.value
                      ? "bg-paper-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_150px_150px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜尋客戶或目的"
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger size="sm" aria-label="篩選狀態">
                  <ListFilter className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="flex-1 text-left">{STATUS_FILTER_LABELS[statusFilter]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部狀態</SelectItem>
                  <SelectItem value="DRAFT">待準備</SelectItem>
                  <SelectItem value="READY">可拜訪</SelectItem>
                  <SelectItem value="COMPLETED">已完成</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                <SelectTrigger size="sm" aria-label="排序">
                  <span className="flex-1 text-left">{SORT_LABELS[sortMode]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIME_ASC">時間最近</SelectItem>
                  <SelectItem value="UPDATED_DESC">最近更新</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {plans.length === 0 ? (
            <EmptyPlansState onCreate={() => setIsDialogOpen(true)} />
          ) : planRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-hairline bg-paper-2/40 px-5 py-12 text-center">
              <p className="font-semibold text-foreground">沒有符合條件的拜訪規劃</p>
              <p className="mt-1 text-sm text-muted-foreground">調整搜尋、狀態或視圖後再試一次。</p>
            </div>
          ) : (
            <div className="divide-y divide-hairline rounded-lg border border-hairline">
              {planRows.map((plan) => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  clientName={getClientName(clients, plan.clientId)}
                  onOpen={() => router.push(`/pre-visit/${plan.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreatePlanDialog({
  clients,
  open,
  onOpenChange,
  selectedClient,
  selectedClientId,
  selectedPurpose,
  newPlanTime,
  onClientChange,
  onPurposeChange,
  onTimeChange,
  onCreate,
}: {
  clients: Client[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClient?: Client;
  selectedClientId: string;
  selectedPurpose: VisitPurpose;
  newPlanTime: string;
  onClientChange: (clientId: string) => void;
  onPurposeChange: (purpose: VisitPurpose) => void;
  onTimeChange: (time: string) => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        新增規劃
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-lg">建立拜訪規劃</DialogTitle>
          <DialogDescription>
            三個欄位即可建立準備包，後續細節會在計畫頁整理。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">客戶</label>
            <Select value={selectedClientId} onValueChange={(value) => onClientChange(value ?? "")}>
              <SelectTrigger>
                {selectedClient ? (
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {selectedClient.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {selectedClient.occupation}
                    </span>
                  </span>
                ) : (
                  <span className="flex-1 text-left text-sm text-muted-foreground">選擇客戶</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <span className="font-semibold">{client.name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{client.occupation}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">拜訪目的</label>
              <Select
                value={selectedPurpose}
                onValueChange={(value) => onPurposeChange(value as VisitPurpose)}
              >
                <SelectTrigger>
                  <span className="flex-1 text-left">{PURPOSE_LABELS[selectedPurpose]}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="visitTime" className="text-sm font-semibold text-foreground">
                拜訪時間
              </label>
              <Input
                id="visitTime"
                type="datetime-local"
                value={newPlanTime}
                onChange={(event) => onTimeChange(event.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" variant="mono" onClick={onCreate} disabled={!selectedClientId}>
            開始規劃
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function PlanRow({
  plan,
  clientName,
  onOpen,
}: {
  plan: VisitPlan;
  clientName: string;
  onOpen: () => void;
}) {
  const nextStep = getNextStep(plan);

  return (
    <article className="grid gap-3 px-4 py-4 transition-colors hover:bg-paper-2/60 md:grid-cols-[minmax(0,1.2fr)_120px_190px_110px_112px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
          <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{clientName}</p>
          <p className="text-xs text-muted-foreground">更新於 {formatVisitDate(plan.updatedAt)}</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          目的
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{PURPOSE_LABELS[plan.purpose]}</p>
      </div>

      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="h-4 w-4 text-primary" strokeWidth={1.5} />
        {plan.visitTime ? (
          <FormattedTime isoString={plan.visitTime} format="full" />
        ) : (
          <span>尚未排程</span>
        )}
      </div>

      <div>
        <StatusBadge status={plan.status} />
      </div>

      <Button variant="ghost" size="sm" onClick={onOpen} className="justify-start md:justify-center">
        {nextStep}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </Button>
    </article>
  );
}

function StatusBadge({ status }: { status: VisitPlanStatus }) {
  const variants: Record<VisitPlanStatus, "warning" | "success" | "outline"> = {
    DRAFT: "warning",
    READY: "success",
    COMPLETED: "outline",
  };

  return (
    <Badge variant={variants[status]} className="h-6 text-[11px]">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function EmptyPlansState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-paper-2/40 px-5 py-14 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-hairline bg-card">
        <CalendarDays className="h-5 w-5 text-primary" strokeWidth={1.5} />
      </div>
      <p className="font-semibold text-foreground">目前還沒有拜訪規劃</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        先建立一筆客戶、目的與時間，下一頁會生成可帶去拜訪的準備包。
      </p>
      <Button variant="outline" className="mt-4 rounded-full" onClick={onCreate}>
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        建立第一筆規劃
      </Button>
    </div>
  );
}

function PreVisitLoadingState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-hairline bg-card px-6 text-center">
      <Loader2 className="mb-4 h-7 w-7 animate-spin text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">正在同步客戶資料</p>
      <p className="mt-1 text-sm text-muted-foreground">準備可生成 AI 準備包的客戶清單。</p>
    </div>
  );
}

function PreVisitClientLoadError({ error }: { error: string }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-card px-5 py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-hairline bg-paper-2 text-muted-foreground">
        <CalendarDays className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h2 className="text-base font-semibold text-foreground">無法同步客戶資料</h2>
      <p className="mt-2 text-sm text-muted-foreground">請確認登入狀態後重新整理。錯誤代碼：{error}</p>
    </div>
  );
}

function QuickstartPreVisitStart({
  clientName,
  occupation,
  onStart,
}: {
  clientName: string;
  occupation: string;
  onStart: () => void;
}) {
  const step = getQuickstartStep("pre-visit");

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28">
      <SpotlightTour steps={previsitTourSteps} />

      <section className="rounded-lg border border-hairline bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Badge variant="secondary" className="h-6 rounded-full text-[11px]">
            Step 2 / {demoQuickstart.steps.length}
          </Badge>
          <span className="text-xs font-semibold text-muted-foreground">Quickstart</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{step.screenTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.bodyCopy}</p>
      </section>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div data-tour="client-info" className="rounded-lg border border-hairline bg-paper-2 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              客戶
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">{clientName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{occupation}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-hairline bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                拜訪目的
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">{demoQuickstart.purposeLabel}</p>
            </div>
            <div className="rounded-lg border border-hairline bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                體驗方式
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">一直按下一步</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        data-tour="previsit-cta"
        onClick={onStart}
        variant="mono"
        className="h-12 w-full rounded-full text-base"
      >
        {step.primaryCta}
        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
      </Button>
    </div>
  );
}

function getClientName(clients: Client[], id: string) {
  return resolveClientFromList(clients, id)?.name || "未知客戶";
}

function getNextStep(plan: VisitPlan) {
  if (plan.status === "COMPLETED") return "查看紀錄";
  if (plan.status === "READY") return "檢視準備包";
  return "生成準備包";
}

function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default function PreVisitListPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">載入中...</div>}>
      <PreVisitListContent />
    </Suspense>
  );
}
