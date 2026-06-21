export type MeetingParticipantRole = "FOCUS_CLIENT" | "FAMILY" | "ADVISOR" | "OTHER";

export type MeetingDataClass = "CONFIRMED" | "FACT" | "INFERENCE" | "UNKNOWN";

export type MeetingTranscriptSource = "MIC" | "MANUAL" | "TEXT";

export interface MeetingCitation {
  turnId: string;
  occurredAt: string;
  memoryIds: string[];
  snippet: string;
  quote?: string;
}

export interface MeetingTranscriptTurn {
  id: string;
  speakerName?: string;
  speaker?: string;
  speakerRole: MeetingParticipantRole;
  text: string;
  occurredAt: string;
  source: MeetingTranscriptSource;
  dataClass?: MeetingDataClass;
  memoryIds?: string[];
}

export interface MeetingParticipant {
  id: string;
  name: string;
  role: MeetingParticipantRole;
  mentionCount: number;
}

export interface MeetingSummaryItem {
  id: string;
  text: string;
  dataClass: MeetingDataClass;
  citations: MeetingCitation[];
}

export interface MeetingActionItem {
  id: string;
  text: string;
  owner?: string;
  ownerHint: string | null;
  dueHint: string | null;
  dataClass: Exclude<MeetingDataClass, "FACT">;
  citations: MeetingCitation[];
  writesConfirmedCrmFact: false;
}

export interface MeetingSummaryGuardEvidence {
  providerCallAttempted: boolean;
  dbWriteAttempted: false;
  storesAudioBinary: false;
  storesPrivateTranscript: false;
  storesRawProviderPayload?: false;
  writesConfirmedCrmFact: false;
  generatedBy: "deterministic-skeleton" | "provider-json";
}

export interface MeetingSummary {
  schemaVersion: "asai.meeting.summary.v1";
  meetingId: string;
  clientName: string;
  generatedAt: string;
  headline: string;
  summary: string;
  participants: MeetingParticipant[];
  decisions: MeetingSummaryItem[];
  actionItems: MeetingActionItem[];
  openQuestions: MeetingSummaryItem[];
  guardEvidence: MeetingSummaryGuardEvidence;
}

export interface BuildMeetingSummarySkeletonInput {
  meetingId: string;
  clientName: string;
  generatedAt: string;
  turns: MeetingTranscriptTurn[];
}

export interface ProviderMeetingSummaryItemInput {
  id?: string;
  text: string;
  dataClass: MeetingDataClass;
  citationTurnIds: string[];
}

export interface ProviderMeetingActionItemInput {
  id?: string;
  text: string;
  ownerHint?: string | null;
  dueHint?: string | null;
  dataClass: MeetingDataClass;
  citationTurnIds: string[];
}

export interface ProviderMeetingParticipantInput {
  id?: string;
  name: string;
  role: MeetingParticipantRole;
  mentionCount: number;
}

export interface BuildProviderMeetingSummaryInput {
  meetingId: string;
  clientName: string;
  generatedAt: string;
  turns: MeetingTranscriptTurn[];
  headline: string;
  summary: string;
  participants?: ProviderMeetingParticipantInput[];
  decisions: ProviderMeetingSummaryItemInput[];
  actionItems: ProviderMeetingActionItemInput[];
  openQuestions: ProviderMeetingSummaryItemInput[];
}

type NormalizedMeetingTranscriptTurn = MeetingTranscriptTurn & {
  speakerName: string;
  speaker: string;
  memoryIds: string[];
};

export interface ClientMemorySnippet {
  id: string;
  sourceLabel: string;
  text: string;
  dataClass: MeetingDataClass;
}

export interface MeetingChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: ClientMemorySnippet[];
  createdAt: string;
}

const MAX_SNIPPET_LENGTH = 96;
const MAX_DECISIONS = 3;
const MAX_ACTION_ITEMS = 4;
const MAX_OPEN_QUESTIONS = 4;

