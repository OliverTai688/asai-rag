#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  theaterBuild: "src/app/(dashboard)/theater/build/page.tsx",
  sessionPage: "src/app/(dashboard)/theater/[sessionId]/page.tsx",
  handoffDomain: "src/domains/theater/route-b-handoff.ts",
  sessionDomain: "src/domains/theater/route-b-session.ts",
  nextTurnDomain: "src/domains/theater/route-b-next-turn.ts",
  boundary: "src/lib/theater/route-b-boundary.ts",
  repository: "src/lib/theater/route-b-session-repository.ts",
  bffRepository: "src/lib/theater/route-b-session-bff-repository.ts",
  persistenceQa: "scripts/theater-route-b-persistence-qa.mjs",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(root, file), "utf8")]),
);
const checks = [];

expect(
  "Route B handoff contract declares safe meeting signal source grounding",
  source.handoffDomain.includes("TheaterRouteBMeetingSignalGroundingSummary") &&
    source.handoffDomain.includes("buildTheaterRouteBMeetingSignalGroundingSummary") &&
    source.handoffDomain.includes("bySourceType") &&
    source.handoffDomain.includes("sourceType") &&
    source.handoffDomain.includes("sourceGrounding?: TheaterRouteBSourceGrounding") &&
    source.handoffDomain.includes("browserSuppliedSessionId: false") &&
    source.handoffDomain.includes("rawTranscriptStored: false"),
);
expect(
  "theater build passes meeting stage cards into Route B session handoff",
  source.theaterBuild.includes("buildTheaterRouteBMeetingSignalGroundingSummary") &&
    source.theaterBuild.includes("meetingRelationshipSignals: meetingSignalGrounding") &&
    source.theaterBuild.includes("getMeetingSignalStageCards(handoffReview.handoff.knownMaterials)") &&
    source.theaterBuild.includes('getMaterialField(fields, "source_type")') &&
    source.theaterBuild.includes("getMeetingSignalNarratorPreviews(packet.narratorQuestions)"),
);
expect(
  "Route B boundary validates no-provider/no-write/no-raw meeting grounding flags",
  source.boundary.includes("validateMeetingSignalGroundingBoundary") &&
    source.boundary.includes("ownerScopedVisitPlanRequired") &&
    source.boundary.includes("browserSuppliedPersonId") &&
    source.boundary.includes("containsForbiddenGroundingValue") &&
    source.boundary.includes("rawTranscript"),
);
expect(
  "Route B session persistence stores source grounding in sceneState and metadata",
  source.repository.includes("sourceGrounding: handoff.scene.sourceGrounding") &&
    source.repository.match(/sourceGrounding: handoff\.scene\.sourceGrounding/g)?.length >= 2,
);
expect(
  "Route B session snapshot returns safe source grounding",
  source.sessionDomain.includes("sourceGrounding?: TheaterRouteBSourceGrounding") &&
    source.bffRepository.includes("sceneState.sourceGrounding") &&
    source.bffRepository.includes("isRouteBSourceGrounding") &&
    source.nextTurnDomain.includes("sourceGrounding: snapshot.scene.sourceGrounding"),
);
expect(
  "Route B stage UI renders persisted meeting signal grounding preview",
  source.sessionPage.includes("data-route-b-meeting-signal-source-grounding") &&
    source.sessionPage.includes("RouteBMeetingSignalGroundingPanel") &&
    source.sessionPage.includes("Browser session id") &&
    source.sessionPage.includes("CRM fact write"),
);
expect(
  "Route B persistence QA covers create/read/DB meeting grounding proof",
  source.persistenceQa.includes("created session returns meeting signal source grounding") &&
    source.persistenceQa.includes("read-back keeps meeting signal source grounding") &&
    source.persistenceQa.includes("getMeetingGroundingDbProof") &&
    source.persistenceQa.includes("writesVisitPlan") &&
    source.persistenceQa.includes("writesConfirmedCrmFact"),
);
expect(
  "meeting grounding source path does not use raw browser session/person ids",
  !/meetingSessionId|personIdFromBrowser|sourceReferenceIds/.test(
    [source.theaterBuild, source.handoffDomain, source.repository, source.bffRepository, source.sessionPage]
      .join("\n")
      .replace(/sourceReferenceIdsIncluded/g, ""),
  ),
);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function expect(label, condition) {
  checks.push({ label, status: condition ? "pass" : "fail" });
}
