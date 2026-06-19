import type { TheaterBuildCharacterSeed, TheaterBuildPacket } from "../interview/types";

export const THEATER_ROUTE_B_MAX_NPCS = 4;

export type TheaterRouteBFactStatus = "FACT" | "CONFIRMED" | "INFERENCE" | "UNKNOWN";

export type TheaterRouteBVisibilityScope = "GROUP" | "PRIVATE" | "DIRECTOR_ONLY" | "NARRATOR";

export type TheaterRouteBCallKind = "DIRECTOR" | "CHARACTER" | "FEEDBACK";

export type TheaterRouteBCharacterRole =
  | "FOCUS_CLIENT"
  | "DECISION_MAKER"
  | "INFLUENCER"
  | "DEPENDENT"
  | "NARRATOR";

export type TheaterRouteBMaterialUse =
  | "BACKGROUND_FACT"
  | "PERSONA_HINT"
  | "NARRATOR_QUESTION"
  | "PRIVATE_STATE_ONLY";

export interface TheaterRouteBSourceRef {
  id: string;
  label: string;
  factStatus: TheaterRouteBFactStatus;
}

export interface TheaterRouteBMaterial {
  id: string;
  text: string;
  factStatus: TheaterRouteBFactStatus;
  use: TheaterRouteBMaterialUse;
  sourceRefs: TheaterRouteBSourceRef[];
}

export interface TheaterRouteBPersonaHint {
  label: string;
  factStatus: "CONFIRMED" | "INFERENCE" | "UNKNOWN";
  evidenceIds: string[];
}

export interface TheaterRouteBCharacter {
  id: string;
  displayName: string;
  role: TheaterRouteBCharacterRole;
  isFocus: boolean;
  publicBrief: string;
  knownFacts: TheaterRouteBMaterial[];
  personaHints: TheaterRouteBPersonaHint[];
  unknowns: TheaterRouteBMaterial[];
  exemplarLines: TheaterRouteBMaterial[];
}

export interface TheaterRouteBRelation {
  id: string;
  summary: string;
  factStatus: "CONFIRMED" | "INFERENCE" | "UNKNOWN";
  visibilityScope: TheaterRouteBVisibilityScope;
  sourceRefs: TheaterRouteBSourceRef[];
}

export interface TheaterRouteBStatePatch {
  id: string;
  targetCharacterId: string;
  summary: string;
  factStatus: Exclude<TheaterRouteBFactStatus, "FACT">;
  visibilityScope: TheaterRouteBVisibilityScope;
  requiresConfirmation: true;
  writesConfirmedCrmFact: false;
  allowedWriteTargets: Array<"SCENE_PRIVATE_STATE" | "RELATIONSHIP_STATE" | "NARRATOR_QUEUE">;
  sourceTurnId?: string;
}

export interface TheaterRouteBVisibilityRule {
  scope: TheaterRouteBVisibilityScope;
  label: string;
  visibleTo: "EVERYONE" | "ADDRESSEE_ONLY" | "DIRECTOR_ONLY" | "ADVISOR_AND_DIRECTOR";
  canBeQuotedInGroup: boolean;
  writesConfirmedCrmFact: false;
}

export interface TheaterRouteBScene {
  id: string;
  sourcePacketId: string;
  title: string;
  scenario: string;
  readiness: TheaterBuildPacket["readiness"];
  characters: TheaterRouteBCharacter[];
  relationships: TheaterRouteBRelation[];
  objections: TheaterRouteBMaterial[];
  narratorQuestions: TheaterRouteBMaterial[];
  visibilityRules: TheaterRouteBVisibilityRule[];
  statePatches: TheaterRouteBStatePatch[];
}

export interface TheaterRouteBAiUsageCallPlan {
  kind: TheaterRouteBCallKind;
  purpose: string;
  requiresAiUsageLog: true;
  logOn: "SUCCESS_AND_PROVIDER_ERROR";
  storesRawProviderPayload: false;
}

