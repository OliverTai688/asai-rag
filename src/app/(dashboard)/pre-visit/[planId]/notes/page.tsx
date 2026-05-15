"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Save, 
  Sparkles, 
  Maximize2, 
  Minimize2,
  Target,
  MessageSquare,
  ShieldAlert,
  Clock,
  History
} from "lucide-react";
import { useVisitStore } from "@/domains/visit/store";
import { useClientStore } from "@/domains/client/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export default function PostVisitNotesPage() {
  const { planId } = useParams();
  const router = useRouter();
  const { plans, updatePlan } = useVisitStore();
  const { clients } = useClientStore();

  const plan = plans.find((p) => p.id === planId);
  const client = clients.find((c) => c.id === plan?.clientId);

  const [notes, setNotes] = useState(plan?.postVisitNotes || "");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (!plan || !client) return <div className="p-20 text-center">載入中...</div>;

  const handleSave = () => {
    setIsSaving(true);
    updatePlan(plan.id, { postVisitNotes: notes });
    setTimeout(() => {
      setIsSaving(false);
      toast.success("筆記已儲存");
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex overflow-hidden">
      {/* Sidebar - Reference Panel */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-zinc-100 bg-zinc-50/50 flex-shrink-0 flex flex-col"
          >
            <div className="p-8 border-b border-zinc-100 bg-white">
              <p className="text-[10px] font-black text-[#1565C0] uppercase tracking-[0.2em] mb-2">拜訪對象</p>
              <h2 className="text-2xl font-black text-zinc-900">{client.name}</h2>
              <p className="text-sm text-zinc-500 font-medium mt-1">目的：{plan.purpose}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Objectives Reference */}
              <section className="space-y-4">
                <h4 className="text-[11px] font-black uppercase text-orange-500 tracking-[0.2em] flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" /> 當初設定目標
                </h4>
                <div className="space-y-3">
                  {plan.objectives.map((obj, i) => (
                    <div key={obj.id} className="p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm">
                      <p className="text-xs font-bold text-zinc-700 leading-relaxed">{i+1}. {obj.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* SPIN Reference */}
              <section className="space-y-4">
                <h4 className="text-[11px] font-black uppercase text-[#1565C0] tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> 關鍵提問回顧
                </h4>
                <div className="space-y-3">
                  {plan.spinQuestions.slice(0, 3).map((q) => (
                    <div key={q.id} className="p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm">
                      <p className="text-xs font-medium text-zinc-500 leading-relaxed italic">「{q.question}」</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Materials Reference */}
              <section className="space-y-4">
                <h4 className="text-[11px] font-black uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-2">
                  <History className="w-3.5 h-3.5" /> 已提供的資料
                </h4>
                <div className="flex flex-wrap gap-2">
                  {plan.materials.filter(m => m.checked).map(m => (
                    <div key={m.id} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                      {m.name}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col relative bg-white">
        {/* Top Header */}
        <header className="h-20 border-b border-zinc-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-zinc-100"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-black tracking-tight">拜訪後深度記筆與分析</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-xl gap-2 font-bold text-zinc-400"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isSidebarOpen ? "隱藏參考" : "顯示參考"}
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-2xl bg-[#1A3A6B] hover:bg-[#1565C0] h-11 px-6 gap-2 shadow-lg shadow-[#90CAF9]/20"
            >
              {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              儲存內容
            </Button>
          </div>
        </header>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-20 px-8 space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">沉浸式筆記空間</span>
              </div>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="在這裡記錄拜訪中觀察到的客戶反應、痛點、或任何下一次可以跟進的線索..."
                className="w-full min-h-[500px] text-xl font-medium leading-relaxed text-zinc-800 placeholder:text-zinc-200 border-none focus:ring-0 resize-none outline-none"
                autoFocus
              />
            </div>

            {/* AI Assistant Trigger */}
            <div className="pt-20 border-t border-zinc-100">
              <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[#1A3A6B] to-[#0A2342] text-white space-y-6 shadow-2xl shadow-[#1A3A6B]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Sparkles className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">AI 深度洞察分析</h3>
                    <p className="text-xs text-blue-200/70 font-medium">填寫完畢後，讓 AI 協助您分析下一步對策</p>
                  </div>
                </div>
                
                <p className="text-sm leading-relaxed text-blue-100/80">
                  AI 將根據您的筆記，自動識別客戶的隱含需求，並為您推薦下一次拜訪的「金句」與「關鍵資料」。
                </p>

                <Button className="w-full h-14 rounded-2xl bg-white text-[#1A3A6B] font-black text-base hover:bg-blue-50 transition-all">
                  開始 AI 洞察分析
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
