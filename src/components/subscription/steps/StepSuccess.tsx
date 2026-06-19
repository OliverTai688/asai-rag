import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { PlanType } from "@/domains/subscription/hooks/useSubscriptionForm";
import { PLAN_DETAILS } from "@/domains/subscription/plans";

interface StepSuccessProps {
  selectedPlan: PlanType | null;
}

export function StepSuccess({ selectedPlan }: StepSuccessProps) {
  const plan = selectedPlan ? PLAN_DETAILS[selectedPlan] : null;

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5E9] text-[#1B5E20] dark:bg-[#1B5E20]/20"
      >
        <CheckCircle2 className="h-8 w-8" />
      </motion.div>
      <h3 className="mt-4 text-lg font-bold text-[#0A2342] dark:text-white">訂閱成功！</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-[#546E7A] dark:text-[#90CAF9]">
        {plan ? `您已成功訂閱 ${plan.name} 方案（${plan.price}${plan.period}）。` : "您的訂閱已完成。"}
        感謝您選擇誠問 AI，立即開始體驗完整功能。
      </p>
    </div>
  );
}
