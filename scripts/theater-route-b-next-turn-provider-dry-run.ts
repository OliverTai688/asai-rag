import assert from "node:assert/strict";
import {
  buildTheaterRouteBNextTurnDraft,
  type TheaterRouteBNextTurnDraft,
} from "../src/domains/theater/route-b-next-turn";
import {
  buildTheaterRouteBNextTurnProviderInput,
  runTheaterRouteBNextTurnProviderContract,
  type TheaterRouteBNextTurnProviderAdapter,
  type TheaterRouteBNextTurnProviderInput,
  type TheaterRouteBNextTurnUsageLogDraft,
  type TheaterRouteBNextTurnUsageLogRecord,
  type TheaterRouteBNextTurnUsageLogger,
} from "../src/domains/theater/route-b-next-turn-provider";
import type {
  TheaterRouteBFactStatus,
  TheaterRouteBMaterial,
  TheaterRouteBMaterialUse,
} from "../src/domains/theater/route-b-handoff";
import type { RouteBSessionSnapshot } from "../src/domains/theater/route-b-session";

const checks: Array<{ label: string; detail?: string }> = [];
const eventTrail: string[] = [];
const successRecords: TheaterRouteBNextTurnUsageLogRecord[] = [];
const errorRecords: TheaterRouteBNextTurnUsageLogRecord[] = [];

const readyPrivateDraft = buildTheaterRouteBNextTurnDraft(
  baseSnapshot([
    directorTurn("turn_opening", "Route B 場域已建立。"),
    characterTurn("turn_private_old", "character_partner", "character_focus_lin", "PRIVATE", "rawPayload private 0912-345-678 should not leak."),
    advisorTurn("advisor_private_latest", "PRIVATE", "character_spouse", "林太太，我想直接聽聽您對月繳預算的想法。qa-private@example.com"),
  ]),
);
const readyNarratorDraft = toReadyNarratorDraft(readyPrivateDraft);
const blockedDraft = buildTheaterRouteBNextTurnDraft(baseSnapshot([directorTurn("turn_opening", "Route B 場域已建立。")]));

const providerInput = buildTheaterRouteBNextTurnProviderInput(readyPrivateDraft);
check(providerInput.agentId === "asai.theater.route_b", "provider input keeps Route B agent id");
check(providerInput.actionId === "route-b-next-turn-provider", "provider input declares next-turn provider action");
check(providerInput.registryReadiness === "internal-only", "provider input remains internal-only");
check(providerInput.session.latestAdvisorTurnId === "advisor_private_latest", "provider input references latest advisor turn id");
check(providerInput.nextTurn.speakerRouteBCharacterId === "character_spouse", "provider input uses selected speaker");
check(providerInput.nextTurn.visibilityScope === "PRIVATE", "provider input preserves visibility scope");
check(Boolean(providerInput.nextTurn.guardEvidence?.namedAddresseeMustAnswer), "provider input carries named-addressee guard");
check(providerInput.persistenceEnvelope.requiresAdvisorConfirmation, "provider input requires advisor confirmation");
check(!providerInput.persistenceEnvelope.writesConfirmedCrmFact, "provider input cannot write confirmed CRM fact");
check(providerInput.promptContext.actionId === "route-b-provider-prompt-context", "provider input carries prompt context action");
check(providerInput.promptContext.librarySummary.objectionPromptCount === 12, "provider input prompt context references 12 objections");
check(providerInput.promptContext.librarySummary.redLineRuleCount === 18, "provider input prompt context references 18 red lines");
check(providerInput.promptContext.selectedObjections.length === 4, "provider input prompt context selects bounded objections");
check(providerInput.promptContext.redLineCues.length === 18, "provider input prompt context carries all red-line cues");
check(providerInput.promptContext.promptRules.immediateSevereRedLineIds.length === 5, "provider input prompt context keeps five immediate severe red lines");
check(providerInput.promptContext.promptRules.postReviewRedLineIds.length === 13, "provider input prompt context keeps thirteen post-review red lines");
check(providerInput.promptContext.promptRules.doNotTreatObjectionsAsConfirmedCrmFacts, "provider input prompt context prevents confirmed CRM fact writes");
check(providerInput.promptContext.promptRules.doNotProvideLegalAdvice, "provider input prompt context forbids legal advice posture");
check(!providerInput.promptContext.providerBoundary.providerCallAttempted, "prompt context itself does not call provider");
check(!providerInput.promptContext.providerBoundary.aiUsageLogWritten, "prompt context itself does not fake AiUsageLog");
check(providerInput.promptContext.providerBoundary.successErrorAiUsageLogRequiredBeforeProviderEnablement, "prompt context keeps success/error AiUsageLog enablement gate");
check(providerInput.outputRules.generatedTextAllowed, "provider input allows generated text only inside provider contract");
check(providerInput.outputRules.appendRequiresAdvisorConfirmation, "provider input requires append confirmation");
check(!providerInput.outputRules.storesRawProviderPayload, "provider input forbids raw provider payload storage");
check(!providerInput.privacyBoundary.includesRawPrivateTranscript, "provider input excludes raw private transcript");
check(!providerInput.privacyBoundary.includesDirectPrivateDialog, "provider input excludes direct private dialog");
checkNoSentinel(providerInput, "provider input excludes private/provider sentinel text");

