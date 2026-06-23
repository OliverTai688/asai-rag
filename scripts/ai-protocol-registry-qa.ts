import {
  ASAI_AGENT_PROTOCOL_MANIFESTS,
  EXPECTED_AGENT_PROTOCOL_IDS,
  type AgentProtocolManifest,
} from "../src/domains/ai-protocol/manifest";

type Check = {
  label: string;
  status: "pass" | "fail";
  detail?: string;
};

const checks: Check[] = [];

const forbiddenValuePatterns = [
  /sk-[A-Za-z0-9_-]{12,}/,
  /(?:OPENAI|ANTHROPIC|AUTH|DATABASE|DIRECT)_?[A-Z_]*(?:KEY|URL|SECRET)/i,
  /BEGIN (?:RSA |OPENSSH |PRIVATE )?KEY/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /09\d{2}[-\s]?\d{3}[-\s]?\d{3}/,
  /\bpolicyNumber\b/i,
  /\brawPrompt\b/i,
  /\brawProviderPayload\b/i,
  /\brawPrivateTranscript\b/i,
  /\bprivateTranscriptText\b/i,
  /\bproviderPayload\b/i,
  /\brawAudio\b/i,
  /\bpaymentData\b/i,
  /\bcookie\b/i,
  /\botp\b/i,
];

