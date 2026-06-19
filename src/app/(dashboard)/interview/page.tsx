"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Keyboard,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { advisorCompanionOutline } from "@/domains/interview/outlines";
import { useInterviewStore } from "@/domains/interview/store";
import { getSegmentProgress } from "@/domains/interview/service";
import { InterviewMicroPlan, InterviewOutputDraft } from "@/domains/interview/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type InputMode = "TEXT" | "VOICE";

type VoiceStage = "DISCONNECTED" | "LISTENING" | "THINKING" | "SPEAKING" | "PAUSED" | "PERMISSION_DENIED" | "UNSUPPORTED";

type MaterialBucket = {
  confirmed: string[];
  inferred: string[];
  unknown: string[];
};

type ClientOption = {
  id: string;
  name: string;
  email?: string;
};

type ConfirmationCandidate = {
  id: string;
  kind: "CONFIRMED_FACT" | "INFERENCE" | "UNKNOWN";
  text: string;
  target: "CRM_CANDIDATE" | "INTERVIEW_INSIGHT" | "FOLLOW_UP_TASK" | "THEATER_NARRATOR_QUESTION" | "BLOCKED";
  sensitivity: "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE";
  supportingMemoryIds: string[];
  canSelect: boolean;
  requiresReason: boolean;
  reasonHint?: string;
  blockedReason?: string;
};

type WritebackResult = {
  createdEvents?: {
    id: string;
    candidateId: string;
    target: ConfirmationCandidate["target"];
    title: string;
    occurredAt: string;
  }[];
  blocked?: {
    candidateId: string;
    reason: string;
  }[];
};

const VOICE_STAGE_COPY: Record<VoiceStage, { label: string; description: string }> = {
  DISCONNECTED: {
    label: "未連線",
    description: "尚未請求麥克風；文字陪談可照常使用。",
  },
  LISTENING: {
    label: "聽取中",
    description: "語音 shell 已取得本機麥克風權限；目前不保存 raw audio。",
  },
  THINKING: {
    label: "AI 思考中",
    description: "後續 Realtime event mirror 會在這裡顯示推理等待狀態。",
  },
  SPEAKING: {
    label: "AI 回覆中",
    description: "後續語音輸出會在這裡顯示播放/中斷狀態。",
  },
  PAUSED: {
    label: "已暫停",
    description: "語音 shell 暫停；可繼續用文字輸入。",
  },
  PERMISSION_DENIED: {
    label: "權限被拒",
    description: "瀏覽器拒絕麥克風權限；文字模式仍可使用。",
  },
  UNSUPPORTED: {
    label: "瀏覽器不支援",
    description: "目前環境無法使用麥克風 API；請改用文字陪談。",
  },
};