export interface TheaterRouteBAiUsagePlan {
  calls: TheaterRouteBAiUsageCallPlan[];
  noProviderDuringHandoffBuild: true;
}

export interface TheaterRouteBRuntimeActivation {
  routeBEnabled: boolean;
  canStartProductionSession: boolean;
  disabledReason?: string;
  rollbackNote: string;
}

export interface TheaterRouteBHandoffPacket {
  id: string;
  sourcePacketId: string;
  scene: TheaterRouteBScene;
  aiUsagePlan: TheaterRouteBAiUsagePlan;
  runtimeActivation: TheaterRouteBRuntimeActivation;
  compatibility: {
    legacyPersonaTypeStrategy: string;
    legacyTensionStrategy: string;
    legacyScoreStrategy: string;
    migrationBoundary: string;
  };
}

export interface TheaterRouteBTurnRef {
  id: string;
  speakerCharacterId?: string;
  addresseeCharacterId?: string;
  visibilityScope: TheaterRouteBVisibilityScope;
  content: string;
}

export interface TheaterRouteBDirectorInput {
  sceneId: string;
  scenario: string;
  salespersonUtterance: string;
  sceneState: TheaterRouteBStatePatch[];
  characterCards: TheaterRouteBCharacter[];
  visibilityRules: TheaterRouteBVisibilityRule[];
  scopedHistory: TheaterRouteBTurnRef[];
  allowedActions: Array<"ASK_CHARACTER" | "REQUEST_NARRATOR_QUESTION" | "PATCH_PRIVATE_STATE" | "END_TURN">;
  aiUsageLogRequired: true;
}

export interface TheaterRouteBCharacterInput {
  sceneId: string;
  characterCard: TheaterRouteBCharacter;
  addresseeCharacterId?: string;
  visibilityScope: TheaterRouteBVisibilityScope;
  directorDirective: string;
  visibleHistory: TheaterRouteBTurnRef[];
  aiUsageLogRequired: true;
}

export interface BuildTheaterRouteBHandoffOptions {
  routeBEnabled?: boolean;
  now?: string;
}

export interface BuildTheaterRouteBDirectorInputOptions {
  salespersonUtterance: string;
  history?: TheaterRouteBTurnRef[];
}

export interface BuildTheaterRouteBCharacterInputOptions {
  characterId: string;
  addresseeCharacterId?: string;
  visibilityScope: TheaterRouteBVisibilityScope;
  directorDirective: string;
  history?: TheaterRouteBTurnRef[];
}

export interface BuildTheaterRouteBStatePatchInput {
  targetCharacterId: string;
  summary: string;
  factStatus: Exclude<TheaterRouteBFactStatus, "FACT">;
  visibilityScope: TheaterRouteBVisibilityScope;
  sourceTurnId?: string;
}

const HIDDEN_TEXT = "[removed]";

