"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const defaultAccount = accounts[0];
  const [email, setEmail] = useState(defaultAccount?.email ?? "");
  const [password, setPassword] = useState(defaultAccount?.password ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectAccount(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("demo-credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.ok) {
        window.location.assign(result.url ?? "/dashboard");
        return;
      }

      setError("帳號或密碼不符合 demo 白名單，請改用下方體驗帳號。");
    });
  }

  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle>登入誠問 AI</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {demoLoginEnabled
            ? "開發體驗登入已開啟，可直接使用下方三組 demo-only 帳密。"
            : "正式 auth provider 尚未接入；目前環境未開啟 demo password login。"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {demoLoginEnabled ? (
          <div className="grid gap-2">
            {accounts.map((account) => {
              const isSelected = email === account.email;

              return (
                <button
                  key={account.email}
                  type="button"
                  className={cn(
                    "rounded-lg border border-hairline bg-paper px-3 py-2 text-left transition-colors hover:border-[#1A3A6B]",
                    isSelected && "border-[#1A3A6B] bg-[#1A3A6B]/5"
                  )}
                  onClick={() => selectAccount(account)}
                  aria-label={`使用${account.label}帳號`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{account.label}</span>
                    {isSelected ? <CheckCircle2 className="size-4 text-[#1A3A6B]" /> : null}
                  </span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">
                    {account.email}
                  </span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">
                    {account.password}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Email</span>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="advisor@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              aria-label="Email"
              disabled={!demoLoginEnabled || isPending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">密碼</span>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="輸入密碼"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              aria-label="密碼"
              disabled={!demoLoginEnabled || isPending}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })}
            disabled={!demoLoginEnabled || isPending}
          >
            {isPending ? "登入中..." : "登入工作台"}
            <ArrowRight className="size-4" />
          </button>
        </form>

        <div className="rounded-lg border border-hairline bg-paper-2 px-3 py-2 text-xs leading-5 text-muted-foreground">
          客戶體驗不使用 app session；請走客戶登入並使用 share token{" "}
          <span className="font-mono text-ink">demo-share-wang</span>。
        </div>
      </CardContent>
    </Card>
  );
}
