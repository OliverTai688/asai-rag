import {
  ASAI_AGENT_PROTOCOL_MANIFESTS,
  type AgentProtocolExportTarget,
  type AgentProtocolManifest,
  type AgentProtocolProviderPosture,
} from "./manifest";

export const AGENT_PROTOCOL_LOCAL_EXPORT_VERSION = "2026-06-21.nap-005";

export const AGENT_PROTOCOL_LOCAL_EXPORT_TARGETS: AgentProtocolExportTarget[] = [
  "nanda-agentfacts-json",
  "mcp-descriptor",
  "a2a-agent-card",
  "https-metadata",
];

export interface AgentProtocolLocalAdapterExportOptions {
  now?: Date;
  manifests?: AgentProtocolManifest[];
}

export interface AgentProtocolExternalPublicationGate {
  publication: "local-only";
  operatorApprovalRequired: true;
  externalPublicationApproved: false;
  publicDiscovery: "disabled";
  signing: "not-configured";
  signingMaterialPolicy: "not-configured-until-operator-approval";
  revocation: {
    status: "documented-local-only";
    localRollback: "delete-local-export";
    futurePublicRequirement: "rotation-and-revocation-plan-required";
  };
  privacyRedaction: {
    visibility: "least-disclosure";
    excludedClasses: string[];
  };
  approvalChecklist: string[];
  blockers: string[];
  rollback: {
    strategy: "delete-local-export";
    verification: string;
  };
}

export interface AgentProtocolLeastDisclosureProof {
  sourceManifestCount: number;
  excludedFields: string[];
  disabledExternalActions: string[];
  versioned: true;
  schemaValidatedBy: string;
}

export interface AgentProtocolLocalAgentDescriptor {
  agentId: string;
  displayName: string;
  ownerSurface: string;
  module: AgentProtocolManifest["identity"]["module"];
  version: string;
  status: AgentProtocolManifest["identity"]["status"];
  registryReadiness: AgentProtocolManifest["registry"]["readiness"];
  capabilities: Array<{
    id: string;
    label: string;
    summary: string;
    humanTrigger: string;
  }>;
  endpoints: Array<{
    id: string;
    route: string;
    methods: string[];
    modalities: string[];
    providerPosture: AgentProtocolProviderPosture;
    launchPosture: "available" | "guarded" | "prototype";
  }>;
  actions: Array<{
    id: string;
    label: string;
    actionBoundary: string;
  }>;
  schemas: {
    inputDtoRefs: string[];
    outputDtoRefs: string[];
    evidenceDtoRefs: string[];
    dtoBoundary: string;
  };
  auth: {
    sessionType: AgentProtocolManifest["auth"]["sessionType"];
    scopeDerivation: string;
    roleRestrictions: string[];
  };
  dataClasses: {
    allowed: string[];
    restricted: string[];
    persisted: string[];
  };
  privacy: {
    retention: string;
    redaction: string;
    forbiddenDisclosureCodes: string[];
    leastDisclosureNote: string;
  };
  quotaCost: {
    quotaGate: AgentProtocolManifest["quotaCost"]["quotaGate"];
    aiUsageLogPolicy: AgentProtocolManifest["quotaCost"]["aiUsageLogPolicy"];
    providerCostPosture: AgentProtocolProviderPosture;
  };
  proof: {
    sourceAuditModule: AgentProtocolManifest["proof"]["sourceAuditModule"];
    sourceAdoptionStatus: AgentProtocolManifest["proof"]["sourceAdoption"] extends undefined
      ? "pending"
      : NonNullable<AgentProtocolManifest["proof"]["sourceAdoption"]>["status"];
    commands: string[];
    knownBlockers: string[];
  };
}

export interface AgentFactsLocalExport {
  target: "nanda-agentfacts-json";
  schemaVersion: "asai-agentfacts-local-draft/v1";
  exportVersion: string;
  generatedAt: string;
  localOnly: true;
  publicationGate: AgentProtocolExternalPublicationGate;
  proof: AgentProtocolLeastDisclosureProof;
  agentFacts: AgentProtocolLocalAgentDescriptor[];
}

