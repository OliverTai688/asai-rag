#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "theater-route-b-compliance-review-intake-qa");

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
      "scripts/theater-route-b-compliance-review-intake-qa.ts",
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

  execFileSync("node", [join(outDir, "scripts", "theater-route-b-compliance-review-intake-qa.js")], {
    cwd: root,
    stdio: "inherit",
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

const domainPath = resolve("src/domains/theater/route-b-compliance-review-intake.ts");
const routePath = resolve("src/app/api/theater/route-b/sessions/[sessionId]/compliance-review-intake/route.ts");
const repositoryPath = resolve("src/lib/theater/route-b-session-bff-repository.ts");
const pagePath = resolve("src/app/(dashboard)/theater/[sessionId]/page.tsx");
const manifestPath = resolve("src/domains/ai-protocol/manifest.ts");
const packagePath = resolve("package.json");

const domainSource = readFileSync(domainPath, "utf8");
const routeSource = readFileSync(routePath, "utf8");
const repositorySource = readFileSync(repositoryPath, "utf8");
const pageSource = readFileSync(pagePath, "utf8");
const manifestSource = readFileSync(manifestPath, "utf8");
const packageSource = readFileSync(packagePath, "utf8");
const repositoryBlock =
  repositorySource.match(/export async function getRouteBComplianceReviewIntakeForMember[\s\S]*?export async function getRouteBRedLineActionStateForMember/)?.[0] ??
  "";
const checks = [];

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

check(domainSource.includes("route-b-red-line-compliance-review-intake"), "domain declares compliance-review intake action id");
check(domainSource.includes("RouteBComplianceReviewCandidate"), "domain declares candidate DTO");
check(domainSource.includes("sourceActionId: \"route-b-red-line-action-feedback-consumption\""), "domain sources feedback consumption");
check(domainSource.includes("createsFormalFinding: false"), "domain forbids formal finding");
check(domainSource.includes("triggersExternalNotification: false"), "domain forbids real notification");
check(domainSource.includes("providerCallAttempted: false"), "domain keeps no-provider posture");
check(domainSource.includes("writesConfirmedCrmFact: false"), "domain forbids confirmed CRM write");
check(domainSource.includes("persistsCandidateRecord: false"), "domain keeps candidate persistence disabled");

check(routeSource.includes("requireCurrentMember"), "intake route requires current member");
check(routeSource.includes("getRouteBComplianceReviewIntakeForMember"), "intake route uses owner-scoped repository helper");
check(routeSource.includes("route-b-red-line-compliance-review-intake"), "intake route exposes action id on empty response");
check(routeSource.includes("providerCallAttempted: false"), "intake route proves no provider on empty response");
check(routeSource.includes("aiUsageLogWritten: false"), "intake route proves no fake usage log on empty response");
check(routeSource.includes("Cache-Control"), "intake route responses are no-store");

check(repositoryBlock.includes("organizationId: session.organization.id"), "repository scopes intake by organization");
check(repositoryBlock.includes("ownerId: session.user.id"), "repository scopes intake by owner");
check(repositoryBlock.includes("routeBEnabled: true"), "repository scopes intake to Route B sessions");
check(repositoryBlock.includes("isTheaterRouteBFeedbackReview"), "repository reads only persisted feedback-review DTO");
check(repositoryBlock.includes("buildRouteBComplianceReviewIntakeFromFeedbackReview"), "repository builds intake from feedback review");
check(!repositoryBlock.includes("theaterSession.update"), "repository does not persist candidate records");

check(
  pageSource.includes('import type { RouteBComplianceReviewIntake } from "@/domains/theater/route-b-compliance-review-intake"'),
  "stage page imports compliance intake type as type-only",
);
check(pageSource.includes("RouteBComplianceReviewIntakePanel"), "stage page renders compliance intake panel");
check(pageSource.includes("/compliance-review-intake"), "stage page calls compliance-review-intake endpoint");
check(pageSource.includes("待審閱候選"), "stage page labels candidates as pending review");
check(pageSource.includes("不代表正式法遵處置"), "stage page says candidates are not formal compliance actions");
check(pageSource.includes("triggersExternalNotification"), "stage page renders notification guardrail");
check(pageSource.includes("createsFormalFinding"), "stage page renders formal finding guardrail");
check(pageSource.includes("writesConfirmedCrmFact"), "stage page renders CRM fact guardrail");

check(manifestSource.includes("route-b-red-line-compliance-review-intake"), "AgentFacts manifest registers intake capability/action");
check(manifestSource.includes("/api/theater/route-b/sessions/[sessionId]/compliance-review-intake"), "AgentFacts manifest registers intake endpoint");
check(manifestSource.includes("RouteBComplianceReviewIntake"), "AgentFacts manifest declares intake DTO");
check(manifestSource.includes("RouteBComplianceReviewCandidate"), "AgentFacts manifest declares candidate DTO");
check(manifestSource.includes("pnpm theater:route-b-compliance-review-intake-qa"), "AgentFacts manifest includes intake proof command");
check(packageSource.includes('"theater:route-b-compliance-review-intake-qa"'), "package.json registers intake QA command");

const serializedSources = [domainSource, routeSource, repositoryBlock, pageSource, manifestSource].join("\n");
check(!/rawProviderPayload\s*[:=]\s*["'`]/i.test(serializedSources), "no raw provider payload literal is stored");
check(!/directPrivateDialog\s*[:=]\s*["'`]/i.test(serializedSources), "no direct private dialog literal is stored");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      checkedFiles: [domainPath, routePath, repositoryPath, pagePath, manifestPath, packagePath],
      actionId: "route-b-red-line-compliance-review-intake",
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
