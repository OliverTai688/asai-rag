import {
  buildTheaterRouteBCharacterInput,
  buildTheaterRouteBDirectorInput,
  buildTheaterRouteBStatePatch,
  type TheaterRouteBCharacter,
  type TheaterRouteBCharacterInput,
  type TheaterRouteBDirectorInput,
  type TheaterRouteBHandoffPacket,
  type TheaterRouteBStatePatch,
  type TheaterRouteBTurnRef,
  type TheaterRouteBVisibilityScope,
} from "./route-b-handoff";

export interface TheaterRouteBAdvisorTurnInput {
  id: string;
  content: string;
  visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
  addresseeCharacterId?: string;
}

export interface BuildTheaterRouteBOrchestrationOptions {
  handoff: TheaterRouteBHandoffPacket;
  advisorTurn: TheaterRouteBAdvisorTurnInput;
  history?: TheaterRouteBTurnRef[];
  maxConsecutiveSameSpeaker?: number;
}

export interface TheaterRouteBDirectorDirective {
  speakerCharacterId: string;
  addresseeCharacterId?: string;
  visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
  directive: string;
  rationale: string[];
  guardEvidence: {
    namedAddresseeMustAnswer: boolean;
    namedAddresseeFound: boolean;
    consecutiveSpeakerBlockedCharacterIds: string[];
    consecutiveSpeakerOverrideForNamedAddressee: boolean;
    privateHistoryScopedToAddressee: boolean;
  };
}

export interface TheaterRouteBCharacterReplyPersistenceEnvelope {
  actorKind: "CHARACTER";
  speakerCharacterId: string;
  addresseeCharacterId?: string;
  visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
  directorDirective: string;
  statePatches: TheaterRouteBStatePatch[];
  requiresConfirmation: true;
  writesConfirmedCrmFact: false;
  allowedWriteTargets: Array<"THEATER_TURN" | "SCENE_PRIVATE_STATE" | "RELATIONSHIP_STATE" | "NARRATOR_QUEUE">;
  provider: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    aiUsageLogRequiredWhenProviderEnabled: true;
    storesRawProviderPayload: false;
  };
}

export interface TheaterRouteBOrchestrationPlan {
  agentId: "asai.theater.route_b";
  registryReadiness: "internal-only";
  directorInput: TheaterRouteBDirectorInput;
  directorDirective: TheaterRouteBDirectorDirective;
  characterReplyInput: TheaterRouteBCharacterInput;
  persistenceEnvelope: TheaterRouteBCharacterReplyPersistenceEnvelope;
  narratorQueue: Array<{
    id: string;
    text: string;
    factStatus: "UNKNOWN";
    writesConfirmedCrmFact: false;
  }>;
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    successErrorAiUsageLogRequiredBeforeProviderEnablement: true;
    storesRawProviderPayload: false;
  };
}

const DEFAULT_MAX_CONSECUTIVE_SAME_SPEAKER = 2;

export function buildTheaterRouteBOrchestrationPlan(
  options: BuildTheaterRouteBOrchestrationOptions,
): TheaterRouteBOrchestrationPlan {
  const history = options.history ?? [];
  const maxConsecutiveSameSpeaker = options.maxConsecutiveSameSpeaker ?? DEFAULT_MAX_CONSECUTIVE_SAME_SPEAKER;
  const candidateCharacters = options.handoff.scene.characters.filter((character) => character.role !== "NARRATOR");
  const addressee = findCharacter(candidateCharacters, options.advisorTurn.addresseeCharacterId);
  const blockedCharacterIds = consecutiveSpeakerBlockedCharacterIds(history, maxConsecutiveSameSpeaker);
  const selected = addressee ?? selectNextSpeaker(candidateCharacters, blockedCharacterIds);
  const visibilityScope = addressee || options.advisorTurn.visibilityScope === "PRIVATE" ? "PRIVATE" : "GROUP";
  const normalizedAdvisorTurn = normalizeAdvisorTurn(options.advisorTurn, selected.id, visibilityScope);
  const scopedHistory = [...history, normalizedAdvisorTurn];
  const statePatches = buildUnknownStateProposals(options.handoff, selected.id, normalizedAdvisorTurn.id);
  const directive = buildDirectorDirectiveText(selected, visibilityScope, statePatches.length, blockedCharacterIds.includes(selected.id));

  const directorInput = buildTheaterRouteBDirectorInput(options.handoff, {
    salespersonUtterance: options.advisorTurn.content,
    history: scopedHistory,
  });
  const characterReplyInput = buildTheaterRouteBCharacterInput(options.handoff, {
    characterId: selected.id,
    addresseeCharacterId: visibilityScope === "PRIVATE" ? selected.id : undefined,
    visibilityScope,
    directorDirective: directive,
    history: scopedHistory,
  });

  return {
    agentId: "asai.theater.route_b",
    registryReadiness: "internal-only",
    directorInput,
    directorDirective: {
      speakerCharacterId: selected.id,
      addresseeCharacterId: visibilityScope === "PRIVATE" ? selected.id : undefined,
      visibilityScope,
      directive,
      rationale: buildRationale(selected, addressee, blockedCharacterIds, statePatches.length),
      guardEvidence: {
        namedAddresseeMustAnswer: Boolean(options.advisorTurn.addresseeCharacterId),
        namedAddresseeFound: Boolean(addressee),
        consecutiveSpeakerBlockedCharacterIds: blockedCharacterIds,
        consecutiveSpeakerOverrideForNamedAddressee: Boolean(addressee && blockedCharacterIds.includes(addressee.id)),
        privateHistoryScopedToAddressee: characterReplyInput.visibleHistory.every((turn) =>
          turn.visibilityScope !== "PRIVATE" ||
          turn.speakerCharacterId === selected.id ||
          turn.addresseeCharacterId === selected.id,
        ),
      },
    },
    characterReplyInput,
    persistenceEnvelope: {
      actorKind: "CHARACTER",
      speakerCharacterId: selected.id,
      addresseeCharacterId: visibilityScope === "PRIVATE" ? selected.id : undefined,
      visibilityScope,
      directorDirective: directive,
      statePatches,
      requiresConfirmation: true,
      writesConfirmedCrmFact: false,
      allowedWriteTargets: ["THEATER_TURN", "SCENE_PRIVATE_STATE", "RELATIONSHIP_STATE", "NARRATOR_QUEUE"],
      provider: {
        providerCallAttempted: false,
        aiUsageLogWritten: false,
        aiUsageLogRequiredWhenProviderEnabled: true,
        storesRawProviderPayload: false,
      },
    },
    narratorQueue: options.handoff.scene.narratorQuestions.map((question) => ({
      id: question.id,
      text: question.text,
      factStatus: "UNKNOWN",
      writesConfirmedCrmFact: false,
    })),
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      successErrorAiUsageLogRequiredBeforeProviderEnablement: true,
      storesRawProviderPayload: false,
    },
  };
}

