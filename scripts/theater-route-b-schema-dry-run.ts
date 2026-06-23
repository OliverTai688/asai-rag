import assert from "node:assert/strict";
import type { TheaterBuildPacket } from "../src/domains/interview/types";
import {
  buildTheaterRouteBHandoff,
  buildTheaterRouteBMeetingSignalGroundingSummary,
} from "../src/domains/theater/route-b-handoff";
import {
  buildRouteBSessionDraft,
  buildRouteBTurnCreateData,
  isRouteBTurnVisibleToCharacter,
} from "../src/lib/theater/route-b-session-repository";
import {
  TheaterPersonaType,
  TheaterRouteBVisibilityScope,
  TheaterTurnRole,
} from "../src/generated/prisma/enums";

const checks: Array<{ label: string; detail?: string }> = [];

const packet: TheaterBuildPacket = {
  id: "theater_packet_route_b_schema_dry_run",
  interviewSessionId: "interview_route_b_schema_dry_run",
  interviewKind: "THEATER_FIELD_BUILD",
  readiness: "READY",
  focusClient: "林先生",
  scenario: "家庭保障檢視：釐清配偶共同決策與既有保單缺口",
  characters: [
    {
      id: "character_focus_lin",
      displayName: "林先生",
      role: "FOCUS_CLIENT",
      isFocus: true,
      knownFacts: ["林先生是科技公司營運長", "林先生年收入約 4,800,000 元"],
      inferences: ["林先生可能重視決策效率，但對長期承諾較保守"],
      unknowns: ["尚未確認林先生是否願意讓配偶共同參與決策"],
      personaHints: [
        {
          label: "推論：重視效率且容易對冗長說明失去耐心",
          confidence: "INFERRED",
          evidenceMemoryIds: ["mem_inference_efficiency"],
        },
      ],
      exemplarLines: ["我想先知道這件事到底有沒有必要。"],
    },
    {
      id: "character_spouse",
      displayName: "林太太",
      role: "DECISION_MAKER",
      isFocus: false,
      knownFacts: ["林太太會一起討論家庭保障"],
      inferences: ["林太太可能關心現金流與子女教育金"],
      unknowns: ["尚未確認林太太可接受的月繳預算"],
      personaHints: [
        {
          label: "推論：她會追問保費負擔",
          confidence: "INFERRED",
          evidenceMemoryIds: ["mem_spouse_cashflow"],
        },
      ],
      exemplarLines: [],
    },
    {
      id: "character_partner",
      displayName: "合夥人",
      role: "INFLUENCER",
      isFocus: false,
      knownFacts: ["合夥人曾提醒林先生公司責任風險"],
      inferences: [],
      unknowns: [],
      personaHints: [],
      exemplarLines: [],
    },
  ],
  relationships: ["林先生 的配偶：林太太", "林先生 的工作夥伴：合夥人"],
  objections: ["預期異議：太忙，想下次再談"],
  sensitiveNotes: [],
  confirmedFacts: ["林先生是科技公司營運長", "林先生年收入約 4,800,000 元"],
  inferredPersona: ["林先生可能重視決策效率，但對長期承諾較保守"],
  unknowns: ["尚未確認林先生是否願意讓配偶共同參與決策", "rawPayload token 0912-345-678 should be removed"],
  narratorQuestions: ["請先確認：林太太是否會參與本次拜訪？"],
  supportingMemoryIds: ["mem_focus", "mem_spouse_cashflow", "mem_inference_efficiency"],
  routeBCompatibility: {
    npcCount: 2,
    maxNpcCount: 4,
    canStartSimulation: true,
    migrationNote: "可供 Theater Route B build packet 消費；legacy Theater enum/scoring 維持不變。",
  },
};

const meetingSignalGrounding = buildTheaterRouteBMeetingSignalGroundingSummary(
  [
    {
      id: "meeting_session_raw_123_person_raw_456",
      status: "unknown",
      action: "ASK_IN_NEXT_VISIT",
      priority: "high",
      sourceLabel: "AI Meeting",
      summary: "林太太可能需要共同參與保障決策，仍待確認。",
      prompt: "請確認林太太是否會一起參與家庭保障討論。",
    },
  ],
  ["請確認林太太是否會一起參與家庭保障討論。"],
);

const handoff = buildTheaterRouteBHandoff(packet, {
  routeBEnabled: true,
  now: "2026-06-20T00:00:00.000Z",
  meetingRelationshipSignals: meetingSignalGrounding,
});

const draft = buildRouteBSessionDraft(
  handoff,
  {
    organizationId: "demo_org_asai_personal",
    unitId: "demo_unit_asai_taipei",
    clientId: "demo_client_route_b",
    ownerId: "demo_user_member",
    isDemo: true,
  },
  {
    sessionId: "route_b_schema_session_dry_run",
    nowIso: "2026-06-20T00:00:00.000Z",
  },
);

const focus = mustFindCharacter("character_focus_lin");
const spouse = mustFindCharacter("character_spouse");
const partner = mustFindCharacter("character_partner");
const focusId = mustString(focus.id, "focus id");
const spouseId = mustString(spouse.id, "spouse id");
const partnerId = mustString(partner.id, "partner id");

