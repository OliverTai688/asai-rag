#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "theater-route-b-compliance-review-queue-qa");

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
      "scripts/theater-route-b-compliance-review-queue-qa.ts",
      "src/domains/theater/route-b-compliance-review-queue.ts",
      "src/domains/theater/route-b-compliance-review-intake.ts",
      "src/domains/theater/route-b-feedback-review.ts",
      "src/domains/theater/route-b-feedback.ts",
      "src/domains/theater/route-b-objection-red-line-library.ts",
      "src/domains/theater/route-b-red-line-action-workflow.ts",
      "src/domains/theater/route-b-severe-red-line-preview.ts",
      "src/domains/theater/route-b-provider-prompt-context.ts",
      "src/domains/theater/route-b-session.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "theater-route-b-compliance-review-queue-qa.js")], {
    cwd: root,
    stdio: "inherit",
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

const domainPath = resolve("src/domains/theater/route-b-compliance-review-queue.ts");
const routePath = resolve("src/app/api/theater/route-b/compliance-review-queue/route.ts");
const repositoryPath = resolve("src/lib/theater/route-b-session-bff-repository.ts");
const pagePath = resolve("src/app/(dashboard)/theater/page.tsx");
const manifestPath = resolve("src/domains/ai-protocol/manifest.ts");
const registryQaPath = resolve("scripts/ai-protocol-registry-qa.ts");
const packagePath = resolve("package.json");

const domainSource = readFileSync(domainPath, "utf8");
const routeSource = readFileSync(routePath, "utf8");
const repositorySource = readFileSync(repositoryPath, "utf8");
const pageSource = readFileSync(pagePath, "utf8");
const manifestSource = readFileSync(manifestPath, "utf8");
const registryQaSource = readFileSync(registryQaPath, "utf8");
const packageSource = readFileSync(packagePath, "utf8");
const repositoryBlock =
  repositorySource.match(/export async function listRouteBComplianceReviewQueueForMember[\s\S]*?export async function getRouteBRedLineActionStateForMember/)?.[0] ??
  "";
const checks = [];

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

check(domainSource.includes("route-b-red-line-compliance-review-queue"), "domain declares compliance-review queue action id");
check(domainSource.includes("RouteBComplianceReviewQueueItem"), "domain declares queue item DTO");
check(domainSource.includes("sourceActionId: \"route-b-red-line-compliance-review-intake\""), "domain sources the intake action");
check(domainSource.includes("createsFormalFinding: false"), "domain forbids formal finding");
check(domainSource.includes("triggersExternalNotification: false"), "domain forbids real notification");
check(domainSource.includes("providerCallAttempted: false"), "domain keeps no-provider posture");
check(domainSource.includes("writesConfirmedCrmFact: false"), "domain forbids confirmed CRM write");
check(domainSource.includes("persistsQueueRecord: false"), "domain keeps queue persistence disabled");

check(routeSource.includes("requireCurrentMember"), "queue route requires current member");
check(routeSource.includes("listRouteBComplianceReviewQueueForMember"), "queue route uses owner-scoped repository helper");
check(routeSource.includes("Cache-Control"), "queue route response is no-store");

check(repositoryBlock.includes("findMany"), "repository lists owner-scoped Route B sessions");
check(repositoryBlock.includes("organizationId: session.organization.id"), "repository scopes queue by organization");
check(repositoryBlock.includes("ownerId: session.user.id"), "repository scopes queue by owner");
check(repositoryBlock.includes("routeBEnabled: true"), "repository scopes queue to Route B sessions");
check(repositoryBlock.includes("isTheaterRouteBFeedbackReview"), "repository reads only persisted feedback-review DTO");
check(repositoryBlock.includes("buildRouteBComplianceReviewIntakeFromFeedbackReview"), "repository rebuilds intake from feedback review");
check(repositoryBlock.includes("buildRouteBComplianceReviewQueue"), "repository builds queue from safe intakes");
check(!repositoryBlock.includes("theaterSession.update"), "repository does not persist queue or candidate records");

check(pageSource.includes("/api/theater/route-b/compliance-review-queue"), "theater workbench fetches queue endpoint");
check(pageSource.includes("ComplianceReviewQueuePanel"), "theater workbench renders queue panel");
check(pageSource.includes("審閱佇列"), "queue panel labels review queue");
check(pageSource.includes("待審閱候選"), "queue panel labels pending candidates");
check(pageSource.includes("不代表正式法遵處置"), "queue panel states no formal compliance action");
check(pageSource.includes("未發通知"), "queue panel renders notification guardrail");
check(pageSource.includes("未建立正式 finding"), "queue panel renders formal finding guardrail");
check(pageSource.includes("未寫入 CRM fact"), "queue panel renders CRM guardrail");

check(manifestSource.includes("route-b-red-line-compliance-review-queue"), "AgentFacts manifest registers queue capability/action");
check(manifestSource.includes("/api/theater/route-b/compliance-review-queue"), "AgentFacts manifest registers queue endpoint");
check(manifestSource.includes("RouteBComplianceReviewQueue"), "AgentFacts manifest declares queue DTO");
check(manifestSource.includes("RouteBComplianceReviewQueueItem"), "AgentFacts manifest declares queue item DTO");
check(manifestSource.includes("pnpm theater:route-b-compliance-review-queue-qa"), "AgentFacts manifest includes queue proof command");
check(registryQaSource.includes("route-b-red-line-compliance-review-queue"), "registry QA expects queue refs");
check(packageSource.includes('"theater:route-b-compliance-review-queue-qa"'), "package.json registers queue QA command");

const serializedSources = [domainSource, routeSource, repositoryBlock, pageSource, manifestSource].join("\n");
check(!/rawProviderPayload\s*[:=]\s*["'`]/i.test(serializedSources), "no raw provider payload literal is stored");
check(!/directPrivateDialog\s*[:=]\s*["'`]/i.test(serializedSources), "no direct private dialog literal is stored");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      checkedFiles: [domainPath, routePath, repositoryPath, pagePath, manifestPath, registryQaPath, packagePath],
      actionId: "route-b-red-line-compliance-review-queue",
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesConfirmedCrmFact: false,
      triggersExternalNotification: false,
      createsFormalFinding: false,
    },
    null,
    2,
  ),
);
