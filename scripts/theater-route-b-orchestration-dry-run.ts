import assert from "node:assert/strict";
import {
  THEATER_ROUTE_B_MAX_NPCS,
  buildTheaterRouteBHandoff,
  type TheaterRouteBTurnRef,
} from "../src/domains/theater/route-b-handoff";
import { buildTheaterRouteBOrchestrationPlan } from "../src/domains/theater/route-b-orchestration";
import type { TheaterBuildPacket } from "../src/domains/interview/types";

const checks: Array<{ label: string; detail?: string }> = [];

const packet: TheaterBuildPacket = {
  id: "theater_packet_route_b_orchestration",
  interviewSessionId: "interview_route_b_orchestration",
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
  narratorQuestions: ["請先確認：林太太是否會參與本次拜訪？", "請確認林太太可接受的月繳預算。"],
  supportingMemoryIds: ["mem_focus", "mem_spouse_cashflow", "mem_inference_efficiency"],
  routeBCompatibility: {
    npcCount: 2,
    maxNpcCount: THEATER_ROUTE_B_MAX_NPCS,
    canStartSimulation: true,
    migrationNote: "可供 Theater Route B build packet 消費；legacy Theater enum/scoring 維持不變。",
  },
};

const handoff = buildTheaterRouteBHandoff(packet, {
  routeBEnabled: true,
  now: "2026-06-22T01:50:52.000Z",
});

const focus = mustFindCharacter("林先生");
const spouse = mustFindCharacter("林太太");
const partner = mustFindCharacter("合夥人");

const history: TheaterRouteBTurnRef[] = [
  {
    id: "turn_private_spouse",
    speakerCharacterId: partner.id,
    addresseeCharacterId: spouse.id,
    visibilityScope: "PRIVATE",
    content: "只給林太太的私聊內容。",
  },
  {
    id: "turn_private_partner",
    speakerCharacterId: focus.id,
    addresseeCharacterId: partner.id,
    visibilityScope: "PRIVATE",
    content: "rawPayload token qa-private@example.com 0912-345-678 不應出現在 orchestration output。",
  },
  {
    id: "turn_director",
    visibilityScope: "DIRECTOR_ONLY",
    content: "導演內部狀態，不可讓角色看到。",
  },
  {
    id: "turn_group_focus_1",
    speakerCharacterId: focus.id,
    visibilityScope: "GROUP",
    content: "我想先知道這件事有沒有必要。",
  },
  {
    id: "turn_group_focus_2",
    speakerCharacterId: focus.id,
    visibilityScope: "GROUP",
    content: "如果只是要我多付保費，我會想再等等。",
  },
];

const groupPlan = buildTheaterRouteBOrchestrationPlan({
  handoff,
  history,
  advisorTurn: {
    id: "advisor_group_question",
    visibilityScope: "GROUP",
    content: "我想先理解家庭中誰最在意現金流安排。",
  },
});

check(groupPlan.agentId === "asai.theater.route_b", "orchestration is attached to Route B agent id");
check(groupPlan.registryReadiness === "internal-only", "orchestration remains internal-only");
check(
  groupPlan.directorDirective.speakerCharacterId !== focus.id &&
    groupPlan.directorDirective.guardEvidence.consecutiveSpeakerBlockedCharacterIds.includes(focus.id),
  "consecutive speaker guard prevents focus client from dominating group flow",
  `selected=${groupPlan.directorDirective.speakerCharacterId}`,
);
check(groupPlan.directorDirective.visibilityScope === "GROUP", "group advisor turn produces group character directive");
check(groupPlan.characterReplyInput.characterCard.id === groupPlan.directorDirective.speakerCharacterId, "character input follows director-selected speaker");
check(groupPlan.characterReplyInput.visibleHistory.some((turn) => turn.id === "turn_group_focus_1"), "character reply input sees group history");
check(!groupPlan.characterReplyInput.visibleHistory.some((turn) => turn.id === "turn_private_partner"), "character reply input cannot see another private lane");
check(!groupPlan.characterReplyInput.visibleHistory.some((turn) => turn.id === "turn_director"), "character reply input cannot see director-only history");
check(groupPlan.persistenceEnvelope.provider.providerCallAttempted === false, "orchestration does not call provider");
check(groupPlan.persistenceEnvelope.provider.aiUsageLogWritten === false, "orchestration does not fake AiUsageLog");
check(groupPlan.persistenceEnvelope.provider.aiUsageLogRequiredWhenProviderEnabled, "future provider path still requires AiUsageLog");
check(groupPlan.persistenceEnvelope.writesConfirmedCrmFact === false, "persistence envelope cannot write confirmed CRM fact");
check(
  groupPlan.persistenceEnvelope.statePatches.length > 0 &&
    groupPlan.persistenceEnvelope.statePatches.every(
      (patch) => patch.factStatus === "UNKNOWN" && patch.requiresConfirmation && patch.writesConfirmedCrmFact === false,
    ),
  "unknowns become narrator/state proposals only",
);
check(
  groupPlan.narratorQueue.length === handoff.scene.narratorQuestions.length &&
    groupPlan.narratorQueue.every((item) => item.factStatus === "UNKNOWN" && item.writesConfirmedCrmFact === false),
  "narrator queue preserves unknown gaps",
);

