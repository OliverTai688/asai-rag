"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Mail } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginAuthForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        <CardTitle>登入誠問 AI</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          支援帳號密碼、Google OAuth 與 Email 驗證碼登入。正式客戶資料只在登入後工作區中處理。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={handlePasswordLogin}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Email</span>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">密碼</span>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          <button className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })} disabled={isPending}>
            帳號密碼登入
            <ArrowRight className="size-4" />
          </button>
        </form>

        <button
          type="button"
          className={buttonVariants({ variant: "monoOutline", size: "lg", className: "w-full" })}
          disabled={!googleEnabled || isPending}
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          使用 Google 登入
          <ArrowRight className="size-4" />
        </button>

        <form className="space-y-3 border-t border-hairline pt-4" onSubmit={handleCodeLogin}>
          <div className="flex gap-2">
            <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="6 位數驗證碼" />
            <button
              type="button"
              className={buttonVariants({ variant: "monoOutline", size: "default" })}
              onClick={requestCode}
              disabled={!email || isPending}
            >
              <Mail className="size-4" />
              寄送
            </button>
          </div>
          <button className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })} disabled={isPending}>
            Email 驗證碼登入
            <ArrowRight className="size-4" />
          </button>
        </form>

        {message ? <p className="text-xs leading-5 text-muted-foreground">{message}</p> : null}
        {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
