"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  Clock3,
  History,
  MessageSquare,
  Play,
  Settings2,
  Target,
  UserRound,
} from "lucide-react";

import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormattedTime } from "@/components/ui/formatted-time";
import { clientService } from "@/domains/client/service";
import { getQuickstartTheaterFixture } from "@/domains/demo/quickstart";
import { useSpinStore } from "@/domains/spin/store";
import type { SpinSession } from "@/domains/spin/types";
import { theaterService } from "@/domains/theater/service";
import { useTheaterStore } from "@/domains/theater/store";
import type { TheaterDifficulty, TheaterPersonaType, TheaterSession } from "@/domains/theater/types";
import { cn } from "@/lib/utils";

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
  const [selectedSpinId, setSelectedSpinId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState(GOALS[0].id);
  const [difficulty, setDifficulty] = useState<TheaterDifficulty>("MEDIUM");
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

  const recentSessions = useMemo(() => {
    return theaterSessions
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [theaterSessions]);

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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {demoParam === "quickstart" ? <QuickstartGuide currentStepId="theater" /> : null}

      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Theater practice</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">AI 劇場演練</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            從一份 SPIN 摘要開始，選定演練目標與難度，再進入一場可反覆修正的客戶對話。
          </p>
        </div>
        <Button
          type="button"
          variant="mono"
          className="h-10 rounded-full"
          onClick={handleStartSimulation}
          disabled={!selectedSpin}
        >
          <Play className="mr-2 h-4 w-4 fill-current" />
          開始演練
        </Button>
      </header>

      <main className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <SetupStep eyebrow="01" icon={<MessageSquare className="h-4 w-4" />} title="選資料來源" />
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
                    尚無可用的 SPIN 摘要。先完成一筆 AI 顧問陪談後，就能把它轉成 AI 劇場演練。
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <SetupStep eyebrow="02" icon={<Target className="h-4 w-4" />} title="選演練目標" />
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
              <SetupStep eyebrow="03" icon={<Settings2 className="h-4 w-4" />} title="設定難度" />
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
        </section>

        <aside className="space-y-4">
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-ink">啟動摘要</h2>
              <div className="mt-4 space-y-4">
                <SummaryLine label="客戶" value={selectedSpin?.clientName ?? "尚未選擇"} />
                <SummaryLine label="演練目標" value={GOALS.find((goal) => goal.id === selectedGoal)?.label ?? "異議處理"} />
                <SummaryLine label="難度" value={DIFFICULTIES.find((item) => item.value === difficulty)?.label ?? "標準"} />
                <SummaryLine
                  label="Persona"
                  value={derivedPersona ? theaterService.getPersonaDetails(derivedPersona).label : "自動判斷"}
                />
              </div>
              <p className="mt-5 rounded-lg border border-hairline bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
                確認設定後，使用頁首的「開始演練」進入對話。
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
