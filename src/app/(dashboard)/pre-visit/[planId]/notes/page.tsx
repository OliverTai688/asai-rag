"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  MessageSquare,
  Save,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useClientStore } from "@/domains/client/store";
import { useVisitStore } from "@/domains/visit/store";
import type { VisitPurpose } from "@/domains/visit/types";

const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PostVisitNotesPage() {
  const params = useParams();
  const router = useRouter();
  const planId = normalizeParam(params.planId);
  const updatePlan = useVisitStore((state) => state.updatePlan);
  const plan = useVisitStore((state) => state.plans.find((p) => p.id === planId));
  const client = useClientStore((state) => state.clients.find((c) => c.id === plan?.clientId));
  const [notes, setNotes] = useState(plan?.postVisitNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  if (!plan || !client) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold text-ink">找不到拜訪筆記</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">請先建立或重新開啟一份拜訪準備包。</p>
        <Button type="button" variant="mono" className="mt-5 rounded-full" onClick={() => router.push("/pre-visit")}>
          回拜訪規劃
        </Button>
      </div>
    );
  }

  const checkedMaterials = plan.materials.filter((material) => material.checked);
  const noteLines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const summaryLine = noteLines[0] ?? "尚未記錄拜訪摘要";
  const nextStepLine =
    noteLines.find((line) => line.includes("下一步") || line.includes("跟進") || line.includes("追蹤")) ??
    "下一步尚未明確";

  const handleSave = () => {
    setIsSaving(true);
    updatePlan(plan.id, { postVisitNotes: notes });
    setIsSaving(false);
    toast.success("拜訪筆記已儲存");
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="mb-4 h-10 rounded-full px-3 text-muted-foreground"
            onClick={() => router.push(`/pre-visit/${plan.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回準備包
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {client.name}・{PURPOSE_LABELS[plan.purpose]}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">拜訪後筆記</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            先收斂摘要與下一步，再補完整觀察。這頁只保存到目前的拜訪規劃，不改報告或 AI 流程。
          </p>
        </div>
        <Button type="button" variant="mono" className="h-10 rounded-full" onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          儲存筆記
        </Button>
      </header>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="border-hairline shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-ink">拜訪摘要</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{summaryLine}</p>
          </CardContent>
        </Card>
        <Card className="border-hairline shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-ink">下一步</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{nextStepLine}</p>
          </CardContent>
        </Card>
      </section>

      <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-hairline shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3 border-b border-hairline pb-4">
              <div>
                <h2 className="text-base font-semibold text-ink">完整紀錄</h2>
                <p className="mt-1 text-sm text-muted-foreground">建議用三段：摘要、客戶反應、下一步跟進。</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{notes.length} 字</span>
            </div>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={`摘要：\n客戶反應：\n下一步跟進：`}
              className="mt-5 min-h-[460px] resize-y rounded-lg border-hairline bg-background text-base leading-7 focus-visible:ring-ring"
              autoFocus
            />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-ink">原拜訪目標</h2>
              </div>
              <div className="mt-4 space-y-3">
                {plan.objectives.length ? (
                  plan.objectives.slice(0, 3).map((objective) => (
                    <p key={objective.id} className="rounded-lg border border-hairline p-3 text-sm leading-6 text-muted-foreground">
                      {objective.description}
                    </p>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">這份準備包尚未生成目標。</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-ink">已使用材料</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {checkedMaterials.length ? (
                  checkedMaterials.map((material) => (
                    <span key={material.id} className="rounded-full border border-hairline px-3 py-1 text-xs font-medium text-muted-foreground">
                      {material.name}
                    </span>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">尚未標記使用材料。</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline bg-muted/20 shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-ink">記錄提示</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>客戶是否確認痛點或需求？</li>
                <li>還缺哪份資料或誰的同意？</li>
                <li>下一次跟進的日期與目的？</li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
