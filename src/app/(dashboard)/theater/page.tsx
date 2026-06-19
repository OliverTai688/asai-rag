"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  Clock3,
  FileText,
  History,
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
import { clientService } from "@/domains/client/service";
import type { ClientSensitivityLevel } from "@/domains/client/types";
import { getQuickstartTheaterFixture } from "@/domains/demo/quickstart";
import { theaterFieldBuildOutline } from "@/domains/interview/outlines";
import type { TheaterBuildPacket } from "@/domains/interview/types";
import { useSpinStore } from "@/domains/spin/store";
import type { SpinSession } from "@/domains/spin/types";
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

function TheaterListContent() {
  const router = useRouter();
  const searchParams = useCurrentSearchParams();
  const demoParam = searchParams.get("demo");
  const autoCreate = searchParams.get("autoCreate");
  const clientIdParam = searchParams.get("clientId");
  const spinIdParam = searchParams.get("spinId");
  const spinSessions = useSpinStore((state) => state.sessions);
  const theaterSessions = useTheaterStore((state) => state.sessions);
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

  const recentSessions = useMemo(() => {
    return theaterSessions
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [theaterSessions]);

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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {demoParam === "quickstart" ? <QuickstartGuide currentStepId="theater" /> : null}

      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Theater practice</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">AI 劇場演練</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            選建場方式 → 確認素材 → 開始演練。可以直接用半結構訪綱建場，客戶資料是選填，不必先完成 SPIN。
          </p>
        </div>
        <Button
          type="button"
          variant="mono"
          className="h-10 rounded-full"
          onClick={handlePrimary}
          disabled={primary.disabled}
        >
          <Play className="mr-2 h-4 w-4 fill-current" />
          {primary.label}
        </Button>
      </header>

      <main className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <SetupStep eyebrow="01" icon={<Clapperboard className="h-4 w-4" />} title="選建場方式" />
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {BUILD_MODES.map((item) => {
                  const active = mode === item.value;
                  const recommended = item.value === "interview" && hasMaterial;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={cn(
                        "flex min-h-32 flex-col rounded-lg border border-hairline p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "bg-ink text-paper" : "bg-background hover:bg-muted/30",
                      )}
                      onClick={() => setMode(item.value)}
                      aria-pressed={active}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full",
                            active ? "bg-paper text-ink" : "bg-ink text-paper",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="text-sm font-semibold">{item.label}</span>
                        {active ? <Check className="ml-auto h-4 w-4" /> : null}
                      </span>
                      <span className={cn("mt-3 block text-sm leading-6", active ? "text-paper/70" : "text-muted-foreground")}>
                        {item.summary}
                      </span>
                      {recommended ? (
                        <Badge
                          variant="outline"
                          className={cn("mt-3 w-fit rounded-full", active ? "border-paper/30 text-paper" : "")}
                        >
                          已有可用素材
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

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
            <>
              <Card className="border-hairline shadow-none">
                <CardContent className="p-5">
                  <SetupStep eyebrow="02" icon={<MessageSquare className="h-4 w-4" />} title="選資料來源" />
                  <div className="mt-4 grid gap-2">
                    {completedSpinSessions.length ? (
                      completedSpinSessions.map((session) => (
                        <SpinSourceRow
                          key={session.id}
                          selected={session.id === selectedSpin?.id}
                          session={session}
                          onSelect={() => setSelectedSpinId(session.id)}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-hairline bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
                        目前沒有可轉入的 AI 了解客戶 / SPIN 摘要。你不必等它——切到「用劇場訪綱建場」就能直接開始一場演練。
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-hairline shadow-none">
                <CardContent className="p-5">
                  <SetupStep eyebrow="03" icon={<Target className="h-4 w-4" />} title="選演練目標" />
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    {GOALS.map((goal) => (
                      <button
                        key={goal.id}
                        type="button"
                        className={cn(
                          "min-h-24 rounded-lg border border-hairline p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selectedGoal === goal.id ? "bg-ink text-paper" : "bg-background hover:bg-muted/30",
                        )}
                        onClick={() => setSelectedGoal(goal.id)}
                      >
                        <span className="text-sm font-semibold">{goal.label}</span>
                        <span className={cn("mt-2 block text-sm leading-6", selectedGoal === goal.id ? "text-paper/70" : "text-muted-foreground")}>
                          {goal.summary}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-hairline shadow-none">
                <CardContent className="p-5">
                  <SetupStep eyebrow="04" icon={<Settings2 className="h-4 w-4" />} title="設定難度" />
                  <div className="mt-4 grid rounded-lg border border-hairline bg-muted/20 p-1 md:grid-cols-3">
                    {DIFFICULTIES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={cn(
                          "min-h-16 rounded-md px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          difficulty === item.value ? "bg-background text-ink shadow-sm" : "text-muted-foreground hover:text-ink",
                        )}
                        onClick={() => setDifficulty(item.value)}
                        aria-pressed={difficulty === item.value}
                      >
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="mt-1 block text-xs leading-5">{item.summary}</span>
                      </button>
                    ))}
                  </div>
                  <details className="group mt-4 rounded-lg border border-hairline bg-background">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <span>進階設定・AI 會依客戶資料自動選 persona</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-hairline p-4">
                      <PersonaPreview selectedPersona={derivedPersona} />
                    </div>
                  </details>
                </CardContent>
              </Card>
            </>
          ) : null}
        </section>

        <aside className="space-y-4">
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-ink">啟動摘要</h2>
              <div className="mt-4 space-y-4">
                <SummaryLine label="建場方式" value={BUILD_MODES.find((item) => item.value === mode)?.label ?? "用劇場訪綱建場"} />
                {mode === "interview" ? (
                  <>
                    <SummaryLine label="客戶" value={selectedSpin?.clientName ?? "尚未選擇"} />
                    <SummaryLine label="演練目標" value={GOALS.find((goal) => goal.id === selectedGoal)?.label ?? "異議處理"} />
                    <SummaryLine label="難度" value={DIFFICULTIES.find((item) => item.value === difficulty)?.label ?? "標準"} />
                    <SummaryLine
                      label="Persona"
                      value={derivedPersona ? theaterService.getPersonaDetails(derivedPersona).label : "自動判斷"}
                    />
                  </>
                ) : (
                  <>
                    <SummaryLine
                      label="客戶"
                      value={mode === "client" ? selectedClient?.name ?? "選填・尚未選擇" : "演練中由訪綱補齊"}
                    />
                    {mode === "client" && clientBuildReview ? (
                      <SummaryLine
                        label="來源審查"
                        value={clientBuildReview.build.status === "BLOCKED_SENSITIVE" ? "需高敏感確認" : "已載入"}
                      />
                    ) : null}
                  </>
                )}
              </div>
              <p className="mt-5 rounded-lg border border-hairline bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
                {mode === "interview"
                  ? "確認設定後，使用頁首的「開始演練」進入對話。"
                  : "確認設定後，使用頁首的按鈕進入訪綱建場；建場完成才會進入演練。"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-ink">最近演練</h2>
              </div>
              <div className="mt-4 space-y-2">
                {recentSessions.length ? (
                  recentSessions.map((session) => <RecentSessionRow key={session.id} session={session} />)
                ) : (
                  <p className="rounded-lg border border-dashed border-hairline bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    尚無歷史演練。
                  </p>
                )}
              </div>
              {theaterSessions.length > 5 ? (
                <details className="group mt-3 rounded-lg border border-hairline">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <span>完整歷史・{theaterSessions.length} 場</span>
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-hairline p-2">
                    {theaterSessions.slice(5).map((session) => (
                      <RecentSessionRow key={session.id} session={session} compact />
                    ))}
                  </div>
                </details>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}

function OutlineModePanel() {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="p-5">
        <SetupStep eyebrow="02" icon={<Clapperboard className="h-4 w-4" />} title="劇場訪綱建場" />
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          由 AI 導演訪談員帶你跑「{theaterFieldBuildOutline.name}」訪綱，逐段建出焦點客戶、場景、陪演角色、關係與可能異議，最後產生可確認的場域建構包。資料不足時只補問，不杜撰客戶細節。
        </p>
        <ol className="mt-4 grid gap-2">
          {theaterFieldBuildOutline.segments.map((segment) => (
            <li
              key={segment.id}
              className="flex items-start gap-3 rounded-lg border border-hairline bg-muted/20 p-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold tabular-nums text-paper">
                {segment.order + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{segment.title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{segment.goal}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-lg border border-hairline bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
          使用頁首的「開始建場」進入訪綱對話。多角色演練（Route B）尚未啟用，建場完成會先停在可確認的場域建構包。
        </p>
      </CardContent>
    </Card>
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
        <SetupStep eyebrow="02" icon={<Users className="h-4 w-4" />} title="選一位客戶（選填）" />
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

function SetupStep({ eyebrow, icon, title }: { eyebrow: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-background text-xs font-semibold tabular-nums text-muted-foreground">
        {eyebrow}
      </span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper">{icon}</span>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
    </div>
  );
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

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
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