const sourceAdoptionRequirements: Record<string, { ownerRefs: string[]; evidenceRefs: string[]; commands: string[] }> = {
  "asai.chat.assistant": {
    ownerRefs: [
      "src/app/api/ai/chat/route.ts",
      "src/lib/assistant/assistant-chat-repository.ts",
      "src/lib/assistant/assistant-tools.ts",
    ],
    evidenceRefs: ["ASSISTANT_TOOLS", "ensureAssistantConversation", "persistAssistantChatSuccess", "persistAssistantChatFailure"],
    commands: ["pnpm ai:bff-audit", "pnpm ai:protocol-registry-qa"],
  },
  "asai.visit.preparation_package": {
    ownerRefs: [
      "src/app/api/ai/visit/route.ts",
      "src/app/(dashboard)/pre-visit/[planId]/page.tsx",
      "src/app/api/visits/[id]/relationship-confirmation-state/route.ts",
      "src/app/api/visits/[id]/route-b-red-line-context/route.ts",
      "src/app/api/visits/[id]/meeting-relationship-signals/route.ts",
      "src/domains/visit/ai-evidence-dto.ts",
      "src/domains/visit/relationship-confirmation.ts",
      "src/domains/visit/relationship-confirmation-state.ts",
      "src/domains/visit/meeting-relationship-signal.ts",
      "src/domains/visit/route-b-red-line-context.ts",
      "src/domains/theater/visit-handoff.ts",
      "src/lib/visits/visit-plan-repository.ts",
      "src/lib/visits/route-b-red-line-context-repository.ts",
      "src/lib/visits/meeting-relationship-signal-repository.ts",
    ],
    evidenceRefs: [
      "buildProviderSafeClientSnapshot",
      "buildAiEvidenceSummary",
      "enrichSpinQuestionsWithReasoning",
      "buildVisitRelationshipConfirmationDeck",
      "buildVisitRelationshipConfirmationStateBoundary",
      "buildVisitMeetingRelationshipSignalDeck",
      "getVisitMeetingRelationshipSignalDeckForMember",
      "relationship-graph-prep-confirmation-cards",
      "relationship-confirmation-card-state-boundary",
      "relationship-confirmation-state-ui-boundary",
      "relationship-confirmation-theater-handoff-grounding",
      "meeting-notes-relationship-confirmation-signal",
      "RelationshipConfirmationPanel.data-relationship-confirmation-state-boundary",
      "VisitRelationshipConfirmationDeck.proof.writesConfirmedCrmFact=false",
      "VisitRelationshipConfirmationStateBoundary.storageDecision.currentPersistence=local-only-ui-state",
      "VisitRelationshipConfirmationStateBoundary.storageDecision.requiresProductDecision=true",
      "VisitRelationshipConfirmationStateBoundary.proof.persistedToDatabase=false",
      "VisitRelationshipConfirmationStateBoundary.proof.writesConfirmedCrmFact=false",
      "VisitMeetingRelationshipSignalDeck.writebackBoundary.currentPersistence=deterministic-preview-only",
      "VisitMeetingRelationshipSignalDeck.proof.writesConfirmedCrmFact=false",
      "VisitMeetingRelationshipSignalBffDto.proof.browserSuppliedSessionId=false",
      "VisitMeetingRelationshipSignalBffDto.proof.writesRelationshipGraph=false",
      "MeetingRelationshipSignalPanel.data-meeting-relationship-signal-cards",
      "VisitTheaterHandoff.sourceSummary.evidenceSummary.relationshipConfirmation",
      "VisitTheaterRelationshipConfirmationHandoffSummary.localAdvisorStatePersisted=false",
      "VisitTheaterRelationshipConfirmationHandoffSummary.providerCallAttempted=false",
      "VisitTheaterRelationshipConfirmationHandoffSummary.writesConfirmedCrmFact=false",
      "buildVisitRouteBRedLineContextFromFeedbackReview",
      "getVisitRouteBRedLineContextForMember",
      "VisitRouteBRedLineContextBffDto.proof.browserSuppliedTheaterSessionId=false",
      "VisitQuestionEvidence.source=theater_route_b_red_line",
      "updateVisitPlanForMember",
    ],
    commands: [
      "pnpm ai:bff-audit",
      "pnpm ai:protocol-registry-qa",
      "pnpm bff:visit-report-ai-qa",
      "pnpm visit:theater-handoff-dry-run",
      "pnpm visit:relationship-confirmation-dry-run",
      "pnpm visit:relationship-confirmation-state-boundary-dry-run",
      "pnpm visit:relationship-confirmation-state-ui-qa",
      "pnpm visit:meeting-relationship-signal-dry-run",
      "pnpm visit:meeting-relationship-signal-bff-ui-qa",
      "pnpm visit:route-b-red-line-context-dry-run",
      "pnpm visit:route-b-red-line-context-bff-qa",
    ],
  },
  "asai.report.generation": {
    ownerRefs: [
      "src/app/api/ai/report/route.ts",
      "src/lib/report/report-repository.ts",
      "src/lib/report/report-dto.ts",
    ],
    evidenceRefs: ["buildProviderSafeClientSnapshot", "buildAiEvidenceSummary", "toReportDto", "clientSections"],
    commands: ["pnpm ai:bff-audit", "pnpm ai:protocol-registry-qa", "pnpm bff:visit-report-ai-qa", "pnpm bff:reports-qa"],
  },
  "asai.spin.advisor": {
    ownerRefs: [
      "src/app/api/ai/spin/route.ts",
      "src/app/api/ai/spin-suggestions/route.ts",
      "src/lib/spin/spin-session-repository.ts",
    ],
    evidenceRefs: ["SPIN_PHASES", "isAllowedPhaseTransition", "persistAiGenerationSuccess", "persistAiGenerationFailure"],
    commands: ["pnpm ai:bff-audit", "pnpm ai:protocol-registry-qa", "pnpm spin:source-truth-qa"],
  },
  "asai.interview.companion": {
    ownerRefs: [
      "src/app/api/ai/interview/route.ts",
      "src/app/api/ai/interview/outputs/route.ts",
      "src/lib/interview/interview-ai-repository.ts",
      "src/lib/interview/interview-persistence-repository.ts",
      "src/lib/interview/interview-writeback-repository.ts",
      "src/domains/interview/writeback-boundary.ts",
    ],
    evidenceRefs: [
      "interviewRequestSchema",
      "outputRequestSchema",
      "buildAdvisorMemoryLoopContext",
      "persistInterviewTurnSuccess",
      "persistInterviewOutputSuccess",
      "persistInterviewFailure",
      "createPersistentInterviewSession",
      "appendPersistentInterviewTurn",
      "createPersistentInterviewReflection",
      "getInterviewWritebackPreview",
      "saveInterviewWritebackConfirmation",
      "evaluateInterviewWriteback",
      "createDraftWritebacks",
    ],
    commands: [
      "pnpm ai:bff-audit",
      "pnpm ai:protocol-registry-qa",
      "pnpm interview:cross-mode-qa",
      "pnpm interview:draft-writeback-qa",
    ],
  },
  "asai.interview.quick_capture": {
    ownerRefs: [
      "src/app/api/ai/interview/quick-captures/route.ts",
      "src/domains/interview/quick-capture.ts",
      "src/lib/interview/interview-persistence-repository.ts",
      "src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx",
    ],
    evidenceRefs: [
      "createQuickCaptureBridgeInputSchema",
      "buildQuickCaptureMemoryBridge",
      "createPersistentQuickCaptureBridge",
      "resolveQuickCaptureScope",
      "QuickCaptureBridgeResultDto",
      "QuickCaptureBridgeBlockedDto",
      "providerCallAttempted",
      "aiUsageLogRequired",
      "writesConfirmedCrmFact",
    ],
    commands: [
      "pnpm ai:bff-audit",
      "pnpm ai:protocol-registry-qa",
      "pnpm interview:quick-capture-bff-qa",
      "pnpm interview:quick-capture-ui-qa",
    ],
  },
  "asai.interview.realtime_voice": {
    ownerRefs: [
      "src/app/api/ai/interview/realtime-session/route.ts",
      "src/app/api/ai/interview/realtime-events/route.ts",
      "src/app/api/ai/interview/transcribe/route.ts",
      "src/app/api/ai/interview/transcribe-realtime-session/route.ts",
      "src/lib/interview/realtime-bff.ts",
    ],
    evidenceRefs: [
      "realtimeSessionRequestSchema",
      "realtimeEventSchema",
      "createDryRunRealtimeClientSecret",
      "providerRealtimeSessionRequestEnvelope",
      "providerTranscriptionSessionRequestEnvelope",
      "sanitizeRealtimeClientSecretResponse",
      "findRealtimeEventPayloadViolations",
      "mirrorRealtimeEventToMemoryCandidates",
      "responseContainsServerSecret",
      "writeAiUsageLogSafely",
    ],
    commands: ["pnpm ai:bff-audit", "pnpm ai:protocol-registry-qa", "pnpm interview:realtime-bff-qa"],
  },
  "asai.theater.legacy": {
    ownerRefs: [
      "src/app/api/ai/theater/route.ts",
      "src/app/api/ai/theater/score/route.ts",
      "src/app/api/ai/theater-build/route.ts",
      "src/lib/theater/theater-ai-repository.ts",
      "src/lib/theater/theater-build-ai-repository.ts",
    ],
    evidenceRefs: [
      "theaterRequestSchema",
      "scoreRequestSchema",
      "requestSchema",
      "THEATER_ROUTE_B_REQUIRED",
      "persistTheaterCharacterSuccess",
      "persistTheaterScoreSuccess",
      "persistTheaterBuildSuccess",
      "persistTheaterFailure",
      "persistTheaterBuildFailure",
    ],
    commands: ["pnpm ai:bff-audit", "pnpm ai:protocol-registry-qa"],
  },
  "asai.theater.route_b": {
    ownerRefs: [
      "src/app/api/theater/route-b/runtime/route.ts",
      "src/app/api/theater/route-b/sessions/route.ts",
      "src/app/api/theater/route-b/sessions/[sessionId]/route.ts",
      "src/app/api/theater/route-b/sessions/[sessionId]/turns/route.ts",
      "src/app/api/theater/route-b/sessions/[sessionId]/next-turn/route.ts",
      "src/app/api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate/route.ts",
      "src/app/api/theater/route-b/sessions/[sessionId]/append-candidate/route.ts",
      "src/app/api/theater/route-b/sessions/[sessionId]/feedback-review/route.ts",
      "src/app/api/theater/route-b/sessions/[sessionId]/compliance-review-intake/route.ts",
      "src/app/api/theater/route-b/compliance-review-queue/route.ts",
      "src/app/api/theater/route-b/sessions/[sessionId]/red-line-actions/route.ts",
      "src/app/(dashboard)/theater/[sessionId]/page.tsx",
      "src/app/(dashboard)/theater/page.tsx",
      "src/domains/theater/route-b-handoff.ts",
      "src/domains/theater/route-b-orchestration.ts",
      "src/domains/theater/route-b-next-turn.ts",
      "src/domains/theater/route-b-next-turn-provider.ts",
      "src/domains/theater/route-b-next-turn-append.ts",
      "src/domains/theater/route-b-objection-red-line-library.ts",
      "src/domains/theater/route-b-provider-prompt-context.ts",
      "src/domains/theater/route-b-severe-red-line-preview.ts",
      "src/domains/theater/route-b-red-line-action-workflow.ts",
      "src/domains/theater/route-b-feedback.ts",
      "src/domains/theater/route-b-feedback-provider.ts",
      "src/domains/theater/route-b-feedback-review.ts",
      "src/domains/theater/route-b-compliance-review-intake.ts",
      "src/domains/theater/route-b-compliance-review-queue.ts",
      "src/domains/theater/route-b-session.ts",
      "src/lib/theater/route-b-boundary.ts",
      "src/lib/theater/route-b-session-bff-repository.ts",
      "src/lib/theater/route-b-session-repository.ts",
    ],
    evidenceRefs: [
      "RouteBRuntimeInputPreview",
      "runtimeInputPreview.sourceAlignment",
      "runtimeInputPreview.orchestration",
      "RouteBOrchestrationRuntimePreview",
      "validateRouteBHandoffBoundary",
      "isTheaterRouteBHandoffPacket",
      "createRouteBSessionForMember",
      "appendRouteBAdvisorTurnForMember",
      "RouteBSessionSnapshot",
      "buildTheaterRouteBNextTurnDraft",
      "RouteBNextTurnPreviewPanel",
      "TheaterRouteBNextTurnDraft",
      "route-b-next-turn",
      "generatedTextAllowed=false",
      "directPrivateDialogReturned=false",
      "buildTheaterRouteBNextTurnProviderInput",
      "runTheaterRouteBNextTurnProviderContract",
      "route-b-next-turn-provider-candidate",
      "RouteBNextTurnProviderCandidateResponse.usageLogId",
      "TheaterRouteBNextTurnProviderRunResult.aiUsageLogWritten=true",
      "TheaterRouteBNextTurnProviderRunResult.appendCandidate.requiresAdvisorConfirmation=true",
      "TheaterRouteBNextTurnUsageLogRecord.outcome=SUCCESS",
      "TheaterRouteBNextTurnUsageLogRecord.outcome=PROVIDER_ERROR",
      "buildTheaterRouteBNextTurnAppendConfirmation",
      "route-b-next-turn-append-confirmation",
      "appendRouteBNextTurnCandidateForMember",
      "TheaterRouteBNextTurnAppendConfirmation.privacyProof.usageLogIdRequired=true",
      "TheaterRouteBNextTurnAppendConfirmation.privacyProof.noProviderCallInAppend=true",
      "TheaterRouteBNextTurnAppendConfirmation.privacyProof.writesConfirmedCrmFact=false",
      "buildTheaterRouteBStatePatch",
      "buildTheaterRouteBOrchestrationPlan",
      "TheaterRouteBOrchestrationPlan",
      "TheaterRouteBDirectorDirective",
      "TheaterRouteBDirectorDirective.guardEvidence.privateHistoryScopedToAddressee",
      "buildTheaterRouteBFeedbackContract",
      "TheaterRouteBFeedbackContract",
      "RouteBFeedbackRuntimePreview",
      "runtimeInputPreview.feedback",
      "ROUTE_B_FEEDBACK_PERSPECTIVES",
      "ROUTE_B_SEVERE_RED_LINES",
      "ROUTE_B_OBJECTION_LIBRARY",
      "ROUTE_B_RED_LINE_RULES",
      "buildRouteBObjectionRedLineLibrarySummary",
      "selectRouteBObjectionPrompts",
      "buildRouteBRedLineReviewPlan",
      "buildRouteBProviderPromptContext",
      "buildRouteBSevereRedLineWarningPreview",
      "buildRouteBSevereRedLineActionWorkflow",
      "buildRouteBRedLineActionRecordsFromStateMap",
      "buildRouteBRedLineActionPersistenceState",
      "RouteBSevereRedLineWarningPreview",
      "RouteBSevereRedLineActionWorkflow",
      "RouteBRedLineActionPersistenceState",
      "RouteBSessionSnapshot.scene.redLineActionState",
      "route-b-red-line-action-feedback-consumption",
      "TheaterRouteBFeedbackReview.redLineActionState",
      "TheaterRouteBFeedbackReview.redLineFindings.actionContext",
      "TheaterRouteBFeedbackReview.redLineActionState.consumedByFeedbackReview=true",
      "TheaterRouteBFeedbackReview.redLineActionState.triggersExternalNotification=false",
      "buildRouteBComplianceReviewIntakeFromFeedbackReview",
      "route-b-red-line-compliance-review-intake",
      "RouteBComplianceReviewIntake.candidateCount",
      "RouteBComplianceReviewCandidate.reviewStatus",
      "RouteBComplianceReviewCandidate.evidenceRefs",
      "RouteBComplianceReviewIntake.reviewBoundary.createsFormalFinding=false",
      "RouteBComplianceReviewIntake.reviewBoundary.triggersExternalNotification=false",
      "RouteBComplianceReviewIntake.reviewBoundary.providerCallAttempted=false",
      "RouteBComplianceReviewIntake.reviewBoundary.writesConfirmedCrmFact=false",
      "RouteBComplianceReviewIntake.persistenceBoundary.persistsCandidateRecord=false",
      "buildRouteBComplianceReviewQueue",
      "route-b-red-line-compliance-review-queue",
      "RouteBComplianceReviewQueue.itemCount",
      "RouteBComplianceReviewQueue.candidateCount",
      "RouteBComplianceReviewQueue.reviewBoundary.createsFormalFinding=false",
      "RouteBComplianceReviewQueue.reviewBoundary.triggersExternalNotification=false",
      "RouteBComplianceReviewQueue.reviewBoundary.providerCallAttempted=false",
      "RouteBComplianceReviewQueue.reviewBoundary.writesConfirmedCrmFact=false",
      "RouteBComplianceReviewQueue.persistenceBoundary.persistsQueueRecord=false",
      "RouteBSevereRedLineWarningPanel",
      "route-b-severe-red-line-warning-preview",
      "route-b-severe-red-line-action-workflow",
      "route-b-severe-red-line-action-persistence",
      "RouteBSevereRedLineWarningPreview.warningCount=5",
      "RouteBSevereRedLineWarningPreview.displayRules.doNotProvideLegalAdvice=true",
      "RouteBSevereRedLineWarningPreview.displayRules.doNotTreatAsComplianceFindingWithoutEvidence=true",
      "RouteBSevereRedLineActionWorkflow.persistenceEnvelope.currentPersistence=owner-scoped-scene-state",
      "RouteBRedLineActionPersistenceState.persistenceEnvelope.ownerScopedSessionOnly=true",
      "RouteBRedLineActionState.EVIDENCE_NEEDED",
      "RouteBRedLineActionState.NOT_APPLICABLE",
      "RouteBRedLineActionState.ESCALATE",
      "RouteBRedLineActionReasonCode.EVIDENCE_PENDING",
      "RouteBRedLineActionReasonCode.FALSE_POSITIVE_CONTEXT",
      "RouteBRedLineActionReasonCode.ESCALATION_REQUESTED",
      "RouteBRedLineActionWorkflow.providerBoundary.providerCallAttempted=false",
      "RouteBRedLineActionWorkflow.persistenceEnvelope.writesConfirmedCrmFact=false",
      "getRouteBRedLineActionStateForMember",
      "updateRouteBRedLineActionStateForMember",
      "TheaterRouteBNextTurnProviderInput.promptContext",
      "TheaterRouteBFeedbackProviderInput.promptContext",
      "TheaterRouteBFeedbackProviderInput.redLineReview.allRules.length=18",
      "totalScoreAllowed=false",
      "rankingAllowed=false",
      "buildTheaterRouteBFeedbackProviderInput",
      "runTheaterRouteBFeedbackProviderContract",
      "TheaterRouteBFeedbackProviderRunResult.aiUsageLogWritten=true",
      "TheaterRouteBFeedbackUsageLogRecord.outcome=SUCCESS",
      "TheaterRouteBFeedbackUsageLogRecord.outcome=PROVIDER_ERROR",
      "buildTheaterRouteBFeedbackReview",
      "isTheaterRouteBFeedbackReview",
      "route-b-feedback-persistence",
      "createRouteBFeedbackReviewForMember",
      "getRouteBFeedbackReviewForMember",
      "RouteBFeedbackReviewPanel",
      "TheaterRouteBFeedbackReview.outputContract.totalScoreAllowed=false",
      "TheaterRouteBFeedbackReview.outputContract.rankingAllowed=false",
      "TheaterRouteBFeedbackReview.persistenceEnvelope.writesConfirmedCrmFact=false",
      "TheaterRouteBFeedbackReview.redLineLibrary.redLineRuleCount=18",
      "providerCallAttempted=false",
      "writesConfirmedCrmFact=false",
    ],
    commands: [
      "pnpm ai:bff-audit",
      "pnpm ai:protocol-registry-qa",
      "pnpm theater:route-b-runtime-qa",
      "pnpm theater:route-b-interaction-qa",
      "pnpm theater:route-b-orchestration-dry-run",
      "pnpm theater:route-b-next-turn-dry-run",
      "pnpm theater:route-b-next-turn-ui-contract-qa",
      "pnpm theater:route-b-next-turn-provider-dry-run",
      "pnpm theater:route-b-next-turn-provider-route-qa",
      "pnpm theater:route-b-next-turn-append-dry-run",
      "pnpm theater:route-b-objection-red-line-library-dry-run",
      "pnpm theater:route-b-provider-prompt-context-dry-run",
      "pnpm theater:route-b-severe-red-line-preview-dry-run",
      "pnpm theater:route-b-red-line-action-workflow-dry-run",
      "pnpm theater:route-b-red-line-action-persistence-qa",
      "pnpm theater:route-b-feedback-dry-run",
      "pnpm theater:route-b-feedback-provider-dry-run",
      "pnpm theater:route-b-feedback-review-qa",
      "pnpm theater:route-b-compliance-review-intake-qa",
      "pnpm theater:route-b-compliance-review-queue-qa",
    ],
  },
  "asai.rag.private_beta": {
    ownerRefs: [
      "src/app/api/rag/route.ts",
      "src/domains/rag/services/rag.service.ts",
      "scripts/rag-launch-posture-qa.mjs",
    ],
    evidenceRefs: [
      "querySchema",
      "RAG_DISABLED_FOR_PRIVATE_BETA",
      "launchPosture=disabled_guarded",
      "providerAttempted=false",
      "countRagUsage",
    ],
    commands: ["pnpm ai:bff-audit", "pnpm ai:protocol-registry-qa", "pnpm rag:launch-posture-qa"],
  },
};

