"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  PanelRightOpen,
  Plus,
  Radio,
  Send,
  Sparkles,
  Theater,
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
import { theaterFieldBuildOutline } from "@/domains/interview/outlines";
import { buildTheaterFieldBuildContext } from "@/domains/interview/theater-build";
import type { TheaterBuildCharacterSeed, TheaterBuildPacket } from "@/domains/interview/types";

type ChatMessage = { role: "user" | "assistant"; content: string };
type InputMode = "TEXT" | "VOICE";
type VoiceStage = "DISCONNECTED" | "LISTENING" | "PAUSED" | "PERMISSION_DENIED" | "UNSUPPORTED";
type DataClass = "fact" | "inference" | "unknown";
type MaterialCategory = "focus" | "scenario" | "role" | "relationship" | "objection" | "sensitive" | "note";

const CLASS_PREFIX: Record<DataClass, string> = { fact: "FACT", inference: "INFERENCE", unknown: "UNKNOWN" };
const CLASS_LABEL: Record<DataClass, string> = { fact: "確認事實", inference: "推論", unknown: "待確認" };

const CATEGORY_FIELD: Record<MaterialCategory, string | null> = {
  focus: "focus_client",
  scenario: "scenario",
  role: "npc",
  relationship: "relationship",
  objection: "objection",
  sensitive: "sensitive",
  note: null,
};

const CATEGORY_LABEL: Record<MaterialCategory, string> = {
  focus: "焦點客戶",
  scenario: "演練場景",
  role: "陪演角色",
  relationship: "關係張力",
  objection: "可能異議",
  sensitive: "敏感點",
  note: "其他備註",
};

const ROLE_LABEL: Record<TheaterBuildCharacterSeed["role"], string> = {
  FOCUS_CLIENT: "焦點客戶",
  DECISION_MAKER: "決策者",
  INFLUENCER: "影響者",
  ADVISOR: "顧問／業務",
  NARRATOR: "旁白",
};

const VOICE_STAGE_COPY: Record<VoiceStage, { label: string; description: string; tone: "idle" | "live" | "error" }> = {
  DISCONNECTED: { label: "未連線", description: "尚未啟用麥克風。", tone: "idle" },
  LISTENING: { label: "聽取中", description: "說話後會自動轉成文字，送出前可修正；不保存原始語音。", tone: "live" },
  PAUSED: { label: "已暫停", description: "語音暫停；可繼續用文字輸入。", tone: "idle" },
  PERMISSION_DENIED: { label: "權限被拒", description: "瀏覽器拒絕麥克風；文字模式仍可使用。", tone: "error" },
  UNSUPPORTED: { label: "瀏覽器不支援", description: "此瀏覽器無法使用語音輸入，請改用文字。建議使用 Chrome。", tone: "error" },
};

const INTRO_MESSAGE: ChatMessage = {
  role: "assistant",
  content: `我們先建出可演練的劇場場域。${theaterFieldBuildOutline.segments[0].coreQuestions[0]?.text ?? "這次想練哪一位客戶、哪個拜訪情境？"}`,
};

// When a client is pre-loaded, the focus client is already known, so the AI should
// confirm that client and only ask about the visit scenario instead of "which client".
function buildClientIntroMessage(clientName: string): ChatMessage {
  return {
    role: "assistant",
    content: `已帶入客戶「${clientName}」的已知資料，我們直接用這位客戶來建場。這次想針對哪個拜訪情境來演練？例如初次見面、保單健檢、理賠說明，或加保溝通？`,
  };
}

// The build interview is one continuous conversation. The AI drives segment
// progression itself and signals the segment it is currently focused on with a
// hidden [[SEG:<id>]] marker, which we strip before showing the reply.
function stripSegmentMarker(content: string): string {
  return content.replace(/\[\[SEG:[a-z0-9-]+\]\]/gi, "").trimEnd();
}

function appendTranscriptText(base: string, transcript: string) {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) return base;
  return base ? `${base}${cleanTranscript}` : cleanTranscript;
}

function getComposerVoiceLabel(stage: VoiceStage, consentAccepted: boolean) {
  if (stage === "LISTENING") return "暫停即時語音轉文字";
  if (consentAccepted && stage === "PAUSED") return "繼續即時語音轉文字";
  if (stage === "PERMISSION_DENIED" || stage === "UNSUPPORTED") return "重新啟用麥克風";
  return "開始即時語音轉文字";
}

