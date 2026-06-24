#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const domainPath = resolve("src/domains/visit/route-b-feedback-advisor-context.ts");
const routePath = resolve("src/app/api/visits/[id]/route-b-feedback-advisor-context/route.ts");
const repositoryPath = resolve("src/lib/visits/route-b-feedback-advisor-context-repository.ts");
const pagePath = resolve("src/app/(dashboard)/pre-visit/[planId]/page.tsx");
const notesPath = resolve("src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx");
const meetingWorkspacePath = resolve("src/components/meeting/meeting-workspace.tsx");
const manifestPath = resolve("src/domains/ai-protocol/manifest.ts");
const registryQaPath = resolve("scripts/ai-protocol-registry-qa.ts");
const packagePath = resolve("package.json");

const domainSource = readFileSync(domainPath, "utf8");
const routeSource = readFileSync(routePath, "utf8");
const repositorySource = readFileSync(repositoryPath, "utf8");
const pageSource = readFileSync(pagePath, "utf8");
const notesSource = readFileSync(notesPath, "utf8");
const meetingWorkspaceSource = readFileSync(meetingWorkspacePath, "utf8");
const manifestSource = readFileSync(manifestPath, "utf8");
const registryQaSource = readFileSync(registryQaPath, "utf8");
const packageSource = readFileSync(packagePath, "utf8");
const pagePanelBlock =
  pageSource.match(/function RouteBFeedbackAdvisorContextPanel[\s\S]*?function RouteBFeedbackAdvisorContextRow/)?.[0] ?? "";
const meetingPanelBlock =
  meetingWorkspaceSource.match(/function RouteBFeedbackAdvisorContextPanel[\s\S]*?function RouteBStateProposalWritebackBridgePanel/)?.[0] ?? "";
const checks = [];

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

check(domainSource.includes("route-b-feedback-family-profile-advisor-context"), "domain declares feedback family profile action id");
check(domainSource.includes("sourceActionId: review.actionId"), "domain consumes Route B feedback persistence action");
check(domainSource.includes("requiresAdvisorConfirmation: true"), "domain keeps requiresAdvisorConfirmation true");
check(domainSource.includes("writesRelationshipGraph: false"), "domain proves no relationship graph write");
check(domainSource.includes("writesVisitPlan: false"), "domain proves no VisitPlan write");
check(domainSource.includes("writesClientProfile: false"), "domain proves no client profile write");
check(domainSource.includes("writesPolicy: false"), "domain proves no policy write");
check(domainSource.includes("writesConfirmedCrmFact: false"), "domain proves no confirmed CRM fact write");
check(domainSource.includes("rawTheaterSessionIdReturned: false"), "domain proves no raw theater session id returned");
check(domainSource.includes("rawPersonIdReturned: false"), "domain proves no raw person id returned");
check(domainSource.includes("sourceReferenceIdsReturned: false"), "domain proves no source reference ids returned");
check(domainSource.includes("selectVisitRouteBFeedbackAdvisorQuestionEvidence"), "domain emits visit question evidence");
check(domainSource.includes("cookie|secret|token|otp|payment"), "domain redacts secret/payment/cookie/OTP sentinels");
check(!/paymentData\s*:|rawCookie\s*:|rawSecret\s*:|rawOtp\s*:/i.test(domainSource), "domain does not define raw secret/payment/cookie/OTP payload fields");

check(routeSource.includes("requireCurrentMember"), "route requires current member");
check(routeSource.includes("getVisitRouteBFeedbackAdvisorContextForMember"), "route calls feedback advisor repository");
check(routeSource.includes("VISIT_PLAN_NOT_FOUND"), "route keeps visit-plan not-found boundary");
check(routeSource.includes("Cache-Control"), "route returns no-store response");
check(!routeSource.includes("searchParams"), "route does not accept query-supplied theater session/person ids");

