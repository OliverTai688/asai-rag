import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertMeetingSummarySkeletonSafety,
  buildMeetingSummarySkeleton,
  type MeetingTranscriptTurn,
} from "../src/domains/interview/meeting";
import {
  assertMeetingSummaryPersistenceDraftSafety,
  buildMeetingSummaryPersistenceDraft,
  MEETING_AI_MODULE,
  MEETING_INTERVIEW_KIND,
  MEETING_SUMMARY_SCHEMA_VERSION,
} from "../src/lib/interview/meeting-summary-repository";

const turns: MeetingTranscriptTurn[] = [
  {
    id: "turn-meeting-001",
    speakerName: "林先生",
    speakerRole: "FOCUS_CLIENT",
    text: "確認下一次會議先檢視醫療實支與失能保障缺口。",
    occurredAt: "2026-06-21T03:00:00.000Z",
    source: "MANUAL",
    dataClass: "CONFIRMED",
    memoryIds: ["memory-health-gap"],
  },
  {
    id: "turn-meeting-002",
    speakerName: "顧問",
    speakerRole: "ADVISOR",
    text: "下週前需要準備兩版家庭責任圖，並確認保費預算上限。",
    occurredAt: "2026-06-21T03:03:00.000Z",
    source: "MANUAL",
    dataClass: "INFERENCE",
    memoryIds: ["memory-family-duty", "memory-budget"],
  },
  {
    id: "turn-meeting-003",
    speakerName: "林先生",
    speakerRole: "FOCUS_CLIENT",
    text: "不確定是否要邀請配偶一起參與下一次決策。",
    occurredAt: "2026-06-21T03:05:00.000Z",
    source: "TEXT",
    dataClass: "UNKNOWN",
  },
];

const summary = buildMeetingSummarySkeleton({
  meetingId: "meeting-demo-amm-001b",
  clientName: "林先生",
  generatedAt: "2026-06-21T03:10:00.000Z",
  turns,
});

const draft = buildMeetingSummaryPersistenceDraft({
  scope: {
    organizationId: "org-demo",
    unitId: "unit-demo",
    clientId: "client-demo",
    sessionId: "interview-session-meeting-demo",
    ownerId: "member-demo",
  },
  summary,
});

const failures = [
  ...assertMeetingSummarySkeletonSafety(
    summary,
    turns.map((turn) => turn.id),
  ),
  ...assertMeetingSummaryPersistenceDraftSafety(
    draft,
    turns.map((turn) => turn.id),
  ),
  ...assertPrismaMeetingSchema(readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8")),
];

if (draft.schemaVersion !== MEETING_SUMMARY_SCHEMA_VERSION) failures.push("draft schema version mismatch");
if (draft.interviewKind !== MEETING_INTERVIEW_KIND) failures.push("draft interview kind mismatch");
if (draft.aiUsageLogModule !== MEETING_AI_MODULE) failures.push("draft ai module mismatch");
if (draft.provider !== null) failures.push("no-provider draft unexpectedly has provider");
if (draft.usageLogId !== null) failures.push("no-provider draft unexpectedly has usageLogId");
if (draft.sourceTurnIds.length < 2) failures.push("sourceTurnIds were not extracted");
if (!draft.sourceMemoryIds.includes("memory-budget")) failures.push("sourceMemoryIds were not extracted");
if (draft.citations.length === 0) failures.push("meeting summary persistence draft missing citations");
if (draft.guardEvidence.dbWriteAttempted) failures.push("draft attempted DB write");
if (draft.guardEvidence.providerCallAttempted) failures.push("draft attempted provider call");

if (failures.length > 0) {
  console.error(`meeting persistence contract dry-run failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      schemaVersion: draft.schemaVersion,
      interviewKind: draft.interviewKind,
      aiUsageLogModule: draft.aiUsageLogModule,
      sourceTurnIds: draft.sourceTurnIds.length,
      sourceMemoryIds: draft.sourceMemoryIds.length,
      citations: draft.citations.length,
      providerCallAttempted: draft.guardEvidence.providerCallAttempted,
      dbWriteAttempted: draft.guardEvidence.dbWriteAttempted,
      provider: draft.provider,
      usageLogId: draft.usageLogId,
    },
    null,
    2,
  ),
);

function assertPrismaMeetingSchema(schema: string): string[] {
  const failures: string[] = [];
  const checks: Array<[RegExp, string]> = [
    [/enum\s+InterviewKind\s+\{[\s\S]*CLIENT_MEETING[\s\S]*\}/, "InterviewKind.CLIENT_MEETING missing"],
    [/enum\s+AiModule\s+\{[\s\S]*MEETING[\s\S]*\}/, "AiModule.MEETING missing"],
    [/model\s+InterviewMeetingSummary\s+\{[\s\S]*@@map\("interview_meeting_summaries"\)/, "InterviewMeetingSummary model missing"],
    [/sessionId\s+String\s+@unique\s+@map\("session_id"\)/, "InterviewMeetingSummary.sessionId unique missing"],
    [/sourceTurnIds\s+String\[\]\s+@map\("source_turn_ids"\)/, "sourceTurnIds column missing"],
    [/sourceMemoryIds\s+String\[\]\s+@map\("source_memory_ids"\)/, "sourceMemoryIds column missing"],
    [/usageLogId\s+String\?\s+@map\("usage_log_id"\)/, "usageLogId trace column missing"],
    [/meetingSummary\s+InterviewMeetingSummary\?/, "InterviewSession meetingSummary relation missing"],
  ];

  for (const [pattern, message] of checks) {
    if (!pattern.test(schema)) failures.push(message);
  }

  return failures;
}