export default function TheaterBuildPage() {
  const sessionId = `tb_${useId()}`;
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [INTRO_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const [inputMode, setInputMode] = useState<InputMode>("TEXT");
  const [voiceStage, setVoiceStage] = useState<VoiceStage>("DISCONNECTED");
  const [voiceConsentAccepted, setVoiceConsentAccepted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");

  const seededRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const voiceDraftBaseRef = useRef("");
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const segment = theaterFieldBuildOutline.segments[segmentIndex];
  const segmentLabel = `${segmentIndex + 1}/${theaterFieldBuildOutline.segments.length}`;
  const voiceStageCopy = VOICE_STAGE_COPY[voiceStage];
  const voiceLive = voiceStage === "LISTENING";
  const voiceButtonLabel = getComposerVoiceLabel(voiceStage, voiceConsentAccepted);
  const showVoiceComposerStatus = inputMode === "VOICE" && (voiceConsentAccepted || Boolean(voiceError) || Boolean(interimTranscript));
  const packet = useMemo<TheaterBuildPacket>(() => {
    return buildTheaterFieldBuildContext({
      organizationId: "local",
      memberId: "local",
      clientId,
      sessionId,
      currentSegmentId: segment.id,
      messages,
      knownMaterials: materials,
    }).packet;
  }, [clientId, sessionId, segment.id, messages, materials]);

  const ready = packet.readiness === "READY";

  // Optionally pre-load a client's known materials (opening question is seeded by
  // the messages initializer, so no synchronous setState is needed here).
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const paramClientId = params.get("clientId");
    if (!paramClientId) return;

    void (async () => {
      setClientId(paramClientId);
      try {
        const response = await fetch(`/api/clients/${encodeURIComponent(paramClientId)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { client?: ClientDetail };
        if (!data.client) return;
        setClientName(data.client.name);
        setMaterials(seedMaterialsFromClient(data.client));
        // Replace the generic "which client?" opening with a client-aware confirmation,
        // but only if the user hasn't started the conversation yet.
        setMessages((prev) =>
          prev.length === 1 && prev[0] === INTRO_MESSAGE
            ? [buildClientIntroMessage(data.client!.name)]
            : prev,
        );
      } catch {
        // best-effort preload; the user can still build manually
      }
    })();
  }, []);

  // Scroll only the thread container (not the page) to avoid the window jumping.
  useEffect(() => {
    const container = conversationEndRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  // Stop any active recognition when leaving the page.
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isComposing) return;
    const trimmed = draft.trim();
    if (!trimmed || isStreaming) return;
    if (voiceLive) {
      stopRecognition();
      setVoiceStage("PAUSED");
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setDraft("");
    setInterimTranscript("");
    setError(null);
    setIsStreaming(true);
    // Capture the answer as a material so the draft updates even if the reply is terse.
    setMaterials((prev) => [...prev, `INFERENCE: ${segment.id}=${trimmed}`]);

    try {
      const response = await fetch("/api/ai/theater-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          clientId: clientId ?? undefined,
          currentSegmentId: segment.id,
          messages: nextMessages.slice(-12),
          knownMaterials: materials.slice(-40),
        }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.message ?? detail?.error ?? "建場訪談暫時無法回覆，請稍後再試。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let assistantRaw = "";
      let streaming = true;
      while (streaming) {
        const { done, value } = await reader.read();
        if (done) {
          streaming = false;
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        assistantRaw += chunk;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { role: "assistant", content: last.content + chunk };
          }
          return next;
        });
      }

      // The AI manages segment progression itself and signals the segment it is
      // currently focused on via a hidden [[SEG:<id>]] marker. Move the position
      // indicator from that signal and strip the marker from the visible reply.
      const segMatches = [...assistantRaw.matchAll(/\[\[SEG:([a-z0-9-]+)\]\]/gi)];
      const lastSeg = segMatches[segMatches.length - 1]?.[1];
      if (lastSeg) {
        const nextIndex = theaterFieldBuildOutline.segments.findIndex((item) => item.id === lastSeg);
        if (nextIndex >= 0) setSegmentIndex(nextIndex);
      }
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { role: "assistant", content: stripSegmentMarker(assistantRaw) };
        }
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "建場訪談發生未知錯誤。");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    if (voiceLive) {
      voiceDraftBaseRef.current = value;
      setInterimTranscript("");
    }
  }

  function handleComposerVoiceClick() {
    setInputMode("VOICE");
    if (voiceLive || (voiceConsentAccepted && voiceStage === "PAUSED")) {
      handlePauseVoice();
      return;
    }
    handleEnableVoice();
  }

  function startRecognition() {
    const Recognition =
      typeof window === "undefined"
        ? undefined
        : window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceStage("UNSUPPORTED");
      setVoiceError("此瀏覽器不支援語音輸入 API，請改用文字。建議使用 Chrome。");
      return;
    }

    setVoiceError(null);
    voiceDraftBaseRef.current = draft;
    const recognition = new Recognition();
    recognition.lang = "zh-TW";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (final) {
        const nextDraft = appendTranscriptText(voiceDraftBaseRef.current, final);
        voiceDraftBaseRef.current = nextDraft;
        setDraft(interim ? appendTranscriptText(nextDraft, interim) : nextDraft);
        setInterimTranscript("");
      }
      if (interim) {
        setDraft(appendTranscriptText(voiceDraftBaseRef.current, interim));
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorLike) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        listeningRef.current = false;
        setVoiceStage("PERMISSION_DENIED");
        setVoiceError("麥克風權限被拒絕，請改用文字輸入。");
      }
    };

    recognition.onend = () => {
      // Chrome ends recognition after silence; restart while the user is still listening.
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    try {
      recognition.start();
      setVoiceStage("LISTENING");
    } catch {
      setVoiceStage("LISTENING");
    }
  }

  function stopRecognition() {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setInterimTranscript("");
  }

  function handleEnableVoice() {
    setInputMode("VOICE");
    setVoiceConsentAccepted(true);
    startRecognition();
  }

  function handlePauseVoice() {
    if (voiceStage === "PAUSED") {
      startRecognition();
      return;
    }
    stopRecognition();
    setVoiceStage("PAUSED");
  }

  function addMaterial(text: string, dataClass: DataClass, category: MaterialCategory) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const field = CATEGORY_FIELD[category];
    let value = trimmed;
    if (field === "npc" && !trimmed.includes("|")) value = `${trimmed}|INFLUENCER`;
    const body = field ? `${field}=${value}` : value;
    setMaterials((prev) => [...prev, `${CLASS_PREFIX[dataClass]}: ${body}`]);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-hairline pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Link
            href="/theater"
            className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <ArrowLeft className="size-4" />
            返回 AI 劇場演練
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">Theater field build</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">劇場訪綱建場</h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {clientName ? `已帶入客戶「${clientName}」的已知資料，` : ""}用文字或語音，跟著訪綱把場域建出來。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{clientName ?? "獨立建場"}</p>
            <p className="text-xs text-muted-foreground">{ready ? "可開演" : "待補資料"}</p>
          </div>
          <Button variant="monoOutline" onClick={() => setPanelOpen(true)}>
            <PanelRightOpen className="size-4" />
            場域建構包
          </Button>
        </div>
      </header>

      {/* Conversation hero */}
      <section className="flex h-[calc(100dvh-13rem)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-hairline bg-card">
        <div className="flex flex-col gap-3 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">段落 {segmentLabel}</p>
            <h2 className="truncate text-base font-semibold text-ink">{segment.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={ready ? "success" : "outline"}>{ready ? "可開演" : "待補資料"}</Badge>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "ml-auto max-w-[78%]" : "mr-auto max-w-[82%]"}
            >
              <div
                className={
                  message.role === "user"
                    ? "whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-4 py-3 text-sm leading-6 text-paper"
                    : "whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-hairline bg-paper px-4 py-3 text-sm leading-6 text-ink"
                }
              >
                {stripSegmentMarker(message.content) || (isStreaming ? "思考中…" : "")}
              </div>
            </div>
          ))}
          <div ref={conversationEndRef} />
        </div>

        {error ? (
          <div className="flex items-start gap-2 border-t border-hairline bg-destructive/5 px-5 py-3 text-xs leading-5 text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="space-y-2 border-t border-hairline p-4">
          <div className="rounded-xl border border-hairline bg-paper p-2 transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15">
            <Textarea
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.nativeEvent.isComposing || isComposing)) return;
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={
                inputMode === "VOICE"
                  ? "語音轉寫會出現在這裡，送出前可修正…"
                  : clientName && segmentIndex === 0
                    ? "例如：初次見面、保單健檢、理賠說明…"
                    : segment.coreQuestions[0]?.text ?? "輸入你的回答…"
              }
              disabled={isStreaming}
              aria-label={inputMode === "VOICE" ? "語音轉寫，可手動修正後送出" : "你的回答"}
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
                        disabled={isStreaming}
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
                        disabled={!draft.trim() || isStreaming}
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
        </form>
      </section>

      {/* Secondary work — progressive disclosure in a right sheet */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>場域建構包</SheetTitle>
            <SheetDescription>角色、關係、已確認/推論/未知與手動補素材都收在這裡，需要時再展開。</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-8">
            <PanelSection icon={<Theater className="size-4 text-[#1A3A6B]" />} title="場域概要">
              <div className="space-y-2">
                <DraftRow label="狀態" value={ready ? "可開演" : "待補資料"} tone={ready ? "ok" : "warn"} />
                <DraftRow label="焦點客戶" value={packet.focusClient ?? "待確認"} />
                <DraftRow label="演練場景" value={packet.scenario ?? "待確認"} />
                <DraftRow label="陪演角色" value={`${packet.routeBCompatibility.npcCount}/${packet.routeBCompatibility.maxNpcCount} 位`} />
              </div>
            </PanelSection>

            {packet.characters.length ? (
              <PanelSection title="角色">
                <div className="space-y-2">
                  {packet.characters.map((character) => (
                    <div key={character.id} className="rounded-lg border border-hairline bg-paper px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{character.displayName}</p>
                        <Badge variant="outline">{ROLE_LABEL[character.role]}</Badge>
                      </div>
                      {character.personaHints.length ? (
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                          {character.personaHints.map((hint) => hint.label).join("；")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </PanelSection>
            ) : null}

            <PanelSection title="素材分層">
              <div className="grid gap-2">
                <DraftList icon={<CheckCircle2 className="size-3.5 text-[#2E7D32]" />} title="已確認事實" items={packet.confirmedFacts} empty="尚無可採用的確認事實。" />
                <DraftList icon={<Lightbulb className="size-3.5 text-amber-600" />} title="推論（保留推論語氣）" items={packet.inferredPersona} empty="尚無推論。" />
                <DraftList icon={<CircleHelp className="size-3.5 text-sky-600" />} title="待確認 / 旁白補問" items={[...packet.unknowns, ...packet.narratorQuestions]} empty="目前沒有待補問項。" />
                {packet.objections.length ? <DraftList icon={<AlertTriangle className="size-3.5 text-rose-600" />} title="可能異議" items={packet.objections} empty="" /> : null}
                {packet.sensitiveNotes.length ? <DraftList icon={<AlertTriangle className="size-3.5 text-rose-600" />} title="敏感點（演練時輕碰）" items={packet.sensitiveNotes} empty="" /> : null}
              </div>
            </PanelSection>

            <PanelSection icon={<Plus className="size-4 text-[#1A3A6B]" />} title="手動補素材">
              <AddMaterialForm onAdd={addMaterial} />
            </PanelSection>

            <PanelSection icon={<Sparkles className="size-4 text-[#1A3A6B]" />} title="完成建場">
              {completed ? (
                <p className="rounded-lg border border-hairline bg-paper px-3 py-2 text-sm leading-6 text-muted-foreground">
                  場域建構包已確認。多角色演練（Route B）尚未啟用，先停在這份可確認的建構包；啟用後即可直接帶入開演。
                </p>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  {ready ? "已具備焦點客戶、場景與確認事實，可以確認建構包。" : "仍缺焦點客戶、場景或確認事實，可以繼續訪談或手動補素材。"}
                </p>
              )}
              <Button variant="mono" className="mt-3 w-full" disabled={!ready || completed} onClick={() => setCompleted(true)}>
                <CheckCircle2 className="size-4" />
                確認場域建構包
              </Button>
            </PanelSection>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PanelSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
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

function DraftRow({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-hairline bg-paper px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          "text-right text-sm font-semibold " +
          (tone === "ok" ? "text-[#2E7D32]" : tone === "warn" ? "text-amber-700" : "text-ink")
        }
      >
        {value}
      </span>
    </div>
  );
}

function DraftList({ icon, title, items, empty }: { icon: React.ReactNode; title: string; items: string[]; empty: string }) {
  if (!items.length && !empty) return null;
  return (
    <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
        {icon}
        {title}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{items.length}</span>
      </p>
      {items.length ? (
        <ul className="mt-2 space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-xs leading-5 text-muted-foreground">
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

function AddMaterialForm({ onAdd }: { onAdd: (text: string, dataClass: DataClass, category: MaterialCategory) => void }) {
  const [text, setText] = useState("");
  const [dataClass, setDataClass] = useState<DataClass>("fact");
  const [category, setCategory] = useState<MaterialCategory>("focus");

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-muted-foreground">直接編輯場域建構包。推論與待確認不會被當成事實。</p>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as MaterialCategory)}
          className="h-9 rounded-md border border-hairline bg-card px-2 text-sm text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          aria-label="素材類別"
        >
          {(Object.keys(CATEGORY_LABEL) as MaterialCategory[]).map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABEL[value]}
            </option>
          ))}
        </select>
        <select
          value={dataClass}
          onChange={(event) => setDataClass(event.target.value as DataClass)}
          className="h-9 rounded-md border border-hairline bg-card px-2 text-sm text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          aria-label="資料可信度"
        >
          {(Object.keys(CLASS_LABEL) as DataClass[]).map((value) => (
            <option key={value} value={value}>
              {CLASS_LABEL[value]}
            </option>
          ))}
        </select>
      </div>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={category === "role" ? "例：王太太｜或 王太太|DECISION_MAKER" : "輸入內容…"}
        className="min-h-16 resize-none"
        aria-label="素材內容"
      />
      <Button
        type="button"
        variant="monoOutline"
        className="w-full"
        disabled={!text.trim()}
        onClick={() => {
          onAdd(text, dataClass, category);
          setText("");
        }}
      >
        <Plus className="size-4" />
        加入建構包
      </Button>
    </div>
  );
}

type ClientDetail = {
  id: string;
  name: string;
  occupation?: string;
  annualIncome?: number;
  sensitivityLevel?: "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE";
  family?: Array<{ name: string; relation?: string }>;
  existingPolicies?: Array<{ type?: string; provider?: string }>;
};

function seedMaterialsFromClient(client: ClientDetail): string[] {
  const materials: string[] = [`FACT: focus_client=${client.name}`];
  if (client.occupation) materials.push(`FACT: ${client.name} 的職業是 ${client.occupation}`);
  if (typeof client.annualIncome === "number" && client.annualIncome > 0) {
    materials.push(`FACT: ${client.name} 年收入約 ${client.annualIncome}`);
  }
  for (const member of client.family ?? []) {
    if (!member.name) continue;
    materials.push(`INFERENCE: npc=${member.name}|INFLUENCER`);
    materials.push(`FACT: relationship=${client.name} 的${member.relation ?? "家人"}：${member.name}`);
  }
  for (const policy of client.existingPolicies ?? []) {
    if (!policy.type) continue;
    materials.push(`FACT: ${client.name} 已有保單：${policy.type}${policy.provider ? `（${policy.provider}）` : ""}`);
  }
  if (client.sensitivityLevel && client.sensitivityLevel !== "NORMAL") {
    materials.push(`UNKNOWN: ${client.name} 屬${client.sensitivityLevel === "HIGHLY_SENSITIVE" ? "高敏感" : "敏感"}客戶，敏感資訊需先確認再使用`);
  }
  return materials;
}

/* ---- Minimal Web Speech API typings (not in lib.dom for all targets) ---- */
type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = { isFinal: boolean; 0: SpeechRecognitionAlternativeLike; length: number };
type SpeechRecognitionResultListLike = { length: number; [index: number]: SpeechRecognitionResultLike };
type SpeechRecognitionEventLike = { resultIndex: number; results: SpeechRecognitionResultListLike };
type SpeechRecognitionErrorLike = { error: string };

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  }
}
