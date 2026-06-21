"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PricingSection } from "@/components/subscription/PricingSection";
import { PurchaseModal } from "@/components/subscription/PurchaseModal";
import type { PublicPricingDto, PublicStatusDto } from "@/domains/public/types";
import type { PlanType } from "@/domains/subscription/types";
import { useSubscriptionForm } from "@/domains/subscription/hooks/useSubscriptionForm";

interface PricingPageClientProps {
  pricing: PublicPricingDto;
  status: PublicStatusDto;
}

export function PricingPageClient({ pricing, status }: PricingPageClientProps) {
  const router = useRouter();
  const openModal = useSubscriptionForm((state) => state.openModal);

  function handleSelectPlan(plan: PlanType) {
    if (!status.primaryCta.checkoutActionEnabled) {
      router.push(status.primaryCta.href);
      return;
    }

    openModal(plan);
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-hairline bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3A6B] text-sm font-bold text-white">
              誠
            </div>
            <p className="text-sm font-semibold text-ink">誠問 AI</p>
          </div>
          <Link
            href="/admin"
            className={buttonVariants({ variant: "monoOutline", size: "sm", className: "rounded-full" })}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            管理後台
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <PricingSection pricing={pricing} status={status} onSelectPlan={handleSelectPlan} />

      <PurchaseModal />
    </div>
  );
}