export interface McpLocalDescriptorExport {
  target: "mcp-descriptor";
  schemaVersion: "asai-mcp-local-draft/v1";
  exportVersion: string;
  generatedAt: string;
  localOnly: true;
  publicationGate: AgentProtocolExternalPublicationGate;
  proof: AgentProtocolLeastDisclosureProof;
  descriptor: {
    server: {
      name: "asai-internal-ai-registry";
      publication: "local-only";
      publicDiscovery: "disabled";
    };
    tools: Array<{
      name: string;
      title: string;
      description: string;
      inputSchemaRefs: string[];
      outputSchemaRefs: string[];
      evidenceSchemaRefs: string[];
      annotations: {
        agentId: string;
        ownerSurface: string;
        providerPosture: AgentProtocolProviderPosture;
        launchPostures: string[];
        publication: "local-only";
      };
    }>;
  };
}

export interface A2aLocalAgentCardExport {
  target: "a2a-agent-card";
  schemaVersion: "asai-a2a-local-draft/v1";
  exportVersion: string;
  generatedAt: string;
  localOnly: true;
  publicationGate: AgentProtocolExternalPublicationGate;
  proof: AgentProtocolLeastDisclosureProof;
  agentCards: Array<{
    name: string;
    agentId: string;
    description: string;
    provider: {
      organization: "ASAI internal";
      publication: "local-only";
    };
    version: string;
    skills: Array<{
      id: string;
      name: string;
      description: string;
    }>;
    endpoints: Array<{
      id: string;
      route: string;
      methods: string[];
      visibility: "internal";
    }>;
  }>;
}

export interface HttpsLocalMetadataExport {
  target: "https-metadata";
  schemaVersion: "asai-https-local-draft/v1";
  exportVersion: string;
  generatedAt: string;
  localOnly: true;
  publicationGate: AgentProtocolExternalPublicationGate;
  proof: AgentProtocolLeastDisclosureProof;
  metadata: {
    service: "asai-internal-ai-registry";
    publication: "local-only";
    publicDiscovery: "disabled";
    endpoints: Array<{
      agentId: string;
      endpointId: string;
      route: string;
      methods: string[];
      modalities: string[];
      providerPosture: AgentProtocolProviderPosture;
      launchPosture: "available" | "guarded" | "prototype";
    }>;
  };
}

export type AgentProtocolLocalAdapterExport =
  | AgentFactsLocalExport
  | McpLocalDescriptorExport
  | A2aLocalAgentCardExport
  | HttpsLocalMetadataExport;

export function buildAgentProtocolLocalAdapterExports(
  options: AgentProtocolLocalAdapterExportOptions = {},
): AgentProtocolLocalAdapterExport[] {
  const manifests = options.manifests ?? ASAI_AGENT_PROTOCOL_MANIFESTS;
  const generatedAt = (options.now ?? new Date()).toISOString();
  const agents = manifests.map(toLocalAgentDescriptor);
  const publicationGate = buildExternalPublicationGate(manifests);
  const proof = buildLeastDisclosureProof(manifests.length);

  return [
    buildAgentFactsExport(generatedAt, publicationGate, proof, agents),
    buildMcpDescriptorExport(generatedAt, publicationGate, proof, agents),
    buildA2aAgentCardExport(generatedAt, publicationGate, proof, agents),
    buildHttpsMetadataExport(generatedAt, publicationGate, proof, agents),
  ];
}

export function buildExternalPublicationGate(manifests = ASAI_AGENT_PROTOCOL_MANIFESTS): AgentProtocolExternalPublicationGate {
  const manifestBlockers = unique(manifests.flatMap((manifest) => manifest.proof.knownBlockers));

  return {
    publication: "local-only",
    operatorApprovalRequired: true,
    externalPublicationApproved: false,
    publicDiscovery: "disabled",
    signing: "not-configured",
    signingMaterialPolicy: "not-configured-until-operator-approval",
    revocation: {
      status: "documented-local-only",
      localRollback: "delete-local-export",
      futurePublicRequirement: "rotation-and-revocation-plan-required",
    },
    privacyRedaction: {
      visibility: "least-disclosure",
      excludedClasses: [
        "prompt text",
        "provider request or response body",
        "direct private dialog",
        "client contact value",
        "policy identifier value",
        "credential value",
        "payment value",
        "audio binary",
        "break-glass reason text",
      ],
    },
    approvalChecklist: [
      "operator approval for each publication target",
      "signing material custody and rotation plan",
      "public discovery endpoint owner and rollback plan",
      "revocation process and incident contact",
      "privacy redaction review for client, policy, dialog, and payment classes",
      "cross-organization access policy and audit owner",
    ],
    blockers: unique([
      "External publication approval is missing.",
      "Signing and rotation plan is not configured.",
      "Public discovery endpoint is disabled.",
      "Cross-organization agent access is not approved.",
      ...manifestBlockers,
    ]).sort(),
    rollback: {
      strategy: "delete-local-export",
      verification: "Re-run pnpm ai:protocol-adapter-dry-run-qa and confirm zero public publication targets.",
    },
  };
}

