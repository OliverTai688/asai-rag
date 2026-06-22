import type { Prisma } from "../../generated/prisma/client";
import {
  TheaterDifficulty,
  TheaterPersonaType,
  TheaterRouteBCharacterRole,
  TheaterRouteBVisibilityScope,
  TheaterTurnRole,
} from "../../generated/prisma/enums";
import type {
  TheaterRouteBCharacter,
  TheaterRouteBHandoffPacket,
  TheaterRouteBStatePatch,
  TheaterRouteBVisibilityScope as RouteBVisibilityScope,
} from "../../domains/theater/route-b-handoff";

export type RouteBTurnActorKind = "ADVISOR" | "DIRECTOR" | "CHARACTER" | "NARRATOR";

export interface RouteBSessionScope {
  organizationId: string;
  unitId?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
  spinSessionId?: string | null;
  isDemo?: boolean;
}

export interface BuildRouteBSessionDraftOptions {
  sessionId?: string;
  nowIso?: string;
}

export interface RouteBSessionDraft {
  sessionId: string;
  sessionData: Prisma.TheaterSessionUncheckedCreateInput;
  charactersData: Prisma.TheaterCharacterUncheckedCreateInput[];
  openingTurnData: Prisma.TheaterTurnUncheckedCreateInput;
  aiUsageLogRequiredFor: Array<"DIRECTOR" | "CHARACTER" | "FEEDBACK">;
}

export interface BuildRouteBTurnCreateInput {
  id?: string;
  sessionId: string;
  actorKind: RouteBTurnActorKind;
  content: string;
  visibilityScope: RouteBVisibilityScope;
  speakerCharacterId?: string | null;
  addresseeCharacterId?: string | null;
  directorDirective?: string | null;
  statePatches?: TheaterRouteBStatePatch[];
  metadata?: Record<string, unknown>;
}

export interface PersistRouteBHandoffDraftResult {
  sessionId: string;
  characterCount: number;
  openingTurnId: string;
}

export interface RouteBAppSessionScope {
  organization: { id: string };
  membership: { primaryUnitId?: string | null };
  user: { id: string };
}

export type RouteBPersistenceClient = Pick<
  Prisma.TransactionClient,
  "theaterSession" | "theaterCharacter" | "theaterTurn"
>;

export type RouteBTurnVisibilityProbe = Pick<
  Prisma.TheaterTurnUncheckedCreateInput,
  "speakerCharacterId" | "addresseeCharacterId" | "visibilityScope"
>;

export function buildRouteBSessionDraft(
  handoff: TheaterRouteBHandoffPacket,
  scope: RouteBSessionScope,
  options: BuildRouteBSessionDraftOptions = {},
): RouteBSessionDraft {
  const sessionId = options.sessionId ?? `route_b_session_${stableHash(handoff.id)}`;
  const nowIso = options.nowIso ?? new Date().toISOString();
  const aiUsageLogRequiredFor = handoff.aiUsagePlan.calls.map((call) => call.kind);
  const sessionState = {
    statePatches: handoff.scene.statePatches,
    relationships: handoff.scene.relationships,
    narratorQuestions: handoff.scene.narratorQuestions,
  };

  const sessionData: Prisma.TheaterSessionUncheckedCreateInput = {
    id: sessionId,
    organizationId: scope.organizationId,
    unitId: scope.unitId ?? null,
    clientId: scope.clientId ?? null,
    ownerId: scope.ownerId ?? null,
    spinSessionId: scope.spinSessionId ?? null,
    // Legacy fields stay populated for compatibility only. Route B uses
    // TheaterCharacter / visibilityScope instead of personaType / tension / score.
    personaType: TheaterPersonaType.CONSERVATIVE,
    difficulty: TheaterDifficulty.MEDIUM,
    tension: 0,
    routeBEnabled: handoff.runtimeActivation.routeBEnabled,
    routeBSceneId: handoff.scene.id,
    routeBSourcePacketId: handoff.sourcePacketId,
    sceneState: toInputJson(sessionState),
    visibilityRules: toInputJson(handoff.scene.visibilityRules),
    metadata: toInputJson({
      source: "theater_route_b_handoff",
      handoffId: handoff.id,
      sourcePacketId: handoff.sourcePacketId,
      readiness: handoff.scene.readiness,
      compatibility: handoff.compatibility,
      runtimeActivation: handoff.runtimeActivation,
      aiUsagePlan: handoff.aiUsagePlan,
      createdFromHandoffAt: nowIso,
      writesConfirmedCrmFact: false,
    }),
    isDemo: scope.isDemo ?? false,
  };

  const charactersData = handoff.scene.characters.map((character) =>
    buildRouteBCharacterCreateData(sessionId, character, handoff.scene.statePatches),
  );

  return {
    sessionId,
    sessionData,
    charactersData,
    openingTurnData: buildRouteBTurnCreateData({
      id: `route_b_opening_${stableHash(sessionId)}`,
      sessionId,
      actorKind: "DIRECTOR",
      content: "Route B 場域已建立，等待顧問開始群聊或私聊演練。",
      visibilityScope: "DIRECTOR_ONLY",
      statePatches: handoff.scene.statePatches,
      metadata: {
        source: "theater_route_b_handoff",
        handoffId: handoff.id,
        noProviderCall: true,
        aiUsageLogRequiredFor,
      },
    }),
    aiUsageLogRequiredFor,
  };
}

