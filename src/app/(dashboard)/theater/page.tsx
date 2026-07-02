"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  Clock3,
  FileText,
  History,
  Info,
  Lightbulb,
  MessageSquare,
  Play,
  ShieldCheck,
  Settings2,
  Target,
  UserRound,
  Users,
} from "lucide-react";

import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormattedTime } from "@/components/ui/formatted-time";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { clientService } from "@/domains/client/service";
import type { ClientSensitivityLevel } from "@/domains/client/types";
import { getQuickstartTheaterFixture } from "@/domains/demo/quickstart";
import { theaterFieldBuildOutline } from "@/domains/interview/outlines";
import type { TheaterBuildPacket } from "@/domains/interview/types";
import { useSpinStore } from "@/domains/spin/store";
import type { SpinSession } from "@/domains/spin/types";
import type { RouteBComplianceReviewQueue } from "@/domains/theater/route-b-compliance-review-queue";
import { theaterService } from "@/domains/theater/service";
import { useTheaterStore } from "@/domains/theater/store";
import type { TheaterDifficulty, TheaterPersonaType, TheaterSession } from "@/domains/theater/types";
import { cn } from "@/lib/utils";

type BuildMode = "outline" | "client" | "interview";

const BUILD_MODES: Array<{
  value: BuildMode;
  label: string;
  summary: string;
  icon: React.ReactNode;
}> = [
  {
    value: "outline",
    label: "用劇場訪綱建場",
    summary: "沒有客戶資料也能開始，用半結構訪綱一步步建出可演練場域。",
    icon: <Clapperboard className="h-4 w-4" />,
  },
  {
    value: "client",
    label: "帶客戶資料建場",
    summary: "選填。先載入既有客戶，AI 會把已知資料帶入再補問缺口。",
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: "interview",
    label: "從既有訪談轉入",
    summary: "把先前的 AI 了解客戶 / SPIN 摘要直接轉成一場演練。",
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

const DIFFICULTIES: Array<{
  value: TheaterDifficulty;
  label: string;
  summary: string;
}> = [
  { value: "EASY", label: "暖身", summary: "客戶願意多說，適合第一次演練" },
  { value: "MEDIUM", label: "標準", summary: "有疑慮但可被引導，接近真實拜訪" },
  { value: "HARD", label: "高壓", summary: "時間少、追問多，練異議處理" },
];

const GOALS = [
  { id: "objection", label: "異議處理", summary: "練習面對保費、信任與必要性疑問" },
  { id: "clarity", label: "需求澄清", summary: "把 SPIN 摘要轉成可說出口的追問" },
  { id: "closing", label: "收斂下一步", summary: "練習不硬推方案也能取得承諾" },
];

const PERSONA_ORDER: TheaterPersonaType[] = ["SKEPTICAL", "BUSY", "EMOTIONAL", "CONSERVATIVE"];

type ClientTheaterBuildStatus = "READY" | "NEEDS_MORE_INFO" | "BLOCKED_SENSITIVE";

type ClientLite = {
  id: string;
  name: string;
  occupation: string;
  annualIncome: number;
  sensitivityLevel: ClientSensitivityLevel;
  kycStatus: string;
  sourceCounts: {
    familyMembers: number;
    policies: number;
    aiTags: number;
    complianceMissing: number;
  };
  warnings: string[];
  missing: string[];
};

type TheaterClientBuildReview = {
  client: {
    id: string;
    name: string;
    occupation: string;
    annualIncome: number;
    status: string;
    sensitivityLevel: ClientSensitivityLevel;
    kycStatus: string;
  };
  build: {
    status: ClientTheaterBuildStatus;
    knownMaterials: string[];
    warnings: string[];
    missing: string[];
    sourceSummary: {
      clientId: string;
      sourceCounts: ClientLite["sourceCounts"];
    };
    packet: TheaterBuildPacket;
  };
};

export default function TheaterListPage() {
  return <TheaterListContent />;
}

type RouteBEnterableSession = {
  id: string;
  focusName: string;
  clientName: string | null;
  characterCount: number;
  status: string;
  isDemo: boolean;
  updatedAt: string;
};

function TheaterListContent() {
  const router = useRouter();
  const searchParams = useCurrentSearchParams();
  const demoParam = searchParams.get("demo");
  const autoCreate = searchParams.get("autoCreate");
  const clientIdParam = searchParams.get("clientId");
  const spinIdParam = searchParams.get("spinId");
  const spinSessions = useSpinStore((state) => state.sessions);
  const theaterSessions = useTheaterStore((state) => state.sessions);
  const [surface, setSurface] = useState<"BUILD" | "ENTER">(searchParams.get("surface") === "enter" ? "ENTER" : "BUILD");
  const [step, setStep] = useState<1 | 2>(1);
  const createSession = useTheaterStore((state) => state.createSession);
  const addTurn = useTheaterStore((state) => state.addTurn);
  const updateTension = useTheaterStore((state) => state.updateTension);
  const completeSession = useTheaterStore((state) => state.completeSession);

  const [mode, setMode] = useState<BuildMode>("outline");
  const [selectedSpinId, setSelectedSpinId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState(GOALS[0].id);
  const [difficulty, setDifficulty] = useState<TheaterDifficulty>("MEDIUM");
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientBuildReview, setClientBuildReview] = useState<TheaterClientBuildReview | null>(null);
  const [clientBuildLoading, setClientBuildLoading] = useState(false);
  const [clientBuildError, setClientBuildError] = useState<string | null>(null);
  const [complianceReviewQueue, setComplianceReviewQueue] = useState<RouteBComplianceReviewQueue | null>(null);
  const [complianceReviewQueueLoading, setComplianceReviewQueueLoading] = useState(true);
  const [complianceReviewQueueError, setComplianceReviewQueueError] = useState<string | null>(null);
  const [routeBSessions, setRouteBSessions] = useState<RouteBEnterableSession[]>([]);
  const [routeBSessionsLoading, setRouteBSessionsLoading] = useState(true);
  const quickstartCreatedRef = useRef(false);

  const completedSpinSessions = useMemo(() => {
    return spinSessions
      .filter((session) => session.outputs.SITUATION.length > 0 || session.phase === "COMPLETE")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [spinSessions]);

  const selectedSpin = useMemo(() => {
    return completedSpinSessions.find((session) => session.id === selectedSpinId) ?? completedSpinSessions[0];
  }, [completedSpinSessions, selectedSpinId]);

  const derivedPersona = useMemo(() => {
    if (!selectedSpin) return null;
    const client = clientService.getClientById(selectedSpin.clientId);
    if (!client) return null;
    return theaterService.derivePersona(client, selectedSpin);
  }, [selectedSpin]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );
  const clientBuildBlocked = clientBuildReview?.build.status === "BLOCKED_SENSITIVE";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setComplianceReviewQueueLoading(true);
      setComplianceReviewQueueError(null);
      try {
        const response = await fetch("/api/theater/route-b/compliance-review-queue", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as unknown;

        if (cancelled) return;
        if (!response.ok || !isRouteBComplianceReviewQueuePayload(data)) {
          setComplianceReviewQueue(null);
          setComplianceReviewQueueError("無法讀取審閱佇列。");
          return;
        }

        setComplianceReviewQueue(data);
      } catch {
        if (!cancelled) {
          setComplianceReviewQueue(null);
          setComplianceReviewQueueError("無法讀取審閱佇列。");
        }
      } finally {
        if (!cancelled) setComplianceReviewQueueLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setRouteBSessionsLoading(true);
      try {
        const response = await fetch("/api/theater/route-b/sessions", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { sessions?: RouteBEnterableSession[] } | null;

        if (cancelled) return;
        setRouteBSessions(response.ok && Array.isArray(data?.sessions) ? data.sessions : []);
      } catch {
        if (!cancelled) setRouteBSessions([]);
      } finally {
        if (!cancelled) setRouteBSessionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Default to the "from interview" mode only when material already exists, so the
  // page never *forces* an interview/SPIN prerequisite on a fresh workspace.
  const hasMaterial = completedSpinSessions.length > 0;

  useEffect(() => {
    if (mode !== "client" || clientsLoaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/theater/client-builds", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setClientsLoaded(true);
          return;
        }
        const data = (await response.json()) as { clients?: ClientLite[] };
        if (cancelled) return;
        setClients(data.clients ?? []);
        setClientsLoaded(true);
      } catch {
        if (!cancelled) setClientsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, clientsLoaded]);

  function handleSelectClient(clientId: string) {
    setSelectedClientId(clientId);
    setClientBuildReview(null);
    setClientBuildError(null);
  }

  useEffect(() => {
    if (mode !== "client" || !selectedClientId) return;

    let cancelled = false;
    void (async () => {
      setClientBuildLoading(true);
      setClientBuildError(null);
      try {
        const response = await fetch(`/api/theater/client-builds/${encodeURIComponent(selectedClientId)}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as TheaterClientBuildReview | { error?: string } | null;

        if (cancelled) return;
        if (!response.ok || !data || !("build" in data)) {
          setClientBuildReview(null);
          setClientBuildError(response.status === 403 ? "目前角色只能看彙總，不能讀取這位客戶明細。" : "無法讀取客戶建場素材。");
          return;
        }

        setClientBuildReview(data);
      } catch {
        if (!cancelled) {
          setClientBuildReview(null);
          setClientBuildError("無法讀取客戶建場素材。");
        }
      } finally {
        if (!cancelled) setClientBuildLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, selectedClientId]);

  useEffect(() => {
    const shouldAutoCreate = demoParam === "quickstart" && autoCreate === "true";
    if (!shouldAutoCreate || quickstartCreatedRef.current) return;

    const clientId = clientIdParam ?? "c_wang";
    const spinId = spinIdParam;
    const spinSession =
      spinSessions.find((session) => session.id === spinId) ??
      spinSessions.find((session) => session.clientId === clientId) ??
      spinSessions[0];

    if (!spinSession) return;

    const client = clientService.getClientById(spinSession.clientId);
    if (!client) return;
    quickstartCreatedRef.current = true;

    const personaType = "SKEPTICAL";
    const newSession = createSession({
      spinSessionId: spinSession.id,
      clientId: spinSession.clientId,
      clientName: spinSession.clientName,
      personaType,
      difficulty: "MEDIUM",
    });

    const fixture = getQuickstartTheaterFixture(newSession.id, spinSession.id);
    updateTension(newSession.id, fixture.session.tension);
    fixture.turns.forEach((turn) => addTurn(newSession.id, turn));
    completeSession(newSession.id, fixture.score);

    router.replace(`/theater/${newSession.id}?demo=quickstart`);
  }, [addTurn, autoCreate, clientIdParam, completeSession, createSession, demoParam, router, spinIdParam, spinSessions, updateTension]);

  const handleStartSimulation = () => {
    if (!selectedSpin) return;

    const client = clientService.getClientById(selectedSpin.clientId);
    if (!client) return;
    const personaType = theaterService.derivePersona(client, selectedSpin);

    const newSession = createSession({
      spinSessionId: selectedSpin.id,
      clientId: selectedSpin.clientId,
      clientName: selectedSpin.clientName,
      personaType,
      difficulty,
    });

    router.push(`/theater/${newSession.id}`);
  };

  const handlePrimary = () => {
    if (mode === "interview") {
      handleStartSimulation();
      return;
    }
    if (mode === "client") {
      if (!selectedClientId || !clientBuildReview || clientBuildBlocked) return;
      router.push(`/theater/build?clientId=${encodeURIComponent(selectedClientId)}&source=client`);
      return;
    }
    router.push("/theater/build");
  };

  const primary = useMemo(() => {
    if (mode === "interview") {
      return { label: "開始演練", disabled: !selectedSpin };
    }
    if (mode === "client") {
      return {
        label: clientBuildBlocked ? "高敏感需先完成準備包確認" : "帶這位客戶建場",
        disabled: !selectedClientId || !clientBuildReview || clientBuildLoading || Boolean(clientBuildBlocked),
      };
    }
    return { label: "開始建場", disabled: false };
  }, [mode, selectedSpin, selectedClientId, clientBuildReview, clientBuildLoading, clientBuildBlocked]);

  return (
    <TooltipProvider delay={120}>
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      {demoParam === "quickstart" ? <QuickstartGuide currentStepId="theater" /> : null}

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">AI 劇場演練</h1>
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label="劇場演練說明"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] leading-5">
              選建場方式 → 確認素材 → 開始演練。可直接用半結構訪綱建場，客戶資料為選填，不必先完成 SPIN。
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <ReviewQueuePopover
            queue={complianceReviewQueue}
            loading={complianceReviewQueueLoading}
            error={complianceReviewQueueError}
            onOpenSession={(sessionId) => router.push(`/theater/${sessionId}`)}
          />
          <HistoryPopover sessions={theaterSessions} />
          <div
            className="ml-1 inline-flex rounded-full border border-hairline bg-paper p-1"
            role="group"
            aria-label="劇場模式"
          >
            <button
              type="button"
              onClick={() => {
                setSurface("BUILD");
                setStep(1);
              }}
              aria-pressed={surface === "BUILD"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                surface === "BUILD" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink",
              )}
            >
              <Clapperboard className="h-4 w-4" />
              建立
            </button>
            <button
              type="button"
              onClick={() => setSurface("ENTER")}
              aria-pressed={surface === "ENTER"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                surface === "ENTER" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink",
              )}
            >
              <Play className="h-4 w-4" />
              進入
            </button>
          </div>
        </div>
      </header>

      {surface === "ENTER" ? (
        <EnterTheaterView
          sessions={routeBSessions}
          loading={routeBSessionsLoading}
          onBuild={() => {
            setSurface("BUILD");
            setStep(1);
          }}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-6">
          <StageRail step={step} onGoStep={setStep} />

          <div
            key={step}
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
          >
            {step === 1 ? (
              <section className="space-y-5">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step 1</p>
                  <h2 className="mt-2 text-lg font-semibold text-ink">這場演練，素材從哪裡來？</h2>
                  <p className="mt-1 text-sm text-muted-foreground">選一種建場方式，下一步再確認素材；隨時能回來換。</p>
                </div>

                <div className="space-y-2.5">
                  {BUILD_MODES.map((item) => {
                    const active = mode === item.value;
                    const recommended = item.value === "interview" && hasMaterial;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setMode(item.value)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "border-ink bg-ink text-paper"
                            : "border-hairline bg-background text-ink hover:border-ink/40 hover:bg-muted/30",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            active ? "bg-paper text-ink" : "bg-muted text-ink",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{item.label}</span>
                            {recommended ? (
                              <Badge
                                variant="outline"
                                className={cn("rounded-full", active ? "border-paper/30 text-paper" : "")}
                              >
                                已有素材
                              </Badge>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "mt-1 block text-sm leading-6",
                              active ? "text-paper/70" : "text-muted-foreground",
                            )}
                          >
                            {item.summary}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                            active ? "border-paper bg-paper text-ink" : "border-hairline text-transparent",
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="monoOutline"
                    className="h-11 rounded-full px-6"
                    onClick={() => setStep(2)}
                  >
                    下一步：確認素材
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </section>
            ) : (
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    返回選方式
                  </button>
                  <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper px-3 py-1 text-xs text-muted-foreground">
                    建場方式
                    <span className="font-semibold text-ink">{BUILD_MODES.find((m) => m.value === mode)?.label}</span>
                  </span>
                </div>

                {mode === "outline" ? <OutlineModePanel /> : null}
                {mode === "client" ? (
                  <ClientModePanel
                    clients={clients}
                    clientsLoaded={clientsLoaded}
                    selectedClientId={selectedClientId}
                    onSelect={handleSelectClient}
                    selectedClient={selectedClient}
                    buildError={clientBuildError}
                    buildLoading={clientBuildLoading}
                    buildReview={clientBuildReview}
                    onSkip={() => router.push("/theater/build")}
                  />
                ) : null}
                {mode === "interview" ? (
                  <InterviewSetupPanel
                    sessions={completedSpinSessions}
                    selectedSpin={selectedSpin ?? null}
                    onSelectSpin={setSelectedSpinId}
                    selectedGoal={selectedGoal}
                    onSelectGoal={setSelectedGoal}
                    difficulty={difficulty}
                    onSelectDifficulty={setDifficulty}
                    derivedPersona={derivedPersona}
                  />
                ) : null}

                <div className="rounded-2xl border border-ink bg-ink p-5 text-paper">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <dl className="flex flex-wrap gap-x-6 gap-y-2">
                      <LaunchStat label="方式" value={BUILD_MODES.find((m) => m.value === mode)?.label ?? ""} />
                      {mode === "interview" ? (
                        <>
                          <LaunchStat label="客戶" value={selectedSpin?.clientName ?? "尚未選擇"} />
                          <LaunchStat label="目標" value={GOALS.find((g) => g.id === selectedGoal)?.label ?? ""} />
                          <LaunchStat label="難度" value={DIFFICULTIES.find((d) => d.value === difficulty)?.label ?? ""} />
                        </>
                      ) : (
                        <LaunchStat
                          label="客戶"
                          value={mode === "client" ? selectedClient?.name ?? "選填・未選" : "訪綱中補齊"}
                        />
                      )}
                    </dl>
                    <Button
                      type="button"
                      variant="mono"
                      className="h-11 shrink-0 rounded-full bg-paper px-7 text-ink hover:bg-paper hover:opacity-90"
                      onClick={handlePrimary}
                      disabled={primary.disabled}
                    >
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      {primary.label}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-paper/60">
                    {mode === "interview"
                      ? "按下後直接進入對話演練。"
                      : "按下後進入訪綱建場；建場完成才會進入演練。"}
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

function OutlineModePanel() {
  const segments = theaterFieldBuildOutline.segments;

  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <PanelHeading icon={<Clapperboard className="h-4 w-4" />} title="劇場訪綱建場" />
          <Badge variant="outline" className="shrink-0 rounded-full tabular-nums">
            {segments.length} 段訪綱
          </Badge>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          AI 導演訪談員逐段帶出焦點客戶、場景、角色與可能異議，產生可確認的場域建構包；資料不足時只補問，不杜撰。
        </p>

        <ol className="mt-4 flex flex-wrap gap-2" aria-label="訪綱段落">
          {segments.map((segment) => (
            <li key={segment.id}>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background py-1.5 pl-1.5 pr-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`第 ${segment.order + 1} 段・${segment.title}：${segment.goal}`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold tabular-nums text-paper">
                    {segment.order + 1}
                  </span>
                  <span className="text-xs font-medium text-ink">{segment.title}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] leading-5">
                  {segment.goal}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          滑過或聚焦每段看目的。按下方「開始建場」進入訪綱對話。
        </p>

        <details className="group mt-4 rounded-lg border border-hairline bg-background">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span>多角色演練（Route B）狀態</span>
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <p className="border-t border-hairline p-4 text-xs leading-5 text-muted-foreground">
            多角色演練（Route B）尚未啟用，建場完成會先停在可確認的場域建構包。
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

function StageRail({ step, onGoStep }: { step: 1 | 2; onGoStep: (s: 1 | 2) => void }) {
  const stages: Array<{ n: 1 | 2; label: string }> = [
    { n: 1, label: "選建場方式" },
    { n: 2, label: "確認並開始" },
  ];

  return (
    <nav aria-label="建場步驟" className="flex items-center justify-center gap-1">
      {stages.map((stage, index) => {
        const active = step === stage.n;
        const done = step > stage.n;
        return (
          <div key={stage.n} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onGoStep(stage.n)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-ink" : "text-muted-foreground hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  active || done ? "bg-ink text-paper" : "border border-hairline text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : stage.n}
              </span>
              <span className={cn("font-medium", active ? "inline" : "hidden sm:inline")}>{stage.label}</span>
            </button>
            {index < stages.length - 1 ? <span aria-hidden className="h-px w-6 bg-hairline sm:w-10" /> : null}
          </div>
        );
      })}
    </nav>
  );
}

function LaunchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-paper/50">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-paper">{value}</dd>
    </div>
  );
}

function InterviewSetupPanel({
  derivedPersona,
  difficulty,
  onSelectDifficulty,
  onSelectGoal,
  onSelectSpin,
  selectedGoal,
  selectedSpin,
  sessions,
}: {
  derivedPersona: TheaterPersonaType | null;
  difficulty: TheaterDifficulty;
  onSelectDifficulty: (value: TheaterDifficulty) => void;
  onSelectGoal: (value: string) => void;
  onSelectSpin: (value: string) => void;
  selectedGoal: string;
  selectedSpin: SpinSession | null;
  sessions: SpinSession[];
}) {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="divide-y divide-hairline p-0">
        <section className="p-5">
          <PanelHeading icon={<MessageSquare className="h-4 w-4" />} title="資料來源" />
          <div className="mt-3 grid gap-2">
            {sessions.length ? (
              sessions.map((session) => (
                <SpinSourceRow
                  key={session.id}
                  selected={session.id === selectedSpin?.id}
                  session={session}
                  onSelect={() => onSelectSpin(session.id)}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-hairline bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
                目前沒有可轉入的摘要。返回上一步，改用「劇場訪綱建場」即可直接開始。
              </div>
            )}
          </div>
        </section>

        <section className="p-5">
          <PanelHeading icon={<Target className="h-4 w-4" />} title="演練目標" />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {GOALS.map((goal) => {
              const active = selectedGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => onSelectGoal(goal.id)}
                  aria-pressed={active}
                  className={cn(
                    "min-h-20 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-ink bg-ink text-paper" : "border-hairline bg-background hover:bg-muted/30",
                  )}
                >
                  <span className="text-sm font-semibold">{goal.label}</span>
                  <span className={cn("mt-1 block text-xs leading-5", active ? "text-paper/70" : "text-muted-foreground")}>
                    {goal.summary}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="p-5">
          <PanelHeading icon={<Settings2 className="h-4 w-4" />} title="難度" />
          <div className="mt-3 grid rounded-lg border border-hairline bg-muted/20 p-1 sm:grid-cols-3">
            {DIFFICULTIES.map((item) => {
              const active = difficulty === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSelectDifficulty(item.value)}
                  aria-pressed={active}
                  className={cn(
                    "min-h-14 rounded-md px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-paper text-ink ring-1 ring-inset ring-hairline" : "text-muted-foreground hover:text-ink",
                  )}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-5">{item.summary}</span>
                </button>
              );
            })}
          </div>
          <details className="group mt-3 rounded-lg border border-hairline bg-background">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span>進階・AI 會依客戶資料自動選 persona</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-hairline p-4">
              <PersonaPreview selectedPersona={derivedPersona} />
            </div>
          </details>
        </section>
      </CardContent>
    </Card>
  );
}

function PanelHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper">{icon}</span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
    </div>
  );
}

function ReviewQueuePopover({
  error,
  loading,
  queue,
  onOpenSession,
}: {
  error: string | null;
  loading: boolean;
  queue: RouteBComplianceReviewQueue | null;
  onOpenSession: (sessionId: string) => void;
}) {
  const items = queue?.items ?? [];
  const reviewBoundary = queue?.reviewBoundary;
  const boundaryFlags: Array<{ label: string; ok: boolean }> = [
    { label: "不建立正式 finding", ok: reviewBoundary?.createsFormalFinding === false },
    { label: "不發真實通知", ok: reviewBoundary?.triggersExternalNotification === false },
    { label: "不寫入 CRM fact", ok: reviewBoundary?.writesConfirmedCrmFact === false },
    { label: "不呼叫 provider", ok: reviewBoundary?.providerCallAttempted === false },
  ];
  const count = queue?.candidateCount ?? 0;
  const hasUnmetBoundary = Boolean(reviewBoundary) && boundaryFlags.some((flag) => !flag.ok);

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={count ? `審閱佇列，${count} 項待審閱` : "審閱佇列"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-paper text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ShieldCheck className="h-4 w-4" />
        {count > 0 || hasUnmetBoundary ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold tabular-nums text-paper">
            {count > 0 ? count : "!"}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">審閱佇列</p>
          <Badge variant="outline" className="rounded-full">{queue?.status ?? "NO_PROVIDER"}</Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          只整理 Route B 待審閱候選，不代表正式法遵處置，也不會發真實通知。
        </p>

        <div className="grid grid-cols-3 gap-2 text-center">
          <ReviewCount label="待審閱" value={queue?.candidateCount ?? 0} />
          <ReviewCount label="需要佐證" value={queue?.needsEvidenceCount ?? 0} />
          <ReviewCount label="升級候選" value={queue?.escalationCount ?? 0} />
        </div>

        {hasUnmetBoundary ? (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs leading-5 text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>有安全邊界未確認，請檢查下方清單。</span>
          </p>
        ) : null}

        {loading ? (
          <p className="rounded-lg border border-dashed border-hairline bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
            正在整理待審閱候選…
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
            {error}
          </p>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hairline bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
            目前沒有待審閱候選。
          </p>
        ) : null}

        {items.length ? (
          <div className="space-y-2">
            {items.slice(0, 3).map((item) => (
              <div key={item.sessionId} className="rounded-lg border border-hairline bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">{item.sessionId}</p>
                  <Badge variant="outline" className="rounded-full">{item.candidateCount} 項</Badge>
                </div>
                <div className="mt-2 space-y-2">
                  {item.candidates.slice(0, 2).map((candidate) => (
                    <div key={candidate.id} className="rounded-md border border-hairline bg-muted/20 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={candidate.actionState === "ESCALATE" ? "destructive" : "outline"} className="rounded-full">
                          {candidate.actionState === "ESCALATE" ? "升級候選" : "需要佐證"}
                        </Badge>
                        <span className="text-xs font-semibold text-ink">{candidate.label}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{candidate.safeSummary}</p>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2.5 h-9 w-full rounded-full"
                  onClick={() => onOpenSession(item.sessionId)}
                >
                  開啟劇場檢視
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="border-t border-hairline pt-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">安全邊界</p>
          <ul className="grid gap-1">
            {boundaryFlags.map((flag) => (
              <li key={flag.label} className="flex items-center gap-2 text-xs text-ink">
                <Check className={cn("h-3.5 w-3.5 shrink-0", flag.ok ? "text-[#2E7D32]" : "text-muted-foreground")} />
                <span>{flag.label}</span>
                {!flag.ok ? <span className="ml-auto text-[11px] text-muted-foreground">未確認</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HistoryPopover({ sessions }: { sessions: TheaterSession[] }) {
  const ordered = sessions
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const recent = ordered.slice(0, 5);

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={ordered.length ? `最近演練，${ordered.length} 場` : "最近演練"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-paper text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <History className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        <p className="text-sm font-semibold text-ink">最近演練</p>
        {recent.length ? (
          <div className="grid gap-1.5">
            {recent.map((session) => (
              <RecentSessionRow key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-hairline bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
            尚無歷史演練。
          </p>
        )}
        {ordered.length > 5 ? (
          <details className="group rounded-lg border border-hairline">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
              <span>完整歷史・{ordered.length} 場</span>
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-1.5 border-t border-hairline p-2">
              {ordered.slice(5).map((session) => (
                <RecentSessionRow key={session.id} session={session} compact />
              ))}
            </div>
          </details>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function ClientModePanel({
  buildError,
  buildLoading,
  buildReview,
  clients,
  clientsLoaded,
  selectedClientId,
  onSelect,
  selectedClient,
  onSkip,
}: {
  buildError: string | null;
  buildLoading: boolean;
  buildReview: TheaterClientBuildReview | null;
  clients: ClientLite[];
  clientsLoaded: boolean;
  selectedClientId: string | null;
  onSelect: (id: string) => void;
  selectedClient: ClientLite | null;
  onSkip: () => void;
}) {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="p-5">
        <PanelHeading icon={<Users className="h-4 w-4" />} title="選一位客戶（選填）" />
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          載入既有客戶後，AI 會把已確認資料帶入建場、只追問缺口；推論不會被當成事實。也可以略過，直接用訪綱建場。
        </p>
        <div className="mt-4 grid gap-2">
          {!clientsLoaded ? (
            <div className="rounded-lg border border-dashed border-hairline bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
              載入客戶清單中…
            </div>
          ) : clients.length ? (
            clients.map((client) => {
              const selected = client.id === selectedClientId;
              return (
                <button
                  key={client.id}
                  type="button"
                  className={cn(
                    "grid min-h-16 gap-3 rounded-lg border border-hairline p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[1fr_auto] md:items-center",
                    selected ? "bg-ink text-paper" : "bg-background hover:bg-muted/30",
                  )}
                  onClick={() => onSelect(client.id)}
                  aria-pressed={selected}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 shrink-0" />
                      <span className="truncate text-sm font-semibold">{client.name}</span>
                      {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </span>
                    <span className={cn("mt-2 block truncate text-sm leading-6", selected ? "text-paper/70" : "text-muted-foreground")}>
                      {client.occupation || "未填寫職業"}・關係 {client.sourceCounts.familyMembers}・保單 {client.sourceCounts.policies}
                    </span>
                  </span>
                  {client.sensitivityLevel !== "NORMAL" ? (
                    <Badge variant="outline" className={cn("rounded-full", selected ? "border-paper/30 text-paper" : "")}>
                      {client.sensitivityLevel === "HIGHLY_SENSITIVE" ? "高敏感" : "敏感"}
                    </Badge>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-hairline bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
              目前沒有可載入的客戶。可以先略過，直接用訪綱建場。
            </div>
          )}
        </div>

        {buildLoading ? (
          <div className="mt-4 rounded-lg border border-dashed border-hairline bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
            正在整理客戶建場素材…
          </div>
        ) : null}

        {buildError ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{buildError}</span>
          </div>
        ) : null}

        {buildReview ? (
          <ClientBuildReviewPanel review={buildReview} />
        ) : selectedClient ? (
          <div className="mt-4 rounded-lg border border-hairline bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
            選擇後會先顯示來源審查，再進入建場頁。
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSkip}
          className="mt-4 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          略過，直接用訪綱建場 →
        </button>
      </CardContent>
    </Card>
  );
}

function ClientBuildReviewPanel({ review }: { review: TheaterClientBuildReview }) {
  const blocked = review.build.status === "BLOCKED_SENSITIVE";
  const counts = review.build.sourceSummary.sourceCounts;

  return (
    <div className="mt-4 rounded-lg border border-hairline bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={blocked ? "destructive" : review.build.status === "READY" ? "success" : "outline"}>
              {getClientBuildStatusLabel(review.build.status)}
            </Badge>
            <span className="text-sm font-semibold text-ink">客戶資料建場審查</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            這一步只整理可讀的客戶資料，不會把推論寫回 CRM，也不會啟動多角色 Route B。
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <ReviewCount label="關係" value={counts.familyMembers} />
          <ReviewCount label="保單" value={counts.policies} />
          <ReviewCount label="推論" value={counts.aiTags} />
          <ReviewCount label="待補" value={counts.complianceMissing} />
        </div>
      </div>

      {blocked ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>高敏感客戶不可從客戶清單直建場；請先建立拜訪準備包，並在準備包進劇場時留下 reason/riskAccepted audit。</span>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ReviewList
          icon={<ShieldCheck className="h-3.5 w-3.5 text-[#2E7D32]" />}
          title="已知事實"
          items={review.build.packet.confirmedFacts}
          empty="目前沒有足夠確認事實。"
        />
        <ReviewList
          icon={<Lightbulb className="h-3.5 w-3.5 text-amber-600" />}
          title="推論線索"
          items={review.build.packet.inferredPersona}
          empty="目前沒有推論線索。"
        />
        <ReviewList
          icon={<CircleHelp className="h-3.5 w-3.5 text-sky-600" />}
          title="待確認"
          items={[...review.build.packet.unknowns, ...review.build.packet.narratorQuestions, ...review.build.missing]}
          empty="目前沒有待確認項。"
        />
      </div>

      {review.build.warnings.length ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-hairline bg-paper p-3 text-xs leading-5 text-muted-foreground">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
          <span>{review.build.warnings.slice(0, 3).join("；")}</span>
        </div>
      ) : null}
    </div>
  );
}

function ReviewCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-14 rounded-lg border border-hairline bg-paper px-2 py-2">
      <p className="text-base font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ReviewList({
  empty,
  icon,
  items,
  title,
}: {
  empty: string;
  icon: React.ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-paper p-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold text-ink">{title}</p>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      {items.length ? (
        <ul className="mt-2 space-y-1">
          {items.slice(0, 3).map((item, index) => (
            <li key={`${title}-${index}`} className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function getClientBuildStatusLabel(status: ClientTheaterBuildStatus) {
  if (status === "READY") return "可建場";
  if (status === "BLOCKED_SENSITIVE") return "高敏感暫停";
  return "需補資料";
}

function SpinSourceRow({
  onSelect,
  selected,
  session,
}: {
  onSelect: () => void;
  selected: boolean;
  session: SpinSession;
}) {
  const totalOutputs = Object.values(session.outputs).reduce((sum, output) => sum + output.length, 0);

  return (
    <button
      type="button"
      className={cn(
        "grid min-h-16 gap-3 rounded-lg border border-hairline p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[1fr_auto] md:items-center",
        selected ? "bg-ink text-paper" : "bg-background hover:bg-muted/30",
      )}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-semibold">{session.clientName}</span>
          {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
        </span>
        <span className={cn("mt-2 block text-sm leading-6", selected ? "text-paper/70" : "text-muted-foreground")}>
          {session.summary?.keyProblems?.[0] ?? "已有 SPIN 輸出，可轉為對話情境。"}
        </span>
      </span>
      <span className="flex flex-wrap gap-2 md:justify-end">
        <Badge variant="outline" className={cn("rounded-full", selected ? "border-paper/30 text-paper" : "")}>
          {totalOutputs} 個線索
        </Badge>
        <Badge variant="outline" className={cn("rounded-full", selected ? "border-paper/30 text-paper" : "")}>
          {session.phase === "COMPLETE" ? "完成" : "可演練"}
        </Badge>
      </span>
    </button>
  );
}

function PersonaPreview({ selectedPersona }: { selectedPersona: TheaterPersonaType | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERSONA_ORDER.map((persona) => {
        const detail = theaterService.getPersonaDetails(persona);
        const active = persona === selectedPersona;
        return (
          <div
            key={persona}
            className={cn(
              "rounded-lg border border-hairline p-3",
              active ? "bg-ink text-paper" : "bg-muted/20 text-ink",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{detail.label}</p>
              {active ? <Badge className="rounded-full bg-paper text-ink">本次</Badge> : null}
            </div>
            <p className={cn("mt-2 text-xs leading-5", active ? "text-paper/70" : "text-muted-foreground")}>
              {detail.traits.join("、")}・{detail.style}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function EnterTheaterView({
  sessions,
  loading,
  onBuild,
}: {
  sessions: RouteBEnterableSession[];
  loading: boolean;
  onBuild: () => void;
}) {
  if (loading && sessions.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="min-h-32 animate-pulse rounded-lg border border-hairline bg-muted/30" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-dashed border-hairline shadow-none">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Play className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-ink">還沒有可進入的劇場</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              先建立一個劇場，進入後就能看到客戶的關係圖，並和場上的每個角色說話或觀察他們互動。
            </p>
          </div>
          <Button type="button" variant="mono" className="rounded-full" onClick={onBuild}>
            <Clapperboard className="mr-2 h-4 w-4" />
            建立劇場
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">進入劇場</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            選一個已建立的劇場進入：焦點客戶居中的關係圖、和各角色對話、或觀察角色自然互動。
          </p>
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={onBuild}>
          <Clapperboard className="mr-2 h-4 w-4" />
          建立新劇場
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => (
          <a
            key={session.id}
            href={`/theater/${session.id}`}
            className="group flex min-h-32 flex-col justify-between gap-3 rounded-lg border border-hairline bg-background p-4 transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="truncate text-sm font-semibold text-ink">{session.focusName} 的多角色劇場</span>
              <Badge variant="outline" className="shrink-0 rounded-full">
                {session.status === "COMPLETED" ? "完成" : "可進入"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {session.characterCount} 位角色
              <span>・</span>
              <Clock3 className="h-3.5 w-3.5" />
              <FormattedTime isoString={session.updatedAt} format="date" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
              <Play className="h-4 w-4 fill-current" />
              進入劇場
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function RecentSessionRow({ compact, session }: { compact?: boolean; session: TheaterSession }) {
  return (
    <a
      href={`/theater/${session.id}`}
      className={cn(
        "grid min-h-11 gap-1 rounded-lg border border-hairline p-3 transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "border-transparent" : "bg-background",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-ink">{session.clientName}</span>
        <Badge variant="outline" className="rounded-full">
          {session.status === "COMPLETED" ? "完成" : "進行中"}
        </Badge>
      </span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <BrainCircuit className="h-3.5 w-3.5" />
        {theaterService.getPersonaDetails(session.personaType).label}
        <span>・</span>
        <Clock3 className="h-3.5 w-3.5" />
        <FormattedTime isoString={session.updatedAt} format="date" />
      </span>
    </a>
  );
}

function isRouteBComplianceReviewQueuePayload(value: unknown): value is RouteBComplianceReviewQueue {
  const record = asRecord(value);
  const reviewBoundary = asRecord(record.reviewBoundary);
  const providerBoundary = asRecord(record.providerBoundary);
  const persistenceBoundary = asRecord(record.persistenceBoundary);

  return (
    record.agentId === "asai.theater.route_b" &&
    record.actionId === "route-b-red-line-compliance-review-queue" &&
    record.registryReadiness === "internal-only" &&
    record.sourceActionId === "route-b-red-line-compliance-review-intake" &&
    record.status === "DETERMINISTIC_NO_PROVIDER" &&
    typeof record.candidateCount === "number" &&
    typeof record.needsEvidenceCount === "number" &&
    typeof record.escalationCount === "number" &&
    Array.isArray(record.items) &&
    reviewBoundary.createsFormalFinding === false &&
    reviewBoundary.triggersExternalNotification === false &&
    reviewBoundary.writesConfirmedCrmFact === false &&
    reviewBoundary.providerCallAttempted === false &&
    providerBoundary.providerCallAttempted === false &&
    providerBoundary.aiUsageLogWritten === false &&
    persistenceBoundary.persistsQueueRecord === false &&
    persistenceBoundary.persistsCandidateRecord === false
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function useCurrentSearchParams() {
  const search = useSyncExternalStore(
    subscribeToLocationChanges,
    getLocationSearchSnapshot,
    () => ""
  );

  return useMemo(() => new URLSearchParams(search), [search]);
}

function getLocationSearchSnapshot() {
  return typeof window === "undefined" ? "" : window.location.search;
}

function subscribeToLocationChanges(onStoreChange: () => void) {
  const originalPushState = window.history.pushState.bind(window.history) as History["pushState"];
  const originalReplaceState = window.history.replaceState.bind(window.history) as History["replaceState"];
  const urlChangeEvent = "asai-theater-url-change";
  const emitUrlChange = () => setTimeout(() => window.dispatchEvent(new Event(urlChangeEvent)));
  const patchedPushState: History["pushState"] = (...args) => {
    const result = originalPushState(...args);
    emitUrlChange();
    return result;
  };
  const patchedReplaceState: History["replaceState"] = (...args) => {
    const result = originalReplaceState(...args);
    emitUrlChange();
    return result;
  };

  window.history.pushState = patchedPushState;
  window.history.replaceState = patchedReplaceState;
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(urlChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(urlChangeEvent, onStoreChange);
    if (window.history.pushState === patchedPushState) {
      window.history.pushState = originalPushState;
    }
    if (window.history.replaceState === patchedReplaceState) {
      window.history.replaceState = originalReplaceState;
    }
  };
}
