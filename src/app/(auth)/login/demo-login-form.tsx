"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type DemoAccount = {
  email: string;
  label: string;
  password: string;
  role: string;
};

export function DemoLoginForm({
  accounts,
  demoLoginEnabled,
}: {
  accounts: DemoAccount[];
  demoLoginEnabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!demoLoginEnabled || accounts.length === 0) {
    return null;
  }

  function login(account: DemoAccount) {
    setError(null);
    setPendingEmail(account.email);

    startTransition(async () => {
      const result = await signIn("demo-credentials", {
        email: account.email,
        password: account.password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.ok) {
        window.location.assign(result.url ?? "/dashboard");
        return;
      }

      setPendingEmail(null);
      setError("體驗帳號登入失敗，請確認 demo 資料已 seed。");
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-hairline bg-paper-2 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#1A3A6B]/20 bg-[#1A3A6B]/5 px-2.5 py-0.5 text-[11px] font-semibold text-[#1A3A6B]">
          <Sparkles className="size-3" />
          開發體驗
        </span>
        <p className="text-xs text-muted-foreground">點任一帳號即可一鍵登入</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {accounts.map((account) => {
          const isLoading = pendingEmail === account.email;

          return (
            <button
              key={account.email}
              type="button"
              onClick={() => login(account)}
              disabled={pendingEmail !== null}
              aria-label={`一鍵登入${account.label}`}
              className={cn(
                "flex flex-col gap-0.5 rounded-lg border border-hairline bg-paper px-3 py-2.5 text-left transition-colors",
                "hover:border-[#1A3A6B] disabled:opacity-60",
                isLoading && "border-[#1A3A6B] bg-[#1A3A6B]/5"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{account.label}</span>
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin text-[#1A3A6B]" />
                ) : null}
              </span>
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {account.email}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
