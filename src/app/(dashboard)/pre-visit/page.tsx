"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  CalendarDays, 
  ChevronRight, 
  Clock, 
  User, 
  Filter,
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useVisitStore } from "@/domains/visit/store";
import { useClientStore } from "@/domains/client/store";
import { VisitPurpose, VisitPlanStatus } from "@/domains/visit/types";
import { FormattedTime } from "@/components/ui/formatted-time";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

export default function PreVisitListPage() {
  const router = useRouter();
  const { plans, createEmptyPlan } = useVisitStore();
  const { clients } = useClientStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlanClientId, setNewPlanClientId] = useState("");
  const [newPlanPurpose, setNewPlanPurpose] = useState<VisitPurpose>("FIRST_VISIT");

  const handleCreatePlan = () => {
    if (!newPlanClientId) return;
    const planId = createEmptyPlan(newPlanClientId, newPlanPurpose);
    setIsDialogOpen(false);
    router.push(`/pre-visit/${planId}`);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || "未知客戶";

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">訪前規劃管理</h1>
          <p className="text-zinc-500 font-medium">
            建立與查看您的 AI 輔助拜訪計畫，讓每一次成交都源於完美準備。
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6 font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95">
            <Plus className="w-5 h-5" /> 新增規劃
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white/80 backdrop-blur-xl">
            <div className="bg-indigo-600 p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">建立新拜訪規劃</DialogTitle>
                <DialogDescription className="text-indigo-100 mt-2 font-medium">
                  選擇客戶與拜訪目的，AI 將為您生成專屬的對話劇本。
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  選擇客戶
                </label>
                <Select 
                  onValueChange={(val) => setNewPlanClientId(val ?? "")} 
                  value={newPlanClientId}
                >
                  <SelectTrigger className="rounded-2xl border-zinc-200 bg-white shadow-sm h-14 px-5">
                    <SelectValue placeholder="搜尋或選擇客戶..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="py-3 rounded-xl mx-1">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900">{client.name}</span>
                          <span className="text-xs text-zinc-500">{client.occupation}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  拜訪目的
                </label>
                <Select 
                  onValueChange={(val) => setNewPlanPurpose(val as VisitPurpose)} 
                  value={newPlanPurpose}
                >
                  <SelectTrigger className="rounded-2xl border-zinc-200 bg-white shadow-sm h-14 px-5">
                    <SelectValue placeholder="請選擇目的..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                    {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="py-3 rounded-xl mx-1">
                        <span className="font-bold">{label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="px-8 pb-8">
              <Button 
                onClick={handleCreatePlan}
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!newPlanClientId}
              >
                開始規劃
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-indigo-600" />
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

      {/* Plan List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">所有規劃清單</h2>
          <Button variant="ghost" size="sm" className="rounded-xl gap-2 text-zinc-500">
            <Filter className="w-4 h-4" /> 篩選
          </Button>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <p className="text-zinc-400 font-medium">目前還沒有拜訪規劃，點擊右上角「新增規劃」開始吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className="rounded-3xl border-zinc-200 hover:border-indigo-200 transition-all cursor-pointer group overflow-hidden"
                onClick={() => router.push(`/pre-visit/${plan.id}`)}
              >
                <CardContent className="p-0">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <User className="w-5 h-5 text-zinc-600 group-hover:text-indigo-600" />
                      </div>
                      <Badge className={cn(
                        "rounded-full px-3 py-1 font-bold text-[10px]",
                        plan.status === "READY" ? "bg-emerald-100 text-emerald-700" :
                        plan.status === "COMPLETED" ? "bg-zinc-100 text-zinc-600" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {plan.status === "READY" ? "READY" : 
                         plan.status === "COMPLETED" ? "已完成" : "草稿"}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="font-bold text-lg">{getClientName(plan.clientId)}</p>
                      <p className="text-sm text-zinc-500 font-medium">
                        目的：{PURPOSE_LABELS[plan.purpose]}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2 text-xs text-zinc-400 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <FormattedTime isoString={plan.updatedAt} format="date" />
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        準備進度：{plan.objectives.length > 0 ? "已生成" : "待處理"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 flex items-center justify-between group-hover:bg-indigo-50/50 transition-colors">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">查看詳情</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
