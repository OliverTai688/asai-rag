"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function InviteAcceptForm({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/invite/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "邀請驗證失敗，請確認 Email 或聯絡邀請人。");
        return;
      }

      window.location.assign("/login");
    });
  }

  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle>接受邀請</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          請輸入收到邀請的 Email。接受後可用帳號密碼、Google 或 Email 驗證碼登入。
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">受邀 Email</span>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">顯示名稱</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">{error}</p> : null}
          <button className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })} disabled={isPending}>
            {isPending ? "驗證中..." : "接受邀請"}
            <ArrowRight className="size-4" />
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
