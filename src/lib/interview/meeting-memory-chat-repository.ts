import { z } from "zod";
import type { InterviewMemory } from "@/domains/interview/types";
import { retrieveInterviewMemories } from "@/domains/interview/memory";
import type { MeetingDataClass, MeetingSummaryItem, MeetingActionItem } from "@/domains/interview/meeting";
import type { InterviewMeetingSummaryModel } from "@/generated/prisma/models";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { findMeetingPayloadViolations, getMeetingSessionSnapshotForMember } from "./meeting-session-repository";
import type { InterviewMemoryDto } from "./interview-persistence-repository";

export const meetingMemoryChatInputSchema = z
  .object({
    mode: z.literal("DETERMINISTIC_NO_PROVIDER").default("DETERMINISTIC_NO_PROVIDER"),
    question: z.string().trim().min(3).max(500),
  })
  .strict();

export type MeetingMemoryChatInput = z.infer<typeof meetingMemoryChatInputSchema>;

export type MeetingMemoryChatSourceType =
  | "CURRENT_MEETING_MEMORY"
  | "CLIENT_MEMORY"
  | "MEETING_SUMMARY"
  | "CRM_CLIENT"
  | "CRM_FAMILY"
  | "CRM_POLICY"
  | "REPORT_METADATA";

export interface MeetingMemoryChatCitation {
  id: string;
  sourceType: MeetingMemoryChatSourceType;
  sourceId: string;
  sourceLabel: string;
  dataClass: MeetingDataClass;
  snippet: string;
  sessionId: string | null;
  turnId: string | null;
  memoryId: string | null;
  summaryId: string | null;
  occurredAt: string | null;
}

export interface MeetingMemoryChatItem {
  id: string;
  text: string;
  citationIds: string[];
}

export interface MeetingMemoryChatAnswer {
  question: string;
  answer: string;
  facts: MeetingMemoryChatItem[];
  inferences: MeetingMemoryChatItem[];
  unknowns: MeetingMemoryChatItem[];
  citations: MeetingMemoryChatCitation[];
  sourceBreakdown: Record<MeetingMemoryChatSourceType, number>;
}

export interface MeetingMemoryChatSafety {
  scopeSource: "server_session";
  visibilityScope: "member-private";
  providerCallAttempted: false;
  aiUsageLogRequired: false;
  aiUsageLogWritten: false;
  rawAudioStored: false;
  rawProviderPayloadStored: false;
  rawPrivateTranscriptReturned: false;
  personalContactReturned: false;
  policyIdentifierReturned: false;
  crossMemberMemoryShared: false;
  writesConfirmedCrmFact: false;
  generatedBy: "deterministic-memory-chat";
}

export type MeetingMemoryChatResult =
  | {
      status: "answered";
      clientId: string;
      sessionId: string | null;
      answer: MeetingMemoryChatAnswer;
      safety: MeetingMemoryChatSafety;
    }
  | {
      status: "client_scope_missing" | "grounding_empty" | "safety_failed";
      clientId: string | null;
      sessionId: string | null;
      safety: MeetingMemoryChatSafety;
      safetyFailures?: string[];
    };

interface GroundingSource {
  id: string;
  sourceType: MeetingMemoryChatSourceType;
  sourceId: string;
  sourceLabel: string;
  dataClass: MeetingDataClass;
  text: string;
  sessionId: string | null;
  turnId: string | null;
  memoryId: string | null;
  summaryId: string | null;
  occurredAt: string | null;
  score: number;
}

const MAX_CITATIONS = 10;
const MAX_BUCKET_ITEMS = 4;
const MAX_SOURCE_TEXT = 180;
const REDACTED = "[已隱藏]";

export function findMeetingMemoryChatPayloadViolations(value: unknown): string[] {
  return findMeetingPayloadViolations(value);
}

export async function answerMeetingMemoryChatForSession(
  session: AppSession,
  sessionId: string,
  input: MeetingMemoryChatInput,
): Promise<MeetingMemoryChatResult | null> {
  const snapshot = await getMeetingSessionSnapshotForMember(session, sessionId);

  if (!snapshot) {
    return null;
  }

  if (!snapshot.session.clientId) {
    return {
      status: "client_scope_missing",
      clientId: null,
      sessionId: snapshot.session.id,
      safety: meetingMemoryChatSafety(),
    };
  }

  return answerClientMemoryChatForMember(session, snapshot.session.clientId, input, snapshot.session.id);
}