const actionSignals = ["下次", "下週", "需要", "請", "補", "確認", "準備", "製作", "邀請", "整理"] as const;
const confirmedSignals = ["確認", "決定", "同意", "預算", "上限", "固定", "已", "先"] as const;
const inferenceSignals = ["推論", "可能", "看起來", "傾向", "擔心"] as const;
const unknownSignals = ["不確定", "待確認", "是否", "嗎", "？", "?"] as const;

export const MEETING_DATA_CLASS_LABEL: Record<MeetingDataClass, string> = {
  CONFIRMED: "已確認",
  FACT: "事實",
  INFERENCE: "推論",
  UNKNOWN: "未知",
};

export function buildMeetingSummarySkeleton(input: BuildMeetingSummarySkeletonInput): MeetingSummary {
  const turns = normalizeTurns(input.turns);
  const participants = buildParticipants(turns);
  const decisions = turns
    .filter((turn) => classifyTurn(turn) !== "UNKNOWN")
    .filter((turn) => hasAnySignal(turn.text, confirmedSignals))
    .slice(0, MAX_DECISIONS)
    .map((turn, index) => buildSummaryItem(`decision-${index + 1}`, turn, classifyTurn(turn)));
  const actionItems = turns
    .filter((turn) => hasAnySignal(turn.text, actionSignals))
    .slice(0, MAX_ACTION_ITEMS)
    .map((turn, index) => buildActionItem(`action-${index + 1}`, turn));
  const openQuestions = turns
    .filter((turn) => classifyTurn(turn) === "UNKNOWN" || hasAnySignal(turn.text, unknownSignals))
    .slice(0, MAX_OPEN_QUESTIONS)
    .map((turn, index) => buildSummaryItem(`question-${index + 1}`, turn, "UNKNOWN"));

  return {
    schemaVersion: "asai.meeting.summary.v1",
    meetingId: input.meetingId,
    clientName: input.clientName,
    generatedAt: input.generatedAt,
    headline: buildHeadline(input.clientName, turns, actionItems.length, openQuestions.length),
    summary: buildSummaryText(input.clientName, turns, decisions.length, actionItems.length, openQuestions.length),
    participants,
    decisions,
    actionItems,
    openQuestions,
    guardEvidence: {
      providerCallAttempted: false,
      dbWriteAttempted: false,
      storesAudioBinary: false,
      storesPrivateTranscript: false,
      writesConfirmedCrmFact: false,
      generatedBy: "deterministic-skeleton",
    },
  };
}

export function buildProviderMeetingSummary(input: BuildProviderMeetingSummaryInput): MeetingSummary {
  const turns = normalizeTurns(input.turns);
  const turnsById = new Map(turns.map((turn) => [turn.id, turn]));
  const participants = input.participants?.length
    ? input.participants.map((participant, index) => ({
        id: sanitizeSummaryId(participant.id || `provider-participant-${index + 1}`),
        name: collapseWhitespace(participant.name).slice(0, 80) || `參與者 ${index + 1}`,
        role: normalizeParticipantRole(participant.role),
        mentionCount: Math.max(0, Number(participant.mentionCount) || 0),
      }))
    : buildParticipants(turns);

  return {
    schemaVersion: "asai.meeting.summary.v1",
    meetingId: input.meetingId,
    clientName: input.clientName,
    generatedAt: input.generatedAt,
    headline: collapseWhitespace(input.headline).slice(0, 240),
    summary: collapseWhitespace(input.summary).slice(0, 2400),
    participants,
    decisions: input.decisions.slice(0, MAX_DECISIONS).map((item, index) =>
      buildProviderSummaryItem(`provider-decision-${index + 1}`, item, turnsById),
    ),
    actionItems: input.actionItems.slice(0, MAX_ACTION_ITEMS).map((item, index) =>
      buildProviderActionItem(`provider-action-${index + 1}`, item, turnsById),
    ),
    openQuestions: input.openQuestions.slice(0, MAX_OPEN_QUESTIONS).map((item, index) => ({
      ...buildProviderSummaryItem(`provider-question-${index + 1}`, item, turnsById),
      dataClass: "UNKNOWN",
    })),
    guardEvidence: {
      providerCallAttempted: true,
      dbWriteAttempted: false,
      storesAudioBinary: false,
      storesPrivateTranscript: false,
      storesRawProviderPayload: false,
      writesConfirmedCrmFact: false,
      generatedBy: "provider-json",
    },
  };
}

