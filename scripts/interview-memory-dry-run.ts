import {
  applyMemoryCorrection,
  createCorrectionMemory,
  createMemoryCandidatesFromTurn,
  isConfirmedFact,
  retrieveInterviewMemories,
} from "../src/domains/interview/memory";
import type { InterviewMemory } from "../src/domains/interview/types";

const now = "2026-06-19T03:19:46.962Z";

const advisorMemories = createMemoryCandidatesFromTurn({
  organizationId: "org_demo",
  memberId: "member_demo",
  clientId: "client_wang",
  interviewSessionId: "interview_advisor_demo",
  turnId: "turn_001",
  interviewKind: "ADVISOR_COMPANION",
  role: "USER",
  modality: "TEXT",
  content: "確定王大明是家裡主要經濟支柱，房貸還有二十年。",
  createdAt: "2026-06-19T03:00:00.000Z",
  outlineSegmentId: "current-situation",
  issueTags: ["income_protection", "mortgage"],
});

const theaterMemories = createMemoryCandidatesFromTurn({
  organizationId: "org_demo",
  memberId: "member_demo",
  clientId: "client_wang",
  interviewSessionId: "interview_theater_demo",
  turnId: "turn_002",
  interviewKind: "THEATER_FIELD_BUILD",
  role: "USER",
  modality: "VOICE_TRANSCRIPT_FALLBACK",
  content: "他太太可能會反對，因為她覺得保險很複雜，而且上次親戚理賠經驗不好。",
  createdAt: "2026-06-19T03:04:00.000Z",
  outlineSegmentId: "theater-roles",
  issueTags: ["objection", "spouse"],
});

const uncertainMemories = createMemoryCandidatesFromTurn({
  organizationId: "org_demo",
  memberId: "member_demo",
  clientId: "client_wang",
  interviewSessionId: "interview_advisor_demo",
  turnId: "turn_003",
  interviewKind: "ADVISOR_COMPANION",
  role: "USER",
  modality: "VOICE_TRANSCRIPT_FALLBACK",
  transcriptFinal: false,
  content: "我不確定是不是聽成醫療險快到期。",
  createdAt: "2026-06-19T03:05:00.000Z",
  outlineSegmentId: "current-situation",
  issueTags: ["coverage_review"],
});

const correction = createCorrectionMemory({
  organizationId: "org_demo",
  memberId: "member_demo",
  clientId: "client_wang",
  interviewSessionId: "interview_advisor_demo",
  turnId: "turn_004",
  interviewKind: "ADVISOR_COMPANION",
  role: "USER",
  modality: "TEXT",
  content: "修正：不是醫療險快到期，是他最近剛做完保單健檢。",
  createdAt: "2026-06-19T03:06:00.000Z",
  outlineSegmentId: "current-situation",
  issueTags: ["coverage_review"],
  supersedesMemoryId: uncertainMemories[0].id,
});

const memories: InterviewMemory[] = applyMemoryCorrection([...advisorMemories, ...theaterMemories, ...uncertainMemories], correction);

const advisorResults = retrieveInterviewMemories(memories, {
  organizationId: "org_demo",
  memberId: "member_demo",
  clientId: "client_wang",
  interviewSessionId: "interview_advisor_demo",
  interviewKind: "ADVISOR_COMPANION",
  currentSegmentId: "current-situation",
  text: "主要經濟支柱 房貸 保障缺口",
  issueTags: ["income_protection"],
  now,
});

const theaterResults = retrieveInterviewMemories(memories, {
  organizationId: "org_demo",
  memberId: "member_demo",
  clientId: "client_wang",
  interviewSessionId: "interview_theater_demo",
  interviewKind: "THEATER_FIELD_BUILD",
  currentSegmentId: "theater-roles",
  text: "太太 反對 理賠 異議",
  issueTags: ["objection"],
  now,
});

const failures: string[] = [];

if (advisorMemories[0].dataClass !== "CONFIRMED") failures.push("advisor confirmed fact was not classified as CONFIRMED");
if (theaterMemories[0].dataClass !== "INFERENCE") failures.push("theater role signal was not classified as INFERENCE");
if (uncertainMemories[0].dataClass !== "UNKNOWN") failures.push("uncertain voice transcript was not classified as UNKNOWN");
if (!memories.find((memory) => memory.id === uncertainMemories[0].id)?.supersededByMemoryId) failures.push("correction did not supersede uncertain memory");
if (!isConfirmedFact(correction)) failures.push("correction is not usable as a confirmed fact");
if (advisorResults[0]?.memory.id !== advisorMemories[0].id) failures.push("advisor retrieval did not rank confirmed income-protection memory first");
if (theaterResults[0]?.memory.id !== theaterMemories[0].id) failures.push("theater retrieval did not rank spouse objection memory first");

if (failures.length > 0) {
  console.error("interview:memory-dry-run — failed");
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}

console.log("interview:memory-dry-run — advisor and theater memory contracts passed. ✅");
console.log(
  JSON.stringify(
    {
      advisorTopMemory: advisorResults[0].memory.id,
      theaterTopMemory: theaterResults[0].memory.id,
      correctionSupersedes: correction.supersedesMemoryId,
      memoryCount: memories.length,
    },
    null,
    2,
  ),
);