runQa();

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function runQa() {
  const manifests = ASAI_AGENT_PROTOCOL_MANIFESTS;
  const ids = manifests.map((manifest) => manifest.identity.agentId);
  const uniqueIds = new Set(ids);
  const expectedIds = new Set<string>(EXPECTED_AGENT_PROTOCOL_IDS);
  const missingIds = [...expectedIds].filter((id) => !uniqueIds.has(id));
  const extraIds = ids.filter((id) => !expectedIds.has(id));
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

  push(manifests.length === EXPECTED_AGENT_PROTOCOL_IDS.length, "manifest count matches NAP-001 inventory", `count=${manifests.length}`);
  push(missingIds.length === 0, "no expected agent id is missing", missingIds.join(", "));
  push(extraIds.length === 0, "no unexpected agent id is present", extraIds.join(", "));
  push(duplicateIds.length === 0, "agent ids are unique", duplicateIds.join(", "));

  for (const manifest of manifests) {
    assertManifestShape(manifest);
    assertPublicationGate(manifest);
    assertUsagePolicy(manifest);
    assertProofCommands(manifest);
    assertSourceAdoption(manifest);
    assertNoForbiddenValues(manifest);
  }

  assertMeetingRouteBRedLineContextConsumption(manifests);
  assertMeetingNotesHubQuarantine(manifests);
  assertMeetingQuickNoteWritebackBridge(manifests);
  assertVisitMeetingRelationshipSignal(manifests);

  const readinessSummary = manifests.reduce<Record<string, number>>((summary, manifest) => {
    summary[manifest.registry.readiness] = (summary[manifest.registry.readiness] ?? 0) + 1;
    return summary;
  }, {});

  push(
    !("external-ready" in readinessSummary) && !("external-registered" in readinessSummary),
    "no manifest claims external-ready or external-registered",
    JSON.stringify(readinessSummary),
  );
}