export function assertMeetingSummarySkeletonSafety(summary: MeetingSummary, knownTurnIds: Iterable<string>): string[] {
  const failures: string[] = [];
  const allowedTurnIds = new Set(knownTurnIds);
  const allItems: Array<MeetingSummaryItem | MeetingActionItem> = [
    ...summary.decisions,
    ...summary.actionItems,
    ...summary.openQuestions,
  ];

  if (summary.guardEvidence.providerCallAttempted && summary.guardEvidence.generatedBy !== "provider-json") {
    failures.push("unexpected provider call attempted");
  }
  if (!summary.guardEvidence.providerCallAttempted && summary.guardEvidence.generatedBy === "provider-json") {
    failures.push("provider summary missing provider call evidence");
  }
  if (summary.guardEvidence.dbWriteAttempted) failures.push("db write attempted");
  if (summary.guardEvidence.storesAudioBinary) failures.push("audio binary storage attempted");
  if (summary.guardEvidence.storesPrivateTranscript) failures.push("private transcript storage attempted");
  if (summary.guardEvidence.storesRawProviderPayload) failures.push("raw provider payload storage attempted");
  if (summary.guardEvidence.writesConfirmedCrmFact) failures.push("confirmed CRM write attempted");

  for (const item of allItems) {
    if (item.citations.length === 0) {
      failures.push(`${item.id} missing citation`);
    }

    for (const citation of item.citations) {
      if (!allowedTurnIds.has(citation.turnId)) {
        failures.push(`${item.id} cites unknown turn ${citation.turnId}`);
      }
    }
  }

  for (const item of summary.openQuestions) {
    if (item.dataClass !== "UNKNOWN") {
      failures.push(`${item.id} open question is not UNKNOWN`);
    }
  }

  for (const item of summary.actionItems) {
    if (item.dataClass === "CONFIRMED" && item.writesConfirmedCrmFact !== false) {
      failures.push(`${item.id} action writes confirmed CRM fact`);
    }
  }

  return failures;
}

function buildProviderSummaryItem(
  fallbackId: string,
  item: ProviderMeetingSummaryItemInput,
  turnsById: Map<string, NormalizedMeetingTranscriptTurn>,
): MeetingSummaryItem {
  return {
    id: sanitizeSummaryId(item.id || fallbackId),
    text: collapseWhitespace(item.text).slice(0, 900),
    dataClass: item.dataClass,
    citations: buildProviderCitations(item.citationTurnIds, turnsById),
  };
}

function buildProviderActionItem(
  fallbackId: string,
  item: ProviderMeetingActionItemInput,
  turnsById: Map<string, NormalizedMeetingTranscriptTurn>,
): MeetingActionItem {
  const dataClass = item.dataClass === "FACT" ? "INFERENCE" : item.dataClass;

  return {
    id: sanitizeSummaryId(item.id || fallbackId),
    text: collapseWhitespace(item.text).slice(0, 900),
    ownerHint: normalizeNullableText(item.ownerHint),
    dueHint: normalizeNullableText(item.dueHint),
    dataClass,
    citations: buildProviderCitations(item.citationTurnIds, turnsById),
    writesConfirmedCrmFact: false,
  };
}

function buildProviderCitations(
  citationTurnIds: string[],
  turnsById: Map<string, NormalizedMeetingTranscriptTurn>,
): MeetingCitation[] {
  return uniqueStrings(citationTurnIds)
    .map((turnId) => turnsById.get(turnId))
    .filter((turn): turn is NormalizedMeetingTranscriptTurn => Boolean(turn))
    .map(buildCitation);
}

