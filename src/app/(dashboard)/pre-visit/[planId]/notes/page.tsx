"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  FileText,
  MessageSquare,
  Save,
  ShieldCheck,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { MeetingWorkspace } from "@/components/meeting/meeting-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/domains/client/types";
import { useClientStore } from "@/domains/client/store";
import { VisitService } from "@/domains/visit/service";
import { useVisitStore } from "@/domains/visit/store";
import type { VisitPlan, VisitPurpose } from "@/domains/visit/types";

const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

type QuickCaptureAssignment = "PRIVATE_DRAFT" | "CLIENT" | "VISIT_PLAN" | "FOLLOW_UP_REVIEW";

type QuickCaptureDataClass = "FACT" | "CONFIRMED" | "INFERENCE" | "UNKNOWN" | "INSTRUCTION";

type QuickCaptureResult = QuickCaptureReadyResult | QuickCaptureBlockedResult;

interface QuickCaptureReadyResult {
  status: "READY";
  capture: {
    id: string;
    assignment: QuickCaptureAssignment;
    sourceLabel: string;
    sessionId: string;
    turnId: string;
    clientId: string | null;
    visitPlanId: string | null;
  };
  memoryCandidates: Array<{
    id: string;
    dataClass: QuickCaptureDataClass;
    requiresConfirmation: boolean;
  }>;
  preparationPackageSupplements: Array<{
    id: string;
    label: string;
    dataClass: QuickCaptureDataClass;
    requiresAdvisorConfirmation: boolean;
  }>;
  narratorQuestions: Array<{
    id: string;
    label: string;
    requiresConfirmation: true;
  }>;
  theaterStateProposals: Array<{
    id: string;
    label: string;
    requiresConfirmation: true;
    writesConfirmedCrmFact: false;
  }>;
  safety: {
    clientSensitivity: "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE" | null;
    scopeSource: "server_session";
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    rawAudioStored: false;
    rawPrivateTranscriptStored: false;
    writesConfirmedCrmFact: false;
  };
}

interface QuickCaptureBlockedResult {
  status: "BLOCKED";
  capture: {
    id: string;
    assignment: QuickCaptureAssignment;
    sourceLabel: string;
    clientId: string | null;
    visitPlanId: string | null;
  };
  blockedReason: string;
  safety: QuickCaptureReadyResult["safety"];
}

const CAPTURE_ASSIGNMENTS: Array<{
  value: QuickCaptureAssignment;
  label: string;
  description: string;
}> = [
  {
    value: "PRIVATE_DRAFT",
    label: "保持私人草稿",
    description: "只進顧問自己的記憶，不連客戶或拜訪。",
  },
  {
    value: "CLIENT",
    label: "歸客戶",
    description: "連到目前客戶，之後可進確認卡。",
  },
  {
    value: "VISIT_PLAN",
    label: "歸拜訪",
    description: "補強這份準備包與後續摘要。",
  },
  {
    value: "FOLLOW_UP_REVIEW",
    label: "轉待確認",
    description: "先變成待確認問題與劇場狀態提案。",
  },
];

const DATA_CLASS_LABELS: Record<QuickCaptureDataClass, string> = {
  FACT: "事實",
  CONFIRMED: "已確認",
  INFERENCE: "推論",
  UNKNOWN: "待確認",
  INSTRUCTION: "指示",
};

const SENSITIVITY_LABELS: Record<NonNullable<QuickCaptureReadyResult["safety"]["clientSensitivity"]>, string> = {
  NORMAL: "一般",
  SENSITIVE: "敏感",
  HIGHLY_SENSITIVE: "高敏感",
};

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PostVisitNotesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = normalizeParam(params.planId);
  const updatePlan = useVisitStore((state) => state.updatePlan);
  const plan = useVisitStore((state) => state.plans.find((p) => p.id === planId));
  const client = useClientStore((state) => state.clients.find((c) => c.id === plan?.clientId));
  const isQuickstart = searchParams.get("demo") === "quickstart";
  const initialMeetingSessionId = searchParams.get("sessionId") ?? undefined;
  const [isLoadingPlan, setIsLoadingPlan] = useState(!isQuickstart);
  const [planLoadError, setPlanLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isQuickstart || !planId) return;

    let cancelled = false;
    const targetPlanId = planId;

    async function loadPlan() {
      try {
        setIsLoadingPlan(true);
        setPlanLoadError(null);
        await VisitService.fetchPlanByIdRemote(targetPlanId);
      } catch (error) {
        if (!cancelled) {
          setPlanLoadError(error instanceof Error ? error.message : "VISIT_PLAN_LOAD_FAILED");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlan(false);
        }
      }
    }

    void loadPlan();

    return () => {
      cancelled = true;
    };
  }, [isQuickstart, planId]);

  if (isLoadingPlan) {
    return (
      <div className="p-10 text-center text-sm font-medium text-muted-foreground">
        載入拜訪筆記...
      </div>
    );
  }

  if (!plan || !client) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold text-ink">找不到拜訪筆記</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {planLoadError ? `同步失敗：${planLoadError}` : "請先建立或重新開啟一份拜訪準備包。"}
        </p>
        <Button type="button" variant="mono" className="mt-5 rounded-full" onClick={() => router.push("/pre-visit")}>
          回拜訪規劃
        </Button>
      </div>
    );
  }

  return (
    <PostVisitNotesWorkspace
      key={plan.id}
      client={client}
      initialMeetingSessionId={initialMeetingSessionId}
      isQuickstart={isQuickstart}
      plan={plan}
      updatePlan={updatePlan}
    />
  );
}

