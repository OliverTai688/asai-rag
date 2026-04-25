"use client";

import { useSpinStore } from "@/domains/spin/store";
import { useTheaterStore } from "@/domains/theater/store";
import { theaterService } from "@/domains/theater/service";
import { clientService } from "@/domains/client/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  History, 
  User, 
  ChevronRight, 
  Zap, 
  Shield, 
  BrainCircuit,
  MessageSquare
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { FormattedTime } from "@/components/ui/formatted-time";

export default function TheaterListPage() {
  const router = useRouter();
  const { sessions: spinSessions } = useSpinStore();
  const { sessions: theaterSessions, createSession } = useTheaterStore();
  
  const [selectedSpinId, setSelectedSpinId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  const completedSpinSessions = useMemo(() => {
    return spinSessions.filter(s => s.outputs.SITUATION.length > 0 || s.phase === "COMPLETE");
  }, [spinSessions]);

  const handleStartSim = () => {
    if (!selectedSpinId) return;
    
    const spinSession = spinSessions.find(s => s.id === selectedSpinId)!;
    const client = clientService.getClientById(spinSession.clientId);
    if (!client) return; // Safety check
    const personaType = theaterService.derivePersona(client, spinSession);

    const newSession = createSession({
      spinSessionId: selectedSpinId,
      clientId: spinSession.clientId,
      clientName: spinSession.clientName,
      personaType,
      difficulty,
    });

    router.push(`/theater/${newSession.id}`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">劇場演練 (Theater)</h1>
        <p className="text-zinc-500 font-medium italic">「在這裡流汗，在戰場上少流血。」—— 模擬真實客戶交鋒。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" /> 開始新模擬
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-zinc-500">選擇一個已完成 SPIN 思考的客戶，我們將根據你的思考結果生成該客戶的人格行為。</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {completedSpinSessions.map(spin => (
                <button 
                  key={spin.id}
                  onClick={() => setSelectedSpinId(spin.id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left group",
                    selectedSpinId === spin.id 
                      ? "border-indigo-600 bg-white dark:bg-zinc-800 shadow-lg shadow-indigo-500/10" 
                      : "border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 hover:border-indigo-200"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="font-bold">{spin.clientName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[9px] py-0 border-zinc-200 whitespace-nowrap">
                      {spin.outputs.SITUATION.length} 個切入點
                    </Badge>
                    <Badge variant="outline" className="text-[9px] py-0 border-zinc-200 whitespace-nowrap">
                      {spin.outputs.PROBLEM.length} 個問題點
                    </Badge>
                  </div>
                </button>
              ))}
              {completedSpinSessions.length === 0 && (
                <div className="col-span-full py-10 text-center text-zinc-400 font-medium italic border-2 border-dashed border-zinc-100 rounded-2xl">
                  尚無足夠的 SPIN 資料，請先完成至少一個客戶的 SPIN 規劃。
                </div>
              )}
            </div>

            {selectedSpinId && (
              <div className="space-y-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/20 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">選擇難度</p>
                <div className="flex gap-2">
                  {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                    <Button 
                      key={d}
                      variant="ghost"
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "flex-1 rounded-xl font-bold h-10 transition-all",
                        difficulty === d ? 
                          (d === 'HARD' ? "bg-red-50 text-red-600 ring-2 ring-red-200" : 
                           d === 'MEDIUM' ? "bg-orange-50 text-orange-600 ring-2 ring-orange-200" : 
                           "bg-green-50 text-green-600 ring-2 ring-green-200") : 
                          "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
                <Button 
                  className="w-full rounded-2xl h-12 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-xl shadow-indigo-500/20"
                  onClick={handleStartSim}
                >
                  進入演練 <Play className="w-5 h-5 ml-2 fill-current" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-400" /> 演練歷史
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[500px] space-y-4">
            {theaterSessions.map(session => (
              <div key={session.id} className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer group">
                 <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{session.clientName}</span>
                    <Badge variant="outline" className="text-[10px] py-0 border-none bg-zinc-100 dark:bg-zinc-700 font-bold">
                      {session.status}
                    </Badge>
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                    <span className="flex items-center gap-1"><BrainCircuit className="w-3 h-3" /> {session.personaType}</span>
                    <span>•</span>
                    <span><FormattedTime isoString={session.updatedAt} format="date" /></span>
                 </div>
              </div>
            ))}
            {theaterSessions.length === 0 && (
              <p className="text-center py-20 text-zinc-400 text-sm font-medium italic">尚無歷史演練</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="rounded-3xl bg-indigo-600 text-white border-none p-6 space-y-4 relative overflow-hidden">
            <Shield className="absolute bottom-[-10%] right-[-5%] w-32 h-32 text-white/10" />
            <h3 className="text-xl font-bold">人格庫概覽</h3>
            <div className="grid grid-cols-2 gap-2">
               {['SKEPTICAL', 'BUSY', 'EMOTIONAL', 'CONSERVATIVE'].map(p => (
                 <div key={p} className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold opacity-70 uppercase mb-1">{p}</p>
                    <p className="text-xs font-medium">模擬{p === 'SKEPTICAL' ? '邏輯挑戰' : p === 'BUSY' ? '高時壓' : p === 'EMOTIONAL' ? '情感波動' : '穩健防禦'}</p>
                 </div>
               ))}
            </div>
         </Card>
         <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mx-auto">
               <MessageSquare className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
               <h4 className="font-bold">什麼是劇場？</h4>
               <p className="text-xs text-zinc-500 py-2">不像 SPIN 的靜態思考，劇場是動態的即時交鋒。AI 會根據你的 SPIN 產出，模擬出客戶可能給出的真實回應。</p>
            </div>
         </Card>
      </div>
    </div>
  );
}
