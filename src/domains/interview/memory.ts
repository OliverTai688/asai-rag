import type {
  InterviewConfidence,
  InterviewDataClass,
  InterviewKind,
  InterviewMemory,
  InterviewMemoryImportance,
  InterviewMemoryKind,
  InterviewMemorySource,
  InterviewModality,
  InterviewRetentionPolicy,
  InterviewTurnRole,
  InterviewVisibilityScope,
} from "./types";

export interface InterviewTurnMemoryInput {
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  clientId?: string | null;
  interviewSessionId: string;
  turnId?: string | null;
  interviewKind: InterviewKind;
  role: InterviewTurnRole;
  modality: InterviewModality;
  content: string;
  transcriptFinal?: boolean;
  createdAt?: string;
  outlineSegmentId?: string;
  issueTags?: string[];
  pqQuestionIds?: string[];
  dataClass?: InterviewDataClass;
  kind?: InterviewMemoryKind;
  source?: InterviewMemorySource;
  confidence?: InterviewConfidence;
  importance?: InterviewMemoryImportance;
  visibilityScope?: InterviewVisibilityScope;
  retentionPolicy?: InterviewRetentionPolicy;
  evidenceText?: string;
}

export interface InterviewMemoryRetrievalQuery {
  organizationId: string;
  memberId?: string;
  clientId?: string | null;
  interviewSessionId?: string;
  interviewKind?: InterviewKind;
  currentSegmentId?: string;
  text: string;
  issueTags?: string[];
  now?: string;
  limit?: number;
  includeSuperseded?: boolean;
  includeCrossSessionClientMemories?: boolean;
}

export interface InterviewMemoryScore {
  memory: InterviewMemory;
  relevance: number;
  importance: number;
  recency: number;
  outlineMatch: number;
  total: number;
}

const INFERENCE_HINTS = ["可能", "推測", "猜", "看起來", "似乎", "應該", "也許", "感覺"];
const CONFIRMED_HINTS = ["確認", "確定", "已確認", "沒錯", "是的", "對的", "就是"];
const UNKNOWN_HINTS = ["不知道", "不確定", "待確認", "還不清楚", "可能要問", "？", "?"];

export function createMemoryCandidatesFromTurn(input: InterviewTurnMemoryInput): InterviewMemory[] {
  const text = normalizeWhitespace(input.content);
  if (!text) return [];

  const dataClass = input.dataClass ?? inferDataClass(input.role, text, input.transcriptFinal ?? true);
  const kind = input.kind ?? inferMemoryKind(input.role, dataClass, input.source ?? inferMemorySource(input.modality));
  const source = input.source ?? inferMemorySource(input.modality);
  const createdAt = input.createdAt ?? new Date().toISOString();

  return [
    {
      id: stableMemoryId({
        interviewSessionId: input.interviewSessionId,
        turnId: input.turnId,
        text,
        kind,
        createdAt,
      }),
      organizationId: input.organizationId,
      memberId: input.memberId,
      unitId: input.unitId ?? null,
      clientId: input.clientId ?? null,
      interviewSessionId: input.interviewSessionId,
      turnId: input.turnId ?? null,
      interviewKind: input.interviewKind,
      createdAt,
      kind,
      source,
      dataClass,
      visibilityScope: input.visibilityScope ?? defaultVisibilityScope(dataClass, input.interviewKind, input.clientId),
      text,
      evidenceText: input.evidenceText,
      confidence: input.confidence ?? defaultConfidence(dataClass, input.transcriptFinal ?? true),
      importance: input.importance ?? defaultImportance(dataClass, input.interviewKind),
      issueTags: input.issueTags ?? [],
      outlineSegmentId: input.outlineSegmentId,
      pqQuestionIds: input.pqQuestionIds ?? [],
      embeddingStatus: "SKIPPED",
      retentionPolicy: input.retentionPolicy ?? defaultRetentionPolicy(dataClass, input.interviewKind, input.clientId),
    },
  ];
}

