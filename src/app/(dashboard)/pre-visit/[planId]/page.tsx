"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileText,
  Loader2,
  MessageSquare,
  NotebookPen,
  PackageCheck,
  Printer,
  RefreshCw,
  ShieldQuestion,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormattedTime } from "@/components/ui/formatted-time";
import { planTourSteps } from "@/domains/demo/tour-steps";
import {
  demoQuickstart,
  getQuickstartVisitFixture,
} from "@/domains/demo/quickstart";
import { resolveClientFromList, resolveClientIdAlias } from "@/domains/client/id-aliases";
import { clientService } from "@/domains/client/service";
import { useClientStore } from "@/domains/client/store";
import { useVisitStore } from "@/domains/visit/store";
import type {
  ObjectionHandling,
  SpinQuestion,
  VisitMaterial,
  VisitObjective,
  VisitPurpose,
} from "@/domains/visit/types";
import { cn } from "@/lib/utils";

const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

const SPIN_LABELS: Record<SpinQuestion["type"], string> = {
  S: "Situation",
  P: "Problem",
  I: "Implication",
  N: "Need-payoff",
};

const TIMELINE_SEGMENTS = [
  { label: "開場確認", minutes: 10 },
  { label: "現況釐清", minutes: 15 },
  { label: "SPIN 深挖", minutes: 20 },
  { label: "收斂下一步", minutes: 15 },
];

type VisitGenerationPayload = {
  objectives: VisitObjective[];
  spinQuestions: SpinQuestion[];
  objections: ObjectionHandling[];
  materials: VisitMaterial[];
};

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getApiErrorCode(payload: unknown) {
  if (!isRecord(payload) || typeof payload.error !== "string") {
    return null;
  }

  return payload.error;
}

function getVisitGenerationErrorMessage(status: number, payload: unknown) {
  const code = getApiErrorCode(payload);

  if (code === "UNAUTHENTICATED") {
    return "登入狀態已失效，請重新登入後再生成準備包。";
  }

  if (code === "CLIENT_NOT_FOUND") {
    return "找不到這位客戶的資料，請從客戶管理重新開啟或重新建立拜訪規劃。";
  }

  if (code === "OPENAI_API_KEY is not configured") {
    return "AI key 尚未設定，請先補上 OpenAI API key。";
  }

  if (code === "VISIT_AI_SCHEMA_MISMATCH" || code === "VISIT_AI_INVALID_JSON" || code === "VISIT_AI_EMPTY_RESPONSE") {
    return "AI 回應格式不完整，請重新生成一次。";
  }

  if (code === "VISIT_AI_GENERATION_FAILED") {
    return "AI 服務暫時無法完成準備包，請稍後再試。";
  }

  return `目前無法生成準備包。錯誤代碼：${code ?? status}`;
}

function isVisitGenerationPayload(value: unknown): value is VisitGenerationPayload {
  if (!isRecord(value)) return false;

  return (
    Array.isArray(value.objectives) &&
    Array.isArray(value.spinQuestions) &&
    Array.isArray(value.objections) &&
    Array.isArray(value.materials)
  );
}

export default function VisitPlanDetailPage() {
  return (
    <Suspense fallback={<PlanLoadingState />}>
      <VisitPlanDetailContent />
    </Suspense>
  );
}

function VisitPlanDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const updatePlan = useVisitStore((state) => state.updatePlan);
  const planId = normalizeParam(params.planId);
  const plan = useVisitStore((state) => state.plans.find((p) => p.id === planId));
  const clients = useClientStore((state) => state.clients);
  const client = plan ? resolveClientFromList(clients, plan.clientId) : undefined;
  const isQuickstart = searchParams.get("demo") === "quickstart";
  const seededRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const groupedQuestions = useMemo(() => {
    const questions = plan?.spinQuestions ?? [];
    return (["S", "P", "I", "N"] as const).map((type) => ({
      type,
      questions: questions.filter((question) => question.type === type),
    }));
  }, [plan?.spinQuestions]);

  useEffect(() => {
    if (!isQuickstart || !plan || seededRef.current) return;
    seededRef.current = true;

    const fixture = getQuickstartVisitFixture();
    updatePlan(plan.id, {
      purpose: demoQuickstart.purpose as VisitPurpose,
      objectives: fixture.objectives,
      spinQuestions: fixture.spinQuestions,
      objections: fixture.objections,
      materials: fixture.materials,
      status: "READY",
    });
  }, [isQuickstart, plan, updatePlan]);

  useEffect(() => {
    if (isQuickstart) return;

    void clientService.fetchClients().catch((error: unknown) => {
      console.error("Pre-visit client refresh failed", error);
    });
  }, [isQuickstart]);

  if (!plan || !client) {
    return <PlanMissingState onBack={() => router.push("/pre-visit")} />;
  }

  const readyCount = [
    plan.objectives.length > 0,
    plan.spinQuestions.length > 0,
    plan.objections.length > 0,
    plan.materials.length > 0,
  ].filter(Boolean).length;
  const isReady = plan.status === "READY" && readyCount >= 3;
  const checkedMaterials = plan.materials.filter((material) => material.checked).length;
  const totalMinutes = TIMELINE_SEGMENTS.reduce((sum, segment) => sum + segment.minutes, 0);
  const apiClientId = resolveClientIdAlias(plan.clientId);
  const nextHref = `/spin?clientId=${apiClientId}&autoCreate=true${isQuickstart ? "&demo=quickstart" : ""}`;

  const applyQuickstartFixture = () => {
    const fixture = getQuickstartVisitFixture();
    updatePlan(plan.id, {
      purpose: demoQuickstart.purpose as VisitPurpose,
      objectives: fixture.objectives,
      spinQuestions: fixture.spinQuestions,
      objections: fixture.objections,
      materials: fixture.materials,
      status: "READY",
    });
  };

  const handleGenerate = async () => {
    setGenerationError(null);

    if (isQuickstart) {
      applyQuickstartFixture();
      toast.success("Quickstart 準備包已載入");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: plan.purpose, clientId: apiClientId }),
      });
      const payload = await response.json().catch(() => null) as unknown;

      if (!response.ok) {
        throw new Error(getVisitGenerationErrorMessage(response.status, payload));
      }

      if (!isVisitGenerationPayload(payload)) {
        throw new Error("AI 回應格式不完整，請重新生成一次。");
      }

      const generatedData = payload;
      updatePlan(plan.id, {
        clientId: apiClientId,
        objectives: generatedData.objectives,
        spinQuestions: generatedData.spinQuestions,
        objections: generatedData.objections,
        materials: generatedData.materials,
        status: "READY",
      });
      toast.success("拜訪準備包已生成");
    } catch (error) {
      console.error("AI visit generation failed", error);
      const message = error instanceof Error ? error.message : "目前無法生成準備包。請稍後重試。";
      setGenerationError(message);
      toast.error("準備包生成失敗", { description: message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!isReady) {
      void handleGenerate();
      return;
    }
    router.push(nextHref);
  };

  const toggleMaterial = (materialId: string) => {
    updatePlan(plan.id, {
      materials: plan.materials.map((material) =>
        material.id === materialId ? { ...material, checked: !material.checked } : material,
      ),
    });
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {isQuickstart ? (
        <>
          <SpotlightTour steps={planTourSteps} />
          <QuickstartGuide currentStepId="plan" compact nextHref={nextHref} />
        </>
      ) : null}

      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <Button
            type="button"
            variant="ghost"
            className="mb-4 h-10 rounded-full px-3 text-muted-foreground"
            onClick={() => router.push("/pre-visit")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回拜訪規劃
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              {PURPOSE_LABELS[plan.purpose]}
            </Badge>
            <Badge variant={isReady ? "default" : "outline"} className="rounded-full">
              {isReady ? "準備完成" : "待生成"}
            </Badge>
            {plan.visitTime ? (
              <span className="text-sm font-medium text-muted-foreground">
                <FormattedTime isoString={plan.visitTime} format="datetime" />
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {client.name}的拜訪準備包
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            把本次會談壓成可進場的目標、提問、疑慮處理、材料與時間配置。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full"
            onClick={() => router.push(`/pre-visit/${plan.id}/notes`)}
          >
            <NotebookPen className="mr-2 h-4 w-4" />
            拜訪筆記
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            列印
          </Button>
          <Button type="button" variant="mono" className="h-10 rounded-full" onClick={handlePrimaryAction} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isReady ? <MessageSquare className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isReady ? "開始 SPIN 澄清" : "生成準備包"}
          </Button>
        </div>
      </header>

      <section data-tour="plan-summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PrepMetric label="準備完整度" value={`${readyCount}/4`} helper={isReady ? "可開始拜訪流程" : "先生成 AI 準備包"} />
        <PrepMetric label="核心目標" value={String(plan.objectives.length)} helper="成功判準已列" />
        <PrepMetric label="SPIN 提問" value={String(plan.spinQuestions.length)} helper="S/P/I/N 分段" />
        <PrepMetric label="材料完成" value={`${checkedMaterials}/${plan.materials.length || 0}`} helper="拜訪前確認" />
      </section>

      {!isReady || generationError ? (
        <Card className="border-hairline bg-paper shadow-none">
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-background">
                {generationError ? <CircleAlert className="h-5 w-5 text-destructive" /> : <PackageCheck className="h-5 w-5 text-ink" />}
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink">
                  {generationError ? "準備包尚未生成成功" : "先生成一份可執行的準備包"}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {generationError ?? "AI 會根據客戶資料與拜訪目的整理目標、SPIN 問題、可能異議與材料清單。"}
                </p>
              </div>
            </div>
            <Button type="button" variant="mono" className="h-10 rounded-full" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {plan.objectives.length ? "重新生成準備包" : "生成準備包"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <PrepSection
            dataTour="plan-objectives"
            defaultOpen
            icon={<Target className="h-4 w-4" />}
            title="拜訪目標"
            summary={`${plan.objectives.length} 項・含成功判準`}
          >
            {plan.objectives.length ? (
              <div className="grid gap-3">
                {plan.objectives.map((objective, index) => (
                  <div key={objective.id} className="rounded-lg border border-hairline bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      目標 {index + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink">{objective.description}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">判準：{objective.successCriteria}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPrepCopy copy="生成準備包後，這裡會出現本次拜訪最重要的目標與判準。" />
            )}
          </PrepSection>

          <PrepSection
            dataTour="plan-spin"
            icon={<MessageSquare className="h-4 w-4" />}
            title="SPIN 提問"
            summary={`${plan.spinQuestions.length} 題・按 S/P/I/N 排序`}
          >
            {plan.spinQuestions.length ? (
              <div className="space-y-4">
                {groupedQuestions.map(({ type, questions }) =>
                  questions.length ? (
                    <div key={type} className="grid gap-2 border-l border-hairline pl-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
                          {type}
                        </span>
                        <p className="text-sm font-semibold text-ink">{SPIN_LABELS[type]}</p>
                      </div>
                      {questions.map((question) => (
                        <p key={question.id} className="rounded-lg bg-muted/40 p-3 text-sm leading-6 text-ink">
                          {question.question}
                        </p>
                      ))}
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <EmptyPrepCopy copy="生成準備包後，AI 會替你把提問切成 S/P/I/N 節奏。" />
            )}
          </PrepSection>

          <PrepSection
            dataTour="plan-objections"
            icon={<ShieldQuestion className="h-4 w-4" />}
            title="可能異議"
            summary={`${plan.objections.length} 則・含建議回應`}
          >
            {plan.objections.length ? (
              <div className="grid gap-3">
                {plan.objections.map((objection) => (
                  <ObjectionCard key={objection.id} objection={objection} />
                ))}
              </div>
            ) : (
              <EmptyPrepCopy copy="生成準備包後，這裡會整理客戶可能提出的疑問與回應方向。" />
            )}
          </PrepSection>

          <PrepSection
            icon={<FileText className="h-4 w-4" />}
            title="拜訪材料"
            summary={`${plan.materials.length} 份・${checkedMaterials} 份已確認`}
          >
            {plan.materials.length ? (
              <div className="grid gap-2">
                {plan.materials.map((material) => (
                  <button
                    key={material.id}
                    type="button"
                    className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-hairline bg-background px-3 py-2 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => toggleMaterial(material.id)}
                  >
                    <span className="text-sm font-medium text-ink">{material.name}</span>
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hairline",
                        material.checked ? "bg-ink text-paper" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {material.checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyPrepCopy copy="生成準備包後，這裡會列出拜訪前需要確認或攜帶的材料。" />
            )}
          </PrepSection>
        </div>

        <aside className="space-y-4">
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-ink">{totalMinutes} 分鐘時間分配</h2>
              </div>
              <div className="mt-5 space-y-3">
                {TIMELINE_SEGMENTS.map((segment) => (
                  <div key={segment.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{segment.label}</span>
                      <span className="tabular-nums text-muted-foreground">{segment.minutes}m</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-ink"
                        style={{ width: `${(segment.minutes / totalMinutes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-ink">拜訪後筆記</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {plan.postVisitNotes
                  ? `${plan.postVisitNotes.slice(0, 72)}${plan.postVisitNotes.length > 72 ? "..." : ""}`
                  : "拜訪後記錄摘要、客戶反應與下一步。"}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-10 w-full rounded-full"
                onClick={() => router.push(`/pre-visit/${plan.id}/notes`)}
              >
                <NotebookPen className="mr-2 h-4 w-4" />
                開啟筆記
              </Button>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}

function PrepMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function PrepSection({
  children,
  dataTour,
  defaultOpen,
  icon,
  summary,
  title,
}: {
  children: React.ReactNode;
  dataTour?: string;
  defaultOpen?: boolean;
  icon: React.ReactNode;
  summary: string;
  title: string;
}) {
  return (
    <details
      data-tour={dataTour}
      className="group rounded-lg border border-hairline bg-card shadow-none open:bg-background"
      open={defaultOpen}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{title}</span>
            <span className="block truncate text-xs text-muted-foreground">{summary}</span>
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-hairline p-4">{children}</div>
    </details>
  );
}

function ObjectionCard({ objection }: { objection: ObjectionHandling }) {
  return (
    <div className="rounded-lg border border-hairline bg-background p-4">
      <p className="text-sm font-semibold leading-6 text-ink">「{objection.expectedObjection}」</p>
      <p className="mt-3 border-l border-hairline pl-3 text-sm leading-6 text-muted-foreground">
        {objection.suggestedResponse}
      </p>
    </div>
  );
}

function EmptyPrepCopy({ copy }: { copy: string }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
      {copy}
    </div>
  );
}

function PlanMissingState({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline">
        <PackageCheck className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-lg font-semibold text-ink">找不到這份準備包</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">可能尚未建立，或本機 demo 資料已被清除。</p>
      <Button type="button" variant="mono" className="mt-5 rounded-full" onClick={onBack}>
        回拜訪規劃
      </Button>
    </div>
  );
}

function PlanLoadingState() {
  return (
    <div className="p-10 text-center text-sm font-medium text-muted-foreground">載入拜訪準備包...</div>
  );
}
