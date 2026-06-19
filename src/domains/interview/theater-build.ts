import { theaterFieldBuildOutline } from "./outlines";
import { createMemoryCandidatesFromTurn, normalizeWhitespace } from "./memory";
import type {
  InterviewDataClass,
  InterviewMemory,
  InterviewSegment,
  TheaterBuildCharacterSeed,
  TheaterBuildPacket,
  TheaterBuildReflection,
} from "./types";

export interface TheaterBuildMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TheaterBuildLoopInput {
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  clientId?: string | null;
  sessionId?: string;
  currentSegmentId?: string;
  messages: TheaterBuildMessage[];
  knownMaterials?: string[];
  now?: string;
}

export interface TheaterBuildLoopContext {
  memories: InterviewMemory[];
  reflection: TheaterBuildReflection;
  packet: TheaterBuildPacket;
  promptContext: string;
}

const DEFAULT_SESSION_ID = "theater_field_build_local";
const MAX_ROUTE_B_NPCS = 4;

export function buildTheaterFieldBuildContext(input: TheaterBuildLoopInput): TheaterBuildLoopContext {
  const sessionId = input.sessionId || DEFAULT_SESSION_ID;
  const currentSegment = getTheaterSegment(input.currentSegmentId);
  const now = input.now ?? new Date().toISOString();
  const memories = buildTheaterBuildMemoryStream({
    ...input,
    sessionId,
    currentSegmentId: currentSegment.id,
    now,
  });
  const reflection = buildTheaterBuildReflection(memories);
  const packet = buildTheaterBuildPacket({
    interviewSessionId: sessionId,
    reflection,
    memories,
  });

  return {
    memories,
    reflection,
    packet,
    promptContext: buildTheaterBuildPromptContext(packet),
  };
}

export function buildTheaterBuildMemoryStream(
  input: TheaterBuildLoopInput & { sessionId: string; currentSegmentId: string; now: string },
): InterviewMemory[] {
  const baseTime = Date.parse(input.now);
  const segment = getTheaterSegment(input.currentSegmentId);
  const messages = input.messages.flatMap((message, index) =>
    createMemoryCandidatesFromTurn({
      organizationId: input.organizationId,
      memberId: input.memberId,
      unitId: input.unitId ?? null,
      clientId: input.clientId ?? null,
      interviewSessionId: input.sessionId,
      turnId: `theater_message_${index}`,
      interviewKind: "THEATER_FIELD_BUILD",
      role: message.role === "user" ? "USER" : "ASSISTANT",
      modality: "TEXT",
      content: message.content,
      createdAt: new Date(baseTime - Math.max(input.messages.length - index, 0) * 1000).toISOString(),
      outlineSegmentId: segment.id,
      issueTags: inferTheaterIssueTags(message.content, segment),
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
      turnId: `theater_material_${index}`,
      interviewKind: "THEATER_FIELD_BUILD",
      role: "USER",
      modality: "TEXT",
      content: material,
      createdAt: new Date(baseTime - Math.max(materialOffset - index, 0) * 1000).toISOString(),
      outlineSegmentId: inferSegmentIdForTheaterMaterial(material, segment.id),
      issueTags: inferTheaterIssueTags(material, segment),
      dataClass: inferMaterialDataClass(material),
      evidenceText: "theaterBuildMaterials",
      importance: inferTheaterImportance(material),
    }),
  );

  return [...messages, ...materials];
}

export function buildTheaterBuildReflection(memories: InterviewMemory[]): TheaterBuildReflection {
  const activeMemories = memories.filter((memory) => !memory.supersededByMemoryId);
  const confirmedFacts = collectTexts(activeMemories, "CONFIRMED");
  const inferredPatterns = collectTexts(activeMemories, "INFERENCE");
  const unknowns = collectTexts(activeMemories, "UNKNOWN");
  const focusClient = firstFieldValue(activeMemories, "focus_client", ["CONFIRMED", "FACT"]);
  const scenario = firstFieldValue(activeMemories, "scenario", ["CONFIRMED", "FACT"]);
  const necessaryNpcRoles = buildNecessaryNpcRoles(activeMemories);
  const narratorQuestions = buildNarratorQuestions({ focusClient, scenario, unknowns, necessaryNpcRoles });

  return {
    focusClient,
    scenario,
    confirmedFacts,
    inferredPatterns,
    unknowns,
    necessaryNpcRoles,
    narratorQuestions,
    supportingMemoryIds: activeMemories.map((memory) => memory.id),
  };
}

