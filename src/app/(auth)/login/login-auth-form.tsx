"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Mail } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LoginMethod = "password" | "code";

export function LoginAuthForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [method, setMethod] = useState<LoginMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function switchMethod(next: LoginMethod) {
    setMethod(next);
    setError(null);
    setMessage(null);
  }

  function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await signIn("password", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.ok) {
        window.location.assign(result.url ?? "/dashboard");
        return;
      }

      setError("帳號或密碼不正確，或此帳號尚未啟用。");
    });
  }

  function requestCode() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/email-code/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setError(response.status === 503 ? "尚未設定寄信服務，無法寄送驗證碼。" : "驗證碼寄送失敗。");
        return;
      }

      setMessage("驗證碼已寄出，請在 10 分鐘內輸入。");
    });
  }

  function handleCodeLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("email-code", {
        email,
        code,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.ok) {
        window.location.assign(result.url ?? "/dashboard");
        return;
      }

      setError("驗證碼不正確或已過期。");
    });
  }

  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle>登入工作台</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          正式客戶資料只在登入後的工作區中處理。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="tablist"
          aria-label="登入方式"
          className="grid grid-cols-2 gap-1 rounded-lg border border-hairline bg-paper-2 p-1"
        >
          <MethodTab
            label="帳號密碼"
            active={method === "password"}
            onClick={() => switchMethod("password")}
          />
          <MethodTab
            label="Email 驗證碼"
            active={method === "code"}
            onClick={() => switchMethod("code")}
          />
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Email</span>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="advisor@example.com"
            autoComplete="username"
            aria-label="Email"
          />
        </label>

        {method === "password" ? (
          <form className="space-y-3" onSubmit={handlePasswordLogin}>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">密碼</span>
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="輸入密碼"
                autoComplete="current-password"
                aria-label="密碼"
              />
            </label>
            <button
              className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })}
              disabled={isPending}
            >
              {isPending ? "登入中…" : "帳號密碼登入"}
              <ArrowRight className="size-4" />
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleCodeLogin}>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">驗證碼</span>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  placeholder="6 位數驗證碼"
                  aria-label="驗證碼"
                />
                <button
                  type="button"
                  className={buttonVariants({ variant: "monoOutline", size: "default", className: "shrink-0" })}
                  onClick={requestCode}
                  disabled={!email || isPending}
                >
                  <Mail className="size-4" />
                  寄送
                </button>
              </div>
            </label>
            <button
              className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })}
              disabled={isPending}
            >
              {isPending ? "登入中…" : "Email 驗證碼登入"}
              <ArrowRight className="size-4" />
            </button>
          </form>
        )}

        {googleEnabled ? (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-hairline" />
              或
              <span className="h-px flex-1 bg-hairline" />
            </div>
            <button
              type="button"
              className={buttonVariants({ variant: "monoOutline", size: "lg", className: "w-full" })}
              disabled={isPending}
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              使用 Google 登入
              <ArrowRight className="size-4" />
            </button>
          </>
        ) : null}

        {message ? (
          <p className="text-xs leading-5 text-muted-foreground">{message}</p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MethodTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md py-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-card text-ink border border-hairline"
          : "text-muted-foreground hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
