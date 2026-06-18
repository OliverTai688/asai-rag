import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanType } from "@/domains/subscription/hooks/useSubscriptionForm";
import { PLAN_DETAILS } from "@/domains/subscription/plans";

interface StepPlanSelectionProps {
  selectedPlan: PlanType | null;
}

export function StepPlanSelection({ selectedPlan }: StepPlanSelectionProps) {
  const plan = selectedPlan ? PLAN_DETAILS[selectedPlan] : null;

  if (!plan) {
    return (
      <p className="py-8 text-center text-sm text-[#546E7A] dark:text-[#90CAF9]">
        尚未選擇方案，請返回方案頁面選擇。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#EBF3FB] bg-[#F7FAFF] p-4 dark:border-[rgba(144,202,249,0.12)] dark:bg-[#1A3A6B]/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Badge variant="blue" className="h-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
              <Sparkles className="h-3 w-3" />
              {plan.name}
            </Badge>
            <p className="mt-2 text-sm leading-5 text-[#546E7A] dark:text-[#90CAF9]">{plan.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[#0A2342] dark:text-white">{plan.price}</p>
            {plan.period && (
              <p className="text-xs font-medium text-[#546E7A] dark:text-[#90CAF9]">{plan.period}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#546E7A] dark:text-[#90CAF9]">
          方案內容
        </p>
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-[#0A2342] dark:text-[#E8F0FE]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1565C0]" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
