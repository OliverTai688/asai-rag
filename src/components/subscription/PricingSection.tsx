"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Check, Sparkles, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicPricingDto, PublicStatusDto } from "@/domains/public/types";
import { cn } from "@/lib/utils";
import { PlanType } from "@/domains/subscription/hooks/useSubscriptionForm";

export interface PricingSectionProps {
  pricing: PublicPricingDto;
  status: PublicStatusDto;
  onSelectPlan: (plan: PlanType) => void;
}

export function PricingSection({ pricing, status, onSelectPlan }: PricingSectionProps) {
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadWebsite, setLeadWebsite] = useState("");
  const [leadState, setLeadState] = useState<"idle" | "pending" | "success" | "error">("idle");

  async function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadState("pending");

    const response = await fetch("/api/public/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: leadEmail,
        name: leadName || undefined,
        company: leadCompany || undefined,
        message: leadMessage || undefined,
        planInterest: "UNSURE",
        source: "pricing",
        consentVersion: status.leadCapture.consentVersion,
        consentAccepted: leadConsent,
        privacyAccepted: leadConsent,
        website: leadWebsite || undefined,
      }),
    });

    if (!response.ok) {
      setLeadState("error");
      return;
    }

    setLeadState("success");
    setLeadEmail("");
    setLeadName("");
    setLeadCompany("");
    setLeadMessage("");
    setLeadConsent(false);
    setLeadWebsite("");
  }

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

        <div
          className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-lg border border-hairline bg-surface px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
          data-public-pricing-status
          data-checkout-status={status.checkoutAvailability.status}
          data-public-cta-mode={status.primaryCta.mode}
        >
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-ink">{status.checkoutAvailability.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{status.checkoutAvailability.reason}</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-[11px]">
            {status.leadCapture.status === "enabled_private_beta" ? "Private beta lead" : "Lead capture deferred"}
          </Badge>
        </div>

        {status.leadCapture.endpointEnabled ? (
          <form
            id="private-beta-lead"
            className="mx-auto mt-6 grid max-w-3xl gap-3 rounded-lg border border-hairline bg-paper p-4 sm:grid-cols-2"
            data-public-lead-form
            data-lead-consent-version={status.leadCapture.consentVersion}
            onSubmit={handleLeadSubmit}
          >
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">姓名</span>
              <Input value={leadName} onChange={(event) => setLeadName(event.target.value)} maxLength={80} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Email</span>
              <Input
                value={leadEmail}
                onChange={(event) => setLeadEmail(event.target.value)}
                type="email"
                autoComplete="email"
                maxLength={254}
                required
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-muted-foreground">公司 / 通訊處</span>
              <Input value={leadCompany} onChange={(event) => setLeadCompany(event.target.value)} maxLength={120} />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-muted-foreground">想先解決的事</span>
              <textarea
                value={leadMessage}
                onChange={(event) => setLeadMessage(event.target.value)}
                maxLength={1200}
                rows={3}
                className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
            <label className="hidden" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={leadWebsite} onChange={(event) => setLeadWebsite(event.target.value)} />
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground sm:col-span-2">
              <input
                className="mt-1"
                type="checkbox"
                checked={leadConsent}
                onChange={(event) => setLeadConsent(event.target.checked)}
                required
              />
              <span>我同意依 privacy / terms / AI disclaimer 用於 private beta 聯繫與導入評估。</span>
            </label>
            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
              <Button type="submit" variant="mono" className="rounded-full" disabled={leadState === "pending"}>
                {leadState === "pending" ? "送出中..." : "送出申請"}
              </Button>
              {leadState === "success" ? (
                <p className="text-xs font-medium text-ink">已收到申請。</p>
              ) : null}
              {leadState === "error" ? (
                <p className="text-xs font-medium text-destructive">送出失敗，請稍後再試。</p>
              ) : null}
            </div>
          </form>
        ) : null}

        <div className="mx-auto mt-16 grid max-w-md grid-cols-1 gap-6 sm:max-w-2xl sm:grid-cols-2 lg:max-w-none lg:grid-cols-4 lg:items-stretch">
          {pricing.plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              data-plan-id={plan.id}
              data-plan-cta-mode={plan.ctaMode}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition-[border-color]",
                plan.highlighted
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

              <h3 className={cn("text-lg font-semibold", plan.highlighted ? "text-paper" : "text-ink")}>
                {plan.name}
              </h3>
              <p className={cn("mt-2 min-h-10 text-sm leading-5", plan.highlighted ? "text-paper/70" : "text-muted-foreground")}>
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className={cn("tabular text-4xl font-semibold tracking-tight", plan.highlighted ? "text-paper" : "text-ink")}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={cn("text-sm font-medium", plan.highlighted ? "text-paper/60" : "text-muted-foreground")}>
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn("flex items-start gap-2 text-sm", plan.highlighted ? "text-paper/90" : "text-foreground")}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        plan.highlighted ? "text-[#C9A227]" : "text-[#1A3A6B]"
                      )}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlighted ? "mono" : "monoOutline"}
                className={cn(
                  "mt-8 w-full rounded-full",
                  plan.highlighted && "bg-paper text-ink hover:opacity-90"
                )}
                aria-label={`${plan.cta}：${status.checkoutAvailability.label}`}
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