function buildLeastDisclosureProof(sourceManifestCount: number): AgentProtocolLeastDisclosureProof {
  return {
    sourceManifestCount,
    excludedFields: [
      "prompt text",
      "provider request or response body",
      "direct private dialog",
      "client contact value",
      "policy identifier value",
      "credential value",
      "payment value",
      "audio binary",
      "break-glass reason text",
    ],
    disabledExternalActions: [
      "external registry publish",
      "public discovery endpoint expose",
      "cross-organization agent access",
      "provider invocation",
      "database write",
    ],
    versioned: true,
    schemaValidatedBy: "pnpm ai:protocol-adapter-dry-run-qa",
  };
}

function buildAgentFactsExport(
  generatedAt: string,
  publicationGate: AgentProtocolExternalPublicationGate,
  proof: AgentProtocolLeastDisclosureProof,
  agentFacts: AgentProtocolLocalAgentDescriptor[],
): AgentFactsLocalExport {
  return {
    target: "nanda-agentfacts-json",
    schemaVersion: "asai-agentfacts-local-draft/v1",
    exportVersion: AGENT_PROTOCOL_LOCAL_EXPORT_VERSION,
    generatedAt,
    localOnly: true,
    publicationGate,
    proof,
    agentFacts,
  };
}

function buildMcpDescriptorExport(
  generatedAt: string,
  publicationGate: AgentProtocolExternalPublicationGate,
  proof: AgentProtocolLeastDisclosureProof,
  agents: AgentProtocolLocalAgentDescriptor[],
): McpLocalDescriptorExport {
  return {
    target: "mcp-descriptor",
    schemaVersion: "asai-mcp-local-draft/v1",
    exportVersion: AGENT_PROTOCOL_LOCAL_EXPORT_VERSION,
    generatedAt,
    localOnly: true,
    publicationGate,
    proof,
    descriptor: {
      server: {
        name: "asai-internal-ai-registry",
        publication: "local-only",
        publicDiscovery: "disabled",
      },
      tools: agents.flatMap((agent) =>
        agent.capabilities.map((capability) => ({
          name: toMcpToolName(agent.agentId, capability.id),
          title: `${agent.displayName}: ${capability.label}`,
          description: capability.summary,
          inputSchemaRefs: [...agent.schemas.inputDtoRefs],
          outputSchemaRefs: [...agent.schemas.outputDtoRefs],
          evidenceSchemaRefs: [...agent.schemas.evidenceDtoRefs],
          annotations: {
            agentId: agent.agentId,
            ownerSurface: agent.ownerSurface,
            providerPosture: agent.quotaCost.providerCostPosture,
            launchPostures: unique(agent.endpoints.map((endpoint) => endpoint.launchPosture)).sort(),
            publication: "local-only",
          },
        })),
      ),
    },
  };
}

function buildA2aAgentCardExport(
  generatedAt: string,
  publicationGate: AgentProtocolExternalPublicationGate,
  proof: AgentProtocolLeastDisclosureProof,
  agents: AgentProtocolLocalAgentDescriptor[],
): A2aLocalAgentCardExport {
  return {
    target: "a2a-agent-card",
    schemaVersion: "asai-a2a-local-draft/v1",
    exportVersion: AGENT_PROTOCOL_LOCAL_EXPORT_VERSION,
    generatedAt,
    localOnly: true,
    publicationGate,
    proof,
    agentCards: agents.map((agent) => ({
      name: agent.displayName,
      agentId: agent.agentId,
      description: `${agent.module} agent for ${agent.ownerSurface}.`,
      provider: {
        organization: "ASAI internal",
        publication: "local-only",
      },
      version: agent.version,
      skills: agent.capabilities.map((capability) => ({
        id: capability.id,
        name: capability.label,
        description: capability.summary,
      })),
      endpoints: agent.endpoints.map((endpoint) => ({
        id: endpoint.id,
        route: endpoint.route,
        methods: [...endpoint.methods],
        visibility: "internal",
      })),
    })),
  };
}

