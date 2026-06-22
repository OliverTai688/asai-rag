export type AgentProtocolRegistryReadiness =
  | "internal-only"
  | "registry-draft"
  | "external-ready"
  | "external-registered";

export type AgentProtocolStatus = "active" | "guarded-disabled" | "prototype" | "planned";

export type AgentProtocolModule = "CHAT" | "INTERVIEW" | "MEETING" | "RAG" | "REPORT" | "SPIN" | "THEATER" | "VISIT";

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
      version: "2026-06-22.visit-theater-evidence-summary",
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
      commands: [...commonProofCommands, "pnpm bff:visit-report-ai-qa", "pnpm visit:theater-handoff-dry-run"],
      sourceAdoption: {
        status: "adopted",
        ownerRefs: [
          "src/app/api/ai/visit/route.ts",
          "src/domains/visit/ai-evidence-dto.ts",
          "src/domains/visit/reasoning.ts",
          "src/domains/theater/visit-handoff.ts",
          "src/lib/visits/visit-plan-repository.ts",
        ],
        evidenceRefs: [
          "visitRequestSchema",
          "visitOutputSchema",
          "buildProviderSafeClientSnapshot",
          "buildAiEvidenceSummary",
          "enrichSpinQuestionsWithReasoning",
          "VisitTheaterHandoff.sourceSummary.evidenceSummary",
          "updateVisitPlanForMember",
          "persistAiGenerationSuccess",
          "persistAiGenerationFailure",
        ],
        notes: [
          "Provider input is built from a provider-safe client snapshot and server-side client permission lookup.",
          "Question rationale and evidence summary keep facts, inferences, unknowns, and recommendations separate.",
          "Visit-to-theater handoff summarizes question evidence sources and fact/inference/unknown material counts before Route B consumes the stage packet.",
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
      version: "2026-06-21.nap-003c",
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
      sourceAdoption: {
        status: "adopted",
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
        notes: [
          "Legacy Theater remains guarded and is not the Route B production runtime.",
          "Legacy persona and scoring contracts are preserved while success/error usage is owned by theater AI repositories.",
          "Production legacy demo flow is blocked by the Route B required gate unless explicitly enabled for demo.",
        ],
      },
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
      version: "2026-06-22.ita-003j-next-turn-contract",
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
      {
        id: "route-b-orchestration-contract",
        label: "Route B orchestration contract",
        summary: "Turns the latest group/private advisor turn into a director speaker directive, character reply input plan, and safe persistence envelope without provider calls.",
        humanTrigger: "Advisor sends a group or private theater turn and expects the next roleplay character to answer.",
      },
      {
        id: "route-b-runtime-orchestration-preview",
        label: "Route B runtime orchestration preview",
        summary: "Exposes a least-disclosure runtime preview of director directive, addressee guard evidence, character-visible history count, and no-provider persistence envelope.",
        humanTrigger: "Advisor preflights a Route B director turn before provider execution is enabled.",
      },
      {
        id: "route-b-next-turn-contract",
        label: "Route B next-turn contract",
        summary: "Consumes a persisted Route B session snapshot and latest advisor turn into a character or narrator draft envelope without returning private transcript text.",
        humanTrigger: "Advisor writes a group or private theater turn and asks the stage who should answer next.",
      },
      {
        id: "route-b-five-view-feedback-contract",
        label: "Route B five-view feedback contract",
        summary: "Defines qualitative-only theater feedback across five perspectives with severe compliance red-line review and no legacy total score.",
        humanTrigger: "Advisor asks the Route B stage for coaching feedback after a practice run.",
      },
      {
        id: "route-b-feedback-provider-log-contract",
        label: "Route B feedback provider logging contract",
        summary: "Requires success and provider-error usage records around any future Route B feedback provider execution before results can return.",
        humanTrigger: "Advisor asks Route B stage to generate provider-backed coaching feedback after provider wiring is enabled.",
      },
    ],
    interfaces: {
      endpoints: [
        { id: "route-b-runtime", route: "/api/theater/route-b/runtime", methods: ["POST"], providerPosture: "guarded-disabled", launchPosture: "guarded", modalities: ["stage-turn", "structured-json"] },
        { id: "route-b-session", route: "/api/theater/route-b/sessions", methods: ["POST"], providerPosture: "deterministic-no-provider", launchPosture: "available", modalities: ["metadata"] },
        { id: "route-b-turn", route: "/api/theater/route-b/sessions/[sessionId]/turns", methods: ["POST"], providerPosture: "deterministic-no-provider", launchPosture: "available", modalities: ["stage-turn"] },
        { id: "route-b-next-turn", route: "/api/theater/route-b/sessions/[sessionId]/next-turn", methods: ["GET"], providerPosture: "deterministic-no-provider", launchPosture: "available", modalities: ["stage-turn", "structured-json"] },
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
          id: "route-b-orchestration",
          label: "Director-character orchestration",
          actionBoundary: "Enforces named addressee answers, consecutive-speaker guard, private history scoping, and no confirmed CRM fact writes before provider calls.",
        },
        {
          id: "route-b-next-turn",
          label: "Persisted session next-turn preview",
          actionBoundary: "Consumes persisted snapshot summaries and latest advisor turn into a least-disclosure character/narrator draft; generated text remains disabled until provider logging proof exists.",
        },
        {
          id: "route-b-feedback",
          label: "Five-view feedback preflight",
          actionBoundary: "Uses five qualitative perspectives and does not emit legacy score as the new Route B feedback path.",
        },
        {
          id: "route-b-feedback-contract",
          label: "Five-view feedback contract",
          actionBoundary: "Requires qualitative-only sections, selectable perspectives, severe red-line review, and no confirmed CRM fact writes before provider calls.",
        },
        {
          id: "route-b-feedback-provider",
          label: "Five-view feedback provider contract",
          actionBoundary: "Requires injected provider execution to write success/error AiUsageLog records, keeps output qualitative-only, and does not store provider bodies.",
        },
      ],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: [
        "TheaterRouteBHandoffPacket",
        "RouteBTurnInput",
        "RouteBSessionSnapshot",
        "RouteBRuntimeRequest",
        "TheaterRouteBAdvisorTurnInput",
        "TheaterRouteBNextTurnDraft",
        "BuildTheaterRouteBFeedbackContractOptions",
        "TheaterRouteBFeedbackProviderInput",
      ],
      outputDtoRefs: [
        "RouteBSessionDto",
        "RouteBTurnDto",
        "RouteBRuntimeInputPreview",
        "RouteBOrchestrationRuntimePreview",
        "RouteBFeedbackRuntimePreview",
        "TheaterRouteBOrchestrationPlan",
        "TheaterRouteBNextTurnDraft",
        "TheaterRouteBFeedbackContract",
        "TheaterRouteBFeedbackProviderRunResult",
      ],
      evidenceDtoRefs: [
        "visibilityScope",
        "statePatches",
        "runtimeInputPreview.sourceAlignment",
        "runtimeInputPreview.orchestration",
        "runtimeInputPreview.feedback",
        "buildTheaterRouteBNextTurnDraft",
        "route-b-next-turn",
        "directPrivateDialogReturned=false",
        "TheaterRouteBDirectorDirective.guardEvidence",
        "TheaterRouteBDirectorDirective.guardEvidence.privateHistoryScopedToAddressee",
        "TheaterRouteBCharacterReplyPersistenceEnvelope",
        "ROUTE_B_FEEDBACK_PERSPECTIVES",
        "ROUTE_B_SEVERE_RED_LINES",
        "TheaterRouteBFeedbackOutputSectionContract",
        "TheaterRouteBFeedbackContract.outputContract.totalScoreAllowed=false",
        "TheaterRouteBFeedbackContract.outputContract.rankingAllowed=false",
        "runTheaterRouteBFeedbackProviderContract",
        "TheaterRouteBFeedbackUsageLogRecord",
        "TheaterRouteBFeedbackProviderRunResult.aiUsageLogWritten=true",
        "TheaterRouteBFeedbackProviderRunResult.storesProviderBody=false",
        "AiUsageLog count unchanged",
      ],
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
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "success-and-error",
      providerCostPosture: "guarded-disabled",
    },
    proof: {
      sourceAuditModule: "THEATER",
      commands: [
        ...commonProofCommands,
        "pnpm theater:route-b-runtime-qa",
        "pnpm theater:route-b-interaction-qa",
        "pnpm theater:route-b-orchestration-dry-run",
        "pnpm theater:route-b-next-turn-dry-run",
        "pnpm theater:route-b-feedback-dry-run",
        "pnpm theater:route-b-feedback-provider-dry-run",
      ],
      sourceAdoption: {
        status: "adopted",
        ownerRefs: [
          "src/app/api/theater/route-b/runtime/route.ts",
          "src/app/api/theater/route-b/sessions/route.ts",
          "src/app/api/theater/route-b/sessions/[sessionId]/route.ts",
          "src/app/api/theater/route-b/sessions/[sessionId]/turns/route.ts",
          "src/app/api/theater/route-b/sessions/[sessionId]/next-turn/route.ts",
          "src/domains/theater/route-b-handoff.ts",
          "src/domains/theater/route-b-orchestration.ts",
          "src/domains/theater/route-b-next-turn.ts",
          "src/domains/theater/route-b-feedback.ts",
          "src/domains/theater/route-b-feedback-provider.ts",
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
          "TheaterRouteBNextTurnDraft",
          "route-b-next-turn",
          "directPrivateDialogReturned=false",
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
          "totalScoreAllowed=false",
          "rankingAllowed=false",
          "buildTheaterRouteBFeedbackProviderInput",
          "runTheaterRouteBFeedbackProviderContract",
          "TheaterRouteBFeedbackProviderRunResult.aiUsageLogWritten=true",
          "TheaterRouteBFeedbackUsageLogRecord.outcome=SUCCESS",
          "TheaterRouteBFeedbackUsageLogRecord.outcome=PROVIDER_ERROR",
          "providerCallAttempted=false",
          "writesConfirmedCrmFact=false",
        ],
        notes: [
          "Route B is source-adopted for deterministic session/turn persistence and guarded runtime preflight, not live provider runtime.",
          "Orchestration dry-run proves named addressee answer, consecutive-speaker guard, private history scoping, and safe persistence envelope without provider calls.",
          "Next-turn dry-run proves persisted session snapshots can produce a least-disclosure character/narrator draft without provider calls, fake usage logs, or direct private dialog return.",
          "Feedback dry-run proves five selectable qualitative perspectives, severe red-line review, and no total score or ranking before provider calls.",
          "Feedback provider dry-run proves injected success and provider-error paths both write usage records before returning a result.",
          "Runtime director preflight returns only a least-disclosure orchestration preview; it does not expose raw director input, raw private lane content, or provider payload.",
          "Visibility scope, private lane, and state proposal writes are server-owned and owner-scoped.",
          "Director, character, and live feedback provider enablement remains blocked until explicit approval and runtime wiring proof.",
        ],
      },
      knownBlockers: [
        "Live director and character provider success/error proof is missing.",
        "Live next-turn provider execution remains disabled until character text generation has success/error AiUsageLog proof.",
        "Live feedback provider route wiring remains disabled until explicit operator approval and runtime proof.",
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
      version: "2026-06-21.nap-003c",
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
      sourceAdoption: {
        status: "adopted",
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
        notes: [
          "RAG remains guarded-disabled, quota-checked, and no-provider while private beta ingestion and retrieval proof is missing.",
          "No high-sensitive or client data ingestion is accepted before dedicated ingestion/privacy proof.",
          "Future provider or retrieval enablement must add success/error AiUsageLog proof.",
        ],
      },
      knownBlockers: ["RAG ingestion, retrieval, and external registry approval are missing."],
    },
    registry: commonRegistry,
  },
  {
    identity: {
      agentId: "asai.meeting.prototype",
      displayName: "AI Meeting capture, global entrypoints, provider summary, memory chat, and writeback boundary",
      ownerSurface: "AI Meeting / visit notes capture",
      module: "MEETING",
      version: "2026-06-22.amm-005c-contract-fallback",
      status: "active",
    },
    capabilities: [
      {
        id: "meeting-capture-bff",
        label: "Meeting capture BFF",
        summary: "Creates member-private CLIENT_MEETING sessions, appends manual/text/final transcript turns, and reuses Park-style memory persistence without provider calls.",
        humanTrigger: "Advisor starts or resumes a client meeting capture from a visit or client workspace.",
      },
      {
        id: "meeting-summary-contract-skeleton",
        label: "Meeting summary contract skeleton",
        summary: "Builds and persists a deterministic cited meeting summary from captured turns and memories without provider calls.",
        humanTrigger: "Advisor asks for a structured meeting summary draft from a captured client meeting before provider-backed generation is enabled.",
      },
      {
        id: "meeting-provider-json-summary",
        label: "Provider JSON meeting summary",
        summary: "Generates a provider-backed cited meeting summary from stored CLIENT_MEETING turns with quota gating and success/error AiUsageLog.",
        humanTrigger: "Advisor asks for a higher-quality structured meeting summary draft from a captured client meeting.",
      },
      {
        id: "meeting-workspace-entrypoint",
        label: "Meeting workspace entrypoint",
        summary: "Opens a low-noise meeting workspace from a visit plan, auto-creates or resumes an owner-scoped CLIENT_MEETING session, and displays persisted turns plus cited summary without raw ID entry.",
        humanTrigger: "Advisor clicks AI Meeting from the pre-visit preparation package.",
      },
      {
        id: "meeting-global-entrypoints",
        label: "Dashboard and CRM meeting entrypoints",
        summary: "Starts or resumes the same member-private meeting workspace from dashboard recent meeting context or CRM client detail without raw ID workflows.",
        humanTrigger: "Advisor clicks recent meeting from the dashboard or AI meeting workspace from a client record.",
      },
      {
        id: "meeting-client-memory-chat",
        label: "Client memory chat",
        summary: "Answers advisor questions from the current meeting, prior meeting summaries, member-private client memories, and least-disclosure CRM projections with deterministic fallback or provider JSON mode.",
        humanTrigger: "Advisor asks what the current and previous meetings imply about this client.",
      },
      {
        id: "meeting-writeback-boundary",
        label: "Meeting writeback boundary",
        summary: "Turns deterministic meeting summaries into human-confirmed CRM candidates, insight events, and follow-up tasks without provider calls or direct confirmed-fact writes.",
        humanTrigger: "Advisor reviews meeting summary action items and chooses which items may become CRM candidates or tasks.",
      },
      {
        id: "meeting-workspace-writeback-confirmation",
        label: "Meeting workspace writeback confirmation cards",
        summary: "Displays meeting writeback candidates inside the advisor workspace, supports reason/riskAccepted confirmation, and shows created/blocked/skipped results.",
        humanTrigger: "Advisor reviews the meeting summary in the workspace and confirms which candidates should be saved.",
      },
      {
        id: "meeting-cross-state-proof-pack",
        label: "Cross-state meeting proof pack",
        summary: "Verifies one advisor-owned path across client creation, visit meeting workspace, provider summary, writeback, memory-chat, realtime usage logging, persistence recovery, and manager aggregate privacy boundaries.",
        humanTrigger: "Release operator runs AMM-008 proof before treating AI Meeting as a reviewable LV3 flow.",
      },
      {
        id: "meeting-notes-compat-bridge",
        label: "Post-visit notes compatibility bridge",
        summary: "Keeps legacy postVisitNotes read/write/reload on the notes page while embedding the same owner-scoped CLIENT_MEETING workspace, summary, and writeback confirmation without raw session ID entry.",
        humanTrigger: "Advisor reviews post-visit notes and continues meeting capture, summary, or writeback confirmation from the same visit plan.",
      },
    ],
    interfaces: {
      endpoints: [
        {
          id: "create-meeting-session",
          route: "/api/ai/meeting/sessions",
          methods: ["POST"],
          providerPosture: "deterministic-no-provider",
          launchPosture: "available",
          modalities: ["text", "metadata", "structured-json"],
        },
        {
          id: "find-latest-meeting-session",
          route: "/api/ai/meeting/sessions?visitPlanId=",
          methods: ["GET"],
          providerPosture: "deterministic-no-provider",
          launchPosture: "available",
          modalities: ["text", "metadata", "structured-json"],
        },
        {
          id: "read-meeting-session",
          route: "/api/ai/meeting/sessions/[sessionId]",
          methods: ["GET"],
          providerPosture: "deterministic-no-provider",
          launchPosture: "available",
          modalities: ["text", "metadata", "structured-json"],
        },
        {
          id: "append-meeting-turn",
          route: "/api/ai/meeting/sessions/[sessionId]/turns",
          methods: ["POST"],
          providerPosture: "deterministic-no-provider",
          launchPosture: "available",
          modalities: ["text", "voice", "metadata", "structured-json"],
        },
        {
          id: "generate-meeting-summary",
          route: "/api/ai/meeting/sessions/[sessionId]/summary",
          methods: ["GET", "POST"],
          providerPosture: "provider-ready",
          launchPosture: "available",
          modalities: ["text", "metadata", "structured-json"],
        },
        {
          id: "meeting-writebacks",
          route: "/api/ai/meeting/sessions/[sessionId]/writebacks",
          methods: ["GET", "POST"],
          providerPosture: "deterministic-no-provider",
          launchPosture: "available",
          modalities: ["text", "metadata", "structured-json"],
        },
        {
          id: "meeting-session-memory-chat",
          route: "/api/ai/meeting/sessions/[sessionId]/chat",
          methods: ["POST"],
          providerPosture: "provider-ready",
          launchPosture: "available",
          modalities: ["text", "metadata", "structured-json"],
        },
        {
          id: "client-memory-chat",
          route: "/api/ai/clients/[clientId]/memory-chat",
          methods: ["POST"],
          providerPosture: "provider-ready",
          launchPosture: "available",
          modalities: ["text", "metadata", "structured-json"],
        },
      ],
      actions: [
        {
          id: "create-client-meeting-session",
          label: "Create member-private client meeting session",
          actionBoundary: "Derives organization/member/client/visit scope from requireCurrentMember and owner-scoped visit/client checks; does not accept caller-supplied organization or member scope.",
        },
        {
          id: "append-final-meeting-turn",
          label: "Append final meeting transcript or manual note",
          actionBoundary: "Stores text/final transcript turns and Park-style memory candidates only after raw audio/provider/secret payload guards pass.",
        },
        {
          id: "build-meeting-summary-skeleton",
          label: "Build no-provider meeting summary skeleton",
          actionBoundary: "Pure domain helper only; every cited item must reference an existing MeetingTranscriptTurn and cannot write CRM facts.",
        },
        {
          id: "build-meeting-summary-persistence-draft",
          label: "Build meeting summary persistence draft",
          actionBoundary: "Maps MeetingSummary into the additive InterviewMeetingSummary shape with CLIENT_MEETING scope, MEETING usage classification, cited source turn ids, and no DB write side effect.",
        },
        {
          id: "persist-deterministic-meeting-summary",
          label: "Persist deterministic cited meeting summary",
          actionBoundary: "Owner-scoped BFF upserts InterviewMeetingSummary from stored CLIENT_MEETING turns/memories only; overwrite is explicit, provider/model/usageLogId stay null, and confirmed CRM facts are not written.",
        },
        {
          id: "persist-provider-meeting-summary",
          label: "Persist provider JSON meeting summary",
          actionBoundary: "Owner-scoped BFF calls OpenAI only after quota and payload guards pass, requires cited provider JSON, writes success/error AiUsageLog, stores provider/model/usageLogId, and never stores raw provider payloads or confirmed CRM facts.",
        },
        {
          id: "open-meeting-workspace-from-visit-plan",
          label: "Open meeting workspace from visit plan",
          actionBoundary: "UI receives only visitPlanId/sessionId route context, lets the BFF derive owner/client scope, and never asks advisors to paste raw meeting IDs.",
        },
        {
          id: "open-meeting-workspace-from-dashboard-or-crm",
          label: "Open meeting workspace from dashboard or CRM client detail",
          actionBoundary: "Dashboard links to a server-owned visit meeting route, while CRM detail passes only clientId to the meeting BFF; owner/client scope is rechecked server-side and the UI persists sessionId in the URL for refresh only.",
        },
        {
          id: "bridge-post-visit-notes-and-client-meeting",
          label: "Bridge post-visit notes and client meeting workspace",
          actionBoundary: "Notes UI saves postVisitNotes through the visit BFF, seeds only processed note text into the manual-note draft, asks the meeting BFF to find or create an owner-scoped CLIENT_MEETING session for the same visitPlanId, and never stores raw provider payloads, raw private transcripts, or confirmed CRM facts.",
        },
        {
          id: "read-deterministic-meeting-summary",
          label: "Read deterministic meeting summary",
          actionBoundary: "GET summary route returns the owner-scoped persisted summary or a safe not-found response; it performs no provider call and writes no AiUsageLog.",
        },
        {
          id: "answer-meeting-memory-chat",
          label: "Answer meeting/client memory question",
          actionBoundary: "Builds facts/inferences/unknowns from owner-scoped meeting turns, persisted summaries, client memories, and least-disclosure CRM projections; provider JSON mode is quota-gated, writes success/error AiUsageLog, returns citations, and never writes confirmed CRM facts.",
        },
        {
          id: "confirm-meeting-writeback",
          label: "Confirm meeting writeback candidates",
          actionBoundary: "Builds confirmation cards from persisted deterministic meeting summaries; confirmed decisions become CRM candidate events only after human approval, inferences remain insight events, and action/open-question items become follow-up tasks.",
        },
        {
          id: "review-meeting-workspace-writeback-cards",
          label: "Review workspace writeback cards",
          actionBoundary: "Client UI reads owner-scoped writeback preview, requires advisor selection and reason/riskAccepted when needed, and displays server-created/blocked/skipped results without storing raw provider or private transcript payloads.",
        },
      ],
      exportTargets: defaultExportTargets,
    },
    schemas: {
      inputDtoRefs: [
        "CreateMeetingSessionInput",
        "MeetingSessionLatestResponse",
        "AppendMeetingTurnInput",
        "GenerateMeetingSummaryInput",
        "BuildProviderMeetingSummaryInput",
        "MeetingWritebackInput",
        "BuildMeetingWritebackCandidatesInput",
        "MeetingMemoryChatInput",
        "BuildMeetingSummarySkeletonInput",
        "MeetingTranscriptTurn",
        "BuildMeetingSummaryPersistenceDraftInput",
      ],
      outputDtoRefs: [
        "MeetingSessionSnapshotDto",
        "PostVisitNotesWorkspace",
        "MeetingTurnAppendDto",
        "PersistedMeetingSummaryDto",
        "GenerateMeetingSummaryResult",
        "ReadMeetingSummaryResult",
        "MeetingWritebackPreview",
        "MeetingWritebackResult",
        "MeetingWritebackCandidate",
        "MeetingMemoryChatResult",
        "MeetingMemoryChatAnswer",
        "MeetingMemoryChatCitation",
        "MeetingSummary",
        "MeetingSummaryItem",
        "MeetingActionItem",
        "MeetingSummaryPersistenceDraft",
      ],
      evidenceDtoRefs: [
        "MeetingCaptureSafety",
        "MeetingMemoryRailDto",
        "postVisitNotes",
        "MeetingCitation",
        "MeetingSummaryGuardEvidence",
        "MeetingWritebackSafety",
        "MeetingWritebackDecision",
        "MeetingMemoryChatSafety",
        "InterviewMeetingSummary",
        "InterviewKind.CLIENT_MEETING",
        "AiModule.MEETING",
      ],
      dtoBoundary: "Registry metadata may describe the contract shape only; it must not include transcript text, advisor notes, policy identifiers, contact data, prompts, or provider payloads.",
    },
    auth: {
      sessionType: "app-member",
      scopeDerivation: "AMM-005c BFF derives organization/member scope with requireCurrentMember, requires owner-scoped CLIENT_MEETING sessions, owner-scoped Client records, or owner-scoped VisitPlan records, and keeps notes, meeting snapshots, summaries, memory-chat, and writeback previews member-private.",
      roleRestrictions: ["advisor member owner"],
    },
    dataClasses: {
      allowed: ["CONVERSATION_SUMMARY", "CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
      restricted: ["VOICE_TRANSCRIPT_SUMMARY", "AUDIO_BINARY", "HIGH_SENSITIVITY_APPROVAL"],
      persisted: ["CONVERSATION_SUMMARY", "CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
    },
    privacy: {
      retention: "AMM-004b/005c persists member-private CLIENT_MEETING sessions, text/final transcript turns, Park-style memory candidates, deterministic or provider cited InterviewMeetingSummary rows, provider summary/memory-chat AiUsageLog rows, owner-scoped postVisitNotes, and selected writeback InteractionEvent candidates/tasks. Global dashboard/CRM/notes entrypoints store only route/session state in the browser; workspace writeback UI stores only advisor-confirmed API results in React state; memory chat remains response-only and does not persist chat transcripts.",
      redaction: "BFF responses are owner-scoped app data. Registry/export metadata may cite route and schema names only; transcript text, summary bodies, citation snippets, and manual notes remain app-internal.",
      forbiddenDisclosureCodes: [...standardForbiddenDisclosureCodes, "ORG_INTERNAL_BREAK_GLASS_REASON"],
      leastDisclosureNote: "Do not expose meeting transcript text, audio, personal contact data, policy identifiers, provider payloads, or advisor private notes in protocol metadata.",
    },
    quotaCost: {
      quotaGate: "canUseAiModule",
      aiUsageLogPolicy: "success-and-error",
      providerCostPosture: "provider-ready",
    },
    proof: {
      sourceAuditModule: "MEETING",
      commands: [
        "pnpm ai:bff-audit",
        "pnpm ai:protocol-registry-qa",
        "pnpm meeting:memory-chat-qa",
        "pnpm meeting:writeback-qa",
        "pnpm meeting:workspace-ui-qa",
        "pnpm meeting:workspace-writeback-ui-qa",
        "pnpm meeting:global-entrypoints-qa",
        "pnpm meeting:memory-chat-provider-qa",
        "pnpm meeting:cross-state-qa",
        "pnpm meeting:notes-compat-contract-dry-run",
        "pnpm meeting:notes-compat-qa",
        "pnpm meeting:summary-provider-qa",
        "pnpm meeting:summary-bff-qa",
        "pnpm meeting:bff-qa",
        "pnpm meeting:contract-dry-run",
        "pnpm meeting:persistence-contract-dry-run",
        "pnpm exec prisma db push",
      ],
      sourceAdoption: {
        status: "partial",
        ownerRefs: [
          "src/app/api/ai/meeting/sessions/route.ts",
          "src/app/api/ai/meeting/sessions/[sessionId]/route.ts",
          "src/app/api/ai/meeting/sessions/[sessionId]/turns/route.ts",
          "src/app/api/ai/meeting/sessions/[sessionId]/summary/route.ts",
          "src/app/api/ai/meeting/sessions/[sessionId]/writebacks/route.ts",
          "src/app/api/ai/meeting/sessions/[sessionId]/chat/route.ts",
          "src/app/api/ai/clients/[clientId]/memory-chat/route.ts",
          "src/app/(dashboard)/pre-visit/[planId]/page.tsx",
          "src/app/(dashboard)/pre-visit/[planId]/meeting/page.tsx",
          "src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx",
          "src/app/(dashboard)/crm/[clientId]/meeting/page.tsx",
          "src/app/(dashboard)/crm/[clientId]/layout.tsx",
          "src/app/(dashboard)/dashboard/dashboard-page-client.tsx",
          "src/components/meeting/meeting-workspace.tsx",
          "src/domains/interview/meeting-session-lookup.ts",
          "src/lib/interview/meeting-session-repository.ts",
          "src/domains/interview/meeting.ts",
          "src/lib/interview/meeting-summary-repository.ts",
          "src/domains/interview/meeting-writeback-boundary.ts",
          "src/lib/interview/meeting-writeback-repository.ts",
          "src/lib/interview/meeting-memory-chat-repository.ts",
          "src/lib/interview/meeting-memory-chat-provider.ts",
          "scripts/meeting-summary-provider-qa.mjs",
          "scripts/meeting-memory-chat-provider-qa.mjs",
          "scripts/meeting-cross-state-qa.mjs",
          "scripts/meeting-notes-compat-contract-dry-run.mjs",
          "scripts/meeting-notes-compat-contract-dry-run.ts",
          "scripts/meeting-workspace-ui-qa.mjs",
          "scripts/meeting-workspace-writeback-ui-qa.mjs",
          "scripts/meeting-global-entrypoints-qa.mjs",
          "scripts/meeting-memory-chat-qa.mjs",
          "scripts/meeting-notes-compat-qa.mjs",
          "scripts/meeting-writeback-qa.mjs",
          "prisma/schema.prisma",
        ],
        evidenceRefs: [
          "createMeetingSessionInputSchema",
          "appendMeetingTurnInputSchema",
          "findMeetingPayloadViolations",
          "selectLatestMeetingSessionCandidate",
          "readMeetingSessionMetadataVisitPlanId",
          "createMeetingSessionForMember",
          "findLatestMeetingSessionForMember",
          "getMeetingSessionSnapshotForMember",
          "appendMeetingTurnForMember",
          "generateMeetingSummaryForMember",
          "prepareMeetingSummaryGenerationForMember",
          "persistMeetingSummaryProviderSuccess",
          "persistMeetingSummaryProviderFailure",
          "readMeetingSummaryForMember",
          "getMeetingWritebackPreviewForMember",
          "saveMeetingWritebackConfirmation",
          "buildMeetingWritebackCandidates",
          "evaluateMeetingWriteback",
          "answerMeetingMemoryChatForSession",
          "answerClientMemoryChatForMember",
          "generateProviderMemoryChatForSession",
          "generateProviderMemoryChatForClient",
          "persistMeetingMemoryChatProviderSuccess",
          "persistMeetingMemoryChatProviderFailure",
          "meetingMemoryChatInputSchema",
          "MeetingWorkspace",
          "PostVisitNotesWorkspace",
          "notes-meeting-bridge",
          "post-visit-notes-textarea",
          "post-visit-notes-saved-state",
          "meeting-writeback-panel",
          "meeting-writeback-candidate",
          "meeting-writeback-result",
          "/pre-visit/[planId]/meeting?sessionId=",
          "/pre-visit/[planId]/notes?sessionId=",
          "/crm/[clientId]/meeting?sessionId=",
          "dashboard-meeting-entrypoint",
          "crm-meeting-entrypoint",
          "MeetingCaptureSafety",
          "MeetingSummaryRouteSafety",
          "MeetingMemoryRailDto",
          "buildMeetingSummarySkeleton",
          "buildProviderMeetingSummary",
          "buildMeetingSummaryPersistenceDraft",
          "assertMeetingSummarySkeletonSafety",
          "assertMeetingSummaryPersistenceDraftSafety",
          "MeetingCitation",
          "MeetingSummaryGuardEvidence",
          "MeetingWritebackSafety",
          "MeetingWritebackCandidate",
          "MeetingMemoryChatSafety",
          "MeetingMemoryChatCitation",
          "InterviewMeetingSummary",
          "PersistedMeetingSummaryDto",
          "CLIENT_MEETING",
          "MEETING",
          "providerCallAttempted=true-for-provider-json",
          "aiUsageLogWritten=true-for-provider-json",
          "quota429NoProviderNoFakeUsageLog",
          "managerAggregateNoTranscriptMemoryClientDetail",
          "newContextRestoresMeetingAndSummaryFromDb",
          "realtimeClientMeetingUsageLogProof",
          "storesRawProviderPayload=false",
          "inferenceNeverCrmFact",
          "actionItemsCreateTasksOnly",
          "writesConfirmedCrmFact=false",
      ],
      notes: [
        "AMM-005c no-DB contract fallback adds `pnpm meeting:notes-compat-contract-dry-run`, which compiles and runs pure latest-session lookup fixtures plus source contract checks for notes page bridge, latest-session route, MeetingWorkspace reuse behavior, package script registration, and manifest evidence. It performs no provider call, DB connection, browser launch, raw payload storage, or AiUsageLog write, and does not replace the blocked Browser/API/DB proof.",
        "AMM-005c adopts the notes/postVisitNotes compatibility bridge source path: /pre-visit/[planId]/notes preserves legacy postVisitNotes BFF read/write/reload while embedding owner-scoped CLIENT_MEETING session lookup/create, summary, and writeback UI. `pnpm meeting:notes-compat-qa` is prepared for raw payload guard, manager denial, no-provider AiUsageLog unchanged, and desktop/mobile proof; local run is blocked until the Supabase DB host resolves.",
        "AMM-008 adds a cross-state executable proof pack across pre-visit meeting workspace, provider summary, provider memory-chat, writeback confirmation, realtime CLIENT_MEETING usage logging, new-browser persistence, manager aggregate privacy, and raw sentinel DB scanning.",
        "AMM-004b adopts provider JSON meeting/client memory-chat with OpenAI quota gate, provider-disabled guard, success/error AiUsageLog proof, least-disclosure citations, and no raw transcript/provider/contact/policy leakage.",
        "AMM-006b adopts meeting workspace writeback confirmation UI cards with reason/riskAccepted, created/blocked/skipped result display, desktop/mobile browser proof, API manager denial, raw sentinel blocking, DB event metadata proof, and no-provider AiUsageLog unchanged evidence.",
        "AMM-003b adopts provider JSON meeting summary generation with OpenAI quota gate, success/error AiUsageLog proof, provider/model/usageLogId persistence, cited source-turn enforcement, and raw provider payload exclusion.",
        "AMM-006a adopts deterministic meeting writeback boundary API proof, turning summary decisions/action/open-question items into CRM candidate/insight/task events only after advisor selection.",
        "AMM-004a adopts deterministic meeting/client memory chat over owner-scoped client data with facts/inferences/unknowns and citations.",
        "AMM-005a adopts the first visible meeting workspace entrypoint from pre-visit detail into accepted source and BFF-backed UI proof.",
        "AMM-003a adopts deterministic meeting summary persistence while keeping live summary provider generation out of scope.",
        "Meeting capture, deterministic summary fallback, deterministic memory-chat fallback, and deterministic writeback boundary remain no-provider; provider JSON summary and memory-chat modes are accepted MEETING provider paths and write AiUsageLog.",
        "Untracked notes UI and note domain prototype files remain outside accepted scope.",
        "Dashboard/CRM/global/notes meeting entrypoints are accepted source; remaining AMM gaps are pgvector retrieval and cross-member sharing policy.",
      ],
    },
    knownBlockers: [
      "Notes UI and note-domain prototype files remain unaccepted unless a later AMM/PIM slice explicitly adopts and validates them.",
      "pgvector retrieval and same-client cross-member sharing remain future AMM slices.",
        "External registry publication remains disabled until operator approval and adapter proof.",
      ],
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
