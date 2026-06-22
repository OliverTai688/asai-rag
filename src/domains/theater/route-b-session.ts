import type { RouteBRedLineActionPersistenceState } from "./route-b-red-line-action-workflow";

export type RouteBSessionSnapshot = {
  session: {
    id: string;
    routeBEnabled: boolean;
    routeBSceneId: string | null;
    routeBSourcePacketId: string | null;
    clientId: string | null;
    spinSessionId: string | null;
    status: string;
    isDemo: boolean;
    createdAt: string;
    provider: {
      callsEnabled: false;
      callAttempted: false;
      usageLogWritten: false;
      usageLogRequiredFor: string[];
      storesProviderBody: false;
    };
  };
  scene: {
    relationships: unknown;
    narratorQuestions: unknown;
    statePatchCount: number;
    visibilityRules: unknown;
    redLineActionState?: RouteBRedLineActionPersistenceState;
  };
  characters: Array<{
    id: string;
    routeBCharacterId: string;
    role: string;
    displayName: string;
    isFocus: boolean;
    publicBrief: string;
    knownFacts: unknown;
    personaHints: unknown;
    unknowns: unknown;
    exemplarLines: unknown;
    statePatchCount: number;
  }>;
  turns: Array<{
    id: string;
    role: string;
    speakerRouteBCharacterId: string | null;
    addresseeRouteBCharacterId: string | null;
    visibilityScope: string | null;
    content: string;
    statePatchCount: number;
    createdAt: string;
  }>;
  visibilityProof: {
    ownerOnlyRead: true;
    scopedTurnColumnsPersisted: boolean;
    thirdPartyVisibleForDirectMessage: false;
  };
};