export async function answerClientMemoryChatForMember(
  session: AppSession,
  clientId: string,
  input: MeetingMemoryChatInput,
  currentSessionId: string | null = null,
): Promise<MeetingMemoryChatResult | null> {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      status: { not: "ARCHIVED" },
    },
    select: {
      id: true,
      name: true,
      occupation: true,
      company: true,
      annualIncome: true,
      status: true,
      sensitivity: true,
      tags: true,
      aiTags: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!client) {
    return null;
  }

  const sources = await collectClientGroundingSources(session, clientId, currentSessionId);
  const ranked = rankSources(input.question, sources).slice(0, MAX_CITATIONS);

  if (ranked.length === 0) {
    return {
      status: "grounding_empty",
      clientId,
      sessionId: currentSessionId,
      safety: meetingMemoryChatSafety(),
    };
  }

  const answer = buildDeterministicMemoryAnswer(input.question, ranked);
  const safetyFailures = assertMeetingMemoryChatSafety(answer);

  if (safetyFailures.length > 0) {
    return {
      status: "safety_failed",
      clientId,
      sessionId: currentSessionId,
      safetyFailures,
      safety: meetingMemoryChatSafety(),
    };
  }

  return {
    status: "answered",
    clientId,
    sessionId: currentSessionId,
    answer,
    safety: meetingMemoryChatSafety(),
  };
}

async function collectClientGroundingSources(
  session: AppSession,
  clientId: string,
  currentSessionId: string | null,
): Promise<GroundingSource[]> {
  const [clientProfile, memories, summaries, familyMembers, policies, reports] = await Promise.all([
    prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: session.organization.id,
        ownerId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        name: true,
        occupation: true,
        company: true,
        annualIncome: true,
        status: true,
        sensitivity: true,
        tags: true,
        aiTags: true,
        updatedAt: true,
      },
    }),
    prisma.interviewMemory.findMany({
      where: {
        organizationId: session.organization.id,
        memberId: session.user.id,
        clientId,
        dataClass: { in: ["FACT", "CONFIRMED", "INFERENCE", "UNKNOWN"] },
        visibilityScope: { in: ["MEMBER_PRIVATE", "CLIENT_RECORD_CANDIDATE"] },
        supersededByMemoryId: null,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 40,
    }),
    prisma.interviewMeetingSummary.findMany({
      where: {
        organizationId: session.organization.id,
        ownerId: session.user.id,
        clientId,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
    }),
    prisma.familyMember.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        relation: true,
        age: true,
        parentMemberId: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 12,
    }),
    prisma.policy.findMany({
      where: { clientId },
      select: {
        id: true,
        category: true,
        productName: true,
        provider: true,
        status: true,
        premium: true,
        currency: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 10,
    }),
    prisma.report.findMany({
      where: {
        organizationId: session.organization.id,
        ownerId: session.user.id,
        clientId,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        title: true,
        status: true,
        version: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6,
    }),
  ]);

  const sources: GroundingSource[] = [];

  if (clientProfile) {
    sources.push({
      id: `crm-client:${clientProfile.id}`,
      sourceType: "CRM_CLIENT",
      sourceId: clientProfile.id,
      sourceLabel: "CRM 客戶檔案",
      dataClass: "CONFIRMED",
      text: [
        `客戶：${clientProfile.name}`,
        clientProfile.occupation ? `職業：${clientProfile.occupation}` : "",
        clientProfile.company ? `公司：${clientProfile.company}` : "",
        clientProfile.annualIncome ? `年收入：約 ${clientProfile.annualIncome.toString()} TWD` : "",
        `狀態：${clientProfile.status}`,
        `敏感度：${clientProfile.sensitivity}`,
        clientProfile.tags.length > 0 ? `標籤：${clientProfile.tags.join("、")}` : "",
        clientProfile.aiTags.length > 0 ? `AI 標籤：${clientProfile.aiTags.join("、")}` : "",
      ]
        .filter(Boolean)
        .join("；"),
      sessionId: null,
      turnId: null,
      memoryId: null,
      summaryId: null,
      occurredAt: clientProfile.updatedAt.toISOString(),
      score: 0,
    });
  }

  const memoryScores = retrieveInterviewMemories(
    memories.map(toDomainMemory),
    {
      organizationId: session.organization.id,
      memberId: session.user.id,
      clientId,
      interviewSessionId: currentSessionId ?? undefined,
      text: "client memory",
      includeCrossSessionClientMemories: true,
      limit: 20,
    },
  );
  const memoryScoreById = new Map(memoryScores.map((score) => [score.memory.id, score.total]));

  for (const memory of memories) {
    sources.push({
      id: `memory:${memory.id}`,
      sourceType: memory.sessionId === currentSessionId ? "CURRENT_MEETING_MEMORY" : "CLIENT_MEMORY",
      sourceId: memory.id,
      sourceLabel: memory.sessionId === currentSessionId ? "本場會議記憶" : "跨會議客戶記憶",
      dataClass: toMeetingDataClass(memory.dataClass),
      text: memory.evidenceText ? `${memory.text}（依據：${memory.evidenceText}）` : memory.text,
      sessionId: memory.sessionId,
      turnId: memory.turnId,
      memoryId: memory.id,
      summaryId: null,
      occurredAt: memory.createdAt.toISOString(),
      score: memoryScoreById.get(memory.id) ?? 0,
    });
  }

  for (const summary of summaries) {
    sources.push(...summaryToSources(summary, currentSessionId));
  }

  for (const member of familyMembers) {
    sources.push({
      id: `family:${member.id}`,
      sourceType: "CRM_FAMILY",
      sourceId: member.id,
      sourceLabel: "家庭關係圖",
      dataClass: "CONFIRMED",
      text: [
        `${member.name}：${member.relation}`,
        typeof member.age === "number" ? `年齡 ${member.age}` : "",
        member.parentMemberId ? "已有上層關係節點" : "",
      ]
        .filter(Boolean)
        .join("；"),
      sessionId: null,
      turnId: null,
      memoryId: null,
      summaryId: null,
      occurredAt: member.updatedAt.toISOString(),
      score: 0,
    });
  }

  for (const policy of policies) {
    sources.push({
      id: `policy:${policy.id}`,
      sourceType: "CRM_POLICY",
      sourceId: policy.id,
      sourceLabel: "保單投影",
      dataClass: "CONFIRMED",
      text: [
        `類別：${policy.category}`,
        policy.productName ? `產品：${policy.productName}` : "",
        `保險公司：${policy.provider}`,
        `狀態：${policy.status}`,
        policy.premium ? `保費：約 ${policy.premium.toString()} ${policy.currency}` : "",
      ]
        .filter(Boolean)
        .join("；"),
      sessionId: null,
      turnId: null,
      memoryId: null,
      summaryId: null,
      occurredAt: policy.updatedAt.toISOString(),
      score: 0,
    });
  }

  for (const report of reports) {
    sources.push({
      id: `report:${report.id}`,
      sourceType: "REPORT_METADATA",
      sourceId: report.id,
      sourceLabel: "報告索引",
      dataClass: "FACT",
      text: `報告：${report.title}；狀態：${report.status}；版本：v${report.version}`,
      sessionId: null,
      turnId: null,
      memoryId: null,
      summaryId: null,
      occurredAt: report.updatedAt.toISOString(),
      score: 0,
    });
  }

  return sources.filter((source) => source.text.trim() && !hasForbiddenPrivateText(source.text));
}

