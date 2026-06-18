"use client";

import { Landmark, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentProvider } from "@/domains/subscription/types";

interface StepPaymentDetailsProps {
  paymentProvider: PaymentProvider | null;
  onSelectProvider: (provider: PaymentProvider) => void;
}

export function StepPaymentDetails({ paymentProvider, onSelectProvider }: StepPaymentDetailsProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#546E7A] dark:text-[#90CAF9]">
          付款方式
        </p>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => onSelectProvider("ECPAY")}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors",
              paymentProvider === "ECPAY"
                ? "border-[#1565C0] bg-[#F3F7FB] text-[#0A2342] dark:bg-[#1A3A6B]/40 dark:text-white"
                : "border-[#D8E1EA] text-[#5F7080] hover:bg-[#F7FAFF] dark:border-[rgba(144,202,249,0.2)] dark:text-[#90CAF9]"
            )}
          >
            <span className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              綠界 ECPay 導轉付款
            </span>
            <span className="text-xs text-muted-foreground">第一版指定</span>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-hairline bg-muted/20 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">付款狀態以伺服器確認為準</p>
            <p className="text-xs leading-5 text-muted-foreground">
              按下確認後，正式版本會建立 SubscriptionOrder，導轉至綠界付款頁；方案啟用必須等待綠界 server notification 或 provider query 確認，不會只依前端導回啟用。
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-[#546E7A] dark:text-[#90CAF9]">
        目前為 checkout 流程骨架；尚未送出綠界正式交易。
      </p>
    </div>
  );
}
