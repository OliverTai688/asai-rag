import {
  buildTheaterRouteBOrchestrationPlan,
  type TheaterRouteBDirectorDirective,
} from "./route-b-orchestration";
import type {
  TheaterRouteBAiUsagePlan,
  TheaterRouteBCharacter,
  TheaterRouteBCharacterRole,
  TheaterRouteBFactStatus,
  TheaterRouteBHandoffPacket,
  TheaterRouteBMaterial,
  TheaterRouteBMaterialUse,
  TheaterRouteBPersonaHint,
  TheaterRouteBRelation,
  TheaterRouteBSourceRef,
  TheaterRouteBTurnRef,
  TheaterRouteBVisibilityRule,
  TheaterRouteBVisibilityScope,
} from "./route-b-handoff";
import type { RouteBSessionSnapshot } from "./route-b-session";

export type TheaterRouteBNextTurnDraftStatus = "READY" | "NEEDS_ADVISOR_TURN" | "NO_CHARACTER";

export interface TheaterRouteBNextTurnDraft {
  agentId: "asai.theater.route_b";
  registryReadiness: "internal-only";
  sourceAlignment: {
    ownerSurface: "/theater/[sessionId]";
    endpoint: "/api/theater/route-b/sessions/[sessionId]/next-turn";
    actionId: "route-b-next-turn";
    sourceOwnerRefs: string[];
  };
  status: TheaterRouteBNextTurnDraftStatus;
  inputSummary: {
    sessionId: string;
    routeBSceneId: string | null;
    latestAdvisorTurnId?: string;
    latestAdvisorTurnVisibilityScope?: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
    characterCount: number;
    historyCount: number;
    historyVisibilitySummary: Record<TheaterRouteBVisibilityScope, number>;
    narratorQueueCount: number;
    rawPrivateTranscriptIncluded: false;
  };
  nextTurn: {
    role: "CHARACTER" | "NARRATOR";
    speakerRouteBCharacterId?: string;
    addresseeRouteBCharacterId?: string;
    visibilityScope?: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
    displayName?: string;
    directorDirective?: string;
    rationale: string[];
    guardEvidence?: TheaterRouteBDirectorDirective["guardEvidence"];
    draftMode: "PROVIDER_DISABLED_PREVIEW";
    generatedTextAllowed: false;
    contentPreview: string;
  };
  persistenceEnvelope: {
    actorKind: "CHARACTER" | "NARRATOR";
    speakerRouteBCharacterId?: string;
    addresseeRouteBCharacterId?: string;
    visibilityScope?: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
    statePatchCount: number;
    requiresConfirmation: true;
    writesConfirmedCrmFact: false;
    allowedWriteTargets: Array<"THEATER_TURN" | "SCENE_PRIVATE_STATE" | "RELATIONSHIP_STATE" | "NARRATOR_QUEUE">;
    provider: {
      providerCallAttempted: false;
      aiUsageLogWritten: false;
      aiUsageLogRequiredWhenProviderEnabled: true;
      storesRawProviderPayload: false;
    };
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    successErrorAiUsageLogRequiredBeforeProviderEnablement: true;
    storesRawProviderPayload: false;
  };
  privacyProof: {
    ownerOnlyRead: true;
    rawProviderPayloadIncluded: false;
    rawPrivateTranscriptIncluded: false;
    directPrivateDialogReturned: false;
    writesConfirmedCrmFact: false;
  };
}

const FALLBACK_SCENE_ID_PREFIX = "route_b_scene_snapshot";
const HIDDEN_TEXT = "[removed]";

