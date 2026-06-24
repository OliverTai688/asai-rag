import type { TheaterRouteBStatePatch } from "../theater/route-b-handoff";
import type { VisitQuestionEvidence } from "./types";

export type VisitRouteBStateProposalContextStatus = "READY" | "NO_ROUTE_B_SESSION" | "NO_STATE_PROPOSALS";

export type VisitRouteBStateProposalCardType = "evidence_needed" | "next_question";

export interface VisitRouteBStateProposalContextCharacterRef {
  routeBCharacterId: string;
  displayName: string;
}

export interface VisitRouteBStateProposalPatchSource {
  origin: "scene_state" | "turn_state";
  patch: unknown;
}

export interface VisitRouteBStateProposalContextItem {
  id: string;
  source: "theater_route_b_state_proposal";
  status: "inference" | "unknown";
  cardType: VisitRouteBStateProposalCardType;
  targetLabel: string;
  label: string;
  detail: string;
  followUpQuestion: string;
  evidenceNeeded: boolean;
  requiresConfirmation: true;
  writesConfirmedCrmFact: false;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
}

export interface VisitRouteBStateProposalContext {
  agentId: "asai.visit.preparation_package";
  actionId: "route-b-state-proposal-downstream-advisor-context";
  registryReadiness: "internal-only";
  sourceAgentId: "asai.theater.route_b";
  sourceActionId: "route-b-state-proposal-persistence";
  items: VisitRouteBStateProposalContextItem[];
  summary: {
    itemCount: number;
    unknownCount: number;
    inferenceCount: number;
    evidenceNeededCount: number;
    nextQuestionCount: number;
    sceneProposalCount: number;
    turnProposalCount: number;
    privateScopeCount: number;
    narratorQueueCount: number;
    relationshipStateCount: number;
  };
  outputContract: {
    factsInferencesUnknownsSeparated: true;
    advisorContextOnly: true;
    requiresAdvisorConfirmation: true;
    doesNotOverwriteVisitFacts: true;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesConfirmedCrmFact: false;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    storesRawProviderPayload: false;
  };
  privacyProof: {
    rawPrivateTranscriptReturned: false;
    rawProviderPayloadReturned: false;
    rawTheaterSessionIdReturned: false;
    rawPersonIdReturned: false;
    personalContactReturned: false;
    policyNumberReturned: false;
  };
}

interface NormalizedStateProposal {
  patch: TheaterRouteBStatePatch;
  origins: Set<VisitRouteBStateProposalPatchSource["origin"]>;
}

export function buildVisitRouteBStateProposalContext(input: {
  patchSources: VisitRouteBStateProposalPatchSource[];
  characters?: VisitRouteBStateProposalContextCharacterRef[];
}): VisitRouteBStateProposalContext {
  const characterLabels = new Map(
    (input.characters ?? []).map((character) => [
      character.routeBCharacterId,
      sanitizeAdvisorContextText(character.displayName) || "劇場人物",
    ]),
  );
  const proposalsById = new Map<string, NormalizedStateProposal>();

  for (const source of input.patchSources) {
    const patch = parseStateProposalPatch(source.patch);
    if (!patch) continue;

    const existing = proposalsById.get(patch.id);
    if (existing) {
      existing.origins.add(source.origin);
    } else {
      proposalsById.set(patch.id, { patch, origins: new Set([source.origin]) });
    }
  }

  const normalized = [...proposalsById.values()];
  const items = normalized.map((proposal, index): VisitRouteBStateProposalContextItem => {
    const targetLabel = characterLabels.get(proposal.patch.targetCharacterId) ?? "劇場人物";
    const status = proposal.patch.factStatus === "UNKNOWN" ? "unknown" : "inference";
    const evidenceNeeded = status === "unknown";
    const labelPrefix = evidenceNeeded ? "待確認狀態" : "推論狀態";
    const label = `${labelPrefix}：${targetLabel}`;

    return {
      id: `route-b-state-proposal-${index + 1}`,
      source: "theater_route_b_state_proposal",
      status,
      cardType: evidenceNeeded ? "evidence_needed" : "next_question",
      targetLabel,
      label,
      detail: buildProposalDetail(proposal.patch, proposal.origins),
      followUpQuestion: buildFollowUpQuestion(proposal.patch, targetLabel, evidenceNeeded),
      evidenceNeeded,
      requiresConfirmation: true,
      writesConfirmedCrmFact: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
    };
  });

  return {
    agentId: "asai.visit.preparation_package",
    actionId: "route-b-state-proposal-downstream-advisor-context",
    registryReadiness: "internal-only",
    sourceAgentId: "asai.theater.route_b",
    sourceActionId: "route-b-state-proposal-persistence",
    items,
    summary: {
      itemCount: items.length,
      unknownCount: items.filter((item) => item.status === "unknown").length,
      inferenceCount: items.filter((item) => item.status === "inference").length,
      evidenceNeededCount: items.filter((item) => item.evidenceNeeded).length,
      nextQuestionCount: items.filter((item) => item.cardType === "next_question").length,
      sceneProposalCount: normalized.filter((proposal) => proposal.origins.has("scene_state")).length,
      turnProposalCount: normalized.filter((proposal) => proposal.origins.has("turn_state")).length,
      privateScopeCount: normalized.filter((proposal) => proposal.patch.visibilityScope === "PRIVATE").length,
      narratorQueueCount: normalized.filter((proposal) => proposal.patch.allowedWriteTargets.includes("NARRATOR_QUEUE")).length,
      relationshipStateCount: normalized.filter((proposal) => proposal.patch.allowedWriteTargets.includes("RELATIONSHIP_STATE")).length,
    },
    outputContract: {
      factsInferencesUnknownsSeparated: true,
      advisorContextOnly: true,
      requiresAdvisorConfirmation: true,
      doesNotOverwriteVisitFacts: true,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      storesRawProviderPayload: false,
    },
    privacyProof: {
      rawPrivateTranscriptReturned: false,
      rawProviderPayloadReturned: false,
      rawTheaterSessionIdReturned: false,
      rawPersonIdReturned: false,
      personalContactReturned: false,
      policyNumberReturned: false,
    },
  };
}