function assertManifestShape(manifest: AgentProtocolManifest) {
  const prefix = manifest.identity.agentId;
  push(Boolean(manifest.identity.displayName), `${prefix} has display name`);
  push(Boolean(manifest.identity.ownerSurface), `${prefix} has owner surface`);
  push(Boolean(manifest.identity.version), `${prefix} has version`);
  push(manifest.capabilities.length > 0, `${prefix} has at least one capability`);
  push(
    manifest.interfaces.endpoints.length > 0 || manifest.interfaces.actions.length > 0,
    `${prefix} has endpoint or action boundary`,
  );
  push(manifest.interfaces.exportTargets.length === 4, `${prefix} declares four protocol-neutral export targets`);
  push(manifest.schemas.inputDtoRefs.length > 0, `${prefix} has input DTO refs`);
  push(manifest.schemas.outputDtoRefs.length > 0, `${prefix} has output DTO refs`);
  push(manifest.schemas.evidenceDtoRefs.length > 0, `${prefix} has evidence DTO refs`);
  push(Boolean(manifest.schemas.dtoBoundary), `${prefix} has DTO boundary note`);
  push(Boolean(manifest.auth.scopeDerivation), `${prefix} has auth scope derivation`);
  push(manifest.dataClasses.allowed.length > 0, `${prefix} has allowed data classes`);
  push(manifest.privacy.forbiddenDisclosureCodes.length > 0, `${prefix} has forbidden disclosure codes`);
  push(manifest.proof.knownBlockers.length > 0, `${prefix} has known blockers`);

  for (const endpoint of manifest.interfaces.endpoints) {
    push(endpoint.route.startsWith("/"), `${prefix}.${endpoint.id} route is absolute`, endpoint.route);
    push(endpoint.methods.length > 0, `${prefix}.${endpoint.id} declares methods`);
    push(endpoint.modalities.length > 0, `${prefix}.${endpoint.id} declares modalities`);
  }
}

