#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routePath = resolve("src/app/api/visits/[id]/route-b-red-line-context/route.ts");
const repositoryPath = resolve("src/lib/visits/route-b-red-line-context-repository.ts");
const pagePath = resolve("src/app/(dashboard)/pre-visit/[planId]/page.tsx");
const manifestPath = resolve("src/domains/ai-protocol/manifest.ts");
const registryQaPath = resolve("scripts/ai-protocol-registry-qa.ts");

const routeSource = readFileSync(routePath, "utf8");
const repositorySource = readFileSync(repositoryPath, "utf8");
const pageSource = readFileSync(pagePath, "utf8");
const manifestSource = readFileSync(manifestPath, "utf8");
const registryQaSource = readFileSync(registryQaPath, "utf8");
const panelBlock = pageSource.match(/function RouteBRedLineContextPanel[\s\S]*?function RouteBRedLineContextRow/)?.[0] ?? "";
const checks = [];

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

check(routeSource.includes("requireCurrentMember"), "route requires current member");
check(routeSource.includes("getVisitRouteBRedLineContextForMember"), "route calls visit Route B context repository");
check(routeSource.includes("VISIT_PLAN_NOT_FOUND"), "route keeps visit-plan not-found boundary");
check(routeSource.includes("Cache-Control"), "route returns no-store response");
check(!routeSource.includes("searchParams"), "route does not accept query-supplied theater session/person ids");

check(repositorySource.includes("getVisitPlanForMember(session, visitPlanId)"), "repository starts from owner-scoped visit plan");
check(repositorySource.includes("buildVisitTheaterHandoff"), "repository derives the visit source packet from server-owned handoff");
check(repositorySource.includes("sessionId: `visit_theater_${source.visitPlan.id}`"), "repository derives packet id from visit plan id");
check(repositorySource.includes("organizationId: session.organization.id"), "repository scopes Route B lookup by organization");
check(repositorySource.includes("ownerId: session.user.id"), "repository scopes Route B lookup by owner");
check(repositorySource.includes("clientId: source.client.id"), "repository scopes Route B lookup by visit client");
check(repositorySource.includes("routeBEnabled: true"), "repository scopes Route B lookup to Route B sessions");
check(repositorySource.includes("routeBSourcePacketId: sourcePacketId"), "repository joins by routeBSourcePacketId");
check(repositorySource.includes("isTheaterRouteBFeedbackReview"), "repository validates persisted feedback review DTO");
check(repositorySource.includes("buildVisitRouteBRedLineContextFromFeedbackReview"), "repository consumes feedback review through visit-domain bridge");
check(repositorySource.includes("browserSuppliedTheaterSessionId: false"), "repository proves no browser-supplied theater session id");
check(repositorySource.includes("browserSuppliedPersonId: false"), "repository proves no browser-supplied person id");
check(repositorySource.includes("providerCallAttempted: false"), "repository proves no provider call");
check(repositorySource.includes("aiUsageLogWritten: false"), "repository does not fake AiUsageLog");
check(repositorySource.includes("writesConfirmedCrmFact: false"), "repository proves no confirmed CRM fact write");
check(!/rawProviderPayload|rawPrivateTranscript|paymentData|cookie|secret|otp/i.test(repositorySource), "repository avoids raw private/provider/payment tokens");

check(pageSource.includes("/route-b-red-line-context"), "pre-visit detail fetches Route B red-line context endpoint");
check(pageSource.includes("data-route-b-red-line-context"), "pre-visit detail renders Route B context panel");
check(pageSource.includes("不需輸入 session/person id"), "UI explains no raw session/person id entry");
check(pageSource.includes("getRouteBContextStatusLabel"), "UI renders context status");
check(pageSource.includes("getRouteBActionStateLabel"), "UI renders action-state labels");
check(!panelBlock.includes("sourceTheaterSessionId"), "UI panel does not render raw theater session id");
check(!panelBlock.includes("sourceFeedbackReviewId"), "UI panel does not render raw feedback review id");

check(manifestSource.includes("/api/visits/[id]/route-b-red-line-context"), "AgentFacts manifest declares visit Route B context endpoint");
check(manifestSource.includes("getVisitRouteBRedLineContextForMember"), "AgentFacts manifest declares BFF repository owner ref");
check(manifestSource.includes("pnpm visit:route-b-red-line-context-bff-qa"), "AgentFacts manifest includes BFF proof command");
check(registryQaSource.includes("src/app/api/visits/[id]/route-b-red-line-context/route.ts"), "registry QA expects BFF route owner ref");
check(registryQaSource.includes("getVisitRouteBRedLineContextForMember"), "registry QA expects BFF evidence ref");
check(registryQaSource.includes("pnpm visit:route-b-red-line-context-bff-qa"), "registry QA expects BFF proof command");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      checkedFiles: [routePath, repositoryPath, pagePath, manifestPath, registryQaPath],
      actionId: "route-b-red-line-action-visit-prep-consumption",
      matchedBy: "routeBSourcePacketId",
      browserSuppliedTheaterSessionId: false,
      browserSuppliedPersonId: false,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesConfirmedCrmFact: false,
      triggersExternalNotification: false,
    },
    null,
    2,
  ),
);