check(draft.sessionData.routeBEnabled === true, "session payload enables Route B only when handoff is enabled");
check(draft.sessionData.routeBSceneId === handoff.scene.id, "session payload stores Route B scene id");
check(draft.sessionData.routeBSourcePacketId === handoff.sourcePacketId, "session payload stores source packet id");
const persistedSceneState = draft.sessionData.sceneState as Record<string, unknown>;
const persistedMetadata = draft.sessionData.metadata as Record<string, unknown>;
const persistedGrounding = persistedSceneState.sourceGrounding as Record<string, unknown>;
const persistedMeetingGrounding = persistedGrounding.meetingRelationshipSignals as Record<string, unknown>;
const persistedMeetingBoundary = persistedMeetingGrounding.boundary as Record<string, unknown>;
const persistedMeetingCards = persistedMeetingGrounding.cards as Array<Record<string, unknown>>;
check(persistedMeetingGrounding.cardCount === 1, "session sceneState stores one safe meeting signal grounding card");
check(persistedMeetingGrounding.narratorQuestionCount === 1, "session sceneState stores meeting signal narrator question count");
check(persistedMeetingCards[0]?.stageCardId === "route_b_meeting_signal_1", "meeting signal grounding does not persist raw meeting/person ids");
check(persistedMeetingBoundary.providerCallAttempted === false, "meeting signal grounding keeps provider call false");
check(persistedMeetingBoundary.writesRelationshipGraph === false, "meeting signal grounding writes no relationship graph");
check(persistedMeetingBoundary.writesVisitPlan === false, "meeting signal grounding writes no VisitPlan");
check(persistedMeetingBoundary.writesConfirmedCrmFact === false, "meeting signal grounding writes no confirmed CRM fact");
check(Boolean((persistedMetadata.sourceGrounding as Record<string, unknown>)?.meetingRelationshipSignals), "session metadata carries source grounding preview");
check(draft.sessionData.personaType === TheaterPersonaType.CONSERVATIVE, "legacy personaType remains compatibility-only");
check(draft.sessionData.tension === 0, "legacy tension is neutralized for Route B draft");
check(draft.charactersData.length === 3, "character payloads are created for focus and NPCs");
check(draft.charactersData.filter((character) => character.isFocus).length === 1, "exactly one focus character is persisted");
check(draft.openingTurnData.visibilityScope === TheaterRouteBVisibilityScope.DIRECTOR_ONLY, "opening turn is director-only");
check(
  draft.aiUsageLogRequiredFor.join("|") === "DIRECTOR|CHARACTER|FEEDBACK",
  "future director/character/feedback calls require AiUsageLog",
);

const groupTurn = buildRouteBTurnCreateData({
  sessionId: draft.sessionId,
  actorKind: "CHARACTER",
  speakerCharacterId: focusId,
  content: "大家都聽得到的群聊內容",
  visibilityScope: "GROUP",
});
const privateTurn = buildRouteBTurnCreateData({
  sessionId: draft.sessionId,
  actorKind: "CHARACTER",
  speakerCharacterId: focusId,
  addresseeCharacterId: spouseId,
  content: "只給林太太的私聊內容",
  visibilityScope: "PRIVATE",
});
const directorTurn = buildRouteBTurnCreateData({
  sessionId: draft.sessionId,
  actorKind: "DIRECTOR",
  content: "導演內部狀態",
  visibilityScope: "DIRECTOR_ONLY",
});
const advisorTurn = buildRouteBTurnCreateData({
  sessionId: draft.sessionId,
  actorKind: "ADVISOR",
  content: "我想先理解您目前最擔心哪一塊保障。",
  visibilityScope: "GROUP",
});
const statePatchTurn = buildRouteBTurnCreateData({
  sessionId: draft.sessionId,
  actorKind: "NARRATOR",
  content: "旁白補問：請確認配偶是否參與決策。",
  visibilityScope: "NARRATOR",
  statePatches: handoff.scene.statePatches,
});

check(groupTurn.role === TheaterTurnRole.CLIENT, "character turn maps to legacy CLIENT role for compatibility");
check(advisorTurn.role === TheaterTurnRole.AGENT, "advisor turn maps to legacy AGENT role for compatibility");
check(directorTurn.role === TheaterTurnRole.SYSTEM, "director turn maps to legacy SYSTEM role for compatibility");
check(isRouteBTurnVisibleToCharacter(groupTurn, spouseId), "group turn is visible to spouse");
check(isRouteBTurnVisibleToCharacter(privateTurn, spouseId), "private turn is visible to addressee");
check(!isRouteBTurnVisibleToCharacter(privateTurn, partnerId), "private turn is not visible to another character");
check(!isRouteBTurnVisibleToCharacter(directorTurn, spouseId), "director-only turn is not visible to characters");
check(!isRouteBTurnVisibleToCharacter(statePatchTurn, spouseId), "narrator state patch is not character-visible by default");

const serialized = JSON.stringify({ draft, groupTurn, privateTurn, directorTurn, advisorTurn, statePatchTurn });
const serializedStringValues = collectStringValues({
  draft,
  groupTurn,
  privateTurn,
  directorTurn,
  advisorTurn,
  statePatchTurn,
}).join("\n");
check(!serializedStringValues.includes("@") && !/09\d{2}/.test(serializedStringValues), "schema draft contains no email/phone sentinel");
check(!serialized.includes('"writesConfirmedCrmFact":true'), "state patches cannot write confirmed CRM facts");
check(
  !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp"].some((sentinel) =>
    serializedStringValues.toLowerCase().includes(sentinel.toLowerCase()),
  ),
  "schema draft contains no raw private sentinel",
);

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

function mustFindCharacter(routeBCharacterId: string) {
  const character = draft.charactersData.find((item) => item.routeBCharacterId === routeBCharacterId);
  assert.ok(character, `Expected character ${routeBCharacterId}`);
  return character;
}

function check(condition: boolean, label: string, detail?: string) {
  assert.ok(condition, label);
  checks.push({ label, detail });
}

function mustString(value: string | undefined, label: string): string {
  assert.ok(value, `Expected ${label}`);
  return value;
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
}