function assertPublicationGate(manifest: AgentProtocolManifest) {
  const prefix = manifest.identity.agentId;
  push(manifest.registry.externalPublicationApproved === false, `${prefix} external publication is disabled`);
  push(manifest.registry.publicDiscovery === "disabled", `${prefix} public discovery is disabled`);
  push(manifest.registry.signing === "not-configured", `${prefix} signing is not configured`);
  push(manifest.registry.revocation === "not-configured", `${prefix} revocation is not configured`);
  push(
    manifest.interfaces.exportTargets.every((target) => target.publication === "disabled"),
    `${prefix} export targets are internal-only`,
  );
}

function assertUsagePolicy(manifest: AgentProtocolManifest) {
  const prefix = manifest.identity.agentId;
  const providerPostures = new Set(manifest.interfaces.endpoints.map((endpoint) => endpoint.providerPosture));
  const hasProviderReady = providerPostures.has("provider-ready") || providerPostures.has("provider-or-dry-run");
  const isPrototype = manifest.identity.status === "prototype";

  if (hasProviderReady) {
    push(manifest.quotaCost.quotaGate === "canUseAiModule", `${prefix} provider path has quota gate`);
    push(
      manifest.quotaCost.aiUsageLogPolicy === "success-and-error" ||
        manifest.quotaCost.aiUsageLogPolicy === "session-marker-or-provider-success-error",
      `${prefix} provider path requires AiUsageLog success/error or session marker`,
    );
  }

  if (isPrototype) {
    push(manifest.quotaCost.aiUsageLogPolicy === "not-accepted-prototype", `${prefix} prototype does not claim usage policy`);
    push(manifest.registry.readiness === "internal-only", `${prefix} prototype remains internal-only`);
  }

  if (manifest.quotaCost.providerCostPosture === "deterministic-no-provider") {
    push(
      manifest.quotaCost.aiUsageLogPolicy === "not-required-no-provider",
      `${prefix} deterministic no-provider route does not fake usage`,
    );
  }
}

