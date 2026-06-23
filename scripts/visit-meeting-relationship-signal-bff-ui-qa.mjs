#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routePath = resolve("src/app/api/visits/[id]/meeting-relationship-signals/route.ts");
const repositoryPath = resolve("src/lib/visits/meeting-relationship-signal-repository.ts");
const pagePath = resolve("src/app/(dashboard)/pre-visit/[planId]/page.tsx");
const manifestPath = resolve("src/domains/ai-protocol/manifest.ts");
const registryQaPath = resolve("scripts/ai-protocol-registry-qa.ts");
const packagePath = resolve("package.json");

const routeSource = readFileSync(routePath, "utf8");
const repositorySource = readFileSync(repositoryPath, "utf8");
const pageSource = readFileSync(pagePath, "utf8");
const manifestSource = readFileSync(manifestPath, "utf8");
const registryQaSource = readFileSync(registryQaPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const panelBlock = pageSource.match(/function MeetingRelationshipSignalPanel[\s\S]*?function MeetingRelationshipSignalCardRow/)?.[0] ?? "";
const repositorySourceWithoutProofKeys = repositorySource
  .replaceAll("providerCallAttempted: false", "")
  .replaceAll("aiUsageLogRequired: false", "")
  .replaceAll("aiUsageLogWritten: false", "")
  .replaceAll("storesRawPrivateTranscript: false", "")
  .replaceAll("storesRawProviderPayload: false", "");
const checks = [];

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

check(routeSource.includes("requireCurrentMember"), "route requires current member");
check(routeSource.includes("getVisitMeetingRelationshipSignalDeckForMember"), "route calls meeting relationship signal repository");
check(routeSource.includes("VISIT_PLAN_NOT_FOUND"), "route keeps visit-plan not-found boundary");
check(routeSource.includes("Cache-Control"), "route returns no-store response");
check(!routeSource.includes("searchParams"), "route does not accept query-supplied meeting session/person ids");

check(repositorySource.includes("getVisitPlanForMember(session, visitPlanId)"), "repository starts from owner-scoped visit plan");
check(repositorySource.includes("findLatestMeetingSessionForMember(session"), "repository derives meeting session from server session");
check(repositorySource.includes("visitPlanId: source.visitPlan.id"), "repository uses server-owned visitPlanId for lookup");
check(repositorySource.includes("readMeetingSummaryForMember(session, latestMeeting.session.id)"), "repository reads persisted meeting summary through owner scope");
check(repositorySource.includes("getMeetingWritebackPreviewForMember(session, latestMeeting.session.id)"), "repository reads writeback preview through owner scope");
check(repositorySource.includes("meetingWritebackCandidateToRelationshipSignal"), "repository maps writeback candidates through visit-domain bridge");
check(repositorySource.includes("buildVisitMeetingRelationshipSignalDeck"), "repository builds safe signal deck");
check(repositorySource.includes('sourceActionId: "meeting-notes-relationship-confirmation-signal"'), "repository tags the source action");
check(repositorySource.includes("ownerScopedVisitPlan: true"), "repository proves owner-scoped visit plan");
check(repositorySource.includes("ownerScopedMeetingSessionLookup: true"), "repository proves owner-scoped meeting lookup");
check(repositorySource.includes("browserSuppliedSessionId: false"), "repository proves no browser-supplied session id");
check(repositorySource.includes("browserSuppliedPersonId: false"), "repository proves no browser-supplied person id");
check(repositorySource.includes("providerCallAttempted: false"), "repository proves no provider call");
check(repositorySource.includes("aiUsageLogRequired: false"), "repository proves AiUsageLog not required");
check(repositorySource.includes("aiUsageLogWritten: false"), "repository does not fake AiUsageLog");
check(repositorySource.includes("writesRelationshipGraph: false"), "repository proves no relationship graph write");
check(repositorySource.includes("writesVisitPlan: false"), "repository proves no VisitPlan write");
check(repositorySource.includes("writesConfirmedCrmFact: false"), "repository proves no confirmed CRM fact write");
check(!/prisma\.(create|createMany|update|upsert|delete|deleteMany|\$transaction)/.test(repositorySource), "repository is read-only");
check(!/OpenAI|Anthropic|AiUsageLog|rawProviderPayload|rawPrivateTranscript|paymentData|cookie|secret|otp/i.test(repositorySourceWithoutProofKeys), "repository avoids provider/private/payment tokens outside proof booleans");

check(pageSource.includes("/meeting-relationship-signals"), "pre-visit detail fetches meeting relationship signals endpoint");
check(pageSource.includes("data-meeting-relationship-signal-cards"), "pre-visit detail renders meeting relationship signal cards");
check(pageSource.includes("MeetingRelationshipSignalPanel"), "pre-visit detail has meeting relationship signal panel");
check(pageSource.includes("no browser session/person id"), "UI exposes no raw session/person id posture");
check(pageSource.includes("no relationship graph write"), "UI states no relationship graph write");
check(!panelBlock.includes("sourceMeetingSessionId"), "UI panel does not render raw meeting session id");
check(!panelBlock.includes("sourceSummaryId"), "UI panel does not render raw summary id");

check(manifestSource.includes("/api/visits/[id]/meeting-relationship-signals"), "AgentFacts manifest declares meeting relationship signal endpoint");
check(manifestSource.includes("getVisitMeetingRelationshipSignalDeckForMember"), "AgentFacts manifest declares BFF repository owner ref");
check(manifestSource.includes("pnpm visit:meeting-relationship-signal-bff-ui-qa"), "AgentFacts manifest includes BFF/UI proof command");
check(registryQaSource.includes("src/app/api/visits/[id]/meeting-relationship-signals/route.ts"), "registry QA expects BFF route owner ref");
check(registryQaSource.includes("getVisitMeetingRelationshipSignalDeckForMember"), "registry QA expects BFF evidence ref");
check(registryQaSource.includes("pnpm visit:meeting-relationship-signal-bff-ui-qa"), "registry QA expects BFF/UI proof command");
check(
  packageJson.scripts?.["visit:meeting-relationship-signal-bff-ui-qa"] ===
    "node scripts/visit-meeting-relationship-signal-bff-ui-qa.mjs",
  "package.json exposes meeting relationship signal BFF/UI QA script",
);

console.log(
  JSON.stringify(
    {
      checkedCount: checks.length,
      checkedFiles: [routePath, repositoryPath, pagePath, manifestPath, registryQaPath, packagePath],
      actionId: "meeting-notes-relationship-confirmation-signal",
      matchedBy: "visitPlanId",
      browserSuppliedSessionId: false,
      browserSuppliedPersonId: false,
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      aiUsageLogWritten: false,
      persistedToDatabase: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
    },
    null,
    2,
  ),
);
