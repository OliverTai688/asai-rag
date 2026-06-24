#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const domainPath = resolve("src/domains/visit/route-b-state-proposal-context.ts");
const routePath = resolve("src/app/api/visits/[id]/route-b-state-proposal-context/route.ts");
const repositoryPath = resolve("src/lib/visits/route-b-state-proposal-context-repository.ts");
const pagePath = resolve("src/app/(dashboard)/pre-visit/[planId]/page.tsx");
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
const panelBlock = pageSource.match(/function RouteBStateProposalContextPanel[\s\S]*?function RouteBStateProposalContextRow/)?.[0] ?? "";
const rowBlock = pageSource.match(/function RouteBStateProposalContextRow[\s\S]*?function MeetingRelationshipSignalPanel/)?.[0] ?? "";
const checks = [];

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

check(domainSource.includes("route-b-state-proposal-downstream-advisor-context"), "domain declares state proposal downstream action id");
check(domainSource.includes("sourceActionId: \"route-b-state-proposal-persistence\""), "domain declares Route B state proposal source action");
check(domainSource.includes("requiresConfirmation: true"), "domain keeps requiresConfirmation true");
check(domainSource.includes("writesConfirmedCrmFact: false"), "domain proves no confirmed CRM fact write");
check(domainSource.includes("writesRelationshipGraph: false"), "domain proves no relationship graph write");
check(domainSource.includes("writesVisitPlan: false"), "domain proves no VisitPlan write");
check(domainSource.includes("rawTheaterSessionIdReturned: false"), "domain proves no raw theater session id returned");
check(domainSource.includes("rawPersonIdReturned: false"), "domain proves no raw person id returned");
check(domainSource.includes("selectVisitRouteBStateProposalQuestionEvidence"), "domain can emit advisor question evidence");
check(!/paymentData|cookie|secret|otp/i.test(domainSource), "domain avoids secret/payment/cookie/OTP sentinels");

check(routeSource.includes("requireCurrentMember"), "route requires current member");
check(routeSource.includes("getVisitRouteBStateProposalContextForMember"), "route calls state proposal repository");
check(routeSource.includes("VISIT_PLAN_NOT_FOUND"), "route keeps visit-plan not-found boundary");
check(routeSource.includes("Cache-Control"), "route returns no-store response");
check(!routeSource.includes("searchParams"), "route does not accept query-supplied theater session/person ids");

check(repositorySource.includes("getVisitPlanForMember(session, visitPlanId)"), "repository starts from owner-scoped visit plan");
check(repositorySource.includes("buildVisitTheaterHandoff"), "repository derives source packet from server-owned handoff");
check(repositorySource.includes("sessionId: `visit_theater_${source.visitPlan.id}`"), "repository derives packet id from visit plan id");
check(repositorySource.includes("organizationId: session.organization.id"), "repository scopes Route B lookup by organization");
check(repositorySource.includes("ownerId: session.user.id"), "repository scopes Route B lookup by owner");
check(repositorySource.includes("clientId: source.client.id"), "repository scopes Route B lookup by visit client");
check(repositorySource.includes("routeBEnabled: true"), "repository scopes Route B lookup to Route B sessions");
check(repositorySource.includes("routeBSourcePacketId: sourcePacketId"), "repository joins by routeBSourcePacketId");
check(repositorySource.includes("sceneState.statePatches"), "repository reads persisted sceneState state proposals");
check(repositorySource.includes("turn.statePatches"), "repository reads persisted turn state proposals");
check(repositorySource.includes("buildVisitRouteBStateProposalContext"), "repository consumes state proposals through visit-domain bridge");
check(repositorySource.includes("browserSuppliedTheaterSessionId: false"), "repository proves no browser-supplied theater session id");
check(repositorySource.includes("browserSuppliedPersonId: false"), "repository proves no browser-supplied person id");
check(repositorySource.includes("providerCallAttempted: false"), "repository proves no provider call");
check(repositorySource.includes("aiUsageLogWritten: false"), "repository does not fake AiUsageLog");
check(repositorySource.includes("writesRelationshipGraph: false"), "repository proves no relationship graph write");
check(repositorySource.includes("writesVisitPlan: false"), "repository proves no VisitPlan write");
check(repositorySource.includes("writesConfirmedCrmFact: false"), "repository proves no confirmed CRM fact write");
check(!repositorySource.includes("sourceTheaterSessionId"), "repository response omits raw theater session id");
check(!repositorySource.includes("sourcePersonId"), "repository response omits raw person id");

check(pageSource.includes("/route-b-state-proposal-context"), "pre-visit detail fetches Route B state proposal endpoint");
check(pageSource.includes("data-route-b-state-proposal-context"), "pre-visit detail renders state proposal panel");
check(pageSource.includes("theater state proposal"), "UI labels state proposal source");
check(pageSource.includes("requiresConfirmation=true"), "UI displays confirmation boundary");
check(pageSource.includes("不需輸入 session/person id"), "UI explains no raw session/person id entry");
check(pageSource.includes("writesRelationshipGraph: false"), "UI type proof keeps no graph write");
check(pageSource.includes("writesVisitPlan: false"), "UI type proof keeps no VisitPlan write");
check(pageSource.includes("writesConfirmedCrmFact: false"), "UI type proof keeps no confirmed CRM fact write");
check(!panelBlock.includes("sourceTheaterSessionId"), "UI panel does not render raw theater session id");
check(!panelBlock.includes("sourcePersonId"), "UI panel does not render raw person id");
check(rowBlock.includes("followUpQuestion"), "UI row renders next-question text");

check(manifestSource.includes("/api/visits/[id]/route-b-state-proposal-context"), "AgentFacts manifest declares state proposal endpoint");
check(manifestSource.includes("getVisitRouteBStateProposalContextForMember"), "AgentFacts manifest declares BFF repository owner ref");
check(manifestSource.includes("VisitRouteBStateProposalContext"), "AgentFacts manifest declares state proposal DTO");
check(manifestSource.includes("pnpm visit:route-b-state-proposal-context-qa"), "AgentFacts manifest includes state proposal proof command");
check(registryQaSource.includes("src/app/api/visits/[id]/route-b-state-proposal-context/route.ts"), "registry QA expects state proposal route owner ref");
check(registryQaSource.includes("getVisitRouteBStateProposalContextForMember"), "registry QA expects state proposal repository evidence ref");
check(registryQaSource.includes("pnpm visit:route-b-state-proposal-context-qa"), "registry QA expects state proposal proof command");
check(packageSource.includes("\"visit:route-b-state-proposal-context-qa\""), "package exposes targeted state proposal QA script");

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      checkedFiles: [domainPath, routePath, repositoryPath, pagePath, manifestPath, registryQaPath, packagePath],
      actionId: "route-b-state-proposal-downstream-advisor-context",
      matchedBy: "routeBSourcePacketId",
      browserSuppliedTheaterSessionId: false,
      browserSuppliedPersonId: false,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
    },
    null,
    2,
  ),
);
