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
      "src/domains/visit/ai-evidence-dto.ts",
      "src/lib/visits/visit-plan-repository.ts",
    ],
    evidenceRefs: ["buildProviderSafeClientSnapshot", "buildAiEvidenceSummary", "enrichSpinQuestionsWithReasoning", "updateVisitPlanForMember"],
    commands: ["pnpm ai:bff-audit", "pnpm ai:protocol-registry-qa", "pnpm bff:visit-report-ai-qa"],
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
      "src/app/(dashboard)/theater/[sessionId]/page.tsx",
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
      "RouteBSevereRedLineWarningPreview",
      "RouteBSevereRedLineActionWorkflow",
      "RouteBSevereRedLineWarningPanel",
      "route-b-severe-red-line-warning-preview",
      "route-b-severe-red-line-action-workflow",
      "RouteBSevereRedLineWarningPreview.warningCount=5",
      "RouteBSevereRedLineWarningPreview.displayRules.doNotProvideLegalAdvice=true",
      "RouteBSevereRedLineWarningPreview.displayRules.doNotTreatAsComplianceFindingWithoutEvidence=true",
      "RouteBSevereRedLineActionWorkflow.persistenceEnvelope.currentPersistence=ui-local-only",
      "RouteBRedLineActionState.EVIDENCE_NEEDED",
      "RouteBRedLineActionState.NOT_APPLICABLE",
      "RouteBRedLineActionState.ESCALATE",
      "RouteBRedLineActionWorkflow.providerBoundary.providerCallAttempted=false",
      "RouteBRedLineActionWorkflow.persistenceEnvelope.writesConfirmedCrmFact=false",
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
      "pnpm theater:route-b-feedback-dry-run",
      "pnpm theater:route-b-feedback-provider-dry-run",
      "pnpm theater:route-b-feedback-review-qa",
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

function push(condition: boolean, label: string, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
