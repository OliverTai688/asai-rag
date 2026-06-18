"use client";

import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlanType } from "@/domains/subscription/hooks/useSubscriptionForm";
import { PLAN_DETAILS } from "@/domains/subscription/plans";

export interface PricingSectionProps {
  onSelectPlan: (plan: PlanType) => void;
}

const planMeta: Record<PlanType, { cta: string; highlight?: boolean; badge?: string }> = {
  FREE: { cta: "免費開始" },
  STARTER: { cta: "選擇 Starter" },
  PRO: { cta: "選擇 Pro", highlight: true, badge: "最受歡迎" },
  ENTERPRISE: { cta: "聯絡銷售" },
};

const plans = (Object.keys(PLAN_DETAILS) as PlanType[]).map((id) => ({
  ...PLAN_DETAILS[id],
  ...planMeta[id],
}));

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mx-auto h-auto rounded-full px-3 py-1 text-[11px] font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            訂閱方案
          </Badge>
          <h2 className="mt-4 text-h2 text-ink">
            選擇最適合您團隊的方案
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            從個人試用到企業級導入，誠問 AI 提供彈性的方案，隨團隊成長升級。
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-md grid-cols-1 gap-6 sm:max-w-2xl sm:grid-cols-2 lg:max-w-none lg:grid-cols-4 lg:items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition-[border-color]",
                plan.highlight
                  ? "bg-ink text-paper border-transparent lg:scale-[1.03]"
                  : "bg-card border-hairline hover:border-hairline-2"
              )}
            >
              {plan.badge && (
                <Badge
                  variant="gold"
                  className="absolute -top-3 left-1/2 h-auto -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold"
                >
                  <Sparkles className="h-3 w-3" />
                  {plan.badge}
                </Badge>
              )}

              <h3 className={cn("text-lg font-semibold", plan.highlight ? "text-paper" : "text-ink")}>
                {plan.name}
              </h3>
              <p className={cn("mt-2 min-h-10 text-sm leading-5", plan.highlight ? "text-paper/70" : "text-muted-foreground")}>
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className={cn("tabular text-4xl font-semibold tracking-tight", plan.highlight ? "text-paper" : "text-ink")}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={cn("text-sm font-medium", plan.highlight ? "text-paper/60" : "text-muted-foreground")}>
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn("flex items-start gap-2 text-sm", plan.highlight ? "text-paper/90" : "text-foreground")}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        plan.highlight ? "text-[#C9A227]" : "text-[#1A3A6B]"
                      )}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlight ? "mono" : "monoOutline"}
                className={cn(
                  "mt-8 w-full rounded-full",
                  plan.highlight && "bg-paper text-ink hover:opacity-90"
                )}
                onClick={() => onSelectPlan(plan.id)}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
