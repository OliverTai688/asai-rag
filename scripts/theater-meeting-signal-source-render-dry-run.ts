import assert from "node:assert/strict";
import {
  buildTheaterRouteBMeetingSignalGroundingSummary,
  type TheaterRouteBMeetingSignalGroundingInput,
} from "../src/domains/theater/route-b-handoff";
import { buildRouteBMeetingSignalSourceRenderModel } from "../src/domains/theater/route-b-meeting-signal-source-render";

const checks: Array<{ label: string; detail?: string }> = [];

const signalInputs: TheaterRouteBMeetingSignalGroundingInput[] = [
  {
    id: "meeting_session_raw_123_person_raw_456",
    status: "unknown",
    action: "ASK_IN_NEXT_VISIT",
    priority: "high",
    sourceType: "MEETING_QUICK_NOTE_WRITEBACK_BRIDGE",
    sourceLabel: "AI Meeting quick note",
    summary: "配偶可能需要共同參與保障決策，仍待顧問下一次確認。",
    prompt: "請確認配偶是否會一起參與家庭保障討論。",
  },
  {
    id: "source_ref_secret_should_not_render",
    status: "inference",
    action: "REVIEW_WITH_ADVISOR",
    priority: "medium",
    sourceType: "raw_session_secret",
    sourceLabel: "AI Meeting",
    summary: "顧問需要先確認決策人與現金流壓力。",
    prompt: "顧問確認後才可進入劇場角色狀態。",
  },
];

const grounding = buildTheaterRouteBMeetingSignalGroundingSummary(signalInputs, [
  "請確認配偶是否會一起參與家庭保障討論。",
]);
assert.ok(grounding, "meeting signal grounding should be created for render proof fixture");
const renderModel = buildRouteBMeetingSignalSourceRenderModel(grounding);

check(
  "render model targets RouteBMeetingSignalGroundingPanel",
  renderModel.componentName === "RouteBMeetingSignalGroundingPanel",
);
check(
  "render model exposes session panel data attribute",
  renderModel.dataAttribute === "data-route-b-meeting-signal-source-grounding",
);
check(
  "render model exposes source-type summary attribute",
  renderModel.sourceTypeDataAttribute === "data-route-b-meeting-signal-source-type-summary",
);
check("render model keeps card count", renderModel.cardCount === 2);
check("render model keeps unknown count", renderModel.unknownCount === 1);
check("render model keeps narrator question count", renderModel.narratorQuestionCount === 1);
check(
  "quick-note writeback bridge source type is advisor-visible",
  renderModel.sourceTypeChips.some(
    (chip) => chip.sourceType === "MEETING_QUICK_NOTE_WRITEBACK_BRIDGE" && chip.count === 1,
  ),
);
check(
  "card-level source type survives render model",
  renderModel.cards[0]?.sourceType === "MEETING_QUICK_NOTE_WRITEBACK_BRIDGE",
);
check("raw-looking source type is redacted", renderModel.cards[1]?.sourceType === "REDACTED_SOURCE_TYPE");
check("source type proof is visible", renderModel.proof.sourceTypesVisibleToAdvisor);
check("render model does not include raw meeting session id", renderModel.proof.rawMeetingSessionIdIncluded === false);
check("render model does not include raw person id", renderModel.proof.rawPersonIdIncluded === false);
check("render model does not include source reference ids", renderModel.proof.sourceReferenceIdsIncluded === false);
check("render model does not include private transcript", renderModel.proof.rawPrivateTranscriptIncluded === false);
check("render model does not include provider payload", renderModel.proof.rawProviderPayloadIncluded === false);
check("render model does not call provider", renderModel.proof.providerCallAttempted === false);
check("render model does not write AiUsageLog", renderModel.proof.aiUsageLogWritten === false);
check("render model does not write relationship graph", renderModel.proof.writesRelationshipGraph === false);
check("render model does not write VisitPlan", renderModel.proof.writesVisitPlan === false);
check("render model does not write confirmed CRM fact", renderModel.proof.writesConfirmedCrmFact === false);

const serialized = JSON.stringify(renderModel);
for (const forbidden of [
  "meeting_session_raw_123",
  "person_raw_456",
  "source_ref_secret_should_not_render",
  "raw_session_secret",
  "raw provider",
  "private.client@example.com",
  "0912",
]) {
  check(`forbidden sentinel excluded: ${forbidden}`, !serialized.toLowerCase().includes(forbidden.toLowerCase()));
}

assert.equal(checks.filter((check) => !check.detail).length, checks.length);

for (const check of checks) {
  console.log(`PASS ${check.label}`);
}

console.log(
  JSON.stringify(
    {
      componentName: renderModel.componentName,
      dataAttribute: renderModel.dataAttribute,
      sourceTypeDataAttribute: renderModel.sourceTypeDataAttribute,
      sourceTypeChips: renderModel.sourceTypeChips,
      cardSourceTypes: renderModel.cards.map((card) => card.sourceType),
      proof: renderModel.proof,
    },
    null,
    2,
  ),
);

function check(label: string, condition: boolean) {
  checks.push({ label, ...(condition ? {} : { detail: "failed" }) });
  if (!condition) {
    throw new Error(label);
  }
}
