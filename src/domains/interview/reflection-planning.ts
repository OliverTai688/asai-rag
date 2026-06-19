import { retrieveInterviewMemories, type InterviewMemoryScore } from "./memory";
import { advisorCompanionOutline, theaterFieldBuildOutline } from "./outlines";
import type {
  InterviewKind,
  InterviewMemory,
  InterviewMicroPlan,
  InterviewOutline,
  InterviewReflection,
  InterviewSegment,
} from "./types";

export interface InterviewReflectionInput {
  organizationId: string;
  interviewSessionId: string;
  interviewKind: InterviewKind;
  currentSegmentId?: string | null;
  memories: InterviewMemory[];
}

export interface InterviewPlanningInput extends InterviewReflectionInput {
  latestReflection?: InterviewReflection | null;
  queryText?: string;
  now?: string;
}

export interface InterviewPlanningResult {
  microPlan: InterviewMicroPlan;
  retrieved: InterviewMemoryScore[];
  reflection: InterviewReflection;
}

export function buildInterviewReflection(input: InterviewReflectionInput): InterviewReflection {
  const outline = getOutlineForKind(input.interviewKind);
  const currentSegment = getSegment(outline, input.currentSegmentId);
  const scopedMemories = visibleCurrentMemories(input.memories);
  const confirmedFacts = uniqueTexts(scopedMemories.filter((memory) => memory.dataClass === "CONFIRMED"));
  const inferredPatterns = uniqueTexts(scopedMemories.filter((memory) => memory.dataClass === "INFERENCE"));
  const unknowns = uniqueTexts(scopedMemories.filter((memory) => memory.dataClass === "UNKNOWN"));
  const supportingMemoryIds = scopedMemories.map((memory) => memory.id);

  return {
    id: `reflection_${input.interviewSessionId}_${currentSegment.id}_${supportingMemoryIds.length}`,
    organizationId: input.organizationId,
    interviewSessionId: input.interviewSessionId,
    interviewKind: input.interviewKind,
    segmentId: currentSegment.id,
    summary: buildReflectionSummary(currentSegment, confirmedFacts, inferredPatterns, unknowns),
    confirmedFacts,
    inferredPatterns,
    unknowns,
    issueReadinessImpact: buildIssueReadinessImpact(confirmedFacts, inferredPatterns, unknowns),
    theaterBuildImpact: input.interviewKind === "THEATER_FIELD_BUILD" ? buildTheaterBuildImpact(confirmedFacts, inferredPatterns, unknowns) : undefined,
    recommendedNextFocus: buildRecommendedNextFocus(currentSegment, confirmedFacts, inferredPatterns, unknowns),
    supportingMemoryIds,
  };
}