const fakeProvider: TheaterRouteBNextTurnProviderAdapter = {
  async generate(input: TheaterRouteBNextTurnProviderInput) {
    eventTrail.push("provider.success.generate");
    assert.equal(input.outputRules.appendRequiresAdvisorConfirmation, true);
    assert.equal(input.promptContext.redLineCues.length, 18);
    assert.equal(input.promptContext.promptRules.doNotTreatObjectionsAsConfirmedCrmFacts, true);
    return {
      model: "gpt-test-route-b-character",
      tokenUsage: { inputTokens: 212.9, outputTokens: 57.6 },
      content:
        "我會先確認月繳預算，再請顧問補一個選項比較。providerPayload token 0912-345-678 should be removed.",
    };
  },
};

const failingProvider: TheaterRouteBNextTurnProviderAdapter = {
  async generate() {
    eventTrail.push("provider.error.generate");
    throw new Error("simulated provider outage with rawPayload secret");
  },
};

const narratorProvider: TheaterRouteBNextTurnProviderAdapter = {
  async generate(input: TheaterRouteBNextTurnProviderInput) {
    eventTrail.push("provider.narrator.generate");
    assert.equal(input.nextTurn.role, "NARRATOR");
    assert.equal(input.persistenceEnvelope.actorKind, "NARRATOR");
    assert.equal(input.persistenceEnvelope.allowedWriteTargets.includes("NARRATOR_QUEUE"), true);
    return {
      model: "gpt-test-route-b-narrator",
      tokenUsage: { inputTokens: 101, outputTokens: 32 },
      content: "旁白建議先請顧問補問預算上限，再回到家庭保障排序。",
    };
  },
};

const unusedProvider: TheaterRouteBNextTurnProviderAdapter = {
  async generate() {
    eventTrail.push("provider.blocked.unexpected");
    throw new Error("Blocked draft must not call provider.");
  },
};