function summaryToSources(summary: InterviewMeetingSummaryModel, currentSessionId: string | null): GroundingSource[] {
  const sources: GroundingSource[] = [
    {
      id: `summary:${summary.id}:overview`,
      sourceType: "MEETING_SUMMARY",
      sourceId: summary.id,
      sourceLabel: summary.sessionId === currentSessionId ? "本場會議摘要" : "過去會議摘要",
      dataClass: "FACT",
      text: `${summary.headline}。${summary.summary}`,
      sessionId: summary.sessionId,
      turnId: null,
      memoryId: null,
      summaryId: summary.id,
      occurredAt: summary.updatedAt.toISOString(),
      score: 0,
    },
  ];

  for (const item of [
    ...summaryItems(summary.decisions, "decision"),
    ...summaryItems(summary.actionItems, "action"),
    ...summaryItems(summary.openQuestions, "question"),
  ]) {
    sources.push({
      id: `summary:${summary.id}:${item.item.id}`,
      sourceType: "MEETING_SUMMARY",
      sourceId: summary.id,
      sourceLabel: summary.sessionId === currentSessionId ? "本場會議摘要項目" : "過去會議摘要項目",
      dataClass: toMeetingDataClass(item.item.dataClass),
      text: item.item.text,
      sessionId: summary.sessionId,
      turnId: item.item.citations.at(0)?.turnId ?? null,
      memoryId: item.item.citations.at(0)?.memoryIds.at(0) ?? null,
      summaryId: summary.id,
      occurredAt: item.item.citations.at(0)?.occurredAt ?? summary.updatedAt.toISOString(),
      score: 0,
    });
  }

  return sources;
}

function summaryItems(value: unknown, prefix: string): Array<{ key: string; item: MeetingSummaryItem | MeetingActionItem }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isSummaryLikeItem)
    .map((item, index) => ({
      key: `${prefix}-${index + 1}`,
      item,
    }));
}

