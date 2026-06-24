import assert from "node:assert/strict";
import { buildTheaterRouteBNextTurnDraft } from "../src/domains/theater/route-b-next-turn";
import type {
  TheaterRouteBFactStatus,
  TheaterRouteBMaterial,
  TheaterRouteBMaterialUse,
} from "../src/domains/theater/route-b-handoff";
import {
  buildTheaterRouteBMeetingSignalGroundingSummary,
  buildTheaterRouteBRelationshipEdgeShadowGroundingSummary,
} from "../src/domains/theater/route-b-handoff";
import type { RouteBSessionSnapshot } from "../src/domains/theater/route-b-session";

const checks: Array<{ label: string; detail?: string }> = [];

const groupDraft = buildTheaterRouteBNextTurnDraft(
  baseSnapshot([
    directorTurn("turn_opening", "Route B 場域已建立。rawPayload token should not leak."),
    characterTurn("turn_focus_1", "character_focus_lin", null, "GROUP", "我想先知道這件事有沒有必要。"),
    characterTurn("turn_focus_2", "character_focus_lin", null, "GROUP", "如果只是要我多付保費，我會想再等等。"),
    advisorTurn("advisor_group_latest", "GROUP", null, "我想先理解家庭中誰最在意現金流安排。qa-private@example.com"),
  ]),
);

check(groupDraft.status === "READY", "group next-turn draft is ready");
check(groupDraft.nextTurn.role === "CHARACTER", "group draft selects a character turn");
check(groupDraft.nextTurn.speakerRouteBCharacterId === "character_spouse", "group draft avoids overusing the focus speaker");
check(groupDraft.nextTurn.visibilityScope === "GROUP", "group draft keeps group visibility");
check(
  Boolean(groupDraft.nextTurn.guardEvidence?.consecutiveSpeakerBlockedCharacterIds.includes("character_focus_lin")),
  "group draft exposes consecutive-speaker guard evidence",
);
check(groupDraft.inputSummary.rawPrivateTranscriptIncluded === false, "group draft does not include raw private transcript");
check(groupDraft.providerBoundary.providerCallAttempted === false, "group draft does not call provider");
check(groupDraft.providerBoundary.aiUsageLogWritten === false, "group draft does not fake AiUsageLog");
check(groupDraft.persistenceEnvelope.writesConfirmedCrmFact === false, "group draft cannot write confirmed CRM facts");
check(groupDraft.persistenceEnvelope.statePatchCount > 0, "group draft carries pending state proposal count");
check(
  groupDraft.inputSummary.meetingRelationshipSignalGrounding.usedInNextTurnRuntime,
  "group draft carries meeting signal runtime grounding",
);
check(
  groupDraft.inputSummary.meetingRelationshipSignalGrounding.cardCount === 2,
  "group draft meeting signal grounding exposes safe card count",
);
check(
  groupDraft.inputSummary.meetingRelationshipSignalGrounding.unknownCount === 1,
  "group draft meeting signal grounding exposes unknown count",
);
check(
  groupDraft.inputSummary.meetingRelationshipSignalGrounding.narratorQuestionCount === 1,
  "group draft meeting signal grounding exposes narrator question count",
);
check(
  groupDraft.inputSummary.meetingRelationshipSignalGrounding.boundary.sourceReferenceIdsIncluded === false,
  "group draft meeting signal grounding excludes source reference ids",
);
check(
  !Object.prototype.hasOwnProperty.call(groupDraft.inputSummary.meetingRelationshipSignalGrounding.cards[0] ?? {}, "stageCardId"),
  "group draft meeting signal grounding drops raw stage card id",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.usedInNextTurnRuntime,
  "group draft carries relationship edge shadow runtime grounding",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.candidateEdgeCount === 3,
  "group draft edge shadow grounding exposes safe candidate edge count",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.sourceMemberCount === 4,
  "group draft edge shadow grounding exposes safe source member count",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.edgeTypeCounts.SPOUSE === 1,
  "group draft edge shadow grounding exposes edge type count",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.factStatusCounts.INFERENCE === 1,
  "group draft edge shadow grounding exposes fact status count",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.warningCodes.includes("RELATIONSHIP_EDGE_SCHEMA_NOT_APPROVED"),
  "group draft edge shadow grounding exposes safe warning code",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.boundary.rawDraftEdgesIncluded === false,
  "group draft edge shadow grounding excludes raw draft edges",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.boundary.clientFacingDraftEdgesReturned === false,
  "group draft edge shadow grounding excludes client-facing draft edges",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.boundary.formalSchemaApproved === false,
  "group draft edge shadow grounding keeps formal schema blocked",
);
check(
  groupDraft.inputSummary.relationshipEdgeShadowGrounding.boundary.writesRelationshipGraph === false,
  "group draft edge shadow grounding cannot write relationship graph",
);