function findCharacter(characters: TheaterRouteBCharacter[], characterId?: string) {
  if (!characterId) return undefined;
  return characters.find((character) => character.id === characterId);
}

function selectNextSpeaker(characters: TheaterRouteBCharacter[], blockedCharacterIds: string[]) {
  const available = characters.find((character) => !blockedCharacterIds.includes(character.id));
  return available ?? characters[0] ?? failNoCharacter();
}

function failNoCharacter(): never {
  throw new Error("Route B orchestration requires at least one character.");
}

function consecutiveSpeakerBlockedCharacterIds(history: TheaterRouteBTurnRef[], maxConsecutiveSameSpeaker: number): string[] {
  const latestSpeaker = [...history]
    .reverse()
    .find((turn) => turn.speakerCharacterId && (turn.visibilityScope === "GROUP" || turn.visibilityScope === "PRIVATE"))
    ?.speakerCharacterId;
  if (!latestSpeaker) return [];

  let consecutiveCount = 0;
  for (const turn of [...history].reverse()) {
    if (!turn.speakerCharacterId) continue;
    if (turn.visibilityScope !== "GROUP" && turn.visibilityScope !== "PRIVATE") continue;
    if (turn.speakerCharacterId !== latestSpeaker) break;
    consecutiveCount += 1;
  }

  return consecutiveCount >= maxConsecutiveSameSpeaker ? [latestSpeaker] : [];
}

function normalizeAdvisorTurn(
  advisorTurn: TheaterRouteBAdvisorTurnInput,
  selectedCharacterId: string,
  visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">,
): TheaterRouteBTurnRef {
  return {
    id: advisorTurn.id,
    addresseeCharacterId: visibilityScope === "PRIVATE" ? advisorTurn.addresseeCharacterId ?? selectedCharacterId : undefined,
    visibilityScope,
    content: advisorTurn.content,
  };
}

function buildUnknownStateProposals(
  handoff: TheaterRouteBHandoffPacket,
  selectedCharacterId: string,
  sourceTurnId: string,
): TheaterRouteBStatePatch[] {
  return handoff.scene.narratorQuestions.slice(0, 2).map((question) =>
    buildTheaterRouteBStatePatch({
      targetCharacterId: selectedCharacterId,
      summary: question.text,
      factStatus: "UNKNOWN",
      visibilityScope: "NARRATOR",
      sourceTurnId,
    }),
  );
}

function buildDirectorDirectiveText(
  character: TheaterRouteBCharacter,
  visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">,
  unknownCount: number,
  selectedDespiteConsecutiveGuard: boolean,
) {
  const lane = visibilityScope === "PRIVATE" ? "私聊" : "群聊";
  const unknownHint = unknownCount > 0 ? "保留未知資訊為旁白補問或暫態提案，不要補造成事實。" : "只回應已知素材與可標示的推論。";
  const guardHint = selectedDespiteConsecutiveGuard ? "此角色被顧問明確點名，所以允許回應，但下一輪仍需防止連續主導。" : "避免讓同一角色連續主導。";
  return `${character.displayName} 以${lane}可見範圍回應顧問；${guardHint}${unknownHint}`;
}

function buildRationale(
  selected: TheaterRouteBCharacter,
  addressee: TheaterRouteBCharacter | undefined,
  blockedCharacterIds: string[],
  unknownCount: number,
) {
  return [
    addressee ? `顧問明確點名 ${addressee.displayName}，被點名角色必須回應。` : `選擇 ${selected.displayName} 作為下一位發言者。`,
    blockedCharacterIds.length > 0
      ? `已避開連續發言角色：${blockedCharacterIds.join(", ")}。`
      : "沒有角色觸發連續發言上限。",
    unknownCount > 0 ? "未知資訊只進入旁白補問 / state proposal，不寫成 confirmed CRM fact。" : "本輪沒有新增未知補問 proposal。",
  ];
}