function isSummaryLikeItem(value: unknown): value is MeetingSummaryItem | MeetingActionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as { id?: unknown; text?: unknown; dataClass?: unknown; citations?: unknown };
  return typeof item.id === "string" && typeof item.text === "string" && typeof item.dataClass === "string" && Array.isArray(item.citations);
}

function rankSources(question: string, sources: GroundingSource[]): GroundingSource[] {
  return sources
    .map((source) => ({
      ...source,
      score: source.score + relevanceScore(question, source.text) + sourceTypeBoost(source.sourceType),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return (right.occurredAt ?? "").localeCompare(left.occurredAt ?? "");
    });
}

function buildDeterministicMemoryAnswer(question: string, sources: GroundingSource[]): MeetingMemoryChatAnswer {
  const citations = sources.map(toCitation);
  const citationBySourceId = new Map(citations.map((citation) => [citation.id, citation]));
  const factItems = sources
    .filter((source) => source.dataClass === "CONFIRMED" || source.dataClass === "FACT")
    .slice(0, MAX_BUCKET_ITEMS)
    .map((source, index) => toAnswerItem("fact", source, index, citationBySourceId));
  const inferenceItems = sources
    .filter((source) => source.dataClass === "INFERENCE")
    .slice(0, MAX_BUCKET_ITEMS)
    .map((source, index) => toAnswerItem("inference", source, index, citationBySourceId));
  const unknownItems = sources
    .filter((source) => source.dataClass === "UNKNOWN")
    .slice(0, MAX_BUCKET_ITEMS)
    .map((source, index) => toAnswerItem("unknown", source, index, citationBySourceId));

  return {
    question,
    answer: [
      "我先用可引用的客戶資料、本場會議與過去會議記憶回答。",
      factItems.length > 0 ? `已確認：${factItems.map((item) => item.text).join("；")}` : "已確認：目前沒有足夠的已確認依據。",
      inferenceItems.length > 0
        ? `推論：${inferenceItems.map((item) => item.text).join("；")}`
        : "推論：目前不新增推論。",
      unknownItems.length > 0
        ? `待確認：${unknownItems.map((item) => item.text).join("；")}`
        : "待確認：仍需在下一次會議中確認優先順序與決策參與者。",
      "此回覆不寫回 CRM confirmed fact，也未呼叫 provider。",
    ].join("\n"),
    facts: factItems,
    inferences: inferenceItems,
    unknowns: unknownItems,
    citations,
    sourceBreakdown: buildSourceBreakdown(sources),
  };
}

function toCitation(source: GroundingSource): MeetingMemoryChatCitation {
  return {
    id: source.id,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    sourceLabel: source.sourceLabel,
    dataClass: source.dataClass,
    snippet: sanitizeSnippet(source.text),
    sessionId: source.sessionId,
    turnId: source.turnId,
    memoryId: source.memoryId,
    summaryId: source.summaryId,
    occurredAt: source.occurredAt,
  };
}

function toAnswerItem(
  prefix: "fact" | "inference" | "unknown",
  source: GroundingSource,
  index: number,
  citationBySourceId: Map<string, MeetingMemoryChatCitation>,
): MeetingMemoryChatItem {
  return {
    id: `${prefix}-${index + 1}`,
    text: sanitizeSnippet(source.text),
    citationIds: citationBySourceId.has(source.id) ? [source.id] : [],
  };
}

function buildSourceBreakdown(sources: GroundingSource[]): Record<MeetingMemoryChatSourceType, number> {
  const initial: Record<MeetingMemoryChatSourceType, number> = {
    CURRENT_MEETING_MEMORY: 0,
    CLIENT_MEMORY: 0,
    MEETING_SUMMARY: 0,
    CRM_CLIENT: 0,
    CRM_FAMILY: 0,
    CRM_POLICY: 0,
    REPORT_METADATA: 0,
  };

  for (const source of sources) {
    initial[source.sourceType] += 1;
  }

  return initial;
}

function assertMeetingMemoryChatSafety(answer: MeetingMemoryChatAnswer): string[] {
  const serialized = JSON.stringify(answer);
  const failures: string[] = [];

  if (hasForbiddenPrivateText(serialized)) failures.push("private or provider sentinel leaked");
  if (/@/.test(serialized)) failures.push("personal contact email leaked");
  if (/(09\d{2}[-\s]?\d{3}[-\s]?\d{3}|0\d{1,2}[-\s]?\d{6,8})/.test(serialized)) failures.push("personal phone leaked");
  if (/policy\s*number|保單號|policyNumber/i.test(serialized)) failures.push("policy identifier leaked");

  return failures;
}

function meetingMemoryChatSafety(): MeetingMemoryChatSafety {
  return {
    scopeSource: "server_session",
    visibilityScope: "member-private",
    providerCallAttempted: false,
    aiUsageLogRequired: false,
    aiUsageLogWritten: false,
    rawAudioStored: false,
    rawProviderPayloadStored: false,
    rawPrivateTranscriptReturned: false,
    personalContactReturned: false,
    policyIdentifierReturned: false,
    crossMemberMemoryShared: false,
    writesConfirmedCrmFact: false,
    generatedBy: "deterministic-memory-chat",
  };
}

function toDomainMemory(memory: {
  id: string;
  organizationId: string;
  memberId: string;
  unitId: string | null;
  clientId: string | null;
  sessionId: string;
  turnId: string | null;
  interviewKind: InterviewMemoryDto["interviewKind"];
  kind: InterviewMemoryDto["kind"];
  source: InterviewMemoryDto["source"];
  dataClass: InterviewMemoryDto["dataClass"];
  visibilityScope: InterviewMemoryDto["visibilityScope"];
  text: string;
  evidenceText: string | null;
  confidence: InterviewMemoryDto["confidence"];
  importance: number;
  issueTags: string[];
  outlineSegmentId: string | null;
  pqQuestionIds: string[];
  embeddingStatus: InterviewMemoryDto["embeddingStatus"];
  retentionPolicy: InterviewMemoryDto["retentionPolicy"];
  supersedesMemoryId: string | null;
  supersededByMemoryId: string | null;
  createdAt: Date;
}): InterviewMemory {
  return {
    id: memory.id,
    organizationId: memory.organizationId,
    memberId: memory.memberId,
    unitId: memory.unitId,
    clientId: memory.clientId,
    interviewSessionId: memory.sessionId,
    turnId: memory.turnId,
    interviewKind: memory.interviewKind,
    createdAt: memory.createdAt.toISOString(),
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

function toMeetingDataClass(value: string): MeetingDataClass {
  if (value === "CONFIRMED" || value === "FACT" || value === "INFERENCE" || value === "UNKNOWN") return value;
  return "INFERENCE";
}

function clampImportance(value: number): InterviewMemory["importance"] {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return Math.round(value) as InterviewMemory["importance"];
}

function relevanceScore(question: string, text: string): number {
  const questionTerms = termsFor(question);
  const textTerms = termsFor(text);
  if (questionTerms.size === 0 || textTerms.size === 0) return 0;

  let matches = 0;
  for (const term of questionTerms) {
    if (textTerms.has(term)) matches += 1;
  }

  return matches / questionTerms.size;
}

function sourceTypeBoost(sourceType: MeetingMemoryChatSourceType): number {
  if (sourceType === "CURRENT_MEETING_MEMORY") return 0.35;
  if (sourceType === "MEETING_SUMMARY") return 0.3;
  if (sourceType === "CLIENT_MEMORY") return 0.25;
  if (sourceType === "CRM_CLIENT") return 0.2;
  return 0.1;
}

function termsFor(value: string): Set<string> {
  const normalized = value
    .toLowerCase()
    .replace(/[，。！？、；：「」『』（）()／/\\|[\]{}.,!?;:"'`~@#$%^&*_+=<>-]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return new Set(normalized.flatMap(expandTerm));
}

function expandTerm(term: string): string[] {
  if (term.length <= 4) return [term];
  const grams = new Set<string>([term]);
  for (let size = 2; size <= 4; size += 1) {
    for (let index = 0; index <= term.length - size; index += 1) {
      grams.add(term.slice(index, index + size));
    }
  }
  return [...grams];
}

function sanitizeSnippet(value: string): string {
  return normalizeWhitespace(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, REDACTED)
    .replace(/0\d{1,2}[-\s]?\d{6,8}/g, REDACTED)
    .replace(/保單號[:：]?\s*[A-Z0-9-]+/gi, "保單識別碼已隱藏")
    .slice(0, MAX_SOURCE_TEXT);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasForbiddenPrivateText(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    /sk-[a-z0-9_-]{12,}/i.test(value) ||
    /authorization\s*[:=]?\s*bearer/i.test(value) ||
    normalized.includes("raw provider payload") ||
    normalized.includes("provider payload") ||
    normalized.includes("raw audio") ||
    normalized.includes("payment data") ||
    /\botp\b/i.test(value) ||
    /(?:^|[_-])sentinel(?:[_-]|$)/i.test(value)
  );
}
