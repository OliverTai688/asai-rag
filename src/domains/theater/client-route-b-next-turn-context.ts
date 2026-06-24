import type { Client } from "../client/types";
import {
  buildClientTheaterRouteBHandoff,
  type BuildClientTheaterRouteBHandoffInput,
  type ClientTheaterRouteBHandoff,
} from "./client-route-b-handoff";
import { buildRouteBProviderPromptContext, type RouteBProviderPromptContext } from "./route-b-provider-prompt-context";
import {
  buildTheaterRouteBNextTurnDraft,
  type TheaterRouteBNextTurnDraft,
  type TheaterRouteBNextTurnDraftStatus,
} from "./route-b-next-turn";
import type { RouteBSessionSnapshot } from "./route-b-session";
import type {
  TheaterRouteBCharacter,
  TheaterRouteBVisibilityRule,
  TheaterRouteBVisibilityScope,
} from "./route-b-handoff";

export type ClientRouteBNextTurnContextStatus =
  | "READY_FOR_PROVIDER_DISABLED_PREVIEW"
  | "NEEDS_HANDOFF_REVIEW"
  | "BLOCKED_SENSITIVE";

export interface BuildClientRouteBNextTurnContextInput extends BuildClientTheaterRouteBHandoffInput {
  routeBSessionId?: string;
  advisorTurn?: {
    id?: string;
    content: string;
    visibilityScope?: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
    addresseeRouteBCharacterId?: string | null;
    createdAt?: string;
  };
}

export interface ClientRouteBNextTurnContext {
  status: ClientRouteBNextTurnContextStatus;
  handoffBridge: ClientTheaterRouteBHandoff;
  sessionSnapshot?: RouteBSessionSnapshot;
  nextTurnDraft?: TheaterRouteBNextTurnDraft;
  providerPromptContext?: RouteBProviderPromptContext;
  proof: {
    source: "client-route-b-handoff";
    handoffStatus: ClientTheaterRouteBHandoff["status"];
    nextTurnStatus?: TheaterRouteBNextTurnDraftStatus;
    providerCallAttempted: false;
    databaseWriteAttempted: false;
    aiUsageLogWritten: false;
    aiUsageLogRequiredBeforeProviderEnablement: true;
    rawPrivateTranscriptIncluded: false;
    rawProviderPayloadIncluded: false;
    directPrivateDialogReturned: false;
    routeBAppendCandidatePersisted: false;
    generatedTextAllowed: false;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesConfirmedCrmFact: false;
    highSensitiveBlocked: boolean;
    routeBProductionStartAllowed: false;
    familyProfileGroundingIncluded: boolean;
    familyProfileGroundingUsedInNextTurn: boolean;
    familyProfileGroundingUsedInProviderPrompt: boolean;
  };
}

export function buildClientRouteBNextTurnContext(
  input: BuildClientRouteBNextTurnContextInput,
): ClientRouteBNextTurnContext {
  const handoffBridge = buildClientTheaterRouteBHandoff({
    ...input,
    routeBEnabled: false,
  });

  if (handoffBridge.status !== "READY_FOR_HANDOFF_REVIEW") {
    return {
      status: handoffBridge.status === "BLOCKED_SENSITIVE" ? "BLOCKED_SENSITIVE" : "NEEDS_HANDOFF_REVIEW",
      handoffBridge,
      proof: buildProof(handoffBridge, undefined, undefined),
    };
  }

  const sessionSnapshot = buildRouteBSessionSnapshotFromClientHandoff(input.client, handoffBridge, input);
  const nextTurnDraft = buildTheaterRouteBNextTurnDraft(sessionSnapshot);
  const providerPromptContext = buildRouteBProviderPromptContext({
    role: normalizeProviderPromptRole(nextTurnDraft, handoffBridge),
    personaHints: selectedCharacterPersonaHints(nextTurnDraft, handoffBridge),
    unknowns: handoffBridge.handoff.scene.narratorQuestions.map((question) => question.text),
    meetingRelationshipSignalGrounding: nextTurnDraft.inputSummary.meetingRelationshipSignalGrounding,
    relationshipEdgeShadowGrounding: nextTurnDraft.inputSummary.relationshipEdgeShadowGrounding,
    familyProfileGrounding: nextTurnDraft.inputSummary.familyProfileGrounding,
  });

  return {
    status: nextTurnDraft.status === "READY" ? "READY_FOR_PROVIDER_DISABLED_PREVIEW" : "NEEDS_HANDOFF_REVIEW",
    handoffBridge,
    sessionSnapshot,
    nextTurnDraft,
    providerPromptContext,
    proof: buildProof(handoffBridge, nextTurnDraft, providerPromptContext),
  };
}

