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

export type VisitRelationshipConfirmationPersistenceOptionId =
  | "visit-plan-json-subdocument"
  | "dedicated-relationship-confirmation-state-table";

export type VisitRelationshipConfirmationPersistenceDecisionStatus =
  | "product_schema_decision_required";

export interface VisitRelationshipConfirmationStatePersistenceOption {
  id: VisitRelationshipConfirmationPersistenceOptionId;
  label: string;
  status: "candidate_requires_product_decision";
  persistenceTarget: string;
  migrationRequired: true;
  migrationNote: string;
  rollbackNote: string;
  bestWhen: string;
  tradeoffs: string[];
  minimumAllowedFields: readonly VisitRelationshipConfirmationStateAllowedField[];
  forbiddenFields: readonly string[];
  proofCommand: "pnpm visit:relationship-confirmation-state-boundary-dry-run";
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
    decisionStatus: VisitRelationshipConfirmationPersistenceDecisionStatus;
    requiresProductDecision: true;
    selectedOption: null;
    minimumAllowedFields: readonly VisitRelationshipConfirmationStateAllowedField[];
    forbiddenFields: readonly string[];
    candidateOptions: readonly VisitRelationshipConfirmationStatePersistenceOption[];
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

export const VISIT_RELATIONSHIP_CONFIRMATION_STATE_ALLOWED_FIELDS = [
  "cardId",
  "state",
  "updatedAt",
  "sourceReferenceIds",
  "safeNoteSummary",
] as const satisfies readonly (keyof VisitRelationshipConfirmationStateRecord)[];

export type VisitRelationshipConfirmationStateAllowedField =
  (typeof VISIT_RELATIONSHIP_CONFIRMATION_STATE_ALLOWED_FIELDS)[number];

export const VISIT_RELATIONSHIP_CONFIRMATION_STATE_FORBIDDEN_FIELDS = [
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
] as const;

export const VISIT_RELATIONSHIP_CONFIRMATION_STATE_PERSISTENCE_OPTIONS: readonly VisitRelationshipConfirmationStatePersistenceOption[] =
  [
    {
      id: "visit-plan-json-subdocument",
      label: "VisitPlan-owned JSON subdocument",
      status: "candidate_requires_product_decision",
      persistenceTarget: "VisitPlan.relationshipConfirmationState",
      migrationRequired: true,
      migrationNote:
        "Add an additive nullable VisitPlan JSON subdocument owned by the visit-plan repository; write only the allowlisted card state envelope and backfill existing rows as null.",
      rollbackNote:
        "Ship a code rollback that stops reading the subdocument, then remove the nullable JSON field in a later migration; no CRM facts or provider payload rows are created.",
      bestWhen:
        "The state only needs to reload with one preparation package and does not need cross-plan querying or per-card audit history.",
      tradeoffs: [
        "Simpler owner scope because the state lives with VisitPlan.",
        "Less queryable and can increase VisitPlan row churn.",
        "Rollback must coordinate VisitPlan read/write code before field removal.",
      ],
      minimumAllowedFields: VISIT_RELATIONSHIP_CONFIRMATION_STATE_ALLOWED_FIELDS,
      forbiddenFields: VISIT_RELATIONSHIP_CONFIRMATION_STATE_FORBIDDEN_FIELDS,
      proofCommand: "pnpm visit:relationship-confirmation-state-boundary-dry-run",
    },
    {
      id: "dedicated-relationship-confirmation-state-table",
      label: "Dedicated RelationshipConfirmationState table",
      status: "candidate_requires_product_decision",
      persistenceTarget: "RelationshipConfirmationState",
      migrationRequired: true,
      migrationNote:
        "Add a dedicated table scoped by organizationId and visitPlanId with unique visitPlanId+cardId rows; sourceReferenceIds stays structured JSON and safeNoteSummary stays redacted.",
      rollbackNote:
        "Disable the BFF read/write path, verify no runtime dependency remains, then drop the additive table; no VisitPlan content, CRM facts, or provider payload rows are mutated.",
      bestWhen:
        "The product needs per-card write isolation, auditability, or future querying across preparation packages.",
      tradeoffs: [
        "Cleaner persistence boundary and easier audit history.",
        "Requires a new repository, owner-scoped joins, migration, and rollback proof.",
        "Must enforce no direct confirmed CRM fact write from card state.",
      ],
      minimumAllowedFields: VISIT_RELATIONSHIP_CONFIRMATION_STATE_ALLOWED_FIELDS,
      forbiddenFields: VISIT_RELATIONSHIP_CONFIRMATION_STATE_FORBIDDEN_FIELDS,
      proofCommand: "pnpm visit:relationship-confirmation-state-boundary-dry-run",
    },
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
      decisionStatus: "product_schema_decision_required",
      requiresProductDecision: true,
      selectedOption: null,
      minimumAllowedFields: VISIT_RELATIONSHIP_CONFIRMATION_STATE_ALLOWED_FIELDS,
      forbiddenFields: VISIT_RELATIONSHIP_CONFIRMATION_STATE_FORBIDDEN_FIELDS,
      candidateOptions: VISIT_RELATIONSHIP_CONFIRMATION_STATE_PERSISTENCE_OPTIONS,
      reason:
        "VisitPlan has no dedicated relationship confirmation state store. This boundary validates the server-owned envelope only; DB persistence needs an explicit product/schema decision between the listed candidate options.",
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
