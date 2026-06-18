"use client";

import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscriptionForm } from "@/domains/subscription/hooks/useSubscriptionForm";
import { StepPlanSelection } from "@/components/subscription/steps/StepPlanSelection";
import { StepPaymentDetails } from "@/components/subscription/steps/StepPaymentDetails";
import { StepSuccess } from "@/components/subscription/steps/StepSuccess";

const STEPS = [
  { step: 1, label: "確認方案" },
  { step: 2, label: "付款資訊" },
  { step: 3, label: "完成" },
];

export function PurchaseModal() {
  const {
    isOpen,
    closeModal,
    currentStep,
    selectedPlan,
    nextStep,
    prevStep,
    paymentProvider,
    setPaymentProvider,
    reset,
  } = useSubscriptionForm();

  const handleFinish = () => {
    closeModal();
    reset();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>訂閱方案結帳</DialogTitle>
          <DialogDescription>完成以下步驟即可啟用您的方案。</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-1">
          {STEPS.map((s, index) => {
            const isCompleted = currentStep > s.step;
            const isActive = currentStep === s.step;
            return (
              <div key={s.step} className="flex flex-1 items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      isCompleted && "bg-[#1565C0] text-white",
                      isActive && "bg-[#173762] text-white",
                      !isCompleted && !isActive && "bg-[#EBF3FB] text-[#5F7080] dark:bg-[#1A3A6B]/30 dark:text-[#90CAF9]"
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.step}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs font-medium sm:inline",
                      isActive || isCompleted ? "text-[#0A2342] dark:text-white" : "text-[#5F7080] dark:text-[#90CAF9]"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors",
                      isCompleted ? "bg-[#1565C0]" : "bg-[#EBF3FB] dark:bg-[rgba(144,202,249,0.15)]"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[260px]">
          {currentStep === 1 && <StepPlanSelection selectedPlan={selectedPlan} />}
          {currentStep === 2 && (
            <StepPaymentDetails paymentProvider={paymentProvider} onSelectProvider={setPaymentProvider} />
          )}
          {currentStep === 3 && <StepSuccess selectedPlan={selectedPlan} />}
        </div>

        <DialogFooter>
          {currentStep < 3 ? (
            <>
              <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                上一步
              </Button>
              <Button onClick={nextStep} disabled={!selectedPlan}>
                {currentStep === 1 ? "前往付款" : "確認付款"}
              </Button>
            </>
          ) : (
            <Button className="w-full sm:w-auto" onClick={handleFinish}>
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