function buildParticipants(turns: NormalizedMeetingTranscriptTurn[]): MeetingParticipant[] {
  const byKey = new Map<string, MeetingParticipant>();

  for (const turn of turns) {
    const key = `${turn.speakerRole}:${turn.speakerName}`;
    const existing = byKey.get(key);

    if (existing) {
      existing.mentionCount += 1;
      continue;
    }

    byKey.set(key, {
      id: key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `speaker-${byKey.size + 1}`,
      name: turn.speakerName,
      role: turn.speakerRole,
      mentionCount: 1,
    });
  }

  return Array.from(byKey.values()).sort((left, right) => right.mentionCount - left.mentionCount);
}

function normalizeTurns(turns: MeetingTranscriptTurn[]): NormalizedMeetingTranscriptTurn[] {
  return turns
    .filter((turn) => turn.id.trim() && turn.text.trim())
    .map((turn) => ({
      ...turn,
      id: turn.id.trim(),
      speakerName: resolveSpeakerName(turn),
      speaker: resolveSpeakerName(turn),
      text: collapseWhitespace(turn.text),
      memoryIds: uniqueStrings(turn.memoryIds ?? []),
    }));
}

function buildSummaryItem(id: string, turn: NormalizedMeetingTranscriptTurn, dataClass: MeetingDataClass): MeetingSummaryItem {
  return {
    id,
    text: turn.text,
    dataClass,
    citations: [buildCitation(turn)],
  };
}

function buildActionItem(id: string, turn: NormalizedMeetingTranscriptTurn): MeetingActionItem {
  const dataClass = classifyTurn(turn);
  const owner = turn.speakerRole === "ADVISOR" ? turn.speakerName : null;

  return {
    id,
    text: turn.text,
    owner: owner ?? undefined,
    ownerHint: owner,
    dueHint: inferDueHint(turn.text),
    dataClass: dataClass === "FACT" ? "INFERENCE" : dataClass,
    citations: [buildCitation(turn)],
    writesConfirmedCrmFact: false,
  };
}

function buildCitation(turn: MeetingTranscriptTurn): MeetingCitation {
  const snippet = trimSnippet(turn.text);

  return {
    turnId: turn.id,
    occurredAt: turn.occurredAt,
    memoryIds: uniqueStrings(turn.memoryIds ?? []),
    snippet,
    quote: snippet,
  };
}

function classifyTurn(turn: MeetingTranscriptTurn): MeetingDataClass {
  if (turn.dataClass) return turn.dataClass;
  if (hasAnySignal(turn.text, unknownSignals)) return "UNKNOWN";
  if (hasAnySignal(turn.text, inferenceSignals)) return "INFERENCE";
  if (hasAnySignal(turn.text, confirmedSignals)) return "CONFIRMED";
  return "FACT";
}

function buildHeadline(clientName: string, turns: MeetingTranscriptTurn[], actionCount: number, unknownCount: number): string {
  const suffix = [actionCount > 0 ? `${actionCount} 個下一步` : "", unknownCount > 0 ? `${unknownCount} 個待確認` : ""]
    .filter(Boolean)
    .join("、");
  return `${clientName} 會議摘要${suffix ? `：${suffix}` : ""}。共整理 ${turns.length} 則來源發言。`;
}

function buildSummaryText(clientName: string, turns: MeetingTranscriptTurn[], decisionCount: number, actionCount: number, unknownCount: number): string {
  return [
    `${clientName} 的會議骨架摘要由 ${turns.length} 則既有發言產生。`,
    `已標示 ${decisionCount} 則已確認/事實重點、${actionCount} 個行動項與 ${unknownCount} 個未知項。`,
    "此版本不呼叫 provider、不寫入 DB，也不把推論或未知轉成 CRM 已確認事實。",
  ].join("");
}

function inferDueHint(text: string): string | null {
  if (text.includes("下週")) return "下週";
  if (text.includes("下次")) return "下次會議前";
  if (text.includes("會前")) return "會前";
  return null;
}

