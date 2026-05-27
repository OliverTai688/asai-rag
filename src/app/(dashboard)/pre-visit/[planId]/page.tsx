"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Sparkles,
  User,
  Target,
  MessageSquare,
  ShieldAlert,
  Clock,
  ClipboardList,
  PenLine,
  ExternalLink,
  Printer,
  Share2,
  CheckCircle2,
  Zap,
  Plus,
  Trash2,
  ArrowDownToLine,
  Loader2,
  Copy,
  Quote,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useVisitStore } from "@/domains/visit/store";
import { useClientStore } from "@/domains/client/store";
import { useSpinStore } from "@/domains/spin/store";
import { toast } from "sonner";
import { VisitPurpose, VisitPlan, VisitObjective, SpinQuestion, ObjectionHandling } from "@/domains/visit/types";
import type { Client } from "@/domains/client/types";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormattedTime } from "@/components/ui/formatted-time";
import { nanoid } from "nanoid";
import { FeedbackPanel } from "@/components/visit/feedback-panel";
import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import {
  demoQuickstart,
  getQuickstartStep,
  getQuickstartVisitFixture,
} from "@/domains/demo/quickstart";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { planTourSteps } from "@/domains/demo/tour-steps";

const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

export default function VisitPlanDetailPage() {
  const { planId } = useParams();
  const router = useRouter();
  const updatePlan = useVisitStore((state) => state.updatePlan);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [editingObjectives, setEditingObjectives] = useState(false);
  const [editingSpin, setEditingSpin] = useState(false);
  const [editingObjections, setEditingObjections] = useState(false);
  const [quickstartMode, setQuickstartMode] = useState<boolean | null>(null);
  const quickstartSeededRef = useRef(false);

  const plan = useVisitStore((state) => state.plans.find((p) => p.id === planId));
  const client = useClientStore((state) => state.clients.find((c) => c.id === plan?.clientId));
  const isQuickstart = quickstartMode === true;

  useEffect(() => {
    setQuickstartMode(new URLSearchParams(window.location.search).get("demo") === "quickstart");
  }, []);

  useEffect(() => {
    if (quickstartMode !== true) return;
    if (!plan || !client) {
      router.replace("/pre-visit?demo=quickstart");
      return;
    }
    if (quickstartSeededRef.current) return;
    if (
      plan.status === "READY" &&
      plan.objectives.length > 0 &&
      plan.spinQuestions.length > 0 &&
      plan.objections.length > 0
    ) {
      quickstartSeededRef.current = true;
      return;
    }

    quickstartSeededRef.current = true;
    const fixture = getQuickstartVisitFixture();
    updatePlan(plan.id, {
      purpose: demoQuickstart.purpose as VisitPurpose,
      objectives: fixture.objectives,
      spinQuestions: fixture.spinQuestions,
      objections: fixture.objections,
      materials: fixture.materials,
      status: "READY",
    });
  }, [client, plan, quickstartMode, router, updatePlan]);

  if (!plan || !client) {
    return (
      <div className="p-10 text-center text-sm font-semibold text-zinc-500">
        {quickstartMode === true || quickstartMode === null
          ? "載入 Quickstart 準備包..."
          : "載入中或找不到該規劃..."}
      </div>
    );
  }

  const applyQuickstartFixture = () => {
    const fixture = getQuickstartVisitFixture();
    updatePlan(plan.id, {
      purpose: demoQuickstart.purpose as VisitPurpose,
      objectives: fixture.objectives,
      spinQuestions: fixture.spinQuestions,
      objections: fixture.objections,
      materials: fixture.materials,
      status: "READY",
    });
  };

  const handleGenerateAI = async () => {
    if (isQuickstart) {
      applyQuickstartFixture();
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/ai/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: plan.purpose, client: client }),
      });

      if (!response.ok) {
        throw new Error("API response not ok");
      }

      const generatedData = await response.json();
      
      // Update the plan in store
      updatePlan(plan.id, {
        objectives: generatedData.objectives,
        spinQuestions: generatedData.spinQuestions,
        objections: generatedData.objections,
        materials: generatedData.materials,
        status: "READY"
      });
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isQuickstart) {
    return <QuickstartPlanView client={client} plan={plan} />;
  }

  const handleImportFromSpin = async () => {
    const sessions = useSpinStore.getState().sessions;
    const latestSession = sessions
      .filter(s => s.clientId === plan.clientId && s.phase === "COMPLETE")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    if (!latestSession) {
      toast.error("找不到此客戶已完成的 SPIN 對話，請先完成至少一次 SPIN 訪談分析");
      return;
    }

    setIsImporting(true);
    try {
      const clientCtx = {
        profile: { name: client.name, occupation: client.occupation, income: client.annualIncome },
      };
      const phases = ["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF"] as const;
      const phaseToType = { SITUATION: "S", PROBLEM: "P", IMPLICATION: "I", NEED_PAYOFF: "N" } as const;

      const results = await Promise.all(
        phases.map(phase =>
          fetch("/api/mock/ai/spin-suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phase,
              clientContext: clientCtx,
              lastUserMessage: latestSession.outputs[phase]?.[0] ?? "",
            }),
          })
            .then(r => r.json())
            .then(({ suggestions }) =>
              (suggestions ?? []).map((s: { spinType?: "S" | "P" | "I" | "N"; question: string }) => ({
                id: nanoid(),
                type: s.spinType ?? phaseToType[phase],
                question: s.question,
              }))
            )
        )
      );

      const spinQuestions: SpinQuestion[] = results.flat();
      updatePlan(plan.id, { spinQuestions, status: "READY" });
      toast.success(`已從最近一次 SPIN 對話匯入 ${spinQuestions.length} 個問題`);
    } catch {
      toast.error("匯入失敗，請稍後再試");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleMaterial = (matId: string) => {
    const updatedMaterials = plan.materials.map(m => 
      m.id === matId ? { ...m, checked: !m.checked } : m
    );
    updatePlan(plan.id, { materials: updatedMaterials });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/pre-visit")}
            className="rounded-full hover:bg-zinc-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">訪前規劃詳情</h1>
              <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-500 font-bold px-2 py-0">
                {plan.status}
              </Badge>
            </div>
            <p className="text-zinc-500 text-sm font-medium">建立日期：<FormattedTime isoString={plan.createdAt} format="date" /></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <QuickLookSheet plan={plan} client={client} />
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-10" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> 列印
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-10">
            <Share2 className="w-4 h-4" /> 分享
          </Button>
        </div>
      </div>

      <QuickstartGuide currentStepId="plan" />

      {/* A. Block: Selection Header */}
      <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden border-none bg-gradient-to-r from-[#EBF3FB] to-white">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <User className="w-6 h-6 text-[#1565C0]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#2196F3] uppercase tracking-widest">拜訪對象</p>
                <p className="font-bold text-lg">{client.name}</p>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-[#D6E8F8] hidden md:block" />

            <div>
              <p className="text-[10px] font-black text-[#2196F3] uppercase tracking-widest mb-1">拜訪目的</p>
              <div className="flex gap-2">
                {Object.entries(PURPOSE_LABELS).map(([key, label]) => (
                  <Badge 
                    key={key}
                    className={cn(
                      "rounded-lg px-3 py-1 cursor-pointer transition-all border-none font-bold text-xs",
                      plan.purpose === key 
                        ? "bg-[#1A3A6B] text-white shadow-md shadow-[#D6E8F8]" 
                        : "bg-white text-zinc-400 hover:bg-zinc-50"
                    )}
                    onClick={() => updatePlan(plan.id, { purpose: key as VisitPurpose })}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="ml-auto">
              <Button 
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="rounded-2xl bg-[#1A3A6B] hover:bg-[#1565C0] h-12 px-6 gap-2 shadow-lg shadow-[#90CAF9]/30"
              >
                {isGenerating ? (
                  <Zap className="w-5 h-5 animate-pulse" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                AI 生成規劃
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (B, C, G) */}
        <div className="space-y-6 lg:col-span-1">
          {/* B. Client Info Card */}
          <Card className="rounded-3xl border-zinc-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-[#1565C0]" /> 客戶情報快報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">職業</p>
                  <p className="text-xs font-bold">{client.occupation}</p>
                </div>
                <div className="bg-zinc-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">現有保單</p>
                  <p className="text-xs font-bold">{client.existingPolicies.length > 0 ? `${client.existingPolicies.length} 張` : "尚無記錄"}</p>
                </div>
                <div className="bg-zinc-50 p-3 rounded-2xl col-span-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">AI 缺口標籤</p>
                  <div className="flex flex-wrap gap-1">
                    {client.aiTags.map(tag => (
                      <Badge key={tag} className="text-[9px] bg-white text-[#1565C0] border-[#D6E8F8] py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-600 uppercase mb-2">AI 建議重點</p>
                <p className="text-xs font-medium text-amber-800 leading-relaxed">
                  {client.aiTags.length > 0
                    ? `本次重點關注：${client.aiTags.join(" 與 ")}。建議以開放式問句引導客戶自行說出痛點，聆聽優先於介紹。`
                    : "尚未生成 AI 分析，請先點擊「AI 生成規劃」。"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* C. Objectives */}
          <Card className="rounded-3xl border-zinc-200 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" /> 核心目標
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 rounded-full"
                onClick={() => setEditingObjectives(true)}
              >
                <PenLine className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.objectives.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">點擊「AI 生成規劃」以設定目標...</p>
              ) : (
                plan.objectives.map((obj, i) => (
                  <div key={obj.id} className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <p className="text-xs font-bold text-zinc-700 mb-1">{i + 1}. {obj.description}</p>
                    <p className="text-[10px] font-medium text-zinc-400">判準：{obj.successCriteria}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* G. Materials */}
          <Card className="rounded-3xl border-zinc-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-500" /> 資料清單
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.materials.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">準備資料中...</p>
              ) : (
                plan.materials.map(mat => (
                  <button 
                    key={mat.id}
                    onClick={() => toggleMaterial(mat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl text-left border-2 transition-all",
                      mat.checked ? "bg-emerald-50 border-emerald-100" : "bg-white border-zinc-50 hover:border-zinc-200"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      mat.checked ? "bg-emerald-600 border-emerald-600" : "border-zinc-300"
                    )}>
                      {mat.checked && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
                    </div>
                    <span className={cn("text-xs font-bold", mat.checked ? "text-emerald-700" : "text-zinc-600")}>
                      {mat.name}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (D, E, F, H, I) */}
        <div className="lg:col-span-2 space-y-6">
          {/* D. SPIN Script */}
          <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-[#EBF3FB]/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#1565C0]" /> SPIN 提問劇本
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 rounded-xl text-[10px] font-black gap-1.5 border-[#1565C0]/20 text-[#1565C0] hover:bg-[#EBF3FB]"
                  onClick={handleImportFromSpin}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="w-3 h-3" />
                  )}
                  從 SPIN 匯入
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full"
                  onClick={() => setEditingSpin(true)}
                >
                  <PenLine className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-100">
                {plan.spinQuestions.length === 0 && !isGenerating ? (
                  <div className="p-10 text-center text-zinc-400 text-sm italic">
                    AI 將根據拜訪目的，為您設計專業的提問流程。
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* Simplified SPIN display for demo */}
                    {["S", "P", "I", "N"].map(type => {
                      const questions = plan.spinQuestions.filter(q => q.type === type);
                      if (questions.length === 0 && !isGenerating) return null;
                      return (
                        <div key={type} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge className={cn(
                              "w-6 h-6 flex items-center justify-center p-0 rounded-lg text-white font-black",
                              type === "S" ? "bg-blue-500" : 
                              type === "P" ? "bg-red-500" :
                              type === "I" ? "bg-amber-500" : "bg-emerald-500"
                            )}>
                              {type}
                            </Badge>
                            <span className="text-xs font-black uppercase text-zinc-400 tracking-widest">
                              {type === "S" ? "Situation 背景" : 
                               type === "P" ? "Problem 難點" :
                               type === "I" ? "Implication 影響" : "Need-payoff 解決"}
                            </span>
                          </div>
                          <div className="pl-8 space-y-2">
                            {questions.map(q => (
                              <div key={q.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 group hover:border-[#90CAF9]/40 transition-all">
                                <p className="text-sm font-bold text-zinc-700 leading-relaxed">
                                  「{q.question}」
                                </p>
                              </div>
                            ))}
                            {isGenerating && questions.length === 0 && (
                              <div className="p-4 rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 animate-pulse h-14" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* E. Objections */}
          <Card className="rounded-3xl border-zinc-200 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" /> 預期客戶疑問與回應
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 rounded-full"
                onClick={() => setEditingObjections(true)}
              >
                <PenLine className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.objections.map(obj => (
                <div key={obj.id} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="bg-red-100 text-red-600 font-black text-[10px] w-5 h-5 rounded-md flex items-center justify-center shrink-0">?</div>
                    <p className="text-sm font-bold text-zinc-600 italic">「{obj.expectedObjection}」</p>
                  </div>
                  <div className="flex gap-2 ml-7 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <Sparkles className="w-4 h-4 text-[#1565C0] shrink-0" />
                    <p className="text-xs font-medium text-zinc-500 leading-relaxed">
                      {obj.suggestedResponse}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* F. Timeline */}
          <Card className="rounded-3xl border-zinc-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" /> 60 分鐘拜訪時間分配
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-full flex rounded-xl overflow-hidden shadow-inner">
                <div className="bg-[#2196F3] flex items-center justify-center text-[10px] font-bold text-white border-r border-white/20" style={{ width: "15%" }}>破冰 10'</div>
                <div className="bg-[#EBF3FB] flex items-center justify-center text-[10px] font-bold text-white border-r border-white/20" style={{ width: "25%" }}>情境 15'</div>
                <div className="bg-[#1A3A6B] flex items-center justify-center text-[10px] font-bold text-white border-r border-white/20" style={{ width: "35%" }}>SPIN 20'</div>
                <div className="bg-[#1565C0] flex items-center justify-center text-[10px] font-bold text-white" style={{ width: "25%" }}>總結 15'</div>
              </div>
              <div className="flex justify-between mt-3 px-1">
                <span className="text-[10px] font-bold text-zinc-400">0m</span>
                <span className="text-[10px] font-bold text-zinc-400">20m</span>
                <span className="text-[10px] font-bold text-zinc-400">40m</span>
                <span className="text-[10px] font-bold text-zinc-400">60m</span>
              </div>
            </CardContent>
          </Card>

          {/* H. Post Visit */}
          <Card className="rounded-3xl border-dashed border-zinc-300 bg-zinc-50/50">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto shadow-sm">
                <PenLine className="w-8 h-8 text-zinc-300" />
              </div>
                <div className="flex flex-col gap-3">
                  <textarea 
                    className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1565C0] min-h-[100px] resize-none"
                    placeholder="輸入拜訪結論..."
                    value={plan.postVisitNotes ?? ""}
                    onChange={(e) => updatePlan(plan.id, { postVisitNotes: e.target.value })}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl gap-2 font-bold text-[#1565C0] border-[#1565C0]/20 hover:bg-[#EBF3FB]"
                    onClick={() => router.push(`/pre-visit/${plan.id}/notes`)}
                  >
                    <Maximize2 className="w-4 h-4" /> 進入沉浸式創作模式
                  </Button>
                </div>
              </CardContent>
            </Card>

          {/* I. CTA Row */}
          <div className="flex flex-col md:flex-row gap-4">
            <Button 
              className="flex-1 rounded-2xl bg-zinc-900 h-14 gap-2 text-base font-bold shadow-xl shadow-zinc-200"
              onClick={() => router.push(`/spin?planId=${plan.id}`)}
            >
              <MessageSquare className="w-5 h-5" /> 進入 SPIN 對話
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl border-zinc-200 h-14 gap-2 text-base font-bold"
              onClick={() => router.push(`/theater?planId=${plan.id}`)}
            >
              <Zap className="w-5 h-5 text-amber-500" /> 進入劇場演練
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl border-zinc-200 h-14 gap-2 text-base font-bold"
              onClick={() => router.push(`/reports?planId=${plan.id}`)}
            >
              <ExternalLink className="w-5 h-5 text-[#1565C0]" /> 生成客戶報告
            </Button>
          </div>

          {/* Feedback Section */}
          <FeedbackPanel 
            feedback={plan.feedback || []}
            onAddFeedback={(content) => {
              const newFeedback = [
                ...(plan.feedback || []),
                {
                  id: nanoid(),
                  authorId: "me",
                  authorName: "我的建議",
                  content,
                  createdAt: new Date().toISOString()
                }
              ];
              updatePlan(plan.id, { feedback: newFeedback });
            }}
          />
        </div>
      </div>

      {/* Edit Dialogs */}
      <EditObjectivesDialog 
        open={editingObjectives} 
        onOpenChange={setEditingObjectives} 
        objectives={plan.objectives}
        onSave={(objs) => updatePlan(plan.id, { objectives: objs })}
      />
      <EditSpinQuestionsDialog 
        open={editingSpin} 
        onOpenChange={setEditingSpin} 
        questions={plan.spinQuestions}
        onSave={(qs) => updatePlan(plan.id, { spinQuestions: qs })}
      />
      <EditObjectionsDialog 
        open={editingObjections} 
        onOpenChange={setEditingObjections} 
        objections={plan.objections}
        onSave={(objs) => updatePlan(plan.id, { objections: objs })}
      />
    </div>
  );
}

function QuickstartPlanView({ client, plan }: { client: Client; plan: VisitPlan }) {
  const step = getQuickstartStep("plan");
  const fixture = getQuickstartVisitFixture();
  const objectives = plan.objectives.length ? plan.objectives : fixture.objectives;
  const spinQuestions = plan.spinQuestions.length ? plan.spinQuestions : fixture.spinQuestions;
  const objections = plan.objections.length ? plan.objections : fixture.objections;
  const materials = plan.materials.length ? plan.materials : fixture.materials;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28">
      <SpotlightTour steps={planTourSteps} />

      <QuickstartGuide
        currentStepId="plan"
        compact
        nextHref={`/spin?clientId=${plan.clientId}&autoCreate=true&demo=quickstart`}
      />

      <section className="rounded-lg border border-[#D7DFE7] bg-white p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1565C0]">
          Quickstart Plan
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0A2342]">
          {step.screenTitle}
        </h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#546E7A]">
          {step.bodyCopy}
        </p>
      </section>

      <Card data-tour="plan-summary" className="border-[#E2EAF1] bg-[#F7FAFF] shadow-sm">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#78909C]">客戶</p>
            <p className="mt-1 text-base font-bold text-[#0A2342]">{client.name}</p>
            <p className="mt-1 text-xs font-medium text-[#546E7A]">{client.occupation}</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#78909C]">目的</p>
            <p className="mt-1 text-base font-bold text-[#0A2342]">加保</p>
            <p className="mt-1 text-xs font-medium text-[#546E7A]">補足家庭保障缺口</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#78909C]">狀態</p>
            <p className="mt-1 text-base font-bold text-[#0A2342]">準備完成</p>
            <p className="mt-1 text-xs font-medium text-[#546E7A]">可進入 SPIN 澄清</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <div data-tour="plan-objectives">
          <QuickstartSummaryBlock
            icon={<Target className="h-4 w-4" />}
            title="本次拜訪目標"
            items={objectives.map((objective) => objective.description)}
          />
        </div>
        <div data-tour="plan-spin">
          <QuickstartSummaryBlock
            icon={<MessageSquare className="h-4 w-4" />}
            title="SPIN 提問"
            items={spinQuestions.slice(0, 4).map((question) => question.question)}
          />
        </div>
        <div data-tour="plan-objections">
          <QuickstartSummaryBlock
            icon={<ShieldAlert className="h-4 w-4" />}
            title="可能異議與回應"
            items={objections.map((objection) => `${objection.expectedObjection}｜${objection.suggestedResponse}`)}
          />
        </div>
        <QuickstartSummaryBlock
          icon={<ClipboardList className="h-4 w-4" />}
          title="拜訪材料"
          items={materials.map((material) => material.name)}
        />
      </div>
    </div>
  );
}

function QuickstartSummaryBlock({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <Card className="border-[#E2EAF1] shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-[#1565C0]">
          {icon}
          <h2 className="text-sm font-bold text-[#0A2342]">{title}</h2>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm font-medium leading-6 text-[#546E7A]">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#1565C0]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function EditObjectivesDialog({ 
  open, 
  onOpenChange, 
  objectives, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  objectives: VisitObjective[];
  onSave: (objectives: VisitObjective[]) => void;
}) {
  const [localObjectives, setLocalObjectives] = useState<VisitObjective[]>(objectives);

  useEffect(() => {
    setLocalObjectives(objectives);
  }, [objectives, open]);

  const addObjective = () => {
    setLocalObjectives([...localObjectives, { id: nanoid(), description: "", successCriteria: "" }]);
  };

  const removeObjective = (id: string) => {
    setLocalObjectives(localObjectives.filter(o => o.id !== id));
  };

  const updateObjective = (id: string, field: keyof VisitObjective, value: string) => {
    setLocalObjectives(localObjectives.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯核心目標</DialogTitle>
          <DialogDescription>設定您這次拜訪想要達成的具體目標與成功指標。</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {localObjectives.map((obj, index) => (
            <div key={obj.id} className="space-y-3 p-4 rounded-2xl bg-zinc-50 relative group">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 text-zinc-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeObjective(obj.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase">目標 {index + 1}</Label>
                <Input 
                  value={obj.description} 
                  onChange={(e) => updateObjective(obj.id, "description", e.target.value)}
                  placeholder="例如：確認客戶對遺產稅的擔憂程度"
                  className="rounded-xl border-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase">成功指標</Label>
                <Input 
                  value={obj.successCriteria} 
                  onChange={(e) => updateObjective(obj.id, "successCriteria", e.target.value)}
                  placeholder="例如：客戶主動詢問如何節稅"
                  className="rounded-xl border-zinc-200"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full rounded-xl border-dashed gap-2" onClick={addObjective}>
            <Plus className="w-4 h-4" /> 新增目標
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">取消</Button>
          <Button onClick={() => { onSave(localObjectives); onOpenChange(false); }} className="rounded-xl bg-[#1A3A6B] hover:bg-[#1565C0]">儲存變更</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditSpinQuestionsDialog({ 
  open, 
  onOpenChange, 
  questions, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  questions: SpinQuestion[];
  onSave: (questions: SpinQuestion[]) => void;
}) {
  const [localQuestions, setLocalQuestions] = useState<SpinQuestion[]>(questions);

  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions, open]);

  const updateQuestion = (id: string, value: string) => {
    setLocalQuestions(localQuestions.map(q => q.id === id ? { ...q, question: value } : q));
  };

  const addQuestion = (type: "S" | "P" | "I" | "N") => {
    setLocalQuestions([...localQuestions, { id: nanoid(), type, question: "" }]);
  };

  const removeQuestion = (id: string) => {
    setLocalQuestions(localQuestions.filter(q => q.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯 SPIN 提問劇本</DialogTitle>
          <DialogDescription>優化您的提問流程，引導客戶發現自身需求。</DialogDescription>
        </DialogHeader>
        <div className="space-y-8 py-4">
          {(["S", "P", "I", "N"] as const).map(type => (
            <div key={type} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "w-6 h-6 flex items-center justify-center p-0 rounded-lg text-white font-black",
                    type === "S" ? "bg-blue-500" : 
                    type === "P" ? "bg-red-500" :
                    type === "I" ? "bg-amber-500" : "bg-emerald-500"
                  )}>
                    {type}
                  </Badge>
                  <span className="text-xs font-black uppercase text-zinc-400 tracking-widest">
                    {type === "S" ? "Situation 背景" : 
                     type === "P" ? "Problem 難點" :
                     type === "I" ? "Implication 影響" : "Need-payoff 解決"}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold gap-1 rounded-lg" onClick={() => addQuestion(type)}>
                  <Plus className="w-3 h-3" /> 新增
                </Button>
              </div>
              <div className="space-y-3">
                {localQuestions.filter(q => q.type === type).map(q => (
                  <div key={q.id} className="relative group">
                    <Textarea 
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, e.target.value)}
                      className="rounded-2xl border-zinc-200 min-h-[80px] bg-zinc-50/50 focus:bg-white transition-colors pr-10"
                      placeholder="輸入提問內容..."
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-7 w-7 text-zinc-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">取消</Button>
          <Button onClick={() => { onSave(localQuestions); onOpenChange(false); }} className="rounded-xl bg-[#1A3A6B] hover:bg-[#1565C0]">儲存變更</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditObjectionsDialog({ 
  open, 
  onOpenChange, 
  objections, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  objections: ObjectionHandling[];
  onSave: (objections: ObjectionHandling[]) => void;
}) {
  const [localObjections, setLocalObjections] = useState<ObjectionHandling[]>(objections);

  useEffect(() => {
    setLocalObjections(objections);
  }, [objections, open]);

  const addObjection = () => {
    setLocalObjections([...localObjections, { id: nanoid(), expectedObjection: "", suggestedResponse: "" }]);
  };

  const removeObjection = (id: string) => {
    setLocalObjections(localObjections.filter(o => o.id !== id));
  };

  const updateObjection = (id: string, field: keyof ObjectionHandling, value: string) => {
    setLocalObjections(localObjections.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯預期疑問與回應</DialogTitle>
          <DialogDescription>預演客戶可能的反對意見，並準備好專業且有溫度的回應。</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {localObjections.map((obj, index) => (
            <div key={obj.id} className="space-y-4 p-5 rounded-2xl border border-zinc-100 bg-zinc-50/30 relative group">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 text-zinc-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeObjection(obj.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> 客戶可能說
                </Label>
                <Input 
                  value={obj.expectedObjection} 
                  onChange={(e) => updateObjection(obj.id, "expectedObjection", e.target.value)}
                  placeholder="例如：我已經有很多保險了。"
                  className="rounded-xl border-zinc-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-[#1565C0] uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 建議回應
                </Label>
                <Textarea 
                  value={obj.suggestedResponse} 
                  onChange={(e) => updateObjection(obj.id, "suggestedResponse", e.target.value)}
                  placeholder="輸入回應內容..."
                  className="rounded-xl border-zinc-200 bg-white min-h-[100px]"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full rounded-xl border-dashed gap-2" onClick={addObjection}>
            <Plus className="w-4 h-4" /> 新增疑問
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">取消</Button>
          <Button onClick={() => { onSave(localObjections); onOpenChange(false); }} className="rounded-xl bg-[#1A3A6B] hover:bg-[#1565C0]">儲存變更</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickLookSheet({ plan, client }: { plan: VisitPlan; client: any }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("已複製到剪貼簿");
  };

  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center gap-2 rounded-2xl border border-[#1565C0]/20 bg-gradient-to-br from-[#EBF3FB] to-[#D6E8F8] hover:from-[#D6E8F8] hover:to-[#EBF3FB] text-[#1565C0] font-bold text-sm px-4 h-11 transition-all shadow-sm hover:shadow-md active:scale-95">
        <Zap className="w-4 h-4 fill-current animate-pulse" /> 15 分鐘速覽
      </SheetTrigger>
      <SheetContent className="sm:max-w-md border-l-0 p-0 bg-white flex flex-col h-full">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Immersive Header */}
        <div className="relative h-48 bg-[#1A3A6B] overflow-hidden flex items-end p-6">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-blue-400 blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 rounded-full bg-indigo-500 blur-3xl" />
          </div>
          <div className="relative z-10 w-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Zap className="w-5 h-5 text-yellow-400 fill-current" />
              </div>
              <Badge className="bg-yellow-400/20 text-yellow-300 border-none hover:bg-yellow-400/30 font-black text-[10px] tracking-wider uppercase">
                Rush Mode
              </Badge>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">拜訪前衝刺速覽</h2>
            <p className="text-blue-100/70 text-sm font-medium mt-1">這張「戰術卡」幫助您在 15 分鐘內進入狀態</p>
          </div>
        </div>
        
        <div className="p-6 space-y-10 pb-10">
          {/* Quick Info Bar */}
          <div className="flex items-center justify-between p-5 rounded-[2rem] bg-zinc-50 border border-zinc-100 shadow-inner">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-zinc-100">
                <User className="w-6 h-6 text-[#1565C0]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">拜訪對象</p>
                <p className="text-lg font-black text-zinc-900">{client.name}</p>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-zinc-200 mx-2" />
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">核心目的</p>
              <p className="text-lg font-black text-[#1565C0]">{PURPOSE_LABELS[plan.purpose]}</p>
            </div>
          </div>

          {/* Key Objectives - Tactical Checklist */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-orange-500 tracking-[0.2em] flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> 必達成目標
              </h4>
              <div className="h-[1px] flex-1 bg-orange-100 ml-4" />
            </div>
            <div className="grid gap-3">
              {plan.objectives.map((obj, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={obj.id} 
                  className="group flex gap-4 items-start p-4 rounded-2xl border border-zinc-100 hover:border-orange-100 hover:bg-orange-50/30 transition-all cursor-default"
                >
                  <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <span className="text-[10px] font-black">{i + 1}</span>
                  </div>
                  <p className="text-sm font-bold text-zinc-700 leading-snug group-hover:text-zinc-900">{obj.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* SPIN Key Questions - High-Impact Cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-[#1565C0] tracking-[0.2em] flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> 必問金句 (SPIN)
              </h4>
              <div className="h-[1px] flex-1 bg-[#EBF3FB] ml-4" />
            </div>
            <div className="space-y-4">
              {plan.spinQuestions.slice(0, 4).map((q, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  key={q.id} 
                  className="group relative p-6 bg-zinc-50/50 border border-zinc-100 rounded-[2rem] hover:bg-white hover:shadow-xl hover:shadow-[#1565C0]/5 hover:-translate-y-1 transition-all overflow-hidden"
                >
                  <div className={cn(
                    "absolute top-0 left-0 w-1.5 h-full",
                    q.type === "S" ? "bg-blue-400" : 
                    q.type === "P" ? "bg-red-400" :
                    q.type === "I" ? "bg-amber-400" : "bg-emerald-400"
                  )} />
                  <Quote className="absolute top-4 right-4 w-12 h-12 text-[#1565C0]/5 -z-0" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={cn(
                        "rounded-lg px-2 py-0.5 text-[10px] font-black border-none text-white",
                        q.type === "S" ? "bg-blue-500" : 
                        q.type === "P" ? "bg-red-500" :
                        q.type === "I" ? "bg-amber-500" : "bg-emerald-500"
                      )}>
                        {q.type === "S" ? "SITUATION" : 
                         q.type === "P" ? "PROBLEM" :
                         q.type === "I" ? "IMPLICATION" : "NEED-PAYOFF"}
                      </Badge>
                      <button 
                        onClick={() => copyToClipboard(q.question, q.id)}
                        className="p-2 rounded-full hover:bg-zinc-50 text-zinc-300 hover:text-[#1565C0] transition-colors"
                      >
                        {copiedId === q.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-lg font-bold text-zinc-800 leading-relaxed pr-6">
                      「{q.question}」
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Key Objection - Strategy Card */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-red-500 tracking-[0.2em] flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" /> 攻防應對 (話術)
              </h4>
              <div className="h-[1px] flex-1 bg-red-50 ml-4" />
            </div>
            {plan.objections[0] && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-4"
              >
                <div className="flex gap-3 items-start px-2">
                  <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-[10px] font-black text-red-600">?</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-500 italic">如果客戶提到：{plan.objections[0].expectedObjection}</p>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-[#1A3A6B] to-[#0A2342] rounded-[2rem] shadow-lg shadow-zinc-200 text-white relative overflow-hidden group">
                  <div className="absolute top-[-20%] right-[-10%] w-32 h-32 rounded-full bg-white/5 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> 專業建議回應
                  </p>
                  <p className="text-[0.95rem] font-bold leading-relaxed">
                    {plan.objections[0].suggestedResponse}
                  </p>
                  <div className="mt-6 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(plan.objections[0].suggestedResponse, "objection-0")}
                      className="h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/10 gap-2 text-[11px]"
                    >
                      {copiedId === "objection-0" ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      複製話術
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </section>
        </div>
      </div>

        {/* Floating Actions - Capsule Style */}
        <div className="p-6 pt-2 pb-8 bg-gradient-to-t from-white via-white/80 to-transparent relative z-50">
          <div className="bg-zinc-900 backdrop-blur-2xl rounded-[2.5rem] p-2 flex gap-2 shadow-2xl shadow-zinc-900/30 border border-white/10">
            <Button 
              className="flex-1 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 gap-2 h-14 font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
              onClick={() => window.print()}
            >
              <Printer className="w-5 h-5" /> 列印小抄
            </Button>
            <Button 
              variant="ghost" 
              className="flex-1 rounded-full text-white hover:bg-white/10 gap-2 h-14 font-bold text-lg transition-all hover:scale-[1.02] active:scale-95"
            >
              <Share2 className="w-5 h-5" /> 分享夥伴
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