export default function InterviewPage() {
  const {
    sessions,
    activeSessionId,
    createSession,
    addAnswer,
    addMaterial,
    advanceSegment,
  } = useInterviewStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingOutputs, setIsGeneratingOutputs] = useState(false);
  const [outputDraft, setOutputDraft] = useState<InterviewOutputDraft | null>(null);
  const [microPlan, setMicroPlan] = useState<InterviewMicroPlan | null>(null);
  const [editableOutputJson, setEditableOutputJson] = useState("");
  const [outputError, setOutputError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("TEXT");
  const [voiceStage, setVoiceStage] = useState<VoiceStage>("DISCONNECTED");
  const [voiceConsentAccepted, setVoiceConsentAccepted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [transcriptCorrection, setTranscriptCorrection] = useState("");
  const [correctionDrafts, setCorrectionDrafts] = useState<string[]>([]);
  const [isComposingDraft, setIsComposingDraft] = useState(false);
  const [crmClients, setCrmClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [persistentSessionId, setPersistentSessionId] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [confirmationCandidates, setConfirmationCandidates] = useState<ConfirmationCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [approvalReasons, setApprovalReasons] = useState<Record<string, string>>({});
  const [approvalRiskAccepted, setApprovalRiskAccepted] = useState<Record<string, boolean>>({});
  const [isLoadingConfirmationCard, setIsLoadingConfirmationCard] = useState(false);
  const [isSavingConfirmation, setIsSavingConfirmation] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [writebackResult, setWritebackResult] = useState<WritebackResult | null>(null);
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const currentSegment = advisorCompanionOutline.segments.find((segment) => segment.id === activeSession?.currentSegmentId)
    ?? advisorCompanionOutline.segments[0];
  const progress = activeSession
    ? getSegmentProgress(advisorCompanionOutline, activeSession, currentSegment.id)
    : null;
  const answeredCount = progress?.answeredCoreQuestionIds.length ?? 0;
  const completionLabel = `${answeredCount}/${currentSegment.coreQuestions.length}`;
  const knownMaterials = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.materials.map((material) => `${material.kind}: ${material.content}`);
  }, [activeSession]);
  const materialBuckets = useMemo(() => bucketMaterials(knownMaterials), [knownMaterials]);
  const voiceStageCopy = VOICE_STAGE_COPY[voiceStage];

  useEffect(() => {
    let ignore = false;

    async function loadClients() {
      try {
        const response = await fetch("/api/clients", { cache: "no-store" });
        const payload = await response.json();

        if (!ignore && response.ok && Array.isArray(payload.clients)) {
          setCrmClients(payload.clients.map((client: ClientOption) => ({
            id: client.id,
            name: client.name,
            email: client.email,
          })));
        }
      } catch {
        if (!ignore) {
          setCrmClients([]);
        }
      }
    }

    void loadClients();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleStart() {
    if (activeSession) return;
    const firstSegment = advisorCompanionOutline.segments[0];
    const session = createSession({
      mode: selectedClientId ? "CLIENT_CONTEXT" : "INDEPENDENT",
      clientId: selectedClientId || undefined,
    });
    setMicroPlan(null);
    setOutputDraft(null);
    setEditableOutputJson("");
    setPersistentSessionId(null);
    setPersistenceError(null);
    setConfirmationCandidates([]);
    setSelectedCandidateIds([]);
    setApprovalReasons({});
    setApprovalRiskAccepted({});
    setConfirmationError(null);
    setWritebackResult(null);
    setMessages([
      {
        role: "assistant",
        content: `我們先從「${firstSegment.title}」開始。${firstSegment.coreQuestions[0].text}`,
      },
    ]);
    addMaterial(session.id, {
      segmentId: firstSegment.id,
      fieldKey: "client_profile",
      kind: "UNKNOWN",
      content: "尚未鎖定拜訪客戶",
      confidence: "LOW",
      sourceAnswerIds: [],
    });

    if (!selectedClientId) return;

    try {
      const response = await fetch("/api/ai/interview/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          interviewKind: "ADVISOR_COMPANION",
          outlineId: advisorCompanionOutline.id,
          currentSegmentId: firstSegment.id,
          title: `AI 顧問陪談 - ${new Date().toLocaleDateString("zh-TW")}`,
        }),
      });
      const payload = await response.json();

      if (!response.ok || typeof payload.session?.id !== "string") {
        throw new Error(payload.error ?? "無法建立 DB-backed 訪談 session");
      }

      setPersistentSessionId(payload.session.id);
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : "無法建立 DB-backed 訪談 session");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isComposingDraft) return;
    const content = draft.trim();
    if (!activeSession || !content || isStreaming) return;

    const firstMissingQuestionId = progress?.missingCoreQuestionIds[0]
      ?? currentSegment.coreQuestions[0]?.id
      ?? `${currentSegment.id}-freeform`;

    addAnswer(activeSession.id, {
      segmentId: currentSegment.id,
      questionId: firstMissingQuestionId,
      content,
    });
    addMaterial(activeSession.id, {
      segmentId: currentSegment.id,
      fieldKey: currentSegment.frameworkStep === "SYNTHESIS" ? "conversation_prep_card" : "client_profile",
      kind: currentSegment.order <= 1 ? "FACT" : "INFERENCE",
      content,
      confidence: currentSegment.order <= 1 ? "MEDIUM" : "LOW",
      sourceAnswerIds: [],
    });

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setIsStreaming(true);
    if (persistentSessionId) {
      void appendPersistentTurn(persistentSessionId, content, currentSegment.id);
    }

    try {
      const response = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          currentSegmentId: currentSegment.id,
          messages: nextMessages,
          knownMaterials,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("訪談 Agent 暫時無法回應");
      }

      setMicroPlan(parseMicroPlanHeader(response.headers.get("X-Interview-Micro-Plan")));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((state) => [...state, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((state) => {
          const next = [...state];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: assistantContent };
          }
          return next;
        });
      }
    } catch (error) {
      setMessages((state) => [
        ...state,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "訪談 Agent 暫時無法回應",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleModeChange(nextMode: InputMode) {
    setInputMode(nextMode);
    if (nextMode === "TEXT") {
      setVoiceStage((stage) => (stage === "LISTENING" || stage === "THINKING" || stage === "SPEAKING" ? "PAUSED" : stage));
    }
  }

  async function handleEnableVoiceShell() {
    setInputMode("VOICE");
    setVoiceConsentAccepted(true);
    setVoiceError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceStage("UNSUPPORTED");
      setVoiceError("目前瀏覽器不支援麥克風權限 API，請使用文字陪談。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setVoiceStage("LISTENING");
    } catch (error) {
      setVoiceStage("PERMISSION_DENIED");
      setVoiceError(error instanceof Error ? error.message : "麥克風權限被拒絕，請改用文字陪談。");
    }
  }

  function handlePauseVoiceShell() {
    setVoiceStage((stage) => (stage === "PAUSED" ? "LISTENING" : "PAUSED"));
  }

  function handleSaveTranscriptCorrection() {
    const correction = transcriptCorrection.trim();
    if (!activeSession || !correction) return;

    addMaterial(activeSession.id, {
      segmentId: currentSegment.id,
      fieldKey: "transcript_correction",
      kind: "UNKNOWN",
      content: `轉寫修正待確認：${correction}`,
      confidence: "LOW",
      sourceAnswerIds: [],
    });
    setCorrectionDrafts((state) => [correction, ...state].slice(0, 4));
    setTranscriptCorrection("");
  }

  function handleAdvance() {
    if (!activeSession) return;
    advanceSegment(activeSession.id);
  }

  async function handleGenerateOutputs() {
    if (!activeSession || isGeneratingOutputs) return;

    setIsGeneratingOutputs(true);
    setOutputError(null);

    try {
      const response = await fetch("/api/ai/interview/outputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          messages,
          materials: knownMaterials,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "準備卡生成失敗");
      }

      const nextOutput = payload as InterviewOutputDraft;
      setOutputDraft(nextOutput);
      setEditableOutputJson(JSON.stringify(nextOutput, null, 2));
    } catch (error) {
      setOutputError(error instanceof Error ? error.message : "準備卡生成失敗");
    } finally {
      setIsGeneratingOutputs(false);
    }
  }

  async function handleGenerateConfirmationCard() {
    if (!persistentSessionId) {
      setConfirmationError("請先選擇 CRM 客戶並重新開始陪談，才能產生可寫回的確認卡。");
      return;
    }

    setIsLoadingConfirmationCard(true);
    setConfirmationError(null);
    setWritebackResult(null);

    try {
      await fetch(`/api/ai/interview/sessions/${persistentSessionId}/reflections/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentSegmentId: currentSegment.id }),
      });
      const response = await fetch(`/api/ai/interview/sessions/${persistentSessionId}/writebacks`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !Array.isArray(payload.candidates)) {
        throw new Error(payload.error ?? "確認卡生成失敗");
      }

      setConfirmationCandidates(payload.candidates);
      setSelectedCandidateIds([]);
      setApprovalReasons({});
      setApprovalRiskAccepted({});
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "確認卡生成失敗");
    } finally {
      setIsLoadingConfirmationCard(false);
    }
  }

  async function handleSaveConfirmationCard() {
    if (!persistentSessionId || selectedCandidateIds.length === 0) return;

    setIsSavingConfirmation(true);
    setConfirmationError(null);
    setWritebackResult(null);

    try {
      const response = await fetch(`/api/ai/interview/sessions/${persistentSessionId}/writebacks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          approvals: selectedCandidateIds.map((candidateId) => ({
            candidateId,
            reason: approvalReasons[candidateId],
            riskAccepted: approvalRiskAccepted[candidateId] === true,
          })),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "確認卡保存失敗");
      }

      setWritebackResult(payload);
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "確認卡保存失敗");
    } finally {
      setIsSavingConfirmation(false);
    }
  }

  async function appendPersistentTurn(sessionId: string, content: string, outlineSegmentId: string) {
    try {
      const response = await fetch(`/api/ai/interview/sessions/${sessionId}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "USER",
          modality: inputMode === "VOICE" ? "VOICE_TRANSCRIPT_FALLBACK" : "TEXT",
          content,
          transcriptFinal: true,
          outlineSegmentId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "訪談記憶保存失敗");
      }
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : "訪談記憶保存失敗");
    }
  }

  function toggleCandidate(candidateId: string) {
    setSelectedCandidateIds((state) => (
      state.includes(candidateId)
        ? state.filter((id) => id !== candidateId)
        : [...state, candidateId]
    ));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-hairline pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary">Interview Agent M1</Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              AI 顧問陪談
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              用白話訪談業務員，先把客戶輪廓與對話準備整理出來；此頁只跑獨立模式，不寫回 CRM。
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:min-w-80">
          <label className="text-xs font-semibold text-ink" htmlFor="interview-client-select">
            CRM 客戶連結
          </label>
          <select
            id="interview-client-select"
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
            disabled={Boolean(activeSession)}
            className="h-10 rounded-md border border-hairline bg-paper px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">獨立模式，不寫回 CRM</option>
            {crmClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}{client.email ? ` · ${client.email}` : ""}
              </option>
            ))}
          </select>
          <Button variant="mono" onClick={handleStart} disabled={Boolean(activeSession)}>
            <Sparkles className="size-4" />
            開始陪談
          </Button>
          {persistenceError ? (
            <p className="text-xs leading-5 text-destructive">{persistenceError}</p>
          ) : persistentSessionId ? (
            <p className="text-xs leading-5 text-muted-foreground">已建立 DB-backed 訪談，可產生確認卡。</p>
          ) : null}
        </div>
      </header>

      <section className="rounded-lg border border-hairline bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-lg border border-hairline bg-paper p-1" aria-label="選擇訪談輸入模式">
              <button
                type="button"
                onClick={() => handleModeChange("TEXT")}
                className={
                  inputMode === "TEXT"
                    ? "inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper"
                    : "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-ink"
                }
              >
                <Keyboard className="size-4" />
                文字訪談
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("VOICE")}
                className={
                  inputMode === "VOICE"
                    ? "inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper"
                    : "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-ink"
                }
              >
                <Mic className="size-4" />
                中文語音 Beta
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                <p className="text-xs font-semibold text-ink">語音狀態</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-md border border-hairline bg-card">
                    {voiceStage === "PERMISSION_DENIED" || voiceStage === "UNSUPPORTED" ? (
                      <MicOff className="size-4 text-destructive" />
                    ) : voiceStage === "SPEAKING" ? (
                      <Volume2 className="size-4 text-[#1A3A6B]" />
                    ) : (
                      <Radio className="size-4 text-[#1A3A6B]" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{voiceStageCopy.label}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{voiceStageCopy.description}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                <p className="text-xs font-semibold text-ink">保存規則</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  預設不保存 raw audio；此 shell 只保留可檢視的 transcript 與 structured memory placeholder。
                </p>
              </div>
              <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                <p className="text-xs font-semibold text-ink">Fallback</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  麥克風被拒或瀏覽器不支援時，文字陪談與送出按鈕仍保持可用。
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button type="button" variant="mono" onClick={handleEnableVoiceShell}>
              <ShieldCheck className="size-4" />
              啟用麥克風
            </Button>
            <Button
              type="button"
              variant="monoOutline"
              onClick={handlePauseVoiceShell}
              disabled={voiceStage === "DISCONNECTED" || voiceStage === "UNSUPPORTED" || voiceStage === "PERMISSION_DENIED"}
            >
              {voiceStage === "PAUSED" ? <Play className="size-4" /> : <Pause className="size-4" />}
              {voiceStage === "PAUSED" ? "繼續聽取" : "暫停"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVoiceStage("THINKING")}
              disabled={!voiceConsentAccepted || voiceStage === "PERMISSION_DENIED" || voiceStage === "UNSUPPORTED"}
            >
              AI 思考中
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVoiceStage("SPEAKING")}
              disabled={!voiceConsentAccepted || voiceStage === "PERMISSION_DENIED" || voiceStage === "UNSUPPORTED"}
            >
              AI 回覆中
            </Button>
          </div>
        </div>
        {voiceError ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
            {voiceError}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-[620px] rounded-lg border border-hairline bg-card">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <div>
              <p className="text-xs font-semibold text-ink-3">目前段落</p>
              <h2 className="text-base font-semibold text-ink">{currentSegment.title}</h2>
            </div>
            <Badge variant={progress?.canAdvance ? "success" : "outline"}>
              核心題 {completionLabel}
            </Badge>
          </div>

          <div className="flex h-[460px] flex-col gap-3 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-sm space-y-3">
                  <MessageSquare className="mx-auto size-8 text-[#1A3A6B]" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-ink">先按「開始陪談」</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    AI 會依訪綱逐段問，不會跳段；業務員答不出來的內容會進待確認清單。
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={message.role === "user" ? "ml-auto max-w-[78%]" : "mr-auto max-w-[82%]"}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "rounded-lg bg-ink px-4 py-3 text-sm leading-6 text-paper"
                        : "rounded-lg border border-hairline bg-paper px-4 py-3 text-sm leading-6 text-ink"
                    }
                  >
                    {message.content || "思考中..."}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-hairline p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onCompositionStart={() => setIsComposingDraft(true)}
                onCompositionEnd={() => setIsComposingDraft(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.nativeEvent.isComposing || isComposingDraft)) {
                    event.stopPropagation();
                  }
                }}
                placeholder={activeSession ? "輸入業務員的回答..." : "請先開始陪談"}
                disabled={!activeSession || isStreaming}
                className="min-h-20 flex-1 resize-none"
              />
              <Button
                type="submit"
                variant="mono"
                className="md:self-end"
                disabled={!activeSession || !draft.trim() || isStreaming}
              >
                <Send className="size-4" />
                送出
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="size-4 text-[#1A3A6B]" />
                Live transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={liveTranscript}
                onChange={(event) => setLiveTranscript(event.target.value)}
                placeholder="PIM-005 接上 Realtime event mirror 前，可先在這裡貼上或修正語音轉寫。"
                className="min-h-24 resize-y text-sm leading-6"
                aria-label="即時語音轉寫草稿"
              />
              <div className="space-y-2">
                <Textarea
                  value={transcriptCorrection}
                  onChange={(event) => setTranscriptCorrection(event.target.value)}
                  placeholder="修正轉寫，例如：剛才不是醫療險，是長照險。"
                  className="min-h-20 resize-y text-sm leading-6"
                  aria-label="轉寫修正內容"
                />
                <Button
                  type="button"
                  variant="monoOutline"
                  className="w-full"
                  onClick={handleSaveTranscriptCorrection}
                  disabled={!activeSession || !transcriptCorrection.trim()}
                >
                  <RotateCcw className="size-4" />
                  加入 correction memory placeholder
                </Button>
              </div>
              {correctionDrafts.length ? (
                <div className="space-y-2">
                  {correctionDrafts.map((correction, index) => (
                    <div key={`${correction}-${index}`} className="rounded-lg border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground">
                      correction：{correction}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memory rail</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <MemoryBucket label="已確認 / 事實" values={materialBuckets.confirmed} />
              <MemoryBucket label="推論" values={materialBuckets.inferred} />
              <MemoryBucket label="待確認" values={materialBuckets.unknown} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#1A3A6B]" />
                段落確認卡
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                只有「已確認」且由您勾選的項目會成為 CRM 候選；推論只會保存為訪談洞察，未知會變成待追問事項。
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="monoOutline"
                  className="flex-1"
                  onClick={handleGenerateConfirmationCard}
                  disabled={!activeSession || isLoadingConfirmationCard}
                >
                  {isLoadingConfirmationCard ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
                  產生確認卡
                </Button>
                <Button
                  type="button"
                  variant="mono"
                  className="flex-1"
                  onClick={handleSaveConfirmationCard}
                  disabled={!persistentSessionId || selectedCandidateIds.length === 0 || isSavingConfirmation}
                >
                  {isSavingConfirmation ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  保存
                </Button>
              </div>
              {confirmationError ? (
                <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{confirmationError}</span>
                </div>
              ) : null}
              {confirmationCandidates.length ? (
                <div className="space-y-3">
                  {confirmationCandidates.map((candidate) => {
                    const selected = selectedCandidateIds.includes(candidate.id);
                    return (
                      <div key={candidate.id} className="rounded-lg border border-hairline bg-paper px-3 py-3">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleCandidate(candidate.id)}
                            disabled={!candidate.canSelect}
                            className="mt-1 size-4 rounded border-hairline text-ink focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <Badge variant={candidate.kind === "CONFIRMED_FACT" ? "success" : "outline"}>
                                {confirmationKindLabel(candidate.kind)}
                              </Badge>
                              <Badge variant={candidate.sensitivity === "HIGHLY_SENSITIVE" ? "destructive" : "secondary"}>
                                {sensitivityLabel(candidate.sensitivity)}
                              </Badge>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {targetLabel(candidate.target)}
                              </span>
                            </span>
                            <span className="mt-2 block text-sm leading-6 text-ink">{candidate.text}</span>
                            {candidate.blockedReason ? (
                              <span className="mt-2 block text-xs leading-5 text-destructive">{candidate.blockedReason}</span>
                            ) : null}
                          </span>
                        </label>
                        {selected && candidate.requiresReason ? (
                          <div className="mt-3 space-y-2 border-t border-hairline pt-3">
                            <Textarea
                              value={approvalReasons[candidate.id] ?? ""}
                              onChange={(event) =>
                                setApprovalReasons((state) => ({
                                  ...state,
                                  [candidate.id]: event.target.value,
                                }))
                              }
                              placeholder={candidate.reasonHint ?? "請填寫確認理由"}
                              className="min-h-20 resize-y text-sm leading-6"
                              aria-label={`${candidate.text} 的高敏感寫回理由`}
                            />
                            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={approvalRiskAccepted[candidate.id] === true}
                                onChange={(event) =>
                                  setApprovalRiskAccepted((state) => ({
                                    ...state,
                                    [candidate.id]: event.target.checked,
                                  }))
                                }
                                className="mt-0.5 size-4 rounded border-hairline"
                              />
                              我確認此高敏感資訊只作為 CRM 候選，仍需後續合規審查。
                            </label>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  完成一段回答後可產生確認卡。獨立模式只會顯示錯誤提示，不會寫回 CRM。
                </p>
              )}
              {writebackResult ? (
                <div className="rounded-lg border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground">
                  已建立 {writebackResult.createdEvents?.length ?? 0} 筆互動事件；
                  阻擋 {writebackResult.blocked?.length ?? 0} 筆。
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4 text-[#1A3A6B]" />
                訪綱進度
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {advisorCompanionOutline.segments.map((segment) => {
                const active = segment.id === currentSegment.id;
                const done = activeSession
                  ? segment.order < currentSegment.order || (active && Boolean(progress?.canAdvance))
                  : false;
                return (
                  <div
                    key={segment.id}
                    className={
                      active
                        ? "rounded-lg border border-hairline-2 bg-paper-2 p-3"
                        : "rounded-lg border border-hairline bg-paper p-3"
                    }
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        className={done ? "mt-0.5 size-4 text-[#2E7D32]" : "mt-0.5 size-4 text-ink-3"}
                        strokeWidth={1.5}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{segment.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{segment.goal}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="monoOutline"
                className="w-full"
                disabled={!activeSession || !progress?.canAdvance}
                onClick={handleAdvance}
              >
                前往下一段
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>即時素材草稿</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {knownMaterials.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  回答後會先以事實/推論/未知標記素材；正式 AI 總結與可編輯確認卡仍在下一步。
                </p>
              ) : (
                knownMaterials.slice(-6).map((material, index) => (
                  <div key={`${material}-${index}`} className="rounded-lg border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground">
                    {material}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>客戶輪廓與準備卡</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                由 AI 依目前素材收斂成可編輯草稿；推論與未知資訊會保留在草稿中，不會寫回 CRM。
              </p>
              <Button
                variant="mono"
                className="w-full"
                onClick={handleGenerateOutputs}
                disabled={!activeSession || knownMaterials.length === 0 || isGeneratingOutputs}
              >
                {isGeneratingOutputs ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                生成準備卡
              </Button>
              {outputError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
                  {outputError}
                </div>
              ) : null}
              {outputDraft ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">目前判讀</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {outputDraft.issueReadiness.map((issue) => `${issue.label} L${issue.level}`).join("、") || "尚無明確議題"}
                    </p>
                    {outputDraft.memoryEvidence?.supportingMemoryIds.length ? (
                      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                        Evidence：{outputDraft.memoryEvidence.supportingMemoryIds.join("、")}
                      </p>
                    ) : null}
                  </div>
                  <Textarea
                    value={editableOutputJson}
                    onChange={(event) => setEditableOutputJson(event.target.value)}
                    className="min-h-80 resize-y font-mono text-xs leading-5"
                    aria-label="可編輯的客戶輪廓與對話準備卡 JSON 草稿"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>下一題計畫</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {microPlan ? (
                <>
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">AI 準備追問</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{microPlan.nextQuestion}</p>
                  </div>
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">為什麼問這題</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{microPlan.whyThisQuestion}</p>
                  </div>
                  {microPlan.supportingMemoryIds?.length ? (
                    <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                      <p className="text-xs font-semibold text-ink">Supporting memory IDs</p>
                      <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
                        {microPlan.supportingMemoryIds.join("、")}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  送出回答後會顯示 AI 的下一題計畫與引用的訪談記憶，方便確認它沒有重問已確認事實。
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function MemoryBucket({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-ink">{label}</p>
        <Badge variant="outline">{values.length}</Badge>
      </div>
      {values.length ? (
        <div className="mt-2 space-y-1">
          {values.slice(-3).map((value, index) => (
            <p key={`${value}-${index}`} className="text-xs leading-5 text-muted-foreground">
              {stripMaterialKind(value)}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">尚無素材。</p>
      )}
    </div>
  );
}

function parseMicroPlanHeader(value: string | null): InterviewMicroPlan | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<InterviewMicroPlan>;
    if (!parsed.nextQuestion || !parsed.whyThisQuestion || !parsed.outlineSegmentId) return null;

    return {
      objective: parsed.objective ?? "",
      nextQuestion: parsed.nextQuestion,
      whyThisQuestion: parsed.whyThisQuestion,
      outlineSegmentId: parsed.outlineSegmentId,
      issueTags: parsed.issueTags ?? [],
      expectedEvidenceType: parsed.expectedEvidenceType ?? "FACT",
      avoid: parsed.avoid ?? [],
      supportingMemoryIds: parsed.supportingMemoryIds ?? [],
    };
  } catch {
    return null;
  }
}

function bucketMaterials(materials: string[]): MaterialBucket {
  return materials.reduce<MaterialBucket>(
    (bucket, material) => {
      if (material.startsWith("FACT:")) bucket.confirmed.push(material);
      else if (material.startsWith("INFERENCE:")) bucket.inferred.push(material);
      else if (material.startsWith("UNKNOWN:")) bucket.unknown.push(material);
      return bucket;
    },
    {
      confirmed: [],
      inferred: [],
      unknown: [],
    },
  );
}

function stripMaterialKind(material: string): string {
  return material.replace(/^(FACT|INFERENCE|UNKNOWN):\s*/, "");
}

function confirmationKindLabel(kind: ConfirmationCandidate["kind"]): string {
  const labels: Record<ConfirmationCandidate["kind"], string> = {
    CONFIRMED_FACT: "已確認",
    INFERENCE: "推論",
    UNKNOWN: "待確認",
  };

  return labels[kind];
}

function sensitivityLabel(sensitivity: ConfirmationCandidate["sensitivity"]): string {
  const labels: Record<ConfirmationCandidate["sensitivity"], string> = {
    NORMAL: "一般",
    SENSITIVE: "敏感",
    HIGHLY_SENSITIVE: "高敏感",
  };

  return labels[sensitivity];
}

function targetLabel(target: ConfirmationCandidate["target"]): string {
  const labels: Record<ConfirmationCandidate["target"], string> = {
    CRM_CANDIDATE: "CRM 候選",
    INTERVIEW_INSIGHT: "訪談洞察",
    FOLLOW_UP_TASK: "待追問",
    THEATER_NARRATOR_QUESTION: "旁白補問",
    BLOCKED: "不可寫回",
  };

  return labels[target];
}
