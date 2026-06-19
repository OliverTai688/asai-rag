import {
  buildAdvisorMemoryLoopContext,
  buildAdvisorMemoryPromptContext,
  encodeInterviewPlanHeader,
} from "../src/domains/interview/park-loop";

const context = buildAdvisorMemoryLoopContext({
  organizationId: "org_demo",
  memberId: "member_demo",
  clientId: "client_wang",
  sessionId: "interview_advisor_demo",
  currentSegmentId: "current-situation",
  now: "2026-06-19T03:34:54.488Z",
  knownMaterials: [
    "FACT: 確定王大明是家裡主要經濟支柱，房貸還有二十年。",
    "INFERENCE: 太太可能會反對，因為她覺得保險很複雜。",
    "UNKNOWN: 不確定既有醫療險是否快到期。",
  ],
  messages: [
    {
      role: "assistant",
      content: "我們先了解客戶現況。",
    },
    {
      role: "user",
      content: "確定王大明是家裡主要經濟支柱，房貸還有二十年。",
    },
    {
      role: "user",
      content: "我不確定既有醫療險是否快到期。",
    },
  ],
});

const promptContext = buildAdvisorMemoryPromptContext(context.retrieved, context.microPlan);
const decodedHeader = JSON.parse(decodeURIComponent(encodeInterviewPlanHeader(context.microPlan))) as {
  nextQuestion?: string;
  supportingMemoryIds?: string[];
};
const failures: string[] = [];

if (context.memories.length < 6) failures.push("memory stream did not include both messages and known materials");
if (context.evidence.confirmedFactMemoryIds.length === 0) failures.push("confirmed fact evidence is missing");
if (context.evidence.inferenceMemoryIds.length === 0) failures.push("inference evidence is missing");
if (context.evidence.unknownMemoryIds.length === 0) failures.push("unknown evidence is missing");
if (!context.microPlan.nextQuestion.includes("不確定")) failures.push("micro plan did not prioritize unknown confirmation");
if (context.microPlan.nextQuestion.includes("主要經濟支柱")) failures.push("micro plan repeated an already confirmed fact");
if (!promptContext.includes("已確認事實")) failures.push("prompt context does not partition confirmed facts");
if (!promptContext.includes("合理推論")) failures.push("prompt context does not partition inferences");
if (!promptContext.includes("待確認")) failures.push("prompt context does not partition unknowns");
if (!decodedHeader.nextQuestion || decodedHeader.supportingMemoryIds?.length === 0) failures.push("plan response header payload is incomplete");

if (failures.length > 0) {
  console.error("interview:park-loop-dry-run — failed");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("interview:park-loop-dry-run — advisor memory loop passed.");
console.log(
  JSON.stringify(
    {
      memoryCount: context.memories.length,
      supportingMemoryIds: context.evidence.supportingMemoryIds,
      nextQuestion: context.microPlan.nextQuestion,
      whyThisQuestion: context.microPlan.whyThisQuestion,
    },
    null,
    2,
  ),
);