function assertProofCommands(manifest: AgentProtocolManifest) {
  const prefix = manifest.identity.agentId;

  push(manifest.proof.commands.includes("pnpm ai:protocol-registry-qa"), `${prefix} includes protocol registry QA`);

  if (manifest.identity.status !== "prototype") {
    push(manifest.proof.commands.includes("pnpm ai:bff-audit"), `${prefix} includes AI BFF audit`);
  }
}

function assertSourceAdoption(manifest: AgentProtocolManifest) {
  const prefix = manifest.identity.agentId;
  const requirement = sourceAdoptionRequirements[prefix];

  if (!requirement) {
    return;
  }

  const adoption = manifest.proof.sourceAdoption;

  push(Boolean(adoption), `${prefix} declares NAP-003 source adoption evidence`);

  if (!adoption) {
    return;
  }

  push(adoption.status === "adopted", `${prefix} NAP-003 source adoption is adopted`, adoption.status);
  push(adoption.notes.length > 0, `${prefix} has NAP-003 source adoption notes`);

  for (const ownerRef of requirement.ownerRefs) {
    push(adoption.ownerRefs.includes(ownerRef), `${prefix} source owner includes ${ownerRef}`);
  }

  for (const evidenceRef of requirement.evidenceRefs) {
    push(adoption.evidenceRefs.includes(evidenceRef), `${prefix} evidence refs include ${evidenceRef}`);
  }

  for (const command of requirement.commands) {
    push(manifest.proof.commands.includes(command), `${prefix} proof commands include ${command}`);
  }
}

function assertNoForbiddenValues(manifest: AgentProtocolManifest) {
  const prefix = manifest.identity.agentId;
  const serialized = JSON.stringify(manifest);
  const matchedPatterns = forbiddenValuePatterns
    .filter((pattern) => pattern.test(serialized))
    .map((pattern) => pattern.source);

  push(matchedPatterns.length === 0, `${prefix} has no forbidden sentinel values`, matchedPatterns.join(", "));
}