export function createCorrectionMemory(input: Omit<InterviewTurnMemoryInput, "dataClass" | "kind" | "source"> & { supersedesMemoryId: string }): InterviewMemory {
  const [memory] = createMemoryCandidatesFromTurn({
    ...input,
    dataClass: "CONFIRMED",
    kind: "CORRECTION",
    source: "USER_CONFIRMATION",
    confidence: input.confidence ?? "HIGH",
    importance: input.importance ?? 4,
  });

  return {
    ...memory,
    supersedesMemoryId: input.supersedesMemoryId,
  };
}

export function applyMemoryCorrection(memories: InterviewMemory[], correction: InterviewMemory): InterviewMemory[] {
  if (!correction.supersedesMemoryId) return [...memories, correction];

  return [
    ...memories.map((memory) =>
      memory.id === correction.supersedesMemoryId
        ? {
            ...memory,
            supersededByMemoryId: correction.id,
          }
        : memory,
    ),
    correction,
  ];
}

export function retrieveInterviewMemories(memories: InterviewMemory[], query: InterviewMemoryRetrievalQuery): InterviewMemoryScore[] {
  const filtered = memories.filter((memory) => isMemoryVisibleForQuery(memory, query));
  const scored = filtered
    .map((memory) => scoreInterviewMemory(memory, query))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.memory.createdAt.localeCompare(a.memory.createdAt);
    });

  return scored.slice(0, query.limit ?? 8);
}

export function scoreInterviewMemory(memory: InterviewMemory, query: InterviewMemoryRetrievalQuery): InterviewMemoryScore {
  const relevance = computeRelevanceScore(memory, query);
  const importance = normalizeImportance(memory.importance);
  const recency = computeRecencyScore(memory.createdAt, query.now);
  const outlineMatch = query.currentSegmentId && memory.outlineSegmentId === query.currentSegmentId ? 1 : 0;
  const total = relevance * 0.5 + importance * 0.25 + recency * 0.15 + outlineMatch * 0.1;

  return {
    memory,
    relevance,
    importance,
    recency,
    outlineMatch,
    total: roundScore(total),
  };
}

