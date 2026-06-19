"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PricingSection } from "@/components/subscription/PricingSection";
import { PurchaseModal } from "@/components/subscription/PurchaseModal";
import { useSubscriptionForm } from "@/domains/subscription/hooks/useSubscriptionForm";

export default function PricingPage() {
  const openModal = useSubscriptionForm((state) => state.openModal);

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

      <PricingSection onSelectPlan={(plan) => openModal(plan)} />

      <PurchaseModal />
    </div>
  );
}