export function buildTheaterRouteBNextTurnDraft(snapshot: RouteBSessionSnapshot): TheaterRouteBNextTurnDraft {
  const handoff = buildHandoffFromSessionSnapshot(snapshot);
  const historyAndAdvisorTurn = splitLatestAdvisorTurn(snapshot);
  const base = buildBaseDraft(snapshot, handoff, historyAndAdvisorTurn.history);

  if (handoff.scene.characters.filter((character) => character.role !== "NARRATOR").length === 0) {
    return buildNarratorOnlyDraft(base, "Route B session has no playable character cards.", "NO_CHARACTER");
  }

  if (!historyAndAdvisorTurn.latestAdvisorTurn) {
    return buildNarratorOnlyDraft(base, "Route B session needs a group or private advisor turn before drafting the next character turn.", "NEEDS_ADVISOR_TURN");
  }

  const plan = buildTheaterRouteBOrchestrationPlan({
    handoff,
    history: historyAndAdvisorTurn.history,
    advisorTurn: historyAndAdvisorTurn.latestAdvisorTurn,
  });
  const selectedCharacter = handoff.scene.characters.find(
    (character) => character.id === plan.directorDirective.speakerCharacterId,
  );

  return {
    ...base,
    status: "READY",
    inputSummary: {
      ...base.inputSummary,
      latestAdvisorTurnId: historyAndAdvisorTurn.latestAdvisorTurn.id,
      latestAdvisorTurnVisibilityScope: historyAndAdvisorTurn.latestAdvisorTurn.visibilityScope,
      historyCount: historyAndAdvisorTurn.history.length,
      historyVisibilitySummary: summarizeVisibility(historyAndAdvisorTurn.history),
      narratorQueueCount: plan.narratorQueue.length,
    },
    nextTurn: {
      role: "CHARACTER",
      speakerRouteBCharacterId: plan.directorDirective.speakerCharacterId,
      addresseeRouteBCharacterId: plan.directorDirective.addresseeCharacterId,
      visibilityScope: plan.directorDirective.visibilityScope,
      displayName: selectedCharacter?.displayName,
      directorDirective: plan.directorDirective.directive,
      rationale: plan.directorDirective.rationale,
      guardEvidence: plan.directorDirective.guardEvidence,
      draftMode: "PROVIDER_DISABLED_PREVIEW",
      generatedTextAllowed: false,
      contentPreview:
        "Provider disabled preview only: selected character and visibility lane are ready, but no role text is generated until success/error AiUsageLog proof exists.",
    },
    persistenceEnvelope: {
      actorKind: "CHARACTER",
      speakerRouteBCharacterId: plan.persistenceEnvelope.speakerCharacterId,
      addresseeRouteBCharacterId: plan.persistenceEnvelope.addresseeCharacterId,
      visibilityScope: plan.persistenceEnvelope.visibilityScope,
      statePatchCount: plan.persistenceEnvelope.statePatches.length,
      requiresConfirmation: plan.persistenceEnvelope.requiresConfirmation,
      writesConfirmedCrmFact: plan.persistenceEnvelope.writesConfirmedCrmFact,
      allowedWriteTargets: plan.persistenceEnvelope.allowedWriteTargets,
      provider: plan.persistenceEnvelope.provider,
    },
    providerBoundary: plan.providerBoundary,
  };
}

