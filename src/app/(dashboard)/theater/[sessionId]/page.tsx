"use client";

import { useState, useEffect, useRef } from "react";
import { useTheaterStore } from "@/domains/theater/store";
import { theaterService } from "@/domains/theater/service";
import { TheaterTurn, TheaterScore, TheaterPersonaType } from "@/domains/theater/types";
import { useSpinStore } from "@/domains/spin/store";
import { clientService } from "@/domains/client/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { 
  Send, 
  ChevronLeft, 
  User, 
  BrainCircuit,
  Trophy,
  AlertTriangle,
  Zap,
  Target,
  CheckCircle2,
  MoreVertical,
  Activity,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function TheaterSimulationPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { getSessionById, getTurns, addTurn, updateTension, completeSession, getScore } = useTheaterStore();
  const session = getSessionById(sessionId);
  const initialTurns = getTurns(sessionId);
  const score = getScore(sessionId);

  const { getSessionById: getSpinSession } = useSpinStore();
  
  const [turns, setTurns] = useState<TheaterTurn[]>(initialTurns);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoadingScore, setIsLoadingScore] = useState(false);

  // 同步 Zustand
  useEffect(() => { setTurns(initialTurns); }, [initialTurns]);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, isTyping]);

  if (!session) return <div className="p-20 text-center">演練不存在</div>;

  const personaInfo = theaterService.getPersonaDetails(session.personaType);
  const isCompleted = session.status === 'COMPLETED';

  const handleSend = async () => {
    if (!input.trim() || isTyping || isCompleted) return;

    const tensionDelta = theaterService.calculateTensionDelta(input);
    const newTension = Math.max(0, Math.min(100, session.tension + tensionDelta));
    updateTension(sessionId, newTension);

    const userTurn: TheaterTurn = {
      id: Date.now().toString(),
      sessionId,
      role: 'agent',
      content: input.trim(),
      tensionDelta,
      createdAt: new Date().toISOString(),
    };

    setInput("");
    setTurns(prev => [...prev, userTurn]);
    addTurn(sessionId, userTurn);

    setIsTyping(true);

    try {
      const spinSession = getSpinSession(session.spinSessionId);
      const clientCtx = clientService.getClientById(session.clientId);

      const res = await fetch("/api/ai/theater", {
        method: "POST",
        body: JSON.stringify({
          personaType: session.personaType,
          difficulty: session.difficulty,
          tension: newTension,
          clientContext: clientCtx,
          spinOutputs: spinSession?.outputs || {},
          history: [...turns, userTurn].slice(-6), // 只傳最近幾筆
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      const assistantTurn: TheaterTurn = {
        id: (Date.now() + 1).toString(),
        sessionId,
        role: 'client',
        content: "",
        createdAt: new Date().toISOString(),
      };

      let fullText = "";
      setTurns(prev => [...prev, { ...assistantTurn, content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        setTurns(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: fullText }];
        });
      }

      addTurn(sessionId, { ...assistantTurn, content: fullText });

    } catch (err) {
      toast.error("模擬故障，請檢查網路");
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndSimulation = async () => {
    setIsLoadingScore(true);
    try {
      const res = await fetch("/api/ai/theater/score", {
        method: "POST",
        body: JSON.stringify({
          history: turns,
          clientContext: clientService.getClientById(session.clientId),
          personaType: session.personaType,
        }),
      });

      if (!res.ok) throw new Error("評分失敗");
      const finalScore = await res.json();
      
      completeSession(sessionId, finalScore);
      setShowFeedback(true);
      toast.success("演練結束，評分報告已生成");
    } catch (err) {
      toast.error("評分系統暫時無法連線");
    } finally {
      setIsLoadingScore(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-700">
      {/* Header HUD */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-8 flex items-center gap-4">
           <Link href="/theater" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-zinc-400" />
           </Link>
           <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{session.clientName}</h2>
                <Badge className={cn(
                  "border-none font-bold",
                  session.difficulty === 'HARD' ? "bg-red-50 text-red-600" : (session.difficulty === 'MEDIUM' ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600")
                )}>
                  {session.difficulty}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                 <Badge variant="outline" className="bg-white text-zinc-600 border-zinc-200 font-bold px-2 py-0 text-[10px]">
                    {personaInfo.label}
                 </Badge>
                 <span className="text-[10px] text-zinc-400 font-bold italic tracking-tighter uppercase">{personaInfo.style}</span>
              </div>
           </div>
        </div>

        <div className="md:col-span-4 flex flex-col justify-center space-y-2">
           <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <span className={session.tension > 70 ? "text-red-500 animate-pulse" : "text-zinc-400"}>
                 TENSION: {session.tension}%
              </span>
              <Activity className={cn("w-3 h-3", session.tension > 70 ? "text-red-500" : "text-[#2196F3]")} />
           </div>
           <Progress value={session.tension}>
              <ProgressTrack className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <ProgressIndicator className={cn(
                  "transition-all duration-500",
                  session.tension > 70 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                  (session.tension > 40 ? "bg-orange-400" : "bg-[#EBF3FB]0")
                )} />
              </ProgressTrack>
           </Progress>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Main Conversation */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar scroll-smooth"
          >
            <div className="pt-4 space-y-8">
              {turns.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                    <Zap className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="font-bold text-zinc-500 italic">模擬開始，請先向客戶（{personaInfo.label}）打招呼或切入核心問題。</p>
                </div>
              )}
              {turns.map((turn) => (
                <div key={turn.id} className={cn("flex flex-col animate-in fade-in slide-in-from-bottom-2", turn.role === 'agent' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "flex gap-3 max-w-[85%]",
                    turn.role === 'agent' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border",
                      turn.role === 'agent' 
                        ? "bg-zinc-900 border-black text-white" 
                        : "bg-[#1A3A6B] border-[#1565C0] text-white"
                    )}>
                      {turn.role === 'agent' ? <User className="w-6 h-6" /> : <BrainCircuit className="w-6 h-6" />}
                    </div>
                    <div className={cn(
                      "p-5 rounded-3xl text-[15px] leading-relaxed font-bold tracking-tight shadow-sm whitespace-pre-wrap",
                      turn.role === 'agent' 
                        ? "bg-[#EBF3FB] dark:bg-[#1A3A6B]/10 text-[#0A2342] dark:text-[#D6E8F8] rounded-tr-sm" 
                        : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-800 rounded-tl-sm ring-1 ring-zinc-50 dark:ring-zinc-800"
                    )}>
                      {turn.content}
                    </div>
                  </div>
                  {turn.tensionDelta !== undefined && turn.tensionDelta !== 0 && (
                    <span className={cn(
                      "text-[9px] font-black mt-2 mx-12",
                      turn.tensionDelta > 0 ? "text-red-500" : "text-green-500"
                    )}>
                      {turn.tensionDelta > 0 ? "▲" : "▼"} Tension {turn.tensionDelta > 0 ? `+${turn.tensionDelta}` : turn.tensionDelta}%
                    </span>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-[#1A3A6B] border border-[#1565C0] flex items-center justify-center text-white shrink-0 shadow-lg scale-90">
                      <BrainCircuit className="w-6 h-6" />
                   </div>
                   <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl rounded-tl-sm">
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

          {/* Input Interface */}
          <div className="mt-6">
            {!isCompleted ? (
              <div className="bg-white dark:bg-zinc-900 p-2 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl ring-1 ring-zinc-100 dark:ring-zinc-800">
                <Textarea 
                  placeholder="輸入回應..."
                  className="border-none bg-transparent min-h-[60px] max-h-[120px] resize-none focus-visible:ring-0 px-5 pt-4 font-bold text-lg"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isTyping}
                />
                <div className="flex items-center justify-between px-3 pb-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl text-[10px] uppercase font-black text-zinc-400" 
                        onClick={handleEndSimulation}
                        disabled={isLoadingScore || isTyping}
                      >
                        {isLoadingScore ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        終止模擬
                      </Button>
                    </div>
                   <Button 
                    className={cn(
                      "rounded-2xl w-12 h-12 shadow-xl shadow-[#1565C0]/20",
                      input.trim() ? "bg-[#1A3A6B] hover:bg-[#1565C0]" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    )}
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                   >
                     <Send className="w-5 h-5" />
                   </Button>
                </div>
              </div>
            ) : (
              <Button 
                className="w-full rounded-2xl h-14 bg-[#1A3A6B] hover:bg-[#1565C0] text-lg font-bold shadow-xl animate-in zoom-in-95 duration-500"
                onClick={() => setShowFeedback(true)}
              >
                查看演練評分報告 <Trophy className="w-6 h-6 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="hidden lg:block space-y-6">
           <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 shadow-sm overflow-hidden sticky top-6">
              <CardContent className="p-6 space-y-6">
                 <div>
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">人格核心特質</h3>
                    <div className="space-y-3">
                       {personaInfo.traits.map(t => (
                         <div key={t} className="flex items-center gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            <Target className="w-4 h-4 text-[#1565C0] shrink-0" /> {t}
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">演練建議</h3>
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-dashed border-[#D6E8F8] dark:border-[rgba(144,202,249,0.15)] text-xs font-medium text-zinc-500 leading-relaxed italic">
                       「注意緊張度的變化。如果緊張度持續攀升到 80% 以上，客戶可能會結束對話或陷入防衛心理。」
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* FEEDBACK MODAL Overlay */}
      {showFeedback && score && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
           <Card className="w-full max-w-3xl rounded-[40px] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="bg-[#1A3A6B] p-8 text-white relative">
                 <Trophy className="absolute top-8 right-8 w-20 h-20 text-white/10" />
                 <h2 className="text-3xl font-black mb-2">演練分析報告</h2>
                 <p className="text-[#D6E8F8] font-bold opacity-80">客戶：{session.clientName} | 難度：{session.difficulty}</p>
              </div>
              <CardContent className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                    {[
                      { label: '同理心', val: score.empathy },
                      { label: '提問力', val: score.questioning },
                      { label: '清晰度', val: score.clarity },
                      { label: '異議處理', val: score.objectionHandling },
                      { label: '締結感', val: score.closing },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800">
                         <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">{s.label}</p>
                         <p className="text-2xl font-black text-[#1565C0]">{s.val}</p>
                      </div>
                    ))}
                 </div>

                 <div className="space-y-8">
                    <div>
                       <h3 className="text-lg font-black flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-5 h-5 text-orange-500" /> 錯失的契機
                       </h3>
                       <ul className="space-y-3">
                          {score.missedOpportunities.map((m, i) => (
                            <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-orange-50/50 text-sm font-bold text-orange-800 border border-orange-100">
                               <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                               {m}
                            </li>
                          ))}
                       </ul>
                    </div>
                    <div>
                       <h3 className="text-lg font-black flex items-center gap-2 mb-4">
                          <CheckCircle2 className="w-5 h-5 text-green-500" /> 優化建議與話術
                       </h3>
                       <ul className="space-y-3">
                          {score.improvedPhrasing.map((p, i) => {
                             const [original, suggested] = p.split(' -> ');
                             return (
                               <li key={i} className="p-4 rounded-2xl bg-green-50/30 text-sm font-medium border border-green-100/50">
                                  <p className="text-zinc-400 font-bold mb-1 line-through">{original}</p>
                                  <p className="text-green-700 font-bold text-base">{suggested}</p>
                               </li>
                             );
                          })}
                       </ul>
                    </div>
                 </div>

                 <div className="mt-12 flex justify-center">
                    <Button 
                      className="rounded-2xl px-12 h-12 bg-zinc-900 hover:bg-black font-bold text-white shadow-xl"
                      onClick={() => {
                        setShowFeedback(false);
                        router.push('/theater');
                      }}
                    >
                      返回演練中心
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}
