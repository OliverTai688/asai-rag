export type AgentProtocolRegistryReadiness =
  | "internal-only"
  | "registry-draft"
  | "external-ready"
  | "external-registered";

export type AgentProtocolStatus = "active" | "guarded-disabled" | "prototype" | "planned";

export type AgentProtocolModule = "CHAT" | "INTERVIEW" | "RAG" | "REPORT" | "SPIN" | "THEATER" | "VISIT";

export type AgentProtocolProviderPosture =
  | "provider-ready"
  | "provider-or-dry-run"
  | "deterministic-no-provider"
  | "event-mirror-no-external-provider"
  | "guarded-disabled"
  | "prototype-only";

export type AgentProtocolExportTarget = "nanda-agentfacts-json" | "mcp-descriptor" | "a2a-agent-card" | "https-metadata";

export type AgentProtocolExportStatus = "internal-draft" | "not-applicable";

export type AgentProtocolPublicationStatus = "disabled";

export type AgentProtocolAiUsageLogPolicy =
  | "success-and-error"
  | "not-required-no-provider"
  | "session-marker-or-provider-success-error"
  | "blocked-until-provider-proof"
  | "not-accepted-prototype";

export type AgentProtocolSourceAdoptionStatus = "pending" | "partial" | "adopted";

export type AgentProtocolDataClass =
  | "PUBLIC_METADATA"
  | "INTERNAL_METADATA"
  | "CLIENT_FACTS"
  | "CLIENT_INFERENCES"
  | "CLIENT_UNKNOWNS"
  | "HIGH_SENSITIVITY_APPROVAL"
  | "CONVERSATION_SUMMARY"
  | "VOICE_TRANSCRIPT_SUMMARY"
  | "AUDIO_BINARY"
  | "STAGE_STATE"
  | "PAYMENT_PROHIBITED"
  | "PROTOTYPE_UNCOMMITTED";

export type AgentProtocolForbiddenDisclosureCode =
  | "PROMPT_TEXT"
  | "PROVIDER_REQUEST_RESPONSE"
  | "DIRECT_PRIVATE_DIALOG"
  | "PERSONAL_CONTACT"
  | "POLICY_IDENTIFIER"
  | "CREDENTIAL_VALUE"
  | "PAYMENT_VALUE"
  | "AUDIO_BINARY"
  | "ORG_INTERNAL_BREAK_GLASS_REASON";

export interface AgentProtocolManifest {
  identity: {
    agentId: string;
    displayName: string;
    ownerSurface: string;
    module: AgentProtocolModule;
    version: string;
    status: AgentProtocolStatus;
  };
  capabilities: AgentProtocolCapability[];
  interfaces: {
    endpoints: AgentProtocolEndpoint[];
    actions: AgentProtocolAction[];
    exportTargets: AgentProtocolTarget[];
  };
  schemas: {
    inputDtoRefs: string[];
    outputDtoRefs: string[];
    evidenceDtoRefs: string[];
    dtoBoundary: string;
  };
  auth: {
    sessionType: "app-member" | "platform" | "client-portal" | "not-accepted";
    scopeDerivation: string;
    roleRestrictions: string[];
  };
  dataClasses: {
    allowed: AgentProtocolDataClass[];
    restricted: AgentProtocolDataClass[];
    persisted: AgentProtocolDataClass[];
  };
  privacy: {
    retention: string;
    redaction: string;
    forbiddenDisclosureCodes: AgentProtocolForbiddenDisclosureCode[];
    leastDisclosureNote: string;
  };
  quotaCost: {
    quotaGate: "canUseAiModule" | "not-required-no-provider" | "not-accepted-prototype";
    aiUsageLogPolicy: AgentProtocolAiUsageLogPolicy;
    providerCostPosture: AgentProtocolProviderPosture;
  };
  proof: {
    sourceAuditModule: AgentProtocolModule | "PROTOTYPE";
    commands: string[];
    sourceAdoption?: {
      status: AgentProtocolSourceAdoptionStatus;
      ownerRefs: string[];
      evidenceRefs: string[];
      notes: string[];
    };
    knownBlockers: string[];
  };
  registry: {
    readiness: AgentProtocolRegistryReadiness;
    externalPublicationApproved: false;
    publicDiscovery: "disabled";
    signing: "not-configured";
    revocation: "not-configured";
    compatibilityNote: string;
  };
}

export interface AgentProtocolCapability {
  id: string;
  label: string;
  summary: string;
  humanTrigger: string;
}