function hasAnySignal(text: string, signals: readonly string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}

function trimSnippet(text: string): string {
  if (text.length <= MAX_SNIPPET_LENGTH) return text;
  return `${text.slice(0, MAX_SNIPPET_LENGTH - 1)}…`;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function resolveSpeakerName(turn: MeetingTranscriptTurn): string {
  return collapseWhitespace(turn.speakerName ?? turn.speaker ?? "") || "未命名參與者";
}

function sanitizeSummaryId(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "provider-item"
  );
}

function normalizeParticipantRole(value: MeetingParticipantRole): MeetingParticipantRole {
  if (value === "FOCUS_CLIENT" || value === "FAMILY" || value === "ADVISOR" || value === "OTHER") {
    return value;
  }

  return "OTHER";
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = collapseWhitespace(value ?? "");
  return normalized ? normalized.slice(0, 120) : null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

// Compatibility builders for the existing untracked AMM UI prototype. The
// accepted AMM-001a proof above remains the pure contract + skeleton mapper.
export function buildDemoMeetingScript(clientName: string): MeetingTranscriptTurn[] {
  return [
    {
      id: "demo-turn-1",
      speakerName: clientName,
      speaker: clientName,
      speakerRole: "FOCUS_CLIENT",
      text: "確認下次先看醫療實支與失能保障，保費預算上限先抓每月六千元。",
      occurredAt: "00:01",
      source: "MIC",
      dataClass: "CONFIRMED",
      memoryIds: ["demo-memory-health", "demo-memory-budget"],
    },
    {
      id: "demo-turn-2",
      speakerName: "顧問",
      speaker: "顧問",
      speakerRole: "ADVISOR",
      text: "下次會議前需要整理兩版家庭責任圖，並補上目前既有保單的保障缺口。",
      occurredAt: "00:38",
      source: "MIC",
      dataClass: "INFERENCE",
      memoryIds: ["demo-memory-family"],
    },
    {
      id: "demo-turn-3",
      speakerName: clientName,
      speaker: clientName,
      speakerRole: "FOCUS_CLIENT",
      text: "不確定是否要邀請配偶一起參與下一次決策，想先看簡化版本。",
      occurredAt: "01:15",
      source: "MIC",
      dataClass: "UNKNOWN",
    },
  ];
}

export function buildDemoMeetingSummary(
  clientName: string,
  transcript: MeetingTranscriptTurn[],
  generatedAt: string,
): MeetingSummary {
  return buildMeetingSummarySkeleton({
    meetingId: "demo-meeting-ui-prototype",
    clientName,
    generatedAt,
    turns: transcript,
  });
}

export function buildDemoClientMemory(clientName: string): ClientMemorySnippet[] {
  return [
    {
      id: "demo-memory-health",
      sourceLabel: "既有保障",
      text: `${clientName} 先前提過醫療保障不足，想優先補足家庭主要風險。`,
      dataClass: "FACT",
    },
    {
      id: "demo-memory-budget",
      sourceLabel: "本次會議",
      text: "本次會議已確認保費預算上限先以每月六千元討論。",
      dataClass: "CONFIRMED",
    },
    {
      id: "demo-memory-family",
      sourceLabel: "關係脈絡",
      text: "推論配偶可能更在意方案是否容易理解，適合用家庭責任圖說明。",
      dataClass: "INFERENCE",
    },
  ];
}

export function buildDemoClientMemoryAnswer(question: string, clientName: string, createdAt: string): MeetingChatMessage {
  const memories = buildDemoClientMemory(clientName);
  const normalizedQuestion = question.toLowerCase();
  const selected = normalizedQuestion.includes("預算")
    ? [memories[1]]
    : normalizedQuestion.includes("家庭")
      ? [memories[2]]
      : [memories[0], memories[1]];

  return {
    id: `assistant-${createdAt}`,
    role: "ASSISTANT",
    content: `${clientName} 的目前可用依據是：${selected.map((memory) => memory.text).join(" ")}`,
    citations: selected,
    createdAt,
  };
}