function buildBaseDraft(
  snapshot: RouteBSessionSnapshot,
  handoff: TheaterRouteBHandoffPacket,
  history: TheaterRouteBTurnRef[],
): TheaterRouteBNextTurnDraft {
  return {
    agentId: "asai.theater.route_b",
    registryReadiness: "internal-only",
    sourceAlignment: {
      ownerSurface: "/theater/[sessionId]",
      endpoint: "/api/theater/route-b/sessions/[sessionId]/next-turn",
      actionId: "route-b-next-turn",
      sourceOwnerRefs: [
        "src/domains/theater/route-b-session.ts",
        "src/domains/theater/route-b-orchestration.ts",
        "src/domains/theater/route-b-next-turn.ts",
        "src/app/api/theater/route-b/sessions/[sessionId]/next-turn/route.ts",
      ],
    },
    status: "NEEDS_ADVISOR_TURN",
    inputSummary: {
      sessionId: snapshot.session.id,
      routeBSceneId: snapshot.session.routeBSceneId,
      characterCount: handoff.scene.characters.length,
      historyCount: history.length,
      historyVisibilitySummary: summarizeVisibility(history),
      narratorQueueCount: handoff.scene.narratorQuestions.length,
      rawPrivateTranscriptIncluded: false,
    },
    nextTurn: {
      role: "NARRATOR",
      rationale: ["No character response is generated while provider execution is disabled."],
      draftMode: "PROVIDER_DISABLED_PREVIEW",
      generatedTextAllowed: false,
      contentPreview:
        "Provider disabled preview only: no character text is generated and no private transcript content is returned.",
    },
    persistenceEnvelope: {
      actorKind: "NARRATOR",
      statePatchCount: 0,
      requiresConfirmation: true,
      writesConfirmedCrmFact: false,
      allowedWriteTargets: ["NARRATOR_QUEUE"],
      provider: {
        providerCallAttempted: false,
        aiUsageLogWritten: false,
        aiUsageLogRequiredWhenProviderEnabled: true,
        storesRawProviderPayload: false,
      },
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      successErrorAiUsageLogRequiredBeforeProviderEnablement: true,
      storesRawProviderPayload: false,
    },
    privacyProof: {
      ownerOnlyRead: snapshot.visibilityProof.ownerOnlyRead,
      rawProviderPayloadIncluded: false,
      rawPrivateTranscriptIncluded: false,
      directPrivateDialogReturned: false,
      writesConfirmedCrmFact: false,
    },
  };
}

function buildNarratorOnlyDraft(
  base: TheaterRouteBNextTurnDraft,
  reason: string,
  status: Exclude<TheaterRouteBNextTurnDraftStatus, "READY">,
): TheaterRouteBNextTurnDraft {
  return {
    ...base,
    status,
    nextTurn: {
      ...base.nextTurn,
      role: "NARRATOR",
      rationale: [reason, "No provider call is attempted and no AiUsageLog row is faked."],
      contentPreview: reason,
    },
  };
}

function buildHandoffFromSessionSnapshot(snapshot: RouteBSessionSnapshot): TheaterRouteBHandoffPacket {
  const sourcePacketId = snapshot.session.routeBSourcePacketId ?? snapshot.session.id;
  const sceneId = snapshot.session.routeBSceneId ?? `${FALLBACK_SCENE_ID_PREFIX}_${stableHash(snapshot.session.id)}`;

  return {
    id: `route_b_next_turn_handoff_${stableHash(snapshot.session.id)}`,
    sourcePacketId,
    scene: {
      id: sceneId,
      sourcePacketId,
      title: `Route B session ${snapshot.session.id}`,
      scenario: "Persisted Route B theater session next-turn preview.",
      readiness: "READY",
      characters: snapshot.characters.map(toRouteBCharacter),
      relationships: readRelations(snapshot.scene.relationships),
      objections: [],
      narratorQuestions: readMaterials(snapshot.scene.narratorQuestions, "route_b_next_turn_narrator", "UNKNOWN", "NARRATOR_QUESTION"),
      visibilityRules: readVisibilityRules(snapshot.scene.visibilityRules),
      statePatches: [],
      sourceGrounding: snapshot.scene.sourceGrounding,
    },
    aiUsagePlan: buildAiUsagePlan(),
    runtimeActivation: {
      routeBEnabled: snapshot.session.routeBEnabled,
      canStartProductionSession: false,
      disabledReason: "Route B next-turn preview is guarded no-provider until director/character success-error AiUsageLog proof exists.",
      rollbackNote:
        "This snapshot-derived handoff is only for next-turn preview. It does not migrate legacy Theater scoring or enable live provider runtime.",
    },
    compatibility: {
      legacyPersonaTypeStrategy: "Legacy personaType remains compatibility-only and is not inferred from Route B next-turn preview.",
      legacyTensionStrategy: "Next-turn state proposals stay pending and do not update legacy tension.",
      legacyScoreStrategy: "Next-turn preview does not produce scores.",
      migrationBoundary: "Consumes RouteBSessionSnapshot and latest advisor turn into a no-provider next-turn draft only.",
    },
  };
}

