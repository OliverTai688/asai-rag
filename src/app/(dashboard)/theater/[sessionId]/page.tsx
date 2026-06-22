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
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
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
import type { TheaterRouteBNextTurnAppendCandidate } from "@/domains/theater/route-b-next-turn-append";
import type { TheaterRouteBNextTurnDraft } from "@/domains/theater/route-b-next-turn";
import type { RouteBSessionSnapshot } from "@/domains/theater/route-b-session";
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
  const [routeBSession, setRouteBSession] = useState<RouteBSessionSnapshot | null>(null);
  const [routeBStatus, setRouteBStatus] = useState<"idle" | "loading" | "not_found" | "error">("idle");
  const [routeBError, setRouteBError] = useState<string | null>(null);
  const isQuickstart = searchParams.get("demo") === "quickstart";
  const turns = liveTurns.length ? liveTurns : storedTurns;
  const shouldFetchRouteB = Boolean(sessionId && !isQuickstart && !session);
  const activeRouteBSession = routeBSession?.session.id === sessionId ? routeBSession : null;
  const activeRouteBStatus = shouldFetchRouteB ? routeBStatus : "idle";

  useEffect(() => {
    if (isQuickstart && !session) {
      router.replace(`/theater?clientId=${demoQuickstart.clientId}&autoCreate=true&demo=quickstart`);
    }
  }, [isQuickstart, router, session]);

  useEffect(() => {
    if (!shouldFetchRouteB || !sessionId) return;

    let active = true;

    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setRouteBStatus("loading");
      setRouteBError(null);

      try {
        const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });

        if (!active) return;

        if (response.status === 404) {
          setRouteBStatus("not_found");
          setRouteBSession(null);
          return;
        }

        const payload = (await response.json().catch(() => null)) as RouteBSessionSnapshot | { error?: string; message?: string } | null;

        if (!response.ok || !payload || !("session" in payload)) {
          setRouteBStatus("error");
          setRouteBError(payload && "message" in payload && payload.message ? payload.message : "Route B session read failed.");
          setRouteBSession(null);
          return;
        }

        setRouteBSession(payload);
        setRouteBStatus("idle");
      } catch (caught) {
        if (!active) return;
        setRouteBStatus("error");
        setRouteBError(caught instanceof Error ? caught.message : "Route B session read failed.");
        setRouteBSession(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [sessionId, shouldFetchRouteB]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, isTyping]);

  const spinSession = useMemo(() => {
    if (!session) return undefined;
    return spinSessions.find((item) => item.id === session.spinSessionId);
  }, [session, spinSessions]);

  if (activeRouteBSession) {
    return <RouteBSessionStage snapshot={activeRouteBSession} onSnapshotUpdate={setRouteBSession} />;
  }

  if (!session || !sessionId) {
    if (activeRouteBStatus === "loading") {
      return <TheaterSessionLoading />;
    }
    if (activeRouteBStatus === "error") {
      return <TheaterSessionReadError message={routeBError ?? "Route B session read failed."} />;
    }
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

const ROUTE_B_ROLE_LABEL: Record<string, string> = {
  FOCUS_CLIENT: "焦點客戶",
  DECISION_MAKER: "決策者",
  INFLUENCER: "影響者",
  DEPENDENT: "家屬／依賴者",
  NARRATOR: "旁白",
};

const ROUTE_B_SCOPE_LABEL: Record<string, string> = {
  GROUP: "群聊",
  PRIVATE: "私聊",
  DIRECTOR_ONLY: "導演",
  NARRATOR: "旁白",
};

function RouteBSessionStage({
  onSnapshotUpdate,
  snapshot,
}: {
  onSnapshotUpdate: (snapshot: RouteBSessionSnapshot) => void;
  snapshot: RouteBSessionSnapshot;
}) {
  const focusCharacter = snapshot.characters.find((character) => character.isFocus) ?? snapshot.characters[0];
  const [privateFocusCharacterId, setPrivateFocusCharacterId] = useState<string | null>(null);
  const [composerVisibilityScope, setComposerVisibilityScope] = useState<"GROUP" | "PRIVATE">("GROUP");
  const [composerAddresseeRouteBCharacterId, setComposerAddresseeRouteBCharacterId] = useState("");
  const [composerStatePatchTargetRouteBCharacterId, setComposerStatePatchTargetRouteBCharacterId] = useState("");
  const [nextTurnDraft, setNextTurnDraft] = useState<TheaterRouteBNextTurnDraft | null>(null);
  const [nextTurnStatus, setNextTurnStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [nextTurnError, setNextTurnError] = useState<string | null>(null);
  const [isConfirmingNextTurnAppend, setIsConfirmingNextTurnAppend] = useState(false);
  const relationships = routeBRecords(snapshot.scene.relationships);
  const narratorQuestions = routeBRecords(snapshot.scene.narratorQuestions);
  const visibilityRules = routeBRecords(snapshot.scene.visibilityRules);
  const directorTurns = snapshot.turns.filter((turn) => turn.visibilityScope === "DIRECTOR_ONLY");
  const groupTurns = snapshot.turns.filter((turn) => turn.visibilityScope === "GROUP" || !turn.visibilityScope);
  const provider = snapshot.session.provider;
  const pendingAppendCandidate: TheaterRouteBNextTurnAppendCandidate | null = null;
  const pendingAppendUsageLogId: string | null = null;
  const handlePrivateFocus = (routeBCharacterId: string) => {
    setPrivateFocusCharacterId(routeBCharacterId);
    setComposerVisibilityScope("PRIVATE");
    setComposerAddresseeRouteBCharacterId(routeBCharacterId);
    setComposerStatePatchTargetRouteBCharacterId(routeBCharacterId);
  };

  const fetchNextTurnDraft = async () => {
    setNextTurnStatus("loading");
    setNextTurnError(null);

    try {
      const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/next-turn`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as TheaterRouteBNextTurnDraft | { error?: string; message?: string } | null;

      if (!response.ok || !payload || !("agentId" in payload)) {
        const message = payload && "message" in payload && payload.message ? payload.message : "Route B next-turn preview failed.";
        throw new Error(message);
      }

      setNextTurnDraft(payload);
      setNextTurnStatus("ready");
    } catch (error) {
      setNextTurnDraft(null);
      setNextTurnStatus("error");
      setNextTurnError(error instanceof Error ? error.message : "Route B next-turn preview failed.");
    }
  };

  const handleConfirmNextTurnAppend = async (
    candidate: TheaterRouteBNextTurnAppendCandidate,
    usageLogId: string,
  ) => {
    if (isConfirmingNextTurnAppend) return;

    setIsConfirmingNextTurnAppend(true);

    try {
      const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/append-candidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usageLogId,
          confirmedByAdvisor: true,
          confirmationReason: "Advisor confirmed Route B next-turn provider candidate from the stage UI.",
          candidate,
        }),
      });
      const payload = (await response.json().catch(() => null)) as RouteBSessionSnapshot | { error?: string; message?: string } | null;

      if (!response.ok || !payload || !("session" in payload)) {
        const message = payload && "message" in payload && payload.message ? payload.message : "Route B next-turn append failed.";
        throw new Error(message);
      }

      onSnapshotUpdate(payload);
      setNextTurnDraft(null);
      toast.success("已確認並寫入 Route B 角色回合");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Route B next-turn append failed.");
    } finally {
      setIsConfirmingNextTurnAppend(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
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
              Route B Theater Stage
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink">
                {focusCharacter ? `${focusCharacter.displayName} 的多角色劇場` : "多角色劇場舞台"}
              </h1>
              <Badge variant="outline" className="rounded-full">Route B</Badge>
              <Badge variant="outline" className="rounded-full">guarded-disabled</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {snapshot.characters.length} 位角色・{relationships.length} 條關係・{snapshot.scene.statePatchCount} 個狀態更新
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
          <RouteBMetric label="角色" value={snapshot.characters.length} />
          <RouteBMetric label="旁白補問" value={narratorQuestions.length} />
          <RouteBMetric label="私聊外洩" value={snapshot.visibilityProof.thirdPartyVisibleForDirectMessage ? "需查" : "0"} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="grid min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="xl:col-span-2">
            <RouteBRelationshipStageMap
              snapshot={snapshot}
              relationships={relationships}
              privateFocusCharacterId={privateFocusCharacterId}
              onPrivateFocus={handlePrivateFocus}
            />
          </section>

          <section className="rounded-lg border border-hairline bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Characters</p>
                <h2 className="mt-1 text-base font-semibold text-ink">舞台角色</h2>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-3">
              {snapshot.characters.map((character) => (
                <RouteBCharacterCard key={character.id} character={character} />
              ))}
            </div>
          </section>

          <section className="flex min-h-[640px] flex-col overflow-hidden rounded-lg border border-hairline bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Stage Runtime</p>
                <h2 className="mt-1 text-base font-semibold text-ink">群聊／私聊舞台</h2>
              </div>
              <Badge variant="outline" className="rounded-full">
                {snapshot.session.status}
              </Badge>
            </div>

            <div className="grid flex-1 gap-0 md:grid-cols-2">
              <div className="flex min-h-0 flex-col border-b border-hairline md:border-b-0 md:border-r">
                <RouteBLaneHeader icon={<MessageSquare className="h-4 w-4" />} title="群聊" subtitle="所有角色可見" />
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {groupTurns.length ? (
                    groupTurns.map((turn) => <RouteBTurnBubble key={turn.id} snapshot={snapshot} turn={turn} />)
                  ) : (
                    <RouteBEmptyLane title="群聊尚未開場" body="已建立舞台與角色，provider proof 完成後才會允許角色回覆。" />
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col">
                <RouteBLaneHeader icon={<ShieldCheck className="h-4 w-4" />} title="私聊" subtitle="只對指定角色可見" />
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {snapshot.characters.map((character) => {
                    const privateTurns = snapshot.turns.filter(
                      (turn) =>
                        turn.visibilityScope === "PRIVATE" &&
                        turn.addresseeRouteBCharacterId === character.routeBCharacterId,
                    );

                    return (
                    <div key={character.id} className="rounded-lg border border-hairline bg-paper px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{character.displayName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ROUTE_B_ROLE_LABEL[character.role] ?? character.role}
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full">
                          私聊
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {firstRouteBText(character.personaHints) ?? firstRouteBText(character.unknowns) ?? "尚無私聊提示。"}
                      </p>
                      {privateTurns.length ? (
                        <div className="mt-3 space-y-2">
                          {privateTurns.map((turn) => (
                            <RouteBTurnBubble key={turn.id} snapshot={snapshot} turn={turn} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-hairline bg-paper p-3">
              <RouteBAdvisorComposer
                snapshot={snapshot}
                onSnapshotUpdate={onSnapshotUpdate}
                onAdvisorTurnCommitted={fetchNextTurnDraft}
                visibilityScope={composerVisibilityScope}
                onVisibilityScopeChange={setComposerVisibilityScope}
                addresseeRouteBCharacterId={composerAddresseeRouteBCharacterId}
                onAddresseeRouteBCharacterIdChange={setComposerAddresseeRouteBCharacterId}
                statePatchTargetRouteBCharacterId={composerStatePatchTargetRouteBCharacterId}
                onStatePatchTargetRouteBCharacterIdChange={setComposerStatePatchTargetRouteBCharacterId}
              />
              <RouteBNextTurnPreviewPanel
                appendCandidate={pendingAppendCandidate}
                appendUsageLogId={pendingAppendUsageLogId}
                draft={nextTurnDraft}
                error={nextTurnError}
                isAppending={isConfirmingNextTurnAppend}
                onConfirmAppend={handleConfirmNextTurnAppend}
                onRefresh={fetchNextTurnDraft}
                snapshot={snapshot}
                status={nextTurnStatus}
              />
              <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="rounded-lg border border-hairline bg-background px-3 py-3 text-sm text-muted-foreground">
                  Provider 目前關閉；互動只寫入顧問 turn 與待確認狀態，不產生角色訊息、不寫假 `AiUsageLog`。
                </div>
                <Button type="button" variant="mono" className="rounded-full" disabled>
                  <Sparkles className="h-4 w-4" />
                  待 provider proof
                </Button>
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-3">
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <h2 className="text-sm font-semibold text-ink">Provider guard</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    callsEnabled={String(provider.callsEnabled)}・callAttempted={String(provider.callAttempted)}・usageLogWritten={String(provider.usageLogWritten)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {provider.usageLogRequiredFor.map((kind) => (
                      <Badge key={kind} variant="outline" className="rounded-full">
                        {kind}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <RouteBDetails title={`導演開場・${directorTurns.length}`} items={directorTurns.map((turn) => turn.content)} />
          <RouteBDetails title={`關係脈絡・${relationships.length}`} items={relationships.map(routeBRecordText)} />
          <RouteBDetails title={`旁白補問・${narratorQuestions.length}`} items={narratorQuestions.map(routeBRecordText)} />
          <RouteBDetails title={`可見性規則・${visibilityRules.length}`} items={visibilityRules.map(routeBVisibilityText)} />

          <Card className="border-hairline shadow-none">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-ink">範圍證明</h2>
              <ContextLine label="Owner read" value={snapshot.visibilityProof.ownerOnlyRead ? "true" : "false"} />
              <ContextLine label="Scoped turn columns" value={snapshot.visibilityProof.scopedTurnColumnsPersisted ? "true" : "false"} />
              <ContextLine label="Raw provider payload" value={provider.storesProviderBody ? "需查" : "false"} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function RouteBRelationshipStageMap({
  onPrivateFocus,
  privateFocusCharacterId,
  relationships,
  snapshot,
}: {
  onPrivateFocus: (characterId: string) => void;
  privateFocusCharacterId: string | null;
  relationships: Array<Record<string, unknown>>;
  snapshot: RouteBSessionSnapshot;
}) {
  const latestTurn = latestRouteBTurn(snapshot.turns);
  const focusCharacterId =
    privateFocusCharacterId ??
    latestTurn?.speakerRouteBCharacterId ??
    latestTurn?.addresseeRouteBCharacterId ??
    snapshot.characters.find((character) => character.isFocus)?.routeBCharacterId ??
    null;
  const provider = snapshot.session.provider;

  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="p-0">
        <div className="border-b border-hairline p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Relationship Stage Map
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                客戶關係舞台
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                從交接包的關係圖、未知項與狀態 proposal 建立演練環境；點選人物即可把發話範圍切到私聊，不寫回 CRM 既成事實。
              </p>
            </div>

            <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2 xl:min-w-[440px]">
              <span className="rounded-md border border-hairline bg-paper px-2.5 py-2 text-center">
                providerCallAttempted={String(provider.callAttempted)}
              </span>
              <span className="rounded-md border border-hairline bg-paper px-2.5 py-2 text-center">
                usageLogWritten={String(provider.usageLogWritten)}
              </span>
              <span className="rounded-md border border-hairline bg-paper px-2.5 py-2 text-center">
                requiresConfirmation=true
              </span>
              <span className="rounded-md border border-hairline bg-paper px-2.5 py-2 text-center">
                writesConfirmedCrmFact=false
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {snapshot.characters.map((character) => {
              const knownFacts = routeBRecords(character.knownFacts);
              const unknowns = routeBRecords(character.unknowns);
              const personaHints = routeBRecords(character.personaHints);
              const isLatestSpeaker =
                latestTurn?.speakerRouteBCharacterId === character.routeBCharacterId;
              const isLatestAddressee =
                latestTurn?.addresseeRouteBCharacterId === character.routeBCharacterId;
              const isFocused = focusCharacterId === character.routeBCharacterId;

              return (
                <button
                  key={character.id}
                  type="button"
                  className={cn(
                    "group min-h-[190px] rounded-lg border border-hairline bg-paper p-4 text-left transition hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isFocused && "border-ink bg-background",
                  )}
                  aria-label={`與 ${character.displayName} 私聊`}
                  onClick={() => onPrivateFocus(character.routeBCharacterId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-ink">
                        {character.displayName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ROUTE_B_ROLE_LABEL[character.role] ?? character.role}
                      </p>
                    </div>
                    <Badge
                      variant={character.isFocus ? "default" : "outline"}
                      className="shrink-0 rounded-full"
                    >
                      {character.isFocus ? "Focus" : "NPC"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <RouteBMiniCount label="已知" value={knownFacts.length} />
                    <RouteBMiniCount label="推論" value={personaHints.length} />
                    <RouteBMiniCount label="未知" value={unknowns.length} />
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>狀態 proposal</span>
                      <span className="font-mono text-ink">
                        {character.statePatchCount}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {isLatestSpeaker ? (
                        <span className="rounded-full bg-ink px-2 py-1 text-[10px] text-paper">
                          latest speaker
                        </span>
                      ) : null}
                      {isLatestAddressee ? (
                        <span className="rounded-full border border-hairline bg-background px-2 py-1 text-[10px] text-ink">
                          private addressee
                        </span>
                      ) : null}
                      <span className="rounded-full border border-hairline bg-background px-2 py-1 text-[10px] text-ink">
                        私聊焦點
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="space-y-3 rounded-lg border border-hairline bg-paper p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Relationship Evidence
              </p>
              <h3 className="mt-1 text-base font-semibold text-ink">關係證據</h3>
            </div>

            <div className="space-y-3">
              {relationships.length ? (
                relationships.map((relationship, index) => (
                  <div
                    key={`route-b-stage-relationship-${index}`}
                    className="rounded-lg border border-hairline bg-background p-3"
                  >
                    <p className="text-sm font-medium leading-6 text-ink">
                      {routeBRecordText(relationship)}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <span>
                        status{" "}
                        <strong className="font-mono text-ink">
                          {routeBRecordField(relationship, "factStatus", "UNKNOWN")}
                        </strong>
                      </span>
                      <span>
                        scope{" "}
                        <strong className="font-mono text-ink">
                          {routeBRecordField(relationship, "visibilityScope", "SCENE")}
                        </strong>
                      </span>
                      <span>
                        sources{" "}
                        <strong className="font-mono text-ink">
                          {routeBSourceCount(relationship)}
                        </strong>
                      </span>
                      <span>
                        mode <strong className="font-mono text-ink">stage</strong>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-hairline bg-background p-3 text-sm leading-6 text-muted-foreground">
                  目前交接包沒有可渲染的關係證據；劇場仍保留未知與旁白補問欄位。
                </p>
              )}
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function RouteBAdvisorComposer({
  addresseeRouteBCharacterId,
  onAddresseeRouteBCharacterIdChange,
  onAdvisorTurnCommitted,
  onSnapshotUpdate,
  onStatePatchTargetRouteBCharacterIdChange,
  onVisibilityScopeChange,
  snapshot,
  statePatchTargetRouteBCharacterId,
  visibilityScope,
}: {
  addresseeRouteBCharacterId: string;
  onAddresseeRouteBCharacterIdChange: (value: string) => void;
  onAdvisorTurnCommitted?: () => void;
  onSnapshotUpdate: (snapshot: RouteBSessionSnapshot) => void;
  onStatePatchTargetRouteBCharacterIdChange: (value: string) => void;
  onVisibilityScopeChange: (value: "GROUP" | "PRIVATE") => void;
  snapshot: RouteBSessionSnapshot;
  statePatchTargetRouteBCharacterId: string;
  visibilityScope: "GROUP" | "PRIVATE";
}) {
  const defaultCharacterId = snapshot.characters[0]?.routeBCharacterId ?? "";
  const [content, setContent] = useState("");
  const [statePatchSummary, setStatePatchSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedAddresseeId = addresseeRouteBCharacterId || defaultCharacterId;
  const selectedStatePatchTargetId = statePatchTargetRouteBCharacterId || selectedAddresseeId || defaultCharacterId;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    const trimmedStatePatchSummary = statePatchSummary.trim();

    if (!trimmedContent || !defaultCharacterId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmedContent,
          visibilityScope,
          addresseeRouteBCharacterId: visibilityScope === "PRIVATE" ? selectedAddresseeId : undefined,
          statePatch: trimmedStatePatchSummary
            ? {
                targetRouteBCharacterId: selectedStatePatchTargetId,
                summary: trimmedStatePatchSummary,
              }
            : undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as RouteBSessionSnapshot | { error?: string; message?: string } | null;

      if (!response.ok || !payload || !("session" in payload)) {
        const message = payload && "message" in payload && payload.message ? payload.message : "Route B interaction write failed.";
        throw new Error(message);
      }

      onSnapshotUpdate(payload);
      onAdvisorTurnCommitted?.();
      setContent("");
      setStatePatchSummary("");
      toast.success("已寫入 Route B 舞台");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Route B interaction write failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto grid max-w-3xl gap-3">
      <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          發話範圍
          <select
            value={visibilityScope}
            onChange={(event) => onVisibilityScopeChange(event.target.value === "PRIVATE" ? "PRIVATE" : "GROUP")}
            className="h-10 rounded-lg border border-hairline bg-background px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="選擇 Route B 發話範圍"
          >
            <option value="GROUP">群聊</option>
            <option value="PRIVATE">私聊</option>
          </select>
        </label>

        {visibilityScope === "PRIVATE" ? (
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            私聊對象
            <select
              value={selectedAddresseeId}
              onChange={(event) => {
                onAddresseeRouteBCharacterIdChange(event.target.value);
                onStatePatchTargetRouteBCharacterIdChange(event.target.value);
              }}
              className="h-10 rounded-lg border border-hairline bg-background px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="選擇 Route B 私聊對象"
            >
              {snapshot.characters.map((character) => (
                <option key={character.id} value={character.routeBCharacterId}>
                  {character.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="hidden sm:block" />
        )}

        <Button
          type="submit"
          variant="mono"
          className="h-10 rounded-full"
          disabled={!content.trim() || !defaultCharacterId || isSubmitting}
          aria-label="寫入 Route B 顧問互動"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          寫入舞台
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="輸入顧問要放進群聊或私聊的訊息"
        className="min-h-20 resize-y rounded-lg border-hairline bg-background text-sm leading-6 focus-visible:ring-ring"
        disabled={isSubmitting}
        aria-label="Route B 顧問訊息"
      />

      <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          狀態對象
          <select
            value={selectedStatePatchTargetId}
            onChange={(event) => onStatePatchTargetRouteBCharacterIdChange(event.target.value)}
            className="h-10 rounded-lg border border-hairline bg-background px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="選擇 Route B 狀態更新對象"
          >
            {snapshot.characters.map((character) => (
              <option key={character.id} value={character.routeBCharacterId}>
                {character.displayName}
              </option>
            ))}
          </select>
        </label>
        <Textarea
          value={statePatchSummary}
          onChange={(event) => setStatePatchSummary(event.target.value)}
          placeholder="新增待確認狀態筆記；留空則只寫入對話"
          className="min-h-10 resize-y rounded-lg border-hairline bg-background text-sm leading-6 focus-visible:ring-ring"
          disabled={isSubmitting}
          aria-label="Route B 待確認狀態筆記"
        />
      </div>
    </form>
  );
}

function RouteBNextTurnPreviewPanel({
  appendCandidate,
  appendUsageLogId,
  draft,
  error,
  isAppending,
  onConfirmAppend,
  onRefresh,
  snapshot,
  status,
}: {
  appendCandidate: TheaterRouteBNextTurnAppendCandidate | null;
  appendUsageLogId: string | null;
  draft: TheaterRouteBNextTurnDraft | null;
  error: string | null;
  isAppending: boolean;
  onConfirmAppend: (candidate: TheaterRouteBNextTurnAppendCandidate, usageLogId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  snapshot: RouteBSessionSnapshot;
  status: "idle" | "loading" | "ready" | "error";
}) {
  const isLoading = status === "loading";
  const speakerName =
    draft?.nextTurn.displayName ??
    routeBCharacterDisplayName(snapshot, draft?.nextTurn.speakerRouteBCharacterId) ??
    (draft?.nextTurn.role === "NARRATOR" ? "旁白" : "未選定");
  const addresseeName = routeBCharacterDisplayName(snapshot, draft?.nextTurn.addresseeRouteBCharacterId);
  const guardLines = draft ? nextTurnGuardLines(snapshot, draft) : [];
  const canConfirmAppend = Boolean(appendCandidate && appendUsageLogId && draft?.status === "READY");

  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-hairline bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Next-turn preview
          </p>
          <h3 className="text-base font-semibold text-ink">下一回合預覽</h3>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            只讀取 no-provider draft：顯示誰該回應、可見範圍與 guard evidence；角色台詞與自動 append 仍等 provider success/error `AiUsageLog` proof。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          aria-label="讀取 Route B 下一回合預覽"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isLoading ? "讀取中" : "讀取預覽"}
        </Button>
      </div>

      {status === "error" ? (
        <p className="mt-3 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm leading-6 text-muted-foreground">
          {error ?? "Route B next-turn preview failed."}
        </p>
      ) : null}

      {draft ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-lg border border-hairline bg-paper p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={draft.status === "READY" ? "default" : "outline"} className="rounded-full">
                {nextTurnStatusLabel(draft.status)}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {draft.nextTurn.visibilityScope ? ROUTE_B_SCOPE_LABEL[draft.nextTurn.visibilityScope] : "旁白"}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                generatedTextAllowed={String(draft.nextTurn.generatedTextAllowed)}
              </Badge>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <ContextLine label="下一位" value={speakerName} />
              <ContextLine label="對象" value={addresseeName ?? "群聊／未指定"} />
              <ContextLine label="State proposals" value={String(draft.persistenceEnvelope.statePatchCount)} />
              <ContextLine label="Writes CRM fact" value={String(draft.persistenceEnvelope.writesConfirmedCrmFact)} />
            </div>

            <p className="mt-3 rounded-md border border-hairline bg-background px-3 py-2 text-sm leading-6 text-muted-foreground">
              {draft.nextTurn.contentPreview}
            </p>

            <div className="mt-3 space-y-2">
              {guardLines.map((line) => (
                <p key={line} className="rounded-md border border-hairline bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {line}
                </p>
              ))}
              {draft.nextTurn.rationale.map((line) => (
                <p key={line} className="rounded-md border border-hairline bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                  rationale: {line}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-paper p-3">
            <h4 className="text-sm font-semibold text-ink">Provider boundary</h4>
            <div className="mt-3 space-y-2">
              <ContextLine label="Call attempted" value={String(draft.providerBoundary.providerCallAttempted)} />
              <ContextLine label="AiUsageLog" value={String(draft.providerBoundary.aiUsageLogWritten)} />
              <ContextLine label="Raw provider" value={String(draft.providerBoundary.storesRawProviderPayload)} />
              <ContextLine label="Private dialog" value={String(draft.privacyProof.directPrivateDialogReturned)} />
            </div>
            <Button type="button" variant="mono" className="mt-4 w-full rounded-full" disabled aria-disabled="true">
              <Sparkles className="h-4 w-4" />
              等待 provider candidate
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full rounded-full"
              disabled={!canConfirmAppend || isAppending}
              aria-disabled={!canConfirmAppend || isAppending}
              onClick={() => {
                if (!appendCandidate || !appendUsageLogId) return;
                void onConfirmAppend(appendCandidate, appendUsageLogId);
              }}
            >
              {isAppending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              確認並寫入回合
            </Button>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Provider candidate 必須已寫入 success `AiUsageLog` 並附 usageLogId；append 本身不呼叫 provider、不儲存 raw provider payload、不寫 CRM confirmed fact。
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-hairline bg-paper px-3 py-3 text-sm leading-6 text-muted-foreground">
          尚未讀取下一回合。顧問寫入群聊或私聊後會自動嘗試讀取，也可以手動按「讀取預覽」。
        </p>
      )}
    </div>
  );
}

function RouteBMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-hairline bg-background px-3 py-2">
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function RouteBCharacterCard({ character }: { character: RouteBSessionSnapshot["characters"][number] }) {
  const knownFacts = routeBRecords(character.knownFacts);
  const unknowns = routeBRecords(character.unknowns);
  const personaHints = routeBRecords(character.personaHints);

  return (
    <div className="rounded-lg border border-hairline bg-paper p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{character.displayName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ROUTE_B_ROLE_LABEL[character.role] ?? character.role}</p>
        </div>
        {character.isFocus ? <Badge className="rounded-full">焦點</Badge> : <Badge variant="outline" className="rounded-full">NPC</Badge>}
      </div>
      <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{character.publicBrief}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <RouteBMiniCount label="事實" value={knownFacts.length} />
        <RouteBMiniCount label="推論" value={personaHints.length} />
        <RouteBMiniCount label="未知" value={unknowns.length} />
      </div>
      {character.statePatchCount ? (
        <p className="mt-2 text-xs font-medium text-muted-foreground">狀態更新 {character.statePatchCount}</p>
      ) : null}
    </div>
  );
}

function RouteBMiniCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-hairline bg-background px-2 py-1.5">
      <p className="text-sm font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function RouteBLaneHeader({ icon, subtitle, title }: { icon: React.ReactNode; subtitle: string; title: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {icon}
          {title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function RouteBTurnBubble({ snapshot, turn }: { snapshot: RouteBSessionSnapshot; turn: RouteBSessionSnapshot["turns"][number] }) {
  const speaker =
    snapshot.characters.find((character) => character.routeBCharacterId === turn.speakerRouteBCharacterId)?.displayName ??
    (turn.role === "ADVISOR" || turn.role === "AGENT"
      ? "顧問"
      : turn.role === "DIRECTOR" || turn.role === "SYSTEM"
        ? "導演"
        : turn.role === "NARRATOR"
          ? "旁白"
          : turn.role);

  return (
    <div className="rounded-lg border border-hairline bg-paper px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{speaker}</p>
        <Badge variant="outline" className="rounded-full">
          {turn.visibilityScope ? ROUTE_B_SCOPE_LABEL[turn.visibilityScope] ?? turn.visibilityScope : "群聊"}
        </Badge>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{turn.content}</p>
    </div>
  );
}

function RouteBEmptyLane({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-muted/20 p-5 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function RouteBDetails({ items, title }: { items: string[]; title: string }) {
  return (
    <details className="group rounded-lg border border-hairline bg-card" open={items.length <= 1}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-hairline p-3">
        {items.length ? (
          items.map((item, index) => (
            <p key={`${title}-${index}`} className="text-sm leading-6 text-muted-foreground">
              {item}
            </p>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">目前沒有資料。</p>
        )}
      </div>
    </details>
  );
}

function routeBRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRouteBRecord) : [];
}

function isRouteBRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function routeBRecordText(record: Record<string, unknown>): string {
  for (const key of ["summary", "text", "label", "content"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "未命名項目";
}

function routeBRecordField(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function routeBSourceCount(record: Record<string, unknown>): string {
  const sourceRefs = record.sourceRefs;
  return Array.isArray(sourceRefs) ? String(sourceRefs.length) : "0";
}

function latestRouteBTurn(turns: RouteBSessionSnapshot["turns"]) {
  return [...turns]
    .reverse()
    .find(
      (turn) =>
        turn.role !== "DIRECTOR" &&
        (turn.speakerRouteBCharacterId || turn.addresseeRouteBCharacterId),
    );
}

function routeBVisibilityText(record: Record<string, unknown>): string {
  const label = typeof record.label === "string" ? record.label : routeBRecordText(record);
  const visibleTo = typeof record.visibleTo === "string" ? record.visibleTo : "UNKNOWN";
  const canQuote = record.canBeQuotedInGroup === true ? "可引用" : "不可引用";
  return `${label}・${visibleTo}・${canQuote}`;
}

function firstRouteBText(value: unknown): string | undefined {
  return routeBRecords(value).map(routeBRecordText).find(Boolean);
}

function routeBCharacterDisplayName(snapshot: RouteBSessionSnapshot, routeBCharacterId?: string): string | undefined {
  if (!routeBCharacterId) return undefined;
  return snapshot.characters.find((character) => character.routeBCharacterId === routeBCharacterId)?.displayName;
}

function nextTurnStatusLabel(status: TheaterRouteBNextTurnDraft["status"]): string {
  if (status === "READY") return "可預覽";
  if (status === "NO_CHARACTER") return "缺角色";
  return "待顧問發話";
}

function nextTurnGuardLines(snapshot: RouteBSessionSnapshot, draft: TheaterRouteBNextTurnDraft): string[] {
  const guard = draft.nextTurn.guardEvidence;
  if (!guard) return [];

  const lines: string[] = [];
  if (guard.namedAddresseeMustAnswer) {
    lines.push(`被點名角色必答：${guard.namedAddresseeFound ? "找到指定對象" : "未找到指定對象"}`);
  }
  if (guard.consecutiveSpeakerBlockedCharacterIds.length) {
    const names = guard.consecutiveSpeakerBlockedCharacterIds
      .map((id) => routeBCharacterDisplayName(snapshot, id) ?? id)
      .join("、");
    lines.push(`防連續搶話：本回合避開 ${names}`);
  }
  if (guard.consecutiveSpeakerOverrideForNamedAddressee) {
    lines.push("被點名對象覆蓋連續發言限制，但仍只產生 provider-disabled preview。");
  }
  lines.push(`私聊歷史範圍：${guard.privateHistoryScopedToAddressee ? "只含指定對象可見內容" : "需要檢查"}`);

  return lines;
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

function TheaterSessionReadError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline">
        <CircleAlert className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-lg font-semibold text-ink">Route B 舞台暫時無法讀取</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
      <Button type="button" variant="mono" className="mt-5 rounded-full" onClick={() => window.location.assign("/theater")}>
        回 AI 劇場演練
      </Button>
    </div>
  );
}

function TheaterSessionLoading() {
  return <div className="p-10 text-center text-sm font-medium text-muted-foreground">載入 AI 劇場演練...</div>;
}
