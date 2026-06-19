import { advisorCompanionOutline } from "./outlines";
import {
  createMemoryCandidatesFromTurn,
  retrieveInterviewMemories,
  type InterviewMemoryScore,
} from "./memory";
import type {
  InterviewDataClass,
  InterviewMemory,
  InterviewMicroPlan,
  InterviewSegment,
} from "./types";

export interface AdvisorMemoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdvisorMemoryLoopInput {
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  clientId?: string | null;
  sessionId?: string;
  currentSegmentId?: string;
  messages: AdvisorMemoryMessage[];
  knownMaterials?: string[];
  now?: string;
}

export interface AdvisorMemoryLoopContext {
  memories: InterviewMemory[];
  retrieved: InterviewMemoryScore[];
  microPlan: InterviewMicroPlan;
  promptContext: string;
  evidence: AdvisorMemoryEvidence;
}

export interface AdvisorMemoryEvidence {
  supportingMemoryIds: string[];
  confirmedFactMemoryIds: string[];
  inferenceMemoryIds: string[];
  unknownMemoryIds: string[];
}

const DEFAULT_SESSION_ID = "interview_session_local";
const DATA_CLASS_LABELS: Record<InterviewDataClass, string> = {
  FACT: "一般事實",
  CONFIRMED: "已確認事實",
  INFERENCE: "合理推論",
  UNKNOWN: "待確認",
  INSTRUCTION: "訪談控制",
};

export function buildAdvisorMemoryLoopContext(input: AdvisorMemoryLoopInput): AdvisorMemoryLoopContext {
  const sessionId = input.sessionId || DEFAULT_SESSION_ID;
  const currentSegment = getCurrentSegment(input.currentSegmentId);
  const now = input.now ?? new Date().toISOString();
  const memories = buildAdvisorMemoryStream({ ...input, sessionId, currentSegmentId: currentSegment.id, now });
  const latestUserMessage = [...input.messages].reverse().find((message) => message.role === "user")?.content ?? currentSegment.goal;
  const retrieved = retrieveInterviewMemories(memories, {
    organizationId: input.organizationId,
    memberId: input.memberId,
    clientId: input.clientId,
    interviewSessionId: sessionId,
    interviewKind: "ADVISOR_COMPANION",
    currentSegmentId: currentSegment.id,
    text: `${latestUserMessage} ${currentSegment.goal} ${currentSegment.coreQuestions.map((question) => question.text).join(" ")}`,
    issueTags: inferIssueTagsForSegment(currentSegment),
    now,
    limit: 8,
  });
  const evidence = buildAdvisorMemoryEvidence(retrieved.map((score) => score.memory));
  const microPlan = buildAdvisorMicroPlan(currentSegment, retrieved, evidence);

  return {
    memories,
    retrieved,
    microPlan,
    evidence,
    promptContext: buildAdvisorMemoryPromptContext(retrieved, microPlan),
  };
}

export function buildAdvisorMemoryStream(input: AdvisorMemoryLoopInput & { sessionId: string; currentSegmentId: string; now: string }): InterviewMemory[] {
  const baseTime = Date.parse(input.now);
  const messages = input.messages.flatMap((message, index) =>
    createMemoryCandidatesFromTurn({
      organizationId: input.organizationId,
      memberId: input.memberId,
      unitId: input.unitId ?? null,
      clientId: input.clientId ?? null,
      interviewSessionId: input.sessionId,
      turnId: `message_${index}`,
      interviewKind: "ADVISOR_COMPANION",
      role: message.role === "user" ? "USER" : "ASSISTANT",
      modality: "TEXT",
      content: message.content,
      createdAt: new Date(baseTime - Math.max(input.messages.length - index, 0) * 1000).toISOString(),
      outlineSegmentId: input.currentSegmentId,
      issueTags: inferIssueTagsForSegment(getCurrentSegment(input.currentSegmentId)),
    }),
  );

  const materialOffset = messages.length + 1;
  const materials = (input.knownMaterials ?? []).flatMap((material, index) =>
    createMemoryCandidatesFromTurn({
      organizationId: input.organizationId,
      memberId: input.memberId,
      unitId: input.unitId ?? null,
      clientId: input.clientId ?? null,
      interviewSessionId: input.sessionId,
      turnId: `material_${index}`,
      interviewKind: "ADVISOR_COMPANION",
      role: "USER",
      modality: "TEXT",
      content: material,
      createdAt: new Date(baseTime - Math.max(materialOffset - index, 0) * 1000).toISOString(),
      outlineSegmentId: input.currentSegmentId,
      issueTags: inferIssueTagsForSegment(getCurrentSegment(input.currentSegmentId)),
      dataClass: inferMaterialDataClass(material),
      evidenceText: "knownMaterials",
    }),
  );

  return [...messages, ...materials];
}

