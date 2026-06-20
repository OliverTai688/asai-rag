import {
  AGENT_PROTOCOL_LOCAL_EXPORT_TARGETS,
  AGENT_PROTOCOL_LOCAL_EXPORT_VERSION,
  buildAgentProtocolLocalAdapterExports,
  type AgentProtocolLocalAdapterExport,
} from "../src/domains/ai-protocol/adapter-export";
import { ASAI_AGENT_PROTOCOL_MANIFESTS, EXPECTED_AGENT_PROTOCOL_IDS } from "../src/domains/ai-protocol/manifest";

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

const generatedAt = new Date("2026-06-21T00:00:00.000Z");
const localAdapterExports = buildAgentProtocolLocalAdapterExports({ now: generatedAt });

runQa(localAdapterExports);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function runQa(localExports: AgentProtocolLocalAdapterExport[]) {
  const exportTargets = localExports.map((localExport) => localExport.target);
  const uniqueTargets = new Set(exportTargets);
  const expectedTargets = new Set<AgentProtocolLocalAdapterExport["target"]>(AGENT_PROTOCOL_LOCAL_EXPORT_TARGETS);
  const missingTargets = AGENT_PROTOCOL_LOCAL_EXPORT_TARGETS.filter((target) => !uniqueTargets.has(target));
  const extraTargets = exportTargets.filter((target) => !expectedTargets.has(target));

  push(localExports.length === AGENT_PROTOCOL_LOCAL_EXPORT_TARGETS.length, "all protocol-neutral local exports are present", `count=${localExports.length}`);
  push(missingTargets.length === 0, "no local export target is missing", missingTargets.join(", "));
  push(extraTargets.length === 0, "no unexpected local export target is present", extraTargets.join(", "));
  push(uniqueTargets.size === exportTargets.length, "local export targets are unique", exportTargets.join(", "));

  for (const localExport of localExports) {
    assertCommonEnvelope(localExport);
    assertPublicationGate(localExport);
    assertLeastDisclosure(localExport);
    assertJsonRoundTrip(localExport);
    assertNoForbiddenValues(localExport);
    assertTargetShape(localExport);
  }
}

function assertCommonEnvelope(localExport: AgentProtocolLocalAdapterExport) {
  push(localExport.exportVersion === AGENT_PROTOCOL_LOCAL_EXPORT_VERSION, `${localExport.target} is versioned`, localExport.exportVersion);
  push(localExport.generatedAt === generatedAt.toISOString(), `${localExport.target} has deterministic dry-run timestamp`, localExport.generatedAt);
  push(localExport.localOnly === true, `${localExport.target} is marked local-only`);
  push(localExport.proof.sourceManifestCount === EXPECTED_AGENT_PROTOCOL_IDS.length, `${localExport.target} includes every expected manifest`, `count=${localExport.proof.sourceManifestCount}`);
  push(localExport.proof.schemaValidatedBy === "pnpm ai:protocol-adapter-dry-run-qa", `${localExport.target} names adapter QA validator`);
}

function assertPublicationGate(localExport: AgentProtocolLocalAdapterExport) {
  const gate = localExport.publicationGate;

  push(gate.publication === "local-only", `${localExport.target} publication gate is local-only`);
  push(gate.operatorApprovalRequired === true, `${localExport.target} requires operator approval`);
  push(gate.externalPublicationApproved === false, `${localExport.target} has no external publication approval`);
  push(gate.publicDiscovery === "disabled", `${localExport.target} public discovery is disabled`);
  push(gate.signing === "not-configured", `${localExport.target} signing is not configured`);
  push(gate.signingMaterialPolicy === "not-configured-until-operator-approval", `${localExport.target} signing material policy is approval-gated`);
  push(gate.revocation.status === "documented-local-only", `${localExport.target} revocation is documented for local-only use`);
  push(gate.revocation.localRollback === "delete-local-export", `${localExport.target} has local rollback strategy`);
  push(gate.revocation.futurePublicRequirement === "rotation-and-revocation-plan-required", `${localExport.target} requires future rotation and revocation plan`);
  push(gate.rollback.strategy === "delete-local-export", `${localExport.target} rollback deletes local export`);
  push(gate.approvalChecklist.length >= 6, `${localExport.target} has external publication checklist`, `count=${gate.approvalChecklist.length}`);
  push(gate.blockers.includes("Cross-organization agent access is not approved."), `${localExport.target} blocks cross-organization access`);
}