export function buildTheaterRouteBHandoff(
  packet: TheaterBuildPacket,
  options: BuildTheaterRouteBHandoffOptions = {},
): TheaterRouteBHandoffPacket {
  const routeBEnabled = options.routeBEnabled ?? false;
  const characters = buildRouteBCharacters(packet);
  const sourceRefs = sourceRefsForPacket(packet, "CONFIRMED");
  const scene: TheaterRouteBScene = {
    id: `route_b_scene_${stableHash(packet.id)}`,
    sourcePacketId: packet.id,
    title: sanitizeRouteBText(packet.focusClient ? `${packet.focusClient} 的劇場演練` : "待確認焦點客戶的劇場演練"),
    scenario: sanitizeRouteBText(packet.scenario ?? "待確認演練場景"),
    readiness: packet.readiness,
    characters,
    relationships: packet.relationships.map((relationship, index) => ({
      id: `route_b_relation_${index + 1}`,
      summary: sanitizeRouteBText(relationship),
      factStatus: "CONFIRMED",
      visibilityScope: "GROUP",
      sourceRefs,
    })),
    objections: packet.objections.map((objection, index) =>
      material(`route_b_objection_${index + 1}`, objection, "INFERENCE", "PERSONA_HINT", sourceRefsForPacket(packet, "INFERENCE")),
    ),
    narratorQuestions: buildNarratorMaterials(packet),
    visibilityRules: buildVisibilityRules(),
    statePatches: buildInitialStatePatches(packet, characters),
  };

  return {
    id: `route_b_handoff_${stableHash(`${packet.id}:${options.now ?? ""}`)}`,
    sourcePacketId: packet.id,
    scene,
    aiUsagePlan: buildAiUsagePlan(),
    runtimeActivation: {
      routeBEnabled,
      canStartProductionSession: routeBEnabled && packet.routeBCompatibility.canStartSimulation,
      disabledReason: routeBEnabled ? undefined : "Route B runtime 尚未接上 production Theater schema / session migration。",
      rollbackNote:
        "Route B 未啟用時，/theater 應停在 setup draft / handoff review，不宣稱可進入 production 多角色劇場；legacy personaType/tension/score 不被此 handoff 自動轉寫。",
    },
    compatibility: {
      legacyPersonaTypeStrategy:
        "legacy personaType 僅作舊單角色 session 的讀取相容欄位；Route B 角色以 TheaterCharacter role/persona hints 表達，不從 legacy enum 推導。",
      legacyTensionStrategy:
        "legacy tension 不進 Route B 新主流程；若需要情緒變化，使用 statePatches 的 private scene state，且不得寫成 CRM confirmed fact。",
      legacyScoreStrategy:
        "legacy score 僅供舊 session 顯示；Route B feedback 另由五視角質化回饋產生，且每次 feedback provider call 必須寫 AiUsageLog。",
      migrationBoundary:
        "本 handoff 是 TDF setup draft / TheaterBuildPacket 到 ITA-003 schema migration 的交接契約；不改 Prisma、不寫 DB、不呼叫 provider。",
    },
  };
}

export function buildTheaterRouteBDirectorInput(
  handoff: TheaterRouteBHandoffPacket,
  options: BuildTheaterRouteBDirectorInputOptions,
): TheaterRouteBDirectorInput {
  return {
    sceneId: handoff.scene.id,
    scenario: handoff.scene.scenario,
    salespersonUtterance: sanitizeRouteBText(options.salespersonUtterance),
    sceneState: handoff.scene.statePatches,
    characterCards: handoff.scene.characters,
    visibilityRules: handoff.scene.visibilityRules,
    scopedHistory: (options.history ?? []).map(sanitizeTurn),
    allowedActions: ["ASK_CHARACTER", "REQUEST_NARRATOR_QUESTION", "PATCH_PRIVATE_STATE", "END_TURN"],
    aiUsageLogRequired: true,
  };
}

export function buildTheaterRouteBCharacterInput(
  handoff: TheaterRouteBHandoffPacket,
  options: BuildTheaterRouteBCharacterInputOptions,
): TheaterRouteBCharacterInput {
  const characterCard = handoff.scene.characters.find((character) => character.id === options.characterId);
  if (!characterCard) {
    throw new Error(`Unknown Route B character id: ${options.characterId}`);
  }

  return {
    sceneId: handoff.scene.id,
    characterCard,
    addresseeCharacterId: options.addresseeCharacterId,
    visibilityScope: options.visibilityScope,
    directorDirective: sanitizeRouteBText(options.directorDirective),
    visibleHistory: (options.history ?? []).filter((turn) => isTurnVisibleToCharacter(turn, characterCard.id)).map(sanitizeTurn),
    aiUsageLogRequired: true,
  };
}

export function buildTheaterRouteBStatePatch(input: BuildTheaterRouteBStatePatchInput): TheaterRouteBStatePatch {
  return {
    id: `route_b_state_${stableHash(`${input.targetCharacterId}:${input.summary}:${input.sourceTurnId ?? ""}`)}`,
    targetCharacterId: input.targetCharacterId,
    summary: sanitizeRouteBText(input.summary),
    factStatus: input.factStatus,
    visibilityScope: input.visibilityScope,
    requiresConfirmation: true,
    writesConfirmedCrmFact: false,
    allowedWriteTargets:
      input.visibilityScope === "NARRATOR" ? ["NARRATOR_QUEUE"] : ["SCENE_PRIVATE_STATE", "RELATIONSHIP_STATE"],
    sourceTurnId: input.sourceTurnId,
  };
}

