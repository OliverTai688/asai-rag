"use client";

import { useState, useEffect, useRef } from "react";
import { useSpinStore } from "@/domains/spin/store";
import { spinService } from "@/domains/spin/service";
import { SpinMessage, SpinPhase } from "@/domains/spin/types";
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
  Settings2
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function SpinConversationPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { getSessionById, getMessages, addMessage, updateSession } = useSpinStore();
  const session = getSessionById(sessionId);
  const initialMessages = getMessages(sessionId);
  
  const [messages, setMessages] = useState<SpinMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // 同步 Zustand 訊息
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // 自動捲動
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!session) {
    return <div className="p-20 text-center">對話不存在</div>;
  }

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: SpinMessage = {
      id: Date.now().toString(),
      sessionId,
      role: "user",
      type: "CHAT",
      phase: session.phase,
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    const currentInput = input;
    setInput("");
    setMessages(prev => [...prev, userMsg]);
    addMessage(sessionId, userMsg);

    setIsTyping(true);

    try {
      const clientCtx = spinService.getClientContext(session.clientId);
      const res = await fetch("/api/mock/ai/spin", {
        method: "POST",
        body: JSON.stringify({
          phase: session.phase,
          mode: session.mode,
          clientContext: clientCtx,
          messages: [...messages, userMsg],
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      const assistantMsg: SpinMessage = {
        id: (Date.now() + 1).toString(),
        sessionId,
        role: "assistant",
        type: "CHAT",
        phase: session.phase,
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, assistantMsg]);

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: fullText }];
        });
      }

      // 解析結構化數據
      const structuredData = spinService.parseStructuredData(fullText);
      structuredData.forEach(item => {
        const msgType = item.type as any;
        if (msgType === "INSIGHT" || msgType === "OUTPUT") {
          useSpinStore.getState().addOutput(sessionId, session.phase, item.content);
        }
      });

      // 檢查階段完成
      if (spinService.checkPhaseComplete(fullText)) {
        toast.info("AI 判定當前階段目標已跨越，建議進入下一階段。", {
          action: {
            label: "進入下一步",
            onClick: () => handleAdvancePhase("AI")
          }
        });
      }

      const finalContent = spinService.cleanResponse(fullText);
      const finalMsg = { ...assistantMsg, content: finalContent, isStreaming: false };
      
      setMessages(prev => [...prev.slice(0, -1), finalMsg]);
      addMessage(sessionId, finalMsg);
      updateSession(sessionId, { updatedAt: new Date().toISOString() });

    } catch (err) {
      toast.error("AI 回應失敗，請稍後再試");
    } finally {
      setIsTyping(false);
    }
  };

  const handleAdvancePhase = (trigger: "AI" | "USER" = "USER") => {
    const nextPhase = spinService.getNextPhase(session.phase);
    useSpinStore.getState().recordTransition(sessionId, session.phase, nextPhase, trigger);
    updateSession(sessionId, { phase: nextPhase });
    toast.success(`已切換至 ${nextPhase} 階段`);
  };

  const handleModeToggle = () => {
    const nextMode = session.mode === "SELF_CLARIFY" ? "QUESTION_DESIGN" : "SELF_CLARIFY";
    updateSession(sessionId, { mode: nextMode });
    toast.success(`已切換至 ${nextMode === "SELF_CLARIFY" ? "自我釐清" : "問題設計"} 模式`);
  };

  const handleEndSession = () => {
    // 實作自動生成摘要邏輯 (基於 outputs)
    const structuredSummary = {
      keyInsights: session.outputs.SITUATION,
      keyProblems: session.outputs.PROBLEM,
      suggestedActions: session.outputs.IMPLICATION.concat(session.outputs.NEED_PAYOFF),
    };

    updateSession(sessionId, { 
      phase: "COMPLETE", 
      summary: structuredSummary,
      updatedAt: new Date().toISOString() 
    });

    toast.success("成功生成對話摘要報告！");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/spin" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{session.clientName}</h2>
              <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-none font-bold">
                {session.mode === "SELF_CLARIFY" ? "思考模式" : "提議模式"}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 font-medium tracking-wide">當前進度：{session.phase}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.phase !== "COMPLETE" && (
            <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2 text-red-500 border-red-500/20 hover:bg-red-50" onClick={handleEndSession}>
              結束對話
            </Button>
          )}
          <Button variant="ghost" size="sm" className="rounded-xl font-bold gap-2" onClick={handleModeToggle}>
            <RefreshCcw className="w-4 h-4" /> 切換模式
          </Button>
        </div>
      </div>

      {/* Phase Stepper */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        {["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF"].map((p, i) => {
          const phases: SpinPhase[] = ["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF", "COMPLETE"];
          const currentIdx = phases.indexOf(session.phase);
          const isActive = currentIdx >= i;
          const isCurrent = currentIdx === i;
          
          return (
            <div key={p} className="space-y-2">
              <div className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                isCurrent ? "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" : (isActive ? "bg-indigo-400" : "bg-zinc-100 dark:bg-zinc-800")
              )} />
              <p className={cn(
                "text-[10px] font-black text-center uppercase tracking-tighter",
                isCurrent ? "text-indigo-600" : (isActive ? "text-zinc-500 font-bold" : "text-zinc-300 font-medium")
              )}>
                {p.split("_")[0]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Phase Outputs Indicator */}
      <div className="flex flex-wrap gap-2 mb-4">
        {session.phase !== "COMPLETE" && session.outputs?.[session.phase as keyof typeof session.outputs]?.map((out, i) => (
          <Badge key={i} variant="secondary" className="bg-green-50 text-green-700 animate-in zoom-in-95 duration-300 font-bold border-none">
            {out}
          </Badge>
        ))}
        {session.phase !== "COMPLETE" && session.outputs?.[session.phase as keyof typeof session.outputs]?.length === 0 && (
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
            <div key={m.id} className={cn("flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                m.role === "user" ? "bg-zinc-900 text-white" : "bg-indigo-600 text-white"
              )}>
                {m.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed font-medium whitespace-pre-wrap",
                m.role === "user" 
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tr-sm" 
                  : "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-tl-sm"
              )}>
                {m.content}
                {m.isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-600 animate-pulse align-middle" />}
              </div>
            </div>
          ))}
          {isTyping && messages[messages.length-1]?.role === "user" && (
             <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-3xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="pt-6 relative">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
           {session.phase === "COMPLETE" && (
             <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-4 py-1 rounded-full font-bold flex items-center gap-2 shadow-sm">
               對話已完成，準備生成拜訪摘要報告 <ArrowRight className="w-3 h-3" />
             </Badge>
           )}
        </div>
        <div className="bg-white dark:bg-zinc-900 p-2 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl focus-within:ring-2 ring-indigo-500/20 transition-all">
          <Textarea 
            placeholder={session.mode === "SELF_CLARIFY" ? "告訴 AI 你現在掌握到的情況..." : "詢問 AI 該如何設計提問..."}
            className="border-none bg-transparent min-h-[50px] max-h-[150px] resize-none focus-visible:ring-0 px-4 pt-4 text-sm font-medium"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-2">
               <span className="text-[10px] text-zinc-400 font-bold ml-2">Press Enter to Send</span>
            </div>
            <Button 
              size="icon" 
              className={cn(
                "rounded-2xl w-10 h-10 transition-all",
                input.trim() ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
              )}
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
