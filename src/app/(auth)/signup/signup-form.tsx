"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        setError(response.status === 409 ? "此 Email 已註冊，請直接登入。" : "註冊失敗，請確認資料後再試一次。");
        return;
      }

      const result = await signIn("password", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      window.location.assign(result?.url ?? "/dashboard");
    });
  }

  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle>建立帳號</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          建立個人工作區並可立即處理真實客戶資料；上線環境需先完成法遵、監控與 email provider gate。
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">姓名</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Email</span>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">密碼</span>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={10} autoComplete="new-password" required />
          </label>
          {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">{error}</p> : null}
          <button className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })} disabled={isPending}>
            {isPending ? "建立中..." : "建立帳號"}
            <ArrowRight className="size-4" />
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