const privatePlan = buildTheaterRouteBOrchestrationPlan({
  handoff,
  history,
  advisorTurn: {
    id: "advisor_private_spouse",
    visibilityScope: "PRIVATE",
    addresseeCharacterId: spouse.id,
    content: "林太太，我想直接聽聽您對月繳預算的想法。",
  },
});

check(privatePlan.directorDirective.speakerCharacterId === spouse.id, "named private addressee must answer");
check(privatePlan.directorDirective.guardEvidence.namedAddresseeMustAnswer, "named addressee answer obligation is explicit");
check(privatePlan.directorDirective.guardEvidence.namedAddresseeFound, "named addressee is validated");
check(privatePlan.directorDirective.visibilityScope === "PRIVATE", "private advisor turn produces private character directive");
check(privatePlan.directorDirective.addresseeCharacterId === spouse.id, "private directive keeps selected addressee");
check(privatePlan.characterReplyInput.visibleHistory.some((turn) => turn.id === "turn_private_spouse"), "private character sees own private lane");
check(!privatePlan.characterReplyInput.visibleHistory.some((turn) => turn.id === "turn_private_partner"), "private character cannot see another character private lane");
check(privatePlan.persistenceEnvelope.addresseeCharacterId === spouse.id, "persistence envelope keeps private lane addressee");
check(privatePlan.providerBoundary.providerCallAttempted === false, "provider boundary remains no-provider");
check(privatePlan.providerBoundary.aiUsageLogWritten === false, "provider boundary writes no fake usage log");

const serialized = collectStringValues([groupPlan, privatePlan]).join("\n");
check(!serialized.includes("@") && !/09\d{2}/.test(serialized), "orchestration output contains no email/phone sentinel");
check(
  !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp"].some((sentinel) =>
    serialized.toLowerCase().includes(sentinel.toLowerCase()),
  ),
  "orchestration output contains no raw provider/private sentinel",
);

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

console.log(
  JSON.stringify(
    {
      selectedGroupSpeaker: groupPlan.directorDirective.speakerCharacterId,
      privateSpeaker: privatePlan.directorDirective.speakerCharacterId,
      blockedSpeakers: groupPlan.directorDirective.guardEvidence.consecutiveSpeakerBlockedCharacterIds,
      groupVisibleHistory: groupPlan.characterReplyInput.visibleHistory.length,
      privateVisibleHistory: privatePlan.characterReplyInput.visibleHistory.length,
      narratorQueue: groupPlan.narratorQueue.length,
      stateProposals: groupPlan.persistenceEnvelope.statePatches.length,
      providerCallAttempted: groupPlan.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: groupPlan.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: groupPlan.persistenceEnvelope.writesConfirmedCrmFact,
    },
    null,
    2,
  ),
);

function mustFindCharacter(displayName: string) {
  const character = handoff.scene.characters.find((item) => item.displayName === displayName);
  assert.ok(character, `Expected character ${displayName}`);
  return character;
}

function check(condition: boolean, label: string, detail?: string) {
  assert.ok(condition, label);
  checks.push({ label, detail });
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
}
