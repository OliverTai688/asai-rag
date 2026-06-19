"use client";

import { useState, useEffect, useRef } from "react";
import { useSpinStore } from "@/domains/spin/store";
import { spinService } from "@/domains/spin/service";
import { SpinMessage, SpinPhase, SpinSession } from "@/domains/spin/types";
import { eventService } from "@/domains/event/service";
import { reportService } from "@/domains/report/service";
import { useReportStore } from "@/domains/report/store";
import { clientService } from "@/domains/client/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  ChevronLeft,
  Sparkles,
  User,
  Bot,
  ArrowRight,
  RefreshCcw,
  CheckCircle2,
  FileText,
  Swords,
  ScrollText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Briefcase,
  Users,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Markdown } from "@/components/ui/markdown";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { demoQuickstart, getQuickstartSpinFixture, getQuickstartStep } from "@/domains/demo/quickstart";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { spinTourSteps } from "@/domains/demo/tour-steps";

// ---- 型別 ----
interface SpinSuggestion {
  spinType: "S" | "P" | "I" | "N";
  question: string;
  rationale: string;
}

const SPIN_TYPE_COLOR: Record<SpinSuggestion["spinType"], string> = {
  S: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
  P: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
  I: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300",
  N: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
};

const SPIN_TYPE_LABEL: Record<SpinSuggestion["spinType"], string> = {
  S: "情況",
  P: "問題",
  I: "暗示",
  N: "需求",
};

