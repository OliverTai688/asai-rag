"use client";

import { useParams } from "next/navigation";
import { clientService } from "@/domains/client/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientOverviewPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const client = clientService.getClientById(clientId);

  if (!client) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* AI Intelligence Summary */}
      <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-indigo-600 to-indigo-800 text-white overflow-hidden relative">
        <Sparkles className="absolute top-4 right-4 w-12 h-12 text-white/10" />
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            AI 智能洞察摘要
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-indigo-50 leading-relaxed font-medium">
            基於該客戶為「{client.occupation}」且具有「{client.family.length > 0 ? "家庭責任" : "單身"}」背景，
            系統分析其核心需求在於 {client.aiTags.join(" 與 ") || "基本保障建立"}。
            建議下次面談重點：
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
            {[
              "探討子女未來教育金缺口細節",
              "說明現有重大疾病一次金之額度限制",
              "引入 SPIN 提問：了解其對未來退休後長照風險的看法",
            ].map((point, i) => (
              <li key={i} className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/10 text-sm font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          
          <div className="pt-2">
            <button 
              onClick={() => {
                // We'll redirect to the list page with the client selected
                // But since the list page doesn't take client param yet, 
                // we'll just go to the list page.
                window.location.href = `/pre-visit`;
              }}
              className="w-full bg-white text-indigo-700 h-12 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors shadow-lg"
            >
              <Zap className="w-5 h-5 fill-current" /> 開始訪前規劃
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Key Risk Points */}
        <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" /> 關鍵風險點
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
              <p className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-1">定期險到期風險</p>
              <p className="text-xs text-orange-700/70 dark:text-orange-400/70">該客戶有一張 500 萬定期壽險將於明年到期，屆時家計負擔仍重，需提前規劃續保或轉換。</p>
            </div>
            <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
              <p className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-1">醫療費支應不足</p>
              <p className="text-xs text-orange-700/70 dark:text-orange-400/70">現有醫療險每日住院僅 2000 元，面對現行自費醫療環境（如達文西手術）有極大缺口。</p>
            </div>
          </CardContent>
        </Card>

        {/* Opportunity Summary */}
        <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" /> 成交機會分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm font-medium">客戶對家庭教育基金有顯著焦慮，適合切入儲蓄型商品。</p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm font-medium">近期曾主動詢問重大傷病定義，意向程度 Grade-B。</p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm font-medium">配偶亦有保單檢視需求，可進行家庭保單整合規劃。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
