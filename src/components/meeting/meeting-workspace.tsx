"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Mic,
  NotebookPen,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MEETING_DATA_CLASS_LABEL,
  type MeetingActionItem,
  type MeetingCitation,
  type MeetingDataClass,
  type MeetingParticipant,
  type MeetingSummaryItem,
} from "@/domains/interview/meeting";

type TurnSource = "MANUAL_NOTE" | "VOICE_FINAL_TRANSCRIPT";
type BootstrapState = "loading" | "ready" | "error";
type RequestState = "idle" | "saving" | "summarizing";
type WritebackState = "idle" | "loading" | "saving";
type MeetingWritebackCandidateKind = "CONFIRMED_FACT" | "INFERENCE" | "UNKNOWN" | "ACTION_ITEM";
type MeetingWritebackTarget = "CRM_CANDIDATE" | "INTERVIEW_INSIGHT" | "FOLLOW_UP_TASK" | "BLOCKED";
type MeetingWritebackSensitivity = "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE";

interface MeetingWorkspaceProps {
  planId: string;
  initialSessionId?: string;
  backHref: string;
}

interface MeetingSessionDto {
  id: string;
  clientId: string | null;
  status: string;
  title: string | null;
  startedAt: string;
  updatedAt: string;
}

interface MeetingTurnDto {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  modality: "TEXT" | "VOICE_REALTIME" | "VOICE_TRANSCRIPT_FALLBACK";
  content: string;
  transcriptFinal: boolean;
  outlineSegmentId: string | null;
  occurredAt: string;
  createdAt: string;
}

interface MeetingMemoryDto {
  id: string;
  clientId: string | null;
  turnId: string | null;
  dataClass: string;
  visibilityScope: string;
  text: string;
  evidenceText: string | null;
  importance: number;
  createdAt: string;
}

interface MeetingMemoryRailDto {
  total: number;
  confirmed: number;
  inferences: number;
  unknowns: number;
  memberPrivate: number;
  clientLinked: number;
}

interface MeetingSafetyDto {
  scopeSource: "server_session";
  visibilityScope: "member-private";
  providerCallAttempted: boolean;
  aiUsageLogRequired: boolean;
  rawAudioStored?: false;
  rawProviderPayloadStored?: false;
  rawPrivateTranscriptSidecarStored?: false;
  storesAudioBinary?: false;
  storesRawProviderPayload?: false;
  storesRawPrivateTranscriptSidecar?: false;
  writesConfirmedCrmFact: false;
  aiUsageLogWritten?: false;
}

interface MeetingSessionSnapshotDto {
  session: MeetingSessionDto;
  turns: MeetingTurnDto[];
  memories: MeetingMemoryDto[];
  memoryRail: MeetingMemoryRailDto;
  safety: MeetingSafetyDto;
}

interface PersistedMeetingSummaryDto {
  id: string;
  sessionId: string;
  generatedBy: string;
  headline: string;
  summary: string;
  decisions: MeetingSummaryItem[];
  actionItems: MeetingActionItem[];
  openQuestions: MeetingSummaryItem[];
  participants: MeetingParticipant[];
  citations: MeetingCitation[];
  sourceTurnIds: string[];
  sourceMemoryIds: string[];
  provider: string | null;
  model: string | null;
  usageLogId: string | null;
  guardEvidence: {
    providerCallAttempted: boolean;
    dbWriteAttempted: false;
    storesAudioBinary: false;
    storesPrivateTranscript: false;
    writesConfirmedCrmFact: false;
    generatedBy: "deterministic-skeleton" | "provider-json";
  } | null;
  createdAt: string;
  updatedAt: string;
}

type MeetingSummaryReadResponse =
  | {
      status: "found";
      summary: PersistedMeetingSummaryDto;
      safety: MeetingSafetyDto;
    }
  | {
      status: "empty";
      safety: MeetingSafetyDto;
    };

interface MeetingSummaryWriteResponse {
  status: "created" | "updated";
  summary: PersistedMeetingSummaryDto;
  safety: MeetingSafetyDto;
}

interface MeetingWritebackCandidateDto {
  id: string;
  kind: MeetingWritebackCandidateKind;
  sourceType: "MEETING_DECISION" | "MEETING_ACTION_ITEM" | "MEETING_OPEN_QUESTION";
  sourceItemId: string;
  text: string;
  target: MeetingWritebackTarget;
  dataClass: MeetingDataClass;
  sensitivity: MeetingWritebackSensitivity;
  citationTurnIds: string[];
  supportingMemoryIds: string[];
  canSelect: boolean;
  requiresReason: boolean;
  reasonHint?: string;
  blockedReason?: string;
  crmWritebackCandidate: boolean;
  writesConfirmedCrmFact: false;
}

interface MeetingWritebackSafetyDto {
  scopeSource: "server_session";
  visibilityScope: "member-private";
  providerCallAttempted: false;
  aiUsageLogRequired: false;
  aiUsageLogWritten: false;
  storesAudioBinary: false;
  storesRawProviderPayload: false;
  storesRawPrivateTranscriptSidecar: false;
  writesConfirmedCrmFact: false;
  crmFactRequiresHumanConfirmation: true;
  inferenceNeverCrmFact: true;
  actionItemsCreateTasksOnly: true;
}