export function selectVisitRouteBStateProposalQuestionEvidence(
  context: VisitRouteBStateProposalContext | undefined,
  maxItems = 2,
): VisitQuestionEvidence[] {
  if (!context) return [];

  return context.items.slice(0, maxItems).map((item): VisitQuestionEvidence => ({
    id: item.id,
    source: item.source,
    status: item.status,
    label: item.label,
    detail: `${item.detail} 下一題：${item.followUpQuestion}`,
  }));
}

function parseStateProposalPatch(value: unknown): TheaterRouteBStatePatch | null {
  const record = asRecord(value);

  if (
    typeof record.id !== "string" ||
    typeof record.targetCharacterId !== "string" ||
    typeof record.summary !== "string" ||
    (record.factStatus !== "INFERENCE" && record.factStatus !== "UNKNOWN") ||
    (record.visibilityScope !== "GROUP" && record.visibilityScope !== "PRIVATE" && record.visibilityScope !== "NARRATOR") ||
    record.requiresConfirmation !== true ||
    record.writesConfirmedCrmFact !== false ||
    !Array.isArray(record.allowedWriteTargets)
  ) {
    return null;
  }

  const allowedWriteTargets = record.allowedWriteTargets.filter(
    (target): target is "SCENE_PRIVATE_STATE" | "RELATIONSHIP_STATE" | "NARRATOR_QUEUE" =>
      target === "SCENE_PRIVATE_STATE" || target === "RELATIONSHIP_STATE" || target === "NARRATOR_QUEUE",
  );

  if (allowedWriteTargets.length === 0) return null;

  return {
    id: sanitizeAdvisorContextText(record.id),
    targetCharacterId: sanitizeAdvisorContextText(record.targetCharacterId),
    summary: sanitizeAdvisorContextText(record.summary),
    factStatus: record.factStatus,
    visibilityScope: record.visibilityScope,
    requiresConfirmation: true,
    writesConfirmedCrmFact: false,
    allowedWriteTargets,
    sourceTurnId: typeof record.sourceTurnId === "string" ? sanitizeAdvisorContextText(record.sourceTurnId) : undefined,
  };
}

function buildProposalDetail(patch: TheaterRouteBStatePatch, origins: Set<VisitRouteBStateProposalPatchSource["origin"]>) {
  const sourceLabel = origins.has("scene_state") && origins.has("turn_state")
    ? "sceneState 與 turn statePatches"
    : origins.has("scene_state")
      ? "sceneState.statePatches"
      : "turn statePatches";
  const statusLabel = patch.factStatus === "UNKNOWN" ? "未知待確認" : "推論待驗證";
  const targetLabel = formatAllowedTargets(patch.allowedWriteTargets);

  return `劇場把「${patch.summary}」標為${statusLabel}，來源為 ${sourceLabel}；下次拜訪只能當顧問追問脈絡，允許暫存目標為 ${targetLabel}，不得寫成 CRM 已確認事實。`;
}

function buildFollowUpQuestion(patch: TheaterRouteBStatePatch, targetLabel: string, evidenceNeeded: boolean) {
  if (evidenceNeeded) {
    return `關於${targetLabel}，我想確認「${patch.summary}」這點目前有哪些佐證或例外？`;
  }

  return `關於${targetLabel}，我目前只把「${patch.summary}」視為推論；現場是否能確認或修正？`;
}

function formatAllowedTargets(targets: TheaterRouteBStatePatch["allowedWriteTargets"]) {
  return targets
    .map((target) => {
      if (target === "SCENE_PRIVATE_STATE") return "劇場私有狀態";
      if (target === "RELATIONSHIP_STATE") return "關係狀態提案";
      return "旁白補問佇列";
    })
    .join("、");
}

function sanitizeAdvisorContextText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[removed]")
    .replace(/\b(?:policy|保單)[\s:#-]*[A-Z0-9-]{4,}\b/gi, "[removed]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
