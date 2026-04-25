"use client";

import { useParams } from "next/navigation";
import { clientService } from "@/domains/client/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Sparkles, ShieldCheck, Target, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const GAP_CATEGORIES = [
  { name: "身故保障", current: 5000000, suggested: 12000000, desc: "保障家庭十年內之生活與子女教育開銷" },
  { name: "重大疾病", current: 1000000, suggested: 3000000, desc: "支應高額自費藥物與三至五年之薪資損失" },
  { name: "意外身障", current: 2000000, suggested: 8000000, desc: "應對不預期之失能照護成本" },
  { name: "長照保障", current: 0, suggested: 2000000, desc: "老後失能之安養機構費用" },
];

export default function GapAnalysisPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const client = clientService.getClientById(clientId);

  if (!client) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h3 className="text-2xl font-bold flex items-center gap-2 mb-2">
          保障缺口視覺化分析
        </h3>
        <p className="text-zinc-500 font-medium">系統依據客戶目前的年收入、家庭結構與現有保單進行缺口演算。</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {GAP_CATEGORIES.map((cat) => {
          const ratio = (cat.current / cat.suggested) * 100;
          return (
            <Card key={cat.name} className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-900 dark:text-zinc-100 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                        {cat.name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg leading-none">{cat.name}</h4>
                        <p className="text-xs text-zinc-500 font-medium mt-1">{cat.desc}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-zinc-400 font-medium">完成度 {Math.round(ratio)}%</span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        現有 {formatCurrency(cat.current)} / 建議 {formatCurrency(cat.suggested)}
                      </span>
                    </div>
                    <Progress value={ratio}>
                      <ProgressTrack className="h-2 bg-zinc-100 dark:bg-zinc-800">
                        <ProgressIndicator className={ratio < 60 ? "bg-orange-500" : "bg-green-500"} />
                      </ProgressTrack>
                    </Progress>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Suggestion Card */}
      <Card className="rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-bold text-indigo-900 dark:text-indigo-400">AI 實質規劃建議</h4>
              <p className="text-sm font-medium text-indigo-700/70 dark:text-indigo-400/70">基於缺口分析，建議採取以下行動：</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-bold">階段一：補足意外與重疾</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">優先增加 200 萬重大傷病險與 500 萬意外險，利用定期商品槓桿，月繳預算控制在 3000 元內。</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold">階段二：退休與教育金預留</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">當基礎保障建立後，可考慮美元分紅商品，同步解決退休規劃與子女出國留學金之幣別配置。</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
