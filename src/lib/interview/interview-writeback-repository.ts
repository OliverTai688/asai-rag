import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ClientSensitivity, InteractionEventType } from "@/generated/prisma/enums";
import { buildTheaterRouteBHandoff } from "@/domains/theater/route-b-handoff";
import type { TheaterBuildCharacterSeed, TheaterBuildPacket } from "@/domains/interview/types";
import {
  buildInterviewConfirmationCandidates,
  evaluateInterviewWriteback,
  type InterviewConfirmationCandidate,
  type InterviewDraftWritebackTarget,
  type InterviewWritebackDecision,
} from "@/domains/interview/writeback-boundary";
import { buildInterviewReflection } from "@/domains/interview/reflection-planning";
import type { InterviewMemory, InterviewMemoryImportance, InterviewReflection } from "@/domains/interview/types";
import { canWriteClient } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createRouteBSessionForMember } from "@/lib/theater/route-b-session-bff-repository";
import {
  createVisitPlanForMember,
  updateVisitPlanForMember,
  type UpdateVisitPlanInput,
} from "@/lib/visits/visit-plan-repository";
import {
  getPersistentInterviewSessionSnapshot,
  type InterviewMemoryDto,
  type InterviewReflectionDto,
} from "./interview-persistence-repository";

const DRAFT_WRITEBACK_TARGETS = ["VISIT_PLAN_DRAFT", "THEATER_BUILD_DRAFT"] as const satisfies readonly InterviewDraftWritebackTarget[];

export const interviewWritebackInputSchema = z.object({
  candidateIds: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  approvals: z
    .array(
      z.object({
        candidateId: z.string().trim().min(1).max(80),
        reason: z.string().trim().max(600).optional(),
        riskAccepted: z.boolean().default(false),
      }),
    )
    .max(40)
    .default([]),
  draftTargets: z.array(z.enum(DRAFT_WRITEBACK_TARGETS)).max(2).default([]),
  draftApproval: z
    .object({
      reason: z.string().trim().min(8).max(600),
      riskAccepted: z.literal(true),
    })
    .optional(),
});

export type InterviewWritebackInput = z.infer<typeof interviewWritebackInputSchema>;

export interface InterviewWritebackPreview {
  sessionId: string;
  clientId: string | null;
  reflection: InterviewReflection;
  candidates: InterviewConfirmationCandidate[];
}

export interface InterviewWritebackResult extends InterviewWritebackPreview {
  createdEvents: {
    id: string;
    candidateId: string;
    target: InterviewConfirmationCandidate["target"];
    title: string;
    occurredAt: string;
  }[];
  blocked: {
    candidateId: string;
    reason: string;
  }[];
  skipped: string[];
  createdDrafts: {
    target: InterviewDraftWritebackTarget;
    id: string;
    href: string;
    title: string;
  }[];
  draftBlocked: {
    target: InterviewDraftWritebackTarget;
    reason: string;
  }[];
}