export function buildRouteBSessionSnapshotFromClientHandoff(
  client: Client,
  handoffBridge: ClientTheaterRouteBHandoff,
  input: Pick<BuildClientRouteBNextTurnContextInput, "routeBSessionId" | "advisorTurn" | "now"> = {},
): RouteBSessionSnapshot {
  const handoff = handoffBridge.handoff;
  const now = input.now ?? new Date(0).toISOString();
  const sessionId = sanitizeId(input.routeBSessionId ?? `client_route_b_next_turn_${stableHash(handoff.id)}`);
  const advisorTurn = input.advisorTurn ?? {
    content: "我想從家庭角色與現金流顧慮開始，請先讓最適合的人回應。",
    visibilityScope: "GROUP" as const,
  };

  return {
    session: {
      id: sessionId,
      routeBEnabled: false,
      routeBSceneId: handoff.scene.id,
      routeBSourcePacketId: handoff.sourcePacketId,
      clientId: client.id,
      spinSessionId: null,
      status: "PREVIEW_ONLY",
      isDemo: false,
      createdAt: now,
      provider: {
        callsEnabled: false,
        callAttempted: false,
        usageLogWritten: false,
        usageLogRequiredFor: ["DIRECTOR", "CHARACTER", "FEEDBACK"],
        storesProviderBody: false,
      },
    },
    scene: {
      relationships: handoff.scene.relationships,
      narratorQuestions: handoff.scene.narratorQuestions,
      statePatchCount: handoff.scene.statePatches.length,
      visibilityRules: ensureVisibilityRules(handoff.scene.visibilityRules),
      sourceGrounding: handoff.scene.sourceGrounding,
    },
    characters: handoff.scene.characters.map(toSnapshotCharacter),
    turns: [
      {
        id: `${sessionId}_director_opening`,
        role: "DIRECTOR",
        speakerRouteBCharacterId: null,
        addresseeRouteBCharacterId: null,
        visibilityScope: "DIRECTOR_ONLY",
        content: "Provider-disabled client handoff preview. No character text is generated.",
        statePatchCount: 0,
        createdAt: now,
      },
      {
        id: sanitizeId(advisorTurn.id ?? `${sessionId}_advisor_latest`),
        role: "ADVISOR",
        speakerRouteBCharacterId: null,
        addresseeRouteBCharacterId: advisorTurn.addresseeRouteBCharacterId ?? null,
        visibilityScope: advisorTurn.visibilityScope ?? "GROUP",
        content: sanitizePreviewText(advisorTurn.content),
        statePatchCount: 0,
        createdAt: advisorTurn.createdAt ?? now,
      },
    ],
    visibilityProof: {
      ownerOnlyRead: true,
      scopedTurnColumnsPersisted: false,
      thirdPartyVisibleForDirectMessage: false,
    },
  };
}

function buildProof(
  handoffBridge: ClientTheaterRouteBHandoff,
  nextTurnDraft?: TheaterRouteBNextTurnDraft,
  providerPromptContext?: RouteBProviderPromptContext,
): ClientRouteBNextTurnContext["proof"] {
  return {
    source: "client-route-b-handoff",
    handoffStatus: handoffBridge.status,
    ...(nextTurnDraft ? { nextTurnStatus: nextTurnDraft.status } : {}),
    providerCallAttempted: false,
    databaseWriteAttempted: false,
    aiUsageLogWritten: false,
    aiUsageLogRequiredBeforeProviderEnablement: true,
    rawPrivateTranscriptIncluded: false,
    rawProviderPayloadIncluded: false,
    directPrivateDialogReturned: false,
    routeBAppendCandidatePersisted: false,
    generatedTextAllowed: false,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesConfirmedCrmFact: false,
    highSensitiveBlocked: handoffBridge.status === "BLOCKED_SENSITIVE",
    routeBProductionStartAllowed: false,
    familyProfileGroundingIncluded: Boolean(handoffBridge.handoff.scene.sourceGrounding?.familyProfiles),
    familyProfileGroundingUsedInNextTurn: Boolean(
      nextTurnDraft?.inputSummary.familyProfileGrounding.usedInNextTurnRuntime,
    ),
    familyProfileGroundingUsedInProviderPrompt: Boolean(
      providerPromptContext?.familyProfileGrounding.usedInNextTurnRuntime &&
        providerPromptContext.promptRules.useFamilyProfilesAsRuntimeEvidence,
    ),
  };
}

function toSnapshotCharacter(character: TheaterRouteBCharacter): RouteBSessionSnapshot["characters"][number] {
  return {
    id: `snapshot_${sanitizeId(character.id)}`,
    routeBCharacterId: character.id,
    role: character.role,
    displayName: character.displayName,
    isFocus: character.isFocus,
    publicBrief: character.publicBrief,
    knownFacts: character.knownFacts,
    personaHints: character.personaHints,
    unknowns: character.unknowns,
    exemplarLines: character.exemplarLines,
    statePatchCount: 0,
  };
}

function ensureVisibilityRules(rules: TheaterRouteBVisibilityRule[]) {
  if (rules.length > 0) return rules;
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
  ];
}

function normalizeProviderPromptRole(
  draft: TheaterRouteBNextTurnDraft,
  handoffBridge: ClientTheaterRouteBHandoff,
) {
  const speakerId = draft.nextTurn.speakerRouteBCharacterId;
  return handoffBridge.handoff.scene.characters.find((character) => character.id === speakerId)?.role;
}

function selectedCharacterPersonaHints(
  draft: TheaterRouteBNextTurnDraft,
  handoffBridge: ClientTheaterRouteBHandoff,
) {
  const speakerId = draft.nextTurn.speakerRouteBCharacterId;
  return (
    handoffBridge.handoff.scene.characters
      .find((character) => character.id === speakerId)
      ?.personaHints.map((hint) => hint.label) ?? []
  );
}

function sanitizeId(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "route_b_client_next_turn"
  );
}

function sanitizePreviewText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[removed]")
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber)\b/gi, "[removed]")
    .slice(0, 360)
    .trim();
}

function stableHash(value: string) {
  let hash = 5381;
  for (const char of value) {
    hash = (hash * 33) ^ char.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}
