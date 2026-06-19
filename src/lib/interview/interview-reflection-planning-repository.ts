import { z } from "zod";
import {
  buildInterviewPlanningResult,
  buildInterviewReflection,
} from "@/domains/interview/reflection-planning";
import type {
  InterviewMemory,
  InterviewMemoryImportance,
  InterviewReflection,
} from "@/domains/interview/types";
import type { AppSession } from "@/lib/auth/session";
import {
  createPersistentInterviewReflection,
  getPersistentInterviewSessionSnapshot,
  type InterviewMemoryDto,
  type InterviewReflectionDto,
} from "./interview-persistence-repository";

export const generateInterviewReflectionInputSchema = z.object({
  currentSegmentId: z.string().trim().max(120).optional(),
});

export const generateInterviewPlanInputSchema = z.object({
  currentSegmentId: z.string().trim().max(120).optional(),
  queryText: z.string().trim().max(1200).optional(),
});

export type GenerateInterviewReflectionInput = z.infer<typeof generateInterviewReflectionInputSchema>;
export type GenerateInterviewPlanInput = z.infer<typeof generateInterviewPlanInputSchema>;

export async function generateAndPersistInterviewReflection(
  session: AppSession,
  sessionId: string,
  input: GenerateInterviewReflectionInput,
) {
  const snapshot = await getPersistentInterviewSessionSnapshot(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const generated = buildInterviewReflection({
    organizationId: snapshot.session.organizationId,
    interviewSessionId: snapshot.session.id,
    interviewKind: snapshot.session.interviewKind,
    currentSegmentId: input.currentSegmentId ?? snapshot.session.currentSegmentId,
    memories: snapshot.memories.map(toDomainMemory),
  });
  const persisted = await createPersistentInterviewReflection(session, sessionId, {
    segmentId: generated.segmentId,
    summary: generated.summary,
    confirmedFacts: generated.confirmedFacts,
    inferredPatterns: generated.inferredPatterns,
    unknowns: generated.unknowns,
    issueReadinessImpact: generated.issueReadinessImpact,
    theaterBuildImpact: generated.theaterBuildImpact,
    recommendedNextFocus: generated.recommendedNextFocus,
    supportingMemoryIds: generated.supportingMemoryIds,
  });

  if (!persisted) {
    return null;
  }

  return {
    reflection: persisted,
    generated,
  };
}

export async function generateInterviewPlan(
  session: AppSession,
  sessionId: string,
  input: GenerateInterviewPlanInput,
) {
  const snapshot = await getPersistentInterviewSessionSnapshot(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const memories = snapshot.memories.map(toDomainMemory);
  const latestReflection = snapshot.reflections.at(-1);
  const result = buildInterviewPlanningResult({
    organizationId: snapshot.session.organizationId,
    interviewSessionId: snapshot.session.id,
    interviewKind: snapshot.session.interviewKind,
    currentSegmentId: input.currentSegmentId ?? snapshot.session.currentSegmentId,
    memories,
    latestReflection: latestReflection ? toDomainReflection(latestReflection) : null,
    queryText: input.queryText,
  });

  return {
    microPlan: result.microPlan,
    supportingMemoryIds: result.microPlan.supportingMemoryIds ?? [],
    retrievedMemoryIds: result.retrieved.map((score) => score.memory.id),
    reflection: result.reflection,
  };
}

function toDomainMemory(memory: InterviewMemoryDto): InterviewMemory {
  return {
    id: memory.id,
    organizationId: memory.organizationId,
    memberId: memory.memberId,
    unitId: memory.unitId,
    clientId: memory.clientId,
    interviewSessionId: memory.sessionId,
    turnId: memory.turnId,
    interviewKind: memory.interviewKind,
    createdAt: memory.createdAt,
    kind: memory.kind,
    source: memory.source,
    dataClass: memory.dataClass,
    visibilityScope: memory.visibilityScope,
    text: memory.text,
    evidenceText: memory.evidenceText ?? undefined,
    confidence: memory.confidence,
    importance: clampImportance(memory.importance),
    issueTags: memory.issueTags,
    outlineSegmentId: memory.outlineSegmentId ?? undefined,
    pqQuestionIds: memory.pqQuestionIds,
    embeddingStatus: memory.embeddingStatus,
    retentionPolicy: memory.retentionPolicy,
    supersedesMemoryId: memory.supersedesMemoryId ?? undefined,
    supersededByMemoryId: memory.supersededByMemoryId ?? undefined,
  };
}

function toDomainReflection(reflection: InterviewReflectionDto): InterviewReflection {
  return {
    id: reflection.id,
    organizationId: reflection.organizationId,
    interviewSessionId: reflection.sessionId,
    interviewKind: reflection.interviewKind,
    segmentId: reflection.segmentId ?? undefined,
    summary: reflection.summary,
    confirmedFacts: reflection.confirmedFacts,
    inferredPatterns: reflection.inferredPatterns,
    unknowns: reflection.unknowns,
    issueReadinessImpact: reflection.issueReadinessImpact ?? undefined,
    theaterBuildImpact: reflection.theaterBuildImpact ?? undefined,
    recommendedNextFocus: reflection.recommendedNextFocus,
    supportingMemoryIds: reflection.supportingMemoryIds,
  };
}

function clampImportance(value: number): InterviewMemoryImportance {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return Math.round(value) as InterviewMemoryImportance;
}
