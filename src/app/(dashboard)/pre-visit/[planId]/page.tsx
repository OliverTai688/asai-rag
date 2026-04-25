"use client";

import { useState } from "react";
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
  Zap
} from "lucide-react";
import { useVisitStore } from "@/domains/visit/store";
import { useClientStore } from "@/domains/client/store";
import { VisitPurpose, VisitPlan, VisitObjective, SpinQuestion, ObjectionHandling } from "@/domains/visit/types";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FormattedTime } from "@/components/ui/formatted-time";

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
  const [streamedText, setStreamedText] = useState(""); // For SPIN script streaming feel

  const plan = useVisitStore((state) => state.plans.find((p) => p.id === planId));
  const client = useClientStore((state) => state.clients.find((c) => c.id === plan?.clientId));

  if (!plan || !client) {
    return <div className="p-10 text-center">載入中或找不到該規劃...</div>;
  }

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setStreamedText("");
    
    try {
      const response = await fetch("/api/mock/ai/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: plan.purpose, clientId: plan.clientId }),
      });

      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextEncoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        fullContent += chunk;
        setStreamedText(prev => prev + chunk);
      }

      // Parse the generated JSON
      const generatedData = JSON.parse(fullContent);
      
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
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-10">
            <Printer className="w-4 h-4" /> 列印
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-10">
            <Share2 className="w-4 h-4" /> 分享
          </Button>
        </div>
      </div>

      {/* A. Block: Selection Header */}
      <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden border-none bg-gradient-to-r from-indigo-50 to-white">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">拜訪對象</p>
                <p className="font-bold text-lg">{client.name}</p>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-indigo-100 hidden md:block" />

            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">拜訪目的</p>
              <div className="flex gap-2">
                {Object.entries(PURPOSE_LABELS).map(([key, label]) => (
                  <Badge 
                    key={key}
                    className={cn(
                      "rounded-lg px-3 py-1 cursor-pointer transition-all border-none font-bold text-xs",
                      plan.purpose === key 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
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
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 h-12 px-6 gap-2 shadow-lg shadow-indigo-200"
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
                <User className="w-4 h-4 text-indigo-600" /> 客戶情報快報
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
                      <Badge key={tag} className="text-[9px] bg-white text-indigo-600 border-indigo-100 py-0">
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
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
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
            <CardHeader className="pb-3 bg-indigo-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" /> SPIN 提問劇本
              </CardTitle>
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
                              <div key={q.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 group hover:border-indigo-200 transition-all">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" /> 預期客戶疑問與回應
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.objections.map(obj => (
                <div key={obj.id} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="bg-red-100 text-red-600 font-black text-[10px] w-5 h-5 rounded-md flex items-center justify-center shrink-0">?</div>
                    <p className="text-sm font-bold text-zinc-600 italic">「{obj.expectedObjection}」</p>
                  </div>
                  <div className="flex gap-2 ml-7 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
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
                <div className="bg-indigo-400 flex items-center justify-center text-[10px] font-bold text-white border-r border-white/20" style={{ width: "15%" }}>破冰 10'</div>
                <div className="bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white border-r border-white/20" style={{ width: "25%" }}>情境 15'</div>
                <div className="bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white border-r border-white/20" style={{ width: "35%" }}>SPIN 20'</div>
                <div className="bg-indigo-700 flex items-center justify-center text-[10px] font-bold text-white" style={{ width: "25%" }}>總結 15'</div>
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
              <div className="max-w-xs mx-auto">
                <h3 className="font-bold text-zinc-700 mb-1">拜訪後記</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  拜訪結束後，請在這裡記錄重點。AI 將協助您分析客戶反應，並產出下一次的追蹤建議。
                </p>
                <textarea 
                  className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none"
                  placeholder="輸入拜訪結論..."
                  value={plan.postVisitNotes ?? ""}
                  onChange={(e) => updatePlan(plan.id, { postVisitNotes: e.target.value })}
                />
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
              <ExternalLink className="w-5 h-5 text-indigo-500" /> 生成客戶報告
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLookSheet({ plan, client }: { plan: VisitPlan; client: any }) {
  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm px-3 h-10 transition-colors">
        <Zap className="w-4 h-4 fill-current" /> 15 分鐘速覽
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-6 border-b border-zinc-100">
          <SheetTitle className="text-xl flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600 fill-current" /> 拜訪前衝刺速覽
          </SheetTitle>
          <SheetDescription className="font-medium">
            這張「小抄」包含最重要的提問與應對，幫助您在見面之前快速熱身。
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-8">
          {/* Quick Info */}
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-xs font-bold text-zinc-400 mb-1">客戶</p>
              <p className="text-2xl font-black text-zinc-900">{client.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-400 mb-1">目的</p>
              <p className="text-2xl font-black text-zinc-900">{PURPOSE_LABELS[plan.purpose]}</p>
            </div>
          </div>

          {/* Key Objectives */}
          <section className="space-y-4 px-2">
            <h4 className="text-sm font-black uppercase text-orange-500 tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4" /> 拜訪目標
            </h4>
            <div className="space-y-3">
              {plan.objectives.map(obj => (
                <div key={obj.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                  <p className="text-base font-bold text-zinc-800 leading-snug">{obj.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SPIN Key Questions */}
          <section className="space-y-4 px-2">
            <h4 className="text-sm font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> 必問金句 (SPIN)
            </h4>
            <div className="space-y-4">
              {plan.spinQuestions.slice(0, 4).map(q => (
                <div key={q.id} className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-[1.5rem] relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
                  <p className="text-[1.05rem] font-bold text-indigo-950 leading-relaxed italic">「{q.question}」</p>
                  <span className="absolute bottom-2 right-3 text-[10px] font-black text-indigo-200 uppercase tracking-widest">{q.type}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Key Objection */}
          <section className="space-y-4 px-2">
            <h4 className="text-sm font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> 預防針 (應對話術)
            </h4>
            {plan.objections[0] && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-400 italic">如果客戶說：{plan.objections[0].expectedObjection}</p>
                <div className="p-5 bg-zinc-50 rounded-[1.5rem] border border-zinc-100">
                  <p className="text-sm font-medium text-zinc-700 leading-relaxed">
                    <span className="font-bold text-zinc-900 block mb-1">您可以說：</span>
                    {plan.objections[0].suggestedResponse}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Share/Print CTA */}
          <div className="pt-8 flex gap-4">
            <Button className="flex-1 rounded-[1.25rem] bg-zinc-900 hover:bg-zinc-800 text-white gap-2 h-14 font-bold text-lg shadow-lg shadow-zinc-200">
              <Printer className="w-5 h-5" /> 列印小抄
            </Button>
            <Button variant="outline" className="flex-1 rounded-[1.25rem] border-zinc-200 hover:bg-zinc-50 gap-2 h-14 font-bold text-lg">
              <Share2 className="w-5 h-5" /> 分享給夥伴
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
