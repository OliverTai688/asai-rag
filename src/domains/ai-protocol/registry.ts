import {
  ASAI_AGENT_PROTOCOL_MANIFESTS,
  type AgentProtocolExportTarget,
  type AgentProtocolManifest,
  type AgentProtocolModule,
  type AgentProtocolProviderPosture,
  type AgentProtocolRegistryReadiness,
  type AgentProtocolStatus,
} from "./manifest";

export interface AgentProtocolRegistryReadinessDto {
  generatedAt: string;
  scope: {
    sessionType: "platform";
    visibility: "least-disclosure";
    publicDiscovery: "disabled";
    externalPublicationApproved: false;
  };
  summary: {
    totalAgents: number;
    byReadiness: Record<AgentProtocolRegistryReadiness, number>;
    byStatus: Record<AgentProtocolStatus, number>;
    byModule: Record<AgentProtocolModule, number>;
    byProviderPosture: Record<AgentProtocolProviderPosture, number>;
    externalReadyCount: number;
    externalRegisteredCount: number;
    publicationDisabledCount: number;
    proofCommands: string[];
    globalBlockers: string[];
  };
  agents: AgentProtocolRegistryAgentDto[];
  safety: {
    responseExcludes: string[];
    forbiddenDisclosureCodes: string[];
    exportTargets: AgentProtocolExportTarget[];
    signing: "not-configured";
    revocation: "not-configured";
  };
}

export interface AgentProtocolRegistryAgentDto {
  agentId: string;
  displayName: string;
  ownerSurface: string;
  module: AgentProtocolModule;
  version: string;
  status: AgentProtocolStatus;
  registryReadiness: AgentProtocolRegistryReadiness;
  capabilities: Array<{
    id: string;
    label: string;
    summary: string;
  }>;
  interfaceSummary: {
    endpointCount: number;
    actionCount: number;
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
    }>;
  };
  schemaBoundary: {
    inputDtoRefs: string[];
    outputDtoRefs: string[];
    evidenceDtoRefs: string[];
  };
  auth: {
    sessionType: AgentProtocolManifest["auth"]["sessionType"];
    roleRestrictions: string[];
  };
  dataClasses: {
    allowed: string[];
    restricted: string[];
    persisted: string[];
  };
  quotaCost: {
    quotaGate: AgentProtocolManifest["quotaCost"]["quotaGate"];
    aiUsageLogPolicy: AgentProtocolManifest["quotaCost"]["aiUsageLogPolicy"];
    providerCostPosture: AgentProtocolProviderPosture;
  };
  proof: {
    commands: string[];
    knownBlockers: string[];
  };
  registry: {
    exportTargets: Array<{
      target: AgentProtocolExportTarget;
      status: string;
      publication: "disabled";
    }>;
    publicDiscovery: "disabled";
    signing: "not-configured";
    revocation: "not-configured";
  };
}

const READINESS_VALUES: AgentProtocolRegistryReadiness[] = [
  "internal-only",
  "registry-draft",
  "external-ready",
  "external-registered",
];

const STATUS_VALUES: AgentProtocolStatus[] = ["active", "guarded-disabled", "prototype", "planned"];

const MODULE_VALUES: AgentProtocolModule[] = ["CHAT", "INTERVIEW", "RAG", "REPORT", "SPIN", "THEATER", "VISIT"];

const PROVIDER_POSTURE_VALUES: AgentProtocolProviderPosture[] = [
  "provider-ready",
  "provider-or-dry-run",
  "deterministic-no-provider",
  "event-mirror-no-external-provider",
  "guarded-disabled",
  "prototype-only",
];

const RESPONSE_EXCLUDES = [
  "prompt text",
  "provider request or response body",
  "direct private dialog",
  "client contact value",
  "policy identifier value",
  "credential value",
  "payment value",
  "audio binary",
  "platform break-glass reason text",
] as const;