interface MeetingWritebackReadyDto {
  status: "ready";
  sessionId: string;
  clientId: string | null;
  clientSensitivity: "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE" | null;
  summary: {
    id: string;
    headline: string;
    schemaVersion: string;
    sourceTurnIds: string[];
    sourceMemoryIds: string[];
  };
  sourceCounts: {
    decisions: number;
    actionItems: number;
    openQuestions: number;
  };
  candidates: MeetingWritebackCandidateDto[];
  safety: MeetingWritebackSafetyDto;
}

interface MeetingWritebackSummaryRequiredDto {
  status: "summary_required";
  sessionId: string;
  clientId: string | null;
  candidates: [];
  safety: MeetingWritebackSafetyDto;
}

type MeetingWritebackPreviewDto = MeetingWritebackReadyDto | MeetingWritebackSummaryRequiredDto;

interface MeetingWritebackResultDto extends Omit<MeetingWritebackReadyDto, "status"> {
  status: "saved";
  createdEvents: {
    id: string;
    candidateId: string;
    target: MeetingWritebackTarget;
    title: string;
    occurredAt: string;
  }[];
  blocked: {
    candidateId: string;
    reason: string;
  }[];
  skipped: string[];
}

interface CandidateApprovalState {
  reason: string;
  riskAccepted: boolean;
}

const EMPTY_SUMMARY_NOTICE = "加入至少一段會議內容後，就能生成可引用的摘要。";
const DEFAULT_NOTE = "客戶確認想先補退休缺口；待確認是否邀請配偶一起評估。";
const DEFAULT_FINAL_TRANSCRIPT =
  "客戶確認目前每月可增加保費約一萬元，仍不確定醫療實支實付與退休現金流的優先順序。";

const requestHeaders = {
  "content-type": "application/json",
};