const privateDraft = buildTheaterRouteBNextTurnDraft(
  baseSnapshot([
    directorTurn("turn_opening", "Route B 場域已建立。"),
    characterTurn("turn_partner_private", "character_partner", "character_spouse", "PRIVATE", "只給林太太的私聊內容。0912-345-678 should not leak."),
    advisorTurn("advisor_private_latest", "PRIVATE", "character_spouse", "林太太，我想直接聽聽您對月繳預算的想法。"),
  ]),
);

check(privateDraft.status === "READY", "private next-turn draft is ready");
check(privateDraft.nextTurn.speakerRouteBCharacterId === "character_spouse", "named private addressee must answer");
check(privateDraft.nextTurn.addresseeRouteBCharacterId === "character_spouse", "private draft keeps addressee");
check(privateDraft.nextTurn.visibilityScope === "PRIVATE", "private draft keeps private visibility");
check(Boolean(privateDraft.nextTurn.guardEvidence?.namedAddresseeMustAnswer), "private draft records named addressee obligation");
check(Boolean(privateDraft.nextTurn.guardEvidence?.privateHistoryScopedToAddressee), "private draft proves private history scoping");
check(privateDraft.privacyProof.directPrivateDialogReturned === false, "private draft does not return direct private dialog");
check(privateDraft.persistenceEnvelope.provider.aiUsageLogRequiredWhenProviderEnabled, "private draft keeps future AiUsageLog gate");

const noAdvisorDraft = buildTheaterRouteBNextTurnDraft(baseSnapshot([directorTurn("turn_opening", "Route B 場域已建立。")]));
check(noAdvisorDraft.status === "NEEDS_ADVISOR_TURN", "missing advisor turn becomes narrator blocked draft");
check(noAdvisorDraft.nextTurn.role === "NARRATOR", "missing advisor turn does not invent character reply");
check(noAdvisorDraft.providerBoundary.providerCallAttempted === false, "missing advisor path does not call provider");

const noCharacterDraft = buildTheaterRouteBNextTurnDraft({
  ...baseSnapshot([advisorTurn("advisor_group_latest", "GROUP", null, "請開始演練。")]),
  characters: [],
});
check(noCharacterDraft.status === "NO_CHARACTER", "missing characters becomes blocked draft");
check(noCharacterDraft.nextTurn.role === "NARRATOR", "missing characters does not invent character reply");

const serialized = collectStringValues([groupDraft, privateDraft, noAdvisorDraft, noCharacterDraft]).join("\n");
check(!serialized.includes("@") && !/09\d{2}/.test(serialized), "next-turn output contains no email/phone sentinel");
check(
  !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp", "payment"].some((sentinel) =>
    serialized.toLowerCase().includes(sentinel.toLowerCase()),
  ),
  "next-turn output contains no raw provider/private sentinel",
);

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