export function buildTheaterBuildPacket(input: {
  interviewSessionId: string;
  reflection: TheaterBuildReflection;
  memories: InterviewMemory[];
}): TheaterBuildPacket {
  const activeMemories = input.memories.filter((memory) => !memory.supersededByMemoryId);
  const characters = buildCharacterSeeds(activeMemories, input.reflection.focusClient);
  const relationships = collectTaggedTexts(activeMemories, "relationship", ["CONFIRMED", "FACT"]);
  const objections = collectTaggedTexts(activeMemories, "objection", ["CONFIRMED", "FACT", "INFERENCE"]);
  const sensitiveNotes = collectTaggedTexts(activeMemories, "sensitive", ["CONFIRMED", "FACT", "UNKNOWN"]);
  const hasMinimumFacts = Boolean(input.reflection.focusClient && input.reflection.scenario && input.reflection.confirmedFacts.length > 0);
  const readiness = hasMinimumFacts ? "READY" : "NEEDS_MORE_INFO";

  return {
    id: stableTheaterPacketId(input.interviewSessionId, input.reflection.supportingMemoryIds),
    interviewSessionId: input.interviewSessionId,
    interviewKind: "THEATER_FIELD_BUILD",
    readiness,
    focusClient: input.reflection.focusClient,
    scenario: input.reflection.scenario,
    characters,
    relationships,
    objections,
    sensitiveNotes,
    confirmedFacts: input.reflection.confirmedFacts,
    inferredPersona: input.reflection.inferredPatterns,
    unknowns: input.reflection.unknowns,
    narratorQuestions: input.reflection.narratorQuestions,
    supportingMemoryIds: input.reflection.supportingMemoryIds,
    routeBCompatibility: {
      npcCount: characters.length,
      maxNpcCount: MAX_ROUTE_B_NPCS,
      canStartSimulation: readiness === "READY",
      migrationNote: "可供 Theater Route B build packet 消費；legacy Theater enum/scoring 維持不變。",
    },
  };
}

export function buildTheaterBuildPromptContext(packet: TheaterBuildPacket): string {
  return [
    "Park-style 劇場場域建構：",
    `- 狀態：${packet.readiness}`,
    `- 焦點客戶：${packet.focusClient ?? "待補"}`,
    `- 演練場景：${packet.scenario ?? "待補"}`,
    `- NPC 數：${packet.routeBCompatibility.npcCount}/${packet.routeBCompatibility.maxNpcCount}`,
    "",
    "已確認事實：",
    formatList(packet.confirmedFacts, "目前沒有足夠已確認事實。"),
    "",
    "推論人格與模式：",
    formatList(packet.inferredPersona, "目前沒有推論。"),
    "",
    "未知缺口與旁白補問：",
    formatList([...packet.unknowns, ...packet.narratorQuestions], "目前沒有待補問項。"),
    "",
    "劇場建構規則：",
    "1. 只把已確認事實交給角色當作背景。",
    "2. 推論只能作 persona hint，不得在角色台詞中說成確定事實。",
    "3. 未知缺口交由旁白補問，不可由 NPC 自行補完。",
    "4. 若狀態不是 READY，不得生成正式演練劇場。",
  ].join("\n");
}

