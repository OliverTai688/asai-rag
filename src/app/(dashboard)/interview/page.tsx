"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PanelRightOpen,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { advisorCompanionOutline } from "@/domains/interview/outlines";
import {
  useInterviewStore,
  type InterviewTranscriptMessage,
  type InterviewTranscriptUpdater,
} from "@/domains/interview/store";
import { getSegmentProgress } from "@/domains/interview/service";
import { InterviewMicroPlan, InterviewOutputDraft } from "@/domains/interview/types";

type ChatMessage = InterviewTranscriptMessage;

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

type DraftWritebackTarget = "VISIT_PLAN_DRAFT" | "THEATER_BUILD_DRAFT";

type WritebackResult = {
  createdEvents?: {
    id: string;
    candidateId: string;
    target: ConfirmationCandidate["target"];
    title: string;
    occurredAt: string;
  }[];
  createdDrafts?: {
    target: DraftWritebackTarget;
    id: string;
    href: string;
    title: string;
  }[];
  draftBlocked?: {
    target: DraftWritebackTarget;
    reason: string;
  }[];
  blocked?: {
    candidateId: string;
    reason: string;
  }[];
};

const VOICE_STAGE_COPY: Record<VoiceStage, { label: string; description: string; tone: "idle" | "live" | "error" }> = {
  DISCONNECTED: { label: "未連線", description: "尚未請求麥克風。", tone: "idle" },
  LISTENING: { label: "聽取中", description: "開始說話，轉寫文字會出現在輸入框；不保存 raw audio。", tone: "live" },
  THINKING: { label: "AI 思考中", description: "正在整理你剛說的內容。", tone: "live" },
  SPEAKING: { label: "AI 回覆中", description: "AI 正在回應，可隨時插話。", tone: "live" },
  PAUSED: { label: "已暫停", description: "語音暫停；可繼續用文字輸入。", tone: "idle" },
  PERMISSION_DENIED: { label: "權限被拒", description: "瀏覽器拒絕麥克風；文字模式仍可使用。", tone: "error" },
  UNSUPPORTED: { label: "瀏覽器不支援", description: "此環境無法使用麥克風，請改用文字訪談。", tone: "error" },
};

function appendTranscriptText(base: string, transcript: string) {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) return base;
  return base ? `${base}${cleanTranscript}` : cleanTranscript;
}

function getComposerVoiceLabel(stage: VoiceStage, consentAccepted: boolean) {
  if (stage === "LISTENING" || stage === "THINKING" || stage === "SPEAKING") return "暫停即時語音轉文字";
  if (consentAccepted && stage === "PAUSED") return "繼續即時語音轉文字";
  if (stage === "PERMISSION_DENIED" || stage === "UNSUPPORTED") return "重新啟用麥克風";
  return "開始即時語音轉文字";
}

