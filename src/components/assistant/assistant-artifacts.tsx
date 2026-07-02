"use client";

import { Check, Loader2, X, Target, MessageCircleQuestion, ShieldAlert, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantArtifact, AssistantRunStep } from "@/domains/assistant/types";

/** Visible "plan → gather → draft" reasoning trail for a copilot run. */
export function StepTrail({ steps }: { steps: AssistantRunStep[] }) {
  if (steps.length === 0) return null;

  return (
    <ol
      aria-label="助理處理步驟"
      className="mb-2 w-full space-y-1.5 rounded-xl border border-[#CFD8DC] dark:border-[rgba(144,202,249,0.15)] bg-[#F7FAFF] dark:bg-[#1A3A6B]/20 px-3 py-2.5"
    >
      {steps.map((step) => (
        <li key={step.id} className="flex items-center gap-2 text-xs">
          <span className="shrink-0" aria-hidden="true">
            {step.status === "active" && (
              <Loader2 className="w-3.5 h-3.5 text-[#1565C0] animate-spin motion-reduce:animate-none" strokeWidth={2} />
            )}
            {step.status === "done" && <Check className="w-3.5 h-3.5 text-[#2E7D32]" strokeWidth={2.5} />}
            {step.status === "error" && <X className="w-3.5 h-3.5 text-[#B71C1C]" strokeWidth={2.5} />}
          </span>
          <span
            className={cn(
              "leading-snug",
              step.status === "active"
                ? "text-[#0A2342] dark:text-[#E8F0FE] font-medium"
                : "text-[#546E7A] dark:text-[#90CAF9]",
            )}
          >
            {step.label ?? ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

const PURPOSE_LABEL: Record<string, string> = {
  FIRST_VISIT: "初訪",
  ADD_ON: "加保",
  RENEWAL: "續約",
  CARE: "關懷",
  REFERRAL: "轉介紹",
};

const SPIN_LABEL: Record<string, string> = {
  S: "情境",
  P: "問題",
  I: "暗示",
  N: "需求",
};

// Minimal shape of the generated visit package we render. The full object is the
// same one `/api/ai/visit` returns; we only read the fields shown in the card.
interface VisitPackageData {
  objectives?: { id: string; description: string }[];
  spinQuestions?: { id: string; type: string; question: string }[];
  objections?: { id: string; expectedObjection: string; suggestedResponse: string }[];
  timeline?: { label: string; duration: number }[];
  materials?: { id: string; name: string }[];
  evidenceSummary?: {
    facts?: unknown[];
    inferences?: unknown[];
    unknowns?: { label: string }[];
  };
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h5 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#546E7A] dark:text-[#90CAF9]">
      <span aria-hidden="true" className="text-[#1565C0]">{icon}</span>
      {children}
    </h5>
  );
}

/** Rich card for a generated 訪前規劃 / 拜訪準備包 draft. */
export function VisitPackageCard({ artifact }: { artifact: AssistantArtifact }) {
  const data = artifact.data as VisitPackageData;
  const objectives = data.objectives ?? [];
  const spinQuestions = data.spinQuestions ?? [];
  const objections = data.objections ?? [];
  const timeline = data.timeline ?? [];
  const materials = data.materials ?? [];
  const unknowns = data.evidenceSummary?.unknowns ?? [];

  return (
    <div className="w-full rounded-2xl border border-[#CFD8DC] dark:border-[rgba(144,202,249,0.2)] bg-white dark:bg-[#0F2744] overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[#CFD8DC] dark:border-[rgba(144,202,249,0.15)] bg-[#F7FAFF] dark:bg-[#1A3A6B]/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1565C0]">拜訪準備包 · 草稿</p>
        <p className="text-sm font-bold text-[#0A2342] dark:text-white mt-0.5">
          {artifact.clientName}
          <span className="ml-2 text-[11px] font-semibold text-[#546E7A]">
            {PURPOSE_LABEL[artifact.purpose] ?? artifact.purpose}
          </span>
        </p>
      </div>

      <div className="p-4 space-y-3.5 text-[13px] text-[#0A2342] dark:text-[#E8F0FE]">
        {objectives.length > 0 && (
          <section className="space-y-1.5">
            <SectionHeading icon={<Target className="w-3 h-3" strokeWidth={2} />}>拜訪目標</SectionHeading>
            <ul className="space-y-1">
              {objectives.map((o) => (
                <li key={o.id} className="flex gap-1.5 leading-snug">
                  <span className="text-[#1565C0]">•</span>
                  <span>{o.description}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {spinQuestions.length > 0 && (
          <section className="space-y-1.5">
            <SectionHeading icon={<MessageCircleQuestion className="w-3 h-3" strokeWidth={2} />}>
              SPIN 提問 · {spinQuestions.length} 題
            </SectionHeading>
            <ul className="space-y-1.5">
              {spinQuestions.map((q) => (
                <li key={q.id} className="flex gap-2 leading-snug">
                  <span className="mt-0.5 shrink-0 rounded-md bg-[#EBF3FB] dark:bg-[#1A3A6B]/50 px-1.5 py-0.5 text-[9px] font-bold text-[#1565C0]">
                    {SPIN_LABEL[q.type] ?? q.type}
                  </span>
                  <span>{q.question}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {objections.length > 0 && (
          <section className="space-y-1.5">
            <SectionHeading icon={<ShieldAlert className="w-3 h-3" strokeWidth={2} />}>預期疑問與回應</SectionHeading>
            <ul className="space-y-1.5">
              {objections.map((o) => (
                <li key={o.id} className="leading-snug">
                  <p className="font-semibold">Q：{o.expectedObjection}</p>
                  <p className="text-[#546E7A] dark:text-[#90CAF9]">A：{o.suggestedResponse}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {timeline.length > 0 && (
          <section className="space-y-1.5">
            <SectionHeading icon={<Clock className="w-3 h-3" strokeWidth={2} />}>時間分配</SectionHeading>
            <ul className="flex flex-wrap gap-1.5">
              {timeline.map((t, i) => (
                <li
                  key={`${t.label}-${i}`}
                  className="rounded-full bg-[#F7FAFF] dark:bg-[#1A3A6B]/30 border border-[#CFD8DC] dark:border-[rgba(144,202,249,0.2)] px-2 py-0.5 text-[11px]"
                >
                  {t.label} · {t.duration} 分
                </li>
              ))}
            </ul>
          </section>
        )}

        {materials.length > 0 && (
          <section className="space-y-1.5">
            <SectionHeading icon={<FileText className="w-3 h-3" strokeWidth={2} />}>應帶資料</SectionHeading>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {materials.map((m) => (
                <li key={m.id} className="text-[#546E7A] dark:text-[#90CAF9]">• {m.name}</li>
              ))}
            </ul>
          </section>
        )}

        {unknowns.length > 0 && (
          <section className="rounded-xl bg-[#FFF8E1] dark:bg-[#3E2723]/20 border border-[#F5D67B]/50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8D6E00]">拜訪前待確認</p>
            <ul className="mt-1 space-y-0.5">
              {unknowns.slice(0, 4).map((u, i) => (
                <li key={i} className="text-[12px] text-[#5D4037] dark:text-[#D7CCC8] leading-snug">• {u.label}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