function assertLeastDisclosure(localExport: AgentProtocolLocalAdapterExport) {
  const serialized = JSON.stringify(localExport);

  push(localExport.proof.versioned === true, `${localExport.target} proof marks export versioned`);
  push(localExport.proof.excludedFields.includes("provider request or response body"), `${localExport.target} excludes provider exchange body`);
  push(localExport.proof.excludedFields.includes("direct private dialog"), `${localExport.target} excludes direct private dialog`);
  push(localExport.proof.disabledExternalActions.includes("external registry publish"), `${localExport.target} disables external registry publish`);
  push(localExport.proof.disabledExternalActions.includes("provider invocation"), `${localExport.target} disables provider invocation`);
  push(!serialized.includes("external-ready"), `${localExport.target} does not claim external-ready`);
  push(!serialized.includes("external-registered"), `${localExport.target} does not claim external-registered`);
}

function assertJsonRoundTrip(localExport: AgentProtocolLocalAdapterExport) {
  const serialized = JSON.stringify(localExport);
  const parsed = JSON.parse(serialized) as AgentProtocolLocalAdapterExport;

  push(parsed.target === localExport.target, `${localExport.target} JSON serializes and parses`);
}

function assertNoForbiddenValues(localExport: AgentProtocolLocalAdapterExport) {
  const serialized = JSON.stringify(localExport);
  const matchedPatterns = forbiddenValuePatterns
    .filter((pattern) => pattern.test(serialized))
    .map((pattern) => pattern.source);

  push(matchedPatterns.length === 0, `${localExport.target} has no forbidden private sentinel values`, matchedPatterns.join(", "));
}

function assertTargetShape(localExport: AgentProtocolLocalAdapterExport) {
  switch (localExport.target) {
    case "nanda-agentfacts-json":
      push(localExport.agentFacts.length === ASAI_AGENT_PROTOCOL_MANIFESTS.length, "AgentFacts export includes every manifest", `count=${localExport.agentFacts.length}`);
      push(
        localExport.agentFacts.every((agent) => agent.registryReadiness === "internal-only"),
        "AgentFacts export keeps every agent internal-only",
      );
      push(
        localExport.agentFacts.every((agent) => agent.privacy.forbiddenDisclosureCodes.length > 0),
        "AgentFacts export preserves forbidden disclosure codes",
      );
      break;
    case "mcp-descriptor":
      push(localExport.descriptor.server.publication === "local-only", "MCP descriptor server remains local-only");
      push(localExport.descriptor.tools.length >= ASAI_AGENT_PROTOCOL_MANIFESTS.length, "MCP descriptor has capability tools", `count=${localExport.descriptor.tools.length}`);
      push(
        localExport.descriptor.tools.every((tool) => tool.annotations.publication === "local-only"),
        "MCP tools remain local-only",
      );
      break;
    case "a2a-agent-card":
      push(localExport.agentCards.length === ASAI_AGENT_PROTOCOL_MANIFESTS.length, "A2A export includes every agent card", `count=${localExport.agentCards.length}`);
      push(
        localExport.agentCards.every((card) => card.provider.publication === "local-only"),
        "A2A cards remain local-only",
      );
      break;
    case "https-metadata":
      push(localExport.metadata.publicDiscovery === "disabled", "HTTPS metadata public discovery is disabled");
      push(localExport.metadata.endpoints.length > 0, "HTTPS metadata includes endpoint shapes", `count=${localExport.metadata.endpoints.length}`);
      push(
        localExport.metadata.endpoints.every((endpoint) => endpoint.route.startsWith("/")),
        "HTTPS metadata only exposes internal route shapes",
      );
      break;
  }
}

function push(condition: boolean, label: string, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