export async function getInterviewWritebackPreview(
  session: AppSession,
  sessionId: string,
): Promise<InterviewWritebackPreview | null> {
  const snapshot = await getPersistentInterviewSessionSnapshot(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const reflection = snapshot.reflections.at(-1)
    ? toDomainReflection(snapshot.reflections.at(-1) as InterviewReflectionDto)
    : buildInterviewReflection({
        organizationId: snapshot.session.organizationId,
        interviewSessionId: snapshot.session.id,
        interviewKind: snapshot.session.interviewKind,
        currentSegmentId: snapshot.session.currentSegmentId,
        memories: snapshot.memories.map(toDomainMemory),
      });
  const candidates = buildInterviewConfirmationCandidates({
    sessionId: snapshot.session.id,
    interviewKind: snapshot.session.interviewKind,
    clientId: snapshot.session.clientId,
    reflection,
  });

  return {
    sessionId: snapshot.session.id,
    clientId: snapshot.session.clientId,
    reflection,
    candidates,
  };
}

export async function saveInterviewWritebackConfirmation(
  session: AppSession,
  sessionId: string,
  input: InterviewWritebackInput,
): Promise<InterviewWritebackResult | null> {
  const preview = await getInterviewWritebackPreview(session, sessionId);

  if (!preview) {
    return null;
  }

  const decisions = evaluateInterviewWriteback({
    sessionId,
    interviewKind: preview.reflection.interviewKind,
    reflection: preview.reflection,
    clientId: preview.clientId,
    selectedCandidateIds: input.candidateIds,
    approvals: input.approvals,
  });

  const createdEvents = await prisma.$transaction(async (tx) => {
    const clientScope = preview.clientId
      ? await tx.client.findFirst({
          where: {
            id: preview.clientId,
            organizationId: session.organization.id,
            status: { not: "ARCHIVED" },
          },
          select: {
            id: true,
            organizationId: true,
            unitId: true,
            ownerId: true,
          },
        })
      : null;

    const result: InterviewWritebackResult["createdEvents"] = [];

    for (const decision of decisions) {
      if (decision.status !== "CREATABLE") continue;
      const candidate = decision.candidate;
      const requiresClient = candidate.target === "CRM_CANDIDATE";

      if (requiresClient && (!clientScope || !canWriteClient(session, clientScope))) {
        continue;
      }

      const event = await tx.interactionEvent.create({
        data: {
          organizationId: session.organization.id,
          unitId: clientScope?.unitId ?? session.membership.primaryUnitId,
          clientId: clientScope?.id ?? preview.clientId,
          actorId: session.user.id,
          type: toInteractionEventType(candidate.target),
          title: toInteractionEventTitle(candidate.target),
          description: candidate.text,
          metadata: toWritebackMetadata(sessionId, preview.reflection, decision),
        },
        select: {
          id: true,
          title: true,
          occurredAt: true,
        },
      });

      if (clientScope) {
        await tx.client.update({
          where: { id: clientScope.id },
          data: { lastInteractionAt: new Date() },
        });
      }

      result.push({
        id: event.id,
        candidateId: candidate.id,
        target: candidate.target,
        title: event.title,
        occurredAt: event.occurredAt.toISOString(),
      });
    }

    return result;
  });
  const draftResult = await createDraftWritebacks(session, preview, input, decisions);

  return {
    ...preview,
    createdEvents,
    blocked: decisions
      .filter((decision) => decision.status === "BLOCKED")
      .map((decision) => ({
        candidateId: decision.candidate.id,
        reason: decision.blockedReason ?? "此候選被寫回邊界阻擋。",
      })),
    skipped: decisions
      .filter((decision) => decision.status === "SKIPPED")
      .map((decision) => decision.candidate.id),
    createdDrafts: draftResult.createdDrafts,
    draftBlocked: draftResult.draftBlocked,
  };
}

async function createDraftWritebacks(
  session: AppSession,
  preview: InterviewWritebackPreview,
  input: InterviewWritebackInput,
  decisions: InterviewWritebackDecision[],
): Promise<Pick<InterviewWritebackResult, "createdDrafts" | "draftBlocked">> {
  const targets = [...new Set(input.draftTargets)];
  const createdDrafts: InterviewWritebackResult["createdDrafts"] = [];
  const draftBlocked: InterviewWritebackResult["draftBlocked"] = [];

  if (targets.length === 0) {
    return { createdDrafts, draftBlocked };
  }

  if (!preview.clientId) {
    return {
      createdDrafts,
      draftBlocked: targets.map((target) => ({
        target,
        reason: "此訪談尚未綁定 CRM 客戶，不能建立客戶拜訪或劇場草稿。",
      })),
    };
  }

  const clientScope = await prisma.client.findFirst({
    where: {
      id: preview.clientId,
      organizationId: session.organization.id,
      status: { not: "ARCHIVED" },
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      unitId: true,
      ownerId: true,
      sensitivity: true,
      isDemo: true,
    },
  });

  if (!clientScope || !canWriteClient(session, clientScope)) {
    return {
      createdDrafts,
      draftBlocked: targets.map((target) => ({
        target,
        reason: "找不到可寫入的客戶，或目前身份無法建立此客戶的草稿。",
      })),
    };
  }

  const selectedMaterials = buildSelectedDraftMaterials(preview, decisions, input.candidateIds);
  if (selectedMaterials.length === 0) {
    return {
      createdDrafts,
      draftBlocked: targets.map((target) => ({
        target,
        reason: "請至少選取一項確認卡素材，再建立準備包或劇場草稿。",
      })),
    };
  }

  const requiresDraftApproval =
    clientScope.sensitivity === ClientSensitivity.HIGHLY_SENSITIVE ||
    selectedMaterials.some((material) => material.sensitivity === "HIGHLY_SENSITIVE");

  if (requiresDraftApproval && !input.draftApproval) {
    return {
      createdDrafts,
      draftBlocked: targets.map((target) => ({
        target,
        reason: "高敏感客戶或素材需要 reason/riskAccepted 才能建立準備包或劇場草稿。",
      })),
    };
  }

  if (targets.includes("VISIT_PLAN_DRAFT")) {
    const visitDraft = await createVisitPlanForMember(session, {
      clientId: clientScope.id,
      purpose: "CARE",
    });

    if (!visitDraft) {
      draftBlocked.push({
        target: "VISIT_PLAN_DRAFT",
        reason: "準備包草稿建立失敗，請確認客戶權限與狀態。",
      });
    } else {
      const updatedVisit = await updateVisitPlanForMember(
        session,
        visitDraft.visitPlan.id,
        buildVisitDraftPatch(preview, clientScope.name, selectedMaterials),
      );

      if (!updatedVisit) {
        draftBlocked.push({
          target: "VISIT_PLAN_DRAFT",
          reason: "準備包草稿已建立但內容寫入失敗。",
        });
      } else {
        createdDrafts.push({
          target: "VISIT_PLAN_DRAFT",
          id: updatedVisit.visitPlan.id,
          href: `/pre-visit/${updatedVisit.visitPlan.id}`,
          title: "拜訪準備包草稿",
        });
      }
    }
  }

  if (targets.includes("THEATER_BUILD_DRAFT")) {
    const theaterPacket = buildTheaterPacketFromDraftMaterials(preview, clientScope.name, selectedMaterials);
    const handoff = buildTheaterRouteBHandoff(theaterPacket, { routeBEnabled: true });
    const theaterSession = await createRouteBSessionForMember(session, {
      handoff,
      clientId: clientScope.id,
      isDemo: clientScope.isDemo,
      sensitivityApproval: input.draftApproval
        ? {
            reason: input.draftApproval.reason,
            riskAccepted: true,
          }
        : undefined,
    });

    if (theaterSession.status === "CREATED") {
      createdDrafts.push({
        target: "THEATER_BUILD_DRAFT",
        id: theaterSession.data.session.id,
        href: `/theater/${theaterSession.data.session.id}`,
        title: "Route B 劇場草稿",
      });
    } else {
      draftBlocked.push({
        target: "THEATER_BUILD_DRAFT",
        reason:
          theaterSession.status === "BLOCKED_SENSITIVE"
            ? theaterSession.message
            : "劇場草稿建立失敗，請確認客戶權限與 Route B handoff 邊界。",
      });
    }
  }

  return { createdDrafts, draftBlocked };
}

type DraftMaterial = {
  candidateId: string;
  kind: InterviewConfirmationCandidate["kind"];
  text: string;
  sensitivity: InterviewConfirmationCandidate["sensitivity"];
  status: "confirmed" | "inference" | "unknown";
  supportingMemoryIds: string[];
};

function buildSelectedDraftMaterials(
  preview: InterviewWritebackPreview,
  decisions: InterviewWritebackDecision[],
  selectedCandidateIds: string[],
): DraftMaterial[] {
  const selected = new Set(selectedCandidateIds);
  const decisionsById = new Map(decisions.map((decision) => [decision.candidate.id, decision]));

  return preview.candidates
    .filter((candidate) => selected.has(candidate.id) && candidate.canSelect)
    .map((candidate) => {
      const decision = decisionsById.get(candidate.id);
      return {
        candidateId: candidate.id,
        kind: candidate.kind,
        text: sanitizeDraftText(candidate.text),
        sensitivity: candidate.sensitivity,
        status: toDraftEvidenceStatus(candidate.kind),
        supportingMemoryIds: decision?.candidate.supportingMemoryIds ?? candidate.supportingMemoryIds,
      };
    })
    .filter((material) => material.text.length > 0);
}

function buildVisitDraftPatch(
  preview: InterviewWritebackPreview,
  clientName: string,
  materials: DraftMaterial[],
): UpdateVisitPlanInput {
  const confirmed = materials.filter((material) => material.status === "confirmed");
  const inferences = materials.filter((material) => material.status === "inference");
  const unknowns = materials.filter((material) => material.status === "unknown");
  const sourceEvidence = materials.slice(0, 12).map((material, index) => ({
    id: `interview-evidence-${index + 1}`,
    source: material.status === "unknown" ? "unknown" as const : "ai_tag" as const,
    status: material.status,
    label: `${confirmationKindLabelForDraft(material.kind)}｜${material.candidateId}`,
    detail: material.text,
  }));

  const firstConfirmed = confirmed[0]?.text ?? `${clientName} 的訪談已有可確認素材，仍需顧問二次確認。`;
  const firstInference = inferences[0]?.text ?? "尚未選取明確推論，現場先確認客戶真正顧慮。";
  const firstUnknown = unknowns[0]?.text ?? "尚未選取未知缺口，現場確認是否有其他決策人或資料待補。";

  return {
    status: "DRAFT",
    purpose: "CARE",
    objectives: [
      {
        id: "interview-draft-objective-1",
        description: `用訪談確認卡整理 ${clientName} 的下一次拜訪主軸。`,
        successCriteria: "顧問確認哪些素材可作為拜訪問題、哪些仍是推論或待補缺口。",
      },
      {
        id: "interview-draft-objective-2",
        description: firstConfirmed,
        successCriteria: "現場讓客戶確認此資訊是否仍成立，避免把訪談記憶直接當最終事實。",
      },
    ],
    spinQuestions: [
      {
        id: "interview-draft-spin-s",
        type: "S",
        question: `目前關於「${firstConfirmed}」哪些部分仍需要更新或補充？`,
        reasoning: {
          summary: "由訪談確認卡的已確認素材轉成情境題，先檢查現況是否仍成立。",
          evidence: sourceEvidence.filter((item) => item.status === "confirmed").slice(0, 6),
          confirmationPrompt: "請顧問只在客戶重新確認後，才把答案更新為 CRM 事實。",
        },
      },
      {
        id: "interview-draft-spin-p",
        type: "P",
        question: `如果「${firstInference}」是真的，現在最困擾決策的是預算、保障缺口，還是家人共識？`,
        reasoning: {
          summary: "由訪談推論轉成問題題，不把推論當事實，而是要求顧問現場驗證。",
          evidence: sourceEvidence.filter((item) => item.status === "inference").slice(0, 6),
          confirmationPrompt: "若客戶否認此推論，請把它降級為已排除假設。",
        },
      },
      {
        id: "interview-draft-spin-i",
        type: "I",
        question: `如果這些待確認資訊沒有補齊，下一次方案討論可能會卡在哪個決策點？`,
        reasoning: {
          summary: "由未知缺口轉成影響題，讓拜訪先釐清風險，而不是急著推方案。",
          evidence: sourceEvidence.filter((item) => item.status === "unknown").slice(0, 6),
          confirmationPrompt: "未知缺口只能作為追問，不可寫成客戶背景。",
        },
      },
      {
        id: "interview-draft-spin-n",
        type: "N",
        question: `若今天只先完成一件事，哪個資料或決策人確認會最有幫助？`,
        reasoning: {
          summary: "將 confirmed / inference / unknown 合併成下一步題，協助顧問把拜訪收斂成可行動承諾。",
          evidence: sourceEvidence,
          confirmationPrompt: "請顧問把客戶親口同意的下一步另行紀錄。",
        },
      },
    ],
    objections: [
      {
        id: "interview-draft-objection-1",
        expectedObjection: firstInference,
        suggestedResponse: "先承認這只是顧問目前理解，再用開放題請客戶修正或補充。",
      },
      {
        id: "interview-draft-objection-2",
        expectedObjection: firstUnknown,
        suggestedResponse: "把未知項變成補件或下次共同討論的議程，不急著補造答案。",
      },
    ],
    materials: [
      {
        id: "interview-draft-material-confirmed",
        name: `已確認素材 ${confirmed.length} 項`,
        checked: confirmed.length > 0,
      },
      {
        id: "interview-draft-material-inference",
        name: `推論待驗證 ${inferences.length} 項`,
        checked: false,
      },
      {
        id: "interview-draft-material-unknown",
        name: `未知待追問 ${unknowns.length} 項`,
        checked: false,
      },
    ],
    postVisitNotes: [
      "由 AI 訪談確認卡建立的拜訪準備包草稿。",
      "不含 raw transcript、raw provider payload、cookie、secret、token 或 payment data。",
      `來源 session：${preview.sessionId}`,
      `supporting memory ids：${unique(materials.flatMap((material) => material.supportingMemoryIds)).slice(0, 12).join(", ")}`,
    ].join("\n"),
    postVisitAnalysis: [
      "Fact / inference / unknown boundary:",
      `- confirmed: ${confirmed.length}`,
      `- inference: ${inferences.length}`,
      `- unknown: ${unknowns.length}`,
      "顧問需在正式拜訪中重新確認，推論不可直接寫成 CRM confirmed fact。",
    ].join("\n"),
  };
}

function buildTheaterPacketFromDraftMaterials(
  preview: InterviewWritebackPreview,
  clientName: string,
  materials: DraftMaterial[],
): TheaterBuildPacket {
  const confirmedFacts = materials.filter((material) => material.status === "confirmed").map((material) => material.text);
  const inferredPersona = materials.filter((material) => material.status === "inference").map((material) => material.text);
  const unknowns = materials.filter((material) => material.status === "unknown").map((material) => material.text);
  const supportingMemoryIds = unique(materials.flatMap((material) => material.supportingMemoryIds));
  const focusCharacter: TheaterBuildCharacterSeed = {
    id: `interview_focus_${stableHash(`${preview.sessionId}:${clientName}`)}`,
    displayName: clientName,
    role: "FOCUS_CLIENT",
    isFocus: true,
    knownFacts: confirmedFacts,
    inferences: inferredPersona,
    unknowns,
    personaHints: inferredPersona.slice(0, 5).map((label, index) => ({
      label,
      confidence: "INFERRED",
      evidenceMemoryIds: supportingMemoryIds.slice(index, index + 1),
    })),
    exemplarLines: [],
  };
  const readiness = confirmedFacts.length > 0 ? "READY" : "NEEDS_MORE_INFO";

  return {
    id: `interview_theater_packet_${stableHash(`${preview.sessionId}:${materials.map((item) => item.candidateId).join(":")}`)}`,
    interviewSessionId: preview.sessionId,
    interviewKind: "THEATER_FIELD_BUILD",
    readiness,
    focusClient: clientName,
    scenario: `依 ${clientName} 的訪談確認卡演練下一次拜訪開場與資料補強。`,
    characters: [focusCharacter],
    relationships: confirmedFacts.filter((text) => /配偶|太太|先生|小孩|家庭|決策|家人/.test(text)).slice(0, 6),
    objections: inferredPersona.slice(0, 6),
    sensitiveNotes: materials
      .filter((material) => material.sensitivity !== "NORMAL")
      .map((material) => material.text)
      .slice(0, 6),
    confirmedFacts,
    inferredPersona,
    unknowns,
    narratorQuestions: unknowns.map((unknown) => `旁白請先補問：${unknown}`),
    supportingMemoryIds,
    routeBCompatibility: {
      npcCount: 1,
      maxNpcCount: 4,
      canStartSimulation: readiness === "READY",
      migrationNote: "由 interview confirmation card deterministic 建立；未呼叫 provider，推論與未知保留為 persona hint / narrator question。",
    },
  };
}

function toDraftEvidenceStatus(kind: InterviewConfirmationCandidate["kind"]): DraftMaterial["status"] {
  if (kind === "CONFIRMED_FACT") return "confirmed";
  if (kind === "INFERENCE") return "inference";
  return "unknown";
}

function confirmationKindLabelForDraft(kind: InterviewConfirmationCandidate["kind"]): string {
  if (kind === "CONFIRMED_FACT") return "已確認";
  if (kind === "INFERENCE") return "推論";
  return "待確認";
}

function sanitizeDraftText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[removed]")
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment)\b/gi, "[removed]")
    .trim();
}