function buildHttpsMetadataExport(
  generatedAt: string,
  publicationGate: AgentProtocolExternalPublicationGate,
  proof: AgentProtocolLeastDisclosureProof,
  agents: AgentProtocolLocalAgentDescriptor[],
): HttpsLocalMetadataExport {
  return {
    target: "https-metadata",
    schemaVersion: "asai-https-local-draft/v1",
    exportVersion: AGENT_PROTOCOL_LOCAL_EXPORT_VERSION,
    generatedAt,
    localOnly: true,
    publicationGate,
    proof,
    metadata: {
      service: "asai-internal-ai-registry",
      publication: "local-only",
      publicDiscovery: "disabled",
      endpoints: agents.flatMap((agent) =>
        agent.endpoints.map((endpoint) => ({
          agentId: agent.agentId,
          endpointId: endpoint.id,
          route: endpoint.route,
          methods: [...endpoint.methods],
          modalities: [...endpoint.modalities],
          providerPosture: endpoint.providerPosture,
          launchPosture: endpoint.launchPosture,
        })),
      ),
    },
  };
}

function toLocalAgentDescriptor(manifest: AgentProtocolManifest): AgentProtocolLocalAgentDescriptor {
  return {
    agentId: manifest.identity.agentId,
    displayName: manifest.identity.displayName,
    ownerSurface: manifest.identity.ownerSurface,
    module: manifest.identity.module,
    version: manifest.identity.version,
    status: manifest.identity.status,
    registryReadiness: manifest.registry.readiness,
    capabilities: manifest.capabilities.map((capability) => ({
      id: capability.id,
      label: capability.label,
      summary: capability.summary,
      humanTrigger: capability.humanTrigger,
    })),
    endpoints: manifest.interfaces.endpoints.map((endpoint) => ({
      id: endpoint.id,
      route: endpoint.route,
      methods: [...endpoint.methods],
      modalities: [...endpoint.modalities],
      providerPosture: endpoint.providerPosture,
      launchPosture: endpoint.launchPosture,
    })),
    actions: manifest.interfaces.actions.map((action) => ({
      id: action.id,
      label: action.label,
      actionBoundary: action.actionBoundary,
    })),
    schemas: {
      inputDtoRefs: [...manifest.schemas.inputDtoRefs],
      outputDtoRefs: [...manifest.schemas.outputDtoRefs],
      evidenceDtoRefs: [...manifest.schemas.evidenceDtoRefs],
      dtoBoundary: manifest.schemas.dtoBoundary,
    },
    auth: {
      sessionType: manifest.auth.sessionType,
      scopeDerivation: manifest.auth.scopeDerivation,
      roleRestrictions: [...manifest.auth.roleRestrictions],
    },
    dataClasses: {
      allowed: [...manifest.dataClasses.allowed],
      restricted: [...manifest.dataClasses.restricted],
      persisted: [...manifest.dataClasses.persisted],
    },
    privacy: {
      retention: manifest.privacy.retention,
      redaction: manifest.privacy.redaction,
      forbiddenDisclosureCodes: [...manifest.privacy.forbiddenDisclosureCodes],
      leastDisclosureNote: manifest.privacy.leastDisclosureNote,
    },
    quotaCost: {
      quotaGate: manifest.quotaCost.quotaGate,
      aiUsageLogPolicy: manifest.quotaCost.aiUsageLogPolicy,
      providerCostPosture: manifest.quotaCost.providerCostPosture,
    },
    proof: {
      sourceAuditModule: manifest.proof.sourceAuditModule,
      sourceAdoptionStatus: manifest.proof.sourceAdoption?.status ?? "pending",
      commands: [...manifest.proof.commands],
      knownBlockers: [...manifest.proof.knownBlockers],
    },
  };
}

function toMcpToolName(agentId: string, capabilityId: string): string {
  return `${agentId}__${capabilityId}`.replace(/[^A-Za-z0-9_-]/g, "_");
}

function unique<T extends string>(items: readonly T[]): T[] {
  return [...new Set(items)];
}