export function MeetingWorkspace({ planId, initialSessionId, backHref }: MeetingWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>("loading");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [snapshot, setSnapshot] = useState<MeetingSessionSnapshotDto | null>(null);
  const [summary, setSummary] = useState<PersistedMeetingSummaryDto | null>(null);
  const [writebackPreview, setWritebackPreview] = useState<MeetingWritebackPreviewDto | null>(null);
  const [writebackResult, setWritebackResult] = useState<MeetingWritebackResultDto | null>(null);
  const [writebackSelections, setWritebackSelections] = useState<string[]>([]);
  const [writebackApprovals, setWritebackApprovals] = useState<Record<string, CandidateApprovalState>>({});
  const [writebackState, setWritebackState] = useState<WritebackState>("idle");
  const [writebackError, setWritebackError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState(DEFAULT_NOTE);
  const [finalTranscriptDraft, setFinalTranscriptDraft] = useState(DEFAULT_FINAL_TRANSCRIPT);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState("正在連接會議工作台");

  const sessionId = snapshot?.session.id ?? initialSessionId ?? "";
  const isSaving = requestState === "saving";
  const isSummarizing = requestState === "summarizing";
  const canSubmit = Boolean(snapshot) && !isSaving && !isSummarizing;
  const turnCount = snapshot?.turns.length ?? 0;
  const memoryRail = snapshot?.memoryRail;
  const transcriptFinalCount = useMemo(
    () => snapshot?.turns.filter((turn) => turn.transcriptFinal).length ?? 0,
    [snapshot?.turns],
  );

  const resetWritebacks = useCallback(() => {
    setWritebackPreview(null);
    setWritebackResult(null);
    setWritebackSelections([]);
    setWritebackApprovals({});
    setWritebackError(null);
  }, []);

  const updateSessionUrl = useCallback(
    (nextSessionId: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set("sessionId", nextSessionId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const loadWritebacks = useCallback(async (nextSessionId: string, signal?: AbortSignal) => {
    setWritebackState("loading");
    setWritebackError(null);

    try {
      const nextPreview = await readMeetingWritebacks(nextSessionId, signal);
      const validCandidateIds =
        nextPreview.status === "ready" ? new Set(nextPreview.candidates.map((candidate) => candidate.id)) : new Set<string>();

      setWritebackPreview(nextPreview);
      setWritebackResult(null);
      setWritebackSelections((current) => current.filter((candidateId) => validCandidateIds.has(candidateId)));
      setWritebackApprovals((current) => {
        const nextApprovals: Record<string, CandidateApprovalState> = {};
        for (const [candidateId, approval] of Object.entries(current)) {
          if (validCandidateIds.has(candidateId)) nextApprovals[candidateId] = approval;
        }
        return nextApprovals;
      });
      return nextPreview;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      setWritebackError(error instanceof Error ? error.message : "MEETING_WRITEBACK_READ_FAILED");
      throw error;
    } finally {
      setWritebackState("idle");
    }
  }, []);

  const loadSummary = useCallback(
    async (nextSessionId: string, signal?: AbortSignal) => {
      const nextSummary = await readMeetingSummary(nextSessionId, signal);
      setSummary(nextSummary);

      if (nextSummary) {
        try {
          await loadWritebacks(nextSessionId, signal);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") throw error;
        }
      } else {
        resetWritebacks();
      }
    },
    [loadWritebacks, resetWritebacks],
  );

  const refreshSnapshot = useCallback(
    async (nextSessionId: string, signal?: AbortSignal) => {
      const nextSnapshot = await readMeetingSession(nextSessionId, signal);
      setSnapshot(nextSnapshot);
      await loadSummary(nextSnapshot.session.id, signal);
      return nextSnapshot;
    },
    [loadSummary],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function bootstrap() {
      setBootstrapState("loading");
      setErrorMessage(null);

      try {
        const nextSnapshot = initialSessionId
          ? await readMeetingSession(initialSessionId, controller.signal)
          : await createMeetingSession(planId, controller.signal);

        if (cancelled) return;

        setSnapshot(nextSnapshot);
        setBootstrapState("ready");
        setLastAction(initialSessionId ? "已讀回既有會議" : "已建立新的會議 session");

        if (!initialSessionId) {
          updateSessionUrl(nextSnapshot.session.id);
        }

        await loadSummary(nextSnapshot.session.id, controller.signal);
      } catch (error) {
        if (cancelled) return;
        setBootstrapState("error");
        setErrorMessage(error instanceof Error ? error.message : "MEETING_WORKSPACE_BOOTSTRAP_FAILED");
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialSessionId, loadSummary, planId, updateSessionUrl]);

  const handleAppendTurn = useCallback(
    async (source: TurnSource) => {
      if (!snapshot) return;

      const content = source === "MANUAL_NOTE" ? noteDraft.trim() : finalTranscriptDraft.trim();
      if (!content) {
        setErrorMessage("請先輸入要加入會議的內容。");
        return;
      }

      setRequestState("saving");
      setErrorMessage(null);

      try {
        await appendMeetingTurn(snapshot.session.id, source, content);
        const nextSnapshot = await refreshSnapshot(snapshot.session.id);
        setLastAction(source === "MANUAL_NOTE" ? "已加入手動筆記" : "已加入 final transcript");
        if (source === "MANUAL_NOTE") setNoteDraft("");
        if (source === "VOICE_FINAL_TRANSCRIPT") setFinalTranscriptDraft("");
        if (summary && nextSnapshot.turns.length > turnCount) {
          setSummary(null);
          resetWritebacks();
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "MEETING_TURN_APPEND_FAILED");
      } finally {
        setRequestState("idle");
      }
    },
    [finalTranscriptDraft, noteDraft, refreshSnapshot, resetWritebacks, snapshot, summary, turnCount],
  );

  const handleGenerateSummary = useCallback(async () => {
    if (!snapshot) return;

    setRequestState("summarizing");
    setErrorMessage(null);

    try {
      const nextSummary = await generateMeetingSummary(snapshot.session.id);
      setSummary(nextSummary);
      setLastAction("已生成 deterministic/no-provider 會議摘要與寫回候選");
      await refreshSnapshot(snapshot.session.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "MEETING_SUMMARY_GENERATION_FAILED");
    } finally {
      setRequestState("idle");
    }
  }, [refreshSnapshot, snapshot]);

  const handleReloadWritebacks = useCallback(async () => {
    if (!sessionId) return;

    try {
      await loadWritebacks(sessionId);
    } catch (error) {
      setWritebackError(error instanceof Error ? error.message : "MEETING_WRITEBACK_READ_FAILED");
    }
  }, [loadWritebacks, sessionId]);

  const handleToggleWritebackCandidate = useCallback((candidateId: string) => {
    setWritebackSelections((current) =>
      current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId],
    );
  }, []);

  const handleSelectAllWritebackCandidates = useCallback(() => {
    if (writebackPreview?.status !== "ready") return;
    setWritebackSelections(writebackPreview.candidates.filter((candidate) => candidate.canSelect).map((candidate) => candidate.id));
  }, [writebackPreview]);

  const handleClearWritebackCandidates = useCallback(() => {
    setWritebackSelections([]);
    setWritebackResult(null);
    setWritebackError(null);
  }, []);

  const handleUpdateWritebackApproval = useCallback((candidateId: string, patch: Partial<CandidateApprovalState>) => {
    setWritebackApprovals((current) => ({
      ...current,
      [candidateId]: {
        reason: current[candidateId]?.reason ?? "",
        riskAccepted: current[candidateId]?.riskAccepted ?? false,
        ...patch,
      },
    }));
  }, []);

  const handleSaveWritebacks = useCallback(async () => {
    if (!sessionId || writebackPreview?.status !== "ready") return;

    if (writebackSelections.length === 0) {
      setWritebackError("請先勾選至少一個會議寫回候選。");
      return;
    }

    setWritebackState("saving");
    setWritebackError(null);

    try {
      const result = await saveMeetingWritebacks(sessionId, {
        candidateIds: writebackSelections,
        approvals: writebackSelections.map((candidateId) => ({
          candidateId,
          reason: writebackApprovals[candidateId]?.reason?.trim() || undefined,
          riskAccepted: writebackApprovals[candidateId]?.riskAccepted === true,
        })),
      });

      if (result.status === "summary_required") {
        setWritebackPreview(result);
        setWritebackResult(null);
        setWritebackSelections([]);
        return;
      }

      setWritebackResult(result);
      setWritebackPreview(toWritebackPreview(result));
      setWritebackSelections([]);
      setLastAction("已保存會議寫回確認結果");
    } catch (error) {
      setWritebackError(error instanceof Error ? error.message : "MEETING_WRITEBACK_SAVE_FAILED");
    } finally {
      setWritebackState("idle");
    }
  }, [sessionId, writebackApprovals, writebackPreview, writebackSelections]);

  const handleManualRefresh = useCallback(async () => {
    if (!snapshot) return;

    setRequestState("saving");
    setErrorMessage(null);

    try {
      await refreshSnapshot(snapshot.session.id);
      setLastAction("已重新讀取會議資料");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "MEETING_REFRESH_FAILED");
    } finally {
      setRequestState("idle");
    }
  }, [refreshSnapshot, snapshot]);

  if (bootstrapState === "loading") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">正在開啟 AI 會議工作台...</p>
      </div>
    );
  }

  if (bootstrapState === "error") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="size-7 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold text-ink">AI 會議暫時無法開啟</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{errorMessage}</p>
        <Button type="button" variant="mono" className="mt-5 rounded-lg" onClick={() => router.push(backHref)}>
          回準備包
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="meeting-workspace" className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <div data-testid="meeting-session-id" data-session-id={sessionId} className="sr-only">
        會議 session 已就緒
      </div>

      <header className="grid gap-4 border-b border-hairline pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="mb-3 h-9 rounded-lg px-2.5 text-muted-foreground"
            onClick={() => router.push(backHref)}
          >
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            回準備包
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">AI 會議</Badge>
            <Badge variant="outline">CLIENT_MEETING</Badge>
            <Badge variant="outline">No provider</Badge>
          </div>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            <Mic className="size-7 text-[#1A3A6B]" aria-hidden="true" />
            會議工作台
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            從這份準備包建立會議 session，捕捉手動筆記與 final transcript，並生成可引用摘要。
          </p>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 lg:min-w-[390px]">
          <MetricCard label="段落" value={String(turnCount)} testId="meeting-turn-count" />
          <MetricCard label="記憶" value={String(memoryRail?.total ?? 0)} />
          <MetricCard label="Final" value={String(transcriptFinalCount)} />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="min-w-0 rounded-lg border border-hairline bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">捕捉會議內容</p>
              <p className="mt-1 text-xs text-muted-foreground">{lastAction}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg"
              onClick={handleManualRefresh}
              disabled={!canSubmit}
            >
              {requestState === "saving" ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCcw className="mr-2 size-4" aria-hidden="true" />
              )}
              重新讀取
            </Button>
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-2">
            <CaptureBox
              title="手動筆記"
              description="用於顧問補充觀察、決策脈絡或待確認事項。"
              icon={<NotebookPen className="size-4" aria-hidden="true" />}
              value={noteDraft}
              placeholder="輸入這場會議的手動筆記..."
              disabled={!canSubmit}
              buttonLabel="加入筆記"
              onChange={setNoteDraft}
              onSubmit={() => handleAppendTurn("MANUAL_NOTE")}
              isBusy={requestState === "saving"}
              testId="meeting-note-input"
            />
            <CaptureBox
              title="Final transcript"
              description="用於貼上已完成的轉寫段落；不保存 raw audio。"
              icon={<Mic className="size-4" aria-hidden="true" />}
              value={finalTranscriptDraft}
              placeholder="貼上 final transcript 段落..."
              disabled={!canSubmit}
              buttonLabel="加入 final transcript"
              onChange={setFinalTranscriptDraft}
              onSubmit={() => handleAppendTurn("VOICE_FINAL_TRANSCRIPT")}
              isBusy={requestState === "saving"}
              testId="meeting-transcript-input"
            />
          </div>

          {errorMessage ? (
            <div className="mx-4 mb-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{errorMessage}</p>
            </div>
          ) : null}

          <div className="border-t border-hairline p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">會議逐字段落</p>
                <p className="mt-1 text-xs text-muted-foreground">來源以 server-side BFF 持久化，refresh 後可讀回。</p>
              </div>
              <Badge variant="outline">{turnCount} 段</Badge>
            </div>
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {snapshot?.turns.length ? (
                snapshot.turns.map((turn) => <TurnCard key={turn.id} turn={turn} memories={snapshot.memories} />)
              ) : (
                <EmptyState
                  icon={<ClipboardList className="size-5" aria-hidden="true" />}
                  title="還沒有會議內容"
                  description="加入手動筆記或 final transcript 後，這裡會顯示已持久化段落。"
                />
              )}
            </div>
          </div>
        </section>

        <aside className="min-w-0 space-y-5">
          <section data-testid="meeting-memory-rail" className="rounded-lg border border-hairline bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Park 記憶軌</p>
                <p className="mt-1 text-xs text-muted-foreground">只建立 member-private 候選記憶。</p>
              </div>
              <ShieldCheck className="size-5 text-[#1A3A6B]" aria-hidden="true" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <RailMetric label="已確認" value={memoryRail?.confirmed ?? 0} />
              <RailMetric label="推論" value={memoryRail?.inferences ?? 0} />
              <RailMetric label="未知" value={memoryRail?.unknowns ?? 0} />
              <RailMetric label="私人" value={memoryRail?.memberPrivate ?? 0} />
            </div>
          </section>

          <section data-testid="meeting-summary-panel" className="rounded-lg border border-hairline bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">會議摘要</p>
                <p className="mt-1 text-xs text-muted-foreground">Deterministic no-provider，引用已持久化 turn/memory。</p>
              </div>
              <Button
                type="button"
                variant="mono"
                size="sm"
              className="h-9 rounded-lg"
              onClick={handleGenerateSummary}
              disabled={!canSubmit || turnCount === 0}
            >
                {isSummarizing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="mr-2 size-4" aria-hidden="true" />
                )}
                生成摘要
              </Button>
            </div>

            {summary ? (
              <SummaryPanel summary={summary} />
            ) : (
              <EmptyState
                className="mt-4"
                icon={<FileText className="size-5" aria-hidden="true" />}
                title="尚未生成摘要"
                description={EMPTY_SUMMARY_NOTICE}
              />
            )}
          </section>

          <WritebackPanel
            summary={summary}
            preview={writebackPreview}
            result={writebackResult}
            state={writebackState}
            error={writebackError}
            selectedIds={writebackSelections}
            approvals={writebackApprovals}
            onRefresh={handleReloadWritebacks}
            onSelectAll={handleSelectAllWritebackCandidates}
            onClear={handleClearWritebackCandidates}
            onToggleCandidate={handleToggleWritebackCandidate}
            onUpdateApproval={handleUpdateWritebackApproval}
            onSubmit={handleSaveWritebacks}
          />

          <section className="rounded-lg border border-hairline bg-card p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[#1A3A6B]" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink">安全邊界</p>
            </div>
            <div className="mt-4 grid gap-2">
              <SafetyRow testId="meeting-safety-provider" label="Provider call" value={snapshot?.safety.providerCallAttempted === false ? "未嘗試" : "未知"} />
              <SafetyRow label="AiUsageLog" value={snapshot?.safety.aiUsageLogRequired === false ? "no-provider 不需要" : "未知"} />
              <SafetyRow label="Raw audio" value={snapshot?.safety.rawAudioStored === false ? "未保存" : "未保存"} />
              <SafetyRow label="CRM fact write" value={snapshot?.safety.writesConfirmedCrmFact === false ? "未寫回" : "未知"} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-xl font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

