#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "ai-protocol-readiness-qa");
const routePath = "src/app/api/platform/ai-protocol/registry/route.ts";
const releaseReadinessRepositoryPath = "src/lib/platform/platform-release-readiness-repository.ts";
const checks = [];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

try {
  execFileSync(
    "pnpm",
    [
      "exec",
      "tsc",
      "--target",
      "ES2022",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "--esModuleInterop",
      "--skipLibCheck",
      "--strict",
      "--outDir",
      outDir,
      "src/domains/ai-protocol/manifest.ts",
      "src/domains/ai-protocol/registry.ts",
      "src/domains/ai-protocol/index.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  const requireCompiled = createRequire(join(outDir, "scripts", "noop.js"));
  const registryOutputPath = firstExistingPath([
    join(outDir, "src", "domains", "ai-protocol", "registry.js"),
    join(outDir, "registry.js"),
  ]);
  const { getAgentProtocolRegistryReadiness } = requireCompiled(registryOutputPath);

  const dto = getAgentProtocolRegistryReadiness(new Date("2026-06-21T00:00:00.000Z"));
  assertDto(dto);
  assertRouteSource();
  assertReleaseReadinessSource();
  await assertHttpProof(dto);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}

function assertDto(dto) {
  const serialized = JSON.stringify(dto);
  const agentIds = dto.agents.map((agent) => agent.agentId);
  const duplicateIds = agentIds.filter((id, index) => agentIds.indexOf(id) !== index);

  push(dto.scope.sessionType === "platform", "registry DTO is platform scoped");
  push(dto.scope.visibility === "least-disclosure", "registry DTO declares least-disclosure visibility");
  push(dto.scope.publicDiscovery === "disabled", "registry DTO keeps public discovery disabled");
  push(dto.scope.externalPublicationApproved === false, "registry DTO keeps external publication unapproved");
  push(dto.summary.totalAgents === 11, "registry DTO lists 11 agents", `count=${dto.summary.totalAgents}`);
  push(dto.summary.byReadiness["internal-only"] === 11, "all agents remain internal-only");
  push(dto.summary.externalReadyCount === 0, "no agent claims external-ready");
  push(dto.summary.externalRegisteredCount === 0, "no agent claims external-registered");
  push(dto.summary.publicationDisabledCount === 11, "all agent export targets remain publication-disabled");
  push(duplicateIds.length === 0, "registry DTO agent ids are unique", duplicateIds.join(", "));
  push(dto.summary.proofCommands.includes("pnpm ai:protocol-registry-qa"), "registry DTO points to protocol registry QA");
  push(dto.summary.proofCommands.includes("pnpm ai:bff-audit"), "registry DTO points to AI BFF audit");
  push(dto.safety.signing === "not-configured", "registry DTO signing remains not configured");
  push(dto.safety.revocation === "not-configured", "registry DTO revocation remains not configured");
  push(dto.safety.exportTargets.length === 4, "registry DTO keeps four protocol-neutral export targets");
  push(dto.agents.every((agent) => agent.registry.exportTargets.every((target) => target.publication === "disabled")), "agent DTOs keep disabled publication gates");
  push(dto.agents.every((agent) => agent.schemaBoundary.inputDtoRefs.length > 0), "agent DTOs include input DTO refs");
  push(dto.agents.every((agent) => agent.schemaBoundary.outputDtoRefs.length > 0), "agent DTOs include output DTO refs");
  push(dto.agents.every((agent) => agent.proof.knownBlockers.length > 0), "agent DTOs include blockers");
  push(!serialized.includes("compatibilityNote"), "registry DTO omits full manifest compatibility notes");
  push(!serialized.includes("leastDisclosureNote"), "registry DTO omits full manifest disclosure prose");
  pushNoForbiddenSentinel(serialized, "registry DTO has no forbidden sentinel values");
}

function assertRouteSource() {
  const source = readFileSync(routePath, "utf8");

  push(source.includes("requirePlatformUser"), "platform registry route requires platform session");
  push(source.includes("canReadPlatformSummary"), "platform registry route checks platform read role");
  push(source.includes("privateJsonResponse"), "platform registry route returns private no-store response");
  push(source.includes("getAgentProtocolRegistryReadiness"), "platform registry route uses internal registry reader");
  push(!source.includes("prisma"), "platform registry route has no Prisma dependency");
  push(!/openai|anthropic/i.test(source), "platform registry route has no provider dependency");
  push(!source.includes("request.json"), "platform registry route does not accept client-provided payload");
}

function assertReleaseReadinessSource() {
  const source = readFileSync(releaseReadinessRepositoryPath, "utf8");

  push(source.includes("getAgentProtocolRegistryReadiness"), "release readiness repository uses registry readiness reader");
  push(source.includes("aiProtocol"), "release readiness DTO includes aiProtocol section");
  push(source.includes("knownBlockers"), "release readiness aiProtocol DTO carries blockers");
  push(!/openai|anthropic/i.test(source), "release readiness protocol projection has no provider dependency");
}

async function assertHttpProof(sourceDto) {
  const baseUrl = process.env.DEMO_QA_BASE_URL;

  if (!baseUrl) {
    push(true, "HTTP API proof skipped because DEMO_QA_BASE_URL is not set");
    return;
  }

  const member = await request(baseUrl, "demo.member@asai.local", "/api/platform/ai-protocol/registry");
  push(member.status === 403, "member app session cannot read platform protocol registry", `status=${member.status}`);

  const platform = await request(baseUrl, "demo.platform@asai.local", "/api/platform/ai-protocol/registry");
  push(platform.status === 200, "platform session can read platform protocol registry", `status=${platform.status}`);
  push(platform.headers.get("cache-control")?.includes("no-store") ?? false, "platform protocol registry response is no-store");
  push(platform.body?.registry?.summary?.totalAgents === sourceDto.summary.totalAgents, "HTTP registry total matches source DTO");
  push(platform.body?.registry?.summary?.byReadiness?.["internal-only"] === 11, "HTTP registry keeps all agents internal-only");
  pushNoForbiddenSentinel(JSON.stringify(platform.body), "HTTP registry response has no forbidden sentinel values");

  const releaseReadiness = await request(baseUrl, "demo.platform@asai.local", "/api/platform/release-readiness");
  push(releaseReadiness.status === 200, "platform session can read release readiness", `status=${releaseReadiness.status}`);
  push(
    releaseReadiness.body?.readiness?.aiProtocol?.summary?.totalAgents === sourceDto.summary.totalAgents,
    "release readiness HTTP aiProtocol total matches source DTO",
  );
  push(
    releaseReadiness.body?.readiness?.aiProtocol?.summary?.byReadiness?.["internal-only"] === 11,
    "release readiness HTTP aiProtocol keeps all agents internal-only",
  );
  pushNoForbiddenSentinel(
    JSON.stringify(releaseReadiness.body?.readiness?.aiProtocol ?? {}),
    "release readiness HTTP aiProtocol has no forbidden sentinel values",
  );
}

async function request(baseUrl, email, path) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers: {
      "x-asai-demo-user-email": email,
    },
  });
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { parseError: text.slice(0, 120) };
  }

  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

function pushNoForbiddenSentinel(serialized, label) {
  const patterns = [
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
  const matches = patterns.filter((pattern) => pattern.test(serialized)).map((pattern) => pattern.source);

  push(matches.length === 0, label, matches.join(", "));
}

function push(ok, label, detail = "") {
  checks.push({ ok, label, detail });
}

function firstExistingPath(paths) {
  const found = paths.find((path) => existsSync(path));

  if (!found) {
    throw new Error(`Unable to locate compiled registry output. Tried: ${paths.join(", ")}`);
  }

  return found;
}