export default function InterviewPage() {
  const router = useRouter();
  const {
    sessions,
    activeSessionId,
    createSession,
    addAnswer,
    addMaterial,
    advanceSegment,
    transcripts,
    remoteSessionIds,
    setTranscript,
    setRemoteSessionId,
  } = useInterviewStore();
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingOutputs, setIsGeneratingOutputs] = useState(false);
  const [outputDraft, setOutputDraft] = useState<InterviewOutputDraft | null>(null);
  const [microPlan, setMicroPlan] = useState<InterviewMicroPlan | null>(null);
  const [editableOutputJson, setEditableOutputJson] = useState("");
  const [outputError, setOutputError] = useState<string | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportSaveError, setReportSaveError] = useState<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("TEXT");
  const [voiceStage, setVoiceStage] = useState<VoiceStage>("DISCONNECTED");
  const [voiceConsentAccepted, setVoiceConsentAccepted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcriptCorrection, setTranscriptCorrection] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const realtimePcRef = useRef<RTCPeerConnection | null>(null);
  const realtimeChannelRef = useRef<RTCDataChannel | null>(null);
  const realtimeCommitTimerRef = useRef<number | null>(null);
  const realtimeFallbackTimerRef = useRef<number | null>(null);
  const realtimeDraftBaseRef = useRef("");
  const realtimeInterimRef = useRef("");
  const realtimeTranscriptReceivedRef = useRef(false);
  const realtimeActiveRef = useRef(false);
  const shouldListenRef = useRef(false);
  const [correctionDrafts, setCorrectionDrafts] = useState<string[]>([]);
  const isComposingDraftRef = useRef(false);
  const [crmClients, setCrmClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [confirmationCandidates, setConfirmationCandidates] = useState<ConfirmationCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [approvalReasons, setApprovalReasons] = useState<Record<string, string>>({});
  const [approvalRiskAccepted, setApprovalRiskAccepted] = useState<Record<string, boolean>>({});
  const [isLoadingConfirmationCard, setIsLoadingConfirmationCard] = useState(false);
  const [isSavingConfirmation, setIsSavingConfirmation] = useState(false);
  const [isCreatingVisitDraft, setIsCreatingVisitDraft] = useState(false);
  const [isCreatingTheaterDraft, setIsCreatingTheaterDraft] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [writebackResult, setWritebackResult] = useState<WritebackResult | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  // Transcript + DB session id live in the store so the in-progress interview
  // survives SPA navigation away from /interview and back.
  const activeInterviewSessionId = activeSession?.id;
  const messages = useMemo(
    () => activeInterviewSessionId ? transcripts[activeInterviewSessionId] ?? [] : [],
    [activeInterviewSessionId, transcripts],
  );
  const setMessages = (updater: InterviewTranscriptUpdater) => {
    if (!activeSession) return;
    setTranscript(activeSession.id, updater);
  };
  const persistentSessionId = activeSession ? remoteSessionIds[activeSession.id] ?? null : null;
  const effectiveClientId = activeSession?.clientId ?? selectedClientId;
  const currentSegment = advisorCompanionOutline.segments.find((segment) => segment.id === activeSession?.currentSegmentId)
    ?? advisorCompanionOutline.segments[0];
  const progress = activeSession
    ? getSegmentProgress(advisorCompanionOutline, activeSession, currentSegment.id)
    : null;
  const answeredCount = progress?.answeredCoreQuestionIds.length ?? 0;
  const completionLabel = `${answeredCount}/${currentSegment.coreQuestions.length}`;
  const segmentIndexLabel = `${currentSegment.order + 1}/${advisorCompanionOutline.segments.length}`;
  // One continuous interview: once the current segment's core questions are
  // answered, move to the next segment automatically (no manual button) so the
  // conversation flows like a single interview. The AI asks the next segment's
  // questions on the following turn; the indicator just shows where we are.
  useEffect(() => {
    if (!activeSession || isStreaming || !progress?.canAdvance) return;
    advanceSegment(activeSession.id);
  }, [activeSession, isStreaming, progress?.canAdvance, advanceSegment]);
  // Keep the newest message visible during long conversations / streaming.
  // Scroll only the thread container (not the page) to avoid the window jumping.
  useEffect(() => {
    const container = conversationEndRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);
  const knownMaterials = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.materials.map((material) => `${material.kind}: ${material.content}`);
  }, [activeSession]);
  const materialBuckets = useMemo(() => bucketMaterials(knownMaterials), [knownMaterials]);
  const voiceStageCopy = VOICE_STAGE_COPY[voiceStage];
  const voiceLive = voiceStage === "LISTENING" || voiceStage === "THINKING" || voiceStage === "SPEAKING";
  const selectedClient = crmClients.find((client) => client.id === effectiveClientId);

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

  useEffect(() => {
    const recorderRef = mediaRecorderRef;
    const streamRef = mediaStreamRef;
    const pcRef = realtimePcRef;
    return () => {
      shouldListenRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // ignore stop races on unmount
        }
      }
      try {
        pcRef.current?.close();
      } catch {
        // ignore close races on unmount
      }
      pcRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function handleStart() {
    if (activeSession) return;
    const focusSegment = advisorCompanionOutline.segments[0];
    // With a CRM client loaded we already know who we're talking about, so skip
    // the "先確定我們在談誰" segment and open straight at the situation segment.
    const hasClient = Boolean(selectedClientId);
    const startSegment = hasClient ? advisorCompanionOutline.segments[1] : focusSegment;
    const clientName = crmClients.find((client) => client.id === selectedClientId)?.name;
    const session = createSession({
      mode: hasClient ? "CLIENT_CONTEXT" : "INDEPENDENT",
      clientId: selectedClientId || undefined,
      currentSegmentId: startSegment.id,
    });
    setMicroPlan(null);
    setOutputDraft(null);
    setEditableOutputJson("");
    setPersistenceError(null);
    setConfirmationCandidates([]);
    setSelectedCandidateIds([]);
    setApprovalReasons({});
    setApprovalRiskAccepted({});
    setConfirmationError(null);
    setWritebackResult(null);
    setTranscript(session.id, [
      {
        role: "assistant",
        content: hasClient
          ? `已載入「${clientName ?? "這位客戶"}」的資料，我們直接從「${startSegment.title}」開始。${startSegment.coreQuestions[0].text}`
          : `我們先從「${startSegment.title}」開始。${startSegment.coreQuestions[0].text}`,
      },
    ]);
    addMaterial(session.id, hasClient
      ? {
          segmentId: focusSegment.id,
          fieldKey: "client_profile",
          kind: "FACT",
          content: `本次拜訪客戶：${clientName ?? selectedClientId}`,
          confidence: "HIGH",
          sourceAnswerIds: [],
        }
      : {
          segmentId: focusSegment.id,
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
          currentSegmentId: startSegment.id,
          title: `AI 了解客戶 - ${new Date().toLocaleDateString("zh-TW")}`,
        }),
      });
      const payload = await response.json();

      if (!response.ok || typeof payload.session?.id !== "string") {
        throw new Error(payload.error ?? "無法建立 DB-backed 訪談 session");
      }

      setRemoteSessionId(session.id, payload.session.id);
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : "無法建立 DB-backed 訪談 session");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isComposingDraftRef.current) return;
    const content = draft.trim();
    if (!activeSession || !content || isStreaming) return;
    if (voiceLive) {
      stopVoiceCapture();
      setVoiceStage("PAUSED");
    }

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
          clientId: effectiveClientId || undefined,
          sessionId: persistentSessionId ?? activeSession.id,
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

  async function transcribeChunk(blob: Blob) {
    if (blob.size < 1200) return;
    setVoiceStage((stage) => (stage === "LISTENING" ? "THINKING" : stage));
    try {
      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");
      const response = await fetch("/api/ai/interview/transcribe", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setVoiceError(payload?.message ?? payload?.error ?? "語音轉寫暫時無法使用，請改用文字訪談。");
        return;
      }
      const text = typeof payload?.text === "string" ? payload.text.trim() : "";
      if (text) {
        setVoiceError(null);
        setDraft((prev) => (prev ? `${prev}${text}` : text));
      }
    } catch {
      setVoiceError("語音轉寫連線失敗，請改用文字訪談。");
    } finally {
      setInterimTranscript("");
      setVoiceStage((stage) => (stage === "THINKING" ? "LISTENING" : stage));
    }
  }

  function pickRecorderMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
  }

  // Record audio in self-contained ~6s chunks and transcribe each one server-side.
  // Each chunk is an independently decodable file, so we stop/restart the recorder
  // per cycle rather than relying on the (cloud-dependent, flaky) Web Speech API.
  function recordChunkCycle() {
    const stream = mediaStreamRef.current;
    if (!stream || !shouldListenRef.current) return;

    const mimeType = pickRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      void transcribeChunk(blob);
      if (shouldListenRef.current) {
        recordChunkCycle();
      }
    };

    try {
      recorder.start();
      setInterimTranscript("（聆聽中…放開話題後會自動轉寫）");
      window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 6000);
    } catch {
      setVoiceError("無法啟動錄音，請改用文字訪談。");
    }
  }

  // Live transcript events streamed from the OpenAI Realtime transcription session.
  function handleRealtimeMessage(raw: unknown) {
    if (typeof raw !== "string") return;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = typeof event.type === "string" ? event.type : "";
    if (type.endsWith("input_audio_transcription.delta")) {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (delta) {
        realtimeTranscriptReceivedRef.current = true;
        clearRealtimeFallbackTimer();
        realtimeInterimRef.current += delta;
        setVoiceError(null);
        setDraft(appendTranscriptText(realtimeDraftBaseRef.current, realtimeInterimRef.current));
        setInterimTranscript(realtimeInterimRef.current);
      }
    } else if (type.endsWith("input_audio_transcription.completed")) {
      const transcript = typeof event.transcript === "string" ? event.transcript.trim() : "";
      const finalTranscript = transcript || realtimeInterimRef.current;
      if (finalTranscript) {
        realtimeTranscriptReceivedRef.current = true;
        clearRealtimeFallbackTimer();
        const nextDraft = appendTranscriptText(realtimeDraftBaseRef.current, finalTranscript);
        realtimeDraftBaseRef.current = nextDraft;
        realtimeInterimRef.current = "";
        setVoiceError(null);
        setDraft(nextDraft);
      }
      setInterimTranscript("");
    } else if (type === "error") {
      const message = typeof event.message === "string" ? event.message : "";
      if (message && !message.toLowerCase().includes("empty")) {
        setVoiceError(message);
      }
    }
  }

  function clearRealtimeCommitTimer() {
    if (realtimeCommitTimerRef.current !== null) {
      window.clearInterval(realtimeCommitTimerRef.current);
      realtimeCommitTimerRef.current = null;
    }
  }

  function clearRealtimeFallbackTimer() {
    if (realtimeFallbackTimerRef.current !== null) {
      window.clearTimeout(realtimeFallbackTimerRef.current);
      realtimeFallbackTimerRef.current = null;
    }
  }

  function sendRealtimeCommit() {
    const channel = realtimeChannelRef.current;
    if (channel?.readyState !== "open") return;
    try {
      channel.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    } catch {
      // The connection may close while a timer tick is in flight.
    }
  }

  function scheduleRealtimeSilentFallback() {
    clearRealtimeFallbackTimer();
    realtimeFallbackTimerRef.current = window.setTimeout(() => {
      if (!shouldListenRef.current || realtimeTranscriptReceivedRef.current) return;
      closeRealtime();
      realtimeActiveRef.current = false;
      if (typeof MediaRecorder === "undefined") {
        setVoiceStage("UNSUPPORTED");
        setVoiceError("此瀏覽器不支援語音錄音，請改用文字訪談。");
        return;
      }
      setVoiceError("即時轉寫暫時沒有回傳文字，已切換為分段轉寫。");
      recordChunkCycle();
    }, 5500);
  }

  function closeRealtime() {
    realtimeActiveRef.current = false;
    clearRealtimeCommitTimer();
    clearRealtimeFallbackTimer();
    realtimeChannelRef.current = null;
    const pc = realtimePcRef.current;
    if (pc) {
      try {
        pc.close();
      } catch {
        // ignore close races
      }
      realtimePcRef.current = null;
    }
  }

  // Best-effort WebRTC connection to OpenAI Realtime for true word-by-word streaming.
  // Returns false on any failure so the caller can fall back to chunked transcription.
  async function startRealtimeTranscription(stream: MediaStream): Promise<boolean> {
    if (typeof RTCPeerConnection === "undefined") return false;
    try {
      const response = await fetch("/api/ai/interview/transcribe-realtime-session", { method: "POST" });
      if (!response.ok) return false;
      const data = await response.json().catch(() => null);
      const ephemeral = typeof data?.clientSecret?.value === "string" ? data.clientSecret.value : "";
      const callsUrl = typeof data?.callsUrl === "string" ? data.callsUrl : "";
      if (!ephemeral || !callsUrl) return false;

      const pc = new RTCPeerConnection();
      realtimePcRef.current = pc;
      realtimeDraftBaseRef.current = draft;
      realtimeInterimRef.current = "";
      realtimeTranscriptReceivedRef.current = false;
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
      const channel = pc.createDataChannel("oai-events");
      realtimeChannelRef.current = channel;
      channel.onopen = () => {
        sendRealtimeCommit();
        clearRealtimeCommitTimer();
        realtimeCommitTimerRef.current = window.setInterval(sendRealtimeCommit, 3000);
      };
      channel.onmessage = (event) => handleRealtimeMessage(event.data);
      channel.onclose = () => clearRealtimeCommitTimer();

      const offer = await pc.createOffer({ offerToReceiveAudio: false });
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(callsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeral}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      });
      if (!sdpResponse.ok) {
        closeRealtime();
        return false;
      }
      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      scheduleRealtimeSilentFallback();
      return true;
    } catch {
      closeRealtime();
      return false;
    }
  }

  async function startVoiceCapture(stream: MediaStream) {
    shouldListenRef.current = true;
    setVoiceStage("LISTENING");

    const realtimeOk = await startRealtimeTranscription(stream);
    if (realtimeOk) {
      realtimeActiveRef.current = true;
      setInterimTranscript("");
      return;
    }

    // Realtime unavailable — fall back to reliable chunked transcription.
    realtimeActiveRef.current = false;
    if (typeof MediaRecorder === "undefined") {
      setVoiceStage("UNSUPPORTED");
      setVoiceError("此瀏覽器不支援語音錄音，請改用文字訪談。");
      return;
    }
    recordChunkCycle();
  }

  function stopVoiceCapture() {
    shouldListenRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore stop races
      }
    }
    closeRealtime();
    setInterimTranscript("");
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    if (voiceLive) {
      realtimeDraftBaseRef.current = value;
      realtimeInterimRef.current = "";
      setInterimTranscript("");
    }
  }

  function handleComposerVoiceClick() {
    setInputMode("VOICE");
    if (voiceLive || (voiceConsentAccepted && voiceStage === "PAUSED")) {
      handlePauseVoiceShell();
      return;
    }
    void handleEnableVoiceShell();
  }

  async function handleEnableVoiceShell() {
    setInputMode("VOICE");
    setVoiceConsentAccepted(true);
    setVoiceError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceStage("UNSUPPORTED");
      setVoiceError("此瀏覽器不支援麥克風，請改用文字訪談。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      await startVoiceCapture(stream);
    } catch (error) {
      shouldListenRef.current = false;
      setVoiceStage("PERMISSION_DENIED");
      setVoiceError(error instanceof Error ? error.message : "麥克風權限被拒絕，請改用文字訪談。");
    }
  }

  function handlePauseVoiceShell() {
    if (voiceStage === "PAUSED") {
      const stream = mediaStreamRef.current;
      if (!stream) {
        void handleEnableVoiceShell();
        return;
      }
      void startVoiceCapture(stream);
    } else {
      stopVoiceCapture();
      setVoiceStage("PAUSED");
    }
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


  async function handleGenerateOutputs() {
    if (!activeSession || isGeneratingOutputs) return;

    setIsGeneratingOutputs(true);
    setOutputError(null);

    try {
      const response = await fetch("/api/ai/interview/outputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: effectiveClientId || undefined,
          sessionId: persistentSessionId ?? activeSession.id,
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

  async function handleSaveReport() {
    if (!effectiveClientId || isSavingReport) return;

    // Prefer the user-edited JSON if it is still valid; fall back to the draft.
    let output: InterviewOutputDraft | null = outputDraft;
    if (editableOutputJson.trim()) {
      try {
        output = JSON.parse(editableOutputJson) as InterviewOutputDraft;
      } catch {
        setReportSaveError("草稿 JSON 格式有誤，請修正後再存入報告。");
        return;
      }
    }

    if (!output) return;

    setIsSavingReport(true);
    setReportSaveError(null);
    setSavedReportId(null);

    try {
      const response = await fetch(`/api/clients/${effectiveClientId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewSessionId: persistentSessionId ?? undefined,
          output,
        }),
      });
      const payload = await response.json();

      if (!response.ok || typeof payload.report?.id !== "string") {
        throw new Error(payload.error ?? "存入報告歷史失敗");
      }

      setSavedReportId(payload.report.id);
    } catch (error) {
      setReportSaveError(error instanceof Error ? error.message : "存入報告歷史失敗");
    } finally {
      setIsSavingReport(false);
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

  async function handleSaveConfirmationCard(
    draftTargets: DraftWritebackTarget[] = [],
    navigateTarget?: DraftWritebackTarget,
  ) {
    if (!persistentSessionId || selectedCandidateIds.length === 0) return;

    if (navigateTarget === "VISIT_PLAN_DRAFT") {
      setIsCreatingVisitDraft(true);
    } else if (navigateTarget === "THEATER_BUILD_DRAFT") {
      setIsCreatingTheaterDraft(true);
    } else {
      setIsSavingConfirmation(true);
    }
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
          draftTargets,
          draftApproval: buildDraftApproval(selectedCandidateIds, approvalReasons, approvalRiskAccepted),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "確認卡保存失敗");
      }

      setWritebackResult(payload);
      if (navigateTarget) {
        const createdDraft = payload.createdDrafts?.find?.((draft: NonNullable<WritebackResult["createdDrafts"]>[number]) =>
          draft.target === navigateTarget &&
          (navigateTarget === "VISIT_PLAN_DRAFT"
            ? draft.href.startsWith("/pre-visit/")
            : draft.href.startsWith("/theater/")),
        );

        if (createdDraft?.href) {
          router.push(createdDraft.href);
        }
      }
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "確認卡保存失敗");
    } finally {
      setIsSavingConfirmation(false);
      setIsCreatingVisitDraft(false);
      setIsCreatingTheaterDraft(false);
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

  const composerPlaceholder = !activeSession
    ? "請先開始陪談"
    : inputMode === "VOICE"
      ? "語音轉寫會出現在這裡，可手動修正後送出…"
      : "輸入業務員的回答…";
  const voiceButtonLabel = getComposerVoiceLabel(voiceStage, voiceConsentAccepted);
  const showVoiceComposerStatus = inputMode === "VOICE" && (voiceConsentAccepted || Boolean(voiceError) || Boolean(interimTranscript));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Header — title + a single start/status control */}
      <header className="flex flex-col gap-4 border-b border-hairline pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">AI 了解客戶</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">把這次拜訪先談一遍</h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            用文字或語音，跟著訪綱把客戶輪廓與對話準備整理出來。
          </p>
        </div>

        {!activeSession ? (
          <div className="flex flex-col gap-2 md:min-w-72 md:items-end">
            <select
              id="interview-client-select"
              aria-label="選擇要連結的 CRM 客戶，或維持獨立模式"
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="h-10 w-full rounded-md border border-hairline bg-paper px-3 text-sm text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <option value="">獨立模式，不寫回 CRM</option>
              {crmClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}{client.email ? ` · ${client.email}` : ""}
                </option>
              ))}
            </select>
            <Button variant="mono" className="w-full" onClick={handleStart}>
              <Sparkles className="size-4" />
              開始陪談
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-ink">
                {selectedClient ? selectedClient.name : "獨立模式"}
              </p>
              <p className="text-xs text-muted-foreground">
                {persistentSessionId ? "已連結 CRM · 可寫回" : "不寫回 CRM"}
              </p>
            </div>
            <Button variant="monoOutline" onClick={() => setPanelOpen(true)}>
              <PanelRightOpen className="size-4" />
              整理面板
            </Button>
          </div>
        )}
      </header>

      {persistenceError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{persistenceError}</span>
        </div>
      ) : null}

      {/* Conversation hero */}
      <section className="flex h-[calc(100dvh-13rem)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-hairline bg-card">
        {/* Segment header + mode toggle */}
        <div className="flex flex-col gap-3 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
              段落 {segmentIndexLabel}
            </p>
            <h2 className="truncate text-base font-semibold text-ink">{currentSegment.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={progress?.canAdvance ? "success" : "outline"} className="tabular-nums">
              核心題 {completionLabel}
            </Badge>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="grid h-full min-h-[320px] place-items-center text-center">
              <div className="max-w-sm space-y-3">
                <MessageSquare className="mx-auto size-8 text-[#1A3A6B]" strokeWidth={1.5} />
                <p className="text-sm font-medium text-ink">先按「開始陪談」</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  AI 會依訪綱逐段問，不會跳段；答不出來的內容會進待確認清單。
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
                      ? "rounded-2xl rounded-br-sm bg-ink px-4 py-3 text-sm leading-6 text-paper"
                      : "rounded-2xl rounded-bl-sm border border-hairline bg-paper px-4 py-3 text-sm leading-6 text-ink"
                  }
                >
                  {message.content || "思考中…"}
                </div>
              </div>
            ))
          )}
          <div ref={conversationEndRef} />
        </div>


        {/* Composer */}
        <form onSubmit={handleSubmit} className="space-y-2 border-t border-hairline p-4">
          <div className="rounded-xl border border-hairline bg-paper p-2 transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15">
            <Textarea
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onCompositionStart={() => {
                isComposingDraftRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingDraftRef.current = false;
              }}
              onKeyDown={(event) => {
                const isImeComposing =
                  event.nativeEvent.isComposing ||
                  event.nativeEvent.keyCode === 229 ||
                  isComposingDraftRef.current;

                if (event.key === "Enter" && isImeComposing) {
                  event.stopPropagation();
                  return;
                }

                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={composerPlaceholder}
              disabled={!activeSession || isStreaming}
              aria-label={inputMode === "VOICE" ? "語音轉寫，可手動修正後送出" : "業務員的回答"}
              className="min-h-20 resize-none border-0 bg-transparent px-2 py-2 focus-visible:border-transparent focus-visible:ring-0 disabled:bg-transparent"
            />
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="min-w-0 px-1">
                {showVoiceComposerStatus ? (
                  <p
                    className={
                      "truncate text-xs leading-5 " +
                      (voiceStageCopy.tone === "error" ? "text-destructive" : "text-ink-3")
                    }
                  >
                    {voiceError ?? (interimTranscript ? `正在轉寫：${interimTranscript}` : voiceStageCopy.description)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant={voiceLive ? "mono" : "monoOutline"}
                        size="icon-lg"
                        aria-label={voiceButtonLabel}
                        aria-pressed={voiceLive}
                        onClick={handleComposerVoiceClick}
                        disabled={!activeSession || isStreaming}
                      />
                    }
                  >
                    {voiceStage === "PERMISSION_DENIED" || voiceStage === "UNSUPPORTED" ? (
                      <MicOff className="size-4" />
                    ) : voiceLive ? (
                      <Radio className="size-4 motion-safe:animate-pulse" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>{voiceButtonLabel}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="submit"
                        variant="mono"
                        size="icon-lg"
                        aria-label="送出回答"
                        disabled={!activeSession || !draft.trim() || isStreaming}
                      />
                    }
                  >
                    {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </TooltipTrigger>
                  <TooltipContent>送出回答</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Voice-only transcript correction (secondary) */}
          {inputMode === "VOICE" && voiceConsentAccepted ? (
            <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-paper px-3 py-2 sm:flex-row sm:items-start">
              <input
                value={transcriptCorrection}
                onChange={(event) => setTranscriptCorrection(event.target.value)}
                placeholder="修正轉寫，例如：剛才不是醫療險，是長照險。"
                aria-label="轉寫修正內容"
                className="h-9 flex-1 rounded-md border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
              />
              <Button
                type="button"
                variant="monoOutline"
                size="sm"
                onClick={handleSaveTranscriptCorrection}
                disabled={!activeSession || !transcriptCorrection.trim()}
              >
                <RotateCcw className="size-4" />
                記下修正
              </Button>
            </div>
          ) : null}
          {inputMode === "VOICE" && correctionDrafts.length ? (
            <p className="px-1 text-xs leading-5 text-ink-3">
              已記下 {correctionDrafts.length} 筆轉寫修正，會在整理面板一起確認。
            </p>
          ) : null}
        </form>
      </section>

      {/* Secondary work — progressive disclosure in a single right sheet */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>訪談整理面板</SheetTitle>
            <SheetDescription>
              記憶、確認寫回、準備卡與下一題計畫都收在這裡，需要時再展開。
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-8">
            {/* Outline progress */}
            <PanelSection icon={<ClipboardList className="size-4 text-[#1A3A6B]" />} title="訪綱進度">
              <div className="space-y-2">
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
              </div>
            </PanelSection>

            {/* Memory rail */}
            <PanelSection title="訪談記憶">
              <div className="grid gap-2">
                <MemoryBucket label="已確認 / 事實" values={materialBuckets.confirmed} />
                <MemoryBucket label="推論" values={materialBuckets.inferred} />
                <MemoryBucket label="待確認" values={materialBuckets.unknown} />
              </div>
            </PanelSection>

            {/* Next-question plan */}
            <PanelSection title="下一題計畫">
              {microPlan ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">AI 準備追問</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{microPlan.nextQuestion}</p>
                  </div>
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">為什麼問這題</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{microPlan.whyThisQuestion}</p>
                  </div>
                  {microPlan.supportingMemoryIds?.length ? (
                    <p className="break-all text-[11px] leading-5 text-ink-3">
                      引用記憶：{microPlan.supportingMemoryIds.join("、")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  送出回答後會顯示 AI 的下一題計畫與引用的訪談記憶，方便確認它沒有重問已確認事實。
                </p>
              )}
            </PanelSection>

            {/* Confirmation card / writeback */}
            <PanelSection icon={<ShieldCheck className="size-4 text-[#1A3A6B]" />} title="確認與寫回">
              <p className="text-sm leading-6 text-muted-foreground">
                只有「已確認」且由您勾選的項目會成為 CRM 候選；推論只保存為訪談洞察，未知會變成待追問。
              </p>
              <div className="mt-3 flex gap-2">
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
                  onClick={() => handleSaveConfirmationCard()}
                  disabled={!persistentSessionId || selectedCandidateIds.length === 0 || isSavingConfirmation}
                >
                  {isSavingConfirmation ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  保存
                </Button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="monoOutline"
                  onClick={() => handleSaveConfirmationCard(["VISIT_PLAN_DRAFT"], "VISIT_PLAN_DRAFT")}
                  disabled={!persistentSessionId || selectedCandidateIds.length === 0 || isCreatingVisitDraft}
                >
                  {isCreatingVisitDraft ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  建立準備包草稿
                </Button>
                <Button
                  type="button"
                  variant="monoOutline"
                  onClick={() => handleSaveConfirmationCard(["THEATER_BUILD_DRAFT"], "THEATER_BUILD_DRAFT")}
                  disabled={!persistentSessionId || selectedCandidateIds.length === 0 || isCreatingTheaterDraft}
                >
                  {isCreatingTheaterDraft ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
                  建立劇場草稿
                </Button>
              </div>
              {confirmationError ? (
                <div className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{confirmationError}</span>
                </div>
              ) : null}
              {confirmationCandidates.length ? (
                <div className="mt-3 space-y-3">
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
                            aria-label={`選取確認卡項目：${candidate.text}`}
                            data-testid={`confirmation-candidate-${candidate.id}`}
                            className="mt-1 size-4 rounded border-hairline text-ink focus-visible:ring-3 focus-visible:ring-ring/25"
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
                                aria-label={`${candidate.text} 的高敏感風險確認`}
                                data-testid={`confirmation-risk-${candidate.id}`}
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
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  完成一段回答後可產生確認卡。獨立模式只會顯示提示，不會寫回 CRM。
                </p>
              )}
              {writebackResult ? (
                <div className="mt-3 rounded-lg border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground">
                  已建立 {writebackResult.createdEvents?.length ?? 0} 筆互動事件；
                  草稿 {writebackResult.createdDrafts?.length ?? 0} 筆；
                  阻擋 {(writebackResult.blocked?.length ?? 0) + (writebackResult.draftBlocked?.length ?? 0)} 筆。
                  {writebackResult.draftBlocked?.length ? (
                    <span className="mt-1 block text-destructive">
                      {writebackResult.draftBlocked.map((item) => item.reason).join("；")}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </PanelSection>

            {/* Output / prep card */}
            <PanelSection icon={<Sparkles className="size-4 text-[#1A3A6B]" />} title="客戶輪廓與準備卡">
              <p className="text-sm leading-6 text-muted-foreground">
                由 AI 依目前素材收斂成可編輯草稿；推論與未知會保留在草稿中，不會寫回 CRM。
              </p>
              <Button
                variant="mono"
                className="mt-3 w-full"
                onClick={handleGenerateOutputs}
                disabled={!activeSession || knownMaterials.length === 0 || isGeneratingOutputs}
              >
                {isGeneratingOutputs ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                生成準備卡
              </Button>
              {outputError ? (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
                  {outputError}
                </div>
              ) : null}
              {outputDraft ? (
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">目前判讀</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {outputDraft.issueReadiness.map((issue) => `${issue.label} L${issue.level}`).join("、") || "尚無明確議題"}
                    </p>
                  </div>
                  <Textarea
                    value={editableOutputJson}
                    onChange={(event) => setEditableOutputJson(event.target.value)}
                    className="min-h-72 resize-y font-mono text-xs leading-5"
                    aria-label="可編輯的客戶輪廓與對話準備卡 JSON 草稿"
                  />
                  {effectiveClientId ? (
                    <>
                      <Button
                        variant="monoOutline"
                        className="w-full"
                        onClick={handleSaveReport}
                        disabled={isSavingReport}
                      >
                        {isSavingReport ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                        存入客戶報告歷史
                      </Button>
                      {savedReportId ? (
                        <p className="rounded-lg border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground">
                          已存入「{selectedClient?.name ?? "此客戶"}」的報告歷史，可到客戶頁的「報告歷史」查看或分享。
                        </p>
                      ) : null}
                      {reportSaveError ? (
                        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
                          {reportSaveError}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs leading-5 text-ink-3">
                      獨立模式不會寫入客戶報告歷史；開始時選擇 CRM 客戶後即可存入。
                    </p>
                  )}
                </div>
              ) : null}
            </PanelSection>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PanelSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function MemoryBucket({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-ink">{label}</p>
        <Badge variant="outline" className="tabular-nums">{values.length}</Badge>
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

function buildDraftApproval(
  selectedCandidateIds: string[],
  approvalReasons: Record<string, string>,
  approvalRiskAccepted: Record<string, boolean>,
): { reason: string; riskAccepted: true } | undefined {
  for (const candidateId of selectedCandidateIds) {
    const reason = approvalReasons[candidateId]?.trim();
    if (reason && approvalRiskAccepted[candidateId] === true) {
      return { reason, riskAccepted: true };
    }
  }

  return undefined;
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
