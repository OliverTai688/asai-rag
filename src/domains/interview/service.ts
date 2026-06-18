import { advisorCompanionOutline } from "./outlines";
import {
  InterviewAnswer,
  InterviewMaterial,
  InterviewMode,
  InterviewOutline,
  InterviewSegment,
  InterviewSession,
  SegmentProgress,
} from "./types";

const outlines = [advisorCompanionOutline] satisfies InterviewOutline[];

export function listInterviewOutlines(): InterviewOutline[] {
  return outlines;
}

export function getInterviewOutline(outlineId: string): InterviewOutline | undefined {
  return outlines.find((outline) => outline.id === outlineId);
}

export function getFirstSegment(outline: InterviewOutline): InterviewSegment {
  return outline.segments.reduce((first, segment) => (segment.order < first.order ? segment : first), outline.segments[0]);
}

export function createInterviewSession(params?: {
  id?: string;
  outlineId?: string;
  mode?: InterviewMode;
  clientId?: string;
  visitPlanId?: string;
}): InterviewSession {
  const outline = getInterviewOutline(params?.outlineId ?? advisorCompanionOutline.id) ?? advisorCompanionOutline;
  const now = new Date().toISOString();

  return {
    id: params?.id ?? `interview_${Date.now()}`,
    outlineId: outline.id,
    mode: params?.mode ?? "INDEPENDENT",
    status: "ACTIVE",
    currentSegmentId: getFirstSegment(outline).id,
    clientId: params?.clientId,
    visitPlanId: params?.visitPlanId,
    answers: [],
    materials: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getSegmentProgress(outline: InterviewOutline, session: InterviewSession, segmentId: string): SegmentProgress {
  const segment = outline.segments.find((candidate) => candidate.id === segmentId);
  if (!segment) {
    throw new Error(`Unknown interview segment: ${segmentId}`);
  }

  const answeredCoreQuestionIds = segment.coreQuestions
    .filter((question) => session.answers.some((answer) => answer.segmentId === segment.id && answer.questionId === question.id && answer.content.trim().length > 0))
    .map((question) => question.id);
  const missingCoreQuestionIds = segment.coreQuestions
    .filter((question) => !answeredCoreQuestionIds.includes(question.id))
    .map((question) => question.id);

  return {
    segment,
    answeredCoreQuestionIds,
    missingCoreQuestionIds,
    canAdvance: missingCoreQuestionIds.length === 0,
  };
}

export function getNextSegment(outline: InterviewOutline, currentSegmentId: string): InterviewSegment | undefined {
  const current = outline.segments.find((segment) => segment.id === currentSegmentId);
  if (!current) return undefined;
  return outline.segments
    .filter((segment) => segment.order > current.order)
    .sort((a, b) => a.order - b.order)[0];
}

export function addInterviewAnswer(session: InterviewSession, answer: Omit<InterviewAnswer, "id" | "createdAt">): InterviewSession {
  const now = new Date().toISOString();
  const nextAnswer: InterviewAnswer = {
    ...answer,
    id: `answer_${Date.now()}`,
    createdAt: now,
  };

  return {
    ...session,
    answers: [...session.answers, nextAnswer],
    updatedAt: now,
  };
}

export function addInterviewMaterial(session: InterviewSession, material: Omit<InterviewMaterial, "id" | "createdAt">): InterviewSession {
  const now = new Date().toISOString();
  const nextMaterial: InterviewMaterial = {
    ...material,
    id: `material_${Date.now()}`,
    createdAt: now,
  };

  return {
    ...session,
    materials: [...session.materials, nextMaterial],
    updatedAt: now,
  };
}

export function advanceInterviewSegment(outline: InterviewOutline, session: InterviewSession): InterviewSession {
  const progress = getSegmentProgress(outline, session, session.currentSegmentId);
  if (!progress.canAdvance) return session;

  const nextSegment = getNextSegment(outline, session.currentSegmentId);
  const now = new Date().toISOString();

  return {
    ...session,
    currentSegmentId: nextSegment?.id ?? session.currentSegmentId,
    status: nextSegment ? session.status : "READY_TO_REVIEW",
    updatedAt: now,
  };
}
