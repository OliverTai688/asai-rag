import type { MeetingWritebackCandidate } from "../src/domains/interview/meeting-writeback-boundary";
import {
  buildVisitMeetingRelationshipSignalDeck,
  meetingQuickNoteWritebackBridgeToRelationshipSignal,
  meetingWritebackCandidateReviewContextToRelationshipSignals,
  meetingWritebackCandidateToRelationshipSignal,
} from "../src/domains/visit/meeting-relationship-signal";

const emailSentinel = "meeting.relationship.signal@example.com";
const phoneSentinel = "0912-888-777";
const policySentinel = "保單號 AB12345678";
const now = "2026-06-23T07:58:47.889Z";

const quickNoteWritebackBridge = {
  sourceActionId: "visit-meeting-quick-note-writeback-bridge",
  status: "summary_required",
  acceptedWorkspaceHref: "/pre-visit/visit_plan_meeting_relationship_signal/meeting",
  targetSurface: "/pre-visit/[planId]/meeting",
  summaryEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/summary",
  writebackEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/writebacks",
  requirements: {
    persistedSummaryRequired: true,
    advisorConfirmationRequired: true,
    reasonRiskAcceptedForSensitive: true,
  },
  safety: {
    providerCallAttempted: false,
    aiUsageLogRequired: false,
    browserSuppliedSessionId: false,
    rawPrivateTranscriptStored: false,
    storesRawProviderPayload: false,
    writesConfirmedCrmFact: false,
    directCrmWriteDisabled: true,
  },
} as const;

const writebackCandidate: MeetingWritebackCandidate = {
  id: "candidate-spouse-decision-context",
  kind: "INFERENCE",
  sourceType: "MEETING_DECISION",
  sourceItemId: "decision-1",
  text: "可能是配偶主導保單決策，但仍要確認家庭關係脈絡。",
  target: "INTERVIEW_INSIGHT",
  dataClass: "INFERENCE",
  sensitivity: "SENSITIVE",
  citationTurnIds: ["turn-spouse-1"],
  supportingMemoryIds: ["memory-spouse-1"],
  canSelect: true,
  requiresReason: false,
  crmWritebackCandidate: false,
  writesConfirmedCrmFact: false,
  reviewContext: [
    {
      source: "theater_route_b_feedback_profile",
      target: "MEETING_WRITEBACK_PREVIEW_CONTEXT",
      contextCardId: "ctx-spouse-decision",
      status: "inference",
      targetLabel: "配偶",
      fieldLabel: "決策角色",
      label: "配偶決策旁證",
      detail: `Route B 回饋指出配偶可能參與保單決策，${emailSentinel}，${phoneSentinel}`,
      followUpQuestion: "下一次拜訪先確認配偶是否共同參與保障配置決策。",
      requiresAdvisorConfirmation: true,
      persistedSummaryRequired: true,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesClientProfile: false,
      writesPolicy: false,
      writesConfirmedCrmFact: false,
    },
    {
      source: "theater_route_b_feedback_profile",
      target: "MEETING_WRITEBACK_PREVIEW_CONTEXT",
      contextCardId: "ctx-beneficiary-unknown",
      status: "unknown",
      targetLabel: "家庭受益人",
      fieldLabel: "未知安排",
      label: "受益人待確認",
      detail: `${policySentinel} 相關受益人安排仍不明；raw provider payload should not leak`,
      followUpQuestion: "請確認受益人排序與小孩教育金是否需要一併調整。",
      requiresAdvisorConfirmation: true,
      persistedSummaryRequired: true,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesClientProfile: false,
      writesPolicy: false,
      writesConfirmedCrmFact: false,
    },
  ],
};