const usageLogger: TheaterRouteBNextTurnUsageLogger = {
  async writeSuccess(draft: TheaterRouteBNextTurnUsageLogDraft) {
    eventTrail.push("usage.success.write");
    const record = usageRecord(`usage_next_turn_success_${String(successRecords.length + 1).padStart(3, "0")}`, draft);
    successRecords.push(record);
    return record;
  },
  async writeError(draft: TheaterRouteBNextTurnUsageLogDraft) {
    eventTrail.push("usage.error.write");
    const record = usageRecord("usage_next_turn_error_001", draft);
    errorRecords.push(record);
    return record;
  },
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const successResult = await runTheaterRouteBNextTurnProviderContract({
    draft: readyPrivateDraft,
    providerKind: "OPENAI",
    provider: fakeProvider,
    usageLogger,
  });

  check(successResult.status === "SUCCESS", "next-turn provider success path returns success after usage logging");
  if (successResult.status !== "SUCCESS") {
    throw new Error("Expected Route B next-turn provider success result.");
  }
  check(successResult.providerCallAttempted, "success path marks provider attempted");
  check(successResult.aiUsageLogWritten, "success path marks AiUsageLog written");
  check(successResult.usageLogId === "usage_next_turn_success_001", "success path exposes usage log id");
  check(successResult.appendCandidate.generatedTextAllowed, "success path creates generated append candidate");
  check(successResult.appendCandidate.requiresAdvisorConfirmation, "success append candidate requires advisor confirmation");
  check(successResult.appendCandidate.visibilityScope === "PRIVATE", "success append candidate preserves private visibility");
  check(!successResult.appendCandidate.writesConfirmedCrmFact, "success append candidate cannot write confirmed CRM fact");
  check(!successResult.appendCandidate.storesRawProviderPayload, "success append candidate does not store raw provider payload");
  check(!successResult.appendCandidate.rawPrivateTranscriptIncluded, "success append candidate excludes raw private transcript");
  checkNoSentinel(successResult, "success result sanitizes provider/private sentinel text");
  check(successRecords.length === 1, "character success path writes exactly one success usage record");
  check(successRecords[0]?.outcome === "SUCCESS", "success usage record outcome is SUCCESS");
  check(successRecords[0]?.callKind === "CHARACTER", "success usage record call kind is CHARACTER");
  check(successRecords[0]?.inputTokens === 212, "success usage record floors input token count");
  check(successRecords[0]?.outputTokens === 57, "success usage record floors output token count");
  checkNoSentinel(successRecords, "success usage record excludes provider body and private sentinel text");

  const narratorResult = await runTheaterRouteBNextTurnProviderContract({
    draft: readyNarratorDraft,
    providerKind: "OPENAI",
    provider: narratorProvider,
    usageLogger,
  });

  check(narratorResult.status === "SUCCESS", "next-turn provider narrator path returns success after usage logging");
  if (narratorResult.status !== "SUCCESS") {
    throw new Error("Expected Route B next-turn narrator provider success result.");
  }
  check(narratorResult.aiUsageLogWritten, "narrator success path marks AiUsageLog written");
  check(narratorResult.usageLogId === "usage_next_turn_success_002", "narrator success path exposes usage log id");
  check(narratorResult.appendCandidate.actorKind === "NARRATOR", "narrator success creates narrator append candidate");
  check(!narratorResult.appendCandidate.speakerRouteBCharacterId, "narrator append candidate has no character speaker");
  check(narratorResult.appendCandidate.requiresAdvisorConfirmation, "narrator append candidate requires advisor confirmation");
  check(!narratorResult.appendCandidate.writesConfirmedCrmFact, "narrator append candidate cannot write confirmed CRM fact");
  checkNoSentinel(narratorResult, "narrator success result excludes provider/private sentinel text");
  check(successRecords.length === 2, "character and narrator success paths write two success usage records");
  check(successRecords[1]?.outcome === "SUCCESS", "narrator usage record outcome is SUCCESS");
  check(successRecords[1]?.callKind === "NARRATOR", "narrator usage record call kind is NARRATOR");

  const errorResult = await runTheaterRouteBNextTurnProviderContract({
    draft: readyPrivateDraft,
    providerKind: "OPENAI",
    provider: failingProvider,
    usageLogger,
  });

  check(errorResult.status === "PROVIDER_ERROR", "next-turn provider error path returns provider error after usage logging");
  if (errorResult.status !== "PROVIDER_ERROR") {
    throw new Error("Expected Route B next-turn provider error result.");
  }
  check(errorResult.providerCallAttempted, "error path marks provider attempted");
  check(errorResult.aiUsageLogWritten, "error path marks AiUsageLog written");
  check(errorResult.usageLogId === "usage_next_turn_error_001", "error path exposes usage log id");
  check(errorResult.errorCode === "PROVIDER_ERROR", "error path sanitizes error code");
  check(!errorResult.generatedTextAllowed, "error path does not allow generated append text");
  check(!errorResult.appendCandidateCreated, "error path does not create append candidate");
  checkNoSentinel(errorResult, "error result excludes raw provider error message");
  check(errorRecords.length === 1, "error path writes exactly one error usage record");
  check(errorRecords[0]?.outcome === "PROVIDER_ERROR", "error usage record outcome is PROVIDER_ERROR");
  check(errorRecords[0]?.errorCode === "PROVIDER_ERROR", "error usage record uses sanitized error code");
  checkNoSentinel(errorRecords, "error usage record excludes provider error message and private sentinel text");

  const blockedResult = await runTheaterRouteBNextTurnProviderContract({
    draft: blockedDraft,
    providerKind: "OPENAI",
    provider: unusedProvider,
    usageLogger,
  });

  check(blockedResult.status === "BLOCKED_DRAFT", "blocked draft returns blocked result");
  if (blockedResult.status !== "BLOCKED_DRAFT") {
    throw new Error("Expected Route B next-turn blocked draft result.");
  }
  check(!blockedResult.providerCallAttempted, "blocked draft does not call provider");
  check(!blockedResult.aiUsageLogWritten, "blocked draft does not fake AiUsageLog");
  check(!blockedResult.generatedTextAllowed, "blocked draft does not allow generated text");
  check(!blockedResult.appendCandidateCreated, "blocked draft does not create append candidate");

  check(
    eventTrail.join(">") ===
      "provider.success.generate>usage.success.write>provider.narrator.generate>usage.success.write>provider.error.generate>usage.error.write",
    "provider attempts are followed by matching success/error usage writes",
    eventTrail.join(">"),
  );

  for (const result of checks) {
    console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
  }

  console.log(
    JSON.stringify(
      {
        successStatus: successResult.status,
        narratorStatus: narratorResult.status,
        errorStatus: errorResult.status,
        blockedStatus: blockedResult.status,
        successUsageLogId: successResult.usageLogId,
        narratorUsageLogId: narratorResult.usageLogId,
        errorUsageLogId: errorResult.usageLogId,
        providerCallAttempted:
          successResult.providerCallAttempted && narratorResult.providerCallAttempted && errorResult.providerCallAttempted,
        aiUsageLogWritten: successResult.aiUsageLogWritten && narratorResult.aiUsageLogWritten && errorResult.aiUsageLogWritten,
        appendCandidateRequiresConfirmation: successResult.appendCandidate.requiresAdvisorConfirmation,
        promptContextObjectionCount: providerInput.promptContext.librarySummary.objectionPromptCount,
        promptContextRedLineCount: providerInput.promptContext.librarySummary.redLineRuleCount,
        promptContextSelectedObjections: providerInput.promptContext.selectedObjections.map((cue) => cue.id),
        promptContextImmediateSevereIds: providerInput.promptContext.promptRules.immediateSevereRedLineIds,
        promptContextPostReviewIds: providerInput.promptContext.promptRules.postReviewRedLineIds,
        blockedProviderCallAttempted: blockedResult.providerCallAttempted,
        writesConfirmedCrmFact: successResult.appendCandidate.writesConfirmedCrmFact,
        rawPrivateTranscriptIncluded: successResult.appendCandidate.rawPrivateTranscriptIncluded,
        eventTrail,
      },
      null,
      2,
    ),
  );
}