console.log(
  JSON.stringify(
    {
      groupSpeaker: groupDraft.nextTurn.speakerRouteBCharacterId,
      groupBlockedSpeakers: groupDraft.nextTurn.guardEvidence?.consecutiveSpeakerBlockedCharacterIds,
      privateSpeaker: privateDraft.nextTurn.speakerRouteBCharacterId,
      privateAddressee: privateDraft.nextTurn.addresseeRouteBCharacterId,
      noAdvisorStatus: noAdvisorDraft.status,
      noCharacterStatus: noCharacterDraft.status,
      providerCallAttempted: groupDraft.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: groupDraft.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: groupDraft.persistenceEnvelope.writesConfirmedCrmFact,
      rawPrivateTranscriptIncluded: groupDraft.inputSummary.rawPrivateTranscriptIncluded,
      meetingSignalRuntimeCardCount: groupDraft.inputSummary.meetingRelationshipSignalGrounding.cardCount,
      meetingSignalRuntimeUnknownCount: groupDraft.inputSummary.meetingRelationshipSignalGrounding.unknownCount,
      meetingSignalRuntimeNarratorQuestionCount:
        groupDraft.inputSummary.meetingRelationshipSignalGrounding.narratorQuestionCount,
      meetingSignalSourceReferenceIdsIncluded:
        groupDraft.inputSummary.meetingRelationshipSignalGrounding.boundary.sourceReferenceIdsIncluded,
      edgeShadowRuntimeCandidateEdgeCount: groupDraft.inputSummary.relationshipEdgeShadowGrounding.candidateEdgeCount,
      edgeShadowRuntimeSourceMemberCount: groupDraft.inputSummary.relationshipEdgeShadowGrounding.sourceMemberCount,
      edgeShadowRuntimeRawDraftEdgesIncluded:
        groupDraft.inputSummary.relationshipEdgeShadowGrounding.boundary.rawDraftEdgesIncluded,
      edgeShadowRuntimeWritesRelationshipGraph:
        groupDraft.inputSummary.relationshipEdgeShadowGrounding.boundary.writesRelationshipGraph,
    },
    null,
    2,
  ),
);

function baseSnapshot(turns: RouteBSessionSnapshot["turns"]): RouteBSessionSnapshot {
  return {
    session: {
      id: "route_b_session_next_turn_dry_run",
      routeBEnabled: true,
      routeBSceneId: "route_b_scene_next_turn",
      routeBSourcePacketId: "route_b_packet_next_turn",
      clientId: "client_next_turn",
      spinSessionId: null,
      status: "ACTIVE",
      isDemo: true,
      createdAt: "2026-06-22T04:39:12.000Z",
      provider: {
        callsEnabled: false,
        callAttempted: false,
        usageLogWritten: false,
        usageLogRequiredFor: ["DIRECTOR", "CHARACTER", "FEEDBACK"],
        storesProviderBody: false,
      },
    },
    scene: {
      relationships: [
        {
          id: "relation_spouse",
          summary: "林先生與林太太是共同決策關係。",
          factStatus: "CONFIRMED",
          visibilityScope: "GROUP",
        },
      ],
      narratorQuestions: [material("narrator_budget", "請確認林太太可接受的月繳預算。", "UNKNOWN", "NARRATOR_QUESTION")],
      statePatchCount: 0,
      visibilityRules: [
        {
          scope: "GROUP",
          label: "群聊",
          visibleTo: "EVERYONE",
          canBeQuotedInGroup: true,
          writesConfirmedCrmFact: false,
        },
        {
          scope: "PRIVATE",
          label: "私聊",
          visibleTo: "ADDRESSEE_ONLY",
          canBeQuotedInGroup: false,
          writesConfirmedCrmFact: false,
        },
      ],
      sourceGrounding: {
        meetingRelationshipSignals: meetingSignalGrounding(),
        relationshipEdgeShadow: relationshipEdgeShadowGrounding(),
      },
    },
    characters: [
      {
        id: "db_character_focus",
        routeBCharacterId: "character_focus_lin",
        role: "FOCUS_CLIENT",
        displayName: "林先生",
        isFocus: true,
        publicBrief: "科技公司營運長，重視效率。",
        knownFacts: [material("fact_focus_job", "林先生是科技公司營運長。", "CONFIRMED", "BACKGROUND_FACT")],
        personaHints: [{ label: "可能重視效率", factStatus: "INFERENCE", evidenceIds: ["mem_efficiency"] }],
        unknowns: [material("unknown_spouse", "尚未確認配偶是否參與決策。", "UNKNOWN", "NARRATOR_QUESTION")],
        exemplarLines: [material("line_focus", "我想先知道這件事有沒有必要。", "INFERENCE", "PERSONA_HINT")],
        statePatchCount: 0,
      },
      {
        id: "db_character_spouse",
        routeBCharacterId: "character_spouse",
        role: "DECISION_MAKER",
        displayName: "林太太",
        isFocus: false,
        publicBrief: "共同決策者，可能關注現金流。",
        knownFacts: [material("fact_spouse", "林太太會一起討論家庭保障。", "CONFIRMED", "BACKGROUND_FACT")],
        personaHints: [{ label: "可能追問保費負擔", factStatus: "INFERENCE", evidenceIds: ["mem_cashflow"] }],
        unknowns: [],
        exemplarLines: [],
        statePatchCount: 0,
      },
      {
        id: "db_character_partner",
        routeBCharacterId: "character_partner",
        role: "INFLUENCER",
        displayName: "合夥人",
        isFocus: false,
        publicBrief: "提醒公司責任風險的影響者。",
        knownFacts: [material("fact_partner", "合夥人曾提醒公司責任風險。", "CONFIRMED", "BACKGROUND_FACT")],
        personaHints: [],
        unknowns: [],
        exemplarLines: [],
        statePatchCount: 0,
      },
    ],
    turns,
    visibilityProof: {
      ownerOnlyRead: true,
      scopedTurnColumnsPersisted: true,
      thirdPartyVisibleForDirectMessage: false,
    },
  };
}