const deck = buildVisitMeetingRelationshipSignalDeck({
  visitPlanId: "visit_plan_meeting_relationship_signal",
  clientId: "client_meeting_relationship_signal",
  generatedAt: now,
  signals: [
    {
      id: "quick-note-family",
      sourceType: "MEETING_QUICK_NOTE",
      text: `顧問快記：客戶說配偶會一起決策，電話 ${phoneSentinel}，${emailSentinel}`,
      dataClass: "CONFIRMED",
      sourceReferenceIds: ["visit-meeting-quick-note.turn-1", emailSentinel],
    },
    meetingQuickNoteWritebackBridgeToRelationshipSignal(quickNoteWritebackBridge, {
      id: "quick-note-writeback-bridge",
      quickNoteTurnId: "turn-quick-note-1",
      meetingSessionId: "meeting-session-source-owned",
    }),
    meetingWritebackCandidateToRelationshipSignal(writebackCandidate),
    ...meetingWritebackCandidateReviewContextToRelationshipSignals(writebackCandidate),
    {
      id: "open-question-income",
      sourceType: "MEETING_OPEN_QUESTION",
      text: `是否要確認收入與 ${policySentinel} 的保費壓力？ raw private transcript should not leak`,
      dataClass: "UNKNOWN",
      sourceReferenceIds: ["meeting-question.income"],
    },
  ],
});

const failures: string[] = [];
const serialized = JSON.stringify(deck);

if (deck.agentId !== "asai.visit.preparation_package") failures.push("unexpected agent id");
if (deck.sourceActionId !== "meeting-notes-relationship-confirmation-signal") {
  failures.push("unexpected source action id");
}
if (deck.visitPlanId !== "visit_plan_meeting_relationship_signal") failures.push("visit plan id mismatch");
if (deck.summary.cardCount !== 6) failures.push(`expected 6 cards, got ${deck.summary.cardCount}`);
if (deck.summary.confirmedCount !== 1) failures.push("confirmed count mismatch");
if (deck.summary.inferenceCount !== 2) failures.push("inference count mismatch");
if (deck.summary.unknownCount !== 3) failures.push("unknown count mismatch");
if (deck.summary.highPriorityCount === 0) failures.push("expected at least one high-priority card");
if (deck.summary.meetingSourceCount === 0) failures.push("source references should be counted");
if (deck.writebackBoundary.currentPersistence !== "deterministic-preview-only") {
  failures.push("writeback boundary should remain deterministic preview only");
}
if (deck.writebackBoundary.writesRelationshipGraph) failures.push("must not write relationship graph");
if (deck.writebackBoundary.writesVisitPlan) failures.push("must not write visit plan");
if (!deck.writebackBoundary.requiresAdvisorConfirmation) failures.push("advisor confirmation should be required");
if (!deck.writebackBoundary.acceptedSourceTypes.includes("MEETING_QUICK_NOTE")) {
  failures.push("quick note source should be accepted");
}
if (!deck.writebackBoundary.acceptedSourceTypes.includes("MEETING_QUICK_NOTE_WRITEBACK_BRIDGE")) {
  failures.push("quick note writeback bridge source should be accepted");
}
if (!deck.writebackBoundary.acceptedSourceTypes.includes("MEETING_WRITEBACK_REVIEW_CONTEXT")) {
  failures.push("meeting writeback review context source should be accepted");
}
if (deck.proof.providerCallAttempted) failures.push("provider call should be false");
if (deck.proof.aiUsageLogWritten) failures.push("ai usage log should be false for no-provider proof");
if (deck.proof.writesConfirmedCrmFact) failures.push("confirmed CRM fact write should be false");
if (deck.proof.persistedToDatabase) failures.push("DB persistence should be false");
if (deck.proof.externalRegistryPublication) failures.push("external registry publication should be false");
if (serialized.includes(emailSentinel) || serialized.includes(phoneSentinel) || serialized.includes("AB12345678")) {
  failures.push("private contact or policy sentinel leaked");
}
if (serialized.includes("raw private transcript")) {
  failures.push("raw private transcript text leaked");
}
if (!serialized.includes("[redacted-email]") || !serialized.includes("[redacted-phone]")) {
  failures.push("contact redaction evidence missing");
}
if (!serialized.includes("[redacted-policy]") || !serialized.includes("[redacted-raw-payload]")) {
  failures.push("policy/raw payload redaction evidence missing");
}
if (!deck.cards.some((card) => card.sourceReferenceIds.includes("meeting-turn.turn-spouse-1"))) {
  failures.push("meeting writeback citation turn source reference missing");
}
if (!deck.cards.some((card) => card.sourceReferenceIds.includes("meeting-memory.memory-spouse-1"))) {
  failures.push("meeting writeback memory source reference missing");
}
if (!deck.cards.some((card) => card.sourceType === "MEETING_WRITEBACK_REVIEW_CONTEXT")) {
  failures.push("meeting writeback review context cards missing");
}
if (!deck.cards.some((card) => card.sourceType === "MEETING_QUICK_NOTE_WRITEBACK_BRIDGE")) {
  failures.push("quick note writeback bridge card missing");
}
if (!deck.cards.some((card) => card.sourceReferenceIds.includes("meeting-writeback-review-context.ctx-spouse-decision"))) {
  failures.push("meeting writeback review context source reference missing");
}
if (!deck.cards.some((card) => card.sourceReferenceIds.includes("direct-crm-write-disabled"))) {
  failures.push("quick note bridge direct CRM write boundary missing");
}
if (!deck.cards.some((card) => card.sourceReferenceIds.includes("browser-session-id-disabled"))) {
  failures.push("quick note bridge browser session id boundary missing");
}
if (!deck.cards.some((card) => card.recommendedAction === "ASK_IN_NEXT_VISIT")) {
  failures.push("unknown meeting signals should become next-visit questions");
}
if (!deck.cards.some((card) => card.recommendedAction === "CREATE_CONFIRMATION_CARD")) {
  failures.push("inference meeting signals should become confirmation cards");
}
if (!deck.cards.some((card) => card.recommendedAction === "KEEP_AS_CONTEXT")) {
  failures.push("confirmed meeting signals should remain context until advisor confirmation");
}

