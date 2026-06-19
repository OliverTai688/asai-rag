"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BrainCircuit,
  ChevronDown,
  CircleAlert,
  Loader2,
  MessageSquare,
  Send,
  Trophy,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { clientService } from "@/domains/client/service";
import {
  demoQuickstart,
  getQuickstartStep,
  getQuickstartTheaterFixture,
} from "@/domains/demo/quickstart";
import { theaterTourSteps } from "@/domains/demo/tour-steps";
import { useSpinStore } from "@/domains/spin/store";
import { theaterService } from "@/domains/theater/service";
import { useTheaterStore } from "@/domains/theater/store";
import type { TheaterScore, TheaterSession, TheaterTurn } from "@/domains/theater/types";
import { cn } from "@/lib/utils";

const SCORE_ITEMS: Array<{ key: keyof Pick<TheaterScore, "empathy" | "questioning" | "clarity" | "objectionHandling" | "closing">; label: string }> = [
  { key: "empathy", label: "同理心" },
  { key: "questioning", label: "提問力" },
  { key: "clarity", label: "清晰度" },
  { key: "objectionHandling", label: "異議處理" },
  { key: "closing", label: "締結感" },
];

const EMPTY_TURNS: TheaterTurn[] = [];

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function TheaterSimulationPage() {
  return (
    <Suspense fallback={<TheaterSessionLoading />}>
      <TheaterSimulationContent />
    </Suspense>
  );
}

function TheaterSimulationContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = normalizeParam(params.sessionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const session = useTheaterStore((state) => state.sessions.find((item) => item.id === sessionId));
  const storedTurns = useTheaterStore((state) => (sessionId ? state.turnsBySession[sessionId] ?? EMPTY_TURNS : EMPTY_TURNS));
  const score = useTheaterStore((state) => (sessionId ? state.scoresBySession[sessionId] : undefined));
  const addTurn = useTheaterStore((state) => state.addTurn);
  const updateTension = useTheaterStore((state) => state.updateTension);
  const completeSession = useTheaterStore((state) => state.completeSession);
  const spinSessions = useSpinStore((state) => state.sessions);
  const [liveTurns, setLiveTurns] = useState<TheaterTurn[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingScore, setIsLoadingScore] = useState(false);
  const isQuickstart = searchParams.get("demo") === "quickstart";
  const turns = liveTurns.length ? liveTurns : storedTurns;

  useEffect(() => {
    if (isQuickstart && !session) {
      router.replace(`/theater?clientId=${demoQuickstart.clientId}&autoCreate=true&demo=quickstart`);
    }
  }, [isQuickstart, router, session]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, isTyping]);

  const spinSession = useMemo(() => {
    if (!session) return undefined;
    return spinSessions.find((item) => item.id === session.spinSessionId);
  }, [session, spinSessions]);

  if (!session || !sessionId) {
    return <TheaterSessionMissing isQuickstart={isQuickstart} />;
  }

  const personaInfo = theaterService.getPersonaDetails(session.personaType);
  const isCompleted = session.status === "COMPLETED";

  if (isQuickstart) {
    return <QuickstartTheaterView score={score} session={session} turns={turns} />;
  }

  const appendLiveTurn = (turn: TheaterTurn) => {
    setLiveTurns((current) => [...(current.length ? current : storedTurns), turn]);
  };

  const replaceLastLiveTurn = (content: string) => {
    setLiveTurns((current) => {
      const base = current.length ? current : storedTurns;
      const last = base[base.length - 1];
      if (!last) return base;
      return [...base.slice(0, -1), { ...last, content }];
    });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping || isCompleted) return;

    const tensionDelta = theaterService.calculateTensionDelta(trimmed);
    const newTension = Math.max(0, Math.min(100, session.tension + tensionDelta));
    updateTension(sessionId, newTension);

    const userTurn: TheaterTurn = {
      id: `${Date.now()}`,
      sessionId,
      role: "agent",
      content: trimmed,
      tensionDelta,
      createdAt: new Date().toISOString(),
    };

    setInput("");
    appendLiveTurn(userTurn);
    addTurn(sessionId, userTurn);
    setIsTyping(true);

    try {
      const clientContext = clientService.getClientById(session.clientId);
      const response = await fetch("/api/ai/theater", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          clientId: session.clientId,
          personaType: session.personaType,
          difficulty: session.difficulty,
          tension: newTension,
          clientContext,
          spinOutputs: spinSession?.outputs || {},
          history: [...turns, userTurn].slice(-6),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(payload?.message ?? payload?.error ?? "Theater response failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const assistantTurn: TheaterTurn = {
        id: `${Date.now() + 1}`,
        sessionId,
        role: "client",
        content: "",
        createdAt: new Date().toISOString(),
      };
      appendLiveTurn(assistantTurn);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
        replaceLastLiveTurn(fullText);
      }

      addTurn(sessionId, { ...assistantTurn, content: fullText });
    } catch (error) {
      console.error("Theater response failed", error);
      toast.error("模擬故障，請檢查 AI key 或網路");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.key === "Process") {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleEndSimulation = async () => {
    setIsLoadingScore(true);
    try {
      const response = await fetch("/api/ai/theater/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          clientId: session.clientId,
          history: turns,
          clientContext: clientService.getClientById(session.clientId),
          personaType: session.personaType,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(payload?.message ?? payload?.error ?? "score failed");
      }

      const finalScore = (await response.json()) as TheaterScore;
      completeSession(sessionId, finalScore);
      toast.success("演練結束，評分報告已生成");
    } catch (error) {
      console.error("Theater score failed", error);
      toast.error(error instanceof Error ? error.message : "評分系統暫時無法連線");
    } finally {
      setIsLoadingScore(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-88px)] max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <header className="grid gap-4 border-b border-hairline pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/theater"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-muted-foreground transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="回 AI 劇場演練"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              AI 劇場演練
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{session.clientName}</h1>
              <Badge variant="outline" className="rounded-full">
                {session.difficulty}
              </Badge>
              <Badge variant={isCompleted ? "default" : "outline"} className="rounded-full">
                {isCompleted ? "已完成" : "演練中"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{personaInfo.label}・{personaInfo.style}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <TensionPill value={session.tension} />
          {!isCompleted ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full"
              onClick={handleEndSimulation}
              disabled={isLoadingScore || isTyping || turns.length === 0}
            >
              {isLoadingScore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
              結束並評分
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="flex min-h-0 flex-col rounded-lg border border-hairline bg-background">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {turns.length === 0 ? <EmptyConversation personaLabel={personaInfo.label} /> : null}
              {turns.map((turn) => (
                <ConversationTurn key={turn.id} turn={turn} />
              ))}
              {isTyping ? <TypingTurn /> : null}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="border-t border-hairline bg-paper p-3">
            {!isCompleted ? (
              <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="輸入你的回應；Enter 送出，Shift+Enter 換行"
                  className="min-h-20 max-h-36 resize-y rounded-lg border-hairline bg-background text-base leading-6 focus-visible:ring-ring"
                  disabled={isTyping}
                  aria-label="輸入演練回應"
                />
                <Button
                  type="submit"
                  variant="mono"
                  size="icon"
                  className="h-11 w-full rounded-full sm:w-11"
                  disabled={!input.trim() || isTyping}
                  aria-label="送出演練回應"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl rounded-lg border border-hairline bg-background p-4 text-sm leading-6 text-muted-foreground">
                這場演練已完成。你可以在右側查看評分摘要，或回到劇場啟動下一場演練。
              </div>
            )}
          </form>
        </main>

        <aside className="min-h-0 space-y-3 overflow-y-auto">
          <SessionContextPanel session={session} personaInfo={personaInfo} spinSummary={spinSession?.summary?.keyProblems?.[0]} />
          {score ? <FeedbackPanel score={score} /> : <PendingFeedbackPanel isCompleted={isCompleted} />}
          <MobileDetailsFallback session={session} personaInfo={personaInfo} score={score} />
        </aside>
      </div>
    </div>
  );
}

function TensionPill({ value }: { value: number }) {
  return (
    <div className="min-w-40 rounded-full border border-hairline bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
        <span>緊張度</span>
        <span className="tabular-nums text-ink">{value}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-ink transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function EmptyConversation({ personaLabel }: { personaLabel: string }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-muted/20 p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-background">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-semibold text-ink">模擬開始，客戶是{personaLabel}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">先用一句開場或核心問題切入，觀察緊張度如何變化。</p>
    </div>
  );
}

function ConversationTurn({ turn }: { turn: TheaterTurn }) {
  const isAgent = turn.role === "agent";
  return (
    <div className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[88%] gap-3", isAgent ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline",
            isAgent ? "bg-ink text-paper" : "bg-background text-muted-foreground",
          )}
        >
          {isAgent ? <UserRound className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
        </div>
        <div>
          <div
            className={cn(
              "whitespace-pre-wrap rounded-lg border border-hairline px-4 py-3 text-sm leading-6",
              isAgent ? "bg-ink text-paper" : "bg-card text-ink",
            )}
          >
            {turn.content}
          </div>
          {turn.tensionDelta !== undefined && turn.tensionDelta !== 0 ? (
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              緊張度 {turn.tensionDelta > 0 ? `+${turn.tensionDelta}` : turn.tensionDelta}%
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TypingTurn() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-3">
        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground">
          <BrainCircuit className="h-4 w-4" />
        </div>
        <div className="rounded-lg border border-hairline bg-card px-4 py-3">
          <div className="flex gap-1" aria-label="客戶正在回應">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionContextPanel({
  personaInfo,
  session,
  spinSummary,
}: {
  personaInfo: ReturnType<typeof theaterService.getPersonaDetails>;
  session: TheaterSession;
  spinSummary?: string;
}) {
  return (
    <Card className="hidden border-hairline shadow-none lg:block">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-ink">演練情境</h2>
        <div className="mt-4 space-y-3">
          <ContextLine label="Persona" value={personaInfo.label} />
          <ContextLine label="難度" value={session.difficulty} />
          <ContextLine label="狀態" value={session.status === "COMPLETED" ? "已完成" : "演練中"} />
        </div>
        <div className="mt-4 rounded-lg border border-hairline bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Traits</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {personaInfo.traits.map((trait) => (
              <span key={trait} className="rounded-full border border-hairline bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                {trait}
              </span>
            ))}
          </div>
        </div>
        <details className="group mt-3 rounded-lg border border-hairline">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span>SPIN 摘要・{spinSummary ? "已連結" : "無摘要"}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <p className="border-t border-hairline p-3 text-sm leading-6 text-muted-foreground">
            {spinSummary ?? "這場演練沒有可顯示的 SPIN 摘要。"}
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function PendingFeedbackPanel({ isCompleted }: { isCompleted: boolean }) {
  return (
    <Card className="hidden border-hairline shadow-none lg:block">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <CircleAlert className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-ink">評分回饋</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isCompleted ? "這場演練尚未取得評分資料。" : "結束演練後會生成摘要分數、錯失契機與建議說法。"}
        </p>
      </CardContent>
    </Card>
  );
}

function FeedbackPanel({ score }: { score: TheaterScore }) {
  const average = Math.round(SCORE_ITEMS.reduce((sum, item) => sum + score[item.key], 0) / SCORE_ITEMS.length);
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">評分摘要</h2>
          <span className="text-2xl font-semibold tabular-nums text-ink">{average}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SCORE_ITEMS.map((item) => (
            <div key={item.key} className="rounded-lg border border-hairline p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{score[item.key]}</p>
            </div>
          ))}
        </div>
        <FeedbackDetails title={`錯失契機・${score.missedOpportunities.length} 項`} items={score.missedOpportunities} />
        <FeedbackDetails title={`建議說法・${score.improvedPhrasing.length} 項`} items={score.improvedPhrasing} />
      </CardContent>
    </Card>
  );
}

function FeedbackDetails({ items, title }: { items: string[]; title: string }) {
  return (
    <details className="group mt-3 rounded-lg border border-hairline">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <ul className="space-y-2 border-t border-hairline p-3">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </details>
  );
}

function MobileDetailsFallback({
  personaInfo,
  score,
  session,
}: {
  personaInfo: ReturnType<typeof theaterService.getPersonaDetails>;
  score?: TheaterScore;
  session: TheaterSession;
}) {
  return (
    <details className="group rounded-lg border border-hairline bg-card lg:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span>演練資訊・{personaInfo.label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-hairline p-3">
        <ContextLine label="難度" value={session.difficulty} />
        <ContextLine label="緊張度" value={`${session.tension}%`} />
        {score ? <FeedbackPanel score={score} /> : null}
      </div>
    </details>
  );
}

function QuickstartTheaterView({
  score,
  session,
  turns,
}: {
  score?: TheaterScore;
  session: TheaterSession;
  turns: TheaterTurn[];
}) {
  const step = getQuickstartStep("theater");
  const fixture = getQuickstartTheaterFixture(session.id, session.spinSessionId);
  const displayTurns = turns.length ? turns : fixture.turns;
  const displayScore = score ?? fixture.score;
  const personaInfo = theaterService.getPersonaDetails(session.personaType);
  const clientTurn = displayTurns.find((turn) => turn.role === "client") ?? fixture.turns[0];
  const agentTurn = displayTurns.find((turn) => turn.role === "agent") ?? fixture.turns[1];
  const averageScore = Math.round(
    (displayScore.empathy +
      displayScore.questioning +
      displayScore.clarity +
      displayScore.objectionHandling +
      displayScore.closing) /
      5,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <SpotlightTour steps={theaterTourSteps} />

      <QuickstartGuide
        currentStepId="theater"
        compact
        nextHref={`/reports?clientId=${session.clientId}&spinId=${session.spinSessionId}&theaterId=${session.id}&autoCreate=true&demo=quickstart`}
      />

      <section className="rounded-lg border border-hairline bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quickstart Theater</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{step.screenTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.bodyCopy}</p>
      </section>

      <Card data-tour="theater-persona" className="border-hairline shadow-none">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Persona</p>
              <p className="mt-1 text-lg font-semibold text-ink">{personaInfo.label}</p>
            </div>
            <Badge variant="outline" className="rounded-full">平均 {averageScore}</Badge>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{personaInfo.style}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <Card data-tour="client-objection" className="border-hairline shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">客戶疑慮</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink">{clientTurn.content}</p>
          </CardContent>
        </Card>

        <Card data-tour="agent-response" className="border-hairline bg-muted/20 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">建議說法</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink">
              {displayScore.improvedPhrasing[0] ?? agentTurn.content}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TheaterSessionMissing({ isQuickstart }: { isQuickstart: boolean }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline">
        <BrainCircuit className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-lg font-semibold text-ink">{isQuickstart ? "載入 Quickstart AI 劇場演練..." : "找不到演練"}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">請回 AI 劇場演練中心重新建立一場演練。</p>
      <Button type="button" variant="mono" className="mt-5 rounded-full" onClick={() => window.location.assign("/theater")}>
        回 AI 劇場演練
      </Button>
    </div>
  );
}

function TheaterSessionLoading() {
  return <div className="p-10 text-center text-sm font-medium text-muted-foreground">載入 AI 劇場演練...</div>;
}