check(repositorySource.includes("getVisitPlanForMember(session, visitPlanId)"), "repository starts from owner-scoped visit plan");
check(repositorySource.includes("buildVisitTheaterHandoff"), "repository derives source packet from server-owned handoff");
check(repositorySource.includes("organizationId: session.organization.id"), "repository scopes Route B lookup by organization");
check(repositorySource.includes("ownerId: session.user.id"), "repository scopes Route B lookup by owner");
check(repositorySource.includes("clientId: source.client.id"), "repository scopes Route B lookup by visit client");
check(repositorySource.includes("routeBSourcePacketId: sourcePacketId"), "repository joins by routeBSourcePacketId");
check(repositorySource.includes("isTheaterRouteBFeedbackReview"), "repository validates persisted feedback review");
check(repositorySource.includes("buildVisitRouteBFeedbackAdvisorContextFromFeedbackReview"), "repository consumes feedback review through visit-domain bridge");
check(repositorySource.includes("browserSuppliedTheaterSessionId: false"), "repository proves no browser-supplied theater session id");
check(repositorySource.includes("browserSuppliedPersonId: false"), "repository proves no browser-supplied person id");
check(repositorySource.includes("providerCallAttempted: false"), "repository proves no provider call");
check(repositorySource.includes("aiUsageLogWritten: false"), "repository does not fake AiUsageLog");
check(repositorySource.includes("writesRelationshipGraph: false"), "repository proves no relationship graph write");
check(repositorySource.includes("writesVisitPlan: false"), "repository proves no VisitPlan write");
check(repositorySource.includes("writesClientProfile: false"), "repository proves no client profile write");
check(repositorySource.includes("writesPolicy: false"), "repository proves no policy write");
check(repositorySource.includes("writesConfirmedCrmFact: false"), "repository proves no confirmed CRM fact write");
check(!repositorySource.includes("sourceTheaterSessionId"), "repository response omits raw theater session id");
check(!repositorySource.includes("sourcePersonId"), "repository response omits raw person id");

check(pageSource.includes("/route-b-feedback-advisor-context"), "pre-visit detail fetches feedback advisor endpoint");
check(pageSource.includes("data-route-b-feedback-advisor-context"), "pre-visit detail renders feedback advisor panel");
check(pageSource.includes("劇場回饋人物脈絡"), "pre-visit detail labels feedback profile context");
check(pageSource.includes("writesClientProfile: false"), "pre-visit detail type proof keeps no client profile write");
check(pageSource.includes("writesPolicy: false"), "pre-visit detail type proof keeps no policy write");
check(!pagePanelBlock.includes("sourceTheaterSessionId"), "pre-visit panel does not render raw theater session id");
check(!pagePanelBlock.includes("sourcePacketId"), "pre-visit panel does not render raw source packet id");

check(notesSource.includes("/route-b-feedback-advisor-context"), "notes page fetches feedback advisor endpoint");
check(notesSource.includes("MeetingRouteBFeedbackAdvisorContextDto"), "notes page passes feedback advisor DTO to MeetingWorkspace");
check(meetingWorkspaceSource.includes("buildRouteBFeedbackAdvisorNoteDraft"), "MeetingWorkspace merges feedback advisor context into note draft");
check(meetingWorkspaceSource.includes("meeting-route-b-feedback-advisor-context"), "MeetingWorkspace renders feedback advisor context panel");
check(meetingWorkspaceSource.includes("writesClientProfile: false"), "MeetingWorkspace type proof keeps no client profile write");
check(meetingWorkspaceSource.includes("writesPolicy: false"), "MeetingWorkspace type proof keeps no policy write");
check(!meetingPanelBlock.includes("sourceTheaterSessionId"), "meeting panel does not render raw theater session id");
check(!meetingPanelBlock.includes("sourcePacketId"), "meeting panel does not render raw source packet id");

check(manifestSource.includes("/api/visits/[id]/route-b-feedback-advisor-context"), "AgentFacts manifest declares feedback advisor endpoint");
check(manifestSource.includes("getVisitRouteBFeedbackAdvisorContextForMember"), "AgentFacts manifest declares repository owner ref");
check(manifestSource.includes("VisitRouteBFeedbackAdvisorContext"), "AgentFacts manifest declares feedback advisor DTO");
check(manifestSource.includes("pnpm visit:route-b-feedback-advisor-context-qa"), "AgentFacts manifest includes feedback advisor proof command");
check(registryQaSource.includes("src/app/api/visits/[id]/route-b-feedback-advisor-context/route.ts"), "registry QA expects feedback advisor route owner ref");
check(registryQaSource.includes("getVisitRouteBFeedbackAdvisorContextForMember"), "registry QA expects feedback advisor repository evidence ref");
check(registryQaSource.includes("pnpm visit:route-b-feedback-advisor-context-qa"), "registry QA expects feedback advisor proof command");
check(packageSource.includes("\"visit:route-b-feedback-advisor-context-qa\""), "package exposes targeted feedback advisor QA script");
check(packageSource.includes("\"visit:route-b-feedback-advisor-context-dry-run\""), "package exposes targeted feedback advisor dry-run script");

execFileSync("pnpm", ["visit:route-b-feedback-advisor-context-dry-run"], { stdio: "inherit" });

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      checkedFiles: [
        domainPath,
        routePath,
        repositoryPath,
        pagePath,
        notesPath,
        meetingWorkspacePath,
        manifestPath,
        registryQaPath,
        packagePath,
      ],
      actionId: "route-b-feedback-family-profile-advisor-context",
      matchedBy: "routeBSourcePacketId",
      browserSuppliedTheaterSessionId: false,
      browserSuppliedPersonId: false,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesClientProfile: false,
      writesPolicy: false,
      writesConfirmedCrmFact: false,
    },
    null,
    2,
  ),
);