function stableHash(value: string): string {
  let hash = 5381;
  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toInteractionEventType(target: InterviewConfirmationCandidate["target"]): InteractionEventType {
  if (target === "FOLLOW_UP_TASK" || target === "THEATER_NARRATOR_QUESTION") {
    return InteractionEventType.TASK;
  }

  if (target === "CRM_CANDIDATE") {
    return InteractionEventType.VISIT;
  }

  return InteractionEventType.COMPLIANCE;
}

function toInteractionEventTitle(target: InterviewConfirmationCandidate["target"]): string {
  const titles: Record<InterviewConfirmationCandidate["target"], string> = {
    CRM_CANDIDATE: "訪談確認寫回候選",
    INTERVIEW_INSIGHT: "訪談推論洞察",
    FOLLOW_UP_TASK: "訪談待追問事項",
    THEATER_NARRATOR_QUESTION: "劇場旁白補問",
    BLOCKED: "訪談寫回被阻擋",
  };

  return titles[target];
}

function toWritebackMetadata(
  sessionId: string,
  reflection: InterviewReflection,
  decision: InterviewWritebackDecision,
): Prisma.InputJsonValue {
  return {
    source: "interview_confirmation_card",
    sessionId,
    reflectionSegmentId: reflection.segmentId,
    candidateId: decision.candidate.id,
    candidateKind: decision.candidate.kind,
    target: decision.candidate.target,
    sensitivity: decision.candidate.sensitivity,
    supportingMemoryIds: decision.candidate.supportingMemoryIds,
    reason: decision.reason,
    riskAccepted: decision.riskAccepted,
    crmWritebackCandidate: decision.candidate.target === "CRM_CANDIDATE",
    confirmedFactOnly: decision.candidate.kind === "CONFIRMED_FACT",
    inferenceNeverCrmFact: decision.candidate.kind === "INFERENCE",
  };
}

function toDomainMemory(memory: InterviewMemoryDto): InterviewMemory {
  return {
    id: memory.id,
    organizationId: memory.organizationId,
    memberId: memory.memberId,
    unitId: memory.unitId,
    clientId: memory.clientId,
    interviewSessionId: memory.sessionId,
    turnId: memory.turnId,
    interviewKind: memory.interviewKind,
    createdAt: memory.createdAt,
    kind: memory.kind,
    source: memory.source,
    dataClass: memory.dataClass,
    visibilityScope: memory.visibilityScope,
    text: memory.text,
    evidenceText: memory.evidenceText ?? undefined,
    confidence: memory.confidence,
    importance: clampImportance(memory.importance),
    issueTags: memory.issueTags,
    outlineSegmentId: memory.outlineSegmentId ?? undefined,
    pqQuestionIds: memory.pqQuestionIds,
    embeddingStatus: memory.embeddingStatus,
    retentionPolicy: memory.retentionPolicy,
    supersedesMemoryId: memory.supersedesMemoryId ?? undefined,
    supersededByMemoryId: memory.supersededByMemoryId ?? undefined,
  };
}

function toDomainReflection(reflection: InterviewReflectionDto): InterviewReflection {
  return {
    id: reflection.id,
    organizationId: reflection.organizationId,
    interviewSessionId: reflection.sessionId,
    interviewKind: reflection.interviewKind,
    segmentId: reflection.segmentId ?? undefined,
    summary: reflection.summary,
    confirmedFacts: reflection.confirmedFacts,
    inferredPatterns: reflection.inferredPatterns,
    unknowns: reflection.unknowns,
    issueReadinessImpact: reflection.issueReadinessImpact ?? undefined,
    theaterBuildImpact: reflection.theaterBuildImpact ?? undefined,
    recommendedNextFocus: reflection.recommendedNextFocus,
    supportingMemoryIds: reflection.supportingMemoryIds,
  };
}

function clampImportance(value: number): InterviewMemoryImportance {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return Math.round(value) as InterviewMemoryImportance;
}
