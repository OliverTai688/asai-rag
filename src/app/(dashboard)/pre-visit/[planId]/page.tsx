"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Brain,
  Check,
  CircleAlert,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquare,
  Mic,
  Network,
  NotebookPen,
  PackageCheck,
  PanelRightOpen,
  Printer,
  RefreshCw,
  ShieldQuestion,
  Sparkles,
  Target,
  Theater,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormattedTime } from "@/components/ui/formatted-time";
import type { Client, FamilyMember } from "@/domains/client/types";
import { resolveClientFromList, resolveClientIdAlias } from "@/domains/client/id-aliases";
import { useClientStore } from "@/domains/client/store";
import { demoQuickstart, getQuickstartVisitFixture } from "@/domains/demo/quickstart";
import { planTourSteps } from "@/domains/demo/tour-steps";
import { buildVisitTheaterHandoff } from "@/domains/theater/visit-handoff";
import {
  buildVisitRelationshipConfirmationDeck,
  type VisitRelationshipConfirmationCard,
  type VisitRelationshipConfirmationDeck,
} from "@/domains/visit/relationship-confirmation";
import type {
  VisitRouteBRedLineContext,
  VisitRouteBRedLineContextItem,
} from "@/domains/visit/route-b-red-line-context";
import { VisitService } from "@/domains/visit/service";
import { useVisitStore } from "@/domains/visit/store";
import type {
  ObjectionHandling,
  SpinQuestion,
  VisitMaterial,
  VisitObjective,
  VisitPurpose,
  VisitQuestionEvidence,
  VisitQuestionEvidenceStatus,
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

const EVIDENCE_STATUS_ORDER: VisitQuestionEvidenceStatus[] = ["confirmed", "inference", "unknown"];

type VisitGenerationPayload = {
  objectives: VisitObjective[];
  spinQuestions: SpinQuestion[];
  objections: ObjectionHandling[];
  materials: VisitMaterial[];
};

type EvidenceBucket = {
  status: VisitQuestionEvidenceStatus;
  label: string;
  helper: string;
  items: VisitQuestionEvidence[];
};

type DecisionSignal = {
  id: string;
  name: string;
  role: string;
  profile: string;
  influence: string;
  evidenceStatus: VisitQuestionEvidenceStatus;
  statusLabel: string;
};

type VisitTheaterUiStatus = "READY" | "NEEDS_MORE_INFO" | "BLOCKED_SENSITIVE";
type AdvisorConfirmationState = "needs_confirmation" | "confirmed_in_meeting" | "ask_in_interview";
type VisitRouteBRedLineContextStatus =
  | "READY"
  | "NO_ROUTE_B_SESSION"
  | "NO_FEEDBACK_REVIEW"
  | "NO_ACTION_CONTEXT";

type VisitRouteBRedLineContextResponse = {
  status: VisitRouteBRedLineContextStatus;
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
  routeBRedLineContext?: VisitRouteBRedLineContext;
  source: {
    matchedBy: "routeBSourcePacketId";
    sourceActionId: "route-b-red-line-action-feedback-consumption";
    sourceTheaterSessionId?: string;
    sourceFeedbackReviewId?: string;
    feedbackReviewUpdatedAt?: string;
  };
  summary: VisitRouteBRedLineContext["summary"];
  proof: {
    ownerScopedVisitPlan: true;
    ownerScopedTheaterSessionLookup: true;
    browserSuppliedTheaterSessionId: false;
    browserSuppliedPersonId: false;
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesConfirmedCrmFact: false;
    triggersExternalNotification: false;
  };
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
  const [isLoadingPlan, setIsLoadingPlan] = useState(!isQuickstart);
  const [planLoadError, setPlanLoadError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [routeBContext, setRouteBContext] = useState<VisitRouteBRedLineContextResponse | null>(null);
  const [routeBContextError, setRouteBContextError] = useState<string | null>(null);
  const [isLoadingRouteBContext, setIsLoadingRouteBContext] = useState(false);
  const activeRouteBContext =
    !isQuickstart && routeBContext?.visitPlanId === planId ? routeBContext : null;
  const activeRouteBContextError = !isQuickstart && planId ? routeBContextError : null;
  const activeRouteBContextLoading = !isQuickstart && Boolean(planId) && isLoadingRouteBContext;
  const groupedQuestions = useMemo(() => {
    const questions = plan?.spinQuestions ?? [];
    return (["S", "P", "I", "N"] as const).map((type) => ({
      type,
      questions: questions.filter((question) => question.type === type),
    }));
  }, [plan?.spinQuestions]);
  const evidenceBuckets = useMemo(() => buildEvidenceBuckets(plan?.spinQuestions ?? []), [plan?.spinQuestions]);
  const theaterHandoff = useMemo(() => {
    if (!plan || !client) return null;

    return buildVisitTheaterHandoff({
      organizationId: "ui-preview",
      memberId: "ui-preview",
      client,
      visitPlan: plan,
      sessionId: `previsit_theater_${plan.id}`,
    });
  }, [client, plan]);
  const relationshipConfirmationDeck = useMemo(
    () => (client ? buildVisitRelationshipConfirmationDeck(client) : null),
    [client],
  );

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
    if (isQuickstart || !planId) return;

    let cancelled = false;
    const targetPlanId = planId;

    async function loadPlan() {
      try {
        setIsLoadingPlan(true);
        setPlanLoadError(null);
        await VisitService.fetchPlanByIdRemote(targetPlanId);
      } catch (error) {
        if (!cancelled) {
          setPlanLoadError(error instanceof Error ? error.message : "VISIT_PLAN_LOAD_FAILED");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlan(false);
        }
      }
    }

    void loadPlan();

    return () => {
      cancelled = true;
    };
  }, [isQuickstart, planId]);

  useEffect(() => {
    if (isQuickstart || !planId) return;

    let cancelled = false;
    const targetPlanId = planId;

    async function loadRouteBContext() {
      try {
        setIsLoadingRouteBContext(true);
        setRouteBContextError(null);
        const response = await fetch(`/api/visits/${encodeURIComponent(targetPlanId)}/route-b-red-line-context`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`VISIT_ROUTE_B_CONTEXT_LOAD_FAILED_${response.status}`);
        }

        const payload = (await response.json()) as VisitRouteBRedLineContextResponse;
        if (!cancelled) {
          setRouteBContext(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setRouteBContext(null);
          setRouteBContextError(error instanceof Error ? error.message : "VISIT_ROUTE_B_CONTEXT_LOAD_FAILED");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRouteBContext(false);
        }
      }
    }

    void loadRouteBContext();

    return () => {
      cancelled = true;
    };
  }, [isQuickstart, planId]);

  if (isLoadingPlan) {
    return <PlanLoadingState />;
  }

  if (planLoadError) {
    return <PlanMissingState onBack={() => router.push("/pre-visit")} error={planLoadError} />;
  }

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
  const theaterHref = `/theater/build?clientId=${encodeURIComponent(apiClientId)}&visitPlanId=${encodeURIComponent(plan.id)}&source=previsit${isQuickstart ? "&demo=quickstart" : ""}`;
  const objectiveLead = plan.objectives[0];
  const firstQuestion = plan.spinQuestions[0];
  const openEvidenceItems = evidenceBuckets.find((bucket) => bucket.status === "unknown")?.items.length ?? 0;
  const handoffStatus = theaterHandoff?.status ?? "NEEDS_MORE_INFO";
  const theaterBlocked = handoffStatus === "BLOCKED_SENSITIVE";
  const priorityQuestions = getPriorityQuestions(plan.spinQuestions);
  const decisionSignals = buildDecisionSignals(client);
  const relationshipFocus = getRelationshipFocusCopy(client);

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
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getVisitGenerationErrorMessage(response.status, payload));
      }

      if (!isVisitGenerationPayload(payload)) {
        throw new Error("AI 回應格式不完整，請重新生成一次。");
      }

      const generatedData = payload;
      await VisitService.updatePlanRemote(plan.id, {
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

    if (theaterBlocked) {
      toast.error("此客戶為高敏感資料，需先補上建場理由與風險接受。");
      return;
    }

    router.push(theaterHref);
  };

  const toggleMaterial = (materialId: string) => {
    const nextMaterials = plan.materials.map((material) =>
      material.id === materialId ? { ...material, checked: !material.checked } : material,
    );

    updatePlan(plan.id, { materials: nextMaterials });

    if (isQuickstart) {
      return;
    }

    void VisitService.updatePlanRemote(plan.id, { materials: nextMaterials }).catch((error: unknown) => {
      updatePlan(plan.id, { materials: plan.materials });
      const message = error instanceof Error ? error.message : "MATERIAL_UPDATE_FAILED";
      toast.error("材料狀態同步失敗", { description: message });
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
            className="mb-4 h-10 rounded-lg px-3 text-muted-foreground"
            onClick={() => router.push("/pre-visit")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回拜訪規劃
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md">
              {PURPOSE_LABELS[plan.purpose]}
            </Badge>
            <Badge variant={isReady ? "default" : "outline"} className="rounded-md">
              {isReady ? "準備完成" : "待生成"}
            </Badge>
            <Badge variant="outline" className="rounded-md">
              {getHandoffStatusLabel(handoffStatus)}
            </Badge>
            {plan.visitTime ? (
              <span className="text-sm font-medium text-muted-foreground">
                <FormattedTime isoString={plan.visitTime} format="datetime" />
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">拜訪準備包</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {client.name} 的專案情境、決策地圖、核心問題、推論依據與劇場建場資料集中在這裡。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => router.push(`/pre-visit/${plan.id}/meeting${isQuickstart ? "?demo=quickstart" : ""}`)}
          >
            <Mic className="mr-2 h-4 w-4" />
            AI 會議
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => router.push(`/pre-visit/${plan.id}/notes${isQuickstart ? "?demo=quickstart" : ""}`)}
          >
            <NotebookPen className="mr-2 h-4 w-4" />
            拜訪筆記
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-lg" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            列印
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-lg" onClick={() => router.push(nextHref)} disabled={isGenerating}>
            <MessageSquare className="mr-2 h-4 w-4" />
            SPIN 澄清
          </Button>
          <Button type="button" variant="mono" className="h-10 rounded-lg" onClick={handlePrimaryAction} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isReady ? <Theater className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isReady ? "建立劇場舞台" : "生成準備包"}
          </Button>
        </div>
      </header>

      {!isReady || generationError ? (
        <section className="grid gap-5 rounded-lg border border-hairline bg-paper p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-hairline bg-background">
              {generationError ? <CircleAlert className="h-5 w-5 text-destructive" /> : <PackageCheck className="h-5 w-5 text-ink" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">{generationError ? "準備包尚未生成成功" : "先生成可執行的準備包"}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {generationError ?? "生成後會補齊專案目標、核心問題、推論依據、異議、材料與劇場建場素材。"}
              </p>
            </div>
          </div>
          <Button type="button" variant="mono" className="h-10 rounded-lg" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {plan.objectives.length ? "重新生成準備包" : "生成準備包"}
          </Button>
        </section>
      ) : null}

      <section data-tour="plan-summary" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg bg-ink p-5 text-paper sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-paper/70">
            <Target className="h-4 w-4" />
            <span>專案情境</span>
            <span aria-hidden="true">/</span>
            <span>{PURPOSE_LABELS[plan.purpose]}拜訪</span>
            <span aria-hidden="true">/</span>
            <span>{client.status === "ACTIVE" ? "既有客戶" : client.status === "PROSPECT" ? "潛在客戶" : "已結案客戶"}</span>
          </div>
          <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight sm:text-3xl">
            {objectiveLead?.description ?? `${client.name} 的拜訪資料尚待整理`}
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <BriefFact icon={<BadgeCheck className="h-4 w-4" />} label="成功判準" value={objectiveLead?.successCriteria ?? "生成後補齊"} />
            <BriefFact icon={<Users className="h-4 w-4" />} label="決策地圖" value={relationshipFocus} />
            <BriefFact icon={<CircleHelp className="h-4 w-4" />} label="第一個問題" value={firstQuestion?.question ?? "尚未建立 SPIN 題組"} />
            <BriefFact icon={<PanelRightOpen className="h-4 w-4" />} label="下一步" value={isReady ? "建立劇場舞台或進 SPIN 澄清" : "先生成準備包"} />
          </div>
        </section>

        <TheaterLaunchPanel
          handoffStatus={handoffStatus}
          isReady={isReady}
          missingCount={theaterHandoff?.missing.length ?? 0}
          npcCount={theaterHandoff?.packet.routeBCompatibility.npcCount ?? 0}
          onLaunch={handlePrimaryAction}
          openEvidenceItems={openEvidenceItems}
          theaterBlocked={theaterBlocked}
          unknownCount={theaterHandoff?.packet.unknowns.length ?? 0}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PrepMetric icon={<FileCheck2 className="h-4 w-4" />} label="準備完整度" value={`${readyCount}/4`} helper={isReady ? "目標、提問、異議、材料可用" : "仍需生成或補齊"} />
        <PrepMetric icon={<Network className="h-4 w-4" />} label="關係節點" value={String(client.family.length)} helper={client.family.length ? "可轉入劇場人物" : "尚無關係資料"} />
        <PrepMetric icon={<Brain className="h-4 w-4" />} label="推論依據" value={String(countQuestionEvidence(plan.spinQuestions))} helper={`${openEvidenceItems} 項待確認`} />
        <PrepMetric icon={<Check className="h-4 w-4" />} label="材料完成" value={`${checkedMaterials}/${plan.materials.length || 0}`} helper="拜訪前確認" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <PriorityQuestionBoard questions={priorityQuestions} />
        <DecisionMapPanel client={client} signals={decisionSignals} />
      </section>

      <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section data-tour="plan-spin" className="rounded-lg border border-hairline bg-card">
            <SectionHeader icon={<MessageSquare className="h-4 w-4" />} title="完整 SPIN 問題庫" summary={`${plan.spinQuestions.length} 題・按 S/P/I/N 進場`} />
            {plan.spinQuestions.length ? (
              <div className="space-y-5 border-t border-hairline p-4">
                {groupedQuestions.map(({ type, questions }) =>
                  questions.length ? (
                    <div key={type} className="grid gap-3 md:grid-cols-[132px_minmax(0,1fr)]">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-xs font-semibold text-paper">{type}</span>
                        <div>
                          <p className="text-sm font-semibold text-ink">{SPIN_LABELS[type]}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{questions.length} 題</p>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        {questions.map((question) => (
                          <QuestionCard key={question.id} question={question} />
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <div className="border-t border-hairline p-4">
                <EmptyPrepCopy copy="生成準備包後，這裡會出現可帶入會談與劇場的 SPIN 題組。" />
              </div>
            )}
          </section>

          <section data-tour="plan-objections" className="grid gap-4 md:grid-cols-2">
            <PrepBlock icon={<ShieldQuestion className="h-4 w-4" />} title="可能異議" summary={`${plan.objections.length} 則`}>
              {plan.objections.length ? (
                <div className="grid gap-3">
                  {plan.objections.map((objection) => (
                    <ObjectionCard key={objection.id} objection={objection} />
                  ))}
                </div>
              ) : (
                <EmptyPrepCopy copy="生成後整理客戶可能提出的疑問與回應方向。" />
              )}
            </PrepBlock>

            <PrepBlock icon={<FileText className="h-4 w-4" />} title="拜訪材料" summary={`${checkedMaterials}/${plan.materials.length || 0} 已確認`}>
              {plan.materials.length ? (
                <div className="grid gap-2">
                  {plan.materials.map((material) => (
                    <MaterialCheckRow key={material.id} material={material} onToggle={() => toggleMaterial(material.id)} />
                  ))}
                </div>
              ) : (
                <EmptyPrepCopy copy="生成後列出拜訪前需要確認或攜帶的材料。" />
              )}
            </PrepBlock>
          </section>
        </div>

        <aside className="space-y-4">
          <RouteBRedLineContextPanel
            context={activeRouteBContext}
            error={activeRouteBContextError}
            isLoading={activeRouteBContextLoading}
          />
          <RelationshipConfirmationPanel deck={relationshipConfirmationDeck} />
          <EvidenceBoard buckets={evidenceBuckets} />
          <TimeBox totalMinutes={totalMinutes} />
          <NotesBox notes={plan.postVisitNotes} onOpen={() => router.push(`/pre-visit/${plan.id}/notes${isQuickstart ? "?demo=quickstart" : ""}`)} />
        </aside>
      </main>
    </div>
  );
}

function BriefFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-paper/20 bg-paper/10 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-paper/70">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-paper">{value}</p>
    </div>
  );
}

function TheaterLaunchPanel({
  handoffStatus,
  isReady,
  missingCount,
  npcCount,
  onLaunch,
  openEvidenceItems,
  theaterBlocked,
  unknownCount,
}: {
  handoffStatus: VisitTheaterUiStatus;
  isReady: boolean;
  missingCount: number;
  npcCount: number;
  onLaunch: () => void;
  openEvidenceItems: number;
  theaterBlocked: boolean;
  unknownCount: number;
}) {
  return (
    <section className="rounded-lg border border-hairline bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Theater className="h-4 w-4" />
            劇場建場
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{getHandoffStatusCopy(handoffStatus, isReady)}</p>
        </div>
        <Badge variant={handoffStatus === "READY" ? "default" : "outline"} className="rounded-md">
          {getHandoffStatusLabel(handoffStatus)}
        </Badge>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniStat label="人物" value={String(npcCount)} />
        <MiniStat label="未知" value={String(unknownCount)} />
        <MiniStat label="待補" value={String(missingCount + openEvidenceItems)} />
      </div>
      {theaterBlocked ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
          高敏感客戶需補齊建場理由與風險接受，暫不啟動劇場。
        </div>
      ) : null}
      <Button type="button" variant="mono" className="mt-5 h-10 w-full rounded-lg" onClick={onLaunch}>
        {isReady ? <ArrowRight className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {isReady ? "帶入劇場建場" : "先生成準備包"}
      </Button>
    </section>
  );
}

function PrepMetric({ helper, icon, label, value }: { helper: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <section className="rounded-lg border border-hairline bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </section>
  );
}

function PriorityQuestionBoard({ questions }: { questions: SpinQuestion[] }) {
  return (
    <section className="rounded-lg border border-hairline bg-card">
      <SectionHeader icon={<Lightbulb className="h-4 w-4" />} title="核心問題清單" summary={`${questions.length ? `優先 ${questions.length} 題` : "等待生成"}・含推論依據`} />
      <div className="grid gap-3 border-t border-hairline p-4 lg:grid-cols-3">
        {questions.length ? (
          questions.map((question, index) => <PriorityQuestionCard key={question.id} index={index} question={question} />)
        ) : (
          <div className="lg:col-span-3">
            <EmptyPrepCopy copy="生成準備包後，這裡會先抽出最值得現場驗證的 3 個問題，並標示已知、推論與待確認依據。" />
          </div>
        )}
      </div>
    </section>
  );
}

function PriorityQuestionCard({ index, question }: { index: number; question: SpinQuestion }) {
  const evidence = question.reasoning?.evidence ?? [];
  const confirmedCount = countEvidenceByStatus(question, "confirmed");
  const inferenceCount = countEvidenceByStatus(question, "inference");
  const unknownCount = countEvidenceByStatus(question, "unknown");

  return (
    <article className="rounded-lg border border-hairline bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-xs font-semibold tabular-nums text-paper">
          {index + 1}
        </span>
        <Badge variant="outline" className="rounded-md">
          {SPIN_LABELS[question.type]}
        </Badge>
        <Badge variant="outline" className="rounded-md">
          {getQuestionFocusLabel(question)}
        </Badge>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-ink">{question.question}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="已知" value={String(confirmedCount)} />
        <MiniStat label="推論" value={String(inferenceCount)} />
        <MiniStat label="待確認" value={String(unknownCount)} />
      </div>
      <div className="mt-4 rounded-lg bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink">
          <Brain className="h-3.5 w-3.5" />
          推論依據
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {question.reasoning?.summary ?? "尚無推論摘要；可先用 SPIN 澄清補齊。"}
        </p>
        {evidence.length ? (
          <div className="mt-3 grid gap-2">
            {evidence.slice(0, 2).map((item, index) => (
              <EvidenceLine key={`${item.id}-${item.status}-${index}`} item={item} />
            ))}
          </div>
        ) : null}
        {question.reasoning?.confirmationPrompt ? (
          <p className="mt-3 border-l border-hairline pl-3 text-xs leading-5 text-muted-foreground">
            現場確認：{question.reasoning.confirmationPrompt}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function DecisionMapPanel({ client, signals }: { client: Client; signals: DecisionSignal[] }) {
  const [primarySignal, ...relationshipSignals] = signals;

  return (
    <section className="rounded-lg border border-hairline bg-card">
      <SectionHeader icon={<Users className="h-4 w-4" />} title="決策地圖" summary="職位、年薪、狀態、關係脈絡" />
      <div className="space-y-3 border-t border-hairline p-4">
        <div className="rounded-lg border border-hairline bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{client.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{primarySignal?.profile}</p>
            </div>
            <Badge variant="outline" className="rounded-md">
              {client.kycStatus}
            </Badge>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <span>職位：{client.occupation || "待補"}</span>
            <span>年薪：{formatCurrency(client.annualIncome)}</span>
            <span>狀態：{getClientStatusLabel(client.status)}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {client.aiTags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-md">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        {relationshipSignals.length ? (
          <div className="grid gap-2">
            {relationshipSignals.map((signal) => (
              <DecisionSignalRow key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <EmptyPrepCopy copy="尚未建立關係節點；可回客戶頁補上家庭、共同決策人或影響者。" />
        )}
      </div>
    </section>
  );
}

function DecisionSignalRow({ signal }: { signal: DecisionSignal }) {
  return (
    <div className="rounded-lg border border-hairline bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{signal.name}</p>
        <Badge variant="outline" className="rounded-md">
          {getEvidenceStatusLabel(signal.evidenceStatus)}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {signal.role}・{signal.profile}
      </p>
      <p className="mt-2 border-l border-hairline pl-3 text-xs leading-5 text-muted-foreground">
        {signal.statusLabel}；{signal.influence}
      </p>
    </div>
  );
}

function PrepBlock({ children, icon, summary, title }: { children: React.ReactNode; icon: React.ReactNode; summary: string; title: string }) {
  return (
    <section className="rounded-lg border border-hairline bg-card">
      <SectionHeader icon={icon} title={title} summary={summary} />
      <div className="border-t border-hairline p-4">{children}</div>
    </section>
  );
}

function SectionHeader({ icon, summary, title }: { icon: React.ReactNode; summary: string; title: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-background text-muted-foreground">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{summary}</span>
        </span>
      </span>
    </div>
  );
}

function QuestionCard({ question }: { question: SpinQuestion }) {
  const evidenceCount = question.reasoning?.evidence.length ?? 0;

  return (
    <article className="rounded-lg border border-hairline bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-6 text-ink">{question.question}</p>
        <Badge variant="outline" className="shrink-0 rounded-md">
          {evidenceCount} 依據
        </Badge>
      </div>
      {question.reasoning ? (
        <div className="mt-4 rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Lightbulb className="h-3.5 w-3.5" />
            推論
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{question.reasoning.summary}</p>
          <div className="mt-3 grid gap-2">
            {question.reasoning.evidence.slice(0, 3).map((item, index) => (
              <EvidenceLine key={`${item.id}-${item.status}-${index}`} item={item} />
            ))}
          </div>
          {question.reasoning.confirmationPrompt ? (
            <p className="mt-3 border-l border-hairline pl-3 text-xs leading-5 text-muted-foreground">
              現場確認：{question.reasoning.confirmationPrompt}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function EvidenceLine({ item }: { item: VisitQuestionEvidence }) {
  return (
    <div className="grid gap-1 border-l border-hairline pl-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink">{item.label}</span>
        <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
          {getEvidenceStatusLabel(item.status)}
        </Badge>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{item.detail}</p>
    </div>
  );
}

function RouteBRedLineContextPanel({
  context,
  error,
  isLoading,
}: {
  context: VisitRouteBRedLineContextResponse | null;
  error: string | null;
  isLoading: boolean;
}) {
  if (!isLoading && !context && !error) return null;

  const items = context?.routeBRedLineContext?.items ?? [];
  const hasContext = context?.status === "READY";
  const badgeLabel = isLoading ? "檢查中" : error ? "暫不可用" : getRouteBContextStatusLabel(context?.status);
  const summary = context?.summary ?? {
    itemCount: 0,
    evidenceNeededCount: 0,
    escalateCount: 0,
    notApplicableCount: 0,
    watchingCount: 0,
  };

  return (
    <section data-route-b-red-line-context className="rounded-lg border border-hairline bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldQuestion className="h-4 w-4" />
            劇場紅線回帶
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isLoading ? "正在檢查此準備包對應的 Route B 劇場回饋。" : error ? "劇場回饋暫時無法載入；不影響目前準備包使用。" : getRouteBContextCopy(context?.status)}
          </p>
        </div>
        <Badge variant={hasContext ? "default" : "outline"} className="rounded-md">
          {badgeLabel}
        </Badge>
      </div>

      {hasContext ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="待佐證" value={String(summary.evidenceNeededCount)} />
            <MiniStat label="升級" value={String(summary.escalateCount)} />
            <MiniStat label="觀察" value={String(summary.watchingCount)} />
          </div>
          <div className="mt-4 grid gap-2">
            {items.slice(0, 3).map((item) => (
              <RouteBRedLineContextRow key={item.id} item={item} />
            ))}
          </div>
        </>
      ) : null}

      <p className="mt-4 border-t border-hairline pt-3 text-xs leading-5 text-muted-foreground">
        由此準備包自動比對 Route B source packet；不需輸入 session/person id，也不建立正式法遵結論。
      </p>
    </section>
  );
}

function RouteBRedLineContextRow({ item }: { item: VisitRouteBRedLineContextItem }) {
  return (
    <div className="rounded-lg border border-hairline bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.escalationRequested ? "destructive" : "outline"} className="rounded-md">
          {getRouteBActionStateLabel(item.actionState)}
        </Badge>
        <Badge variant="outline" className="rounded-md">
          {item.evidenceNeeded ? "待補佐證" : "顧問提醒"}
        </Badge>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-ink">{item.label}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.detail}</p>
    </div>
  );
}

function RelationshipConfirmationPanel({ deck }: { deck: VisitRelationshipConfirmationDeck | null }) {
  const [cardStates, setCardStates] = useState<Record<string, AdvisorConfirmationState>>({});

  if (!deck || deck.summary.cardCount === 0) return null;

  const setCardState = (cardId: string, state: AdvisorConfirmationState) => {
    setCardStates((current) => ({ ...current, [cardId]: state }));
  };

  return (
    <section data-relationship-confirmation-cards className="rounded-lg border border-hairline bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Network className="h-4 w-4" />
            關係圖確認卡
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            從關係圖挑出職位、年薪、狀態、關係脈絡中的待確認點；本頁標記只作顧問檢核，不寫入 CRM 事實。
          </p>
        </div>
        <Badge variant={deck.summary.highPriorityCount > 0 ? "default" : "outline"} className="rounded-md">
          {deck.summary.highPriorityCount} 高優先
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="推論" value={String(deck.summary.inferenceCount)} />
        <MiniStat label="待確認" value={String(deck.summary.unknownCount)} />
        <MiniStat label="節點" value={String(deck.summary.sourceNodeCount)} />
      </div>

      <div className="mt-4 grid gap-2">
        {deck.cards.slice(0, 5).map((card) => (
          <RelationshipConfirmationCardRow
            key={card.id}
            card={card}
            state={cardStates[card.id] ?? "needs_confirmation"}
            onStateChange={(state) => setCardState(card.id, state)}
          />
        ))}
      </div>

      <p className="mt-4 border-t border-hairline pt-3 text-xs leading-5 text-muted-foreground">
        Proof：no provider call、no AiUsageLog required、no raw transcript、no confirmed CRM write；若要寫回客戶資料，需改走訪談/客戶資料的明確確認流程。
      </p>
    </section>
  );
}

function RelationshipConfirmationCardRow({
  card,
  onStateChange,
  state,
}: {
  card: VisitRelationshipConfirmationCard;
  onStateChange: (state: AdvisorConfirmationState) => void;
  state: AdvisorConfirmationState;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={card.priority === "HIGH" ? "default" : "outline"} className="rounded-md">
          {getRelationshipCardPriorityLabel(card.priority)}
        </Badge>
        <Badge variant="outline" className="rounded-md">
          {getEvidenceStatusLabel(card.evidenceStatus)}
        </Badge>
        <Badge variant="outline" className="rounded-md">
          {getRelationshipCardKindLabel(card.kind)}
        </Badge>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-ink">{card.title}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{card.evidenceDetail}</p>
      <p className="mt-2 border-l border-hairline pl-3 text-xs leading-5 text-muted-foreground">
        {card.confirmationPrompt}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant={state === "needs_confirmation" ? "mono" : "outline"}
          className="h-8 rounded-lg px-2 text-xs"
          onClick={() => onStateChange("needs_confirmation")}
        >
          待確認
        </Button>
        <Button
          type="button"
          variant={state === "confirmed_in_meeting" ? "mono" : "outline"}
          className="h-8 rounded-lg px-2 text-xs"
          onClick={() => onStateChange("confirmed_in_meeting")}
        >
          已確認
        </Button>
        <Button
          type="button"
          variant={state === "ask_in_interview" ? "mono" : "outline"}
          className="h-8 rounded-lg px-2 text-xs"
          onClick={() => onStateChange("ask_in_interview")}
        >
          轉追問
        </Button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        目前狀態：{getAdvisorConfirmationStateLabel(state)}；資料來源：{card.sourceLabel}
      </p>
    </div>
  );
}

function EvidenceBoard({ buckets }: { buckets: EvidenceBucket[] }) {
  return (
    <section className="rounded-lg border border-hairline bg-card">
      <SectionHeader icon={<Brain className="h-4 w-4" />} title="推論證據" summary="已知、推論、待確認" />
      <div className="space-y-4 border-t border-hairline p-4">
        {buckets.map((bucket) => (
          <div key={bucket.status}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{bucket.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{bucket.helper}</p>
              </div>
              <span className="text-lg font-semibold tabular-nums text-ink">{bucket.items.length}</span>
            </div>
            {bucket.items.length ? (
              <div className="mt-3 grid gap-2">
                {bucket.items.slice(0, 2).map((item, index) => (
                  <EvidenceLine key={`${bucket.status}-${item.id}-${index}`} item={item} />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ObjectionCard({ objection }: { objection: ObjectionHandling }) {
  return (
    <article className="rounded-lg border border-hairline bg-background p-4">
      <p className="text-sm font-semibold leading-6 text-ink">「{objection.expectedObjection}」</p>
      <p className="mt-3 border-l border-hairline pl-3 text-sm leading-6 text-muted-foreground">
        {objection.suggestedResponse}
      </p>
    </article>
  );
}

function MaterialCheckRow({ material, onToggle }: { material: VisitMaterial; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-hairline bg-background px-3 py-2 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onToggle}
    >
      <span className="text-sm font-medium text-ink">{material.name}</span>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-hairline",
          material.checked ? "bg-ink text-paper" : "text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {material.checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}

function TimeBox({ totalMinutes }: { totalMinutes: number }) {
  return (
    <section className="rounded-lg border border-hairline bg-card p-5">
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
              <div className="h-1.5 rounded-full bg-ink" style={{ width: `${(segment.minutes / totalMinutes) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotesBox({ notes, onOpen }: { notes?: string; onOpen: () => void }) {
  return (
    <section className="rounded-lg border border-hairline bg-card p-5">
      <h2 className="text-sm font-semibold text-ink">拜訪後筆記</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {notes ? `${notes.slice(0, 72)}${notes.length > 72 ? "..." : ""}` : "拜訪後記錄摘要、客戶反應與下一步。"}
      </p>
      <Button type="button" variant="outline" className="mt-4 h-10 w-full rounded-lg" onClick={onOpen}>
        <NotebookPen className="mr-2 h-4 w-4" />
        開啟筆記
      </Button>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-background p-3 text-center">
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
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

function PlanMissingState({ error, onBack }: { error?: string; onBack: () => void }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-hairline">
        <PackageCheck className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-lg font-semibold text-ink">找不到這份準備包</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {error ? `同步失敗：${error}` : "可能尚未建立，或本機 demo 資料已被清除。"}
      </p>
      <Button type="button" variant="mono" className="mt-5 rounded-lg" onClick={onBack}>
        回拜訪規劃
      </Button>
    </div>
  );
}

function PlanLoadingState() {
  return <div className="p-10 text-center text-sm font-medium text-muted-foreground">載入拜訪準備包...</div>;
}

function buildEvidenceBuckets(questions: SpinQuestion[]): EvidenceBucket[] {
  const evidence = questions.flatMap((question) => question.reasoning?.evidence ?? []);

  return EVIDENCE_STATUS_ORDER.map((status) => ({
    status,
    label: getEvidenceStatusLabel(status),
    helper: getEvidenceStatusHelper(status),
    items: evidence.filter((item) => item.status === status),
  }));
}

function countQuestionEvidence(questions: SpinQuestion[]) {
  return questions.reduce((count, question) => count + (question.reasoning?.evidence.length ?? 0), 0);
}

function countEvidenceByStatus(question: SpinQuestion, status: VisitQuestionEvidenceStatus) {
  return (question.reasoning?.evidence ?? []).filter((item) => item.status === status).length;
}

function getPriorityQuestions(questions: SpinQuestion[]) {
  return [...questions]
    .sort((left, right) => getQuestionPriorityScore(right) - getQuestionPriorityScore(left))
    .slice(0, 3);
}

function getQuestionPriorityScore(question: SpinQuestion) {
  const typeWeight: Record<SpinQuestion["type"], number> = {
    S: 1,
    P: 3,
    I: 4,
    N: 2,
  };

  return (
    countEvidenceByStatus(question, "unknown") * 5 +
    countEvidenceByStatus(question, "inference") * 3 +
    countEvidenceByStatus(question, "confirmed") +
    typeWeight[question.type]
  );
}

function getQuestionFocusLabel(question: SpinQuestion) {
  if (countEvidenceByStatus(question, "unknown") > 0) return "待確認優先";
  if (countEvidenceByStatus(question, "inference") > 0) return "推論驗證";
  if (question.type === "I") return "風險深化";
  if (question.type === "N") return "下一步承諾";
  return "現況校準";
}

function buildDecisionSignals(client: Client): DecisionSignal[] {
  const primary: DecisionSignal = {
    id: client.id,
    name: client.name,
    role: "主客戶",
    profile: `${client.occupation || "職位待補"}・${formatCurrency(client.annualIncome)}・${getClientStatusLabel(client.status)}`,
    influence: "本次拜訪的主要需求、限制與承諾來源。",
    evidenceStatus: "confirmed",
    statusLabel: "已知主客戶資料",
  };

  return [primary, ...client.family.slice(0, 5).map(buildFamilyDecisionSignal)];
}

function buildFamilyDecisionSignal(member: FamilyMember): DecisionSignal {
  return {
    id: member.id,
    name: member.name,
    role: member.relation,
    profile: `${member.age ? `${member.age} 歲` : "年齡待補"}・${member.linkedClientId ? "已連結客戶" : "未連結客戶"}`,
    influence: inferRelationshipInfluence(member.relation),
    evidenceStatus: "inference",
    statusLabel: "關係已知、決策權重待確認",
  };
}

function getRelationshipFocusCopy(client: Client) {
  if (!client.family.length) {
    return "關係圖尚待補齊決策人、影響者與受益人";
  }

  const relationshipNames = client.family
    .slice(0, 2)
    .map((member) => `${member.name}/${member.relation}`)
    .join("、");

  return `${relationshipNames} 需確認決策權與支持度`;
}

function getEvidenceStatusLabel(status: VisitQuestionEvidenceStatus) {
  if (status === "confirmed") return "已知";
  if (status === "inference") return "推論";
  return "待確認";
}

function getEvidenceStatusHelper(status: VisitQuestionEvidenceStatus) {
  if (status === "confirmed") return "可直接引用";
  if (status === "inference") return "現場觀察驗證";
  return "需要開放式提問";
}

function getHandoffStatusLabel(status: VisitTheaterUiStatus) {
  if (status === "READY") return "可建場";
  if (status === "BLOCKED_SENSITIVE") return "敏感暫停";
  return "需補資料";
}

function getRouteBContextStatusLabel(status: VisitRouteBRedLineContextStatus | undefined) {
  if (status === "READY") return "已回帶";
  if (status === "NO_FEEDBACK_REVIEW") return "待回饋";
  if (status === "NO_ACTION_CONTEXT") return "無紅線";
  return "尚未建場";
}

function getRouteBContextCopy(status: VisitRouteBRedLineContextStatus | undefined) {
  if (status === "READY") {
    return "已載入同一準備包建立的劇場回饋，僅作顧問提醒與待佐證問題。";
  }
  if (status === "NO_FEEDBACK_REVIEW") {
    return "已找到同一準備包的 Route B 劇場，但尚未產生回饋檢視。";
  }
  if (status === "NO_ACTION_CONTEXT") {
    return "劇場回饋已讀取，但沒有需要回帶到拜訪準備的紅線行動脈絡。";
  }
  return "建立劇場並產生回饋後，紅線提醒會自動回帶到這裡。";
}

function getRouteBActionStateLabel(state: VisitRouteBRedLineContextItem["actionState"]) {
  if (state === "ESCALATE") return "升級審閱";
  if (state === "EVIDENCE_NEEDED") return "需要佐證";
  if (state === "NOT_APPLICABLE") return "不適用";
  return "觀察中";
}

function getRelationshipCardPriorityLabel(priority: VisitRelationshipConfirmationCard["priority"]) {
  if (priority === "HIGH") return "高優先";
  if (priority === "MEDIUM") return "中優先";
  return "低優先";
}

function getRelationshipCardKindLabel(kind: VisitRelationshipConfirmationCard["kind"]) {
  if (kind === "person_role") return "角色";
  if (kind === "person_field") return "欄位";
  if (kind === "relationship_edge") return "關係";
  return "追問";
}

function getAdvisorConfirmationStateLabel(state: AdvisorConfirmationState) {
  if (state === "confirmed_in_meeting") return "本頁暫存為已確認";
  if (state === "ask_in_interview") return "轉入 AI 訪談追問";
  return "仍需現場確認";
}

function getHandoffStatusCopy(status: VisitTheaterUiStatus, isReady: boolean) {
  if (!isReady) return "準備包生成後即可整理人物、已知事實、推論與待確認項。";
  if (status === "READY") return "準備包內容已可轉成劇場人物與情境。";
  if (status === "BLOCKED_SENSITIVE") return "高敏感資料需先完成使用邊界確認。";
  return "可以先建草稿，再用訪談補齊未知與缺口。";
}

function inferRelationshipInfluence(relation: string) {
  if (relation.includes("配偶")) return "共同決策";
  if (relation.includes("父") || relation.includes("母")) return "照護影響";
  if (relation.includes("子") || relation.includes("女")) return "保障受益";
  return "關係脈絡";
}

function getClientStatusLabel(status: Client["status"]) {
  if (status === "ACTIVE") return "既有客戶";
  if (status === "PROSPECT") return "潛在客戶";
  return "已結案客戶";
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "年收入待補";

  return new Intl.NumberFormat("zh-TW", {
    currency: "TWD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
