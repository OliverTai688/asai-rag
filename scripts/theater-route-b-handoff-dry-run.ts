import assert from "node:assert/strict";
import {
  THEATER_ROUTE_B_MAX_NPCS,
  buildTheaterRouteBCharacterInput,
  buildTheaterRouteBDirectorInput,
  buildTheaterRouteBHandoff,
  buildTheaterRouteBStatePatch,
  type TheaterRouteBTurnRef,
} from "../src/domains/theater/route-b-handoff";
import type { TheaterBuildPacket } from "../src/domains/interview/types";

const checks: Array<{ label: string; detail?: string }> = [];

const packet: TheaterBuildPacket = {
  id: "theater_packet_route_b_dry_run",
  interviewSessionId: "interview_route_b_dry_run",
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
    {
      id: "character_parent",
      displayName: "母親",
      role: "INFLUENCER",
      isFocus: false,
      knownFacts: [],
      inferences: ["母親可能關心醫療照護安排"],
      unknowns: [],
      personaHints: [],
      exemplarLines: [],
    },
    {
      id: "character_accountant",
      displayName: "會計師",
      role: "INFLUENCER",
      isFocus: false,
      knownFacts: [],
      inferences: ["會計師可能在意稅務與資產安排"],
      unknowns: [],
      personaHints: [],
      exemplarLines: [],
    },
    {
      id: "character_extra",
      displayName: "額外角色不應進場",
      role: "INFLUENCER",
      isFocus: false,
      knownFacts: ["這個角色超過 NPC 上限"],
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
  unknowns: ["尚未確認林先生是否願意讓配偶共同參與決策", "rawPayload token 09XX should be removed"],
  narratorQuestions: ["請先確認：林太太是否會參與本次拜訪？"],
  supportingMemoryIds: ["mem_focus", "mem_spouse_cashflow", "mem_inference_efficiency"],
  routeBCompatibility: {
    npcCount: 5,
    maxNpcCount: 4,
    canStartSimulation: true,
    migrationNote: "可供 Theater Route B build packet 消費；legacy Theater enum/scoring 維持不變。",
  },
};

const handoff = buildTheaterRouteBHandoff(packet, {
  routeBEnabled: false,
  now: "2026-06-20T00:00:00.000Z",
});

const focus = mustFindCharacter("林先生");
const spouse = mustFindCharacter("林太太");
const partner = mustFindCharacter("合夥人");

check(handoff.scene.characters.some((character) => character.isFocus), "scene has focus client");
check(
  handoff.scene.characters.filter((character) => !character.isFocus && character.role !== "NARRATOR").length <=
    THEATER_ROUTE_B_MAX_NPCS,
  "NPC count is capped at Route B maximum",
  `characters=${handoff.scene.characters.length}`,
);
check(!handoff.scene.characters.some((character) => character.displayName === "額外角色不應進場"), "extra NPC is trimmed");
check(
  handoff.scene.narratorQuestions.every((question) => question.factStatus === "UNKNOWN"),
  "unknown gaps stay narrator questions",
);
check(
  handoff.scene.characters.flatMap((character) => character.personaHints).some((hint) => hint.factStatus === "INFERENCE"),
  "persona hints preserve inference status",
);
check(
  handoff.scene.visibilityRules.map((rule) => rule.scope).join("|") === "GROUP|PRIVATE|DIRECTOR_ONLY|NARRATOR",
  "visibility scopes include group/private/director/narrator",
);
check(handoff.runtimeActivation.canStartProductionSession === false, "Route B runtime remains disabled by default");
check(handoff.runtimeActivation.rollbackNote.includes("Route B 未啟用"), "rollback note is explicit");
check(
  handoff.aiUsagePlan.calls.length === 3 &&
    handoff.aiUsagePlan.calls.every((call) => call.requiresAiUsageLog && !call.storesRawProviderPayload),
  "director/character/feedback calls all require AiUsageLog",
);
check(handoff.aiUsagePlan.noProviderDuringHandoffBuild, "handoff build is no-provider");

const history: TheaterRouteBTurnRef[] = [
  {
    id: "turn_group",
    speakerCharacterId: focus.id,
    visibilityScope: "GROUP",
    content: "大家都聽得到的群聊內容",
  },
  {
    id: "turn_private_spouse",
    speakerCharacterId: focus.id,
    addresseeCharacterId: spouse.id,
    visibilityScope: "PRIVATE",
    content: "只給林太太的私聊內容",
  },
  {
    id: "turn_private_partner",
    speakerCharacterId: focus.id,
    addresseeCharacterId: partner.id,
    visibilityScope: "PRIVATE",
    content: "只給合夥人的私聊內容",
  },
  {
    id: "turn_director",
    visibilityScope: "DIRECTOR_ONLY",
    content: "導演內部狀態，不可讓角色看到",
  },
];

const directorInput = buildTheaterRouteBDirectorInput(handoff, {
  salespersonUtterance: "我想先理解您目前最擔心哪一塊保障。",
  history,
});
check(directorInput.aiUsageLogRequired, "director input marks AiUsageLog required");
check(directorInput.scopedHistory.length === history.length, "director input receives scoped history with visibility labels");

const spouseInput = buildTheaterRouteBCharacterInput(handoff, {
  characterId: spouse.id,
  addresseeCharacterId: focus.id,
  visibilityScope: "PRIVATE",
  directorDirective: "請林太太回應現金流顧慮。",
  history,
});
const visibleIds = spouseInput.visibleHistory.map((turn) => turn.id);
check(visibleIds.includes("turn_group"), "character input sees group history");
check(visibleIds.includes("turn_private_spouse"), "character input sees private history addressed to self");
check(!visibleIds.includes("turn_private_partner"), "character input cannot see another private thread");
check(!visibleIds.includes("turn_director"), "character input cannot see director-only history");

const patch = buildTheaterRouteBStatePatch({
  targetCharacterId: spouse.id,
  summary: "林太太可能在意月繳預算，仍需確認。",
  factStatus: "INFERENCE",
  visibilityScope: "PRIVATE",
  sourceTurnId: "turn_private_spouse",
});
check(patch.requiresConfirmation, "state patch requires confirmation");
check(patch.writesConfirmedCrmFact === false, "state patch cannot write confirmed CRM fact");

const handoffStrings = collectStringValues(handoff);
const serializedTextValues = handoffStrings.join("\n");
check(!serializedTextValues.includes("@") && !/09\d{2}/.test(serializedTextValues), "handoff contains no email/phone sentinel");
check(
  !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp"].some((sentinel) =>
    serializedTextValues.toLowerCase().includes(sentinel.toLowerCase()),
  ),
  "handoff contains no raw private sentinel",
);

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

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
