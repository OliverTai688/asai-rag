#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  route: "src/app/api/visits/[id]/theater-handoff/route.ts",
  domain: "src/domains/theater/visit-handoff.ts",
  previsit: "src/app/(dashboard)/pre-visit/[planId]/page.tsx",
  theaterBuild: "src/app/(dashboard)/theater/build/page.tsx",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(root, file), "utf8")]),
);
const checks = [];

expect(
  "theater handoff route derives meeting relationship signals server-side",
  source.route.includes("getVisitMeetingRelationshipSignalDeckForMember") &&
    source.route.includes("meetingRelationshipSignalResult") &&
    source.route.includes("meetingRelationshipSignalDeck"),
);
expect(
  "theater handoff route does not accept browser-supplied meeting session ids",
  !/meetingSessionId|searchParams|get\(["']session|params\.get\(["']session/.test(source.route),
);
expect(
  "handoff domain accepts meeting relationship signal deck",
  source.domain.includes("VisitMeetingRelationshipSignalDeck") &&
    source.domain.includes("meetingRelationshipSignalDeck?: VisitMeetingRelationshipSignalDeck | null"),
);
expect(
  "handoff domain emits meeting signal knownMaterials and narrator questions",
  source.domain.includes("meeting_relationship_signal_card=") &&
    source.domain.includes("writes_relationship_graph=false") &&
    source.domain.includes("addMeetingSignalNarratorQuestions"),
);
expect(
  "handoff domain exposes no-provider/no-write source summary",
  source.domain.includes("VisitTheaterMeetingRelationshipSignalHandoffSummary") &&
    source.domain.includes("providerCallAttempted: false") &&
    source.domain.includes("persistedToDatabase: false") &&
    source.domain.includes("writesRelationshipGraph: false") &&
    source.domain.includes("writesVisitPlan: false") &&
    source.domain.includes("writesConfirmedCrmFact: false"),
);
expect(
  "pre-visit UI preview passes loaded meeting signal deck into theater handoff",
  source.previsit.includes("const meetingRelationshipSignalDeck = activeMeetingRelationshipSignals?.deck ?? null") &&
    source.previsit.includes("meetingRelationshipSignalDeck,"),
);
expect(
  "theater build source review surfaces meeting signal count",
  source.theaterBuild.includes('SourceCountPill label="會議"') &&
    source.theaterBuild.includes("meetingRelationshipSignals"),
);
expect(
  "theater build source review renders meeting signal stage cards",
  source.theaterBuild.includes("data-meeting-signal-stage-cards") &&
    source.theaterBuild.includes("getMeetingSignalStageCards") &&
    source.theaterBuild.includes("MEETING_SIGNAL_STATUS_LABEL") &&
    source.theaterBuild.includes("meeting_relationship_signal_card="),
);
expect(
  "theater build source review previews narrator questions and no-write boundary",
  source.theaterBuild.includes("data-meeting-signal-narrator-preview") &&
    source.theaterBuild.includes("旁白補問 preview") &&
    source.theaterBuild.includes("不寫回關係圖、VisitPlan 或 CRM 事實"),
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
