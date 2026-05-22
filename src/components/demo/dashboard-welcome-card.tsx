"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, PlayCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { demoQuickstart } from "@/domains/demo/quickstart";

const defaultSteps = [
  "建立王大明加保拜訪規劃",
  "查看 AI 生成的訪前準備包",
  "進入 SPIN、劇場演練與報告追蹤",
];

const completedSteps = [
  "已完成訪前準備",
  "已串起 SPIN 與劇場演練",
  "已生成客戶報告並回到總覽",
];

export function DashboardWelcomeCard() {
  const searchParams = useSearchParams();
  const isCompleted = searchParams.get("demo") === "completed";
  const steps = isCompleted ? completedSteps : defaultSteps;

  return (
    <Card className="overflow-hidden border-[#C7D4DF] bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-[#102B52] p-5 text-white sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-full bg-white/10 px-2.5 text-[11px] font-bold">
                Quickstart Demo
              </span>
              <span className="text-xs font-semibold text-[#B7D4EA]">
                {demoQuickstart.durationLabel}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-[#A7F3D0]" />
                ) : (
                  <Sparkles className="h-5 w-5 text-[#D6E8F8]" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {isCompleted ? "體驗完成：保險拜訪閉環已跑完" : "歡迎進入誠問 AI 體驗"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D6E8F8]">
                  {isCompleted
                    ? "你剛剛從 dashboard 出發，走完訪前準備、SPIN、劇場演練與報告追蹤。可以重新跑一次，或直接用下方 dashboard 檢查成果。"
                    : "這次不用找功能。請一路按「下一步」，我們會用王大明的加保回訪，帶你看懂一次完整的保險拜訪工作流。"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/pre-visit?demo=quickstart"
                className={buttonVariants({
                  className: "h-11 justify-between rounded-lg bg-white text-[#0A2342] hover:bg-[#EBF3FB] sm:min-w-[220px]",
                })}
              >
                {isCompleted ? "重新開始體驗" : "開始體驗"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pilot"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-11 rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/10",
                })}
              >
                查看體驗路徑
              </Link>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7B8B9A]">
                  UI 測試腳本
                </p>
                <h3 className="mt-1 text-base font-bold text-[#0A2342]">
                  {isCompleted ? "完成後檢查" : "請照這條路徑體驗"}
                </h3>
              </div>
              <PlayCircle className="h-5 w-5 text-[#1565C0]" />
            </div>
            <ol className="space-y-2">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 rounded-lg border border-[#E2EAF1] bg-[#FAFCFF] p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EBF3FB] text-[11px] font-black text-[#1565C0]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold leading-6 text-[#0A2342]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-5 text-[#546E7A]">
              測試時只需要確認每一頁都有「下一步」按鈕，並且下一頁會自動帶入示範資料。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