function buildCharacterSeeds(memories: InterviewMemory[], focusClient?: string): TheaterBuildCharacterSeed[] {
  const parsed = parseCharacterMentions(memories);
  const seeds = new Map<string, TheaterBuildCharacterSeed>();

  if (focusClient) {
    seeds.set(focusClient, {
      id: stableCharacterId(focusClient),
      displayName: focusClient,
      role: "FOCUS_CLIENT",
      isFocus: true,
      knownFacts: collectCharacterTexts(memories, focusClient, ["CONFIRMED", "FACT"]),
      inferences: collectCharacterTexts(memories, focusClient, ["INFERENCE"]),
      unknowns: collectCharacterTexts(memories, focusClient, ["UNKNOWN"]),
      personaHints: buildPersonaHints(memories, focusClient),
      exemplarLines: collectTaggedTexts(memories, "line", ["CONFIRMED", "FACT"]).filter((line) => line.includes(focusClient)),
    });
  }

  for (const character of parsed) {
    if (seeds.size >= MAX_ROUTE_B_NPCS) break;
    if (seeds.has(character.displayName)) continue;
    seeds.set(character.displayName, {
      id: stableCharacterId(character.displayName),
      displayName: character.displayName,
      role: character.role,
      isFocus: false,
      knownFacts: collectCharacterTexts(memories, character.displayName, ["CONFIRMED", "FACT"]),
      inferences: collectCharacterTexts(memories, character.displayName, ["INFERENCE"]),
      unknowns: collectCharacterTexts(memories, character.displayName, ["UNKNOWN"]),
      personaHints: buildPersonaHints(memories, character.displayName),
      exemplarLines: collectTaggedTexts(memories, "line", ["CONFIRMED", "FACT"]).filter((line) => line.includes(character.displayName)),
    });
  }

  return [...seeds.values()].slice(0, MAX_ROUTE_B_NPCS);
}

function parseCharacterMentions(memories: InterviewMemory[]): Array<Pick<TheaterBuildCharacterSeed, "displayName" | "role">> {
  const characters: Array<Pick<TheaterBuildCharacterSeed, "displayName" | "role">> = [];
  for (const memory of memories) {
    for (const rawValue of allFieldValues(memory.text, "npc")) {
      const [displayName, role] = rawValue.split("|").map((part) => normalizeWhitespace(part));
      if (!displayName) continue;
      characters.push({
        displayName,
        role: normalizeCharacterRole(role),
      });
    }
  }

  return characters;
}

function normalizeCharacterRole(role?: string): TheaterBuildCharacterSeed["role"] {
  if (role === "DECISION_MAKER" || role?.includes("決策")) return "DECISION_MAKER";
  if (role === "INFLUENCER" || role?.includes("影響")) return "INFLUENCER";
  if (role === "ADVISOR" || role?.includes("顧問") || role?.includes("業務")) return "ADVISOR";
  if (role === "NARRATOR" || role?.includes("旁白")) return "NARRATOR";
  return "INFLUENCER";
}

function buildPersonaHints(memories: InterviewMemory[], displayName: string): TheaterBuildCharacterSeed["personaHints"] {
  return memories
    .filter((memory) => memory.text.includes(displayName) && (memory.dataClass === "CONFIRMED" || memory.dataClass === "INFERENCE"))
    .map((memory) => ({
      label: memory.dataClass === "CONFIRMED" ? `已確認：${stripPrefixes(memory.text)}` : `推論：${stripPrefixes(memory.text)}`,
      confidence: memory.dataClass === "CONFIRMED" ? ("CONFIRMED" as const) : ("INFERRED" as const),
      evidenceMemoryIds: [memory.id],
    }))
    .slice(0, 4);
}

function collectCharacterTexts(memories: InterviewMemory[], displayName: string, dataClasses: InterviewDataClass[]): string[] {
  return unique(
    memories
      .filter((memory) => dataClasses.includes(memory.dataClass) && memory.text.includes(displayName))
      .map((memory) => stripPrefixes(memory.text)),
  );
}

function collectTexts(memories: InterviewMemory[], dataClass: InterviewDataClass): string[] {
  return unique(memories.filter((memory) => memory.dataClass === dataClass).map((memory) => stripPrefixes(memory.text)));
}

function collectTaggedTexts(memories: InterviewMemory[], field: string, dataClasses: InterviewDataClass[]): string[] {
  return unique(
    memories
      .filter((memory) => dataClasses.includes(memory.dataClass))
      .flatMap((memory) => allFieldValues(memory.text, field))
      .map(stripPrefixes),
  );
}

function firstFieldValue(memories: InterviewMemory[], field: string, dataClasses: InterviewDataClass[]): string | undefined {
  for (const memory of memories) {
    if (!dataClasses.includes(memory.dataClass)) continue;
    const value = fieldValue(memory.text, field);
    if (value) return value;
  }
  return undefined;
}