function assertMeetingRouteBRedLineContextConsumption(manifests: AgentProtocolManifest[]) {
  const manifest = manifests.find((item) => item.identity.agentId === "asai.meeting.prototype");
  push(Boolean(manifest), "meeting manifest exists for Route B red-line context consumption");

  if (!manifest?.proof.sourceAdoption) {
    return;
  }

  push(
    manifest.capabilities.some((capability) => capability.id === "meeting-route-b-red-line-context-consumption"),
    "meeting manifest declares Route B red-line context consumption capability",
  );
  push(
    manifest.interfaces.actions.some((action) => action.id === "consume-route-b-red-line-context-in-meeting-notes"),
    "meeting manifest declares Route B red-line context action boundary",
  );
  push(
    manifest.interfaces.endpoints.some((endpoint) => endpoint.id === "visit-route-b-red-line-context"),
    "meeting manifest references visit red-line context endpoint",
  );
  push(
    manifest.proof.commands.includes("pnpm meeting:route-b-red-line-context-qa"),
    "meeting proof commands include Route B red-line context QA",
  );

  const adoption = manifest.proof.sourceAdoption;
  const requiredOwnerRefs = [
    "src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx",
    "src/components/meeting/meeting-workspace.tsx",
    "src/app/api/visits/[id]/route-b-red-line-context/route.ts",
    "src/lib/visits/route-b-red-line-context-repository.ts",
    "scripts/meeting-route-b-red-line-context-qa.mjs",
  ];
  const requiredEvidenceRefs = [
    "meeting-route-b-red-line-context-consumption",
    "meeting-route-b-red-line-context",
    "buildRouteBRedLineNoteDraft",
    "MeetingRouteBRedLineContextDto",
    "VisitRouteBRedLineContextBffDto.proof.browserSuppliedTheaterSessionId=false",
    "VisitRouteBRedLineContextBffDto.proof.browserSuppliedPersonId=false",
    "VisitRouteBRedLineContextBffDto.proof.triggersExternalNotification=false",
  ];

  for (const ownerRef of requiredOwnerRefs) {
    push(adoption.ownerRefs.includes(ownerRef), `meeting Route B red-line owner includes ${ownerRef}`);
  }

  for (const evidenceRef of requiredEvidenceRefs) {
    push(adoption.evidenceRefs.includes(evidenceRef), `meeting Route B red-line evidence includes ${evidenceRef}`);
  }
}

function assertMeetingNotesHubQuarantine(manifests: AgentProtocolManifest[]) {
  const manifest = manifests.find((item) => item.identity.agentId === "asai.meeting.prototype");
  push(Boolean(manifest), "meeting manifest exists for notes hub quarantine");

  if (!manifest?.proof.sourceAdoption) {
    return;
  }

  push(
    manifest.capabilities.some((capability) => capability.id === "meeting-notes-hub-quarantine"),
    "meeting manifest declares notes hub quarantine capability",
  );
  push(
    manifest.interfaces.actions.some((action) => action.id === "open-notes-hub-to-accepted-workspaces"),
    "meeting manifest declares notes hub quarantine action boundary",
  );
  push(
    manifest.interfaces.endpoints.some((endpoint) => endpoint.id === "notes-hub-entrypoint"),
    "meeting manifest references notes hub entrypoint",
  );
  push(
    manifest.proof.commands.includes("pnpm meeting:notes-hub-quarantine-qa"),
    "meeting proof commands include notes hub quarantine QA",
  );

  const adoption = manifest.proof.sourceAdoption;
  const requiredOwnerRefs = [
    "src/app/(dashboard)/notes/page.tsx",
    "scripts/meeting-notes-hub-quarantine-qa.mjs",
  ];
  const requiredEvidenceRefs = [
    "meeting-notes-hub-quarantine",
    "notes-hub-quarantine",
    "local-note-store-disabled",
    "accepted-source=/pre-visit/[planId]/notes",
    "prototype-unaccepted",
  ];

  for (const ownerRef of requiredOwnerRefs) {
    push(adoption.ownerRefs.includes(ownerRef), `meeting notes hub owner includes ${ownerRef}`);
  }

  for (const evidenceRef of requiredEvidenceRefs) {
    push(adoption.evidenceRefs.includes(evidenceRef), `meeting notes hub evidence includes ${evidenceRef}`);
  }
}

function assertMeetingQuickNoteWritebackBridge(manifests: AgentProtocolManifest[]) {
  const manifest = manifests.find((item) => item.identity.agentId === "asai.meeting.prototype");
  push(Boolean(manifest), "meeting manifest exists for quick-note writeback bridge");

  if (!manifest?.proof.sourceAdoption) {
    return;
  }

  push(
    manifest.capabilities.some((capability) => capability.id === "meeting-visit-quick-note-writeback-bridge"),
    "meeting manifest declares quick-note writeback bridge capability",
  );
  push(
    manifest.interfaces.actions.some((action) => action.id === "append-visit-meeting-quick-note-to-writeback"),
    "meeting manifest declares quick-note writeback bridge action boundary",
  );
  push(
    manifest.schemas.outputDtoRefs.includes("VisitMeetingQuickNoteWritebackBridgeDto"),
    "meeting manifest output DTOs include VisitMeetingQuickNoteWritebackBridgeDto",
  );
  push(
    manifest.schemas.evidenceDtoRefs.includes("VisitMeetingQuickNoteWritebackBridgeDto.safety.directCrmWriteDisabled=true"),
    "meeting manifest evidence includes direct CRM write disabled bridge",
  );
  push(
    manifest.proof.commands.includes("pnpm meeting:quick-note-writeback-bridge-qa"),
    "meeting proof commands include quick-note writeback bridge QA",
  );

  const adoption = manifest.proof.sourceAdoption;
  const requiredOwnerRefs = [
    "src/lib/interview/meeting-session-repository.ts",
    "src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx",
    "src/components/meeting/meeting-workspace.tsx",
    "scripts/meeting-quick-note-writeback-bridge-qa.mjs",
  ];
  const requiredEvidenceRefs = [
    "buildVisitMeetingQuickNoteWritebackBridge",
    "post-visit-meeting-writeback-bridge",
    "visit-meeting-quick-note-writeback-bridge",
    "summaryEndpointPattern: /api/ai/meeting/sessions/[sessionId]/summary",
    "writebackEndpointPattern: /api/ai/meeting/sessions/[sessionId]/writebacks",
    "VisitMeetingQuickNoteWritebackBridgeDto.status=summary_required",
    "VisitMeetingQuickNoteWritebackBridgeDto.safety.directCrmWriteDisabled=true",
  ];

  for (const ownerRef of requiredOwnerRefs) {
    push(adoption.ownerRefs.includes(ownerRef), `meeting quick-note writeback owner includes ${ownerRef}`);
  }

  for (const evidenceRef of requiredEvidenceRefs) {
    push(adoption.evidenceRefs.includes(evidenceRef), `meeting quick-note writeback evidence includes ${evidenceRef}`);
  }
}

