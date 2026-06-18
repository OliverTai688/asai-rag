"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ClientLoginForm({ initialToken = "" }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("Client session 與 member app session 分離，不能互相升級權限。");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("正在驗證授權連結...");

    const response = await fetch("/api/client-portal/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      setStatus("error");
      setMessage("授權連結無效或已過期，請回到分享頁重新取得連結。");
      return;
    }

    setStatus("ready");
    setMessage("客戶入口已建立，可以查看授權報告與回覆顧問。");
  }

  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle>登入客戶頁</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          目前支援由分享連結 token 建立 client session；正式版可再接 email OTP 或 client user。
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">分享授權 token</span>
            <Input
              id="client-token"
              name="token"
              placeholder="demo-share-wang"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              aria-label="分享授權 token"
              autoComplete="off"
            />
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })}
          >
            {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            進入客戶頁
          </button>
        </form>

        <div
          className="mt-4 rounded-lg border border-hairline bg-paper-2 px-3 py-2 text-xs leading-5 text-muted-foreground"
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </div>

        {status === "ready" ? (
          <a
            href="/api/client-portal/bootstrap"
            className="mt-4 inline-flex text-sm font-semibold text-ink underline-offset-4 hover:underline"
          >
            檢查授權內容
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