export function buildAdvisorMemoryPromptContext(retrieved: InterviewMemoryScore[], microPlan: InterviewMicroPlan): string {
  const memories = retrieved.map(({ memory, total }) => {
    const label = DATA_CLASS_LABELS[memory.dataClass];
    return `- [${memory.id}] ${label}｜confidence=${memory.confidence}｜score=${total}: ${memory.text}`;
  });

  return [
    "Park-style 訪談記憶：",
    memories.length ? memories.join("\n") : "- 目前沒有可引用的前文記憶。",
    "",
    "訪談微計畫：",
    `- 目標：${microPlan.objective}`,
    `- 下一題：${microPlan.nextQuestion}`,
    `- 為什麼問：${microPlan.whyThisQuestion}`,
    `- 避免：${microPlan.avoid.join("；")}`,
    "",
    "記憶使用規則：",
    "1. 已確認事實可以引用，但不要重問同一件事。",
    "2. 合理推論只能用不確定語氣提出確認，不得說成事實。",
    "3. 待確認內容要先追問，不得直接生成策略。",
    "4. 一次只問一個主要問題，優先執行微計畫的下一題。",
  ].join("\n");
}

export function encodeInterviewPlanHeader(microPlan: InterviewMicroPlan): string {
  return encodeURIComponent(
    JSON.stringify({
      objective: microPlan.objective,
      nextQuestion: microPlan.nextQuestion,
      whyThisQuestion: microPlan.whyThisQuestion,
      outlineSegmentId: microPlan.outlineSegmentId,
      supportingMemoryIds: microPlan.supportingMemoryIds ?? [],
    }),
  );
}

export function buildAdvisorMemoryEvidence(memories: InterviewMemory[]): AdvisorMemoryEvidence {
  return {
    supportingMemoryIds: memories.map((memory) => memory.id),
    confirmedFactMemoryIds: memories.filter((memory) => memory.dataClass === "CONFIRMED").map((memory) => memory.id),
    inferenceMemoryIds: memories.filter((memory) => memory.dataClass === "INFERENCE").map((memory) => memory.id),
    unknownMemoryIds: memories.filter((memory) => memory.dataClass === "UNKNOWN").map((memory) => memory.id),
  };
}

function buildAdvisorMicroPlan(
  currentSegment: InterviewSegment,
  retrieved: InterviewMemoryScore[],
  evidence: AdvisorMemoryEvidence,
): InterviewMicroPlan {
  const unknown = retrieved.find((score) => score.memory.dataClass === "UNKNOWN")?.memory;
  const inference = retrieved.find((score) => score.memory.dataClass === "INFERENCE")?.memory;
  const confirmedCount = evidence.confirmedFactMemoryIds.length;
  const nextCoreQuestion = currentSegment.coreQuestions[confirmedCount % Math.max(currentSegment.coreQuestions.length, 1)];
  const nextQuestion = unknown
    ? `剛才「${unknown.text}」還不確定，可以先幫我確認這件事嗎？`
    : inference
      ? `我聽起來「${inference.text}」可能是重要線索，這是你確定知道的，還是目前的推測？`
      : nextCoreQuestion?.text ?? currentSegment.followUps[0]?.text ?? "這段還有哪個關鍵資訊需要先補齊？";

  return {
    objective: currentSegment.goal,
    nextQuestion,
    whyThisQuestion: unknown
      ? "先釐清待確認內容，避免後續準備卡把未知當成事實。"
      : inference
        ? "先把推論升級或降級，確保後續只用已確認事實做準備。"
        : "延續目前訪綱段落，補齊尚未被記憶證據覆蓋的核心題。",
    outlineSegmentId: currentSegment.id,
    issueTags: inferIssueTagsForSegment(currentSegment),
    expectedEvidenceType: unknown || inference ? "FACT" : "RELATIONSHIP",
    avoid: [
      "不要重問已確認事實",
      "不要把推論說成事實",
      "不要一次問多題",
      "不要給商品建議或保證",
    ],
    supportingMemoryIds: evidence.supportingMemoryIds,
  };
}

function inferMaterialDataClass(material: string): InterviewDataClass {
  const normalized = material.toUpperCase();
  if (normalized.startsWith("FACT:")) return "CONFIRMED";
  if (normalized.startsWith("INFERENCE:")) return "INFERENCE";
  if (normalized.startsWith("UNKNOWN:")) return "UNKNOWN";
  return "FACT";
}

function inferIssueTagsForSegment(segment: InterviewSegment): string[] {
  if (segment.frameworkStep === "PROBLEM") return ["problem_representation"];
  if (segment.frameworkStep === "IMPLICATION") return ["risk_and_coping"];
  if (segment.frameworkStep === "NEED_PAYOFF") return ["decision_readiness"];
  if (segment.frameworkStep === "SYNTHESIS") return ["advisor_actionability"];
  return ["fact_completeness"];
}

function getCurrentSegment(currentSegmentId?: string): InterviewSegment {
  return (
    advisorCompanionOutline.segments.find((segment) => segment.id === currentSegmentId) ??
    advisorCompanionOutline.segments[0]
  );
}
