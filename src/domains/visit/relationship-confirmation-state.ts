import type { VisitRelationshipConfirmationDeck } from "./relationship-confirmation";

export const VISIT_RELATIONSHIP_CONFIRMATION_ADVISOR_STATES = [
  "needs_confirmation",
  "confirmed_in_meeting",
  "ask_in_interview",
] as const;

export type VisitRelationshipConfirmationAdvisorState =
  (typeof VISIT_RELATIONSHIP_CONFIRMATION_ADVISOR_STATES)[number];

export interface VisitRelationshipConfirmationStateInput {
  cardId: string;
  state: VisitRelationshipConfirmationAdvisorState;
  updatedAt?: string;
  safeNoteSummary?: string;
}

export interface VisitRelationshipConfirmationStateRecord {
  cardId: string;
  state: VisitRelationshipConfirmationAdvisorState;
  updatedAt: string;
  sourceReferenceIds: string[];
  safeNoteSummary?: string;
}

export interface VisitRelationshipConfirmationStateBoundary {
  agentId: "asai.visit.preparation_package";
  sourceActionId: "relationship-confirmation-card-state-boundary";
  visitPlanId: string;
  clientId: string;
  generatedAt: string;
  summary: {
    cardCount: number;
    acceptedRecordCount: number;
    droppedRecordCount: number;
    confirmedCount: number;
    askInInterviewCount: number;
    needsConfirmationCount: number;
  };
  records: VisitRelationshipConfirmationStateRecord[];
  storageDecision: {
    currentPersistence: "local-only-ui-state";
    proposedPersistence: "visit-relationship-confirmation-state";
    requiresProductDecision: true;
    minimumAllowedFields: Array<keyof VisitRelationshipConfirmationStateRecord>;
    forbiddenFields: string[];
    reason: string;
  };
  proof: {
    ownerScopedVisitPlanRequired: true;
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesConfirmedCrmFact: false;
    storesRawProviderPayload: false;
    rawPrivateTranscriptIncluded: false;
    externalRegistryPublication: false;
    persistedToDatabase: false;
  };
}

interface VisitRelationshipConfirmationStateBoundaryInput {
  visitPlanId: string;
  clientId: string;
  deck: VisitRelationshipConfirmationDeck;
  states?: VisitRelationshipConfirmationStateInput[];
  now?: string;
}

const MINIMUM_ALLOWED_FIELDS: Array<keyof VisitRelationshipConfirmationStateRecord> = [
  "cardId",
  "state",
  "updatedAt",
  "sourceReferenceIds",
  "safeNoteSummary",
];

const FORBIDDEN_FIELDS = [
  "personName",
  "relation",
  "evidenceDetail",
  "confirmationPrompt",
  "rawPrivateTranscript",
  "rawProviderPayload",
  "confirmedCrmFact",
  "email",
  "phone",
  "policyNumber",
];

const CONTACT_EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TAIWAN_MOBILE_PATTERN = /09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g;
const MAX_SAFE_NOTE_SUMMARY_LENGTH = 240;

export function buildVisitRelationshipConfirmationStateBoundary(
  input: VisitRelationshipConfirmationStateBoundaryInput,
): VisitRelationshipConfirmationStateBoundary {
  const generatedAt = input.now ?? new Date().toISOString();
  const cardById = new Map(input.deck.cards.map((card) => [card.id, card]));
  const inputByCardId = new Map<string, VisitRelationshipConfirmationStateInput>();
  let droppedRecordCount = 0;

  for (const stateInput of input.states ?? []) {
    const cardId = stateInput.cardId.trim();

    if (!cardById.has(cardId)) {
      droppedRecordCount += 1;
      continue;
    }

    inputByCardId.set(cardId, {
      ...stateInput,
      cardId,
    });
  }

  const records = input.deck.cards.map((card) => {
    const selected = inputByCardId.get(card.id);
    const safeNoteSummary = sanitizeSafeNoteSummary(selected?.safeNoteSummary);
    return {
      cardId: card.id,
      state: selected?.state ?? "needs_confirmation",
      updatedAt: normalizeUpdatedAt(selected?.updatedAt, generatedAt),
      sourceReferenceIds: [...card.sourceReferenceIds],
      ...(safeNoteSummary ? { safeNoteSummary } : {}),
    } satisfies VisitRelationshipConfirmationStateRecord;
  });

  return {
    agentId: "asai.visit.preparation_package",
    sourceActionId: "relationship-confirmation-card-state-boundary",
    visitPlanId: input.visitPlanId,
    clientId: input.clientId,
    generatedAt,
    summary: {
      cardCount: input.deck.summary.cardCount,
      acceptedRecordCount: records.length,
      droppedRecordCount,
      confirmedCount: records.filter((record) => record.state === "confirmed_in_meeting").length,
      askInInterviewCount: records.filter((record) => record.state === "ask_in_interview").length,
      needsConfirmationCount: records.filter((record) => record.state === "needs_confirmation").length,
    },
    records,
    storageDecision: {
      currentPersistence: "local-only-ui-state",
      proposedPersistence: "visit-relationship-confirmation-state",
      requiresProductDecision: true,
      minimumAllowedFields: MINIMUM_ALLOWED_FIELDS,
      forbiddenFields: FORBIDDEN_FIELDS,
      reason:
        "VisitPlan has no dedicated relationship confirmation state store. This boundary validates the server-owned envelope only; DB persistence needs an explicit product/schema decision.",
    },
    proof: {
      ownerScopedVisitPlanRequired: true,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      externalRegistryPublication: false,
      persistedToDatabase: false,
    },
  };
}

export function isVisitRelationshipConfirmationAdvisorState(
  value: unknown,
): value is VisitRelationshipConfirmationAdvisorState {
  return VISIT_RELATIONSHIP_CONFIRMATION_ADVISOR_STATES.includes(
    value as VisitRelationshipConfirmationAdvisorState,
  );
}

function normalizeUpdatedAt(value: string | undefined, fallback: string): string {
  if (!value?.trim()) {
    return fallback;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return fallback;
  }

  return timestamp.toISOString();
}

function sanitizeSafeNoteSummary(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return undefined;
  }

  return normalized
    .replace(CONTACT_EMAIL_PATTERN, "[redacted-email]")
    .replace(TAIWAN_MOBILE_PATTERN, "[redacted-phone]")
    .slice(0, MAX_SAFE_NOTE_SUMMARY_LENGTH)
    .trim();
}
