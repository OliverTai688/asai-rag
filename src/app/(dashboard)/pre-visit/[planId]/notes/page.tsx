"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  NotebookPen,
} from "lucide-react";
import { toast } from "sonner";

import {
  MeetingWorkspace,
  type MeetingRouteBFeedbackAdvisorContextDto,
  type MeetingRouteBRedLineContextDto,
  type MeetingRouteBStateProposalContextDto,
} from "@/components/meeting/meeting-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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

interface MeetingQuickNoteResult {
  status: "READY";
  appended: {
    sessionId: string;
    turnId: string;
    sourceLabel: "visit_meeting_quick_note";
    reusedExistingSession: boolean;
  };
  snapshot: {
    turns: Array<{ id: string }>;
    memoryRail: {
      total: number;
    };
  };
  safety: {
    scopeSource: "server_session";
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    rawAudioStored: false;
    rawProviderPayloadStored: false;
    rawPrivateTranscriptSidecarStored: false;
    rawPrivateTranscriptStored: false;
    writesConfirmedCrmFact: false;
    routeOwnedVisitPlanScope: true;
    browserSuppliedSessionId: false;
  };
  writebackBridge: {
    sourceActionId: "visit-meeting-quick-note-writeback-bridge";
    status: "summary_required";
    acceptedWorkspaceHref: string;
    targetSurface: "/pre-visit/[planId]/meeting";
    summaryEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/summary";
    writebackEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/writebacks";
    requirements: {
      persistedSummaryRequired: true;
      advisorConfirmationRequired: true;
      reasonRiskAcceptedForSensitive: true;
    };
    safety: {
      providerCallAttempted: false;
      aiUsageLogRequired: false;
      browserSuppliedSessionId: false;
      rawPrivateTranscriptStored: false;
      storesRawProviderPayload: false;
      writesConfirmedCrmFact: false;
      directCrmWriteDisabled: true;
    };
  };
}

type VisitRouteBRedLineContextResponse = MeetingRouteBRedLineContextDto & {
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
};

type VisitRouteBStateProposalContextResponse = MeetingRouteBStateProposalContextDto & {
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
};

type VisitRouteBFeedbackAdvisorContextResponse = MeetingRouteBFeedbackAdvisorContextDto & {
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
};

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

function isVisitRouteBRedLineContextResponse(
  value: VisitRouteBRedLineContextResponse | { error?: string } | null,
): value is VisitRouteBRedLineContextResponse {
  return value !== null && typeof value === "object" && "status" in value && "summary" in value && "proof" in value;
}

function isVisitRouteBStateProposalContextResponse(
  value: VisitRouteBStateProposalContextResponse | { error?: string } | null,
): value is VisitRouteBStateProposalContextResponse {
  return value !== null && typeof value === "object" && "status" in value && "summary" in value && "proof" in value;
}