export interface AgentProtocolEndpoint {
  id: string;
  route: string;
  methods: ("GET" | "POST" | "PATCH" | "DELETE")[];
  providerPosture: AgentProtocolProviderPosture;
  launchPosture: "available" | "guarded" | "prototype";
  modalities: ("text" | "voice" | "structured-json" | "stage-turn" | "metadata")[];
}

export interface AgentProtocolAction {
  id: string;
  label: string;
  actionBoundary: string;
}

export interface AgentProtocolTarget {
  target: AgentProtocolExportTarget;
  status: AgentProtocolExportStatus;
  publication: AgentProtocolPublicationStatus;
}

const defaultExportTargets: AgentProtocolTarget[] = [
  { target: "nanda-agentfacts-json", status: "internal-draft", publication: "disabled" },
  { target: "mcp-descriptor", status: "internal-draft", publication: "disabled" },
  { target: "a2a-agent-card", status: "internal-draft", publication: "disabled" },
  { target: "https-metadata", status: "internal-draft", publication: "disabled" },
];

const standardForbiddenDisclosureCodes: AgentProtocolForbiddenDisclosureCode[] = [
  "PROMPT_TEXT",
  "PROVIDER_REQUEST_RESPONSE",
  "DIRECT_PRIVATE_DIALOG",
  "PERSONAL_CONTACT",
  "POLICY_IDENTIFIER",
  "CREDENTIAL_VALUE",
  "PAYMENT_VALUE",
  "AUDIO_BINARY",
];

const commonRegistry = {
  readiness: "internal-only",
  externalPublicationApproved: false,
  publicDiscovery: "disabled",
  signing: "not-configured",
  revocation: "not-configured",
  compatibilityNote: "Internal manifest only. External publication requires operator approval and adapter proof.",
} as const;

const commonProofCommands = ["pnpm ai:bff-audit", "pnpm ai:protocol-registry-qa"];