export function getAgentProtocolRegistryReadiness(now = new Date()): AgentProtocolRegistryReadinessDto {
  const manifests = ASAI_AGENT_PROTOCOL_MANIFESTS;
  const agents = manifests.map(toRegistryAgentDto);
  const proofCommands = unique(manifests.flatMap((manifest) => manifest.proof.commands)).sort();
  const globalBlockers = unique(manifests.flatMap((manifest) => manifest.proof.knownBlockers)).sort();
  const exportTargets = unique(
    manifests.flatMap((manifest) => manifest.interfaces.exportTargets.map((target) => target.target)),
  ).sort();

  return {
    generatedAt: now.toISOString(),
    scope: {
      sessionType: "platform",
      visibility: "least-disclosure",
      publicDiscovery: "disabled",
      externalPublicationApproved: false,
    },
    summary: {
      totalAgents: manifests.length,
      byReadiness: countByValues(manifests, READINESS_VALUES, (manifest) => manifest.registry.readiness),
      byStatus: countByValues(manifests, STATUS_VALUES, (manifest) => manifest.identity.status),
      byModule: countByValues(manifests, MODULE_VALUES, (manifest) => manifest.identity.module),
      byProviderPosture: countByValues(
        manifests,
        PROVIDER_POSTURE_VALUES,
        (manifest) => manifest.quotaCost.providerCostPosture,
      ),
      externalReadyCount: manifests.filter((manifest) => manifest.registry.readiness === "external-ready").length,
      externalRegisteredCount: manifests.filter((manifest) => manifest.registry.readiness === "external-registered").length,
      publicationDisabledCount: manifests.filter((manifest) =>
        manifest.interfaces.exportTargets.every((target) => target.publication === "disabled"),
      ).length,
      proofCommands,
      globalBlockers,
    },
    agents,
    safety: {
      responseExcludes: [...RESPONSE_EXCLUDES],
      forbiddenDisclosureCodes: unique(
        manifests.flatMap((manifest) => manifest.privacy.forbiddenDisclosureCodes),
      ).sort(),
      exportTargets,
      signing: "not-configured",
      revocation: "not-configured",
    },
  };
}

function toRegistryAgentDto(manifest: AgentProtocolManifest): AgentProtocolRegistryAgentDto {
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
    })),
    interfaceSummary: {
      endpointCount: manifest.interfaces.endpoints.length,
      actionCount: manifest.interfaces.actions.length,
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
      })),
    },
    schemaBoundary: {
      inputDtoRefs: [...manifest.schemas.inputDtoRefs],
      outputDtoRefs: [...manifest.schemas.outputDtoRefs],
      evidenceDtoRefs: [...manifest.schemas.evidenceDtoRefs],
    },
    auth: {
      sessionType: manifest.auth.sessionType,
      roleRestrictions: [...manifest.auth.roleRestrictions],
    },
    dataClasses: {
      allowed: [...manifest.dataClasses.allowed],
      restricted: [...manifest.dataClasses.restricted],
      persisted: [...manifest.dataClasses.persisted],
    },
    quotaCost: {
      quotaGate: manifest.quotaCost.quotaGate,
      aiUsageLogPolicy: manifest.quotaCost.aiUsageLogPolicy,
      providerCostPosture: manifest.quotaCost.providerCostPosture,
    },
    proof: {
      commands: [...manifest.proof.commands],
      knownBlockers: [...manifest.proof.knownBlockers],
    },
    registry: {
      exportTargets: manifest.interfaces.exportTargets.map((target) => ({
        target: target.target,
        status: target.status,
        publication: target.publication,
      })),
      publicDiscovery: manifest.registry.publicDiscovery,
      signing: manifest.registry.signing,
      revocation: manifest.registry.revocation,
    },
  };
}

function countByValues<T, K extends string>(items: T[], keys: readonly K[], getKey: (item: T) => K): Record<K, number> {
  const output = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;

  for (const item of items) {
    output[getKey(item)] += 1;
  }

  return output;
}

function unique<T extends string>(items: readonly T[]): T[] {
  return [...new Set(items)];
}
