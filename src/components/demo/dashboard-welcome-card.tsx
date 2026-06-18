"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  demoQuickstart,
  getQuickstartStep,
  quickstartStatusStorageKey,
} from "@/domains/demo/quickstart";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { dashboardTourSteps } from "@/domains/demo/tour-steps";

const overviewStep = getQuickstartStep("overview");

const completedOutputs = [
  { label: "準備包", value: getQuickstartStep("plan").completedOutput },
  { label: "需求摘要", value: getQuickstartStep("spin").completedOutput },
  { label: "演練紀錄", value: getQuickstartStep("theater").completedOutput },
  { label: "決策報告", value: getQuickstartStep("report").completedOutput },
];

export function DashboardWelcomeCard() {
  const searchParams = useSearchParams();
  const isCompleted = searchParams.get("demo") === "completed";

  useEffect(() => {
    window.localStorage.setItem(
      quickstartStatusStorageKey,
      isCompleted ? "completed" : "idle"
    );
  }, [isCompleted]);

  const title = isCompleted ? "Demo 完成：你剛跑完一次拜訪閉環" : overviewStep.screenTitle;
  const body = isCompleted
    ? "你已經從 dashboard 出發，完成訪前準備、SPIN 需求澄清、劇場演練與決策報告。重新體驗時仍然只要一直按下一步。"
    : overviewStep.bodyCopy;

  return (
    <>
      {!isCompleted && <SpotlightTour steps={dashboardTourSteps} />}
      <Card className="overflow-hidden border-hairline bg-card shadow-none">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-[#102B52] p-5 text-white sm:p-6">
            <div className="mb-4 hidden flex-wrap items-center gap-2 sm:flex">
              <span className="inline-flex h-6 items-center rounded-full bg-white/10 px-2.5 text-[11px] font-bold">
                Quickstart Demo
              </span>
              <span className="text-xs font-semibold text-[#B7D4EA]">
                {demoQuickstart.durationLabel}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:flex">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-[#A7F3D0]" />
                ) : (
                  <Sparkles className="h-5 w-5 text-[#D6E8F8]" />
                )}
              </div>
              <div data-tour="welcome-intro" className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D6E8F8]">
                  {body}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                data-tour="welcome-cta"
                href="/pre-visit?demo=quickstart"
                onClick={() => {
                  window.localStorage.removeItem(quickstartStatusStorageKey);
                }}
                className={buttonVariants({
                  className: "h-11 justify-between rounded-lg bg-white !text-[#0A2342] hover:bg-[#EBF3FB] hover:!text-[#0A2342] sm:min-w-[220px] [&_svg]:!text-[#0A2342]",
                })}
              >
                {isCompleted ? "重新體驗" : overviewStep.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pilot"
                className={buttonVariants({
                  variant: "outline",
                  className: "hidden h-11 rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/10 sm:inline-flex",
                })}
              >
                查看體驗路徑
              </Link>
            </div>
          </div>

          <div className="hidden p-5 sm:p-6 lg:block">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  {isCompleted ? "完成產出" : "UI 測試腳本"}
                </p>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {isCompleted ? "四項內容已串起來" : "請照這條路徑體驗"}
                </h3>
              </div>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <ol className="space-y-2">
              {(isCompleted
                ? completedOutputs
                : demoQuickstart.steps.slice(1).map((step) => ({
                    label: step.title,
                    value: step.primaryCta,
                  }))
              ).map((step, index) => (
                <li key={step.label} className="flex items-start gap-3 rounded-lg border border-hairline bg-paper-2 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-[11px] font-black text-primary">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-5 text-foreground">
                      {step.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {step.value}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              測試時只需要確認每一頁都有「下一步」按鈕，並且下一頁會自動帶入示範資料。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
