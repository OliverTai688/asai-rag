"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BrainCircuit,
  ChevronDown,
  CircleAlert,
  Eye,
  Gamepad2,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { Badge } from "@/components/ui/badge";
import { RouteBStageGraph } from "@/components/theater/route-b-stage-graph";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { clientService } from "@/domains/client/service";
import {
  demoQuickstart,
  getQuickstartStep,
  getQuickstartTheaterFixture,
} from "@/domains/demo/quickstart";
import { theaterTourSteps } from "@/domains/demo/tour-steps";
import { useSpinStore } from "@/domains/spin/store";
import type { RouteBComplianceReviewIntake } from "@/domains/theater/route-b-compliance-review-intake";
import type { TheaterRouteBFeedbackReview } from "@/domains/theater/route-b-feedback-review";
import { buildRouteBMeetingSignalSourceRenderModel } from "@/domains/theater/route-b-meeting-signal-source-render";
import type { TheaterRouteBNextTurnAppendCandidate } from "@/domains/theater/route-b-next-turn-append";
import type { TheaterRouteBNextTurnDraft } from "@/domains/theater/route-b-next-turn";
import type { TheaterRouteBNextTurnProviderRunResult } from "@/domains/theater/route-b-next-turn-provider";
import {
  buildRouteBRedLineActionRecordsFromStateMap,
  buildRouteBSevereRedLineActionWorkflow,
  type RouteBRedLineActionPersistenceState,
  type RouteBRedLineActionState,
  type RouteBSevereRedLineActionWorkflow,
} from "@/domains/theater/route-b-red-line-action-workflow";
import {
  buildRouteBSevereRedLineWarningPreview,
  type RouteBSevereRedLineWarningPreview,
} from "@/domains/theater/route-b-severe-red-line-preview";
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

type RouteBFeedbackReviewStatus = "idle" | "loading" | "ready" | "empty" | "error" | "generating";
type RouteBComplianceReviewIntakeStatus = "idle" | "loading" | "ready" | "empty" | "error";
type RouteBProviderCandidateStatus = "idle" | "generating" | "ready" | "error";
type RouteBStageMode = "CONVERSE" | "OBSERVE" | "COMMENT";
type RouteBSourceEvidenceMode = "meeting" | "family" | "edge";
type RouteBReviewMode = "feedback" | "compliance";
type RouteBFeedbackBrowserMode = "overview" | "perspectives" | "redLines";
type RouteBComplianceBrowserMode = "overview" | "candidate" | "boundary";
type RouteBContextMode = "guard" | "director" | "relationships" | "narrator" | "visibility";
type RouteBNextTurnBrowserMode = "preview" | "sources" | "provider" | "guard";
type RouteBMeetingSignalGrounding = NonNullable<
  NonNullable<RouteBSessionSnapshot["scene"]["sourceGrounding"]>["meetingRelationshipSignals"]
>;
type RouteBRelationshipEdgeShadowGrounding = NonNullable<
  NonNullable<RouteBSessionSnapshot["scene"]["sourceGrounding"]>["relationshipEdgeShadow"]
>;
type RouteBFamilyProfileGrounding = NonNullable<
  NonNullable<RouteBSessionSnapshot["scene"]["sourceGrounding"]>["familyProfiles"]
>;
type RouteBMeetingSignalRuntimeGrounding =
  TheaterRouteBNextTurnDraft["inputSummary"]["meetingRelationshipSignalGrounding"];
type RouteBRelationshipEdgeShadowRuntimeGrounding =
  TheaterRouteBNextTurnDraft["inputSummary"]["relationshipEdgeShadowGrounding"];
type RouteBFamilyProfileRuntimeGrounding =
  TheaterRouteBNextTurnDraft["inputSummary"]["familyProfileGrounding"];
type RouteBRedLineActionPersistenceStatus = "idle" | "loading" | "saving" | "ready" | "error";

type RouteBFeedbackReviewEmptyPayload = {
  status: "EMPTY";
  providerCallAttempted: false;
  aiUsageLogWritten: false;
  writesConfirmedCrmFact: false;
};

