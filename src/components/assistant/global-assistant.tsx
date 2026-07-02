"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useReducedMotion } from "motion/react";
import { useAssistantStore } from "@/domains/assistant/store";
import { useClientStore } from "@/domains/client/store";
import { assistantService } from "@/domains/assistant/service";
import {
  AssistantMessage,
  AssistantStreamEvent,
  AssistantRunStep,
  AssistantArtifact,
} from "@/domains/assistant/types";
import { StepTrail, VisitPackageCard } from "./assistant-artifacts";
import {
  Bot,
  X,
  Sparkles,
  Zap,
  ArrowRight,
  SquarePen,
  Clock,
  Trash2,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormattedTime } from "@/components/ui/formatted-time";
import { AssistantInsights } from "./assistant-insights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function describeChatError(res: Response): Promise<{ message: string; shouldRelogin: boolean }> {
  let code: string | undefined;
  let serverMessage: string | undefined;
  try {
    const data = await res.json();
    code = typeof data?.error === "string" ? data.error : undefined;
    serverMessage = typeof data?.message === "string" ? data.message : undefined;
  } catch {
    // ignore non-JSON error bodies
  }

  if (res.status === 401 || code === "UNAUTHENTICATED") {
    return { message: "登入狀態已失效，請重新登入後再使用助理。", shouldRelogin: true };
  }
  if (res.status === 429) {
    return { message: serverMessage ?? "AI 使用額度已用完，請聯絡管理員或升級方案。", shouldRelogin: false };
  }
  if (res.status === 400) {
    return { message: "訊息格式不正確，請重新輸入後再送出。", shouldRelogin: false };
  }
  return { message: serverMessage ?? "助理暫時無法回應，請稍後再試。", shouldRelogin: false };
}

function parseStreamEvent(line: string): AssistantStreamEvent | null {
  try {
    return JSON.parse(line) as AssistantStreamEvent;
  } catch {
    return null;
  }
}

/**
 * Apply one streamed event to the in-flight assistant message. Steps and
 * artifacts are written straight to the store (so they render live); the final
 * text / error are returned to the caller for the typewriter / toast.
 */
function applyStreamEvent(event: AssistantStreamEvent): { text?: string; error?: string } {
  const store = useAssistantStore.getState();
  const conv = store.conversations.find((c) => c.id === store.activeConversationId);
  const last = conv?.messages[conv.messages.length - 1];

  switch (event.type) {
    case "step": {
      const existing: AssistantRunStep[] = last?.steps ?? [];
      const idx = existing.findIndex((s) => s.id === event.id);
      const nextSteps: AssistantRunStep[] =
        idx >= 0
          ? existing.map((s, i) =>
              i === idx ? { ...s, status: event.status, label: event.label ?? s.label } : s,
            )
          : [...existing, { id: event.id, label: event.label ?? "", status: event.status }];
      store.patchLastMessage({ steps: nextSteps });
      return {};
    }
    case "artifact": {
      const existing: AssistantArtifact[] = last?.artifacts ?? [];
      store.patchLastMessage({ artifacts: [...existing, event.artifact] });
      return {};
    }
    case "text":
      return { text: event.content };
    case "error":
      return { error: event.message };
    default:
      return {};
  }
}