export function buildRouteBTurnCreateData(input: BuildRouteBTurnCreateInput): Prisma.TheaterTurnUncheckedCreateInput {
  return {
    id: input.id,
    sessionId: input.sessionId,
    speakerCharacterId: input.speakerCharacterId ?? null,
    addresseeCharacterId: input.addresseeCharacterId ?? null,
    role: toLegacyTurnRole(input.actorKind),
    visibilityScope: toPrismaVisibilityScope(input.visibilityScope),
    directorDirective: input.directorDirective ?? null,
    content: sanitizeRouteBText(input.content),
    tensionDelta: null,
    statePatches: input.statePatches ? toInputJson(input.statePatches) : undefined,
    metadata: toInputJson({
      source: "theater_route_b_runtime",
      actorKind: input.actorKind,
      routeBVisibilityScope: input.visibilityScope,
      writesConfirmedCrmFact: false,
      ...(input.metadata ?? {}),
    }),
  };
}

export function isRouteBTurnVisibleToCharacter(turn: RouteBTurnVisibilityProbe, routeBCharacterId: string): boolean {
  if (turn.visibilityScope === TheaterRouteBVisibilityScope.GROUP) {
    return true;
  }

  if (turn.visibilityScope === TheaterRouteBVisibilityScope.PRIVATE) {
    return turn.speakerCharacterId === routeBCharacterId || turn.addresseeCharacterId === routeBCharacterId;
  }

  return false;
}

export async function persistRouteBHandoffDraft(
  db: RouteBPersistenceClient,
  session: RouteBAppSessionScope,
  handoff: TheaterRouteBHandoffPacket,
  input: {
    clientId?: string | null;
    spinSessionId?: string | null;
    isDemo?: boolean;
    sessionId?: string;
  } = {},
): Promise<PersistRouteBHandoffDraftResult> {
  const draft = buildRouteBSessionDraft(handoff, {
    organizationId: session.organization.id,
    unitId: session.membership.primaryUnitId,
    clientId: input.clientId,
    ownerId: session.user.id,
    spinSessionId: input.spinSessionId,
    isDemo: input.isDemo,
  }, { sessionId: input.sessionId });

  await db.theaterSession.create({ data: draft.sessionData });
  await db.theaterCharacter.createMany({ data: draft.charactersData });
  const openingTurn = await db.theaterTurn.create({ data: draft.openingTurnData });

  return {
    sessionId: draft.sessionId,
    characterCount: draft.charactersData.length,
    openingTurnId: openingTurn.id,
  };
}

function buildRouteBCharacterCreateData(
  sessionId: string,
  character: TheaterRouteBCharacter,
  statePatches: TheaterRouteBStatePatch[],
): Prisma.TheaterCharacterUncheckedCreateInput {
  return {
    id: buildPersistedCharacterId(sessionId, character.id),
    sessionId,
    routeBCharacterId: character.id,
    role: toPrismaCharacterRole(character.role),
    displayName: sanitizeRouteBText(character.displayName),
    isFocus: character.isFocus,
    publicBrief: sanitizeRouteBText(character.publicBrief),
    knownFacts: toInputJson(character.knownFacts),
    personaHints: toInputJson(character.personaHints),
    unknowns: toInputJson(character.unknowns),
    exemplarLines: toInputJson(character.exemplarLines),
    privateState: toInputJson({
      statePatches: statePatches.filter((patch) => patch.targetCharacterId === character.id),
      writesConfirmedCrmFact: false,
    }),
    metadata: toInputJson({
      source: "theater_route_b_handoff",
      factBoundary: "knownFacts are source-backed; personaHints remain inference/unknown unless confirmed.",
    }),
  };
}

function toPrismaCharacterRole(role: TheaterRouteBCharacter["role"]): TheaterRouteBCharacterRole {
  switch (role) {
    case "FOCUS_CLIENT":
      return TheaterRouteBCharacterRole.FOCUS_CLIENT;
    case "DECISION_MAKER":
      return TheaterRouteBCharacterRole.DECISION_MAKER;
    case "DEPENDENT":
      return TheaterRouteBCharacterRole.DEPENDENT;
    case "NARRATOR":
      return TheaterRouteBCharacterRole.NARRATOR;
    case "INFLUENCER":
      return TheaterRouteBCharacterRole.INFLUENCER;
  }
}

function toPrismaVisibilityScope(scope: RouteBVisibilityScope): TheaterRouteBVisibilityScope {
  switch (scope) {
    case "GROUP":
      return TheaterRouteBVisibilityScope.GROUP;
    case "PRIVATE":
      return TheaterRouteBVisibilityScope.PRIVATE;
    case "DIRECTOR_ONLY":
      return TheaterRouteBVisibilityScope.DIRECTOR_ONLY;
    case "NARRATOR":
      return TheaterRouteBVisibilityScope.NARRATOR;
  }
}

function toLegacyTurnRole(actorKind: RouteBTurnActorKind): TheaterTurnRole {
  switch (actorKind) {
    case "ADVISOR":
      return TheaterTurnRole.AGENT;
    case "CHARACTER":
      return TheaterTurnRole.CLIENT;
    case "DIRECTOR":
    case "NARRATOR":
      return TheaterTurnRole.SYSTEM;
  }
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function sanitizeRouteBText(value: string): string {
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

function buildPersistedCharacterId(sessionId: string, routeBCharacterId: string): string {
  return `${sessionId}_char_${stableHash(routeBCharacterId)}`.slice(0, 190);
}