function CaptureBox({
  title,
  description,
  icon,
  value,
  placeholder,
  disabled,
  buttonLabel,
  onChange,
  onSubmit,
  isBusy,
  testId,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  disabled: boolean;
  buttonLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isBusy: boolean;
  testId: string;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-paper p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[#1A3A6B]">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Textarea
        data-testid={testId}
        className="mt-3 min-h-28 resize-y rounded-lg bg-card text-sm"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 h-9 rounded-lg"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
      >
        {isBusy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
        {buttonLabel}
      </Button>
    </div>
  );
}

function TurnCard({ turn, memories }: { turn: MeetingTurnDto; memories: MeetingMemoryDto[] }) {
  const relatedMemories = memories.filter((memory) => memory.turnId === turn.id);

  return (
    <article className="rounded-lg border border-hairline bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={turn.transcriptFinal ? "default" : "secondary"}>
            {turn.transcriptFinal ? "Final transcript" : "Manual/Text"}
          </Badge>
          <Badge variant="outline">{turn.modality}</Badge>
        </div>
        <time className="text-xs tabular-nums text-muted-foreground" dateTime={turn.occurredAt}>
          {formatDateTime(turn.occurredAt)}
        </time>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{turn.content}</p>
      {relatedMemories.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {relatedMemories.slice(0, 4).map((memory) => (
            <Badge key={memory.id} variant="outline">
              {displayDataClass(memory.dataClass)}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SummaryPanel({ summary }: { summary: PersistedMeetingSummaryDto }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-hairline bg-paper p-3">
        <p data-testid="meeting-summary-headline" className="text-base font-semibold leading-6 text-ink">
          {summary.headline}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">{summary.citations.length} citations</Badge>
          <Badge variant="outline">{summary.sourceTurnIds.length} source turns</Badge>
          <Badge variant="outline">{summary.provider ?? "no provider"}</Badge>
        </div>
      </div>
      <SummaryList title="決策" items={summary.decisions} />
      <ActionList items={summary.actionItems} />
      <SummaryList title="待確認問題" items={summary.openQuestions} />
    </div>
  );
}

function WritebackPanel({
  summary,
  preview,
  result,
  state,
  error,
  selectedIds,
  approvals,
  onRefresh,
  onSelectAll,
  onClear,
  onToggleCandidate,
  onUpdateApproval,
  onSubmit,
}: {
  summary: PersistedMeetingSummaryDto | null;
  preview: MeetingWritebackPreviewDto | null;
  result: MeetingWritebackResultDto | null;
  state: WritebackState;
  error: string | null;
  selectedIds: string[];
  approvals: Record<string, CandidateApprovalState>;
  onRefresh: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onToggleCandidate: (candidateId: string) => void;
  onUpdateApproval: (candidateId: string, patch: Partial<CandidateApprovalState>) => void;
  onSubmit: () => void;
}) {
  const isLoading = state === "loading";
  const isSaving = state === "saving";
  const readyPreview = preview?.status === "ready" ? preview : null;
  const selectedCount = selectedIds.length;

  return (
    <section data-testid="meeting-writeback-panel" className="rounded-lg border border-hairline bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">寫回確認</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            由顧問選擇哪些摘要項目成為 CRM 候選、洞察或追蹤任務。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-lg"
          onClick={onRefresh}
          disabled={!summary || isLoading || isSaving}
        >
          {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="mr-2 size-4" aria-hidden="true" />}
          更新候選
        </Button>
      </div>

      {!summary ? (
        <EmptyState
          className="mt-4"
          icon={<ClipboardList className="size-5" aria-hidden="true" />}
          title="先生成摘要"
          description="寫回候選只會從已持久化、可引用的會議摘要產生。"
        />
      ) : preview?.status === "summary_required" ? (
        <EmptyState
          className="mt-4"
          icon={<FileText className="size-5" aria-hidden="true" />}
          title="摘要尚未就緒"
          description="請先生成會議摘要，再回來確認可寫回的項目。"
        />
      ) : isLoading && !readyPreview ? (
        <div className="mt-4 rounded-lg border border-hairline bg-paper p-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden="true" />
          正在讀取寫回候選...
        </div>
      ) : readyPreview ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <RailMetric label="決策" value={readyPreview.sourceCounts.decisions} />
            <RailMetric label="行動" value={readyPreview.sourceCounts.actionItems} />
            <RailMetric label="待確認" value={readyPreview.sourceCounts.openQuestions} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              onClick={onSelectAll}
              disabled={isSaving || readyPreview.candidates.every((candidate) => !candidate.canSelect)}
            >
              全選可寫回
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg" onClick={onClear} disabled={isSaving || selectedCount === 0}>
              清除
            </Button>
            <Badge variant="outline">{selectedCount} 已選</Badge>
          </div>

          <div className="space-y-3">
            {readyPreview.candidates.length ? (
              readyPreview.candidates.map((candidate) => (
                <WritebackCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={selectedIds.includes(candidate.id)}
                  approval={approvals[candidate.id] ?? { reason: "", riskAccepted: false }}
                  disabled={isSaving}
                  onToggle={() => onToggleCandidate(candidate.id)}
                  onApprovalChange={(patch) => onUpdateApproval(candidate.id, patch)}
                />
              ))
            ) : (
              <EmptyState
                icon={<ClipboardList className="size-5" aria-hidden="true" />}
                title="沒有可寫回候選"
                description="目前摘要沒有決策、行動項或待確認問題。"
              />
            )}
          </div>

          {error ? (
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          {result ? <WritebackResultSummary result={result} /> : null}

          <Button
            data-testid="meeting-writeback-submit"
            type="button"
            variant="mono"
            className="h-10 w-full rounded-lg"
            onClick={onSubmit}
            disabled={isSaving || selectedCount === 0}
          >
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mr-2 size-4" aria-hidden="true" />}
            確認寫回
          </Button>
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          icon={<ClipboardList className="size-5" aria-hidden="true" />}
          title="尚未讀取寫回候選"
          description="摘要生成後會自動載入，也可以手動更新。"
        />
      )}
    </section>
  );
}

function WritebackCandidateCard({
  candidate,
  selected,
  approval,
  disabled,
  onToggle,
  onApprovalChange,
}: {
  candidate: MeetingWritebackCandidateDto;
  selected: boolean;
  approval: CandidateApprovalState;
  disabled: boolean;
  onToggle: () => void;
  onApprovalChange: (patch: Partial<CandidateApprovalState>) => void;
}) {
  return (
    <article data-testid="meeting-writeback-candidate" className="rounded-lg border border-hairline bg-paper p-3">
      <div className="flex items-start gap-3">
        <input
          data-testid="meeting-writeback-checkbox"
          type="checkbox"
          className="mt-1 size-4 rounded border-hairline accent-[#1A3A6B]"
          checked={selected}
          disabled={disabled || !candidate.canSelect}
          aria-label={`選取${displayCandidateKind(candidate.kind)}`}
          onChange={onToggle}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={candidate.kind === "CONFIRMED_FACT" ? "default" : "outline"}>{displayCandidateKind(candidate.kind)}</Badge>
            <Badge variant={candidate.target === "CRM_CANDIDATE" ? "blue" : "secondary"}>{displayWritebackTarget(candidate.target)}</Badge>
            <Badge variant={candidate.sensitivity === "HIGHLY_SENSITIVE" ? "warning" : "outline"}>{displayCandidateSensitivity(candidate.sensitivity)}</Badge>
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-ink">{candidate.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{MEETING_DATA_CLASS_LABEL[candidate.dataClass]}</Badge>
            <Badge variant="outline">{candidate.citationTurnIds.length} citations</Badge>
            <Badge variant="outline">{candidate.supportingMemoryIds.length} memories</Badge>
            {candidate.writesConfirmedCrmFact === false ? <Badge variant="success">不寫正式 CRM fact</Badge> : null}
          </div>
          {candidate.blockedReason ? <p className="mt-2 text-xs leading-5 text-destructive">{candidate.blockedReason}</p> : null}
        </div>
      </div>

      {selected && candidate.requiresReason ? (
        <div className="mt-3 rounded-lg border border-hairline bg-card p-3">
          <label className="text-xs font-medium text-ink" htmlFor={`meeting-writeback-reason-${candidate.id}`}>
            確認理由
          </label>
          <Textarea
            id={`meeting-writeback-reason-${candidate.id}`}
            data-testid="meeting-writeback-reason"
            className="mt-2 min-h-20 resize-y rounded-lg text-sm"
            value={approval.reason}
            placeholder={candidate.reasonHint ?? "請補上這個寫回候選的確認理由..."}
            disabled={disabled}
            onChange={(event) => onApprovalChange({ reason: event.target.value })}
          />
          <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <input
              data-testid="meeting-writeback-risk"
              type="checkbox"
              className="mt-0.5 size-4 rounded border-hairline accent-[#1A3A6B]"
              checked={approval.riskAccepted}
              disabled={disabled}
              onChange={(event) => onApprovalChange({ riskAccepted: event.target.checked })}
            />
            我已確認此高敏感資訊只建立候選或追蹤事件，並接受後續人工審核責任。
          </label>
        </div>
      ) : null}
    </article>
  );
}

function WritebackResultSummary({ result }: { result: MeetingWritebackResultDto }) {
  return (
    <div data-testid="meeting-writeback-result" className="rounded-lg border border-hairline bg-paper p-3 text-sm">
      <div className="grid grid-cols-3 gap-2">
        <ResultMetric label="已建立" value={result.createdEvents.length} testId="meeting-writeback-created-count" />
        <ResultMetric label="被阻擋" value={result.blocked.length} testId="meeting-writeback-blocked-count" />
        <ResultMetric label="略過" value={result.skipped.length} testId="meeting-writeback-skipped-count" />
      </div>
      {result.createdEvents.length ? (
        <div className="mt-3 space-y-2">
          {result.createdEvents.slice(0, 4).map((event) => (
            <div key={event.id} className="rounded-md border border-hairline bg-card px-3 py-2">
              <p className="font-medium text-ink">{event.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{displayWritebackTarget(event.target)} / {formatDateTime(event.occurredAt)}</p>
            </div>
          ))}
        </div>
      ) : null}
      {result.blocked.length ? (
        <div className="mt-3 space-y-2">
          {result.blocked.slice(0, 3).map((item) => (
            <p key={item.candidateId} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
              {item.reason}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResultMetric({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="rounded-md border border-hairline bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-lg font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: MeetingSummaryItem[] }) {
  if (!items.length) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <SummaryItemCard key={item.id} text={item.text} dataClass={item.dataClass} citations={item.citations} />
        ))}
      </div>
    </div>
  );
}

function ActionList({ items }: { items: MeetingActionItem[] }) {
  if (!items.length) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">行動項</p>
      <div className="space-y-2">
        {items.map((item) => (
          <SummaryItemCard key={item.id} text={item.text} dataClass={item.dataClass} citations={item.citations} />
        ))}
      </div>
    </div>
  );
}

function SummaryItemCard({
  text,
  dataClass,
  citations,
}: {
  text: string;
  dataClass: MeetingDataClass;
  citations: MeetingCitation[];
}) {
  return (
    <div className="rounded-lg border border-hairline bg-paper p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={dataClass === "UNKNOWN" ? "warning" : "outline"}>{MEETING_DATA_CLASS_LABEL[dataClass]}</Badge>
        <Badge variant="outline">{citations.length} 引用</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink">{text}</p>
    </div>
  );
}

function RailMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function SafetyRow({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span data-testid={testId} className="font-medium text-ink">
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-dashed border-hairline bg-paper p-4 text-sm ${className}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-1 leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

async function createMeetingSession(planId: string, signal?: AbortSignal): Promise<MeetingSessionSnapshotDto> {
  const response = await fetch("/api/ai/meeting/sessions", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      visitPlanId: planId,
      title: "AI 會議",
    }),
    signal,
  });

  return readRequiredJson<MeetingSessionSnapshotDto>(response, "MEETING_SESSION_CREATE_FAILED");
}

async function readMeetingSession(sessionId: string, signal?: AbortSignal): Promise<MeetingSessionSnapshotDto> {
  const response = await fetch(`/api/ai/meeting/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    signal,
  });

  return readRequiredJson<MeetingSessionSnapshotDto>(response, "MEETING_SESSION_READ_FAILED");
}

async function appendMeetingTurn(sessionId: string, source: TurnSource, content: string) {
  const response = await fetch(`/api/ai/meeting/sessions/${encodeURIComponent(sessionId)}/turns`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      role: "USER",
      modality: source === "VOICE_FINAL_TRANSCRIPT" ? "VOICE_TRANSCRIPT_FALLBACK" : "TEXT",
      source,
      content,
      transcriptFinal: source === "VOICE_FINAL_TRANSCRIPT",
      outlineSegmentId: "capture",
      occurredAt: new Date().toISOString(),
      issueTags: source === "VOICE_FINAL_TRANSCRIPT" ? ["meeting-final-transcript"] : ["meeting-manual-note"],
      pqQuestionIds: [],
    }),
  });

  await readRequiredJson<unknown>(response, "MEETING_TURN_APPEND_FAILED");
}

async function readMeetingSummary(sessionId: string, signal?: AbortSignal): Promise<PersistedMeetingSummaryDto | null> {
  const response = await fetch(`/api/ai/meeting/sessions/${encodeURIComponent(sessionId)}/summary`, {
    method: "GET",
    signal,
  });

  if (response.status === 404) return null;

  const body = await readRequiredJson<MeetingSummaryReadResponse>(response, "MEETING_SUMMARY_READ_FAILED");
  return body.status === "found" ? body.summary : null;
}

async function generateMeetingSummary(sessionId: string): Promise<PersistedMeetingSummaryDto> {
  const response = await fetch(`/api/ai/meeting/sessions/${encodeURIComponent(sessionId)}/summary`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      mode: "DETERMINISTIC_NO_PROVIDER",
      overwrite: true,
    }),
  });

  const body = await readRequiredJson<MeetingSummaryWriteResponse>(response, "MEETING_SUMMARY_GENERATION_FAILED");
  return body.summary;
}

async function readMeetingWritebacks(
  sessionId: string,
  signal?: AbortSignal,
): Promise<MeetingWritebackPreviewDto> {
  const response = await fetch(`/api/ai/meeting/sessions/${encodeURIComponent(sessionId)}/writebacks`, {
    method: "GET",
    signal,
  });

  return readRequiredJson<MeetingWritebackPreviewDto>(response, "MEETING_WRITEBACK_READ_FAILED");
}

async function saveMeetingWritebacks(
  sessionId: string,
  body: {
    candidateIds: string[];
    approvals: { candidateId: string; reason?: string; riskAccepted: boolean }[];
  },
): Promise<MeetingWritebackResultDto | MeetingWritebackSummaryRequiredDto> {
  const response = await fetch(`/api/ai/meeting/sessions/${encodeURIComponent(sessionId)}/writebacks`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
  });

  return readRequiredJson<MeetingWritebackResultDto | MeetingWritebackSummaryRequiredDto>(
    response,
    "MEETING_WRITEBACK_SAVE_FAILED",
  );
}

function toWritebackPreview(result: MeetingWritebackResultDto): MeetingWritebackReadyDto {
  return {
    status: "ready",
    sessionId: result.sessionId,
    clientId: result.clientId,
    clientSensitivity: result.clientSensitivity,
    summary: result.summary,
    sourceCounts: result.sourceCounts,
    candidates: result.candidates,
    safety: result.safety,
  };
}

async function readRequiredJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await readJson<unknown>(response);

  if (!response.ok) {
    throw new Error(resolveApiError(body, fallbackMessage));
  }

  return body as T;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function resolveApiError(body: unknown, fallbackMessage: string): string {
  if (isRecord(body)) {
    const error = body.error;
    if (typeof error === "string" && error.trim()) return error;

    const blockedPaths = body.blockedPayloadPaths;
    if (Array.isArray(blockedPaths) && blockedPaths.length > 0) {
      return "MEETING_PAYLOAD_BLOCKED";
    }
  }

  return fallbackMessage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function displayDataClass(value: string): string {
  if (isMeetingDataClass(value)) return MEETING_DATA_CLASS_LABEL[value];
  if (value === "INSTRUCTION") return "指令";
  return value;
}

function isMeetingDataClass(value: string): value is MeetingDataClass {
  return value === "CONFIRMED" || value === "FACT" || value === "INFERENCE" || value === "UNKNOWN";
}

function displayCandidateKind(kind: MeetingWritebackCandidateKind): string {
  switch (kind) {
    case "CONFIRMED_FACT":
      return "已確認";
    case "INFERENCE":
      return "推論";
    case "ACTION_ITEM":
      return "行動項";
    case "UNKNOWN":
      return "待確認";
  }
}

function displayWritebackTarget(target: MeetingWritebackTarget): string {
  switch (target) {
    case "CRM_CANDIDATE":
      return "CRM 候選";
    case "INTERVIEW_INSIGHT":
      return "顧問洞察";
    case "FOLLOW_UP_TASK":
      return "追蹤任務";
    case "BLOCKED":
      return "不可寫回";
  }
}

function displayCandidateSensitivity(sensitivity: MeetingWritebackSensitivity): string {
  switch (sensitivity) {
    case "HIGHLY_SENSITIVE":
      return "高敏感";
    case "SENSITIVE":
      return "敏感";
    case "NORMAL":
      return "一般";
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