function buildRouteBCharacters(packet: TheaterBuildPacket): TheaterRouteBCharacter[] {
  const focusSeed = packet.characters.find((character) => character.isFocus) ?? buildFallbackFocusSeed(packet);
  const npcSeeds = packet.characters
    .filter((character) => !character.isFocus && character.role !== "ADVISOR")
    .slice(0, THEATER_ROUTE_B_MAX_NPCS);

  return [focusSeed, ...npcSeeds].map((seed) => mapCharacterSeed(packet, seed));
}

function buildFallbackFocusSeed(packet: TheaterBuildPacket): TheaterBuildCharacterSeed {
  return {
    id: `focus_${stableHash(packet.focusClient ?? packet.id)}`,
    displayName: packet.focusClient ?? "待確認焦點客戶",
    role: "FOCUS_CLIENT",
    isFocus: true,
    knownFacts: packet.confirmedFacts,
    inferences: packet.inferredPersona,
    unknowns: packet.unknowns,
    personaHints: packet.inferredPersona.map((label, index) => ({
      label,
      confidence: "INFERRED",
      evidenceMemoryIds: [packet.supportingMemoryIds[index]].filter(Boolean),
    })),
    exemplarLines: [],
  };
}

function mapCharacterSeed(packet: TheaterBuildPacket, seed: TheaterBuildCharacterSeed): TheaterRouteBCharacter {
  const confirmedRefs = sourceRefsForPacket(packet, "CONFIRMED");
  const unknownRefs = sourceRefsForPacket(packet, "UNKNOWN");

  return {
    id: seed.id,
    displayName: sanitizeRouteBText(seed.displayName),
    role: normalizeRouteBRole(seed.role),
    isFocus: seed.isFocus,
    publicBrief: buildPublicBrief(seed),
    knownFacts: seed.knownFacts.map((text, index) =>
      material(`${seed.id}_fact_${index + 1}`, text, "CONFIRMED", "BACKGROUND_FACT", confirmedRefs),
    ),
    personaHints: seed.personaHints.map((hint) => ({
      label: sanitizeRouteBText(hint.label),
      factStatus: hint.confidence === "CONFIRMED" ? "CONFIRMED" : hint.confidence === "INFERRED" ? "INFERENCE" : "UNKNOWN",
      evidenceIds: hint.evidenceMemoryIds,
    })),
    unknowns: seed.unknowns.map((text, index) =>
      material(`${seed.id}_unknown_${index + 1}`, text, "UNKNOWN", "NARRATOR_QUESTION", unknownRefs),
    ),
    exemplarLines: seed.exemplarLines.map((text, index) =>
      material(`${seed.id}_line_${index + 1}`, text, "CONFIRMED", "BACKGROUND_FACT", confirmedRefs),
    ),
  };
}

function buildPublicBrief(seed: TheaterBuildCharacterSeed): string {
  const roleLabel = seed.isFocus ? "焦點客戶" : "陪演角色";
  const firstFact = seed.knownFacts[0] ? `；已知：${seed.knownFacts[0]}` : "";
  const firstUnknown = seed.unknowns[0] ? `；待確認：${seed.unknowns[0]}` : "";
  return sanitizeRouteBText(`${roleLabel} ${seed.displayName}${firstFact}${firstUnknown}`);
}

function buildNarratorMaterials(packet: TheaterBuildPacket): TheaterRouteBMaterial[] {
  const unknownRefs = sourceRefsForPacket(packet, "UNKNOWN");
  return unique([...packet.unknowns, ...packet.narratorQuestions]).map((question, index) =>
    material(`route_b_narrator_${index + 1}`, question, "UNKNOWN", "NARRATOR_QUESTION", unknownRefs),
  );
}