export function buildInterviewPlanningResult(input: InterviewPlanningInput): InterviewPlanningResult {
  const outline = getOutlineForKind(input.interviewKind);
  const currentSegment = getSegment(outline, input.currentSegmentId);
  const reflection = input.latestReflection ?? buildInterviewReflection(input);
  const queryText = [
    input.queryText,
    currentSegment.goal,
    reflection.recommendedNextFocus,
    reflection.unknowns.join(" "),
    reflection.inferredPatterns.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const retrieved = retrieveInterviewMemories(input.memories, {
    organizationId: input.organizationId,
    memberId: input.memories[0]?.memberId,
    clientId: input.memories[0]?.clientId,
    interviewSessionId: input.interviewSessionId,
    interviewKind: input.interviewKind,
    currentSegmentId: currentSegment.id,
    text: queryText || currentSegment.goal,
    issueTags: inferIssueTagsForSegment(currentSegment),
    now: input.now,
    limit: 8,
  });
  const microPlan = buildMicroPlan(currentSegment, reflection, retrieved);

  return {
    microPlan,
    retrieved,
    reflection,
  };
}

export function getOutlineForKind(interviewKind: InterviewKind): InterviewOutline {
  return interviewKind === "THEATER_FIELD_BUILD" ? theaterFieldBuildOutline : advisorCompanionOutline;
}

function buildMicroPlan(
  currentSegment: InterviewSegment,
  reflection: InterviewReflection,
  retrieved: InterviewMemoryScore[],
): InterviewMicroPlan {
  const unknown = reflection.unknowns[0];
  const inference = reflection.inferredPatterns[0];
  const confirmedCount = reflection.confirmedFacts.length;
  const nextCoreQuestion = currentSegment.coreQuestions[confirmedCount % Math.max(currentSegment.coreQuestions.length, 1)];
  const supportingMemoryIds = retrieved.length
    ? retrieved.map((score) => score.memory.id)
    : reflection.supportingMemoryIds;

  if (unknown) {
    return {
      objective: currentSegment.goal,
      nextQuestion: `剛才「${unknown}」還不確定，可以先幫我確認這件事嗎？`,
      whyThisQuestion: "先把未知項確認清楚，避免後續準備卡或劇場 packet 把未知當成事實。",
      outlineSegmentId: currentSegment.id,
      issueTags: inferIssueTagsForSegment(currentSegment),
      expectedEvidenceType: "FACT",
      avoid: defaultAvoidRules(),
      supportingMemoryIds,
    };
  }

  if (inference) {
    return {
      objective: currentSegment.goal,
      nextQuestion: `我聽起來「${inference}」可能是重要線索，這是你確定知道的，還是目前的推測？`,
      whyThisQuestion: "先確認推論的可信度，避免把推論當成已確認事實使用。",
      outlineSegmentId: currentSegment.id,
      issueTags: inferIssueTagsForSegment(currentSegment),
      expectedEvidenceType: "FACT",
      avoid: defaultAvoidRules(),
      supportingMemoryIds,
    };
  }

  return {
    objective: currentSegment.goal,
    nextQuestion: nextCoreQuestion?.text ?? currentSegment.followUps[0]?.text ?? "這段還有哪個關鍵資訊需要先補齊？",
    whyThisQuestion: "延續目前訪綱段落，補齊尚未被 supporting memory 覆蓋的核心題。",
    outlineSegmentId: currentSegment.id,
    issueTags: inferIssueTagsForSegment(currentSegment),
    expectedEvidenceType: "RELATIONSHIP",
    avoid: defaultAvoidRules(),
    supportingMemoryIds,
  };
}

function buildReflectionSummary(
  currentSegment: InterviewSegment,
  confirmedFacts: string[],
  inferredPatterns: string[],
  unknowns: string[],
): string {
  return [
    `${currentSegment.title}：目前已確認 ${confirmedFacts.length} 項事實、${inferredPatterns.length} 項推論、${unknowns.length} 項待確認。`,
    unknowns.length ? "下一步應優先把待確認內容問清楚。" : "下一步可依訪綱補齊尚未覆蓋的核心題。",
  ].join("");
}

function buildIssueReadinessImpact(
  confirmedFacts: string[],
  inferredPatterns: string[],
  unknowns: string[],
): string {
  if (unknowns.length > 0) return "仍有待確認內容，應先追問，暫不把未知項寫入策略或 CRM fact。";
  if (confirmedFacts.length === 0 && inferredPatterns.length > 0) return "目前主要是推論，需要升級為已確認事實後再產生行動建議。";
  if (confirmedFacts.length > 0) return "已有可引用的已確認事實，可支援下一段訪談或準備卡生成。";
  return "尚未形成足夠 evidence，應繼續蒐集事實。";
}

function buildTheaterBuildImpact(
  confirmedFacts: string[],
  inferredPatterns: string[],
  unknowns: string[],
): string {
  if (unknowns.length > 0) return "劇場 packet 需保留旁白補問，未知項不得成為 NPC 事實。";
  if (inferredPatterns.length > 0) return "可形成 persona hints，但必須標示為推論。";
  if (confirmedFacts.length > 0) return "可作為劇場角色與情境的 confirmed fact seed。";
  return "劇場建構資料仍不足。";
}

function buildRecommendedNextFocus(
  currentSegment: InterviewSegment,
  confirmedFacts: string[],
  inferredPatterns: string[],
  unknowns: string[],
): string {
  if (unknowns[0]) return `先確認：${unknowns[0]}`;
  if (inferredPatterns[0]) return `先判斷這是事實還是推測：${inferredPatterns[0]}`;
  if (confirmedFacts.length < currentSegment.coreQuestions.length) return currentSegment.coreQuestions[confirmedFacts.length]?.text ?? currentSegment.goal;
  return currentSegment.followUps[0]?.text ?? currentSegment.goal;
}

function getSegment(outline: InterviewOutline, currentSegmentId?: string | null): InterviewSegment {
  return outline.segments.find((segment) => segment.id === currentSegmentId) ?? outline.segments[0];
}

function visibleCurrentMemories(memories: InterviewMemory[]): InterviewMemory[] {
  return memories.filter((memory) => !memory.supersededByMemoryId && memory.dataClass !== "INSTRUCTION");
}

function uniqueTexts(memories: InterviewMemory[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const memory of memories) {
    const text = memory.text.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }

  return result;
}

function inferIssueTagsForSegment(segment: InterviewSegment): string[] {
  if (segment.frameworkStep === "PROBLEM") return ["problem_representation"];
  if (segment.frameworkStep === "IMPLICATION") return ["risk_and_coping"];
  if (segment.frameworkStep === "NEED_PAYOFF") return ["decision_readiness"];
  if (segment.frameworkStep === "SYNTHESIS") return ["advisor_actionability"];
  return ["fact_completeness"];
}

function defaultAvoidRules(): string[] {
  return [
    "不要重問已確認事實",
    "不要把推論說成事實",
    "不要一次問多題",
    "不要給商品建議或保證",
  ];
}