function toRouteBCharacter(character: RouteBSessionSnapshot["characters"][number]): TheaterRouteBCharacter {
  const routeBCharacterId = sanitizeRouteBText(character.routeBCharacterId || character.id);

  return {
    id: routeBCharacterId,
    displayName: sanitizeRouteBText(character.displayName),
    role: normalizeCharacterRole(character.role),
    isFocus: character.isFocus,
    publicBrief: sanitizeRouteBText(character.publicBrief),
    knownFacts: readMaterials(character.knownFacts, `${routeBCharacterId}_fact`, "CONFIRMED", "BACKGROUND_FACT"),
    personaHints: readPersonaHints(character.personaHints),
    unknowns: readMaterials(character.unknowns, `${routeBCharacterId}_unknown`, "UNKNOWN", "NARRATOR_QUESTION"),
    exemplarLines: readMaterials(character.exemplarLines, `${routeBCharacterId}_line`, "INFERENCE", "PERSONA_HINT"),
  };
}

function splitLatestAdvisorTurn(snapshot: RouteBSessionSnapshot): {
  latestAdvisorTurn?: {
    id: string;
    content: string;
    visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
    addresseeCharacterId?: string;
  };
  history: TheaterRouteBTurnRef[];
} {
  const latestAdvisorTurnIndex = [...snapshot.turns]
    .map((turn, index) => ({ turn, index }))
    .reverse()
    .find(({ turn }) => turn.role === "ADVISOR" && isAdvisorVisibilityScope(turn.visibilityScope) && turn.content.trim().length > 0)
    ?.index;

  if (latestAdvisorTurnIndex === undefined) {
    return { history: snapshot.turns.map(toTurnRef).filter(isDefined) };
  }

  const latestTurn = snapshot.turns[latestAdvisorTurnIndex];
  const visibilityScope = normalizeAdvisorVisibilityScope(latestTurn.visibilityScope);

  if (!latestTurn || !visibilityScope) {
    return { history: snapshot.turns.map(toTurnRef).filter(isDefined) };
  }

  return {
    latestAdvisorTurn: {
      id: latestTurn.id,
      content: sanitizeRouteBText(latestTurn.content),
      visibilityScope,
      addresseeCharacterId: latestTurn.addresseeRouteBCharacterId ?? undefined,
    },
    history: snapshot.turns.slice(0, latestAdvisorTurnIndex).map(toTurnRef).filter(isDefined),
  };
}

function toTurnRef(turn: RouteBSessionSnapshot["turns"][number]): TheaterRouteBTurnRef | undefined {
  const visibilityScope = normalizeVisibilityScope(turn.visibilityScope);
  if (!visibilityScope) return undefined;

  return {
    id: turn.id,
    speakerCharacterId: turn.speakerRouteBCharacterId ?? undefined,
    addresseeCharacterId: turn.addresseeRouteBCharacterId ?? undefined,
    visibilityScope,
    content: sanitizeRouteBText(turn.content),
  };
}

function readMaterials(
  value: unknown,
  idPrefix: string,
  fallbackFactStatus: TheaterRouteBFactStatus,
  fallbackUse: TheaterRouteBMaterialUse,
): TheaterRouteBMaterial[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

  return items
    .map((item, index) => {
      const record = asRecord(item);
      const text = sanitizeRouteBText(
        typeof item === "string"
          ? item
          : readString(record.text) ?? readString(record.summary) ?? readString(record.label) ?? "",
      );

      if (!text) return undefined;

      const factStatus = normalizeFactStatus(readString(record.factStatus), fallbackFactStatus);

      return {
        id: sanitizeRouteBText(readString(record.id) ?? `${idPrefix}_${index + 1}`),
        text,
        factStatus,
        use: normalizeMaterialUse(readString(record.use), fallbackUse),
        sourceRefs: readSourceRefs(record.sourceRefs, factStatus, `${idPrefix}_source_${index + 1}`),
      };
    })
    .filter(isDefined);
}