function isVisitRouteBFeedbackAdvisorContextResponse(
  value: VisitRouteBFeedbackAdvisorContextResponse | { error?: string } | null,
): value is VisitRouteBFeedbackAdvisorContextResponse {
  return value !== null && typeof value === "object" && "status" in value && "summary" in value && "proof" in value;
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
  const [meetingSessionId, setMeetingSessionId] = useState(initialMeetingSessionId);
  const [meetingBridgeVersion, setMeetingBridgeVersion] = useState(0);
  const [meetingQuickNoteResult, setMeetingQuickNoteResult] = useState<MeetingQuickNoteResult | null>(null);
  const [isSendingMeetingQuickNote, setIsSendingMeetingQuickNote] = useState(false);
  const [routeBRedLineContext, setRouteBRedLineContext] = useState<MeetingRouteBRedLineContextDto | null>(null);
  const [routeBRedLineContextError, setRouteBRedLineContextError] = useState<string | null>(null);
  const [isRouteBRedLineContextLoading, setIsRouteBRedLineContextLoading] = useState(false);
  const [routeBStateProposalContext, setRouteBStateProposalContext] = useState<MeetingRouteBStateProposalContextDto | null>(null);
  const [routeBStateProposalContextError, setRouteBStateProposalContextError] = useState<string | null>(null);
  const [isRouteBStateProposalContextLoading, setIsRouteBStateProposalContextLoading] = useState(false);
  const [routeBFeedbackAdvisorContext, setRouteBFeedbackAdvisorContext] =
    useState<MeetingRouteBFeedbackAdvisorContextDto | null>(null);
  const [routeBFeedbackAdvisorContextError, setRouteBFeedbackAdvisorContextError] = useState<string | null>(null);
  const [isRouteBFeedbackAdvisorContextLoading, setIsRouteBFeedbackAdvisorContextLoading] = useState(false);
  const checkedMaterials = plan.materials.filter((material) => material.checked);
  const noteLines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const summaryLine = noteLines[0] ?? "尚未記錄拜訪摘要";
  const nextStepLine =
    noteLines.find((line) => line.includes("下一步") || line.includes("跟進") || line.includes("追蹤")) ??
    "下一步尚未明確";
  const shouldLoadRouteBRedLineContext = !isQuickstart && !plan.id.startsWith("plan-");
  const shouldLoadRouteBStateProposalContext = shouldLoadRouteBRedLineContext;
  const shouldLoadRouteBFeedbackAdvisorContext = shouldLoadRouteBRedLineContext;

  useEffect(() => {
    if (!shouldLoadRouteBRedLineContext) return;

    let cancelled = false;

    async function loadRouteBRedLineContext() {
      setIsRouteBRedLineContextLoading(true);
      setRouteBRedLineContextError(null);

      try {
        const response = await fetch(`/api/visits/${encodeURIComponent(plan.id)}/route-b-red-line-context`, {
          method: "GET",
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as VisitRouteBRedLineContextResponse | { error?: string } | null;

        if (!response.ok || !isVisitRouteBRedLineContextResponse(body)) {
          const message = body && "error" in body && body.error ? body.error : `ROUTE_B_RED_LINE_CONTEXT_FAILED_${response.status}`;
          throw new Error(message);
        }

        if (cancelled) return;

        setRouteBRedLineContext({
          status: body.status,
          routeBRedLineContext: body.routeBRedLineContext,
          summary: body.summary,
          proof: body.proof,
        });
      } catch (error) {
        if (cancelled) return;
        setRouteBRedLineContext(null);
        setRouteBRedLineContextError(error instanceof Error ? error.message : "ROUTE_B_RED_LINE_CONTEXT_FAILED");
      } finally {
        if (!cancelled) {
          setIsRouteBRedLineContextLoading(false);
        }
      }
    }

    void loadRouteBRedLineContext();

    return () => {
      cancelled = true;
    };
  }, [plan.id, shouldLoadRouteBRedLineContext]);

  useEffect(() => {
    if (!shouldLoadRouteBFeedbackAdvisorContext) return;

    let cancelled = false;

    async function loadRouteBFeedbackAdvisorContext() {
      setIsRouteBFeedbackAdvisorContextLoading(true);
      setRouteBFeedbackAdvisorContextError(null);

      try {
        const response = await fetch(`/api/visits/${encodeURIComponent(plan.id)}/route-b-feedback-advisor-context`, {
          method: "GET",
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | VisitRouteBFeedbackAdvisorContextResponse
          | { error?: string }
          | null;

        if (!response.ok || !isVisitRouteBFeedbackAdvisorContextResponse(body)) {
          const message =
            body && "error" in body && body.error
              ? body.error
              : `ROUTE_B_FEEDBACK_ADVISOR_CONTEXT_FAILED_${response.status}`;
          throw new Error(message);
        }

        if (cancelled) return;

        setRouteBFeedbackAdvisorContext({
          status: body.status,
          routeBFeedbackAdvisorContext: body.routeBFeedbackAdvisorContext,
          summary: body.summary,
          proof: body.proof,
        });
      } catch (error) {
        if (cancelled) return;
        setRouteBFeedbackAdvisorContext(null);
        setRouteBFeedbackAdvisorContextError(
          error instanceof Error ? error.message : "ROUTE_B_FEEDBACK_ADVISOR_CONTEXT_FAILED",
        );
      } finally {
        if (!cancelled) {
          setIsRouteBFeedbackAdvisorContextLoading(false);
        }
      }
    }

    void loadRouteBFeedbackAdvisorContext();

    return () => {
      cancelled = true;
    };
  }, [plan.id, shouldLoadRouteBFeedbackAdvisorContext]);

  useEffect(() => {
    if (!shouldLoadRouteBStateProposalContext) return;

    let cancelled = false;

    async function loadRouteBStateProposalContext() {
      setIsRouteBStateProposalContextLoading(true);
      setRouteBStateProposalContextError(null);

      try {
        const response = await fetch(`/api/visits/${encodeURIComponent(plan.id)}/route-b-state-proposal-context`, {
          method: "GET",
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as VisitRouteBStateProposalContextResponse | { error?: string } | null;

        if (!response.ok || !isVisitRouteBStateProposalContextResponse(body)) {
          const message =
            body && "error" in body && body.error
              ? body.error
              : `ROUTE_B_STATE_PROPOSAL_CONTEXT_FAILED_${response.status}`;
          throw new Error(message);
        }

        if (cancelled) return;

        setRouteBStateProposalContext({
          status: body.status,
          routeBStateProposalContext: body.routeBStateProposalContext,
          summary: body.summary,
          proof: body.proof,
        });
      } catch (error) {
        if (cancelled) return;
        setRouteBStateProposalContext(null);
        setRouteBStateProposalContextError(
          error instanceof Error ? error.message : "ROUTE_B_STATE_PROPOSAL_CONTEXT_FAILED",
        );
      } finally {
        if (!cancelled) {
          setIsRouteBStateProposalContextLoading(false);
        }
      }
    }

    void loadRouteBStateProposalContext();

    return () => {
      cancelled = true;
    };
  }, [plan.id, shouldLoadRouteBStateProposalContext]);

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

  const handleSendMeetingQuickNote = async () => {
    const content = notes.trim();

    if (!content) {
      toast.error("請先寫下一段拜訪後筆記");
      return;
    }

    if (isQuickstart || plan.id.startsWith("plan-")) {
      toast.error("正式準備包才能同步到 AI 會議");
      return;
    }

    setIsSendingMeetingQuickNote(true);
    setMeetingQuickNoteResult(null);

    try {
      const response = await fetch(`/api/visits/${encodeURIComponent(plan.id)}/meeting-quick-notes`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          content,
          occurredAt: new Date().toISOString(),
        }),
      });
      const body = (await response.json().catch(() => null)) as MeetingQuickNoteResult | { error?: string } | null;

      if (!response.ok || !body || !("status" in body) || body.status !== "READY") {
        const message = body && "error" in body && body.error ? body.error : `MEETING_QUICK_NOTE_FAILED_${response.status}`;
        throw new Error(message);
      }

      setMeetingSessionId(body.appended.sessionId);
      setMeetingBridgeVersion((version) => version + 1);
      setMeetingQuickNoteResult(body);
      toast.success("已同步到 AI 會議工作台");
    } catch (error) {
      const message = error instanceof Error ? error.message : "MEETING_QUICK_NOTE_FAILED";
      toast.error("同步到 AI 會議失敗", { description: message });
    } finally {
      setIsSendingMeetingQuickNote(false);
    }
  };

  const canSyncMeeting = !isSendingMeetingQuickNote && !isQuickstart && !plan.id.startsWith("plan-") && Boolean(notes.trim());

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-5 sm:px-6">
      {/* Notion-style slim toolbar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md py-1 pr-2 text-sm text-muted-foreground transition-colors hover:text-ink"
          onClick={() => router.push(`/pre-visit/${plan.id}${isQuickstart ? "?demo=quickstart" : ""}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="tabular-nums">{client.name}</span>
          <span className="text-hairline-2">/</span>
          <span>{PURPOSE_LABELS[plan.purpose]}</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground hover:text-ink"
          onClick={handleSave}
          disabled={isSaving}
          data-testid="post-visit-notes-save"
        >
          <Check className="h-4 w-4" />
          {isSaving ? "儲存中" : "儲存"}
        </Button>
      </div>

      {/* Document */}
      <div>
        <h1 className="text-[2rem] font-semibold tracking-tight text-ink">拜訪後筆記</h1>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex gap-4">
            <dt className="w-12 shrink-0 text-muted-foreground">摘要</dt>
            <dd className="truncate text-ink/80">{summaryLine}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-12 shrink-0 text-muted-foreground">下一步</dt>
            <dd className="truncate text-ink/80">{nextStepLine}</dd>
          </div>
        </dl>

        <Textarea
          data-testid="post-visit-notes-textarea"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={`摘要：\n客戶反應：\n下一步跟進：`}
          className="mt-6 min-h-[420px] resize-none rounded-none border-0 bg-transparent px-0 py-0 text-base leading-8 shadow-none focus-visible:ring-0"
          autoFocus
        />

        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
          <span className="text-xs tabular-nums text-muted-foreground">{notes.length} 字</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            onClick={handleSendMeetingQuickNote}
            disabled={!canSyncMeeting}
            data-testid="post-visit-notes-send-meeting"
          >
            <NotebookPen className="h-3.5 w-3.5" />
            {isSendingMeetingQuickNote ? "同步中" : "同步到 AI 會議"}
          </button>
        </div>

        {meetingQuickNoteResult ? (
          <div
            data-testid="post-visit-meeting-quick-note-result"
            className="mt-4 rounded-xl border border-hairline bg-paper p-4 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium text-ink">
                <CheckCircle2 className="h-4 w-4" />
                已同步到 AI 會議
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <span>{meetingQuickNoteResult.appended.reusedExistingSession ? "重用會議" : "建立會議"}</span>
                <span className="text-hairline-2">·</span>
                <span className="tabular-nums">{meetingQuickNoteResult.snapshot.turns.length} 段</span>
                <span className="text-hairline-2">·</span>
                <span className="tabular-nums">{meetingQuickNoteResult.snapshot.memoryRail.total} 記憶</span>
              </div>
            </div>
            <div
              data-testid="post-visit-meeting-writeback-bridge"
              className="mt-3 flex items-center justify-between gap-3 border-t border-hairline pt-3"
            >
              <p className="text-xs leading-5 text-muted-foreground">
                先生成可引用摘要，再從 writeback 卡片選 CRM 候選、洞察或追蹤任務。
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-lg"
                onClick={() => router.push(meetingQuickNoteResult.writebackBridge.acceptedWorkspaceHref)}
              >
                前往工作台
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Memory transfer — kept visible & minimal */}
      <section aria-label="送進 Park 記憶" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">送進 Park 記憶</h2>
          <span data-testid="post-visit-notes-saved-state" className="text-xs text-muted-foreground">
            {notes.trim() ? "草稿已編輯" : "尚未填寫"}
          </span>
        </div>

        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="筆記歸屬">
          {CAPTURE_ASSIGNMENTS.map((option) => (
            <label
              key={option.value}
              title={option.description}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-hairline px-3 py-2 text-center text-sm transition-colors hover:bg-paper-2",
                "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper",
              )}
            >
              <input
                type="radio"
                name="quick-capture-assignment"
                value={option.value}
                checked={captureAssignment === option.value}
                onChange={() => setCaptureAssignment(option.value)}
                className="size-3.5 shrink-0 accent-current"
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        {captureAssignment !== "PRIVATE_DRAFT" ? (
          <div className="space-y-2">
            <Textarea
              value={captureReason}
              onChange={(event) => setCaptureReason(event.target.value)}
              placeholder="若內容涉及高敏感資料，寫下本次內部使用理由。"
              className="min-h-[64px] resize-y rounded-lg border-hairline bg-background text-sm leading-6"
            />
            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <input
                type="checkbox"
                checked={captureRiskAccepted}
                onChange={(event) => setCaptureRiskAccepted(event.target.checked)}
                className="mt-0.5 size-3.5 accent-ink"
              />
              我確認這則筆記只建立內部記憶與待確認交接，不直接寫成 CRM confirmed fact。
            </label>
          </div>
        ) : null}

        <Button
          type="button"
          variant="mono"
          className="h-10 w-full rounded-lg"
          onClick={handleSendQuickCapture}
          disabled={isCapturing}
          data-testid="quick-capture-submit"
        >
          {isCapturing ? "送出中..." : "送進 Park 記憶"}
        </Button>

        {captureResult ? <QuickCaptureResultPanel result={captureResult} /> : null}
      </section>

      {/* Background — collapsed by default to keep first screen clean */}
      <details className="group border-t border-hairline pt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          拜訪背景與提示
        </summary>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">原拜訪目標</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-ink/80">
              {plan.objectives.length ? (
                plan.objectives.slice(0, 3).map((objective) => <li key={objective.id}>· {objective.description}</li>)
              ) : (
                <li className="text-muted-foreground">尚未生成目標</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">已使用材料</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {checkedMaterials.length ? (
                checkedMaterials.map((material) => (
                  <span key={material.id} className="rounded-full border border-hairline px-2.5 py-0.5 text-xs text-muted-foreground">
                    {material.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">尚未標記使用材料</span>
              )}
            </div>
          </div>
          <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground sm:col-span-2">
            <li>· 客戶是否確認痛點或需求？</li>
            <li>· 還缺哪份資料或誰的同意？</li>
            <li>· 下一次跟進的日期與目的？</li>
          </ul>
        </div>
      </details>

      <section data-testid="notes-meeting-bridge" className="border-t border-hairline pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">CLIENT_MEETING</Badge>
            <h2 className="text-lg font-semibold tracking-tight text-ink">AI 會議工作台</h2>
          </div>
          <Badge variant="outline">不需手填 session ID</Badge>
        </div>
        <MeetingWorkspace
          key={`${plan.id}:${meetingSessionId ?? "auto"}:${meetingBridgeVersion}`}
          planId={plan.id}
          initialSessionId={meetingSessionId}
          initialNoteDraft={notes}
          preferExistingSession
          routeBRedLineContext={shouldLoadRouteBRedLineContext ? routeBRedLineContext : null}
          routeBRedLineContextError={shouldLoadRouteBRedLineContext ? routeBRedLineContextError : null}
          routeBRedLineContextLoading={shouldLoadRouteBRedLineContext && isRouteBRedLineContextLoading}
          routeBFeedbackAdvisorContext={
            shouldLoadRouteBFeedbackAdvisorContext ? routeBFeedbackAdvisorContext : null
          }
          routeBFeedbackAdvisorContextError={
            shouldLoadRouteBFeedbackAdvisorContext ? routeBFeedbackAdvisorContextError : null
          }
          routeBFeedbackAdvisorContextLoading={
            shouldLoadRouteBFeedbackAdvisorContext && isRouteBFeedbackAdvisorContextLoading
          }
          routeBStateProposalContext={shouldLoadRouteBStateProposalContext ? routeBStateProposalContext : null}
          routeBStateProposalContextError={shouldLoadRouteBStateProposalContext ? routeBStateProposalContextError : null}
          routeBStateProposalContextLoading={
            shouldLoadRouteBStateProposalContext && isRouteBStateProposalContextLoading
          }
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
