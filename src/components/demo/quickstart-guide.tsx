import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  demoQuickstart,
  getQuickstartNextHref,
  getQuickstartStep,
  type DemoQuickstartStepId,
} from "@/domains/demo/quickstart";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickstartGuideProps = {
  currentStepId: DemoQuickstartStepId;
  className?: string;
  compact?: boolean;
  nextHref?: string;
  nextLabel?: string;
};

export function QuickstartGuide({
  currentStepId,
  className,
  compact = false,
  nextHref,
  nextLabel,
}: QuickstartGuideProps) {
  const currentIndex = demoQuickstart.steps.findIndex((step) => step.id === currentStepId);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentStep = getQuickstartStep(currentStepId);
  const nextStep = demoQuickstart.steps[activeIndex + 1];
  const progress = ((activeIndex + 1) / demoQuickstart.steps.length) * 100;
  const resolvedNextHref = nextHref ?? getQuickstartNextHref(currentStep.id);
  const resolvedNextLabel = nextLabel ?? currentStep.primaryCta;

  return (
    <>
      <section
        data-testid="quickstart-guide"
        className={cn(
          "overflow-hidden rounded-lg border border-[#D7DFE7] bg-white shadow-sm",
          "dark:border-[rgba(144,202,249,0.16)] dark:bg-[#0F2744]",
          className
        )}
      >
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-full border border-[#D6E8F8] bg-[#F7FAFF] px-2.5 text-[11px] font-bold text-[#1565C0]">
                Step {activeIndex + 1} / {demoQuickstart.steps.length}
              </span>
              <span className="text-xs font-semibold text-[#546E7A] dark:text-[#90CAF9]">
                {currentStep.title}
              </span>
            </div>
            <p className="max-w-3xl text-sm font-semibold leading-6 text-[#0A2342] dark:text-white">
              {currentStep.focus}
            </p>
            {compact && (
              <p className="max-w-3xl text-xs font-medium leading-5 text-[#546E7A] dark:text-[#B7D7F6]">
                {currentStep.bodyCopy}
              </p>
            )}
          </div>

          <Link
            data-testid="quickstart-primary-cta"
            href={resolvedNextHref}
            className={buttonVariants({
              className: "hidden h-11 w-full justify-between rounded-lg px-4 lg:inline-flex lg:w-fit",
            })}
          >
            {resolvedNextLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="h-1.5 bg-[#E8EEF4] dark:bg-[#0A1929]">
          <div className="h-full bg-[#1565C0]" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex flex-col gap-2 border-t border-[#EDF1F5] px-4 py-3 text-xs dark:border-[rgba(144,202,249,0.12)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="font-semibold text-[#546E7A] dark:text-[#90CAF9]">
            產出：{currentStep.completedOutput}
          </p>
          <p className="font-medium text-[#78909C]">
            {nextStep ? `下一步前往「${nextStep.title}」` : "完成後回到總覽"}
          </p>
        </div>

        {!compact && (
          <div className="overflow-x-auto border-t border-[#EDF1F5] px-4 py-3 dark:border-[rgba(144,202,249,0.12)] sm:px-5">
            <ol className="flex min-w-max gap-2">
              {demoQuickstart.steps.map((step, index) => {
                const isActive = step.id === currentStepId;
                const isDone = index < activeIndex;

                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-2",
                      isActive
                        ? "border-[#1565C0] bg-[#F7FAFF]"
                        : "border-[#E3E9EF] bg-white dark:border-[rgba(144,202,249,0.12)] dark:bg-[#0A1929]/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black",
                          isDone
                            ? "bg-[#E8F5E9] text-[#1B5E20]"
                            : isActive
                              ? "bg-[#1565C0] text-white"
                              : "bg-[#EDF1F5] text-[#546E7A]"
                        )}
                      >
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.order}
                      </span>
                    </div>
                    <p className="whitespace-nowrap text-xs font-bold text-[#0A2342] dark:text-white">{step.title}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D7DFE7] bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(10,35,66,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black uppercase tracking-wide text-[#1565C0]">
              Step {activeIndex + 1} / {demoQuickstart.steps.length}
            </p>
            <p className="truncate text-sm font-bold text-[#0A2342]">{currentStep.title}</p>
          </div>
          <Link
            data-testid="quickstart-mobile-cta"
            href={resolvedNextHref}
            className={buttonVariants({
              className: "h-11 shrink-0 rounded-lg px-4 text-sm",
            })}
          >
            {resolvedNextLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