function buildInitialStatePatches(
  packet: TheaterBuildPacket,
  characters: TheaterRouteBCharacter[],
): TheaterRouteBStatePatch[] {
  const focusCharacter = characters.find((character) => character.isFocus);
  if (!focusCharacter) return [];

  const patches = packet.inferredPersona.slice(0, 3).map((summary, index) =>
    buildTheaterRouteBStatePatch({
      targetCharacterId: focusCharacter.id,
      summary: `角色私下狀態推論 ${index + 1}：${summary}`,
      factStatus: "INFERENCE",
      visibilityScope: "DIRECTOR_ONLY",
    }),
  );

  const narratorPatches = packet.unknowns.slice(0, 3).map((summary) =>
    buildTheaterRouteBStatePatch({
      targetCharacterId: focusCharacter.id,
      summary,
      factStatus: "UNKNOWN",
      visibilityScope: "NARRATOR",
    }),
  );

  return [...patches, ...narratorPatches];
}

function buildVisibilityRules(): TheaterRouteBVisibilityRule[] {
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

function buildAiUsagePlan(): TheaterRouteBAiUsagePlan {
  return {
    noProviderDuringHandoffBuild: true,
    calls: [
      {
        kind: "DIRECTOR",
        purpose: "選擇下一位發言者、addressee、visibility scope 與演出指令。",
        requiresAiUsageLog: true,
        logOn: "SUCCESS_AND_PROVIDER_ERROR",
        storesRawProviderPayload: false,
      },
      {
        kind: "CHARACTER",
        purpose: "依角色卡與可見歷史生成角色回應；私聊歷史不得外洩到群聊。",
        requiresAiUsageLog: true,
        logOn: "SUCCESS_AND_PROVIDER_ERROR",
        storesRawProviderPayload: false,
      },
      {
        kind: "FEEDBACK",
        purpose: "生成五視角質化回饋與合規提醒；不輸出 legacy score 作新主流程。",
        requiresAiUsageLog: true,
        logOn: "SUCCESS_AND_PROVIDER_ERROR",
        storesRawProviderPayload: false,
      },
    ],
  };
}

function isTurnVisibleToCharacter(turn: TheaterRouteBTurnRef, characterId: string): boolean {
  if (turn.visibilityScope === "GROUP") return true;
  if (turn.visibilityScope === "PRIVATE") {
    return turn.speakerCharacterId === characterId || turn.addresseeCharacterId === characterId;
  }
  return false;
}

function sanitizeTurn(turn: TheaterRouteBTurnRef): TheaterRouteBTurnRef {
  return {
    ...turn,
    content: sanitizeRouteBText(turn.content),
  };
}

function material(
  id: string,
  text: string,
  factStatus: TheaterRouteBFactStatus,
  use: TheaterRouteBMaterialUse,
  sourceRefs: TheaterRouteBSourceRef[],
): TheaterRouteBMaterial {
  return {
    id,
    text: sanitizeRouteBText(text),
    factStatus,
    use,
    sourceRefs,
  };
}

function sourceRefsForPacket(packet: TheaterBuildPacket, factStatus: TheaterRouteBFactStatus): TheaterRouteBSourceRef[] {
  return packet.supportingMemoryIds.slice(0, 8).map((id) => ({
    id,
    label: "TheaterBuildPacket supporting memory",
    factStatus,
  }));
}

function normalizeRouteBRole(role: TheaterBuildCharacterSeed["role"]): TheaterRouteBCharacterRole {
  if (role === "FOCUS_CLIENT") return "FOCUS_CLIENT";
  if (role === "DECISION_MAKER") return "DECISION_MAKER";
  if (role === "NARRATOR") return "NARRATOR";
  return "INFLUENCER";
}

function sanitizeRouteBText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, HIDDEN_TEXT)
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, HIDDEN_TEXT)
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp)\b/gi, HIDDEN_TEXT)
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
