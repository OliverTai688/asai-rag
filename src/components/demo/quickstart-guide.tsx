import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import { demoQuickstart, type DemoQuickstartStepId } from "@/domains/demo/quickstart";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickstartGuideProps = {
  currentStepId: DemoQuickstartStepId;
  className?: string;
};

export function QuickstartGuide({ currentStepId, className }: QuickstartGuideProps) {
  const currentIndex = demoQuickstart.steps.findIndex((step) => step.id === currentStepId);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentStep = demoQuickstart.steps[activeIndex];
  const progress = ((activeIndex + 1) / demoQuickstart.steps.length) * 100;

  return (
    <section
      className={cn(
        "rounded-lg border border-[#D7DFE7] bg-white shadow-sm",
        "dark:border-[rgba(144,202,249,0.16)] dark:bg-[#0F2744]",
        className
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-full border border-[#D6E8F8] bg-[#F7FAFF] px-2.5 text-[11px] font-bold text-[#1565C0]">
              Demo Quickstart
            </span>
            <span className="text-xs font-semibold text-[#546E7A] dark:text-[#90CAF9]">
              {demoQuickstart.durationLabel}
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[#0A2342] dark:text-white sm:text-xl">
            {demoQuickstart.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#546E7A] dark:text-[#B7D4EA]">
            {demoQuickstart.subtitle}
          </p>
        </div>

        <Link
          href={currentStep.route}
          className={buttonVariants({
            className: "h-11 w-full justify-between rounded-lg px-4 sm:w-fit",
          })}
        >
          {currentStep.routeLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="border-t border-[#EDF1F5] px-4 py-3 dark:border-[rgba(144,202,249,0.12)] sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <PlayCircle className="h-4 w-4 shrink-0 text-[#1565C0]" />
            <span className="truncate text-xs font-bold text-[#0A2342] dark:text-white">
              Step {activeIndex + 1} / {demoQuickstart.steps.length}：{currentStep.title}
            </span>
          </div>
          <span className="shrink-0 text-xs font-semibold text-[#546E7A] dark:text-[#90CAF9]">
            {currentStep.output}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EEF4] dark:bg-[#0A1929]">
          <div className="h-full rounded-full bg-[#1565C0]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="overflow-x-auto border-t border-[#EDF1F5] px-4 py-4 dark:border-[rgba(144,202,249,0.12)] sm:px-5">
        <ol className="flex min-w-max gap-3 lg:min-w-0 lg:grid lg:grid-cols-6">
          {demoQuickstart.steps.map((step, index) => {
            const isActive = step.id === currentStepId;
            const isDone = index < activeIndex;

            return (
              <li
                key={step.id}
                className={cn(
                  "w-[190px] rounded-lg border p-3 lg:w-auto",
                  isActive
                    ? "border-[#1565C0] bg-[#F7FAFF]"
                    : "border-[#E3E9EF] bg-white dark:border-[rgba(144,202,249,0.12)] dark:bg-[#0A1929]/30"
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
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
                  <span className="text-[10px] font-bold text-[#78909C]">{step.output}</span>
                </div>
                <p className="text-sm font-bold text-[#0A2342] dark:text-white">{step.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#546E7A] dark:text-[#90CAF9]">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