function readPersonaHints(value: unknown): TheaterRouteBPersonaHint[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

  return items
    .map((item) => {
      const record = asRecord(item);
      const label = sanitizeRouteBText(typeof item === "string" ? item : readString(record.label) ?? "");
      if (!label) return undefined;

      return {
        label,
        factStatus: normalizePersonaFactStatus(readString(record.factStatus)),
        evidenceIds: readStringArray(record.evidenceIds),
      };
    })
    .filter(isDefined);
}

function readRelations(value: unknown): TheaterRouteBRelation[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

  return items
    .map((item, index) => {
      const record = asRecord(item);
      const summary = sanitizeRouteBText(typeof item === "string" ? item : readString(record.summary) ?? readString(record.text) ?? "");
      if (!summary) return undefined;

      const factStatus = normalizeRelationFactStatus(readString(record.factStatus));

      return {
        id: sanitizeRouteBText(readString(record.id) ?? `route_b_next_turn_relation_${index + 1}`),
        summary,
        factStatus,
        visibilityScope: normalizeVisibilityScope(readString(record.visibilityScope)) ?? "GROUP",
        sourceRefs: readSourceRefs(record.sourceRefs, factStatus, `route_b_next_turn_relation_source_${index + 1}`),
      };
    })
    .filter(isDefined);
}

function readVisibilityRules(value: unknown): TheaterRouteBVisibilityRule[] {
  const items = Array.isArray(value) ? value : [];
  const parsed = items
    .map((item) => {
      const record = asRecord(item);
      const scope = normalizeVisibilityScope(readString(record.scope));
      if (!scope) return undefined;

      return {
        scope,
        label: sanitizeRouteBText(readString(record.label) ?? defaultVisibilityLabel(scope)),
        visibleTo: normalizeVisibleTo(readString(record.visibleTo)),
        canBeQuotedInGroup: Boolean(record.canBeQuotedInGroup),
        writesConfirmedCrmFact: false as const,
      };
    })
    .filter(isDefined);

  return parsed.length > 0 ? parsed : defaultVisibilityRules();
}

function buildAiUsagePlan(): TheaterRouteBAiUsagePlan {
  const calls: TheaterRouteBAiUsagePlan["calls"] = [];

  for (const kind of ["DIRECTOR", "CHARACTER", "FEEDBACK"] as const) {
    calls.push({
      kind,
      purpose:
        kind === "DIRECTOR"
          ? "選擇下一位發言者與可見範圍。"
          : kind === "CHARACTER"
            ? "依角色卡與可見歷史產生角色回覆。"
            : "產生五視角質化回饋。",
      requiresAiUsageLog: true,
      logOn: "SUCCESS_AND_PROVIDER_ERROR",
      storesRawProviderPayload: false,
    });
  }

  return {
    noProviderDuringHandoffBuild: true,
    calls,
  };
}

function summarizeVisibility(history: TheaterRouteBTurnRef[]): Record<TheaterRouteBVisibilityScope, number> {
  return history.reduce<Record<TheaterRouteBVisibilityScope, number>>(
    (summary, turn) => {
      summary[turn.visibilityScope] += 1;
      return summary;
    },
    { GROUP: 0, PRIVATE: 0, DIRECTOR_ONLY: 0, NARRATOR: 0 },
  );
}

function normalizeCharacterRole(value: string): TheaterRouteBCharacterRole {
  if (value === "FOCUS_CLIENT") return "FOCUS_CLIENT";
  if (value === "DECISION_MAKER") return "DECISION_MAKER";
  if (value === "DEPENDENT") return "DEPENDENT";
  if (value === "NARRATOR") return "NARRATOR";
  return "INFLUENCER";
}

function normalizeFactStatus(value: string | undefined, fallback: TheaterRouteBFactStatus): TheaterRouteBFactStatus {
  if (value === "FACT" || value === "CONFIRMED" || value === "INFERENCE" || value === "UNKNOWN") return value;
  return fallback;
}

function normalizeRelationFactStatus(value: string | undefined): TheaterRouteBRelation["factStatus"] {
  if (value === "CONFIRMED" || value === "INFERENCE" || value === "UNKNOWN") return value;
  return "UNKNOWN";
}