function PostVisitNotesWorkspace({
  client,
  initialMeetingSessionId,
  isQuickstart,
  plan,
  updatePlan,
}: {
  client: Client;
  initialMeetingSessionId?: string;
  isQuickstart: boolean;
  plan: VisitPlan;
  updatePlan: (id: string, updates: Partial<VisitPlan>) => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(plan.postVisitNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [captureAssignment, setCaptureAssignment] = useState<QuickCaptureAssignment>("VISIT_PLAN");
  const [captureReason, setCaptureReason] = useState("");
  const [captureRiskAccepted, setCaptureRiskAccepted] = useState(false);
  const [captureResult, setCaptureResult] = useState<QuickCaptureResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const checkedMaterials = plan.materials.filter((material) => material.checked);
  const noteLines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const summaryLine = noteLines[0] ?? "尚未記錄拜訪摘要";
  const nextStepLine =
    noteLines.find((line) => line.includes("下一步") || line.includes("跟進") || line.includes("追蹤")) ??
    "下一步尚未明確";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isQuickstart || plan.id.startsWith("plan-")) {
        updatePlan(plan.id, { postVisitNotes: notes });
      } else {
        await VisitService.updatePlanRemote(plan.id, { postVisitNotes: notes });
      }
      toast.success("拜訪筆記已儲存");
    } catch (error) {
      const message = error instanceof Error ? error.message : "POST_VISIT_NOTES_SAVE_FAILED";
      toast.error("拜訪筆記儲存失敗", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendQuickCapture = async () => {
    const content = notes.trim();

    if (!content) {
      toast.error("請先寫下一段拜訪後筆記");
      return;
    }

    setIsCapturing(true);
    setCaptureResult(null);

    try {
      const payload = {
        content,
        origin: "POST_VISIT_NOTE",
        assignment: captureAssignment,
        modality: "TEXT",
        issueTags: ["post_visit_note", "pim_011c"],
        ...(captureAssignment === "CLIENT" ? { clientId: client.id } : {}),
        ...(captureAssignment === "VISIT_PLAN" || captureAssignment === "FOLLOW_UP_REVIEW"
          ? { visitPlanId: plan.id }
          : {}),
        ...(captureReason.trim() || captureRiskAccepted
          ? {
              approval: {
                reason: captureReason.trim() || undefined,
                riskAccepted: captureRiskAccepted,
              },
            }
          : {}),
      };

      const response = await fetch("/api/ai/interview/quick-captures", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as QuickCaptureResult | { error?: string } | null;

      if (response.status === 409 && body && "status" in body && body.status === "BLOCKED") {
        setCaptureResult(body);
        toast.warning("需要先確認使用邊界");
        return;
      }

      if (!response.ok || !body || !("status" in body)) {
        const message = body && "error" in body && body.error ? body.error : `QUICK_CAPTURE_FAILED_${response.status}`;
        throw new Error(message);
      }

      setCaptureResult(body);
      toast.success("已送進 Park 記憶");
    } catch (error) {
      const message = error instanceof Error ? error.message : "QUICK_CAPTURE_FAILED";
      toast.error("快速捕捉失敗", { description: message });
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="mb-4 h-10 rounded-full px-3 text-muted-foreground"
            onClick={() => router.push(`/pre-visit/${plan.id}${isQuickstart ? "?demo=quickstart" : ""}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回準備包
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {client.name}・{PURPOSE_LABELS[plan.purpose]}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">拜訪後筆記</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            先收斂摘要與下一步，再補完整觀察。需要交給 AI 記憶時，只選歸屬與確認邊界，不輸入 raw ID。
          </p>
        </div>
        <Button
          type="button"
          variant="mono"
          className="h-10 rounded-full"
          onClick={handleSave}
          disabled={isSaving}
          data-testid="post-visit-notes-save"
        >
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
              data-testid="post-visit-notes-textarea"
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
                <Brain className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-ink">送進 Park 記憶</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                從這份筆記建立安全的 memory candidate。系統會用目前工作區推導客戶與拜訪，不需要手填 ID。
              </p>
              <div
                data-testid="post-visit-notes-saved-state"
                className="mt-3 rounded-lg border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground"
              >
                legacy postVisitNotes：{notes.trim() ? "已在此頁編輯，可儲存後刷新讀回" : "尚未填寫"}
              </div>

              <fieldset className="mt-4 space-y-2" aria-label="筆記歸屬">
                {CAPTURE_ASSIGNMENTS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline p-3 text-sm transition-colors hover:bg-paper-2 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper"
                  >
                    <input
                      type="radio"
                      name="quick-capture-assignment"
                      value={option.value}
                      checked={captureAssignment === option.value}
                      onChange={() => setCaptureAssignment(option.value)}
                      className="mt-1 size-3.5 accent-current"
                    />
                    <span>
                      <span className="block font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 opacity-70">{option.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {captureAssignment !== "PRIVATE_DRAFT" ? (
                <div className="mt-4 rounded-lg border border-hairline bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    確認邊界
                  </div>
                  <Textarea
                    value={captureReason}
                    onChange={(event) => setCaptureReason(event.target.value)}
                    placeholder="若內容涉及高敏感資料，寫下本次內部使用理由。"
                    className="mt-3 min-h-[76px] resize-y rounded-lg border-hairline bg-background text-sm leading-6"
                  />
                  <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={captureRiskAccepted}
                      onChange={(event) => setCaptureRiskAccepted(event.target.checked)}
                      className="mt-1 size-3.5 accent-current"
                    />
                    我確認這則筆記只建立內部記憶與待確認交接，不直接寫成 CRM confirmed fact。
                  </label>
                </div>
              ) : null}

              <Button
                type="button"
                variant="mono"
                className="mt-4 h-10 w-full rounded-full"
                onClick={handleSendQuickCapture}
                disabled={isCapturing}
                data-testid="quick-capture-submit"
              >
                {isCapturing ? "送出中..." : "送進 Park 記憶"}
              </Button>

              {captureResult ? <QuickCaptureResultPanel result={captureResult} /> : null}
            </CardContent>
          </Card>

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

      <section
        data-testid="notes-meeting-bridge"
        className="border-t border-hairline pt-6"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="secondary">CLIENT_MEETING</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">AI 會議工作台</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              同一頁保留原本拜訪後筆記，同時接回這份準備包的會議 session、摘要與寫回確認。手動筆記只保存處理後文字，不保存 raw transcript 或 raw provider payload。
            </p>
          </div>
          <Badge variant="outline">不需要手填 session ID</Badge>
        </div>
        <MeetingWorkspace
          planId={plan.id}
          initialSessionId={initialMeetingSessionId}
          initialNoteDraft={notes}
          preferExistingSession
          backHref={`/pre-visit/${plan.id}/notes${isQuickstart ? "?demo=quickstart" : ""}`}
          backLabel="回拜訪後筆記"
        />
      </section>
    </div>
  );
}

function QuickCaptureResultPanel({ result }: { result: QuickCaptureResult }) {
  const safetyLabel = result.safety.clientSensitivity
    ? SENSITIVITY_LABELS[result.safety.clientSensitivity]
    : "未連客戶";

  if (result.status === "BLOCKED") {
    return (
      <div
        className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
        data-testid="quick-capture-blocked"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          需要補確認
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{result.blockedReason}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">scope: {result.safety.scopeSource}</Badge>
          <Badge variant="warning">敏感度：{safetyLabel}</Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-lg border border-hairline bg-paper p-3"
      data-testid="quick-capture-result"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink">
          <CheckCircle2 className="h-3.5 w-3.5" />
          已建立記憶交接
        </div>
        <Badge variant="success">READY</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
        <p>記憶候選：{result.memoryCandidates.length} 筆</p>
        <p>準備包補強：{result.preparationPackageSupplements.length} 筆</p>
        <p>劇場狀態提案：{result.theaterStateProposals.length} 筆</p>
        <p>旁白待確認題：{result.narratorQuestions.length} 題</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {result.memoryCandidates.slice(0, 3).map((memory) => (
          <Badge key={memory.id} variant="outline">
            {DATA_CLASS_LABELS[memory.dataClass]} · {memory.id.slice(0, 8)}
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">scope: {result.safety.scopeSource}</Badge>
        <Badge variant="secondary">provider: none</Badge>
        <Badge variant="secondary">敏感度：{safetyLabel}</Badge>
      </div>
    </div>
  );
}
