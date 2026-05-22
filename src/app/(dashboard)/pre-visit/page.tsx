"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  CalendarDays, 
  ChevronRight, 
  Clock, 
  User, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useVisitStore } from "@/domains/visit/store";
import { useClientStore } from "@/domains/client/store";
import { VisitPurpose } from "@/domains/visit/types";
import { FormattedTime } from "@/components/ui/formatted-time";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { demoQuickstart } from "@/domains/demo/quickstart";
import { cn } from "@/lib/utils";

const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

function PreVisitListContent() {
  const router = useRouter();
  const { plans, createEmptyPlan } = useVisitStore();
  const { clients } = useClientStore();
  
  const searchParams = useSearchParams();
  const isQuickstart = searchParams.get("demo") === "quickstart";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"LIST" | "CALENDAR">("LIST");
  const [newPlanClientId, setNewPlanClientId] = useState("");
  const [newPlanPurpose, setNewPlanPurpose] = useState<VisitPurpose>("FIRST_VISIT");
  const [newPlanTime, setNewPlanTime] = useState("");
  const selectedClientId = newPlanClientId || (isQuickstart ? demoQuickstart.clientId : "");
  const selectedPurpose = newPlanClientId
    ? newPlanPurpose
    : isQuickstart
      ? (demoQuickstart.purpose as VisitPurpose)
      : newPlanPurpose;
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const dialogOpen = isDialogOpen || isQuickstart;

  const isUrgent = (time?: string) => {
    if (!time) return false;
    const visitDate = new Date(time);
    const now = new Date();
    const diffHours = (visitDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours < 24; // Less than 24 hours away
  };

  const sortedPlans = [...plans].sort((a, b) => {
    // 1. Urgency first (visits within 24h)
    const aUrgent = isUrgent(a.visitTime);
    const bUrgent = isUrgent(b.visitTime);
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;

    // 2. Then by visit time (ascending)
    if (a.visitTime && b.visitTime) {
      return new Date(a.visitTime).getTime() - new Date(b.visitTime).getTime();
    }
    if (a.visitTime) return -1;
    if (b.visitTime) return 1;

    // 3. Finally by creation time (descending)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  useEffect(() => {
    const autoCreate = searchParams.get("autoCreate");
    const clientId = searchParams.get("clientId");
    
    if (autoCreate === "true" && clientId) {
      const planId = createEmptyPlan(clientId, "FIRST_VISIT");
      router.replace(`/pre-visit/${planId}${isQuickstart ? "?demo=quickstart" : ""}`);
    }
  }, [searchParams, createEmptyPlan, router, isQuickstart]);

  const handleCreatePlan = () => {
    if (!selectedClientId) return;
    const planId = createEmptyPlan(selectedClientId, selectedPurpose, newPlanTime || undefined);
    setIsDialogOpen(false);
    router.push(`/pre-visit/${planId}${isQuickstart ? "?demo=quickstart" : ""}`);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || "未知客戶";
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open && isQuickstart) {
      router.replace("/pre-visit");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">訪前規劃管理</h1>
          <p className="text-zinc-500 font-medium">
            建立與查看您的 AI 輔助拜訪計畫，讓每一次成交都源於完美準備。
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1A3A6B] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1565C0] active:scale-[0.99] sm:h-12 sm:px-5">
            <Plus className="w-5 h-5" /> 新增規劃
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-[560px] overflow-hidden rounded-xl border border-[#D7DFE7] bg-white p-0 shadow-xl sm:rounded-2xl">
            <div className="bg-[#102B52] p-5 text-white sm:p-7">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white sm:text-2xl">建立新拜訪規劃</DialogTitle>
                <DialogDescription className="mt-2 text-sm font-medium leading-6 text-[#D6E8F8]">
                  選擇客戶與拜訪目的，AI 將為您生成專屬的對話劇本。
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="max-h-[calc(100dvh-220px)] space-y-5 overflow-y-auto p-5 sm:p-7">
              {isQuickstart && (
                <div className="rounded-lg border border-[#D6E8F8] bg-[#F7FAFF] p-3">
                  <p className="text-xs font-bold text-[#1565C0]">Quickstart Demo</p>
                  <p className="mt-1 text-sm font-semibold text-[#0A2342]">
                    已帶入 {demoQuickstart.clientName} 與「{demoQuickstart.purposeLabel}」情境。
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#2196F3]" />
                  選擇客戶
                </label>
                <Select 
                  onValueChange={(val) => setNewPlanClientId(val ?? "")} 
                  value={selectedClientId}
                >
                  <SelectTrigger className="h-12 rounded-lg border-[#D7DFE7] bg-white px-4 shadow-none sm:h-14">
                    {selectedClient ? (
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-bold text-[#0A2342]">
                          {selectedClient.name}
                        </span>
                        <span className="block truncate text-xs font-medium text-[#546E7A]">
                          {selectedClient.occupation}
                        </span>
                      </span>
                    ) : (
                      <span className="flex-1 text-left text-sm font-medium text-zinc-400">
                        搜尋或選擇客戶...
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-[#D7DFE7] shadow-lg">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="mx-1 rounded-md py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900">{client.name}</span>
                          <span className="text-xs text-zinc-500">{client.occupation}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#2196F3]" />
                    拜訪目的
                  </label>
                  <Select 
                    onValueChange={(val) => setNewPlanPurpose(val as VisitPurpose)} 
                    value={selectedPurpose}
                  >
                    <SelectTrigger className="h-12 rounded-lg border-[#D7DFE7] bg-white px-4 text-sm shadow-none sm:h-14">
                      <span className="flex-1 text-left font-bold text-[#0A2342]">
                        {PURPOSE_LABELS[selectedPurpose]}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-[#D7DFE7] shadow-lg">
                      {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="mx-1 rounded-md py-2.5">
                          <span className="font-bold text-sm">{label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#2196F3]" />
                    拜訪時間
                  </label>
                  <input 
                    type="datetime-local"
                    value={newPlanTime}
                    onChange={(e) => setNewPlanTime(e.target.value)}
                    className="h-12 w-full rounded-lg border border-[#D7DFE7] bg-white px-4 text-sm font-medium shadow-none transition-all focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/20 sm:h-14"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#EDF1F5] bg-white p-5 sm:p-7">
              <Button 
                onClick={handleCreatePlan}
                className="h-12 w-full rounded-lg bg-[#1A3A6B] text-base font-bold text-white shadow-sm transition-colors hover:bg-[#1565C0] active:scale-[0.99] disabled:opacity-50 sm:h-14"
                disabled={!selectedClientId}
              >
                開始規劃
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <QuickstartGuide currentStepId="pre-visit" />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF3FB] flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-[#1565C0]" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">本週待辦</p>
              <p className="text-2xl font-bold">{plans.filter(p => p.status !== "COMPLETED").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">已完成拜訪</p>
              <p className="text-2xl font-bold">{plans.filter(p => p.status === "COMPLETED").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">草稿中</p>
              <p className="text-2xl font-bold">{plans.filter(p => p.status === "DRAFT").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan List Header & View Toggle */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">拜訪規劃行程</h2>
          <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-2xl">
            <Button 
              variant={viewMode === "LIST" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("rounded-xl h-9 px-4 font-bold text-xs", viewMode === "LIST" && "bg-white shadow-sm")}
              onClick={() => setViewMode("LIST")}
            >
              列表視圖
            </Button>
            <Button 
              variant={viewMode === "CALENDAR" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("rounded-xl h-9 px-4 font-bold text-xs", viewMode === "CALENDAR" && "bg-white shadow-sm")}
              onClick={() => setViewMode("CALENDAR")}
            >
              日曆視圖
            </Button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <p className="text-zinc-400 font-medium">目前還沒有拜訪規劃，點擊右上角「新增規劃」開始吧！</p>
          </div>
        ) : viewMode === "LIST" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPlans.map((plan) => (
              <Card 
                key={plan.id}
                className={cn(
                  "rounded-3xl border-zinc-200 hover:border-[#90CAF9]/40 transition-all cursor-pointer group overflow-hidden relative",
                  isUrgent(plan.visitTime) && "border-orange-200 bg-orange-50/10 shadow-lg shadow-orange-100/20"
                )}
                onClick={() => router.push(`/pre-visit/${plan.id}`)}
              >
                {isUrgent(plan.visitTime) && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-orange-400" />
                )}
                <CardContent className="p-0">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center group-hover:bg-[#EBF3FB] transition-colors">
                        <User className="w-5 h-5 text-zinc-600 group-hover:text-[#1565C0]" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className={cn(
                          "rounded-full px-3 py-1 font-bold text-[10px] border-none",
                          plan.status === "READY" ? "bg-emerald-100 text-emerald-700" :
                          plan.status === "COMPLETED" ? "bg-zinc-100 text-zinc-600" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {plan.status === "READY" ? "READY" : 
                           plan.status === "COMPLETED" ? "已完成" : "草稿"}
                        </Badge>
                        {isUrgent(plan.visitTime) && (
                          <Badge className="bg-orange-500 text-white border-none rounded-full px-2 py-0.5 text-[9px] font-black animate-pulse">
                            火速準備
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-bold text-lg">{getClientName(plan.clientId)}</p>
                      <p className="text-sm text-zinc-500 font-medium">
                        目的：{PURPOSE_LABELS[plan.purpose]}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <div className={cn(
                        "flex items-center gap-2 p-2.5 rounded-2xl text-[11px] font-bold",
                        plan.visitTime ? "bg-zinc-50 text-zinc-600" : "bg-zinc-50 text-zinc-400"
                      )}>
                        <Clock className={cn("w-3.5 h-3.5", isUrgent(plan.visitTime) && "text-orange-500")} />
                        {plan.visitTime ? (
                          <span>拜訪：<FormattedTime isoString={plan.visitTime} format="full" /></span>
                        ) : (
                          <span>尚未設定拜訪時間</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 flex items-center justify-between group-hover:bg-[#EBF3FB]/50 transition-colors">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">查看與生成規劃</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-[#2196F3] group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-zinc-200 p-8 min-h-[400px] flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center">
              <CalendarDays className="w-10 h-10 text-zinc-300" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-700">日曆視圖開發中</h3>
              <p className="text-sm text-zinc-400 max-w-xs mt-1 font-medium">
                我們正在努力將 FullCalendar 整合進來，讓您可以更直覺地管理拜訪行程。目前請先使用列表視圖。
              </p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => setViewMode("LIST")}>
              回到列表視圖
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PreVisitListPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">載入中...</div>}>
      <PreVisitListContent />
    </Suspense>
  );
}