type RouteBComplianceReviewIntakeEmptyPayload = {
  status: "EMPTY";
  actionId: "route-b-red-line-compliance-review-intake";
  providerCallAttempted: false;
  aiUsageLogWritten: false;
  writesConfirmedCrmFact: false;
  triggersExternalNotification: false;
  noFormalFinding: true;
};

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readTheaterSessionIdFromPath(pathname: string) {
  const match = pathname.match(/\/theater\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = normalizeParam(params.sessionId) ?? readTheaterSessionIdFromPath(pathname);
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

const ROUTE_B_COMMENT_PREFIX = "【情境注記】";
const ROUTE_B_SEVERE_RED_LINE_WARNING_PREVIEW = buildRouteBSevereRedLineWarningPreview();
const ROUTE_B_SEVERE_RED_LINE_ACTION_WORKFLOW = buildRouteBSevereRedLineActionWorkflow(
  ROUTE_B_SEVERE_RED_LINE_WARNING_PREVIEW,
);

function RouteBSessionStage({
  onSnapshotUpdate,
  snapshot,
}: {
  onSnapshotUpdate: (snapshot: RouteBSessionSnapshot) => void;
  snapshot: RouteBSessionSnapshot;
}) {
  const focusCharacter = snapshot.characters.find((character) => character.isFocus) ?? snapshot.characters[0];
  const latestTurn = latestRouteBTurn(snapshot.turns);
  const [stageMode, setStageMode] = useState<RouteBStageMode>("CONVERSE");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [privateFocusCharacterId, setPrivateFocusCharacterId] = useState<string | null>(null);
  const [composerVisibilityScope, setComposerVisibilityScope] = useState<"GROUP" | "PRIVATE">("GROUP");
  const [composerAddresseeRouteBCharacterId, setComposerAddresseeRouteBCharacterId] = useState("");
  const [composerStatePatchTargetRouteBCharacterId, setComposerStatePatchTargetRouteBCharacterId] = useState("");
  const [nextTurnDraft, setNextTurnDraft] = useState<TheaterRouteBNextTurnDraft | null>(null);
  const [nextTurnStatus, setNextTurnStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [nextTurnError, setNextTurnError] = useState<string | null>(null);
  const [pendingAppendCandidate, setPendingAppendCandidate] = useState<TheaterRouteBNextTurnAppendCandidate | null>(null);
  const [pendingAppendUsageLogId, setPendingAppendUsageLogId] = useState<string | null>(null);
  const [providerCandidateStatus, setProviderCandidateStatus] = useState<RouteBProviderCandidateStatus>("idle");
  const [providerCandidateError, setProviderCandidateError] = useState<string | null>(null);
  const [isConfirmingNextTurnAppend, setIsConfirmingNextTurnAppend] = useState(false);
  const [feedbackReview, setFeedbackReview] = useState<TheaterRouteBFeedbackReview | null>(null);
  const [feedbackReviewStatus, setFeedbackReviewStatus] = useState<RouteBFeedbackReviewStatus>("idle");
  const [feedbackReviewError, setFeedbackReviewError] = useState<string | null>(null);
  const [complianceReviewIntake, setComplianceReviewIntake] = useState<RouteBComplianceReviewIntake | null>(null);
  const [complianceReviewIntakeStatus, setComplianceReviewIntakeStatus] = useState<RouteBComplianceReviewIntakeStatus>("idle");
  const [complianceReviewIntakeError, setComplianceReviewIntakeError] = useState<string | null>(null);
  const severeRedLineWarningPreview = ROUTE_B_SEVERE_RED_LINE_WARNING_PREVIEW;
  const severeRedLineActionWorkflow = ROUTE_B_SEVERE_RED_LINE_ACTION_WORKFLOW;
  const [redLineActionStates, setRedLineActionStates] = useState<Record<string, RouteBRedLineActionState>>(() =>
    Object.fromEntries(severeRedLineActionWorkflow.cards.map((card) => [card.ruleId, card.defaultState])),
  );
  const [redLineActionPersistence, setRedLineActionPersistence] = useState<RouteBRedLineActionPersistenceState | null>(null);
  const [redLineActionPersistenceStatus, setRedLineActionPersistenceStatus] = useState<RouteBRedLineActionPersistenceStatus>("idle");
  const [redLineActionPersistenceError, setRedLineActionPersistenceError] = useState<string | null>(null);
  const relationships = routeBRecords(snapshot.scene.relationships);
  const narratorQuestions = routeBRecords(snapshot.scene.narratorQuestions);
  const visibilityRules = routeBRecords(snapshot.scene.visibilityRules);
  const meetingSignalGrounding = snapshot.scene.sourceGrounding?.meetingRelationshipSignals ?? null;
  const relationshipEdgeShadowGrounding = snapshot.scene.sourceGrounding?.relationshipEdgeShadow ?? null;
  const familyProfileGrounding = snapshot.scene.sourceGrounding?.familyProfiles ?? null;
  const directorTurns = snapshot.turns.filter((turn) => turn.visibilityScope === "DIRECTOR_ONLY");
  const groupTurns = snapshot.turns.filter((turn) => turn.visibilityScope === "GROUP" || !turn.visibilityScope);
  const provider = snapshot.session.provider;
  const handlePrivateFocus = (routeBCharacterId: string) => {
    setPrivateFocusCharacterId(routeBCharacterId);
    setComposerVisibilityScope("PRIVATE");
    setComposerAddresseeRouteBCharacterId(routeBCharacterId);
    setComposerStatePatchTargetRouteBCharacterId(routeBCharacterId);
  };

  const fetchNextTurnDraft = async () => {
    setNextTurnStatus("loading");
    setNextTurnError(null);
    setPendingAppendCandidate(null);
    setPendingAppendUsageLogId(null);
    setProviderCandidateStatus("idle");
    setProviderCandidateError(null);

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

  const generateNextTurnProviderCandidate = async () => {
    if (providerCandidateStatus === "generating") return;

    setProviderCandidateStatus("generating");
    setProviderCandidateError(null);
    setPendingAppendCandidate(null);
    setPendingAppendUsageLogId(null);

    try {
      const response = await fetch(
        `/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/next-turn/provider-candidate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            candidate?: TheaterRouteBNextTurnAppendCandidate;
            usageLogId?: string;
            result?: TheaterRouteBNextTurnProviderRunResult;
            error?: string;
          }
        | null;

      if (!response.ok || !payload || !payload.candidate || !payload.usageLogId || payload.result?.status !== "SUCCESS") {
        throw new Error(payload?.error ?? "Route B provider candidate generation failed.");
      }

      if (!isSafeRouteBProviderCandidate(payload.candidate)) {
        throw new Error("Route B provider candidate is missing required safety flags.");
      }

      setPendingAppendCandidate(payload.candidate);
      setPendingAppendUsageLogId(payload.usageLogId);
      setProviderCandidateStatus("ready");
      toast.success("已產生候選角色回覆，請確認後寫入舞台");
    } catch (error) {
      setProviderCandidateStatus("error");
      setProviderCandidateError(error instanceof Error ? error.message : "Route B provider candidate generation failed.");
      toast.error(error instanceof Error ? error.message : "Route B provider candidate generation failed.");
    }
  };

  const fetchFeedbackReview = async () => {
    setFeedbackReviewStatus("loading");
    setFeedbackReviewError(null);

    try {
      const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/feedback-review`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | TheaterRouteBFeedbackReview
        | RouteBFeedbackReviewEmptyPayload
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !payload) {
        const message = payload && "message" in payload && payload.message ? payload.message : "Route B feedback review read failed.";
        throw new Error(message);
      }

      if ("status" in payload && payload.status === "EMPTY") {
        setFeedbackReview(null);
        setFeedbackReviewStatus("empty");
        return;
      }

      if (!("actionId" in payload) || payload.actionId !== "route-b-feedback-persistence") {
        throw new Error("Route B feedback review payload is invalid.");
      }

      setFeedbackReview(payload);
      setFeedbackReviewStatus("ready");
    } catch (error) {
      setFeedbackReview(null);
      setFeedbackReviewStatus("error");
      setFeedbackReviewError(error instanceof Error ? error.message : "Route B feedback review read failed.");
    }
  };

  const generateFeedbackReview = async () => {
    setFeedbackReviewStatus("generating");
    setFeedbackReviewError(null);
    setComplianceReviewIntake(null);
    setComplianceReviewIntakeStatus("idle");
    setComplianceReviewIntakeError(null);

    try {
      const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/feedback-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => null)) as TheaterRouteBFeedbackReview | { error?: string; message?: string } | null;

      if (!response.ok || !payload || !("actionId" in payload) || payload.actionId !== "route-b-feedback-persistence") {
        const message = payload && "message" in payload && payload.message ? payload.message : "Route B feedback review generation failed.";
        throw new Error(message);
      }

      setFeedbackReview(payload);
      setFeedbackReviewStatus("ready");
      toast.success("已保存 Route B 五視角回顧");
    } catch (error) {
      setFeedbackReview(null);
      setFeedbackReviewStatus("error");
      setFeedbackReviewError(error instanceof Error ? error.message : "Route B feedback review generation failed.");
    }
  };

  const fetchComplianceReviewIntake = async () => {
    setComplianceReviewIntakeStatus("loading");
    setComplianceReviewIntakeError(null);

    try {
      const response = await fetch(
        `/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/compliance-review-intake`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | RouteBComplianceReviewIntake
        | RouteBComplianceReviewIntakeEmptyPayload
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !payload) {
        const message = payload && "message" in payload && payload.message
          ? payload.message
          : "Route B compliance-review intake read failed.";
        throw new Error(message);
      }

      if ("status" in payload && payload.status === "EMPTY") {
        setComplianceReviewIntake(null);
        setComplianceReviewIntakeStatus("empty");
        return;
      }

      if (!isRouteBComplianceReviewIntakePayload(payload)) {
        throw new Error("Route B compliance-review intake payload is invalid.");
      }

      setComplianceReviewIntake(payload);
      setComplianceReviewIntakeStatus("ready");
    } catch (error) {
      setComplianceReviewIntake(null);
      setComplianceReviewIntakeStatus("error");
      setComplianceReviewIntakeError(error instanceof Error ? error.message : "Route B compliance-review intake read failed.");
    }
  };

  const fetchRedLineActionPersistence = async () => {
    setRedLineActionPersistenceStatus("loading");
    setRedLineActionPersistenceError(null);

    try {
      const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/red-line-actions`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | RouteBRedLineActionPersistenceState
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !isRouteBRedLineActionPersistencePayload(payload)) {
        const message = payload && "message" in payload && payload.message
          ? payload.message
          : "Route B red-line action state read failed.";
        throw new Error(message);
      }

      setRedLineActionStates(Object.fromEntries(payload.records.map((record) => [record.ruleId, record.state])));
      setRedLineActionPersistence(payload);
      setRedLineActionPersistenceStatus("ready");
    } catch (error) {
      setRedLineActionPersistence(null);
      setRedLineActionPersistenceStatus("error");
      setRedLineActionPersistenceError(error instanceof Error ? error.message : "Route B red-line action state read failed.");
    }
  };

  const saveRedLineActionPersistence = async () => {
    setRedLineActionPersistenceStatus("saving");
    setRedLineActionPersistenceError(null);

    try {
      const records = buildRouteBRedLineActionRecordsFromStateMap(redLineActionStates, severeRedLineActionWorkflow);
      const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/red-line-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      const payload = (await response.json().catch(() => null)) as
        | RouteBRedLineActionPersistenceState
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !isRouteBRedLineActionPersistencePayload(payload)) {
        const message = payload && "message" in payload && payload.message
          ? payload.message
          : "Route B red-line action state save failed.";
        throw new Error(message);
      }

      setRedLineActionStates(Object.fromEntries(payload.records.map((record) => [record.ruleId, record.state])));
      setRedLineActionPersistence(payload);
      setRedLineActionPersistenceStatus("ready");
      toast.success("已保存 Route B 紅線處置狀態");
    } catch (error) {
      setRedLineActionPersistence(null);
      setRedLineActionPersistenceStatus("error");
      setRedLineActionPersistenceError(error instanceof Error ? error.message : "Route B red-line action state save failed.");
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
      setPendingAppendCandidate(null);
      setPendingAppendUsageLogId(null);
      setProviderCandidateStatus("idle");
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
              {meetingSignalGrounding ? `・${meetingSignalGrounding.cardCount} 個會議訊號` : ""}
              {familyProfileGrounding ? `・${familyProfileGrounding.fieldCount} 個人物欄位` : ""}
              {relationshipEdgeShadowGrounding ? `・${relationshipEdgeShadowGrounding.candidateEdgeCount} 條 edge readiness` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div
            className="inline-flex rounded-full border border-hairline bg-paper p-1"
            role="group"
            aria-label="劇場模式"
          >
            <RouteBModeIconButton
              active={stageMode === "CONVERSE"}
              icon={<MessageSquare className="h-4 w-4" />}
              label="對話模式"
              onClick={() => setStageMode("CONVERSE")}
            />
            <RouteBModeIconButton
              active={stageMode === "OBSERVE"}
              icon={<Eye className="h-4 w-4" />}
              label="觀察模式"
              onClick={() => setStageMode("OBSERVE")}
            />
            <RouteBModeIconButton
              active={stageMode === "COMMENT"}
              icon={<StickyNote className="h-4 w-4" />}
              label="Comment"
              onClick={() => setStageMode("COMMENT")}
            />
          </div>
        </div>
      </header>

      <main
        className="grid min-h-[calc(100vh-220px)] flex-1 overflow-hidden rounded-xl border border-hairline bg-background xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]"
        data-route-b-stage-workspace="single-surface"
      >
        <section className="flex min-h-[520px] flex-col border-b border-hairline xl:border-b-0 xl:border-r">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Relationship Stage Map
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">客戶關係舞台</h2>
            </div>
            <div className="flex items-center gap-1.5" aria-label="舞台工具列">
              <RouteBCharacterPopover snapshot={snapshot} />
              <RouteBRelationshipEvidencePopover relationships={relationships} />
              <RouteBProviderProofPopover provider={provider} snapshot={snapshot} />
              <RouteBIconButton
                icon={<SlidersHorizontal className="h-4 w-4" />}
                label="進階"
                onClick={() => setIsAdvancedOpen(true)}
              />
            </div>
          </div>
          <RouteBRelationshipStageMap
            snapshot={snapshot}
            privateFocusCharacterId={privateFocusCharacterId}
            onPrivateFocus={handlePrivateFocus}
          />
        </section>

        <section className="flex min-h-[640px] flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Stage Runtime</p>
                <h2 className="mt-1 text-base font-semibold text-ink">群聊／私聊舞台</h2>
              </div>
              <Badge variant="outline" className="rounded-full">
                {snapshot.session.status}
              </Badge>
            </div>

            <RouteBGameChatHud
              latestTurn={latestTurn}
              privateFocusCharacterId={privateFocusCharacterId}
              snapshot={snapshot}
              stageMode={stageMode}
            />

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
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {snapshot.characters.map((character) => {
                    const privateTurns = snapshot.turns.filter(
                      (turn) =>
                        turn.visibilityScope === "PRIVATE" &&
                        turn.addresseeRouteBCharacterId === character.routeBCharacterId,
                    );

                    return (
                      <div key={character.id} className="border-b border-hairline last:border-b-0">
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          onClick={() => handlePrivateFocus(character.routeBCharacterId)}
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-ink">{character.displayName}</span>
                              <span className="rounded-full border border-hairline px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                私聊
                              </span>
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {ROUTE_B_ROLE_LABEL[character.role] ?? character.role}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                              {firstRouteBText(character.personaHints) ?? firstRouteBText(character.unknowns) ?? "尚無私聊提示。"}
                            </span>
                          </span>
                        </button>
                        {privateTurns.length ? (
                          <div className="space-y-2 px-4 pb-3">
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
              {stageMode === "CONVERSE" ? (
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
              ) : stageMode === "COMMENT" ? (
                <RouteBCommentComposer
                  snapshot={snapshot}
                  onSnapshotUpdate={onSnapshotUpdate}
                  visibilityScope={composerVisibilityScope}
                  onVisibilityScopeChange={setComposerVisibilityScope}
                  addresseeRouteBCharacterId={composerAddresseeRouteBCharacterId}
                  onAddresseeRouteBCharacterIdChange={setComposerAddresseeRouteBCharacterId}
                  statePatchTargetRouteBCharacterId={composerStatePatchTargetRouteBCharacterId}
                  onStatePatchTargetRouteBCharacterIdChange={setComposerStatePatchTargetRouteBCharacterId}
                />
              ) : (
                <div className="mx-auto flex max-w-3xl items-start gap-3 px-1 py-2 text-sm leading-6 text-muted-foreground">
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground">
                    <Eye className="h-4 w-4" />
                  </span>
                  <p>
                    <span className="font-medium text-ink">觀察模式：</span>
                    由導演挑選下一位發言者、產生角色之間的自然對話，你在旁觀察互動。啟用 provider 後才會實際生成角色台詞；目前只顯示導演的下一步規劃。
                  </p>
                </div>
              )}
              <div className="mx-auto flex max-w-3xl items-center justify-end gap-2">
                <RouteBNextTurnPopover
                  appendCandidate={pendingAppendCandidate}
                  appendUsageLogId={pendingAppendUsageLogId}
                  draft={nextTurnDraft}
                  error={nextTurnError}
                  isAppending={isConfirmingNextTurnAppend}
                  onConfirmAppend={handleConfirmNextTurnAppend}
                  onGenerateProviderCandidate={generateNextTurnProviderCandidate}
                  onRefresh={fetchNextTurnDraft}
                  providerCandidateError={providerCandidateError}
                  providerCandidateStatus={providerCandidateStatus}
                  snapshot={snapshot}
                  status={nextTurnStatus}
                />
                <Button
                  type="button"
                  variant="mono"
                  className="h-10 w-10 rounded-full p-0"
                  disabled
                  aria-label={
                    stageMode === "OBSERVE"
                      ? "讓角色自然互動（待 provider）"
                      : stageMode === "COMMENT"
                        ? "Comment 不觸發 provider"
                        : "待 provider proof"
                  }
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
      </main>

      <Sheet open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
          data-theater-advanced-drawer="true"
        >
          <SheetHeader>
            <SheetTitle>進階面板</SheetTitle>
            <SheetDescription>
              來源證據、五視角回饋、合規紅線與 provider 保護狀態都收在這裡，需要時再展開。
            </SheetDescription>
          </SheetHeader>
          <Tabs defaultValue="sources" className="mt-4 gap-4" data-route-b-advanced-tabs="true">
            <TabsList
              aria-label="劇場進階面板分類"
              className="grid h-12 w-full grid-cols-4 rounded-full border border-hairline bg-paper p-1"
            >
              <TabsTrigger value="sources" aria-label="來源證據" title="來源證據" className="h-10 rounded-full p-0">
                <BrainCircuit className="h-4 w-4" />
                <span className="sr-only">來源證據</span>
              </TabsTrigger>
              <TabsTrigger value="review" aria-label="質化回饋" title="質化回饋" className="h-10 rounded-full p-0">
                <Trophy className="h-4 w-4" />
                <span className="sr-only">質化回饋</span>
              </TabsTrigger>
              <TabsTrigger value="risk" aria-label="合規紅線" title="合規紅線" className="h-10 rounded-full p-0">
                <CircleAlert className="h-4 w-4" />
                <span className="sr-only">合規紅線</span>
              </TabsTrigger>
              <TabsTrigger value="context" aria-label="舞台脈絡" title="舞台脈絡" className="h-10 rounded-full p-0">
                <ShieldCheck className="h-4 w-4" />
                <span className="sr-only">舞台脈絡</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sources">
              <RouteBSourceEvidenceBrowser
                familyProfileGrounding={familyProfileGrounding}
                meetingSignalGrounding={meetingSignalGrounding}
                relationshipEdgeShadowGrounding={relationshipEdgeShadowGrounding}
              />
            </TabsContent>

            <TabsContent value="review">
              <RouteBReviewBrowser
                complianceError={complianceReviewIntakeError}
                complianceIntake={complianceReviewIntake}
                complianceOnRefresh={fetchComplianceReviewIntake}
                complianceStatus={complianceReviewIntakeStatus}
                error={feedbackReviewError}
                onGenerate={generateFeedbackReview}
                onRefresh={fetchFeedbackReview}
                review={feedbackReview}
                status={feedbackReviewStatus}
              />
            </TabsContent>

            <TabsContent value="risk">
              <RouteBSevereRedLineWarningPanel
                actionWorkflow={severeRedLineActionWorkflow}
                actionPersistence={redLineActionPersistence}
                actionStates={redLineActionStates}
                error={redLineActionPersistenceError}
                onActionStateChange={(ruleId, state) => {
                  setRedLineActionStates((current) => ({ ...current, [ruleId]: state }));
                }}
                onRefresh={fetchRedLineActionPersistence}
                onSave={saveRedLineActionPersistence}
                status={redLineActionPersistenceStatus}
                warningPreview={severeRedLineWarningPreview}
              />
            </TabsContent>

            <TabsContent value="context">
              <RouteBContextBrowser
                directorItems={directorTurns.map((turn) => turn.content)}
                narratorItems={narratorQuestions.map(routeBRecordText)}
                provider={provider}
                relationshipItems={relationships.map(routeBRecordText)}
                snapshot={snapshot}
                visibilityItems={visibilityRules.map(routeBVisibilityText)}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function RouteBSourceEvidenceBrowser({
  familyProfileGrounding,
  meetingSignalGrounding,
  relationshipEdgeShadowGrounding,
}: {
  familyProfileGrounding: RouteBFamilyProfileGrounding | null;
  meetingSignalGrounding: RouteBMeetingSignalGrounding | null;
  relationshipEdgeShadowGrounding: RouteBRelationshipEdgeShadowGrounding | null;
}) {
  const availableSources: Array<{
    id: RouteBSourceEvidenceMode;
    icon: React.ReactNode;
    label: string;
    summary: string;
  }> = [];

  if (meetingSignalGrounding) {
    availableSources.push({
      id: "meeting",
      icon: <BrainCircuit className="h-4 w-4" />,
      label: "會議訊號",
      summary: `${meetingSignalGrounding.cardCount} 張 stage card`,
    });
  }

  if (familyProfileGrounding) {
    availableSources.push({
      id: "family",
      icon: <UserRound className="h-4 w-4" />,
      label: "人物 profile",
      summary: `${familyProfileGrounding.fieldCount} 個欄位`,
    });
  }

  if (relationshipEdgeShadowGrounding) {
    availableSources.push({
      id: "edge",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "關係邊",
      summary: `${relationshipEdgeShadowGrounding.candidateEdgeCount} 條 edge shadow`,
    });
  }

  const [activeSource, setActiveSource] = useState<RouteBSourceEvidenceMode>(
    availableSources[0]?.id ?? "meeting",
  );
  const selectedSource = availableSources.find((source) => source.id === activeSource) ?? availableSources[0];

  if (!selectedSource) {
    return (
      <section
        className="rounded-lg border border-dashed border-hairline bg-background p-4 text-sm leading-6 text-muted-foreground"
        data-route-b-source-browser="empty"
      >
        尚無來源證據。
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-hairline bg-background"
      data-route-b-source-browser="true"
      data-route-b-source-browser-active={selectedSource.id}
    >
      <div className="border-b border-hairline p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Source Browser
            </p>
            <h3 className="mt-1 text-sm font-semibold text-ink">{selectedSource.label}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedSource.summary}</p>
          </div>
          <div className="flex shrink-0 gap-1" role="tablist" aria-label="Route B 來源證據分類">
            {availableSources.map((source) => (
              <Tooltip key={source.id}>
                <TooltipTrigger
                  aria-label={source.label}
                  aria-selected={selectedSource.id === source.id}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedSource.id === source.id
                      ? "bg-ink text-paper"
                      : "bg-paper text-muted-foreground hover:text-ink",
                  )}
                  onClick={() => setActiveSource(source.id)}
                  role="tab"
                  type="button"
                >
                  {source.icon}
                </TooltipTrigger>
                <TooltipContent>{source.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        {selectedSource.id === "meeting" && meetingSignalGrounding ? (
          <RouteBMeetingSignalGroundingPanel grounding={meetingSignalGrounding} />
        ) : null}
        {selectedSource.id === "family" && familyProfileGrounding ? (
          <RouteBFamilyProfileGroundingPanel grounding={familyProfileGrounding} />
        ) : null}
        {selectedSource.id === "edge" && relationshipEdgeShadowGrounding ? (
          <RouteBRelationshipEdgeShadowGroundingPanel grounding={relationshipEdgeShadowGrounding} />
        ) : null}
      </div>
    </section>
  );
}

function RouteBMeetingSignalGroundingPanel({ grounding }: { grounding: RouteBMeetingSignalGrounding }) {
  const renderModel = buildRouteBMeetingSignalSourceRenderModel(grounding);

  return (
    <div
      className="space-y-4"
      data-route-b-meeting-signal-source-grounding="true"
      data-route-b-meeting-signal-source-type-summary={renderModel.sourceTypeChips.length ? "visible" : "empty"}
    >
        <div className="flex items-start gap-3">
          <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">會議訊號來源</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {renderModel.cardCount} 張 stage card・{renderModel.unknownCount} 個待確認・{renderModel.narratorQuestionCount} 個旁白補問
            </p>
          </div>
        </div>

        {renderModel.sourceTypeChips.length ? (
          <div className="flex flex-wrap gap-1.5" data-route-b-meeting-signal-source-types="true">
            {renderModel.sourceTypeChips.map((chip) => (
              <span
                key={chip.sourceType}
                className="rounded-full border border-hairline bg-paper px-2 py-1 text-[10px] font-medium text-ink"
                data-route-b-meeting-signal-source-type-chip={chip.sourceType}
              >
                來源類型：{chip.sourceType}・{chip.count}
              </span>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          {renderModel.cards.slice(0, 3).map((card) => (
            <div key={card.stageCardId} className="border-b border-hairline py-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {routeBMeetingSignalStatusLabel(card.status)}
                </Badge>
                <span className="rounded-full border border-hairline bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                  {routeBMeetingSignalPriorityLabel(card.priority)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-ink">{card.summary || "會議訊號待補摘要"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                <span className="rounded-full border border-hairline bg-background px-2 py-0.5">
                  來源：{card.sourceLabel || "AI Meeting"}
                </span>
                {card.sourceType ? (
                  <span
                    className="rounded-full border border-hairline bg-background px-2 py-0.5"
                    data-route-b-meeting-signal-card-source-type={card.sourceType}
                  >
                    類型：{card.sourceType}
                  </span>
                ) : null}
                <span className="rounded-full border border-hairline bg-background px-2 py-0.5">
                  動作：{routeBMeetingSignalActionLabel(card.action)}
                </span>
              </div>
              {card.narratorQuestion ? (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">旁白補問：{card.narratorQuestion}</p>
              ) : null}
            </div>
          ))}
        </div>

        {renderModel.narratorQuestions.length ? (
          <div className="border-t border-hairline pt-3">
            <p className="text-xs font-semibold text-ink">補問 preview</p>
            <ul className="mt-1 space-y-1">
              {renderModel.narratorQuestions.slice(0, 2).map((question, index) => (
                <li key={`${question}-${index}`} className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {question}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-2 text-[11px] text-muted-foreground">
          <ContextLine label="Owner visit scope" value={String(renderModel.boundary.ownerScopedVisitPlanRequired)} />
          <ContextLine label="Browser session id" value={String(renderModel.boundary.browserSuppliedSessionId)} />
          <ContextLine label="Provider call" value={String(renderModel.boundary.providerCallAttempted)} />
          <ContextLine label="CRM fact write" value={String(renderModel.boundary.writesConfirmedCrmFact)} />
        </div>
    </div>
  );
}

function RouteBFamilyProfileGroundingPanel({ grounding }: { grounding: RouteBFamilyProfileGrounding }) {
  const statusText = routeBCountMapText(grounding.byFactStatus, "none");

  return (
    <div className="space-y-4" data-route-b-family-profile-source-grounding="true">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">人物 profile 來源</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {grounding.memberCount} 位人物・{grounding.fieldCount} 個欄位・{grounding.unknownFieldCount} 個待確認
            </p>
          </div>
        </div>

        <div className="border-y border-hairline py-2 text-xs leading-5 text-muted-foreground">
          <p>
            <span className="font-semibold text-ink">Fact status：</span>
            {statusText}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-ink">Source refs：</span>
            {grounding.sourceReferenceCount} 個安全計數，未輸出 reference id
          </p>
        </div>

        <div className="space-y-2">
          {grounding.fields.slice(0, 4).map((field) => (
            <div key={field.stageFieldId} className="border-b border-hairline py-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {routeBFamilyProfileStatusLabel(field.factStatus)}
                </Badge>
                <span className="rounded-full border border-hairline bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                  {field.relation || "關係待補"}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-ink">
                {field.person}・{field.label || field.field}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{field.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-[11px] text-muted-foreground">
          <ContextLine label="Owner graph scope" value={String(grounding.boundary.ownerScopedRelationshipGraphRequired)} />
          <ContextLine label="Browser session id" value={String(grounding.boundary.browserSuppliedSessionId)} />
          <ContextLine label="Browser person id" value={String(grounding.boundary.browserSuppliedPersonId)} />
          <ContextLine label="Provider call" value={String(grounding.boundary.providerCallAttempted)} />
          <ContextLine label="Raw metadata" value={String(grounding.boundary.rawMetadataIncluded)} />
          <ContextLine label="Source reference ids" value={String(grounding.boundary.sourceReferenceIdsIncluded)} />
          <ContextLine label="DB write" value={String(grounding.boundary.databaseWriteAttempted)} />
          <ContextLine label="Relationship graph write" value={String(grounding.boundary.writesRelationshipGraph)} />
          <ContextLine label="VisitPlan write" value={String(grounding.boundary.writesVisitPlan)} />
          <ContextLine label="CRM fact write" value={String(grounding.boundary.writesConfirmedCrmFact)} />
        </div>
    </div>
  );
}

function RouteBRelationshipEdgeShadowGroundingPanel({ grounding }: { grounding: RouteBRelationshipEdgeShadowGrounding }) {
  const edgeTypeText = routeBCountMapText(grounding.edgeTypeCounts, "none");
  const statusText = routeBCountMapText(grounding.factStatusCounts, "none");

  return (
    <div className="space-y-4" data-route-b-edge-shadow-source-grounding="true">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">關係邊 readiness</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {grounding.sourceMemberCount} 位成員・{grounding.candidateEdgeCount} 條 edge shadow・{grounding.unsupportedRelationCount} 個 unsupported
            </p>
          </div>
        </div>

        <div className="border-y border-hairline py-2 text-xs leading-5 text-muted-foreground">
          <p>
            <span className="font-semibold text-ink">Edge types：</span>
            {edgeTypeText}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-ink">Fact status：</span>
            {statusText}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-ink">Warnings：</span>
            {grounding.warningCodes.length ? grounding.warningCodes.join("、") : "none"}
          </p>
        </div>

        <div className="grid gap-2 text-[11px] text-muted-foreground">
          <ContextLine label="Owner graph scope" value={String(grounding.boundary.ownerScopedRelationshipGraphRequired)} />
          <ContextLine label="Browser session id" value={String(grounding.boundary.browserSuppliedSessionId)} />
          <ContextLine label="Provider call" value={String(grounding.boundary.providerCallAttempted)} />
          <ContextLine label="DB write" value={String(grounding.boundary.databaseWriteAttempted)} />
          <ContextLine label="Draft edges returned" value={String(grounding.boundary.clientFacingDraftEdgesReturned)} />
          <ContextLine label="Formal schema approved" value={String(grounding.boundary.formalSchemaApproved)} />
          <ContextLine label="Relationship graph write" value={String(grounding.boundary.writesRelationshipGraph)} />
          <ContextLine label="VisitPlan write" value={String(grounding.boundary.writesVisitPlan)} />
          <ContextLine label="CRM fact write" value={String(grounding.boundary.writesConfirmedCrmFact)} />
        </div>
    </div>
  );
}

function routeBCountMapText(counts: Record<string, number>, fallback: string): string {
  const entries = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .slice(0, 6);

  return entries.length ? entries.map(([key, value]) => `${key}=${value}`).join("、") : fallback;
}

function routeBFamilyProfileStatusLabel(status: string): string {
  if (status === "FACT") return "FACT 確認事實";
  if (status === "INFERENCE") return "INFERENCE 推論";
  return "UNKNOWN 待確認";
}

function routeBReviewStatusText(status: RouteBFeedbackReviewStatus | RouteBComplianceReviewIntakeStatus): string {
  if (status === "loading") return "讀取中";
  if (status === "generating") return "生成中";
  if (status === "ready") return "已就緒";
  if (status === "empty") return "尚無資料";
  if (status === "error") return "需要重試";
  return "尚未讀取";
}

function RouteBSevereRedLineWarningPanel({
  actionPersistence,
  actionStates,
  actionWorkflow,
  error,
  onActionStateChange,
  onRefresh,
  onSave,
  status,
  warningPreview,
}: {
  actionPersistence: RouteBRedLineActionPersistenceState | null;
  actionStates: Record<string, RouteBRedLineActionState>;
  actionWorkflow: RouteBSevereRedLineActionWorkflow;
  error: string | null;
  onActionStateChange: (ruleId: string, state: RouteBRedLineActionState) => void;
  onRefresh: () => Promise<void>;
  onSave: () => Promise<void>;
  status: RouteBRedLineActionPersistenceStatus;
  warningPreview: RouteBSevereRedLineWarningPreview;
}) {
  const isBusy = status === "loading" || status === "saving";
  const evidenceNeededCount = Object.values(actionStates).filter((state) => state === "EVIDENCE_NEEDED").length;
  const escalateCount = Object.values(actionStates).filter((state) => state === "ESCALATE").length;
  const [activeRuleId, setActiveRuleId] = useState(warningPreview.warnings[0]?.id ?? "");
  const selectedWarning =
    warningPreview.warnings.find((warning) => warning.id === activeRuleId) ??
    warningPreview.warnings[0] ??
    null;
  const selectedActionCard = selectedWarning
    ? actionWorkflow.cards.find((card) => card.ruleId === selectedWarning.id)
    : undefined;
  const selectedState = selectedWarning
    ? actionStates[selectedWarning.id] ?? selectedActionCard?.defaultState ?? "WATCHING"
    : "WATCHING";
  const selectedOption =
    selectedActionCard?.options.find((option) => option.state === selectedState) ??
    selectedActionCard?.options[0];
  const persistedAt = actionPersistence?.records
    .map((record) => record.updatedAt)
    .sort()
    .at(-1);

  return (
    <div
      className="space-y-4"
      data-route-b-red-line-browser="true"
      data-route-b-red-line-browser-active={selectedWarning?.id ?? "empty"}
    >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Red-line Browser
            </p>
            <h2 className="mt-1 text-sm font-semibold text-ink">守門紅線</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              從 provider prompt context 同源顯示嚴重即時項；一次聚焦一條規則，可標示觀察、佐證、不適用或升級審閱。
            </p>
          </div>
          <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <RouteBInlineMetricRail
          metrics={[
            { label: "嚴重即時", value: warningPreview.warningCount },
            { label: "待佐證", value: evidenceNeededCount },
            { label: "升級審閱", value: escalateCount },
          ]}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full"
            disabled={isBusy}
            onClick={() => void onRefresh()}
            aria-label="讀取已保存的 Route B 紅線處置狀態"
          >
            {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            讀取狀態
          </Button>
          <Button
            type="button"
            variant="mono"
            className="h-10 rounded-full"
            disabled={isBusy}
            onClick={() => void onSave()}
            aria-label="保存 Route B 紅線處置狀態"
          >
            {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            保存狀態
          </Button>
        </div>

        {status === "error" ? (
          <p className="rounded-lg border border-hairline bg-paper px-3 py-2 text-sm leading-6 text-muted-foreground">
            {error ?? "Route B red-line action state failed."}
          </p>
        ) : null}

        {warningPreview.warnings.length ? (
          <div className="grid gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Route B 紅線規則">
              {warningPreview.warnings.map((warning) => {
                const state = actionStates[warning.id] ?? actionWorkflow.cards.find((card) => card.ruleId === warning.id)?.defaultState ?? "WATCHING";

                return (
                  <button
                    key={warning.id}
                    type="button"
                    role="tab"
                    aria-label={warning.label}
                    aria-selected={selectedWarning?.id === warning.id}
                    onClick={() => setActiveRuleId(warning.id)}
                    className={cn(
                      "flex min-w-44 shrink-0 items-start gap-2 rounded-lg border border-hairline px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selectedWarning?.id === warning.id
                        ? "bg-ink text-paper"
                        : "bg-paper text-muted-foreground hover:text-ink",
                    )}
                  >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{warning.label}</span>
                      <span className="mt-1 block text-[11px] opacity-75">{state}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedWarning ? (
              <article className="border-y border-hairline py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Selected Rule
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-ink">{selectedWarning.label}</h3>
                  </div>
                  <Badge variant={selectedState === "ESCALATE" ? "destructive" : "outline"} className="shrink-0 rounded-full">
                    {selectedOption?.label ?? selectedState}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedWarning.triggerSignals.slice(0, 3).map((signal) => (
                    <Badge key={`${selectedWarning.id}-${signal}`} variant="outline" className="rounded-full">
                      {signal}
                    </Badge>
                  ))}
                </div>

                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {selectedWarning.advisorReminder}
                </p>

                {selectedActionCard ? (
                  <div
                    className="mt-3 flex flex-wrap items-center justify-between gap-3 border-y border-hairline py-2"
                    data-route-b-red-line-action-popover="true"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Action State
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {selectedOption?.label ?? selectedState}・{selectedOption?.state ?? selectedState}
                      </p>
                    </div>
                    <Popover>
                      <PopoverTrigger
                        aria-label={`調整 ${selectedWarning.label} 紅線處置狀態`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="調整紅線處置"
                        type="button"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="max-h-[min(70vh,520px)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto border border-hairline bg-popover p-3 shadow-none"
                        data-route-b-red-line-action-popover-content="true"
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Red-line action
                            </p>
                            <h4 className="mt-1 text-sm font-semibold text-ink">{selectedWarning.label}</h4>
                          </div>
                          <div className="divide-y divide-hairline border-y border-hairline" aria-label="Route B 紅線處置狀態">
                            {selectedActionCard.options.map((option) => (
                              <button
                                key={`${selectedWarning.id}-${option.state}`}
                                type="button"
                                aria-label={`${selectedWarning.label}：${option.label}`}
                                aria-pressed={selectedState === option.state}
                                onClick={() => onActionStateChange(selectedWarning.id, option.state)}
                                className={cn(
                                  "w-full px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  selectedState === option.state
                                    ? "bg-ink text-paper"
                                    : "bg-paper text-muted-foreground hover:bg-muted/40 hover:text-ink",
                                )}
                              >
                                <span className="block text-xs font-semibold">{option.label}</span>
                                <span className="mt-1 block text-[11px] leading-5 opacity-80">{option.summary}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                  <ContextLine label="Status" value={selectedWarning.status} />
                  <ContextLine label="Action state" value={selectedState} />
                  <ContextLine label="Evidence" value={selectedWarning.evidencePolicy} />
                  <ContextLine label="Reason code" value={String(Boolean(selectedOption?.requiresAdvisorReasonCode))} />
                  <ContextLine label="Evidence ref" value={String(Boolean(selectedOption?.requiresEvidenceReference))} />
                  <ContextLine label="Legal advice" value={String(selectedWarning.legalAdviceIncluded)} />
                  <ContextLine label="Writes CRM fact" value={String(selectedWarning.writesConfirmedCrmFact)} />
                </div>
              </article>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-hairline bg-paper px-3 py-3 text-sm leading-6 text-muted-foreground">
            目前沒有嚴重即時紅線。
          </p>
        )}

        <div className="grid gap-2 text-sm text-muted-foreground">
          <ContextLine label="Workflow" value={actionWorkflow.actionId} />
          <ContextLine label="Current persistence" value={actionWorkflow.persistenceEnvelope.currentPersistence} />
          <ContextLine label="Persisted record count" value={String(actionPersistence?.recordCount ?? 0)} />
          <ContextLine label="Latest updated" value={persistedAt ?? "not-loaded"} />
          <ContextLine label="Provider call" value={String(warningPreview.providerBoundary.providerCallAttempted)} />
          <ContextLine label="AiUsageLog" value={String(warningPreview.providerBoundary.aiUsageLogWritten)} />
          <ContextLine label="Auto block" value={String(!warningPreview.displayRules.doNotBlockConversationAutomatically)} />
          <ContextLine label="Formal finding" value={String(!warningPreview.displayRules.doNotTreatAsComplianceFindingWithoutEvidence)} />
        </div>
    </div>
  );
}

function RouteBIconButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onClick}
        type="button"
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function RouteBModeIconButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink",
        )}
        onClick={onClick}
        type="button"
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function RouteBCharacterPopover({ snapshot }: { snapshot: RouteBSessionSnapshot }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="舞台角色"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="舞台角色"
      >
        <Users className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Characters</p>
            <h3 className="mt-1 text-sm font-semibold text-ink">舞台角色</h3>
          </div>
          {snapshot.characters.map((character) => (
            <RouteBCharacterCard key={character.id} character={character} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RouteBRelationshipEvidencePopover({ relationships }: { relationships: Array<Record<string, unknown>> }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="關係證據"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="關係證據"
      >
        <BrainCircuit className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Relationship Evidence
            </p>
            <h3 className="mt-1 text-sm font-semibold text-ink">關係證據</h3>
          </div>
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
                    factStatus{" "}
                    <strong className="font-mono text-ink">
                      {routeBRecordField(relationship, "factStatus", "UNKNOWN")}
                    </strong>
                  </span>
                  <span>
                    visibilityScope{" "}
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
              無關係證據。
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RouteBProviderProofPopover({
  provider,
  snapshot,
}: {
  provider: RouteBSessionSnapshot["session"]["provider"];
  snapshot: RouteBSessionSnapshot;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Provider guard"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Provider guard"
      >
        <ShieldCheck className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Provider guard</p>
            <h3 className="mt-1 text-sm font-semibold text-ink">範圍證明</h3>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <ContextLine label="providerCallAttempted" value={String(provider.callAttempted)} />
            <ContextLine label="usageLogWritten" value={String(provider.usageLogWritten)} />
            <ContextLine label="requiresConfirmation" value="true" />
            <ContextLine label="writesConfirmedCrmFact" value="false" />
            <ContextLine label="Owner read" value={String(snapshot.visibilityProof.ownerOnlyRead)} />
            <ContextLine label="Scoped turn columns" value={String(snapshot.visibilityProof.scopedTurnColumnsPersisted)} />
            <ContextLine label="Raw provider payload" value={String(provider.storesProviderBody)} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RouteBNextTurnPopover(props: Parameters<typeof RouteBNextTurnPreviewPanel>[0]) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="下一回合預覽"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="下一回合預覽"
      >
        <Sparkles className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[80vh] w-[min(720px,calc(100vw-2rem))] overflow-y-auto p-2">
        <RouteBNextTurnPreviewPanel {...props} />
      </PopoverContent>
    </Popover>
  );
}

function RouteBRelationshipStageMap({
  onPrivateFocus,
  privateFocusCharacterId,
  snapshot,
}: {
  onPrivateFocus: (characterId: string) => void;
  privateFocusCharacterId: string | null;
  snapshot: RouteBSessionSnapshot;
}) {
  const latestTurn = latestRouteBTurn(snapshot.turns);
  const focusCharacterId =
    privateFocusCharacterId ??
    latestTurn?.speakerRouteBCharacterId ??
    latestTurn?.addresseeRouteBCharacterId ??
    snapshot.characters.find((character) => character.isFocus)?.routeBCharacterId ??
    null;
  return (
    <div className="min-h-0 flex-1 p-4">
      <RouteBStageGraph
        focusCharacterId={focusCharacterId}
        onSelect={onPrivateFocus}
        characters={snapshot.characters.map((character) => ({
          id: character.routeBCharacterId,
          displayName: character.displayName,
          roleLabel: ROUTE_B_ROLE_LABEL[character.role] ?? character.role,
          isFocus: character.isFocus,
          knownCount: routeBRecords(character.knownFacts).length,
          inferenceCount: routeBRecords(character.personaHints).length,
          unknownCount: routeBRecords(character.unknowns).length,
          statePatchCount: character.statePatchCount,
          isLatestSpeaker:
            latestTurn?.speakerRouteBCharacterId === character.routeBCharacterId,
          isLatestAddressee:
            latestTurn?.addresseeRouteBCharacterId === character.routeBCharacterId,
        }))}
      />
    </div>
  );
}

function RouteBContextBrowser({
  directorItems,
  narratorItems,
  provider,
  relationshipItems,
  snapshot,
  visibilityItems,
}: {
  directorItems: string[];
  narratorItems: string[];
  provider: RouteBSessionSnapshot["session"]["provider"];
  relationshipItems: string[];
  snapshot: RouteBSessionSnapshot;
  visibilityItems: string[];
}) {
  const contexts: Array<{
    id: RouteBContextMode;
    icon: React.ReactNode;
    items?: string[];
    label: string;
    summary: string;
  }> = [
    {
      id: "guard",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Provider guard",
      summary: `callAttempted=${String(provider.callAttempted)}・usageLogWritten=${String(provider.usageLogWritten)}`,
    },
    {
      id: "director",
      icon: <MessageSquare className="h-4 w-4" />,
      items: directorItems,
      label: "導演開場",
      summary: `${directorItems.length} 則導演指令`,
    },
    {
      id: "relationships",
      icon: <Users className="h-4 w-4" />,
      items: relationshipItems,
      label: "關係脈絡",
      summary: `${relationshipItems.length} 條舞台關係`,
    },
    {
      id: "narrator",
      icon: <BrainCircuit className="h-4 w-4" />,
      items: narratorItems,
      label: "旁白補問",
      summary: `${narratorItems.length} 題待追問`,
    },
    {
      id: "visibility",
      icon: <Eye className="h-4 w-4" />,
      items: visibilityItems,
      label: "可見性規則",
      summary: `${visibilityItems.length} 條 scope rule`,
    },
  ];
  const [activeContext, setActiveContext] = useState<RouteBContextMode>("guard");
  const selectedContext =
    contexts.find((context) => context.id === activeContext) ?? contexts[0];

  return (
    <section
      className="overflow-hidden rounded-lg border border-hairline bg-background"
      data-route-b-context-browser="true"
      data-route-b-context-browser-active={selectedContext.id}
    >
      <div className="border-b border-hairline p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Context Browser
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-ink">{selectedContext.label}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {selectedContext.summary}
            </p>
          </div>
          <div className="flex shrink-0 gap-1" role="tablist" aria-label="Route B 舞台脈絡分類">
            {contexts.map((context) => (
              <Tooltip key={context.id}>
                <TooltipTrigger
                  aria-label={context.label}
                  aria-selected={selectedContext.id === context.id}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedContext.id === context.id
                      ? "bg-ink text-paper"
                      : "bg-paper text-muted-foreground hover:text-ink",
                  )}
                  onClick={() => setActiveContext(context.id)}
                  role="tab"
                  type="button"
                >
                  {context.icon}
                </TooltipTrigger>
                <TooltipContent>{context.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3" data-route-b-context-view={selectedContext.id}>
        {selectedContext.id === "guard" ? (
          <RouteBProviderGuardStrip provider={provider} snapshot={snapshot} />
        ) : (
          <RouteBContextListView
            items={selectedContext.items ?? []}
            label={selectedContext.label}
          />
        )}
      </div>
    </section>
  );
}

function RouteBContextListView({ items, label }: { items: string[]; label: string }) {
  if (!items.length) {
    return (
      <div className="border-y border-dashed border-hairline bg-paper/40 py-6 text-center text-sm leading-6 text-muted-foreground">
        {label}目前沒有資料。
      </div>
    );
  }

  return (
    <div className="divide-y divide-hairline border-y border-hairline">
      {items.map((item, index) => (
        <article key={`${label}-${index}`} className="grid gap-2 py-3 sm:grid-cols-[7rem_1fr] sm:gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label} {index + 1}
          </p>
          <p className="min-w-0 text-sm leading-6 text-muted-foreground">{item}</p>
        </article>
      ))}
    </div>
  );
}

function RouteBProviderGuardStrip({
  provider,
  snapshot,
}: {
  provider: RouteBSessionSnapshot["session"]["provider"];
  snapshot: RouteBSessionSnapshot;
}) {
  return (
    <section className="border-y border-hairline bg-paper/40 p-3" data-route-b-advanced-provider-strip="true">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-paper text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Provider guard</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            callsEnabled={String(provider.callsEnabled)}・callAttempted={String(provider.callAttempted)}・usageLogWritten={String(provider.usageLogWritten)}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            <ContextLine label="Owner read" value={String(snapshot.visibilityProof.ownerOnlyRead)} />
            <ContextLine label="Scoped turn columns" value={String(snapshot.visibilityProof.scopedTurnColumnsPersisted)} />
            <ContextLine label="Raw provider payload" value={String(provider.storesProviderBody)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {provider.usageLogRequiredFor.map((kind) => (
              <Badge key={kind} variant="outline" className="rounded-full">
                {kind}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RouteBGameChatHud({
  latestTurn,
  privateFocusCharacterId,
  snapshot,
  stageMode,
}: {
  latestTurn: RouteBSessionSnapshot["turns"][number] | undefined;
  privateFocusCharacterId: string | null;
  snapshot: RouteBSessionSnapshot;
  stageMode: RouteBStageMode;
}) {
  const modeLabel =
    stageMode === "COMMENT" ? "Comment 注記" : stageMode === "OBSERVE" ? "觀察回合" : "遊戲對話";
  const focusName =
    routeBCharacterDisplayName(snapshot, privateFocusCharacterId ?? latestTurn?.addresseeRouteBCharacterId ?? undefined) ??
    routeBCharacterDisplayName(snapshot, latestTurn?.speakerRouteBCharacterId ?? undefined) ??
    snapshot.characters.find((character) => character.isFocus)?.displayName ??
    "未選定";
  const latestActor =
    routeBCharacterDisplayName(snapshot, latestTurn?.speakerRouteBCharacterId ?? undefined) ??
    (latestTurn?.role === "ADVISOR" || latestTurn?.role === "AGENT"
      ? "顧問"
      : latestTurn?.role === "DIRECTOR" || latestTurn?.role === "SYSTEM"
        ? "導演"
        : latestTurn?.role === "NARRATOR"
          ? "旁白"
          : "尚未開始");

  return (
    <div
      className="border-b border-hairline bg-paper px-4 py-3"
      data-route-b-game-chat-hud="true"
      data-route-b-stage-mode={stageMode}
      data-provider-call-attempted="false"
      data-ai-usage-log-written="false"
      data-writes-confirmed-crm-fact="false"
    >
      <div className="grid gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-ink">
            <Gamepad2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">演練回合台</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {modeLabel}・目前聚焦 {focusName}・最新發話 {latestActor}。Comment 只標記情境與待確認狀態，不觸發 provider、不寫 CRM confirmed fact。
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              角色 AI 回覆目前鎖定，由工具列的範圍證明確認 provider guard、可見範圍與寫入邊界。
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <RouteBMiniCount label="回合" value={snapshot.turns.length} />
          <RouteBMiniCount label="角色" value={snapshot.characters.length} />
          <RouteBMiniCount label="狀態提案" value={snapshot.scene.statePatchCount} />
          <RouteBMiniCount label="AI 回覆" value={snapshot.session.provider.callsEnabled ? "on" : "locked"} />
        </div>
      </div>
    </div>
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
    <form onSubmit={handleSubmit} className="mx-auto grid max-w-3xl gap-2" data-route-b-advisor-composer="true">
      <div className="flex items-end gap-2">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="輸入顧問要放進群聊或私聊的訊息"
          className="min-h-20 flex-1 resize-y rounded-lg border-hairline bg-background text-sm leading-6 focus-visible:ring-ring"
          disabled={isSubmitting}
          aria-label="Route B 顧問訊息"
        />
        <RouteBAdvisorComposerSettingsPopover
          addresseeRouteBCharacterId={selectedAddresseeId}
          onAddresseeRouteBCharacterIdChange={onAddresseeRouteBCharacterIdChange}
          onStatePatchSummaryChange={setStatePatchSummary}
          onStatePatchTargetRouteBCharacterIdChange={onStatePatchTargetRouteBCharacterIdChange}
          onVisibilityScopeChange={onVisibilityScopeChange}
          snapshot={snapshot}
          statePatchSummary={statePatchSummary}
          statePatchTargetRouteBCharacterId={selectedStatePatchTargetId}
          visibilityScope={visibilityScope}
        />
        <Button
          type="submit"
          variant="mono"
          className="h-10 w-10 shrink-0 rounded-full p-0"
          disabled={!content.trim() || !defaultCharacterId || isSubmitting}
          aria-label="寫入 Route B 顧問互動"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="sr-only">寫入舞台</span>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs leading-5 text-muted-foreground">
        <span>{visibilityScope === "PRIVATE" ? `私聊：${routeBCharacterDisplayName(snapshot, selectedAddresseeId) ?? "未選定"}` : "群聊"}</span>
        <span>狀態對象：{routeBCharacterDisplayName(snapshot, selectedStatePatchTargetId) ?? "未選定"}</span>
        {statePatchSummary.trim() ? <span>含待確認狀態筆記</span> : null}
      </div>
    </form>
  );
}

function RouteBAdvisorComposerSettingsPopover({
  addresseeRouteBCharacterId,
  onAddresseeRouteBCharacterIdChange,
  onStatePatchSummaryChange,
  onStatePatchTargetRouteBCharacterIdChange,
  onVisibilityScopeChange,
  snapshot,
  statePatchSummary,
  statePatchTargetRouteBCharacterId,
  visibilityScope,
}: {
  addresseeRouteBCharacterId: string;
  onAddresseeRouteBCharacterIdChange: (value: string) => void;
  onStatePatchSummaryChange: (value: string) => void;
  onStatePatchTargetRouteBCharacterIdChange: (value: string) => void;
  onVisibilityScopeChange: (value: "GROUP" | "PRIVATE") => void;
  snapshot: RouteBSessionSnapshot;
  statePatchSummary: string;
  statePatchTargetRouteBCharacterId: string;
  visibilityScope: "GROUP" | "PRIVATE";
}) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Route B 發話設定"
        data-route-b-composer-settings-trigger="advisor"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[min(70vh,540px)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto border border-hairline bg-popover p-3 opacity-100 shadow-none ring-0 [animation:none]"
        data-route-b-composer-settings="advisor"
        style={{ backgroundColor: "var(--popover)", opacity: 1 }}
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Speak Settings</p>
            <h3 className="mt-1 text-sm font-semibold text-ink">發話設定</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              範圍、私聊對象與待確認狀態都在這裡設定，主舞台只保留輸入節奏。
            </p>
          </div>

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
                value={addresseeRouteBCharacterId}
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
          ) : null}

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            狀態對象
            <select
              value={statePatchTargetRouteBCharacterId}
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
            onChange={(event) => onStatePatchSummaryChange(event.target.value)}
            placeholder="新增待確認狀態筆記；留空則只寫入對話"
            className="min-h-20 resize-y rounded-lg border-hairline bg-background text-sm leading-6 focus-visible:ring-ring"
            aria-label="Route B 待確認狀態筆記"
          />

          <div className="grid gap-2 text-[11px] text-muted-foreground">
            <ContextLine label="requiresConfirmation" value="true" />
            <ContextLine label="writesConfirmedCrmFact" value="false" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RouteBCommentComposer({
  addresseeRouteBCharacterId,
  onAddresseeRouteBCharacterIdChange,
  onSnapshotUpdate,
  onStatePatchTargetRouteBCharacterIdChange,
  onVisibilityScopeChange,
  snapshot,
  statePatchTargetRouteBCharacterId,
  visibilityScope,
}: {
  addresseeRouteBCharacterId: string;
  onAddresseeRouteBCharacterIdChange: (value: string) => void;
  onSnapshotUpdate: (snapshot: RouteBSessionSnapshot) => void;
  onStatePatchTargetRouteBCharacterIdChange: (value: string) => void;
  onVisibilityScopeChange: (value: "GROUP" | "PRIVATE") => void;
  snapshot: RouteBSessionSnapshot;
  statePatchTargetRouteBCharacterId: string;
  visibilityScope: "GROUP" | "PRIVATE";
}) {
  const defaultCharacterId = snapshot.characters[0]?.routeBCharacterId ?? "";
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedAddresseeId = addresseeRouteBCharacterId || defaultCharacterId;
  const selectedStatePatchTargetId = statePatchTargetRouteBCharacterId || selectedAddresseeId || defaultCharacterId;
  const trimmedComment = comment.trim();
  const persistedComment = `${ROUTE_B_COMMENT_PREFIX} ${trimmedComment}`;
  const isCommentTooLong = persistedComment.length > 500;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedComment || trimmedComment.length < 3 || isCommentTooLong || !defaultCharacterId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: persistedComment,
          visibilityScope,
          addresseeRouteBCharacterId: visibilityScope === "PRIVATE" ? selectedAddresseeId : undefined,
          statePatch: {
            targetRouteBCharacterId: selectedStatePatchTargetId,
            summary: persistedComment,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as RouteBSessionSnapshot | { error?: string; message?: string } | null;

      if (!response.ok || !payload || !("session" in payload)) {
        const message = payload && "message" in payload && payload.message ? payload.message : "Route B comment write failed.";
        throw new Error(message);
      }

      onSnapshotUpdate(payload);
      setComment("");
      toast.success("已保存情境注記");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Route B comment write failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid max-w-3xl gap-2"
      data-route-b-comment-mode="true"
      data-provider-call-attempted="false"
      data-ai-usage-log-written="false"
      data-writes-confirmed-crm-fact="false"
    >
      <div className="flex items-end gap-2">
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="注記此刻情境、顧問觀察或稍後要追問的線索"
          maxLength={480}
          className="min-h-24 flex-1 resize-y rounded-lg border-hairline bg-background text-sm leading-6 focus-visible:ring-ring"
          disabled={isSubmitting}
          aria-label="Route B 情境注記"
        />
        <RouteBCommentComposerSettingsPopover
          addresseeRouteBCharacterId={selectedAddresseeId}
          onAddresseeRouteBCharacterIdChange={onAddresseeRouteBCharacterIdChange}
          onStatePatchTargetRouteBCharacterIdChange={onStatePatchTargetRouteBCharacterIdChange}
          onVisibilityScopeChange={onVisibilityScopeChange}
          snapshot={snapshot}
          statePatchTargetRouteBCharacterId={selectedStatePatchTargetId}
          visibilityScope={visibilityScope}
        />
        <Button
          type="submit"
          variant="mono"
          className="h-10 w-10 shrink-0 rounded-full p-0"
          disabled={!trimmedComment || trimmedComment.length < 3 || isCommentTooLong || !defaultCharacterId || isSubmitting}
          aria-label="保存 Route B 情境注記"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
          <span className="sr-only">保存注記</span>
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {visibilityScope === "PRIVATE" ? `私聊注記：${routeBCharacterDisplayName(snapshot, selectedAddresseeId) ?? "未選定"}` : "群聊情境注記"}
          ・狀態對象：{routeBCharacterDisplayName(snapshot, selectedStatePatchTargetId) ?? "未選定"}
        </span>
        <span className={cn("tabular-nums", isCommentTooLong && "text-destructive")}>
          {persistedComment.length}/500
        </span>
      </div>
    </form>
  );
}

function RouteBCommentComposerSettingsPopover({
  addresseeRouteBCharacterId,
  onAddresseeRouteBCharacterIdChange,
  onStatePatchTargetRouteBCharacterIdChange,
  onVisibilityScopeChange,
  snapshot,
  statePatchTargetRouteBCharacterId,
  visibilityScope,
}: {
  addresseeRouteBCharacterId: string;
  onAddresseeRouteBCharacterIdChange: (value: string) => void;
  onStatePatchTargetRouteBCharacterIdChange: (value: string) => void;
  onVisibilityScopeChange: (value: "GROUP" | "PRIVATE") => void;
  snapshot: RouteBSessionSnapshot;
  statePatchTargetRouteBCharacterId: string;
  visibilityScope: "GROUP" | "PRIVATE";
}) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Route B comment 設定"
        data-route-b-composer-settings-trigger="comment"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[min(70vh,540px)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto border border-hairline bg-popover p-3 opacity-100 shadow-none ring-0 [animation:none]"
        data-route-b-composer-settings="comment"
        style={{ backgroundColor: "var(--popover)", opacity: 1 }}
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Comment Settings</p>
            <h3 className="mt-1 text-sm font-semibold text-ink">注記設定</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Comment mode 只保存情境與待確認狀態，不觸發 provider、不寫 CRM confirmed fact。
            </p>
          </div>

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            注記範圍
            <select
              value={visibilityScope}
              onChange={(event) => onVisibilityScopeChange(event.target.value === "PRIVATE" ? "PRIVATE" : "GROUP")}
              className="h-10 rounded-lg border border-hairline bg-background px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="選擇 Route B comment 注記範圍"
            >
              <option value="GROUP">群聊情境</option>
              <option value="PRIVATE">指定人物</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            注記對象
            <select
              value={statePatchTargetRouteBCharacterId}
              onChange={(event) => {
                onStatePatchTargetRouteBCharacterIdChange(event.target.value);
                if (visibilityScope === "PRIVATE") {
                  onAddresseeRouteBCharacterIdChange(event.target.value);
                }
              }}
              className="h-10 rounded-lg border border-hairline bg-background px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="選擇 Route B comment 注記對象"
            >
              {snapshot.characters.map((character) => (
                <option key={character.id} value={character.routeBCharacterId}>
                  {character.displayName}
                </option>
              ))}
            </select>
          </label>

          {visibilityScope === "PRIVATE" ? (
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              私聊可見對象
              <select
                value={addresseeRouteBCharacterId}
                onChange={(event) => {
                  onAddresseeRouteBCharacterIdChange(event.target.value);
                  onStatePatchTargetRouteBCharacterIdChange(event.target.value);
                }}
                className="h-10 rounded-lg border border-hairline bg-background px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="選擇 Route B comment 私聊可見對象"
              >
                {snapshot.characters.map((character) => (
                  <option key={character.id} value={character.routeBCharacterId}>
                    {character.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-2 text-[11px] text-muted-foreground">
            <ContextLine label="requiresConfirmation" value="true" />
            <ContextLine label="writesConfirmedCrmFact" value="false" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RouteBReviewBrowser({
  complianceError,
  complianceIntake,
  complianceOnRefresh,
  complianceStatus,
  error,
  onGenerate,
  onRefresh,
  review,
  status,
}: {
  complianceError: string | null;
  complianceIntake: RouteBComplianceReviewIntake | null;
  complianceOnRefresh: () => Promise<void>;
  complianceStatus: RouteBComplianceReviewIntakeStatus;
  error: string | null;
  onGenerate: () => Promise<void>;
  onRefresh: () => Promise<void>;
  review: TheaterRouteBFeedbackReview | null;
  status: RouteBFeedbackReviewStatus;
}) {
  const [activeReview, setActiveReview] = useState<RouteBReviewMode>("feedback");
  const views: Array<{
    id: RouteBReviewMode;
    icon: React.ReactNode;
    label: string;
    summary: string;
  }> = [
    {
      id: "feedback",
      icon: <Trophy className="h-4 w-4" />,
      label: "五視角回顧",
      summary: review ? `${review.sections.length} 個視角` : routeBReviewStatusText(status),
    },
    {
      id: "compliance",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "待審閱候選",
      summary: complianceIntake ? `${complianceIntake.candidateCount} 個候選` : routeBReviewStatusText(complianceStatus),
    },
  ];
  const selectedView = views.find((view) => view.id === activeReview) ?? views[0];

  return (
    <section
      className="rounded-lg border border-hairline bg-background"
      data-route-b-review-browser="true"
      data-route-b-review-browser-active={selectedView.id}
    >
      <div className="border-b border-hairline p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Review Browser
            </p>
            <h3 className="mt-1 text-sm font-semibold text-ink">{selectedView.label}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedView.summary}</p>
          </div>
          <div className="flex shrink-0 gap-1" role="tablist" aria-label="Route B 質化回顧分類">
            {views.map((view) => (
              <Tooltip key={view.id}>
                <TooltipTrigger
                  aria-label={view.label}
                  aria-selected={selectedView.id === view.id}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedView.id === view.id
                      ? "bg-ink text-paper"
                      : "bg-paper text-muted-foreground hover:text-ink",
                  )}
                  onClick={() => setActiveReview(view.id)}
                  role="tab"
                  type="button"
                >
                  {view.icon}
                </TooltipTrigger>
                <TooltipContent>{view.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        {selectedView.id === "feedback" ? (
          <RouteBFeedbackReviewPanel
            error={error}
            onGenerate={onGenerate}
            onRefresh={onRefresh}
            review={review}
            status={status}
          />
        ) : (
          <RouteBComplianceReviewIntakePanel
            error={complianceError}
            intake={complianceIntake}
            onRefresh={complianceOnRefresh}
            status={complianceStatus}
          />
        )}
      </div>
    </section>
  );
}

function RouteBFeedbackReviewPanel({
  error,
  onGenerate,
  onRefresh,
  review,
  status,
}: {
  error: string | null;
  onGenerate: () => Promise<void>;
  onRefresh: () => Promise<void>;
  review: TheaterRouteBFeedbackReview | null;
  status: RouteBFeedbackReviewStatus;
}) {
  const isBusy = status === "loading" || status === "generating";
  const redLineNeedsReview = review?.redLineFindings.filter((finding) => finding.status === "NEEDS_REVIEW").length ?? 0;
  const redLineNotApplicable = review?.redLineFindings.filter((finding) => finding.status === "NOT_APPLICABLE").length ?? 0;
  const redLineEscalate = review?.redLineActionState.escalateCount ?? 0;
  const redLineEvidenceNeeded = review?.redLineActionState.evidenceNeededCount ?? 0;
  const edgeShadowGrounding = review?.relationshipEdgeShadowGrounding;
  const familyProfileGrounding = review?.familyProfileGrounding;
  const [activeFeedbackView, setActiveFeedbackView] = useState<RouteBFeedbackBrowserMode>("overview");
  const [activePerspectiveId, setActivePerspectiveId] = useState(review?.sections[0]?.perspectiveId ?? "");
  const [activeRedLineId, setActiveRedLineId] = useState(review?.redLineFindings[0]?.redLineId ?? "");
  const selectedPerspective =
    review?.sections.find((section) => section.perspectiveId === activePerspectiveId) ??
    review?.sections[0] ??
    null;
  const selectedRedLine =
    review?.redLineFindings.find((finding) => finding.redLineId === activeRedLineId) ??
    review?.redLineFindings[0] ??
    null;
  const feedbackViews: Array<{
    id: RouteBFeedbackBrowserMode;
    icon: React.ReactNode;
    label: string;
    summary: string;
  }> = [
    {
      id: "overview",
      icon: <BrainCircuit className="h-4 w-4" />,
      label: "回顧總覽",
      summary: review ? `${review.sections.length} 視角・${review.redLineFindings.length} 紅線` : routeBReviewStatusText(status),
    },
    {
      id: "perspectives",
      icon: <Trophy className="h-4 w-4" />,
      label: "五視角",
      summary: selectedPerspective?.label ?? "等待回顧",
    },
    {
      id: "redLines",
      icon: <CircleAlert className="h-4 w-4" />,
      label: "紅線",
      summary: selectedRedLine ? `${selectedRedLine.label}・${selectedRedLine.status}` : "等待紅線",
    },
  ];
  const selectedFeedbackView =
    feedbackViews.find((view) => view.id === activeFeedbackView) ?? feedbackViews[0];

  return (
    <div
      className="space-y-4"
      data-route-b-compliance-review-view="true"
      data-route-b-feedback-inner-browser="true"
      data-route-b-feedback-inner-browser-active={selectedFeedbackView.id}
    >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Session Review
            </p>
            <h2 className="mt-1 text-sm font-semibold text-ink">五視角回顧</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              質化回顧、無總分排名；保存於劇場狀態，不寫 CRM confirmed fact。
            </p>
          </div>
          <BrainCircuit className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full"
            disabled={isBusy}
            onClick={() => void onRefresh()}
            aria-label="讀取已保存的 Route B 五視角回顧"
          >
            {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            讀取回顧
          </Button>
          <Button
            type="button"
            variant="mono"
            className="h-10 rounded-full"
            disabled={isBusy}
            onClick={() => void onGenerate()}
            aria-label="生成並保存 Route B 五視角回顧"
          >
            {status === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            生成回顧
          </Button>
        </div>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Route B 五視角回顧內層分類">
          {feedbackViews.map((view) => (
            <Tooltip key={view.id}>
              <TooltipTrigger
                aria-label={view.label}
                aria-selected={selectedFeedbackView.id === view.id}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedFeedbackView.id === view.id
                    ? "bg-ink text-paper"
                    : "bg-paper text-muted-foreground hover:text-ink",
                )}
                onClick={() => setActiveFeedbackView(view.id)}
                role="tab"
                type="button"
              >
                {view.icon}
              </TooltipTrigger>
              <TooltipContent>{view.label}</TooltipContent>
            </Tooltip>
          ))}
          <p className="min-w-0 flex-1 px-2 py-2 text-xs leading-5 text-muted-foreground">
            {selectedFeedbackView.summary}
          </p>
        </div>

        {status === "error" ? (
          <p className="rounded-lg border border-hairline bg-paper px-3 py-2 text-sm leading-6 text-muted-foreground">
            {error ?? "Route B feedback review failed."}
          </p>
        ) : null}

        {status === "empty" ? (
          <p className="rounded-lg border border-dashed border-hairline bg-paper px-3 py-3 text-sm leading-6 text-muted-foreground">
            尚未保存回顧。可以在這場演練收尾時生成一次五視角回顧。
          </p>
        ) : null}

        {selectedFeedbackView.id === "overview" ? (
          <RouteBInlineMetricRail
            metrics={[
              { label: "紅線待查", value: redLineNeedsReview },
              { label: "本輪不適用", value: redLineNotApplicable },
              { label: "升級審閱", value: redLineEscalate },
              { label: "需要佐證", value: redLineEvidenceNeeded },
            ]}
          />
        ) : null}

        {review ? (
          <div className="space-y-3" data-route-b-feedback-view={selectedFeedbackView.id}>
            {selectedFeedbackView.id === "overview" ? (
              <>
                <div className="grid gap-2 border-y border-hairline py-3 text-sm text-muted-foreground">
                  <ContextLine label="Provider call" value={String(review.providerBoundary.providerCallAttempted)} />
                  <ContextLine label="AiUsageLog" value={String(review.providerBoundary.aiUsageLogWritten)} />
                  <ContextLine label="Writes CRM fact" value={String(review.persistenceEnvelope.writesConfirmedCrmFact)} />
                  <ContextLine label="Total score" value={String(review.outputContract.totalScoreAllowed)} />
                  <ContextLine
                    label="Red-line action source"
                    value={review.redLineActionState.consumedByFeedbackReview ? "sceneState.redLineActionState" : "none"}
                  />
                  <ContextLine
                    label="Edge shadow source"
                    value={edgeShadowGrounding?.usedInFeedbackReview ? "scene.sourceGrounding.relationshipEdgeShadow" : "none"}
                  />
                  <ContextLine
                    label="Family profile source"
                    value={familyProfileGrounding?.usedInFeedbackReview ? "scene.sourceGrounding.familyProfiles" : "none"}
                  />
                </div>
                {edgeShadowGrounding ? (
                  <div className="border-y border-hairline py-3" data-route-b-feedback-edge-shadow-grounding="true">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-ink">關係邊候選回顧</p>
                      <Badge variant="outline" className="rounded-full">
                        {edgeShadowGrounding.candidateEdgeCount} edges
                      </Badge>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
                      <ContextLine label="Formal schema" value={String(edgeShadowGrounding.boundary.formalSchemaApproved)} />
                      <ContextLine label="Raw draft edges" value={String(edgeShadowGrounding.boundary.rawDraftEdgesIncluded)} />
                      <ContextLine label="Graph write" value={String(edgeShadowGrounding.boundary.writesRelationshipGraph)} />
                      <ContextLine label="DB write" value={String(edgeShadowGrounding.boundary.databaseWriteAttempted)} />
                    </div>
                  </div>
                ) : null}
                {familyProfileGrounding ? (
                  <div className="border-y border-hairline py-3" data-route-b-feedback-family-profile-grounding="true">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-ink">人物資料回顧脈絡</p>
                      <Badge variant="outline" className="rounded-full">
                        {familyProfileGrounding.fieldCount} fields
                      </Badge>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
                      <ContextLine label="Raw metadata" value={String(familyProfileGrounding.boundary.rawMetadataIncluded)} />
                      <ContextLine label="Source refs" value={String(familyProfileGrounding.boundary.sourceReferenceIdsIncluded)} />
                      <ContextLine label="Provider call" value={String(familyProfileGrounding.boundary.providerCallAttempted)} />
                      <ContextLine label="CRM fact write" value={String(familyProfileGrounding.boundary.writesConfirmedCrmFact)} />
                    </div>
                  </div>
                ) : null}
                <p className="border-y border-hairline py-3 text-xs leading-5 text-muted-foreground">
                  {review.complianceReminder}
                </p>
              </>
            ) : null}

            {selectedFeedbackView.id === "perspectives" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Route B 五視角項目">
                  {review.sections.map((section) => (
                    <button
                      key={section.perspectiveId}
                      type="button"
                      role="tab"
                      aria-label={section.label}
                      aria-selected={selectedPerspective?.perspectiveId === section.perspectiveId}
                      className={cn(
                        "rounded-full border border-hairline px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedPerspective?.perspectiveId === section.perspectiveId
                          ? "bg-ink text-paper"
                          : "bg-paper text-muted-foreground hover:text-ink",
                      )}
                      onClick={() => setActivePerspectiveId(section.perspectiveId)}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
                {selectedPerspective ? (
                  <article className="border-y border-hairline py-3">
                    <h4 className="text-sm font-semibold text-ink">{selectedPerspective.label}</h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedPerspective.observation}</p>
                    <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
                      <ContextLine label="move" value={selectedPerspective.advisorMove} />
                      <ContextLine label="risk" value={selectedPerspective.riskOrUnknown} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedPerspective.evidenceBasis.map((item) => (
                        <Badge key={`${selectedPerspective.perspectiveId}-${item.source}-${item.label}`} variant="outline" className="rounded-full">
                          {item.label}:{item.count}
                        </Badge>
                      ))}
                    </div>
                  </article>
                ) : (
                  <p className="border-y border-dashed border-hairline py-3 text-sm leading-6 text-muted-foreground">
                    目前沒有可顯示的視角。
                  </p>
                )}
              </div>
            ) : null}

            {selectedFeedbackView.id === "redLines" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Route B 紅線項目">
                  {review.redLineFindings.map((finding) => (
                    <button
                      key={finding.redLineId}
                      type="button"
                      role="tab"
                      aria-label={finding.label}
                      aria-selected={selectedRedLine?.redLineId === finding.redLineId}
                      className={cn(
                        "rounded-full border border-hairline px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedRedLine?.redLineId === finding.redLineId
                          ? "bg-ink text-paper"
                          : "bg-paper text-muted-foreground hover:text-ink",
                      )}
                      onClick={() => setActiveRedLineId(finding.redLineId)}
                    >
                      {finding.label}
                    </button>
                  ))}
                </div>
                {selectedRedLine ? (
                  <article className="border-y border-hairline py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="min-w-0 text-sm font-semibold text-ink break-words">{selectedRedLine.label}</h4>
                      <Badge variant="outline" className="max-w-full shrink-0 rounded-full whitespace-normal text-left leading-5">
                        {selectedRedLine.severity}・{selectedRedLine.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {selectedRedLine.notApplicableReason ?? selectedRedLine.evidenceBasis}
                    </p>
                    {selectedRedLine.actionContext ? (
                      <p className="mt-3 border-y border-hairline py-2 text-xs leading-5 text-muted-foreground">
                        advisor action: {selectedRedLine.actionContext.state} / {selectedRedLine.actionContext.advisorReasonCode};
                        no legal advice, no formal finding, no CRM fact, no notification.
                      </p>
                    ) : null}
                  </article>
                ) : (
                  <p className="border-y border-dashed border-hairline py-3 text-sm leading-6 text-muted-foreground">
                    目前沒有紅線 findings。
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
    </div>
  );
}

function RouteBComplianceReviewIntakePanel({
  error,
  intake,
  onRefresh,
  status,
}: {
  error: string | null;
  intake: RouteBComplianceReviewIntake | null;
  onRefresh: () => Promise<void>;
  status: RouteBComplianceReviewIntakeStatus;
}) {
  const isBusy = status === "loading";
  const needsEvidenceCount = intake?.candidates.filter((candidate) => candidate.reviewStatus === "NEEDS_EVIDENCE").length ?? 0;
  const reviewRequiredCount = intake?.candidates.filter((candidate) => candidate.reviewStatus === "CANDIDATE_REVIEW_REQUIRED").length ?? 0;
  const [activeComplianceView, setActiveComplianceView] = useState<RouteBComplianceBrowserMode>("overview");
  const [activeCandidateId, setActiveCandidateId] = useState(intake?.candidates[0]?.id ?? "");
  const selectedCandidate =
    intake?.candidates.find((candidate) => candidate.id === activeCandidateId) ??
    intake?.candidates[0] ??
    null;
  const complianceViews: Array<{
    id: RouteBComplianceBrowserMode;
    icon: React.ReactNode;
    label: string;
    summary: string;
  }> = [
    {
      id: "overview",
      icon: <BrainCircuit className="h-4 w-4" />,
      label: "候選總覽",
      summary: intake ? `${intake.candidateCount} 個候選` : routeBReviewStatusText(status),
    },
    {
      id: "candidate",
      icon: <CircleAlert className="h-4 w-4" />,
      label: "候選",
      summary: selectedCandidate ? `${selectedCandidate.label}・${selectedCandidate.reviewStatus}` : "等待候選",
    },
    {
      id: "boundary",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "邊界",
      summary: intake ? `notification=${String(intake.reviewBoundary.triggersExternalNotification)}` : "no-provider",
    },
  ];
  const selectedComplianceView =
    complianceViews.find((view) => view.id === activeComplianceView) ?? complianceViews[0];

  return (
    <section
      className="space-y-4"
      data-route-b-compliance-inner-browser="true"
      data-route-b-compliance-inner-browser-active={selectedComplianceView.id}
    >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Compliance Intake
            </p>
            <h2 className="mt-1 text-sm font-semibold text-ink">待審閱候選</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              從已保存五視角回顧建立候選清單；需要佐證與升級審閱都不代表正式法遵處置，也不會發出真實通報。
            </p>
          </div>
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-full"
          disabled={isBusy}
          onClick={() => void onRefresh()}
          aria-label="讀取 Route B 紅線待審閱候選"
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          讀取候選
        </Button>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Route B 待審閱候選內層分類">
          {complianceViews.map((view) => (
            <Tooltip key={view.id}>
              <TooltipTrigger
                aria-label={view.label}
                aria-selected={selectedComplianceView.id === view.id}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedComplianceView.id === view.id
                    ? "bg-ink text-paper"
                    : "bg-paper text-muted-foreground hover:text-ink",
                )}
                onClick={() => setActiveComplianceView(view.id)}
                role="tab"
                type="button"
              >
                {view.icon}
              </TooltipTrigger>
              <TooltipContent>{view.label}</TooltipContent>
            </Tooltip>
          ))}
          <p className="min-w-0 flex-1 px-2 py-2 text-xs leading-5 text-muted-foreground">
            {selectedComplianceView.summary}
          </p>
        </div>

        {status === "error" ? (
          <p className="rounded-lg border border-hairline bg-paper px-3 py-2 text-sm leading-6 text-muted-foreground">
            {error ?? "Route B compliance-review intake failed."}
          </p>
        ) : null}

        {status === "empty" ? (
          <p className="rounded-lg border border-dashed border-hairline bg-paper px-3 py-3 text-sm leading-6 text-muted-foreground">
            尚未有可建立候選的保存回顧。請先保存五視角回顧，再讀取候選。
          </p>
        ) : null}

        {selectedComplianceView.id === "overview" ? (
          <RouteBInlineMetricRail
            metrics={[
              { label: "候選", value: intake?.candidateCount ?? 0 },
              { label: "需要佐證", value: needsEvidenceCount },
              { label: "升級候選", value: reviewRequiredCount },
            ]}
          />
        ) : null}

        {intake ? (
          <div className="space-y-3" data-route-b-compliance-view={selectedComplianceView.id}>
            {selectedComplianceView.id === "overview" ? (
              <>
                <div className="grid gap-2 border-y border-hairline py-3 text-sm text-muted-foreground">
                  <ContextLine label="Source" value={intake.sourceSurface} />
                  <ContextLine label="Provider call" value={String(intake.providerBoundary.providerCallAttempted)} />
                  <ContextLine label="AiUsageLog" value={String(intake.providerBoundary.aiUsageLogWritten)} />
                </div>
              </>
            ) : null}

            {selectedComplianceView.id === "candidate" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Route B 待審閱候選項目">
                  {intake.candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      role="tab"
                      aria-label={candidate.label}
                      aria-selected={selectedCandidate?.id === candidate.id}
                      className={cn(
                        "rounded-full border border-hairline px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedCandidate?.id === candidate.id
                          ? "bg-ink text-paper"
                          : "bg-paper text-muted-foreground hover:text-ink",
                      )}
                      onClick={() => setActiveCandidateId(candidate.id)}
                    >
                      {candidate.label}
                    </button>
                  ))}
                </div>
                {selectedCandidate ? (
                  <article className="border-y border-hairline py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="min-w-0 text-sm font-semibold text-ink break-words">{selectedCandidate.label}</h4>
                      <Badge
                        variant={selectedCandidate.actionState === "ESCALATE" ? "destructive" : "outline"}
                        className="max-w-full shrink-0 rounded-full whitespace-normal text-left leading-5"
                      >
                        {selectedCandidate.reviewStatus}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{selectedCandidate.safeSummary}</p>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                      <ContextLine label="Rule" value={selectedCandidate.ruleId} />
                      <ContextLine label="Action state" value={selectedCandidate.actionState} />
                      <ContextLine label="Reason" value={selectedCandidate.advisorReasonCode} />
                      <ContextLine label="Updated" value={selectedCandidate.updatedAt} />
                      <ContextLine label="Formal finding" value={String(!selectedCandidate.proof.noFormalFinding)} />
                      <ContextLine label="Notification" value={String(selectedCandidate.proof.triggersExternalNotification)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedCandidate.evidenceRefs.map((evidence) => (
                        <Badge key={evidence.id} variant="outline" className="max-w-full rounded-full whitespace-normal text-left leading-5">
                          {evidence.label}
                        </Badge>
                      ))}
                    </div>
                  </article>
                ) : (
                  <p className="border-y border-dashed border-hairline py-3 text-sm leading-6 text-muted-foreground">
                    目前沒有 `ESCALATE` 或 `EVIDENCE_NEEDED` 的候選；觀察中與不適用狀態不送入審閱候選。
                  </p>
                )}
              </div>
            ) : null}

            {selectedComplianceView.id === "boundary" ? (
              <>
                <div className="grid gap-2 border-y border-hairline py-3 text-sm text-muted-foreground">
                  <ContextLine label="Formal finding" value={String(intake.reviewBoundary.createsFormalFinding)} />
                  <ContextLine label="Real notification" value={String(intake.reviewBoundary.triggersExternalNotification)} />
                  <ContextLine label="Writes CRM fact" value={String(intake.reviewBoundary.writesConfirmedCrmFact)} />
                </div>
                <p className="border-y border-hairline py-3 text-xs leading-5 text-muted-foreground">
                  此區只建立 disabled/no-provider intake candidate；後續正式法遵 finding、通知、審閱 routing 或 CRM 寫回都需要另行授權與驗收。
                </p>
              </>
            ) : null}
          </div>
        ) : null}
    </section>
  );
}

function RouteBNextTurnPreviewPanel({
  appendCandidate,
  appendUsageLogId,
  draft,
  error,
  isAppending,
  onConfirmAppend,
  onGenerateProviderCandidate,
  onRefresh,
  providerCandidateError,
  providerCandidateStatus,
  snapshot,
  status,
}: {
  appendCandidate: TheaterRouteBNextTurnAppendCandidate | null;
  appendUsageLogId: string | null;
  draft: TheaterRouteBNextTurnDraft | null;
  error: string | null;
  isAppending: boolean;
  onConfirmAppend: (candidate: TheaterRouteBNextTurnAppendCandidate, usageLogId: string) => Promise<void>;
  onGenerateProviderCandidate: () => Promise<void>;
  onRefresh: () => Promise<void>;
  providerCandidateError: string | null;
  providerCandidateStatus: RouteBProviderCandidateStatus;
  snapshot: RouteBSessionSnapshot;
  status: "idle" | "loading" | "ready" | "error";
}) {
  const isLoading = status === "loading";
  const isGeneratingProviderCandidate = providerCandidateStatus === "generating";
  const speakerName =
    draft?.nextTurn.displayName ??
    routeBCharacterDisplayName(snapshot, draft?.nextTurn.speakerRouteBCharacterId) ??
    (draft?.nextTurn.role === "NARRATOR" ? "旁白" : "未選定");
  const addresseeName = routeBCharacterDisplayName(snapshot, draft?.nextTurn.addresseeRouteBCharacterId);
  const guardLines = draft ? nextTurnGuardLines(snapshot, draft) : [];
  const meetingSignalRuntimeGrounding = draft?.inputSummary.meetingRelationshipSignalGrounding;
  const relationshipEdgeShadowRuntimeGrounding = draft?.inputSummary.relationshipEdgeShadowGrounding;
  const familyProfileRuntimeGrounding = draft?.inputSummary.familyProfileGrounding;
  const canConfirmAppend = Boolean(appendCandidate && appendUsageLogId && draft?.status === "READY");
  const canGenerateProviderCandidate = Boolean(draft?.status === "READY" && !isGeneratingProviderCandidate);
  const runtimeSourceCount = [
    meetingSignalRuntimeGrounding?.usedInNextTurnRuntime,
    relationshipEdgeShadowRuntimeGrounding?.usedInNextTurnRuntime,
    familyProfileRuntimeGrounding?.usedInNextTurnRuntime,
  ].filter(Boolean).length;
  const guardCount = guardLines.length + (draft?.nextTurn.rationale.length ?? 0);
  const views: Array<{
    id: RouteBNextTurnBrowserMode;
    icon: React.ReactNode;
    label: string;
    summary: string;
  }> = [
    {
      id: "preview",
      icon: <MessageSquare className="h-4 w-4" />,
      label: "預覽",
      summary: draft ? `${speakerName}・${nextTurnStatusLabel(draft.status)}` : "尚未讀取 draft",
    },
    {
      id: "sources",
      icon: <BrainCircuit className="h-4 w-4" />,
      label: "來源",
      summary: draft ? `${runtimeSourceCount} 組 runtime source` : "等待 draft",
    },
    {
      id: "provider",
      icon: <Sparkles className="h-4 w-4" />,
      label: "Provider",
      summary: draft ? `callAttempted=${String(draft.providerBoundary.providerCallAttempted)}` : "provider locked",
    },
    {
      id: "guard",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Guard",
      summary: draft ? `${guardCount} 條 guard / rationale` : "等待 proof",
    },
  ];
  const [activeView, setActiveView] = useState<RouteBNextTurnBrowserMode>("preview");
  const selectedView = views.find((view) => view.id === activeView) ?? views[0];

  return (
    <section
      className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-hairline bg-background"
      data-route-b-next-turn-browser="true"
      data-route-b-next-turn-browser-active={selectedView.id}
    >
      <div className="border-b border-hairline p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Next-turn Browser
            </p>
            <h3 className="mt-1 text-sm font-semibold text-ink">下一回合預覽</h3>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              只讀取 no-provider draft；角色台詞與自動 append 仍等 provider success/error `AiUsageLog` proof。
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex shrink-0 gap-1" role="tablist" aria-label="Route B 下一回合預覽分類">
              {views.map((view) => (
                <Tooltip key={view.id}>
                  <TooltipTrigger
                    aria-label={view.label}
                    aria-selected={selectedView.id === view.id}
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selectedView.id === view.id
                        ? "bg-ink text-paper"
                        : "bg-paper text-muted-foreground hover:text-ink",
                    )}
                    onClick={() => setActiveView(view.id)}
                    role="tab"
                    type="button"
                  >
                    {view.icon}
                  </TooltipTrigger>
                  <TooltipContent>{view.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger
                aria-label="讀取 Route B 下一回合預覽"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-paper text-muted-foreground transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                disabled={isLoading}
                onClick={() => void onRefresh()}
                type="button"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </TooltipTrigger>
              <TooltipContent>{isLoading ? "讀取中" : "讀取預覽"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{selectedView.summary}</p>
      </div>

      {status === "error" ? (
        <p className="m-3 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm leading-6 text-muted-foreground">
          {error ?? "Route B next-turn preview failed."}
        </p>
      ) : null}

      <div className="p-3" data-route-b-next-turn-view={selectedView.id}>
        {draft ? (
          <>
            {selectedView.id === "preview" ? (
              <div className="space-y-3">
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
                <div className="grid gap-2 border-y border-hairline py-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <ContextLine label="下一位" value={speakerName} />
                  <ContextLine label="對象" value={addresseeName ?? "群聊／未指定"} />
                  <ContextLine label="State proposals" value={String(draft.persistenceEnvelope.statePatchCount)} />
                  <ContextLine label="Writes CRM fact" value={String(draft.persistenceEnvelope.writesConfirmedCrmFact)} />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{draft.nextTurn.contentPreview}</p>
              </div>
            ) : null}

            {selectedView.id === "sources" ? (
              <div className="space-y-3">
                {meetingSignalRuntimeGrounding?.usedInNextTurnRuntime ? (
                  <RouteBNextTurnMeetingSignalRuntimeGroundingPanel grounding={meetingSignalRuntimeGrounding} />
                ) : null}
                {relationshipEdgeShadowRuntimeGrounding?.usedInNextTurnRuntime ? (
                  <RouteBNextTurnRelationshipEdgeShadowRuntimeGroundingPanel grounding={relationshipEdgeShadowRuntimeGrounding} />
                ) : null}
                {familyProfileRuntimeGrounding?.usedInNextTurnRuntime ? (
                  <RouteBNextTurnFamilyProfileRuntimeGroundingPanel grounding={familyProfileRuntimeGrounding} />
                ) : null}
                {!runtimeSourceCount ? (
                  <p className="rounded-lg border border-dashed border-hairline bg-paper px-3 py-3 text-sm leading-6 text-muted-foreground">
                    此 draft 尚未帶入 runtime source grounding。
                  </p>
                ) : null}
              </div>
            ) : null}

            {selectedView.id === "provider" ? (
              <div className="space-y-3">
                <div className="grid gap-2 border-y border-hairline py-3 text-sm text-muted-foreground">
                  <ContextLine label="Call attempted" value={String(draft.providerBoundary.providerCallAttempted)} />
                  <ContextLine label="AiUsageLog" value={String(draft.providerBoundary.aiUsageLogWritten)} />
                  <ContextLine label="Raw provider" value={String(draft.providerBoundary.storesRawProviderPayload)} />
                  <ContextLine label="Private dialog" value={String(draft.privacyProof.directPrivateDialogReturned)} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="mono"
                    className="rounded-full"
                    disabled={!canGenerateProviderCandidate}
                    aria-disabled={!canGenerateProviderCandidate}
                    onClick={() => void onGenerateProviderCandidate()}
                  >
                    {isGeneratingProviderCandidate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isGeneratingProviderCandidate ? "產生中" : appendCandidate ? "重新產生候選" : "產生角色候選"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
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
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Provider candidate 必須已寫入 success `AiUsageLog` 並附 usageLogId；append 本身不呼叫 provider、不儲存 raw provider payload、不寫 CRM confirmed fact。
                </p>
                {appendUsageLogId && appendCandidate ? (
                  <p className="border-y border-hairline py-2 text-xs leading-5 text-muted-foreground">
                    usageLogId 已取得；requiresAdvisorConfirmation={String(appendCandidate.requiresAdvisorConfirmation)}・storesRawProviderPayload={String(appendCandidate.storesRawProviderPayload)}
                  </p>
                ) : null}
                {providerCandidateStatus === "error" ? (
                  <p className="border-y border-hairline py-2 text-xs leading-5 text-muted-foreground">
                    {providerCandidateError ?? "Route B provider candidate generation failed."}
                  </p>
                ) : null}
              </div>
            ) : null}

            {selectedView.id === "guard" ? (
              <div className="divide-y divide-hairline border-y border-hairline">
                {[...guardLines.map((line) => `guard: ${line}`), ...draft.nextTurn.rationale.map((line) => `rationale: ${line}`)].map((line, index) => (
                  <p key={`${line}-${index}`} className="py-2 text-xs leading-5 text-muted-foreground">
                    {line}
                  </p>
                ))}
                {!guardCount ? (
                  <p className="py-3 text-sm leading-6 text-muted-foreground">目前沒有 guard 或 rationale。</p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-hairline bg-paper px-3 py-3 text-sm leading-6 text-muted-foreground">
            尚未讀取下一回合。顧問寫入群聊或私聊後會自動嘗試讀取，也可以手動按「讀取預覽」。
          </p>
        )}
      </div>
    </section>
  );
}

function RouteBNextTurnMeetingSignalRuntimeGroundingPanel({
  grounding,
}: {
  grounding: RouteBMeetingSignalRuntimeGrounding;
}) {
  return (
    <div
      className="mt-3 rounded-lg border border-hairline bg-background px-3 py-3"
      data-route-b-next-turn-meeting-signal-runtime-grounding="true"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full">
          meeting signals in runtime
        </Badge>
        <span className="text-xs leading-5 text-muted-foreground">
          {grounding.cardCount} cards・{grounding.unknownCount} unknowns・{grounding.narratorQuestionCount} narrator prompts
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {grounding.cards.slice(0, 2).map((card) => (
          <div key={card.cardLabel} className="rounded-md border border-hairline bg-paper px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {routeBMeetingSignalStatusLabel(card.status)}
              </Badge>
              <span className="rounded-full border border-hairline bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                {card.actionLabel}
              </span>
              <span className="rounded-full border border-hairline bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                {card.priorityLabel}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{card.summary}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
        <ContextLine label="Raw meeting id" value={String(grounding.boundary.rawMeetingSessionIdIncluded)} />
        <ContextLine label="Person id" value={String(grounding.boundary.rawPersonIdIncluded)} />
        <ContextLine label="Source refs" value={String(grounding.boundary.sourceReferenceIdsIncluded)} />
        <ContextLine label="Provider payload" value={String(grounding.boundary.rawProviderPayloadIncluded)} />
      </div>
    </div>
  );
}

function RouteBNextTurnRelationshipEdgeShadowRuntimeGroundingPanel({
  grounding,
}: {
  grounding: RouteBRelationshipEdgeShadowRuntimeGrounding;
}) {
  const edgeTypes = Object.entries(grounding.edgeTypeCounts).slice(0, 3);
  const factStatuses = Object.entries(grounding.factStatusCounts).slice(0, 3);

  return (
    <div
      className="mt-3 rounded-lg border border-hairline bg-background px-3 py-3"
      data-route-b-next-turn-edge-shadow-runtime-grounding="true"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full">
          edge shadow in runtime
        </Badge>
        <span className="text-xs leading-5 text-muted-foreground">
          {grounding.candidateEdgeCount} edges・{grounding.sourceMemberCount} people・{grounding.unsupportedRelationCount} unsupported
        </span>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-hairline bg-paper px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">edge types</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {edgeTypes.length ? edgeTypes.map(([key, count]) => `${key} ${count}`).join("・") : "none"}
          </p>
        </div>
        <div className="rounded-md border border-hairline bg-paper px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">fact status</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {factStatuses.length ? factStatuses.map(([key, count]) => `${key} ${count}`).join("・") : "none"}
          </p>
        </div>
      </div>

      {grounding.warningCodes.length ? (
        <p className="mt-2 rounded-md border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground">
          warnings: {grounding.warningCodes.slice(0, 3).join("・")}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
        <ContextLine label="Raw draft edges" value={String(grounding.boundary.rawDraftEdgesIncluded)} />
        <ContextLine label="Client-facing edges" value={String(grounding.boundary.clientFacingDraftEdgesReturned)} />
        <ContextLine label="Formal schema" value={String(grounding.boundary.formalSchemaApproved)} />
        <ContextLine label="Graph write" value={String(grounding.boundary.writesRelationshipGraph)} />
      </div>
    </div>
  );
}

function RouteBNextTurnFamilyProfileRuntimeGroundingPanel({
  grounding,
}: {
  grounding: RouteBFamilyProfileRuntimeGrounding;
}) {
  const statusText = routeBCountMapText(grounding.factStatusCounts, "none");

  return (
    <div
      className="mt-3 rounded-lg border border-hairline bg-background px-3 py-3"
      data-route-b-next-turn-family-profile-runtime-grounding="true"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full">
          family profile in runtime
        </Badge>
        <span className="text-xs leading-5 text-muted-foreground">
          {grounding.profiledMemberCount} people・{grounding.fieldCount} fields・{grounding.unknownFieldCount} unknowns
        </span>
      </div>

      <div className="mt-2 rounded-md border border-hairline bg-paper px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">fact status</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{statusText}</p>
      </div>

      <div className="mt-2 space-y-2">
        {grounding.fields.slice(0, 3).map((field) => (
          <div key={`${field.memberLabel}-${field.fieldLabel}-${field.valueSummary}`} className="rounded-md border border-hairline bg-paper px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {routeBFamilyProfileRuntimeStatusLabel(field.status)}
              </Badge>
              <span className="rounded-full border border-hairline bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                {field.relationLabel}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-ink">
              {field.memberLabel}・{field.fieldLabel}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{field.valueSummary}</p>
          </div>
        ))}
      </div>

      {grounding.unknownPrompts.length ? (
        <p className="mt-2 rounded-md border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground">
          unknown prompts: {grounding.unknownPrompts.slice(0, 2).join("・")}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
        <ContextLine label="Raw metadata" value={String(grounding.boundary.rawMetadataIncluded)} />
        <ContextLine label="Source refs" value={String(grounding.boundary.sourceReferenceIdsIncluded)} />
        <ContextLine label="Provider payload" value={String(grounding.boundary.rawProviderPayloadIncluded)} />
        <ContextLine label="Graph write" value={String(grounding.boundary.writesRelationshipGraph)} />
        <ContextLine label="VisitPlan write" value={String(grounding.boundary.writesVisitPlan)} />
        <ContextLine label="CRM fact write" value={String(grounding.boundary.writesConfirmedCrmFact)} />
      </div>
    </div>
  );
}

function routeBFamilyProfileRuntimeStatusLabel(status: RouteBFamilyProfileRuntimeGrounding["fields"][number]["status"]) {
  if (status === "confirmed") return "confirmed";
  if (status === "inference") return "inference";
  return "unknown";
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

function RouteBMiniCount({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-hairline bg-background px-2 py-1.5">
      <p className="text-sm font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function RouteBInlineMetricRail({ metrics }: { metrics: Array<{ label: string; value: number | string }> }) {
  return (
    <dl
      className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-hairline py-2 text-xs text-muted-foreground"
      data-route-b-inline-metrics="true"
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="inline-flex min-w-0 items-baseline gap-1.5">
          <dt className="order-2 min-w-0 break-words">{metric.label}</dt>
          <dd className="order-1 text-sm font-semibold tabular-nums text-ink">{metric.value}</dd>
        </div>
      ))}
    </dl>
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
  const isComment = isRouteBCommentTurn(turn);
  const content = isComment ? turn.content.replace(ROUTE_B_COMMENT_PREFIX, "").trim() : turn.content;
  const speaker =
    (isComment ? "情境注記" : null) ??
    snapshot.characters.find((character) => character.routeBCharacterId === turn.speakerRouteBCharacterId)?.displayName ??
    (turn.role === "ADVISOR" || turn.role === "AGENT"
      ? "顧問"
      : turn.role === "DIRECTOR" || turn.role === "SYSTEM"
        ? "導演"
        : turn.role === "NARRATOR"
          ? "旁白"
          : turn.role);

  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-paper px-3 py-3",
        isComment && "border-dashed bg-background",
      )}
      data-route-b-comment-turn={isComment ? "true" : undefined}
      data-provider-call-attempted="false"
      data-writes-confirmed-crm-fact="false"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          {isComment ? <StickyNote className="h-3.5 w-3.5" /> : null}
          {speaker}
        </p>
        <Badge variant="outline" className="rounded-full">
          {turn.visibilityScope ? ROUTE_B_SCOPE_LABEL[turn.visibilityScope] ?? turn.visibilityScope : "群聊"}
        </Badge>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{content}</p>
      {isComment ? (
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          Comment mode：只作情境注記與待確認 state proposal，不觸發 provider、不寫 CRM confirmed fact。
        </p>
      ) : null}
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

function isRouteBCommentTurn(turn: RouteBSessionSnapshot["turns"][number]) {
  return turn.content.trim().startsWith(ROUTE_B_COMMENT_PREFIX);
}

function routeBVisibilityText(record: Record<string, unknown>): string {
  const label = typeof record.label === "string" ? record.label : routeBRecordText(record);
  const visibleTo = typeof record.visibleTo === "string" ? record.visibleTo : "UNKNOWN";
  const canQuote = record.canBeQuotedInGroup === true ? "可引用" : "不可引用";
  return `${label}・${visibleTo}・${canQuote}`;
}

function routeBMeetingSignalStatusLabel(status: RouteBMeetingSignalGrounding["cards"][number]["status"]): string {
  if (status === "confirmed") return "FACT";
  if (status === "inference") return "INFERENCE";
  return "UNKNOWN";
}

function routeBMeetingSignalActionLabel(action: string): string {
  if (action === "CREATE_CONFIRMATION_CARD") return "確認卡";
  if (action === "ASK_IN_NEXT_VISIT") return "補問";
  if (action === "KEEP_AS_CONTEXT") return "脈絡";
  return action || "脈絡";
}

function routeBMeetingSignalPriorityLabel(priority: string): string {
  if (priority === "high") return "高優先";
  if (priority === "medium") return "中優先";
  if (priority === "low") return "低優先";
  return priority || "未分級";
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

function isSafeRouteBProviderCandidate(candidate: TheaterRouteBNextTurnAppendCandidate): boolean {
  return (
    candidate.generatedTextAllowed === true &&
    candidate.requiresAdvisorConfirmation === true &&
    candidate.writesConfirmedCrmFact === false &&
    candidate.storesRawProviderPayload === false &&
    candidate.rawPrivateTranscriptIncluded === false &&
    candidate.content.trim().length > 0
  );
}

function isRouteBComplianceReviewIntakePayload(value: unknown): value is RouteBComplianceReviewIntake {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const payload = value as Partial<RouteBComplianceReviewIntake>;
  const reviewBoundary = payload.reviewBoundary;
  const providerBoundary = payload.providerBoundary;

  return (
    payload.agentId === "asai.theater.route_b" &&
    payload.actionId === "route-b-red-line-compliance-review-intake" &&
    payload.registryReadiness === "internal-only" &&
    payload.sourceActionId === "route-b-red-line-action-feedback-consumption" &&
    Array.isArray(payload.candidates) &&
    reviewBoundary?.createsFormalFinding === false &&
    reviewBoundary.triggersExternalNotification === false &&
    reviewBoundary.writesConfirmedCrmFact === false &&
    providerBoundary?.providerCallAttempted === false &&
    providerBoundary.aiUsageLogWritten === false
  );
}

function isRouteBRedLineActionPersistencePayload(value: unknown): value is RouteBRedLineActionPersistenceState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const payload = value as Partial<RouteBRedLineActionPersistenceState>;

  return (
    payload.agentId === "asai.theater.route_b" &&
    payload.actionId === "route-b-severe-red-line-action-persistence" &&
    payload.registryReadiness === "internal-only" &&
    payload.sourceActionId === "route-b-severe-red-line-action-workflow" &&
    Array.isArray(payload.records) &&
    payload.records.every(
      (record) =>
        Boolean(record) &&
        typeof record === "object" &&
        !Array.isArray(record) &&
        typeof record.ruleId === "string" &&
        typeof record.state === "string" &&
        typeof record.advisorReasonCode === "string" &&
        typeof record.updatedAt === "string",
    )
  );
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