export const ASAI_AGENT_PROTOCOL_MANIFESTS: AgentProtocolManifest[] = [
  {
    identity: {
      agentId: "asai.chat.assistant",
      displayName: "問誠問 AI",
      ownerSurface: "global assistant / dashboard shell",
      module: "CHAT",
      version: "2026-06-21.nap-003a",
      status: "active",
    },
    capabilities: [
      {
        id: "advisor-chat",
        label: "Advisor assistant chat",
        summary: "Answers advisor questions and can prepare allowed tool intents inside the member workspace.",
        humanTrigger: "Advisor opens 問誠問 AI.",
      },
    ],
    interfaces: {
      endpoints: [
        {
          id: "chat-response",
          route: "/api/ai/chat",
          methods: ["POST"],
          providerPosture: "provider-ready",
          launchPosture: "available",
          modalities: ["text"],
        },
      ],
      actions: [{ id: "persist-conversation", label: "Persist assistant conversation", actionBoundary: "Member-scoped conversation and message persistence." }],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["chatRequestSchema"],
      outputDtoRefs: ["AssistantConversation", "AssistantMessage"],
      evidenceDtoRefs: ["AiUsageLog", "AssistantConversation.id"],
      dtoBoundary: "Conversation content is app-internal and never exported in registry metadata.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember derives organization, member, and unit scope.",
      roleRestrictions: ["member workspace"],
    },
    dataClasses: {
      allowed: ["INTERNAL_METADATA", "CONVERSATION_SUMMARY"],
      restricted: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
      persisted: ["CONVERSATION_SUMMARY", "INTERNAL_METADATA"],
    },
    privacy: {
      retention: "Conversation retention follows assistant workspace persistence policy.",
      redaction: "Registry export may include capability labels only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "Export only identity, capability, route shape, and audit posture.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "success-and-error",
      providerCostPosture: "provider-ready",
    },
    proof: {
      sourceAuditModule: "CHAT",
      commands: commonProofCommands,
      sourceAdoption: {
        status: "adopted",
        ownerRefs: [
          "src/app/api/ai/chat/route.ts",
          "src/lib/assistant/assistant-chat-repository.ts",
          "src/lib/assistant/assistant-tools.ts",
        ],
        evidenceRefs: [
          "chatRequestSchema",
          "ASSISTANT_TOOLS",
          "executeAssistantTool",
          "ensureAssistantConversation",
          "persistAssistantChatSuccess",
          "persistAssistantChatFailure",
        ],
        notes: [
          "Route scope comes from requireCurrentMember and canUseAiModule before the provider path.",
          "Conversation and message persistence are owned by assistant-chat-repository, including success and error AiUsageLog paths.",
          "Assistant tool execution is restricted to the local allowlist and resolves client/team scope from the trusted session.",
        ],
      },
      knownBlockers: ["External registry publication approval is missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.interview.companion",
      displayName: "AI 了解客戶",
      ownerSurface: "/interview",
      module: "INTERVIEW",
      version: "2026-06-21.nap-003b",
      status: "active",
    },
    capabilities: [
      {
        id: "advisor-companion-interview",
        label: "Advisor companion interview",
        summary: "Runs Park-style client discovery, memory, reflection, planning, and confirmation-card flows.",
        humanTrigger: "Advisor starts or resumes AI 了解客戶.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "interview-turn", route: "/api/ai/interview", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "available", modalities: ["text"] },
        { id: "interview-output", route: "/api/ai/interview/outputs", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "available", modalities: ["structured-json"] },
        { id: "interview-session", route: "/api/ai/interview/sessions", methods: ["POST"], providerPosture: "deterministic-no-provider", launchPosture: "available", modalities: ["metadata"] },
        { id: "interview-writeback", route: "/api/ai/interview/sessions/[sessionId]/writebacks", methods: ["GET", "POST"], providerPosture: "deterministic-no-provider", launchPosture: "available", modalities: ["metadata"] },
      ],
      actions: [
        { id: "memory-reflection-plan", label: "Memory, reflection, and plan", actionBoundary: "Confirmed facts, inferences, and unknowns stay separated." },
      ],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["interviewRequestSchema", "interviewOutputRequestSchema", "createInterviewSessionInputSchema", "interviewWritebackInputSchema"],
      outputDtoRefs: ["InterviewSessionDto", "InterviewOutputDraft", "InterviewWritebackPreview"],
      evidenceDtoRefs: ["InterviewMemory.id", "supportingMemoryIds", "AiUsageLog"],
      dtoBoundary: "Only summary capability metadata may be exported; writeback content remains app-internal.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember and owner-scoped persisted session checks.",
      roleRestrictions: ["member owner", "no org aggregate detail access"],
    },
    dataClasses: {
      allowed: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "CONVERSATION_SUMMARY", "HIGH_SENSITIVITY_APPROVAL"],
      restricted: ["VOICE_TRANSCRIPT_SUMMARY", "STAGE_STATE"],
      persisted: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "CONVERSATION_SUMMARY"],
    },
    privacy: {
      retention: "Persisted interview sessions and memory follow member workspace retention.",
      redaction: "Registry export may reference DTO names and evidence fields only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "Keep memory text and direct dialog content outside protocol metadata.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "success-and-error",
      providerCostPosture: "provider-ready",
    },
    proof: {
      sourceAuditModule: "INTERVIEW",
      commands: [...commonProofCommands, "pnpm interview:cross-mode-qa", "pnpm interview:draft-writeback-qa"],
      sourceAdoption: {
        status: "adopted",
        ownerRefs: [
          "src/app/api/ai/interview/route.ts",
          "src/app/api/ai/interview/outputs/route.ts",
          "src/lib/interview/interview-ai-repository.ts",
          "src/lib/interview/interview-persistence-repository.ts",
          "src/lib/interview/interview-writeback-repository.ts",
          "src/domains/interview/writeback-boundary.ts",
          "src/domains/interview/reflection-planning.ts",
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
        notes: [
          "Provider turn/output routes use requireCurrentMember, canUseAiModule, server-side client context, memory-loop evidence, and success/error AiUsageLog helpers.",
          "Persistent sessions, turns, memories, and reflections are owner-scoped and keep confirmed facts, inferences, and unknowns separated before writeback.",
          "Writeback confirmation keeps high-sensitivity approvals explicit and can create visit/theater drafts without writing inference as confirmed CRM fact.",
        ],
      },
      knownBlockers: ["External registry publication approval is missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.interview.quick_capture",
      displayName: "Post-visit quick capture",
      ownerSurface: "/pre-visit/[planId]/notes",
      module: "INTERVIEW",
      version: "2026-06-21.nap-003b",
      status: "active",
    },
    capabilities: [
      {
        id: "quick-capture-to-memory",
        label: "Quick capture to Park memory",
        summary: "Converts advisor notes into memory candidates, narrator questions, and theater state proposals.",
        humanTrigger: "Advisor sends a post-visit quick capture.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "quick-capture", route: "/api/ai/interview/quick-captures", methods: ["POST"], providerPosture: "deterministic-no-provider", launchPosture: "available", modalities: ["metadata"] },
      ],
      actions: [{ id: "safe-memory-proposal", label: "Safe memory proposal", actionBoundary: "Does not write confirmed CRM facts." }],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["createQuickCaptureBridgeInputSchema"],
      outputDtoRefs: ["QuickCaptureBridgeResponseDto"],
      evidenceDtoRefs: ["memoryCandidates", "theaterStateProposals", "narratorQuestions"],
      dtoBoundary: "Response returns ids and safe summaries, not note body material.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "Server session derives organization, member, client, and visit scope.",
      roleRestrictions: ["member owner"],
    },
    dataClasses: {
      allowed: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "STAGE_STATE", "HIGH_SENSITIVITY_APPROVAL"],
      restricted: ["CONVERSATION_SUMMARY"],
      persisted: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "STAGE_STATE"],
    },
    privacy: {
      retention: "Quick-capture memory retention follows interview memory policy.",
      redaction: "Registry export may state deterministic no-provider posture only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "No direct note body or contact identifiers in metadata.",
    },
    quotaCost: {
      quotaGate: "not-required-no-provider",
      aiUsageLogPolicy: "not-required-no-provider",
      providerCostPosture: "deterministic-no-provider",
    },
    proof: {
      sourceAuditModule: "INTERVIEW",
      commands: [...commonProofCommands, "pnpm interview:quick-capture-bff-qa", "pnpm interview:quick-capture-ui-qa"],
      sourceAdoption: {
        status: "adopted",
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
        notes: [
          "Quick-capture is deterministic no-provider: BFF and UI proof require providerCallAttempted=false and unchanged AiUsageLog counts.",
          "Server session and persistence scope override any client-provided organization/member/client scope and keep owner-only reads/writes.",
          "High-sensitivity approval gates persistence, responses do not echo direct note text, and CRM confirmed facts are not written from quick-capture proposals.",
        ],
      },
      knownBlockers: ["External registry publication approval is missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.interview.realtime_voice",
      displayName: "Chinese realtime voice interview",
      ownerSurface: "/interview voice beta",
      module: "INTERVIEW",
      version: "2026-06-21.nap-003b",
      status: "active",
    },
    capabilities: [
      {
        id: "voice-session-and-transcription",
        label: "Voice session and transcription",
        summary: "Mints realtime voice sessions or transcription paths with no audio retention by default.",
        humanTrigger: "Advisor starts voice beta after consent.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "realtime-session", route: "/api/ai/interview/realtime-session", methods: ["POST"], providerPosture: "provider-or-dry-run", launchPosture: "available", modalities: ["voice", "metadata"] },
        { id: "realtime-events", route: "/api/ai/interview/realtime-events", methods: ["POST"], providerPosture: "event-mirror-no-external-provider", launchPosture: "available", modalities: ["metadata"] },
        { id: "transcribe", route: "/api/ai/interview/transcribe", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "available", modalities: ["voice"] },
      ],
      actions: [{ id: "voice-memory-candidate", label: "Voice memory candidate", actionBoundary: "Transcript summary enters memory pipeline after consent." }],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["realtimeSessionRequestSchema", "realtimeEventSchema", "transcription form-data bounds"],
      outputDtoRefs: ["RealtimeSessionResponse", "RealtimeEventMirrorResponse", "TranscriptionResponse"],
      evidenceDtoRefs: ["AiUsageLog", "session marker", "audioRetentionDisabled"],
      dtoBoundary: "Protocol metadata cannot contain audio binary, credential values, or dialog content.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember and quota guard before external provider session.",
      roleRestrictions: ["member workspace"],
    },
    dataClasses: {
      allowed: ["VOICE_TRANSCRIPT_SUMMARY", "CONVERSATION_SUMMARY", "INTERNAL_METADATA"],
      restricted: ["AUDIO_BINARY", "CLIENT_FACTS", "CLIENT_INFERENCES"],
      persisted: ["VOICE_TRANSCRIPT_SUMMARY", "INTERNAL_METADATA"],
    },
    privacy: {
      retention: "Audio binary is not retained by default; transcript summary follows interview memory policy.",
      redaction: "Registry export may include consent and retention posture only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "No audio binary, credential value, or dialog body in protocol metadata.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "session-marker-or-provider-success-error",
      providerCostPosture: "provider-or-dry-run",
    },
    proof: {
      sourceAuditModule: "INTERVIEW",
      commands: [...commonProofCommands, "pnpm interview:realtime-bff-qa"],
      sourceAdoption: {
        status: "adopted",
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
        notes: [
          "Dry-run session proof mints only local ephemeral test tokens and must not call external providers.",
          "Realtime event mirror uses an allowlist, rejects credential/audio payload fields, and turns final transcript summaries into memory candidates without storing audio binary.",
          "Live session and transcription provider paths are separated from dry-run/event mirror paths and must write success/error AiUsageLog when provider calls are enabled.",
        ],
      },
      knownBlockers: ["Live WebRTC proof and external registry publication approval are missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.spin.advisor",
      displayName: "SPIN advisor",
      ownerSurface: "/spin",
      module: "SPIN",
      version: "2026-06-21.nap-003a",
      status: "active",
    },
    capabilities: [
      {
        id: "spin-conversation",
        label: "SPIN conversation",
        summary: "Guides SPIN conversation and suggestions while preserving the stage machine.",
        humanTrigger: "Advisor uses SPIN session or suggestions.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "spin-chat", route: "/api/ai/spin", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "available", modalities: ["text"] },
        { id: "spin-suggestions", route: "/api/ai/spin-suggestions", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "available", modalities: ["structured-json"] },
      ],
      actions: [{ id: "stage-safe-response", label: "Stage-safe response", actionBoundary: "Must preserve SITUATION to NEED_PAYOFF progression." }],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["spinRequestSchema", "suggestionsRequestSchema"],
      outputDtoRefs: ["SpinAssistantResponse", "SpinSuggestionDto"],
      evidenceDtoRefs: ["AiUsageLog", "SpinSession.stage"],
      dtoBoundary: "State machine identity may be exported, session content may not.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember and DB session permission.",
      roleRestrictions: ["member owner"],
    },
    dataClasses: {
      allowed: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "CONVERSATION_SUMMARY"],
      restricted: ["HIGH_SENSITIVITY_APPROVAL"],
      persisted: ["CONVERSATION_SUMMARY", "CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
    },
    privacy: {
      retention: "SPIN session retention follows member workspace policy.",
      redaction: "Registry export may include capability and state-machine claim only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "Do not export conversation turns or client identifiers.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "success-and-error",
      providerCostPosture: "provider-ready",
    },
    proof: {
      sourceAuditModule: "SPIN",
      commands: [...commonProofCommands, "pnpm spin:source-truth-qa"],
      sourceAdoption: {
        status: "adopted",
        ownerRefs: [
          "src/app/api/ai/spin/route.ts",
          "src/app/api/ai/spin-suggestions/route.ts",
          "src/lib/spin/spin-session-repository.ts",
        ],
        evidenceRefs: [
          "spinRequestSchema",
          "suggestionsRequestSchema",
          "SPIN_PHASES",
          "PHASE_ORDER",
          "isAllowedPhaseTransition",
          "persistAiGenerationSuccess",
          "persistAiGenerationFailure",
        ],
        notes: [
          "Provider routes use requireCurrentMember, canUseAiModule, server-side client lookup, and success/error AiUsageLog helpers.",
          "Persisted SPIN sessions keep SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF ordering through repository transition checks.",
          "Deterministic SPIN source-truth QA remains the accepted proof that session outline/persistence does not need a provider call.",
        ],
      },
      knownBlockers: ["External registry publication approval is missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.visit.preparation_package",
      displayName: "Visit preparation package",
      ownerSurface: "/pre-visit",
      module: "VISIT",
      version: "2026-06-21.nap-003a",
      status: "active",
    },
    capabilities: [
      {
        id: "visit-preparation-generation",
        label: "Generate preparation package",
        summary: "Creates visit preparation reports, question lists, facts, inferences, and unknowns.",
        humanTrigger: "Advisor generates a visit preparation package.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "visit-ai", route: "/api/ai/visit", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "available", modalities: ["structured-json", "text"] },
      ],
      actions: [{ id: "question-rationale", label: "Question rationale", actionBoundary: "Uses provider-safe client snapshot and evidence labels." }],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["visitRequestSchema", "provider-safe client snapshot"],
      outputDtoRefs: ["VisitPreparationPackageDto"],
      evidenceDtoRefs: ["facts", "inferences", "unknowns", "AiUsageLog"],
      dtoBoundary: "Preparation package content remains app-internal unless separately shared by report workflow.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember and server-side client read permission.",
      roleRestrictions: ["member owner"],
    },
    dataClasses: {
      allowed: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "HIGH_SENSITIVITY_APPROVAL"],
      restricted: ["CONVERSATION_SUMMARY"],
      persisted: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
    },
    privacy: {
      retention: "Saved visit plans follow member workspace retention.",
      redaction: "Registry export may include DTO names and provider-ready posture only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "No client contact identifiers or provider exchange content in metadata.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "success-and-error",
      providerCostPosture: "provider-ready",
    },
    proof: {
      sourceAuditModule: "VISIT",
      commands: [...commonProofCommands, "pnpm bff:visit-report-ai-qa"],
      sourceAdoption: {
        status: "adopted",
        ownerRefs: [
          "src/app/api/ai/visit/route.ts",
          "src/domains/visit/ai-evidence-dto.ts",
          "src/domains/visit/reasoning.ts",
          "src/lib/visits/visit-plan-repository.ts",
        ],
        evidenceRefs: [
          "visitRequestSchema",
          "visitOutputSchema",
          "buildProviderSafeClientSnapshot",
          "buildAiEvidenceSummary",
          "enrichSpinQuestionsWithReasoning",
          "updateVisitPlanForMember",
          "persistAiGenerationSuccess",
          "persistAiGenerationFailure",
        ],
        notes: [
          "Provider input is built from a provider-safe client snapshot and server-side client permission lookup.",
          "Question rationale and evidence summary keep facts, inferences, unknowns, and recommendations separate.",
          "Saved VisitPlan persistence is owned by the visit-plan repository, not by provider response metadata.",
        ],
      },
      knownBlockers: ["External registry publication approval is missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.report.generation",
      displayName: "Report generation",
      ownerSurface: "/reports",
      module: "REPORT",
      version: "2026-06-21.nap-003a",
      status: "active",
    },
    capabilities: [
      {
        id: "report-draft-generation",
        label: "Generate report draft",
        summary: "Creates report drafts with fact, inference, unknown, and recommendation boundaries.",
        humanTrigger: "Advisor generates or updates a report draft.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "report-ai", route: "/api/ai/report", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "available", modalities: ["structured-json", "text"] },
      ],
      actions: [{ id: "client-safe-report-mode", label: "Client-safe report mode", actionBoundary: "Public share path uses separate client-safe DTO." }],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["reportRequestSchema", "provider-safe report context"],
      outputDtoRefs: ["ReportDraftDto", "client-safe report sections"],
      evidenceDtoRefs: ["facts", "inferences", "unknowns", "AiUsageLog"],
      dtoBoundary: "Report body is not registry metadata.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember and report/client scope validation.",
      roleRestrictions: ["member owner"],
    },
    dataClasses: {
      allowed: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
      restricted: ["HIGH_SENSITIVITY_APPROVAL"],
      persisted: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
    },
    privacy: {
      retention: "Saved report retention follows report repository policy.",
      redaction: "Registry export may include capability and route shape only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "Do not export report body or client-safe share content.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "success-and-error",
      providerCostPosture: "provider-ready",
    },
    proof: {
      sourceAuditModule: "REPORT",
      commands: [...commonProofCommands, "pnpm bff:visit-report-ai-qa", "pnpm bff:reports-qa"],
      sourceAdoption: {
        status: "adopted",
        ownerRefs: [
          "src/app/api/ai/report/route.ts",
          "src/domains/visit/ai-evidence-dto.ts",
          "src/lib/report/report-repository.ts",
          "src/lib/report/report-dto.ts",
        ],
        evidenceRefs: [
          "reportRequestSchema",
          "buildProviderSafeClientSnapshot",
          "buildAiEvidenceSummary",
          "persistAiGenerationSuccess",
          "persistAiGenerationFailure",
          "toReportDto",
          "clientSections",
          "INTERNAL_ONLY_SECTION_TYPES",
        ],
        notes: [
          "Report AI uses current member scope, server-side client lookup, quota guard, and success/error AiUsageLog helpers.",
          "JSON report mode returns evidenceSummary while report repository keeps internal sections separate from client-safe sections.",
          "Public share uses report DTO filtering and never treats internal report body as registry metadata.",
        ],
      },
      knownBlockers: ["External registry publication approval is missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.theater.legacy",
      displayName: "Legacy theater AI",
      ownerSurface: "/theater legacy routes",
      module: "THEATER",
      version: "2026-06-21.nap-002",
      status: "guarded-disabled",
    },
    capabilities: [
      {
        id: "legacy-theater-response",
        label: "Legacy theater response and scoring",
        summary: "Legacy response, score, and build routes remain audited but are not the new Route B primary experience.",
        humanTrigger: "Legacy theater route is invoked under its gate.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "legacy-theater", route: "/api/ai/theater", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "guarded", modalities: ["text"] },
        { id: "legacy-theater-score", route: "/api/ai/theater/score", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "guarded", modalities: ["structured-json"] },
        { id: "legacy-theater-build", route: "/api/ai/theater-build", methods: ["POST"], providerPosture: "provider-ready", launchPosture: "guarded", modalities: ["structured-json"] },
      ],
      actions: [{ id: "legacy-gate", label: "Legacy gate", actionBoundary: "Must not be described as Route B production runtime." }],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["theaterRequestSchema", "theaterScoreRequestSchema", "theater-build requestSchema"],
      outputDtoRefs: ["LegacyTheaterResponse", "LegacyTheaterScore", "TheaterBuildDraft"],
      evidenceDtoRefs: ["AiUsageLog", "InteractionEvent"],
      dtoBoundary: "Legacy persona and score contract is internal and guarded.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember and quota guard.",
      roleRestrictions: ["member workspace"],
    },
    dataClasses: {
      allowed: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "STAGE_STATE"],
      restricted: ["HIGH_SENSITIVITY_APPROVAL"],
      persisted: ["STAGE_STATE", "CONVERSATION_SUMMARY"],
    },
    privacy: {
      retention: "Legacy theater retention follows existing theater policy.",
      redaction: "Registry export may mark legacy guarded posture only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "Do not expose persona history, score content, or setup material.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "success-and-error",
      providerCostPosture: "provider-ready",
    },
    proof: {
      sourceAuditModule: "THEATER",
      commands: commonProofCommands,
      knownBlockers: ["Route B provider runtime remains the primary future path."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.theater.route_b",
      displayName: "Route B relationship theater",
      ownerSurface: "/theater/[sessionId]",
      module: "THEATER",
      version: "2026-06-21.ita-003g",
      status: "active",
    },
    capabilities: [
      {
        id: "route-b-stage-session",
        label: "Route B stage session",
        summary: "Persists multi-character stage sessions, group/private turns, and state proposals without provider runtime claims.",
        humanTrigger: "Advisor opens a Route B theater session.",
      },
      {
        id: "route-b-runtime-preflight",
        label: "Route B runtime preflight",
        summary: "Preflights director, character, and feedback inputs with source alignment, visibility scoping, and AiUsageLog policy before provider enablement.",
        humanTrigger: "Advisor asks Route B stage to continue, reply as a character, or generate feedback.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "route-b-runtime", route: "/api/theater/route-b/runtime", methods: ["POST"], providerPosture: "guarded-disabled", launchPosture: "guarded", modalities: ["stage-turn", "structured-json"] },
        { id: "route-b-session", route: "/api/theater/route-b/sessions", methods: ["POST"], providerPosture: "deterministic-no-provider", launchPosture: "available", modalities: ["metadata"] },
        { id: "route-b-turn", route: "/api/theater/route-b/sessions/[sessionId]/turns", methods: ["POST"], providerPosture: "deterministic-no-provider", launchPosture: "available", modalities: ["stage-turn"] },
      ],
      actions: [
        { id: "state-proposal", label: "State proposal", actionBoundary: "State patches require confirmation and do not write confirmed CRM facts." },
        {
          id: "route-b-director",
          label: "Director preflight",
          actionBoundary: "Requires advisor utterance, scoped history, safe input summary, and success/error AiUsageLog plan before provider calls.",
        },
        {
          id: "route-b-character",
          label: "Character preflight",
          actionBoundary: "Requires known Route B character id, director directive, visibility-safe history, and private lane filtering.",
        },
        {
          id: "route-b-feedback",
          label: "Five-view feedback preflight",
          actionBoundary: "Uses five qualitative perspectives and does not emit legacy score as the new Route B feedback path.",
        },
      ],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["TheaterRouteBHandoffPacket", "RouteBTurnInput", "RouteBRuntimeRequest"],
      outputDtoRefs: ["RouteBSessionDto", "RouteBTurnDto", "RouteBRuntimeInputPreview"],
      evidenceDtoRefs: ["visibilityScope", "statePatches", "runtimeInputPreview.sourceAlignment", "AiUsageLog count unchanged"],
      dtoBoundary: "Stage session DTO is internal; external metadata cannot expose private lane content.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember and owner-scoped theater session checks.",
      roleRestrictions: ["member owner"],
    },
    dataClasses: {
      allowed: ["STAGE_STATE", "CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "HIGH_SENSITIVITY_APPROVAL"],
      restricted: ["CONVERSATION_SUMMARY"],
      persisted: ["STAGE_STATE", "CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
    },
    privacy: {
      retention: "Route B session retention follows theater persistence policy.",
      redaction: "Registry export may include capability and guarded runtime posture only.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "Do not export private lane turns, source material, or state proposal text.",
    },
    quotaCost: {
      quotaGate: "not-required-no-provider",
      aiUsageLogPolicy: "blocked-until-provider-proof",
      providerCostPosture: "guarded-disabled",
    },
    proof: {
      sourceAuditModule: "THEATER",
      commands: [...commonProofCommands, "pnpm theater:route-b-runtime-qa", "pnpm theater:route-b-interaction-qa"],
      knownBlockers: [
        "Live director, character, and feedback provider success/error proof is missing.",
        "Provider calls remain disabled until explicit operator approval and AiUsageLog proof.",
      ],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.rag.private_beta",
      displayName: "Private beta RAG",
      ownerSurface: "/api/rag",
      module: "RAG",
      version: "2026-06-21.nap-002",
      status: "guarded-disabled",
    },
    capabilities: [
      {
        id: "guarded-rag-query",
        label: "Guarded RAG query",
        summary: "Private beta knowledge query route remains disabled until ingestion and privacy proof are accepted.",
        humanTrigger: "Internal RAG request is attempted.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "rag-query", route: "/api/rag", methods: ["POST"], providerPosture: "guarded-disabled", launchPosture: "guarded", modalities: ["text"] },
      ],
      actions: [{ id: "guarded-disabled-response", label: "Guarded disabled response", actionBoundary: "No provider attempt while private beta guard is active." }],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: ["querySchema"],
      outputDtoRefs: ["GuardedDisabledRagResponse"],
      evidenceDtoRefs: ["providerAttempted=false"],
      dtoBoundary: "Knowledge index metadata is not exported until ingestion proof exists.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "requireCurrentMember and quota check before future provider path.",
      roleRestrictions: ["member workspace"],
    },
    dataClasses: {
      allowed: ["INTERNAL_METADATA"],
      restricted: ["CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS", "HIGH_SENSITIVITY_APPROVAL"],
      persisted: ["INTERNAL_METADATA"],
    },
    privacy: {
      retention: "No accepted production ingestion retention yet.",
      redaction: "Registry export may only state guarded-disabled posture.",
      forbiddenDisclosureCodes: standardForbiddenDisclosureCodes,
      leastDisclosureNote: "No client source material or vector content in metadata.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "not-required-no-provider",
      providerCostPosture: "guarded-disabled",
    },
    proof: {
      sourceAuditModule: "RAG",
      commands: [...commonProofCommands, "pnpm rag:launch-posture-qa"],
      knownBlockers: ["RAG ingestion, retrieval, and external registry approval are missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.meeting.prototype",
      displayName: "AI Meeting prototype",
      ownerSurface: "uncommitted notes / meeting prototype",
      module: "INTERVIEW",
      version: "2026-06-21.nap-002",
      status: "prototype",
    },
    capabilities: [
      {
        id: "meeting-note-capture-prototype",
        label: "Meeting note capture prototype",
        summary: "Potential meeting workspace and notes capture concept; not accepted as product baseline.",
        humanTrigger: "Not available in committed baseline.",
      },
    ],
    interfaces: {
      endpoints: [],
      actions: [{ id: "prototype-not-adopted", label: "Prototype not adopted", actionBoundary: "No registry claim until source is selected and validated." }],
      exportTargets: defaultExportTargets.map((target) => ({ ...target, status: "not-applicable" })),
    },
    schemas: {
      inputDtoRefs: ["not accepted"],
      outputDtoRefs: ["not accepted"],
      evidenceDtoRefs: ["not accepted"],
      dtoBoundary: "Prototype files are not registry metadata.",
    },
    auth: {
      sessionType: "not-accepted",
      scopeDerivation: "No accepted product session proof.",
      roleRestrictions: ["not accepted"],
    },
    dataClasses: {
      allowed: ["PROTOTYPE_UNCOMMITTED"],
      restricted: ["CONVERSATION_SUMMARY", "CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
      persisted: ["PROTOTYPE_UNCOMMITTED"],
    },
    privacy: {
      retention: "No accepted retention policy.",
      redaction: "Not eligible for export.",
      forbiddenDisclosureCodes: [...standardForbiddenDisclosureCodes, "ORG_INTERNAL_BREAK_GLASS_REASON"],
      leastDisclosureNote: "Do not publish or expose prototype metadata as an available agent.",
    },
    quotaCost: {
      quotaGate: "not-accepted-prototype",
      aiUsageLogPolicy: "not-accepted-prototype",
      providerCostPosture: "prototype-only",
    },
    proof: {
      sourceAuditModule: "PROTOTYPE",
      commands: ["pnpm ai:protocol-registry-qa"],
      knownBlockers: ["Prototype has no accepted route, DTO, session proof, or product baseline."],
    },
    registry: commonRegistry,
  },
];

export const EXPECTED_AGENT_PROTOCOL_IDS = [
  "asai.chat.assistant",
  "asai.interview.companion",
  "asai.interview.quick_capture",
  "asai.interview.realtime_voice",
  "asai.spin.advisor",
  "asai.visit.preparation_package",
  "asai.report.generation",
  "asai.theater.legacy",
  "asai.theater.route_b",
  "asai.rag.private_beta",
  "asai.meeting.prototype",
] as const;