export default function SpinConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdCounterRef = useRef(0);

  const { getSessionById, getMessages, addMessage, updateSession } = useSpinStore();
  const session = getSessionById(sessionId);
  const initialMessages = getMessages(sessionId);

  const [messages, setMessages] = useState<SpinMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // 訪談大綱 Sheet
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outline, setOutline] = useState<string | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [copied, setCopied] = useState(false);

  // 動態問題建議
  const [suggestions, setSuggestions] = useState<SpinSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  // 客戶輪廓面板
  const [profileOpen, setProfileOpen] = useState(false);
  const client = session ? clientService.getClientById(session.clientId) : null;

  // 已儲存的報告 ID（生成大綱時同步儲存）
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const isQuickstart = searchParams.get("demo") === "quickstart";

  const createMessageId = (prefix: string) => {
    messageIdCounterRef.current += 1;
    return `${prefix}_${sessionId}_${messageIdCounterRef.current}`;
  };

  useEffect(() => {
    if (isQuickstart && !session) {
      router.replace(`/spin?clientId=${demoQuickstart.clientId}&autoCreate=true&demo=quickstart`);
    }
  }, [isQuickstart, router, session]);

  // AI 主動開場：新 session 沒有訊息時自動問候
  useEffect(() => {
    if (initialMessages.length > 0 || !session || session.phase === "COMPLETE") return;

    let cancelled = false;
    const greetingId = createMessageId("greeting");

    (async () => {
      await new Promise(r => setTimeout(r, 400)); // 稍作延遲，讓畫面先渲染
      if (cancelled) return;

      setIsTyping(true);
      try {
        const res = await fetch("/api/ai/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: session.phase, mode: session.mode, clientId: session.clientId, messages: [] }),
        });
        if (!res.body || cancelled) return;

        const greetingMsg: SpinMessage = {
          id: greetingId, sessionId, role: "assistant", type: "CHAT",
          phase: session.phase, content: "", createdAt: new Date().toISOString(), isStreaming: true,
        };
        setMessages([greetingMsg]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const textChunks: string[] = [];
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          textChunks.push(decoder.decode(value));
          const fullText = textChunks.join("");
          setMessages([{ ...greetingMsg, content: spinService.cleanResponse(fullText) }]);
        }
        if (cancelled) return;

        const fullText = textChunks.join("");
        const finalMsg = { ...greetingMsg, content: spinService.cleanResponse(fullText), isStreaming: false };
        setMessages([finalMsg]);
        addMessage(sessionId, finalMsg);
      } finally {
        if (!cancelled) setIsTyping(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自動捲動
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!session) {
    return (
      <div className="p-20 text-center text-sm font-semibold text-zinc-500">
        {isQuickstart ? "載入 Quickstart AI 顧問陪談..." : "對話不存在"}
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: SpinMessage = {
      id: createMessageId("user"),
      sessionId,
      role: "user",
      type: "CHAT",
      phase: session.phase,
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    const currentInput = input;
    setInput("");
    setSuggestions([]); // 送出後清空建議
    setMessages(prev => [...prev, userMsg]);
    addMessage(sessionId, userMsg);

    setIsTyping(true);

    try {
      const res = await fetch("/api/ai/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: session.phase,
          mode: session.mode,
          clientId: session.clientId,
          messages: [...messages, userMsg],
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const assistantMsg: SpinMessage = {
        id: createMessageId("assistant"),
        sessionId,
        role: "assistant",
        type: "CHAT",
        phase: session.phase,
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, assistantMsg]);

      const textChunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        textChunks.push(chunk);
        const fullText = textChunks.join("");
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: spinService.cleanResponse(fullText) }];
        });
      }

      const fullText = textChunks.join("");
      // 解析結構化數據
      const structuredData = spinService.parseStructuredData(fullText);
      structuredData.forEach(item => {
        const msgType = item.type as string;
        if (msgType === "INSIGHT" || msgType === "OUTPUT") {
          useSpinStore.getState().addOutput(sessionId, session.phase, item.content);
        } else if (msgType === "PROFILE") {
          const colonIdx = item.content.indexOf(":");
          if (colonIdx !== -1) {
            const key = item.content.slice(0, colonIdx);
            const value = item.content.slice(colonIdx + 1).trim();
            if (key === "tag" && value) {
              const currentClient = clientService.getClientById(session.clientId);
              if (currentClient && !currentClient.aiTags.includes(value)) {
                clientService.updateClient(session.clientId, {
                  aiTags: [...currentClient.aiTags, value],
                });
              }
            }
          }
        }
      });

      // 檢查階段完成
      if (spinService.checkPhaseComplete(fullText)) {
        toast.info("AI 判定當前階段目標已跨越，建議進入下一階段。", {
          action: {
            label: "進入下一步",
            onClick: () => handleAdvancePhase("AI"),
          },
        });
      }

      const finalContent = spinService.cleanResponse(fullText);
      const finalMsg = { ...assistantMsg, content: finalContent, isStreaming: false };

      setMessages(prev => [...prev.slice(0, -1), finalMsg]);
      addMessage(sessionId, finalMsg);
      updateSession(sessionId, { updatedAt: new Date().toISOString() });

      // 串流結束後拉取問題建議（非阻塞）
      if (session.phase !== "COMPLETE") {
        fetch("/api/ai/spin-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase: session.phase,
            mode: session.mode,
            clientId: session.clientId,
            lastUserMessage: currentInput,
          }),
        })
          .then(r => r.json())
          .then(({ suggestions: suggs }) => {
            if (Array.isArray(suggs) && suggs.length > 0) {
              setSuggestions(suggs);
              setSuggestionsOpen(true);
            }
          })
          .catch(() => {/* 建議列失敗不影響主流程 */});
      }
    } catch {
      toast.error("AI 回應失敗，請稍後再試");
    } finally {
      setIsTyping(false);
    }
  };

  const handleAdvancePhase = (trigger: "AI" | "USER" = "USER") => {
    const nextPhase = spinService.getNextPhase(session.phase);
    useSpinStore.getState().recordTransition(sessionId, session.phase, nextPhase, trigger);
    updateSession(sessionId, { phase: nextPhase });
    setSuggestions([]);
    toast.success(`已切換至 ${phaseLabel[nextPhase] ?? nextPhase} 階段`);
  };

  const handleModeToggle = () => {
    const nextMode = session.mode === "SELF_CLARIFY" ? "QUESTION_DESIGN" : "SELF_CLARIFY";
    updateSession(sessionId, { mode: nextMode });
    toast.success(`已切換至 ${nextMode === "SELF_CLARIFY" ? "自我釐清" : "問題設計"} 模式`);
  };

  const handleEndSession = () => {
    const structuredSummary = {
      keyInsights: session.outputs.SITUATION,
      keyProblems: session.outputs.PROBLEM,
      suggestedActions: session.outputs.IMPLICATION.concat(session.outputs.NEED_PAYOFF),
    };
    const totalInsights = Object.values(session.outputs).flat().length;
    updateSession(sessionId, {
      phase: "COMPLETE",
      summary: structuredSummary,
      updatedAt: new Date().toISOString(),
    });
    setSuggestions([]);

    // Phase 4-1: 自動寫入 SPIN 事件到客戶互動時間軸
    eventService.trackEvent(
      session.clientId,
      session.clientName,
      "SPIN",
      `SPIN 對話完成 — ${session.clientName}`,
      `已整理 ${totalInsights} 筆洞察，完成 ${session.transitions?.length ?? 0} 個階段切換`,
      { sessionId }
    );

    toast.success("成功生成對話摘要報告！");
  };

  const handleGenerateOutline = async () => {
    if (isGeneratingOutline) return;
    setIsGeneratingOutline(true);
    setOutlineOpen(true);

    try {
      const clientCtx = spinService.getClientContext(session.clientId);
      const res = await fetch("/api/mock/ai/spin-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          clientInfo: typeof clientCtx === "object" ? clientCtx.profile : { name: session.clientName },
        }),
      });
      const { outline: md } = await res.json();
      setOutline(md);

      // Task 3-5 + Phase 4-2: 同步儲存到客戶報告（每次 session 只存一次）
      if (!savedReportId) {
        const report = reportService.generateReport({
          clientId: session.clientId,
          clientName: session.clientName,
          spinSession: session,
        });
        useReportStore.getState().addReport(report);
        setSavedReportId(report.id);
      }
    } catch {
      toast.error("生成訪談大綱失敗，請稍後再試");
      setOutlineOpen(false);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleCopyOutline = async () => {
    if (!outline) return;
    await navigator.clipboard.writeText(outline);
    setCopied(true);
    toast.success("已複製到剪貼簿");
    setTimeout(() => setCopied(false), 2000);
  };

  const phaseLabel: Record<string, string> = {
    SITUATION: "情境",
    PROBLEM: "問題",
    IMPLICATION: "暗示",
    NEED_PAYOFF: "需求",
    COMPLETE: "完成",
  };

  const currentPhaseOutputs =
    session.phase !== "COMPLETE"
      ? (session.outputs[session.phase as keyof typeof session.outputs] ?? [])
      : [];

  if (isQuickstart) {
    return <QuickstartSpinView session={session} />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/spin"
            aria-label="回 AI 顧問陪談"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
              AI 顧問陪談
            </p>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{session.clientName}</h2>
              <Badge variant="outline" className="bg-[#EBF3FB] dark:bg-[#1A3A6B]/20 text-[#1565C0] border-none font-bold">
                {session.mode === "SELF_CLARIFY" ? "思考模式" : "提議模式"}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 font-medium tracking-wide">
              當前進度：{phaseLabel[session.phase] ?? session.phase}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.phase !== "COMPLETE" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-bold gap-2 text-red-500 border-red-500/20 hover:bg-red-50"
              onClick={handleEndSession}
            >
              結束對話
            </Button>
          )}
          <Button variant="ghost" size="sm" className="rounded-xl font-bold gap-2" onClick={handleModeToggle}>
            <RefreshCcw className="w-4 h-4" /> 切換模式
          </Button>
        </div>
      </div>

      <QuickstartGuide
        currentStepId="spin"
        compact
        className="mb-4"
        nextHref={`/theater?clientId=${session.clientId}&spinId=${session.id}&autoCreate=true&demo=quickstart`}
        nextLabel="下一步：劇場演練"
      />

      {/* Phase Stepper */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF"] as const).map((p, i) => {
          const phases: SpinPhase[] = ["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF", "COMPLETE"];
          const currentIdx = phases.indexOf(session.phase);
          const isCompleted = currentIdx > i;
          const isCurrent = currentIdx === i;
          const count = session.outputs[p]?.length ?? 0;

          return (
            <div key={p} className="space-y-1.5">
              <div className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                isCurrent
                  ? "bg-[#1A3A6B] shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                  : isCompleted
                    ? "bg-[#2196F3]"
                    : "bg-zinc-100 dark:bg-zinc-800"
              )} />
              <div className="flex items-center justify-center gap-1">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-tighter",
                  isCurrent
                    ? "text-[#1565C0]"
                    : isCompleted
                      ? "text-zinc-500 font-bold"
                      : "text-zinc-300 font-medium"
                )}>
                  {p.split("_")[0]}
                </p>
                {count > 0 && (
                  <span className={cn(
                    "text-[9px] font-black rounded-full px-1 min-w-[14px] text-center",
                    isCurrent
                      ? "bg-[#1A3A6B] text-white"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                  )}>
                    {count}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase advance bar */}
      {session.phase !== "COMPLETE" && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">
            {phaseLabel[session.phase]} 階段
          </span>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-xl font-bold text-xs gap-1.5 h-7 px-3 transition-all",
              currentPhaseOutputs.length > 0
                ? "border-[#1565C0]/30 text-[#1565C0] hover:bg-[#EBF3FB] dark:hover:bg-[#1A3A6B]/20"
                : "border-zinc-200 text-zinc-300 cursor-not-allowed"
            )}
            disabled={currentPhaseOutputs.length === 0 || isTyping}
            onClick={() => handleAdvancePhase("USER")}
          >
            進入下一階段 <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* 客戶輪廓面板（收合式） */}
      {client && (
        <div className="mb-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            onClick={() => setProfileOpen(v => !v)}
          >
            <span className="flex items-center gap-1.5">
              <User className="w-3 h-3" /> 客戶輪廓
            </span>
            {profileOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {profileOpen && (
            <div className="px-4 pb-3 grid grid-cols-3 gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="flex items-start gap-2">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">職業</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">{client.occupation || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">現有保單</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {client.existingPolicies?.length ? `${client.existingPolicies.length} 張` : "無資料"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">家庭成員</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {client.family?.length ? `${client.family.length} 人` : "無資料"}
                  </p>
                </div>
              </div>
              {client.annualIncome > 0 && (
                <div className="col-span-3 flex items-center gap-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">年收入</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {(client.annualIncome / 10000).toFixed(0)} 萬
                  </p>
                  {client.aiTags?.length > 0 && (
                    <div className="flex gap-1 ml-auto">
                      {client.aiTags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full px-2 py-0.5 font-bold">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase Outputs Indicator */}
      <div className="flex flex-wrap gap-2 mb-3">
        {session.phase !== "COMPLETE" && currentPhaseOutputs.map((out, i) => (
          <Badge key={i} variant="secondary" className="bg-green-50 text-green-700 animate-in zoom-in-95 duration-300 font-bold border-none">
            {out}
          </Badge>
        ))}
        {session.phase !== "COMPLETE" && currentPhaseOutputs.length === 0 && (
          <span className="text-[10px] text-zinc-400 font-bold tracking-widest italic ml-1">WAITING FOR INSIGHTS...</span>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar scroll-smooth"
      >
        <div className="space-y-6 pb-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2",
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                m.role === "user" ? "bg-zinc-900 text-white" : "bg-[#1A3A6B] text-white"
              )}>
                {m.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tr-sm font-medium whitespace-pre-wrap"
                  : "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-tl-sm"
              )}>
                {m.role === "user" ? (
                  m.content
                ) : (
                  <Markdown
                    content={m.isStreaming ? m.content + "▋" : m.content}
                    className="text-sm [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:font-black [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_blockquote]:border-l-2 [&_blockquote]:border-[#1565C0]/30 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-500 [&_code]:bg-zinc-100 [&_code]:dark:bg-zinc-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-[#1565C0] [&_code]:text-xs [&_code]:font-mono"
                  />
                )}
              </div>
            </div>
          ))}
          {isTyping && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-2xl bg-[#1A3A6B] flex items-center justify-center text-white shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-3xl rounded-tl-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#2196F3] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-[#2196F3] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-[#2196F3] rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 動態問題建議列 */}
      {suggestions.length > 0 && session.phase !== "COMPLETE" && (
        <div className="mt-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            onClick={() => setSuggestionsOpen(v => !v)}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> {session.mode === "SELF_CLARIFY" ? "AI 建議思考方向" : "AI 建議提問話術"}
            </span>
            {suggestionsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {suggestionsOpen && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 group">
                  <Badge className={cn("shrink-0 mt-0.5 border-none text-[10px] font-black", SPIN_TYPE_COLOR[s.spinType])}>
                    {SPIN_TYPE_LABEL[s.spinType]}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
                      {s.question}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                      → {s.rationale}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-7 px-2.5 text-xs font-bold text-[#1565C0] hover:bg-[#EBF3FB] dark:hover:bg-[#1A3A6B]/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setInput(s.question)}
                  >
                    使用
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="pt-3">
        {session.phase === "COMPLETE" ? (
          /* COMPLETE：摘要卡片 + CTA */
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
            {/* 完成標題 */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-bold text-sm">SPIN 對話完成</p>
                <p className="text-xs text-zinc-400 font-medium">
                  已整理 {session.transitions?.length ?? 0} 個階段的洞察
                </p>
              </div>
            </div>

            {/* 摘要內容 */}
            {session.summary && (
              <div className="space-y-3">
                {(session.summary.keyInsights?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">情境洞察</p>
                    <div className="flex flex-wrap gap-1.5">
                      {session.summary.keyInsights.map((insight, i) => (
                        <Badge key={i} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-none text-xs font-medium">
                          {insight}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(session.summary.keyProblems?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">發現問題</p>
                    <div className="flex flex-wrap gap-1.5">
                      {session.summary.keyProblems.map((problem, i) => (
                        <Badge key={i} className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-none text-xs font-medium">
                          {problem}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(session.summary.suggestedActions?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">建議行動</p>
                    <div className="flex flex-wrap gap-1.5">
                      {session.summary.suggestedActions.map((action, i) => (
                        <Badge key={i} className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-none text-xs font-medium">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CTA 按鈕 */}
            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1 rounded-2xl bg-[#1A3A6B] hover:bg-[#1565C0] font-bold gap-2 shadow-lg shadow-[#1565C0]/20"
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline}
              >
                {isGeneratingOutline ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ScrollText className="w-4 h-4" />
                )}
                {isGeneratingOutline ? "生成中..." : "生成訪談大綱"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-2xl font-bold gap-2 border-zinc-200 dark:border-zinc-700"
                onClick={() => router.push(`/reports?fromSpin=${sessionId}&clientId=${session.clientId}`)}
              >
                <FileText className="w-4 h-4" /> 生成客戶報告
              </Button>
              <Button
                variant="ghost"
                className="rounded-2xl font-bold gap-2 px-4"
                onClick={() => router.push(`/theater?fromSpin=${sessionId}&clientId=${session.clientId}`)}
              >
                <Swords className="w-4 h-4" /> AI 劇場演練
              </Button>
            </div>
          </div>
        ) : (
          /* 一般狀態：輸入框 */
          <div className="bg-white dark:bg-zinc-900 p-2 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl focus-within:ring-2 ring-[#1565C0]/20 transition-all">
            <Textarea
              placeholder={
                session.mode === "SELF_CLARIFY"
                  ? "告訴 AI 你現在掌握到的情況..."
                  : "詢問 AI 該如何設計提問..."
              }
              className="border-none bg-transparent min-h-[50px] max-h-[150px] resize-none focus-visible:ring-0 px-4 pt-4 text-sm font-medium"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-[10px] text-zinc-400 font-bold ml-2">Enter 換行　⌘↵ 送出</span>
              <Button
                size="icon"
                className={cn(
                  "rounded-2xl w-10 h-10 transition-all",
                  input.trim()
                    ? "bg-[#1A3A6B] hover:bg-[#1565C0] shadow-lg shadow-[#1565C0]/30"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                )}
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 訪談大綱 Sheet */}
      <Sheet open={outlineOpen} onOpenChange={setOutlineOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-base font-black">訪談大綱</SheetTitle>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  {session.clientName} ／ 由 SPIN 對話自動生成
                </p>
              </div>
              {outline && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold gap-2 border-zinc-200"
                  onClick={handleCopyOutline}
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5 text-green-600" /> 已複製</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> 複製大綱</>
                  )}
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
            {isGeneratingOutline ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#1565C0]" />
                <p className="text-sm text-zinc-400 font-medium">正在根據 SPIN 對話生成訪談大綱...</p>
              </div>
            ) : outline ? (
              <Markdown content={outline} className="text-sm" />
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-zinc-400">大綱內容尚未生成</p>
              </div>
            )}
          </div>

          {/* Sheet Footer */}
          {savedReportId && (
            <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-green-50 dark:bg-green-900/10 flex items-center gap-2 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-xs font-bold text-green-700 dark:text-green-400 flex-1">已自動儲存到客戶報告</p>
              <Link
                href={`/reports/${savedReportId}`}
                className="text-xs font-black text-[#1565C0] hover:underline flex items-center gap-1"
                onClick={() => setOutlineOpen(false)}
              >
                查看報告 <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function QuickstartSpinView({ session }: { session: SpinSession }) {
  const step = getQuickstartStep("spin");
  const fallback = getQuickstartSpinFixture(session.id).session;
  const outputs = {
    SITUATION: session.outputs.SITUATION.length ? session.outputs.SITUATION : fallback.outputs.SITUATION,
    PROBLEM: session.outputs.PROBLEM.length ? session.outputs.PROBLEM : fallback.outputs.PROBLEM,
    IMPLICATION: session.outputs.IMPLICATION.length ? session.outputs.IMPLICATION : fallback.outputs.IMPLICATION,
    NEED_PAYOFF: session.outputs.NEED_PAYOFF.length ? session.outputs.NEED_PAYOFF : fallback.outputs.NEED_PAYOFF,
  };
  const summary = session.summary ?? fallback.summary;
  const rows = [
    { label: "S 情況", value: outputs.SITUATION[0] },
    { label: "P 問題", value: outputs.PROBLEM[0] },
    { label: "I 影響", value: outputs.IMPLICATION[0] },
    { label: "N 回報", value: outputs.NEED_PAYOFF[0] },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28">
      <SpotlightTour steps={spinTourSteps} />

      <QuickstartGuide
        currentStepId="spin"
        compact
        nextHref={`/theater?clientId=${session.clientId}&spinId=${session.id}&autoCreate=true&demo=quickstart`}
      />

      <section className="rounded-lg border border-[#D7DFE7] bg-white p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1565C0]">
          Quickstart SPIN
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0A2342]">
          {step.screenTitle}
        </h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#546E7A]">
          {step.bodyCopy}
        </p>
      </section>

      <div data-tour="spin-rows" className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.label} className="border-[#E2EAF1] shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#1565C0]">
                {row.label}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#0A2342]">
                {row.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary && (
        <Card data-tour="spin-actions" className="border-[#E2EAF1] bg-[#F7FAFF] shadow-sm">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-bold text-[#0A2342]">AI 建議行動</p>
            <ul className="space-y-2">
              {summary.suggestedActions.map((action) => (
                <li key={action} className="flex gap-2 text-sm font-medium leading-6 text-[#546E7A]">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#1565C0]" />
                  {action}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