function normalizePersonaFactStatus(value: string | undefined): TheaterRouteBPersonaHint["factStatus"] {
  if (value === "CONFIRMED" || value === "INFERENCE" || value === "UNKNOWN") return value;
  return "UNKNOWN";
}

function normalizeMaterialUse(value: string | undefined, fallback: TheaterRouteBMaterialUse): TheaterRouteBMaterialUse {
  if (
    value === "BACKGROUND_FACT" ||
    value === "PERSONA_HINT" ||
    value === "NARRATOR_QUESTION" ||
    value === "PRIVATE_STATE_ONLY"
  ) {
    return value;
  }
  return fallback;
}

function normalizeAdvisorVisibilityScope(value: string | null | undefined): Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE"> | undefined {
  if (value === "GROUP" || value === "PRIVATE") return value;
  return undefined;
}

function isAdvisorVisibilityScope(value: string | null | undefined): value is Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE"> {
  return value === "GROUP" || value === "PRIVATE";
}

function normalizeVisibilityScope(value: string | null | undefined): TheaterRouteBVisibilityScope | undefined {
  if (value === "GROUP" || value === "PRIVATE" || value === "DIRECTOR_ONLY" || value === "NARRATOR") return value;
  return undefined;
}

function normalizeVisibleTo(value: string | undefined): TheaterRouteBVisibilityRule["visibleTo"] {
  if (value === "EVERYONE" || value === "ADDRESSEE_ONLY" || value === "DIRECTOR_ONLY" || value === "ADVISOR_AND_DIRECTOR") {
    return value;
  }
  return "DIRECTOR_ONLY";
}

function defaultVisibilityRules(): TheaterRouteBVisibilityRule[] {
  return [
    {
      scope: "GROUP",
      label: "群聊",
      visibleTo: "EVERYONE",
      canBeQuotedInGroup: true,
      writesConfirmedCrmFact: false,
    },
    {
      scope: "PRIVATE",
      label: "私聊",
      visibleTo: "ADDRESSEE_ONLY",
      canBeQuotedInGroup: false,
      writesConfirmedCrmFact: false,
    },
    {
      scope: "DIRECTOR_ONLY",
      label: "導演內部狀態",
      visibleTo: "DIRECTOR_ONLY",
      canBeQuotedInGroup: false,
      writesConfirmedCrmFact: false,
    },
    {
      scope: "NARRATOR",
      label: "旁白補問",
      visibleTo: "ADVISOR_AND_DIRECTOR",
      canBeQuotedInGroup: false,
      writesConfirmedCrmFact: false,
    },
  ];
}

function defaultVisibilityLabel(scope: TheaterRouteBVisibilityScope): string {
  if (scope === "GROUP") return "群聊";
  if (scope === "PRIVATE") return "私聊";
  if (scope === "NARRATOR") return "旁白補問";
  return "導演內部狀態";
}

function readSourceRefs(value: unknown, factStatus: TheaterRouteBFactStatus, fallbackId: string): TheaterRouteBSourceRef[] {
  const items = Array.isArray(value) ? value : [];
  const refs = items
    .map((item, index) => {
      const record = asRecord(item);
      const id = sanitizeRouteBText(readString(record.id) ?? `${fallbackId}_${index + 1}`);
      if (!id) return undefined;

      return {
        id,
        label: sanitizeRouteBText(readString(record.label) ?? "RouteBSessionSnapshot"),
        factStatus: normalizeFactStatus(readString(record.factStatus), factStatus),
      };
    })
    .filter(isDefined);

  return refs.length > 0 ? refs : [{ id: fallbackId, label: "RouteBSessionSnapshot", factStatus }];
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map(sanitizeRouteBText).filter(Boolean);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function sanitizeRouteBText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, HIDDEN_TEXT)
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, HIDDEN_TEXT)
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment)\b/gi, HIDDEN_TEXT)
    .trim();
}

function stableHash(value: string): string {
  let hash = 5381;
  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}
