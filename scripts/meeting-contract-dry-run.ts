import {
  assertMeetingSummarySkeletonSafety,
  buildMeetingSummarySkeleton,
  type MeetingTranscriptTurn,
} from "../src/domains/interview/meeting";

const turns: MeetingTranscriptTurn[] = [
  {
    id: "turn-001",
    speakerName: "林先生",
    speakerRole: "FOCUS_CLIENT",
    text: "確認下次先檢視醫療實支與失能保障。",
    occurredAt: "2026-06-21T02:00:00.000Z",
    source: "MANUAL",
    dataClass: "CONFIRMED",
    memoryIds: ["memory-health-gap"],
  },
  {
    id: "turn-002",
    speakerName: "顧問",
    speakerRole: "ADVISOR",
    text: "下週前需要準備兩版家庭責任圖，並確認保費預算上限。",
    occurredAt: "2026-06-21T02:02:00.000Z",
    source: "MANUAL",
    dataClass: "INFERENCE",
    memoryIds: ["memory-family-duty", "memory-budget"],
  },
  {
    id: "turn-003",
    speakerName: "林先生",
    speakerRole: "FOCUS_CLIENT",
    text: "不確定是否要邀請配偶一起參與下一次決策。",
    occurredAt: "2026-06-21T02:05:00.000Z",
    source: "TEXT",
    dataClass: "UNKNOWN",
  },
  {
    id: "turn-004",
    speakerName: "配偶",
    speakerRole: "FAMILY",
    text: "推論配偶可能擔心方案太複雜，需要用家庭責任語言說明。",
    occurredAt: "2026-06-21T02:07:00.000Z",
    source: "TEXT",
    dataClass: "INFERENCE",
    memoryIds: ["memory-family-duty"],
  },
];

const summary = buildMeetingSummarySkeleton({
  meetingId: "meeting-demo-amm-001a",
  clientName: "林先生",
  generatedAt: "2026-06-21T02:10:00.000Z",
  turns,
});

const failures = assertMeetingSummarySkeletonSafety(
  summary,
  turns.map((turn) => turn.id),
);

if (summary.schemaVersion !== "asai.meeting.summary.v1") failures.push("schema version mismatch");
if (summary.decisions.some((item) => item.dataClass === "UNKNOWN")) failures.push("decision contains UNKNOWN");
if (summary.openQuestions.length === 0) failures.push("missing UNKNOWN item");
if (summary.actionItems.length === 0) failures.push("missing action item");
if (summary.participants.length < 2) failures.push("participant extraction failed");
if (summary.actionItems.some((item) => item.writesConfirmedCrmFact)) failures.push("action writes CRM fact");

const citationIds = new Set([
  ...summary.decisions.flatMap((item) => item.citations.map((citation) => citation.turnId)),
  ...summary.actionItems.flatMap((item) => item.citations.map((citation) => citation.turnId)),
  ...summary.openQuestions.flatMap((item) => item.citations.map((citation) => citation.turnId)),
]);
const turnIds = new Set(turns.map((turn) => turn.id));
for (const citationId of citationIds) {
  if (!turnIds.has(citationId)) failures.push(`unknown citation ${citationId}`);
}

const privateSentinels = ["sk-", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "policyNumber", "cookie", "otp"];
const serialized = JSON.stringify(summary);
for (const sentinel of privateSentinels) {
  if (serialized.includes(sentinel)) failures.push(`private sentinel leaked: ${sentinel}`);
}

if (failures.length > 0) {
  console.error(`meeting contract dry-run failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      schemaVersion: summary.schemaVersion,
      participants: summary.participants.length,
      decisions: summary.decisions.length,
      actionItems: summary.actionItems.length,
      openQuestions: summary.openQuestions.length,
      citations: citationIds.size,
      providerCallAttempted: summary.guardEvidence.providerCallAttempted,
      dbWriteAttempted: summary.guardEvidence.dbWriteAttempted,
      writesConfirmedCrmFact: summary.guardEvidence.writesConfirmedCrmFact,
    },
    null,
    2,
  ),
);
