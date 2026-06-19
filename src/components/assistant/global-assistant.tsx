"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAssistantStore } from "@/domains/assistant/store";
import { useClientStore } from "@/domains/client/store";
import { assistantService } from "@/domains/assistant/service";
import { AssistantMessage } from "@/domains/assistant/types";
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
  const messageIdCounter = useRef(0);

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

    addMessage({ ...assistantMsg, content: "...思考中" });

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

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        useAssistantStore.getState().updateLastMessage(fullText);
      }

      const tools = assistantService.parseTools(fullText);
      tools.forEach(tool => {
        if (tool.action === 'NAVIGATE') {
          toast.info(`正在導航至 ${tool.params}`);
          router.push(tool.params);
        }
      });

      const finalContent = assistantService.cleanResponse(fullText);
      useAssistantStore.getState().replaceLastMessage({ ...assistantMsg, content: finalContent });

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

                  {messages.map((m) => (
                    <div key={m.id} className={cn("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                        m.role === 'user'
                          ? "bg-[#EBF3FB] dark:bg-[#1A3A6B]/50 text-[#0A2342] dark:text-[#E8F0FE] rounded-tr-sm font-medium"
                          : "bg-[#1A3A6B] text-white rounded-tl-sm ring-4 ring-[#EBF3FB] dark:ring-[#1A3A6B]/20"
                      )}
                        dangerouslySetInnerHTML={{
                          __html: m.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>')
                        }}
                      />
                      <span className="text-[9px] font-semibold text-[#546E7A] mt-1 uppercase tracking-tighter">
                        {m.role} · <FormattedTime isoString={m.createdAt} />
                      </span>
                    </div>
                  ))}

                  {isTyping && (
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
