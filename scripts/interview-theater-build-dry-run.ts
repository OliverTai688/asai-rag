import {
  buildTheaterBuildPromptContext,
  buildTheaterFieldBuildContext,
} from "../src/domains/interview/theater-build";

const readyContext = buildTheaterFieldBuildContext({
  organizationId: "org_demo",
  memberId: "member_demo",
  clientId: "client_wang",
  sessionId: "theater_build_demo",
  currentSegmentId: "theater-focus",
  now: "2026-06-19T03:49:54.617Z",
  knownMaterials: [
    "FACT: focus_client=王大明; scenario=下週保單檢視會議; 王大明已確認是家裡主要經濟支柱。",
    "FACT: npc=李太太|DECISION_MAKER; relationship=李太太會參與家庭重大財務決策。",
    "FACT: npc=王媽媽|INFLUENCER; relationship=王媽媽對醫療支出很敏感。",
    "FACT: npc=業務員小明|ADVISOR; relationship=小明與王大明已互動三年。",
    "FACT: npc=財務同事|INFLUENCER; relationship=財務同事常給王大明投資建議。",
    "FACT: npc=多餘角色|INFLUENCER; relationship=這位角色應被 NPC 上限截掉。",
    "FACT: objection=王大明曾說先不要談商品，只想先看保障缺口。",
    "FACT: sensitive=家庭病史只能在王大明主動提起後再追問。",
    "INFERENCE: 李太太可能會反對，因為她覺得保險很複雜。",
    "UNKNOWN: 不確定既有醫療險是否快到期。",
  ],
  messages: [
    {
      role: "assistant",
      content: "我們先把劇場焦點建起來。",
    },
    {
      role: "user",
      content: "確認王大明是焦點客戶，想練的是下週保單檢視會議。",
    },
  ],
});

const blockedContext = buildTheaterFieldBuildContext({
  organizationId: "org_demo",
  memberId: "member_demo",
  sessionId: "theater_build_blocked",
  now: "2026-06-19T03:49:54.617Z",
  knownMaterials: [
    "INFERENCE: 客戶可能很忙，應該不想聊太久。",
    "UNKNOWN: 不確定這次要演練哪個拜訪場景。",
  ],
  messages: [],
});

const promptContext = buildTheaterBuildPromptContext(readyContext.packet);
const failures: string[] = [];
const packet = readyContext.packet;
const blockedPacket = blockedContext.packet;

if (readyContext.memories.length < 10) failures.push("memory stream did not include theater build fixture materials");
if (packet.readiness !== "READY") failures.push("ready fixture did not produce a READY packet");
if (!packet.focusClient?.includes("王大明")) failures.push("focus client was not extracted from confirmed facts");
if (!packet.scenario?.includes("保單檢視")) failures.push("scenario was not extracted from confirmed facts");
if (packet.routeBCompatibility.npcCount > 4) failures.push("packet exceeded NPC max count");
if (packet.characters.some((character) => character.displayName === "多餘角色")) failures.push("NPC overflow role was not truncated");
if (!packet.relationships.some((relationship) => relationship.includes("李太太"))) failures.push("relationship evidence is missing");
if (!packet.objections.some((objection) => objection.includes("不要談商品"))) failures.push("objection evidence is missing");
if (!packet.sensitiveNotes.some((note) => note.includes("家庭病史"))) failures.push("sensitive note evidence is missing");
if (!packet.inferredPersona.some((value) => value.includes("李太太可能會反對"))) failures.push("inference persona evidence is missing");
if (packet.confirmedFacts.some((value) => value.includes("可能會反對"))) failures.push("inference leaked into confirmed facts");
if (!packet.unknowns.some((value) => value.includes("醫療險是否快到期"))) failures.push("unknown gap is missing");
if (!packet.narratorQuestions.some((question) => question.includes("醫療險是否快到期"))) {
  failures.push("narrator questions did not include unknown gap");
}
if (!packet.supportingMemoryIds.length) failures.push("supporting memory IDs are missing");
if (!promptContext.includes("不得生成正式演練劇場")) failures.push("prompt context does not include no-generation rule");

if (blockedPacket.readiness !== "NEEDS_MORE_INFO") failures.push("insufficient fixture should not produce a READY packet");
if (blockedPacket.routeBCompatibility.canStartSimulation) failures.push("blocked packet should not allow simulation start");
if (!blockedPacket.narratorQuestions.some((question) => question.includes("拜訪場景"))) {
  failures.push("blocked packet did not request missing scenario");
}

if (failures.length > 0) {
  console.error("interview:theater-build-dry-run — failed");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("interview:theater-build-dry-run — theater build packet passed.");
console.log(
  JSON.stringify(
    {
      readiness: packet.readiness,
      focusClient: packet.focusClient,
      scenario: packet.scenario,
      npcCount: packet.routeBCompatibility.npcCount,
      supportingMemoryIds: packet.supportingMemoryIds,
      narratorQuestions: packet.narratorQuestions,
      blockedReadiness: blockedPacket.readiness,
    },
    null,
    2,
  ),
);