const expectedAllowedFields = [
  "id",
  "title",
  "sourceType",
  "sourceLabel",
  "safeSummary",
  "evidenceStatus",
  "recommendedAction",
  "priority",
  "confirmationPrompt",
  "sourceReferenceIds",
];
const expectedForbiddenFields = [
  "rawPrivateTranscript",
  "rawProviderPayload",
  "privateTranscriptText",
  "providerPayload",
  "confirmedCrmFact",
  "email",
  "phone",
  "policyNumber",
  "secret",
  "token",
  "cookie",
  "otp",
];

if (!sameStringSet(deck.writebackBoundary.minimumAllowedFields, expectedAllowedFields)) {
  failures.push("minimum allowed fields drifted");
}
if (!sameStringSet(deck.writebackBoundary.forbiddenFields, expectedForbiddenFields)) {
  failures.push("forbidden fields drifted");
}

for (const card of deck.cards) {
  const disallowedKeys = Object.keys(card).filter(
    (key) => ![...expectedAllowedFields, "guardrails"].includes(key),
  );

  if (disallowedKeys.length > 0) {
    failures.push(`card ${card.id} leaked disallowed keys: ${disallowedKeys.join(", ")}`);
  }
  if (card.guardrails.providerCallAttempted) failures.push(`card ${card.id} attempted provider`);
  if (card.guardrails.writesConfirmedCrmFact) failures.push(`card ${card.id} writes confirmed CRM fact`);
  if (card.guardrails.persistedToDatabase) failures.push(`card ${card.id} persisted to DB`);
}

if (failures.length > 0) {
  console.error(`visit meeting relationship signal dry-run failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      sourceActionId: deck.sourceActionId,
      cardCount: deck.summary.cardCount,
      evidenceStatuses: Array.from(new Set(deck.cards.map((card) => card.evidenceStatus))).sort(),
      recommendedActions: Array.from(new Set(deck.cards.map((card) => card.recommendedAction))).sort(),
      sourceTypes: Array.from(new Set(deck.cards.map((card) => card.sourceType))).sort(),
      currentPersistence: deck.writebackBoundary.currentPersistence,
      providerCallAttempted: deck.proof.providerCallAttempted,
      writesConfirmedCrmFact: deck.proof.writesConfirmedCrmFact,
      persistedToDatabase: deck.proof.persistedToDatabase,
    },
    null,
    2,
  ),
);

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return [...left].sort().join("|") === [...right].sort().join("|");
}