export function isConfirmedFact(memory: InterviewMemory): boolean {
  return memory.dataClass === "CONFIRMED" && !memory.supersededByMemoryId;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function inferMemorySource(modality: InterviewModality): InterviewMemorySource {
  if (modality === "VOICE_REALTIME" || modality === "VOICE_TRANSCRIPT_FALLBACK") return "VOICE_TRANSCRIPT";
  return "TEXT_INPUT";
}

function inferDataClass(role: InterviewTurnRole, text: string, transcriptFinal: boolean): InterviewDataClass {
  if (role === "ASSISTANT" || role === "SYSTEM") return "INSTRUCTION";
  if (!transcriptFinal || hasAnyHint(text, UNKNOWN_HINTS)) return "UNKNOWN";
  if (hasAnyHint(text, CONFIRMED_HINTS)) return "CONFIRMED";
  if (hasAnyHint(text, INFERENCE_HINTS)) return "INFERENCE";
  return "FACT";
}

function inferMemoryKind(role: InterviewTurnRole, dataClass: InterviewDataClass, source: InterviewMemorySource): InterviewMemoryKind {
  if (role === "ASSISTANT") return "PLAN";
  if (role === "SYSTEM" || source === "SYSTEM") return "SYSTEM_FACT";
  if (source === "CRM" || source === "POLICY" || source === "FAMILY_GRAPH") return "CRM_FACT";
  if (dataClass === "CONFIRMED") return "CONFIRMED_FACT";
  if (dataClass === "INFERENCE") return "INFERENCE";
  if (dataClass === "UNKNOWN") return "UNKNOWN";
  return "UTTERANCE";
}

function defaultVisibilityScope(dataClass: InterviewDataClass, interviewKind: InterviewKind, clientId?: string | null): InterviewVisibilityScope {
  if (interviewKind === "THEATER_FIELD_BUILD") return "THEATER_BUILD_PRIVATE";
  if (clientId && dataClass === "CONFIRMED") return "CLIENT_RECORD_CANDIDATE";
  return "MEMBER_PRIVATE";
}

function defaultRetentionPolicy(dataClass: InterviewDataClass, interviewKind: InterviewKind, clientId?: string | null): InterviewRetentionPolicy {
  if (interviewKind === "THEATER_FIELD_BUILD") return "THEATER_BUILD";
  if (clientId && dataClass === "CONFIRMED") return "CLIENT_CANDIDATE";
  return dataClass === "INSTRUCTION" ? "SESSION_ONLY" : "MEMBER_WORKSPACE";
}

function defaultConfidence(dataClass: InterviewDataClass, transcriptFinal: boolean): InterviewConfidence {
  if (!transcriptFinal || dataClass === "UNKNOWN") return "LOW";
  if (dataClass === "CONFIRMED") return "HIGH";
  return "MEDIUM";
}

function defaultImportance(dataClass: InterviewDataClass, interviewKind: InterviewKind): InterviewMemoryImportance {
  if (dataClass === "CONFIRMED") return 4;
  if (dataClass === "UNKNOWN") return 3;
  if (interviewKind === "THEATER_FIELD_BUILD" && dataClass === "INFERENCE") return 3;
  return 2;
}

function isMemoryVisibleForQuery(memory: InterviewMemory, query: InterviewMemoryRetrievalQuery): boolean {
  if (memory.organizationId !== query.organizationId) return false;
  if (!query.includeSuperseded && memory.supersededByMemoryId) return false;
  if (query.interviewKind && memory.interviewKind !== query.interviewKind) return false;
  if (query.memberId && memory.visibilityScope !== "ORG_AGGREGATE_ONLY" && memory.memberId !== query.memberId) return false;
  if (query.interviewSessionId && memory.interviewSessionId === query.interviewSessionId) return true;
  if (query.includeCrossSessionClientMemories && query.clientId && memory.clientId === query.clientId && memory.dataClass === "CONFIRMED") return true;
  return !query.interviewSessionId;
}

function computeRelevanceScore(memory: InterviewMemory, query: InterviewMemoryRetrievalQuery): number {
  const queryTerms = termsFor(`${query.text} ${(query.issueTags ?? []).join(" ")}`);
  const memoryTerms = termsFor(`${memory.text} ${memory.issueTags.join(" ")} ${memory.evidenceText ?? ""}`);
  if (queryTerms.size === 0 || memoryTerms.size === 0) return 0;

  let matches = 0;
  for (const term of queryTerms) {
    if (memoryTerms.has(term)) matches += 1;
  }

  return roundScore(matches / queryTerms.size);
}

function computeRecencyScore(createdAt: string, now = new Date().toISOString()): number {
  const created = Date.parse(createdAt);
  const reference = Date.parse(now);
  if (Number.isNaN(created) || Number.isNaN(reference) || created >= reference) return 1;

  const ageHours = (reference - created) / (1000 * 60 * 60);
  return roundScore(Math.exp(-ageHours / (24 * 7)));
}

function normalizeImportance(importance: InterviewMemoryImportance): number {
  return roundScore((importance - 1) / 4);
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

function hasAnyHint(text: string, hints: string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

function stableMemoryId(input: { interviewSessionId: string; turnId?: string | null; text: string; kind: InterviewMemoryKind; createdAt: string }): string {
  const seed = `${input.interviewSessionId}:${input.turnId ?? "turn"}:${input.kind}:${input.createdAt}:${input.text}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `memory_${hash.toString(36)}`;
}

function roundScore(score: number): number {
  return Math.round(score * 1000) / 1000;
}