export function GlobalAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    activeConversationId,
    addMessage,
    createConversation,
    switchConversation,
    deleteConversation,
    isPanelOpen,
    togglePanel,
    suggestions,
    setSuggestions
  } = useAssistantStore();

  const messages = useMemo(
    () => conversations.find(c => c.id === activeConversationId)?.messages ?? [],
    [activeConversationId, conversations]
  );

  // Surface the active client when viewing a /crm/<clientId> page so the assistant
  // can ground questions about that specific client (incl. "X是誰" / pronoun follow-ups).
  const crmClientId = useMemo(() => {
    const match = pathname.match(/^\/crm\/([^/]+)/);
    return match?.[1];
  }, [pathname]);
  const activeClientName = useClientStore((state) =>
    crmClientId ? state.getClientById(crmClientId)?.name : undefined,
  );

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const [showHistory, setShowHistory] = useState(false);
  // Id of the assistant message currently being revealed with the typewriter
  // effect. Drives the blinking caret and suppresses the "awaiting" dots.
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messageIdCounter = useRef(0);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Clear any running typewriter interval when the panel unmounts.
  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, []);

  // Reveal the assistant's reply progressively, like a copilot typing back.
  // Speed adapts to length so short replies feel snappy and long ones stay
  // under a couple of seconds. Reduced-motion users get the full text at once.
  const revealReply = useCallback(
    (messageId: string, fullText: string) =>
      new Promise<void>((resolve) => {
        if (typewriterRef.current) {
          clearInterval(typewriterRef.current);
          typewriterRef.current = null;
        }

        if (prefersReducedMotion || fullText.length <= 2) {
          useAssistantStore.getState().updateLastMessage(fullText);
          resolve();
          return;
        }

        setStreamingId(messageId);
        const total = fullText.length;
        const step = Math.min(6, Math.max(1, Math.ceil(total / 60)));
        let index = 0;

        typewriterRef.current = setInterval(() => {
          index = Math.min(total, index + step);
          useAssistantStore.getState().updateLastMessage(fullText.slice(0, index));
          if (index >= total) {
            if (typewriterRef.current) clearInterval(typewriterRef.current);
            typewriterRef.current = null;
            setStreamingId(null);
            resolve();
          }
        }, 24);
      }),
    [prefersReducedMotion],
  );

  useEffect(() => {
    const context = { route: pathname };
    const nextSuggestions = assistantService.getStaticSuggestions(context);
    setSuggestions(nextSuggestions);
  }, [pathname, setSuggestions]);

  useEffect(() => {
    if (scrollRef.current && !showHistory) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, showHistory]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim() || isTyping) return;
    setActiveTab("chat");
    setShowHistory(false);

    const userMsg: AssistantMessage = {
      id: `user-${activeConversationId ?? "new"}-${messageIdCounter.current++}`,
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const currentMessages = messages;
    setInput("");
    addMessage(userMsg);
    setIsTyping(true);

    const assistantMsg: AssistantMessage = {
      id: `assistant-${activeConversationId ?? "new"}-${messageIdCounter.current++}`,
      role: 'assistant',
      content: "",
      createdAt: new Date().toISOString(),
    };

    // Empty placeholder — while it is blank the bouncing dots stand in for it.
    addMessage({ ...assistantMsg });

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...currentMessages, userMsg],
          context: {
            route: pathname,
            conversationId: activeConversationId ?? undefined,
            clientId: crmClientId,
            clientName: activeClientName,
          }
        }),
      });

      if (!res.ok) {
        const { message, shouldRelogin } = await describeChatError(res);
        useAssistantStore.getState().replaceLastMessage({ ...assistantMsg, content: message });
        toast.error(message);
        if (shouldRelogin) {
          router.push("/login");
        }
        return;
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // The server streams newline-delimited JSON events (step / artifact / text).
      // We apply steps + artifacts to the assistant message live so the reasoning
      // trail appears as it happens, and hold the final text for the typewriter.
      let buffer = "";
      let finalText = "";
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          const event = parseStreamEvent(line);
          if (!event) continue;
          const outcome = applyStreamEvent(event);
          if (outcome.text !== undefined) finalText = outcome.text;
          if (outcome.error !== undefined) streamError = outcome.error;
        }
      }
      const tail = buffer.trim();
      if (tail) {
        const event = parseStreamEvent(tail);
        if (event) {
          const outcome = applyStreamEvent(event);
          if (outcome.text !== undefined) finalText = outcome.text;
          if (outcome.error !== undefined) streamError = outcome.error;
        }
      }

      if (streamError) {
        useAssistantStore.getState().patchLastMessage({ content: streamError });
        toast.error(streamError);
        return;
      }

      const tools = assistantService.parseTools(finalText);
      tools.forEach(tool => {
        if (tool.action === 'NAVIGATE') {
          toast.info(`正在導航至 ${tool.params}`);
          router.push(tool.params);
        }
      });

      const finalContent = assistantService.cleanResponse(finalText);
      await revealReply(assistantMsg.id, finalContent);

    } catch {
      const message = "助理連線失敗，請稍後再試。";
      useAssistantStore.getState().replaceLastMessage({ ...assistantMsg, content: message });
      toast.error(message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    createConversation();
    setActiveTab("chat");
    setShowHistory(false);
  };

  const handleHistoryToggle = () => {
    setActiveTab("chat");
    setShowHistory(h => !h);
  };

  // Show the bouncing dots only while waiting for the very first stream event;
  // once a step / text / artifact lands, the reasoning trail takes over.
  const lastMessage = messages[messages.length - 1];
  const awaitingFirstEvent =
    isTyping &&
    !streamingId &&
    (!lastMessage ||
      lastMessage.role !== 'assistant' ||
      (lastMessage.content.length === 0 &&
        (lastMessage.steps?.length ?? 0) === 0 &&
        (lastMessage.artifacts?.length ?? 0) === 0));

  return (
    <div
      className={cn(
        "h-full border-r bg-white dark:bg-[#0F2744] transition-all duration-300 overflow-hidden flex flex-col z-30",
        "border-[#CFD8DC] dark:border-[rgba(144,202,249,0.15)]",
        isPanelOpen ? "w-80 opacity-100 shadow-xl" : "w-0 opacity-0 border-none"
      )}
    >
      <div className="flex flex-col h-full min-w-[20rem]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#CFD8DC] dark:border-[rgba(144,202,249,0.15)] bg-[#F7FAFF]/80 dark:bg-[#1A3A6B]/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1A3A6B] flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5 text-[#C9A227]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold leading-tight text-[#0A2342] dark:text-white">誠問 AI 助手</h2>
              <p className="text-[9px] font-semibold text-[#546E7A] dark:text-[#90CAF9] uppercase tracking-widest mt-0.5">
                Sincere Question Copilot
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHistoryToggle}
              aria-label={showHistory ? "關閉對話歷史" : "開啟對話歷史"}
              className={cn("rounded-xl w-8 h-8 text-[#546E7A] hover:text-[#1565C0] hover:bg-[#EBF3FB]", showHistory && "bg-[#EBF3FB] text-[#1565C0]")}
              title="對話歷史"
            >
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              aria-label="開始新對話"
              className="rounded-xl w-8 h-8 text-[#546E7A] hover:text-[#1565C0] hover:bg-[#EBF3FB]"
              title="新對話"
            >
              <SquarePen className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => togglePanel(false)}
              aria-label="關閉誠問 AI 助手"
              className="rounded-xl w-8 h-8 text-[#546E7A] hover:text-[#0A2342] hover:bg-[#EBF3FB]"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar"
        >
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== "chat") setShowHistory(false); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#EBF3FB] dark:bg-[#1A3A6B]/30 rounded-xl p-1 h-9">
              <TabsTrigger value="insights" className="rounded-lg text-xs font-semibold text-[#546E7A] data-[state=active]:bg-white dark:data-[state=active]:bg-[#0F2744] data-[state=active]:text-[#1565C0] data-[state=active]:shadow-sm">
                AI 洞察
              </TabsTrigger>
              <TabsTrigger value="chat" className="rounded-lg text-xs font-semibold text-[#546E7A] data-[state=active]:bg-white dark:data-[state=active]:bg-[#0F2744] data-[state=active]:text-[#1565C0] data-[state=active]:shadow-sm">
                智能對話
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="mt-0 animate-in fade-in slide-in-from-left-4 duration-300">
              <AssistantInsights />
            </TabsContent>

            <TabsContent value="chat" className="mt-0 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              {showHistory ? (
                /* History List */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#546E7A] uppercase tracking-widest">對話歷史</p>
                    <span className="text-[10px] text-[#546E7A]">{conversations.length} 則對話</span>
                  </div>
                  {conversations.length === 0 ? (
                    <div className="py-10 text-center">
                      <MessageSquare className="w-7 h-7 text-[#90CAF9] mx-auto mb-3" strokeWidth={1.5} />
                      <p className="text-sm text-[#546E7A]">尚無歷史對話</p>
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <div
                        key={conv.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`切換到對話：${conv.title}`}
                        onClick={() => { switchConversation(conv.id); setShowHistory(false); }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            switchConversation(conv.id);
                            setShowHistory(false);
                          }
                        }}
                        className={cn(
                          "w-full cursor-pointer text-left p-3 rounded-xl border transition-all group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          conv.id === activeConversationId
                            ? "bg-[#EBF3FB] border-[#90CAF9]/40 dark:bg-[#1A3A6B]/40"
                            : "border-[#CFD8DC] dark:border-[rgba(144,202,249,0.15)] hover:bg-[#F7FAFF] dark:hover:bg-[#1A3A6B]/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-[#0A2342] dark:text-[#E8F0FE] truncate flex-1 leading-snug">
                            {conv.title}
                          </p>
                          <button
                            type="button"
                            aria-label={`刪除對話：${conv.title}`}
                            onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                            className="opacity-100 text-[#546E7A] hover:text-[#B71C1C] transition-opacity flex-shrink-0 mt-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                        <p className="text-[10px] text-[#546E7A] mt-1">
                          {conv.messages.length} 則訊息 · <FormattedTime isoString={conv.updatedAt} />
                        </p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Chat Messages */
                <>
                  {messages.length === 0 && (
                    <div className="py-10 text-center space-y-4">
                      <div className="w-14 h-14 bg-[#EBF3FB] dark:bg-[#1A3A6B]/40 rounded-full flex items-center justify-center mx-auto">
                        <Sparkles className="w-7 h-7 text-[#C9A227]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[15px] text-[#0A2342] dark:text-white">有什麼我可以幫您的？</h4>
                        <p className="text-sm text-[#546E7A] dark:text-[#90CAF9] mt-1.5 leading-relaxed">
                          您可以問我關於此頁面的事，<br />或要求我導覽至其他功能。
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((m) => {
                    const isAssistant = m.role === 'assistant';
                    const hasContent = m.content.length > 0;
                    const steps = m.steps ?? [];
                    const artifacts = m.artifacts ?? [];

                    // A blank assistant message with no steps / artifacts is the
                    // placeholder awaiting a reply — the dots represent it.
                    if (isAssistant && !hasContent && steps.length === 0 && artifacts.length === 0) {
                      return null;
                    }

                    const caret =
                      m.id === streamingId
                        ? '<span class="inline-block w-[2px] h-[1em] -mb-[2px] ml-0.5 align-baseline bg-current animate-pulse rounded-full"></span>'
                        : '';

                    return (
                      <div key={m.id} className={cn("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                        {isAssistant && steps.length > 0 && <StepTrail steps={steps} />}

                        {hasContent && (
                          <div className={cn(
                            "max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                            m.role === 'user'
                              ? "bg-[#EBF3FB] dark:bg-[#1A3A6B]/50 text-[#0A2342] dark:text-[#E8F0FE] rounded-tr-sm font-medium"
                              : "bg-[#1A3A6B] text-white rounded-tl-sm ring-4 ring-[#EBF3FB] dark:ring-[#1A3A6B]/20"
                          )}
                            dangerouslySetInnerHTML={{
                              __html: m.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n/g, '<br/>') + caret
                            }}
                          />
                        )}

                        {isAssistant && artifacts.map((a) => (
                          <div key={a.id} className="mt-2 w-full max-w-full">
                            {a.kind === 'visit_package' && <VisitPackageCard artifact={a} />}
                          </div>
                        ))}

                        <span className="text-[9px] font-semibold text-[#546E7A] mt-1 uppercase tracking-tighter">
                          {m.role} · <FormattedTime isoString={m.createdAt} />
                        </span>
                      </div>
                    );
                  })}

                  {awaitingFirstEvent && (
                    <div className="flex items-center gap-1.5 pl-1">
                      <div className="w-2 h-2 bg-[#1565C0] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-[#1565C0] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-[#1565C0] rounded-full animate-bounce" />
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#CFD8DC] dark:border-[rgba(144,202,249,0.15)] space-y-3 bg-white/70 dark:bg-[#0F2744]/70 backdrop-blur-sm shrink-0">
          {!showHistory && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSend(s.label)}
                  className="px-3 py-1.5 rounded-full bg-[#F7FAFF] dark:bg-[#1A3A6B]/20 border border-[#CFD8DC] dark:border-[rgba(144,202,249,0.2)] text-[10px] font-semibold text-[#546E7A] dark:text-[#90CAF9] hover:bg-[#EBF3FB] hover:text-[#1565C0] hover:border-[#90CAF9] transition-all flex items-center gap-1.5 text-left"
                >
                  <Zap className="w-3 h-3 text-[#C9A227]" strokeWidth={1.5} /> {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <Textarea
              placeholder="輸入指令或問題..."
              className="rounded-2xl border-[#CFD8DC] dark:border-[rgba(144,202,249,0.2)] bg-[#F7FAFF] dark:bg-[#1A3A6B]/20 min-h-[56px] max-h-[120px] pr-12 focus-visible:ring-[#1565C0]/20 focus-visible:border-[#1565C0] py-3.5 text-sm text-[#0A1929] dark:text-[#E8F0FE] placeholder:text-[#546E7A] font-medium resize-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.key === "Process") {
                  return;
                }

                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="icon"
              aria-label="送出誠問 AI 助手訊息"
              className={cn(
                "absolute right-2 bottom-2 w-8 h-8 rounded-xl transition-all",
                input.trim() ? "bg-[#1A3A6B] text-white scale-100 hover:bg-[#1565C0]" : "scale-0 bg-[#EBF3FB]"
              )}
              onClick={() => handleSend()}
            >
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