function allFieldValues(text: string, field: string): string[] {
  const normalized = normalizeWhitespace(text);
  const pattern = new RegExp(`${field}=([^;；\\n]+)`, "gi");
  const values: string[] = [];
  let match = pattern.exec(normalized);
  while (match) {
    values.push(normalizeWhitespace(match[1] ?? ""));
    match = pattern.exec(normalized);
  }
  return values.filter(Boolean);
}

function fieldValue(text: string, field: string): string | undefined {
  return allFieldValues(text, field)[0];
}

function buildNecessaryNpcRoles(memories: InterviewMemory[]): string[] {
  const roles = memories.flatMap((memory) => allFieldValues(memory.text, "npc").map((entry) => entry.split("|")[1] ?? "INFLUENCER"));
  return unique(roles.map((role) => normalizeWhitespace(role)).filter(Boolean)).slice(0, MAX_ROUTE_B_NPCS);
}

function buildNarratorQuestions(input: {
  focusClient?: string;
  scenario?: string;
  unknowns: string[];
  necessaryNpcRoles: string[];
}): string[] {
  const questions = [...input.unknowns.map((unknown) => `請先確認：${stripPrefixes(unknown)}`)];
  if (!input.focusClient) questions.unshift("請先確認這次劇場的焦點客戶是誰。");
  if (!input.scenario) questions.unshift("請先確認要演練的具體拜訪場景。");
  if (input.necessaryNpcRoles.length === 0) questions.push("是否需要加入決策者或主要影響者作為陪演角色？");
  return unique(questions).slice(0, 8);
}

function inferMaterialDataClass(material: string): InterviewDataClass {
  const normalized = material.toUpperCase();
  if (normalized.startsWith("FACT:")) return "CONFIRMED";
  if (normalized.startsWith("CONFIRMED:")) return "CONFIRMED";
  if (normalized.startsWith("INFERENCE:")) return "INFERENCE";
  if (normalized.startsWith("UNKNOWN:")) return "UNKNOWN";
  return "FACT";
}

function inferTheaterImportance(material: string): 3 | 4 | 5 {
  if (material.includes("focus_client") || material.includes("scenario")) return 5;
  if (material.includes("npc") || material.includes("objection")) return 4;
  return 3;
}

function inferSegmentIdForTheaterMaterial(material: string, fallback: string): string {
  if (material.includes("focus_client") || material.includes("scenario")) return "theater-focus";
  if (material.includes("npc") || material.includes("relationship")) return "theater-roles";
  if (material.includes("objection") || material.includes("sensitive")) return "theater-objections";
  if (material.includes("UNKNOWN:")) return "theater-confirmation";
  return fallback;
}

function inferTheaterIssueTags(content: string, segment: InterviewSegment): string[] {
  const tags = [segment.id];
  if (content.includes("focus_client") || content.includes("scenario")) tags.push("scene");
  if (content.includes("npc") || content.includes("relationship")) tags.push("role_relation");
  if (content.includes("objection")) tags.push("objection");
  if (content.includes("sensitive")) tags.push("sensitive");
  if (content.includes("UNKNOWN:") || content.includes("不確定") || content.includes("待確認")) tags.push("unknown_gap");
  return unique(tags);
}

function getTheaterSegment(currentSegmentId?: string): InterviewSegment {
  return (
    theaterFieldBuildOutline.segments.find((segment) => segment.id === currentSegmentId) ??
    theaterFieldBuildOutline.segments[0]
  );
}

function stripPrefixes(text: string): string {
  return normalizeWhitespace(text.replace(/^(FACT|CONFIRMED|INFERENCE|UNKNOWN):\s*/i, ""));
}

function formatList(values: string[], fallback: string): string {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : `- ${fallback}`;
}

function stableTheaterPacketId(interviewSessionId: string, memoryIds: string[]): string {
  return `theater_packet_${hashText(`${interviewSessionId}:${memoryIds.join("|")}`)}`;
}

function stableCharacterId(displayName: string): string {
  return `character_${hashText(displayName)}`;
}

function hashText(value: string): string {
  let hash = 5381;
  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(normalizeWhitespace).filter(Boolean))];
}