function directorTurn(id: string, content: string): RouteBSessionSnapshot["turns"][number] {
  return turn(id, "DIRECTOR", null, null, "DIRECTOR_ONLY", content);
}

function advisorTurn(
  id: string,
  visibilityScope: "GROUP" | "PRIVATE",
  addresseeRouteBCharacterId: string | null,
  content: string,
): RouteBSessionSnapshot["turns"][number] {
  return turn(id, "ADVISOR", null, addresseeRouteBCharacterId, visibilityScope, content);
}

function characterTurn(
  id: string,
  speakerRouteBCharacterId: string,
  addresseeRouteBCharacterId: string | null,
  visibilityScope: "GROUP" | "PRIVATE",
  content: string,
): RouteBSessionSnapshot["turns"][number] {
  return turn(id, "CHARACTER", speakerRouteBCharacterId, addresseeRouteBCharacterId, visibilityScope, content);
}

function turn(
  id: string,
  role: string,
  speakerRouteBCharacterId: string | null,
  addresseeRouteBCharacterId: string | null,
  visibilityScope: string,
  content: string,
): RouteBSessionSnapshot["turns"][number] {
  return {
    id,
    role,
    speakerRouteBCharacterId,
    addresseeRouteBCharacterId,
    visibilityScope,
    content,
    statePatchCount: 0,
    createdAt: "2026-06-22T04:39:12.000Z",
  };
}

function material(
  id: string,
  text: string,
  factStatus: TheaterRouteBFactStatus,
  use: TheaterRouteBMaterialUse,
): TheaterRouteBMaterial {
  return {
    id,
    text,
    factStatus,
    use,
    sourceRefs: [{ id: `${id}_source`, label: "QA fixture", factStatus }],
  };
}

function meetingSignalGrounding() {
  const summary = buildTheaterRouteBMeetingSignalGroundingSummary(
    [
      {
        id: "raw_meeting_session_qa_person_001",
        status: "inference",
        action: "ASK_IN_NEXT_VISIT",
        priority: "high",
        sourceLabel: "AI Meeting",
        summary: "林太太可能是現金流與預算決策的主要影響者。",
      },
      {
        id: "raw_person_reference_002",
        status: "unknown",
        action: "CREATE_CONFIRMATION_CARD",
        priority: "medium",
        sourceLabel: "AI Meeting",
        summary: "尚未確認家庭保障排序是否由夫妻共同決定。",
        prompt: "下一輪請確認誰會一起決定保障排序。",
      },
    ],
    ["請確認家庭保障排序與預算決策是否需要林太太共同參與。"],
  );

  if (!summary) {
    throw new Error("Expected meeting signal grounding summary fixture.");
  }

  return summary;
}

function relationshipEdgeShadowGrounding() {
  const summary = buildTheaterRouteBRelationshipEdgeShadowGroundingSummary({
    candidateEdges: 3,
    sourceMembers: 4,
    edgeTypes: ["SPOUSE", "PARENT_CHILD", "PARENT_CHILD"],
    factStatus: ["CONFIRMED", "INFERENCE", "UNKNOWN"],
    warningCodes: ["RELATIONSHIP_EDGE_SCHEMA_NOT_APPROVED", "UNSUPPORTED_RELATION_NEEDS_CONFIRMATION"],
    unsupportedRelationCount: 1,
    clientFacingDraftEdgesReturned: false,
    formalSchemaApproved: false,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesConfirmedCrmFact: false,
    persistedToDatabase: false,
  });

  if (!summary) {
    throw new Error("Expected relationship edge shadow grounding summary fixture.");
  }

  return summary;
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
