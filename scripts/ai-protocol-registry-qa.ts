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