function assertVisitMeetingRelationshipSignal(manifests: AgentProtocolManifest[]) {
  const manifest = manifests.find((item) => item.identity.agentId === "asai.visit.preparation_package");
  push(Boolean(manifest), "visit manifest exists for meeting relationship signal");

  if (!manifest?.proof.sourceAdoption) {
    return;
  }

  push(
    manifest.capabilities.some((capability) => capability.id === "meeting-notes-relationship-confirmation-signal"),
    "visit manifest declares meeting relationship signal capability",
  );
  push(
    manifest.interfaces.actions.some((action) => action.id === "meeting-notes-relationship-confirmation-signal"),
    "visit manifest declares meeting relationship signal action boundary",
  );
  push(
    manifest.schemas.inputDtoRefs.includes("VisitMeetingRelationshipSignalInput"),
    "visit manifest input DTOs include VisitMeetingRelationshipSignalInput",
  );
  push(
    manifest.schemas.inputDtoRefs.includes("MeetingWritebackCandidate"),
    "visit manifest input DTOs include MeetingWritebackCandidate",
  );
  push(
    manifest.schemas.outputDtoRefs.includes("VisitMeetingRelationshipSignalDeck"),
    "visit manifest output DTOs include VisitMeetingRelationshipSignalDeck",
  );
  push(
    manifest.schemas.outputDtoRefs.includes("VisitMeetingRelationshipSignalBffDto"),
    "visit manifest output DTOs include VisitMeetingRelationshipSignalBffDto",
  );
  push(
    manifest.schemas.evidenceDtoRefs.includes(
      "VisitMeetingRelationshipSignalDeck.writebackBoundary.currentPersistence=deterministic-preview-only",
    ),
    "visit manifest evidence includes deterministic preview boundary",
  );
  push(
    manifest.schemas.evidenceDtoRefs.includes("VisitMeetingRelationshipSignalDeck.proof.writesConfirmedCrmFact=false"),
    "visit manifest evidence includes no confirmed CRM fact write",
  );
  push(
    manifest.proof.commands.includes("pnpm visit:meeting-relationship-signal-dry-run"),
    "visit proof commands include meeting relationship signal dry-run",
  );
  push(
    manifest.proof.commands.includes("pnpm visit:meeting-relationship-signal-bff-ui-qa"),
    "visit proof commands include meeting relationship signal BFF/UI QA",
  );

  const adoption = manifest.proof.sourceAdoption;
  const requiredOwnerRefs = [
    "src/app/api/visits/[id]/meeting-relationship-signals/route.ts",
    "src/lib/visits/meeting-relationship-signal-repository.ts",
    "src/domains/visit/meeting-relationship-signal.ts",
    "scripts/visit-meeting-relationship-signal-bff-ui-qa.mjs",
    "scripts/visit-meeting-relationship-signal-dry-run.mjs",
    "scripts/visit-meeting-relationship-signal-dry-run.ts",
  ];
  const requiredEvidenceRefs = [
    "buildVisitMeetingRelationshipSignalDeck",
    "meetingWritebackCandidateToRelationshipSignal",
    "getVisitMeetingRelationshipSignalDeckForMember",
    "VISIT_MEETING_RELATIONSHIP_SIGNAL_ALLOWED_FIELDS",
    "meeting-notes-relationship-confirmation-signal",
    "VisitMeetingRelationshipSignalDeck.writebackBoundary.currentPersistence=deterministic-preview-only",
    "VisitMeetingRelationshipSignalDeck.writebackBoundary.writesRelationshipGraph=false",
    "VisitMeetingRelationshipSignalDeck.writebackBoundary.writesVisitPlan=false",
    "VisitMeetingRelationshipSignalDeck.proof.persistedToDatabase=false",
    "VisitMeetingRelationshipSignalDeck.proof.writesConfirmedCrmFact=false",
    "VisitMeetingRelationshipSignalBffDto.proof.ownerScopedMeetingSessionLookup=true",
    "VisitMeetingRelationshipSignalBffDto.proof.browserSuppliedSessionId=false",
    "VisitMeetingRelationshipSignalBffDto.proof.writesRelationshipGraph=false",
    "VisitMeetingRelationshipSignalBffDto.proof.writesVisitPlan=false",
    "MeetingRelationshipSignalPanel.data-meeting-relationship-signal-cards",
    "/api/visits/[id]/meeting-relationship-signals",
  ];

  for (const ownerRef of requiredOwnerRefs) {
    push(adoption.ownerRefs.includes(ownerRef), `visit meeting relationship signal owner includes ${ownerRef}`);
  }

  for (const evidenceRef of requiredEvidenceRefs) {
    push(adoption.evidenceRefs.includes(evidenceRef), `visit meeting relationship signal evidence includes ${evidenceRef}`);
  }
}

function push(condition: boolean, label: string, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
