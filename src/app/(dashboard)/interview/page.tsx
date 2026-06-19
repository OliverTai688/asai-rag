"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { advisorCompanionOutline } from "@/domains/interview/outlines";
import { useInterviewStore } from "@/domains/interview/store";
import { getSegmentProgress } from "@/domains/interview/service";
import { InterviewMicroPlan, InterviewOutputDraft } from "@/domains/interview/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function InterviewPage() {
  const {
    sessions,
    activeSessionId,
    createSession,
    addAnswer,
    addMaterial,
    advanceSegment,
  } = useInterviewStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingOutputs, setIsGeneratingOutputs] = useState(false);
  const [outputDraft, setOutputDraft] = useState<InterviewOutputDraft | null>(null);
  const [microPlan, setMicroPlan] = useState<InterviewMicroPlan | null>(null);
  const [editableOutputJson, setEditableOutputJson] = useState("");
  const [outputError, setOutputError] = useState<string | null>(null);
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const currentSegment = advisorCompanionOutline.segments.find((segment) => segment.id === activeSession?.currentSegmentId)
    ?? advisorCompanionOutline.segments[0];
  const progress = activeSession
    ? getSegmentProgress(advisorCompanionOutline, activeSession, currentSegment.id)
    : null;
  const answeredCount = progress?.answeredCoreQuestionIds.length ?? 0;
  const completionLabel = `${answeredCount}/${currentSegment.coreQuestions.length}`;
  const knownMaterials = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.materials.map((material) => `${material.kind}: ${material.content}`);
  }, [activeSession]);

  function handleStart() {
    if (activeSession) return;
    const session = createSession({ mode: "INDEPENDENT" });
    setMicroPlan(null);
    setOutputDraft(null);
    setEditableOutputJson("");
    setMessages([
      {
        role: "assistant",
        content: `我們先從「${advisorCompanionOutline.segments[0].title}」開始。${advisorCompanionOutline.segments[0].coreQuestions[0].text}`,
      },
    ]);
    addMaterial(session.id, {
      segmentId: advisorCompanionOutline.segments[0].id,
      fieldKey: "client_profile",
      kind: "UNKNOWN",
      content: "尚未鎖定拜訪客戶",
      confidence: "LOW",
      sourceAnswerIds: [],
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!activeSession || !content || isStreaming) return;

    const firstMissingQuestionId = progress?.missingCoreQuestionIds[0]
      ?? currentSegment.coreQuestions[0]?.id
      ?? `${currentSegment.id}-freeform`;

    addAnswer(activeSession.id, {
      segmentId: currentSegment.id,
      questionId: firstMissingQuestionId,
      content,
    });
    addMaterial(activeSession.id, {
      segmentId: currentSegment.id,
      fieldKey: currentSegment.frameworkStep === "SYNTHESIS" ? "conversation_prep_card" : "client_profile",
      kind: currentSegment.order <= 1 ? "FACT" : "INFERENCE",
      content,
      confidence: currentSegment.order <= 1 ? "MEDIUM" : "LOW",
      sourceAnswerIds: [],
    });

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          currentSegmentId: currentSegment.id,
          messages: nextMessages,
          knownMaterials,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("訪談 Agent 暫時無法回應");
      }

      setMicroPlan(parseMicroPlanHeader(response.headers.get("X-Interview-Micro-Plan")));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((state) => [...state, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((state) => {
          const next = [...state];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: assistantContent };
          }
          return next;
        });
      }
    } catch (error) {
      setMessages((state) => [
        ...state,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "訪談 Agent 暫時無法回應",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleAdvance() {
    if (!activeSession) return;
    advanceSegment(activeSession.id);
  }

  async function handleGenerateOutputs() {
    if (!activeSession || isGeneratingOutputs) return;

    setIsGeneratingOutputs(true);
    setOutputError(null);

    try {
      const response = await fetch("/api/ai/interview/outputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          messages,
          materials: knownMaterials,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "準備卡生成失敗");
      }

      const nextOutput = payload as InterviewOutputDraft;
      setOutputDraft(nextOutput);
      setEditableOutputJson(JSON.stringify(nextOutput, null, 2));
    } catch (error) {
      setOutputError(error instanceof Error ? error.message : "準備卡生成失敗");
    } finally {
      setIsGeneratingOutputs(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-hairline pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary">Interview Agent M1</Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              AI 顧問陪談
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              用白話訪談業務員，先把客戶輪廓與對話準備整理出來；此頁只跑獨立模式，不寫回 CRM。
            </p>
          </div>
        </div>
        <Button variant="mono" onClick={handleStart} disabled={Boolean(activeSession)}>
          <Sparkles className="size-4" />
          開始陪談
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-[620px] rounded-lg border border-hairline bg-card">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <div>
              <p className="text-xs font-semibold text-ink-3">目前段落</p>
              <h2 className="text-base font-semibold text-ink">{currentSegment.title}</h2>
            </div>
            <Badge variant={progress?.canAdvance ? "success" : "outline"}>
              核心題 {completionLabel}
            </Badge>
          </div>

          <div className="flex h-[460px] flex-col gap-3 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-sm space-y-3">
                  <MessageSquare className="mx-auto size-8 text-[#1A3A6B]" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-ink">先按「開始陪談」</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    AI 會依訪綱逐段問，不會跳段；業務員答不出來的內容會進待確認清單。
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={message.role === "user" ? "ml-auto max-w-[78%]" : "mr-auto max-w-[82%]"}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "rounded-lg bg-ink px-4 py-3 text-sm leading-6 text-paper"
                        : "rounded-lg border border-hairline bg-paper px-4 py-3 text-sm leading-6 text-ink"
                    }
                  >
                    {message.content || "思考中..."}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-hairline p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={activeSession ? "輸入業務員的回答..." : "請先開始陪談"}
                disabled={!activeSession || isStreaming}
                className="min-h-20 flex-1 resize-none"
              />
              <Button
                type="submit"
                variant="mono"
                className="md:self-end"
                disabled={!activeSession || !draft.trim() || isStreaming}
              >
                <Send className="size-4" />
                送出
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4 text-[#1A3A6B]" />
                訪綱進度
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {advisorCompanionOutline.segments.map((segment) => {
                const active = segment.id === currentSegment.id;
                const done = activeSession
                  ? segment.order < currentSegment.order || (active && Boolean(progress?.canAdvance))
                  : false;
                return (
                  <div
                    key={segment.id}
                    className={
                      active
                        ? "rounded-lg border border-hairline-2 bg-paper-2 p-3"
                        : "rounded-lg border border-hairline bg-paper p-3"
                    }
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        className={done ? "mt-0.5 size-4 text-[#2E7D32]" : "mt-0.5 size-4 text-ink-3"}
                        strokeWidth={1.5}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{segment.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{segment.goal}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="monoOutline"
                className="w-full"
                disabled={!activeSession || !progress?.canAdvance}
                onClick={handleAdvance}
              >
                前往下一段
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>即時素材草稿</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {knownMaterials.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  回答後會先以事實/推論/未知標記素材；正式 AI 總結與可編輯確認卡仍在下一步。
                </p>
              ) : (
                knownMaterials.slice(-6).map((material, index) => (
                  <div key={`${material}-${index}`} className="rounded-lg border border-hairline bg-paper px-3 py-2 text-xs leading-5 text-muted-foreground">
                    {material}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>客戶輪廓與準備卡</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                由 AI 依目前素材收斂成可編輯草稿；推論與未知資訊會保留在草稿中，不會寫回 CRM。
              </p>
              <Button
                variant="mono"
                className="w-full"
                onClick={handleGenerateOutputs}
                disabled={!activeSession || knownMaterials.length === 0 || isGeneratingOutputs}
              >
                {isGeneratingOutputs ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                生成準備卡
              </Button>
              {outputError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
                  {outputError}
                </div>
              ) : null}
              {outputDraft ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">目前判讀</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {outputDraft.issueReadiness.map((issue) => `${issue.label} L${issue.level}`).join("、") || "尚無明確議題"}
                    </p>
                    {outputDraft.memoryEvidence?.supportingMemoryIds.length ? (
                      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                        Evidence：{outputDraft.memoryEvidence.supportingMemoryIds.join("、")}
                      </p>
                    ) : null}
                  </div>
                  <Textarea
                    value={editableOutputJson}
                    onChange={(event) => setEditableOutputJson(event.target.value)}
                    className="min-h-80 resize-y font-mono text-xs leading-5"
                    aria-label="可編輯的客戶輪廓與對話準備卡 JSON 草稿"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>下一題計畫</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {microPlan ? (
                <>
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">AI 準備追問</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{microPlan.nextQuestion}</p>
                  </div>
                  <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                    <p className="text-xs font-semibold text-ink">為什麼問這題</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{microPlan.whyThisQuestion}</p>
                  </div>
                  {microPlan.supportingMemoryIds?.length ? (
                    <div className="rounded-lg border border-hairline bg-paper px-3 py-2">
                      <p className="text-xs font-semibold text-ink">Supporting memory IDs</p>
                      <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
                        {microPlan.supportingMemoryIds.join("、")}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  送出回答後會顯示 AI 的下一題計畫與引用的訪談記憶，方便確認它沒有重問已確認事實。
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function parseMicroPlanHeader(value: string | null): InterviewMicroPlan | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<InterviewMicroPlan>;
    if (!parsed.nextQuestion || !parsed.whyThisQuestion || !parsed.outlineSegmentId) return null;

    return {
      objective: parsed.objective ?? "",
      nextQuestion: parsed.nextQuestion,
      whyThisQuestion: parsed.whyThisQuestion,
      outlineSegmentId: parsed.outlineSegmentId,
      issueTags: parsed.issueTags ?? [],
      expectedEvidenceType: parsed.expectedEvidenceType ?? "FACT",
      avoid: parsed.avoid ?? [],
      supportingMemoryIds: parsed.supportingMemoryIds ?? [],
    };
  } catch {
    return null;
  }
}