function toReadyNarratorDraft(draft: TheaterRouteBNextTurnDraft): TheaterRouteBNextTurnDraft {
  return {
    ...draft,
    nextTurn: {
      role: "NARRATOR",
      visibilityScope: "GROUP",
      rationale: ["旁白補問應只形成待顧問確認的 narrator queue candidate。"],
      draftMode: "PROVIDER_DISABLED_PREVIEW",
      generatedTextAllowed: false,
      contentPreview: "Provider disabled preview only: narrator can suggest a follow-up after usage logging proof.",
    },
    persistenceEnvelope: {
      actorKind: "NARRATOR",
      visibilityScope: "GROUP",
      statePatchCount: 0,
      requiresConfirmation: true,
      writesConfirmedCrmFact: false,
      allowedWriteTargets: ["NARRATOR_QUEUE"],
      provider: draft.persistenceEnvelope.provider,
    },
  };
}

function usageRecord(
  usageLogId: string,
  draft: TheaterRouteBNextTurnUsageLogDraft,
): TheaterRouteBNextTurnUsageLogRecord {
  return {
    ...draft,
    usageLogId,
  };
}

function baseSnapshot(turns: RouteBSessionSnapshot["turns"]): RouteBSessionSnapshot {
  return {
    session: {
      id: "route_b_session_next_turn_provider_dry_run",
      routeBEnabled: true,
      routeBSceneId: "route_b_scene_next_turn_provider",
      routeBSourcePacketId: "route_b_packet_next_turn_provider",
      clientId: "client_next_turn_provider",
      spinSessionId: null,
      status: "ACTIVE",
      isDemo: true,
      createdAt: "2026-06-22T05:37:42.000Z",
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
    createdAt: "2026-06-22T05:37:42.000Z",
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

function check(condition: boolean, label: string, detail?: string) {
  assert.ok(condition, label);
  checks.push({ label, detail });
}

function checkNoSentinel(value: unknown, label: string) {
  const serialized = collectStringValues(value).join("\n");
  check(!serialized.includes("@") && !/09\d{2}/.test(serialized), label);
  check(
    !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp", "payment"].some((sentinel) =>
      serialized.toLowerCase().includes(sentinel.toLowerCase()),
    ),
    label,
  );
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  return Object.values(value).flatMap(collectStringValues);
}
