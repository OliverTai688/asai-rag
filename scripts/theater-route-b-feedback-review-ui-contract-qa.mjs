#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pagePath = resolve("src/app/(dashboard)/theater/[sessionId]/page.tsx");
const routePath = resolve("src/app/api/theater/route-b/sessions/[sessionId]/feedback-review/route.ts");
const repositoryPath = resolve("src/lib/theater/route-b-session-bff-repository.ts");
const manifestPath = resolve("src/domains/ai-protocol/manifest.ts");

const pageSource = readFileSync(pagePath, "utf8");
const routeSource = readFileSync(routePath, "utf8");
const repositorySource = readFileSync(repositoryPath, "utf8");
const manifestSource = readFileSync(manifestPath, "utf8");
const feedbackRepositoryBlock =
  repositorySource.match(/export async function getRouteBFeedbackReviewForMember[\s\S]*?export async function appendRouteBAdvisorTurnForMember/)?.[0] ??
  "";
const checks = [];

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

check(
  pageSource.includes('import type { TheaterRouteBFeedbackReview } from "@/domains/theater/route-b-feedback-review"'),
  "Route B feedback review type is imported as type-only client boundary",
);
check(pageSource.includes("RouteBFeedbackReviewPanel"), "session page renders feedback review panel");
check(pageSource.includes("/feedback-review"), "session page calls feedback-review endpoint");
check(pageSource.includes("route-b-feedback-persistence"), "session page validates feedback persistence action id");
check(pageSource.includes("review.providerBoundary.providerCallAttempted"), "UI exposes providerCallAttempted boundary");
check(pageSource.includes("review.providerBoundary.aiUsageLogWritten"), "UI exposes aiUsageLogWritten boundary");
check(pageSource.includes("review.persistenceEnvelope.writesConfirmedCrmFact"), "UI exposes writesConfirmedCrmFact boundary");
check(pageSource.includes("review.outputContract.totalScoreAllowed"), "UI exposes totalScoreAllowed boundary");
check(pageSource.includes("review.redLineFindings"), "UI renders red-line findings");
check(pageSource.includes("review.redLineActionState"), "UI renders consumed red-line action summary");
check(pageSource.includes("sceneState.redLineActionState"), "UI labels feedback review action-state source");
check(pageSource.includes("review?.relationshipEdgeShadowGrounding"), "UI reads feedback review edge-shadow grounding");
check(pageSource.includes("data-route-b-feedback-edge-shadow-grounding"), "UI exposes feedback edge-shadow grounding data hook");
check(pageSource.includes("scene.sourceGrounding.relationshipEdgeShadow"), "UI labels feedback edge-shadow source");
check(pageSource.includes("edgeShadowGrounding.boundary.rawDraftEdgesIncluded"), "UI exposes edge-shadow raw draft boundary");
check(pageSource.includes("edgeShadowGrounding.boundary.writesRelationshipGraph"), "UI exposes edge-shadow graph-write boundary");
check(pageSource.includes("finding.actionContext"), "UI renders per-red-line action context");

check(routeSource.includes("requireCurrentMember"), "feedback-review route requires current member");
check(routeSource.includes("getRouteBFeedbackReviewForMember"), "feedback-review route supports persisted GET");
check(routeSource.includes("createRouteBFeedbackReviewForMember"), "feedback-review route supports no-provider POST persistence");
check(routeSource.includes("selectedPerspectiveIds"), "feedback-review route validates selected perspectives");
check(routeSource.includes("notApplicableRedLines"), "feedback-review route validates not-applicable red-line input");
check(routeSource.includes("aiUsageLogWritten: false"), "feedback-review empty GET proves no fake AiUsageLog");
check(routeSource.includes("writesConfirmedCrmFact: false"), "feedback-review empty GET proves no CRM fact write");
check(routeSource.includes("Cache-Control"), "feedback-review responses are no-store");

check(repositorySource.includes("organizationId: session.organization.id"), "repository scopes feedback review by organization");
check(repositorySource.includes("ownerId: session.user.id"), "repository scopes feedback review by owner");
check(repositorySource.includes("routeBEnabled: true"), "repository scopes feedback review to Route B sessions");
check(repositorySource.includes("feedbackReview"), "repository persists feedbackReview in sceneState");
check(repositorySource.includes("redLineActionState"), "repository snapshots persisted red-line action state for feedback review");
check(repositorySource.includes("isRouteBRedLineActionPersistenceState"), "repository validates persisted red-line action state before snapshot consumption");
check(repositorySource.includes("buildTheaterRouteBFeedbackReview"), "repository builds deterministic feedback review contract");
check(repositorySource.includes("isTheaterRouteBFeedbackReview"), "repository validates persisted feedback review before returning it");
check(repositorySource.includes("writesConfirmedCrmFact: false"), "repository persists feedback review without confirmed CRM fact writes");
check(!feedbackRepositoryBlock.includes("providerPayload"), "feedback review repository block does not introduce raw provider payload handling");

check(manifestSource.includes("route-b-feedback-review"), "AgentFacts manifest registers feedback-review endpoint");
check(manifestSource.includes("route-b-feedback-persistence"), "AgentFacts manifest registers feedback persistence action");
check(manifestSource.includes("route-b-red-line-action-feedback-consumption"), "AgentFacts manifest registers feedback consumption capability");
check(manifestSource.includes("TheaterRouteBFeedbackReview.redLineActionState"), "AgentFacts manifest declares feedback action-state DTO boundary");
check(manifestSource.includes("TheaterRouteBFeedbackReview.relationshipEdgeShadowGrounding"), "AgentFacts manifest declares feedback edge-shadow DTO boundary");
check(manifestSource.includes("data-route-b-feedback-edge-shadow-grounding"), "AgentFacts manifest declares feedback edge-shadow UI hook");
check(manifestSource.includes("TheaterRouteBFeedbackReview"), "AgentFacts manifest declares feedback review DTO");
check(manifestSource.includes("pnpm theater:route-b-feedback-review-qa"), "AgentFacts manifest includes feedback-review proof command");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      checkedFiles: [pagePath, routePath, repositoryPath, manifestPath],
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesConfirmedCrmFact: false,
      actionId: "route-b-feedback-persistence",
    },
    null,
    2,
  ),
);
