import assert from "node:assert/strict";
import { buildTheaterRouteBFeedbackContract } from "../src/domains/theater/route-b-feedback";
import {
  buildTheaterRouteBFeedbackProviderInput,
  runTheaterRouteBFeedbackProviderContract,
  type TheaterRouteBFeedbackProviderAdapter,
  type TheaterRouteBFeedbackProviderInput,
  type TheaterRouteBFeedbackUsageLogDraft,
  type TheaterRouteBFeedbackUsageLogRecord,
  type TheaterRouteBFeedbackUsageLogger,
} from "../src/domains/theater/route-b-feedback-provider";
import type {
  TheaterRouteBHandoffPacket,
  TheaterRouteBMaterial,
  TheaterRouteBTurnRef,
} from "../src/domains/theater/route-b-handoff";

const checks: Array<{ label: string; detail?: string }> = [];
const eventTrail: string[] = [];
const successRecords: TheaterRouteBFeedbackUsageLogRecord[] = [];
const errorRecords: TheaterRouteBFeedbackUsageLogRecord[] = [];

const handoff = buildHandoffFixture();
const history: TheaterRouteBTurnRef[] = [
  {
    id: "turn_group",
    speakerCharacterId: "character_focus",
    visibilityScope: "GROUP",
    content: "我想先知道是不是必要。qa-private@example.com 0912-345-678 should not leak.",
  },
  {
    id: "turn_private",
    speakerCharacterId: "character_spouse",
    addresseeCharacterId: "character_focus",
    visibilityScope: "PRIVATE",
    content: "private lane rawPayload token should not leak.",
  },
];
const contract = buildTheaterRouteBFeedbackContract({ handoff, history });
const providerInput = buildTheaterRouteBFeedbackProviderInput(contract);

check(providerInput.agentId === "asai.theater.route_b", "provider input keeps Route B agent id");
check(providerInput.actionId === "route-b-feedback-provider", "provider input declares feedback provider action");
check(providerInput.registryReadiness === "internal-only", "provider input remains internal-only");
check(providerInput.selectedPerspectives.length === 5, "provider input carries all five default perspectives");
check(providerInput.outputRules.qualitativeOnly, "provider input requires qualitative-only output");
check(!providerInput.outputRules.totalScoreAllowed, "provider input forbids total score");
check(!providerInput.outputRules.rankingAllowed, "provider input forbids ranking");
check(providerInput.outputRules.requiresEvidenceBasis, "provider input requires evidence basis");
check(providerInput.promptContext.actionId === "route-b-provider-prompt-context", "provider input carries prompt context action");
check(providerInput.promptContext.librarySummary.objectionPromptCount === 12, "provider input prompt context references 12 objections");
check(providerInput.promptContext.librarySummary.redLineRuleCount === 18, "provider input prompt context references 18 red lines");
check(providerInput.promptContext.selectedObjections.length === 5, "provider input prompt context selects bounded objections");
check(providerInput.promptContext.redLineCues.length === 18, "provider input prompt context carries all red-line cues");
check(providerInput.promptContext.promptRules.immediateSevereRedLineIds.length === 5, "provider input prompt context keeps five immediate severe red lines");
check(providerInput.promptContext.promptRules.postReviewRedLineIds.length === 13, "provider input prompt context keeps thirteen post-review red lines");
check(providerInput.promptContext.promptRules.doNotTreatObjectionsAsConfirmedCrmFacts, "provider input prompt context prevents confirmed CRM fact writes");
check(providerInput.promptContext.promptRules.doNotProvideLegalAdvice, "provider input prompt context forbids legal advice posture");
check(!providerInput.promptContext.providerBoundary.providerCallAttempted, "prompt context itself does not call provider");
check(!providerInput.promptContext.providerBoundary.aiUsageLogWritten, "prompt context itself does not fake AiUsageLog");
check(providerInput.promptContext.providerBoundary.successErrorAiUsageLogRequiredBeforeProviderEnablement, "prompt context keeps success/error AiUsageLog enablement gate");
check(providerInput.redLineReview.severeSignals.length === 5, "provider input carries severe red-line review labels");
check(providerInput.redLineReview.allRules.length === 18, "provider input carries all red-line review rules");
check(providerInput.redLineReview.allRules.every((rule) => !rule.legalAdviceIncluded), "red-line review all-rules contain no legal advice");
check(providerInput.redLineReview.allRules.every((rule) => !rule.writesConfirmedCrmFact), "red-line review all-rules cannot write confirmed CRM facts");
check(!providerInput.redLineReview.legalAdviceIncluded, "provider input does not include legal advice claim");
check(providerInput.privacyBoundary.usesInputPreviewOnly, "provider input uses only preview counts and labels");
check(!providerInput.privacyBoundary.includesTurnText, "provider input excludes turn text");
check(!providerInput.privacyBoundary.includesPrivateLaneContent, "provider input excludes private lane content");
check(!providerInput.privacyBoundary.storesProviderBody, "provider input forbids provider body storage");
checkNoSentinel(providerInput, "provider input excludes private/provider sentinel text");

const fakeProvider: TheaterRouteBFeedbackProviderAdapter = {
  async generate(input: TheaterRouteBFeedbackProviderInput) {
    eventTrail.push("provider.success.generate");
    assert.equal(input.outputRules.totalScoreAllowed, false);
    assert.equal(input.promptContext.redLineCues.length, 18);
    assert.equal(input.redLineReview.allRules.length, 18);
    return {
      model: "gpt-test-route-b-feedback",
      tokenUsage: { inputTokens: 321.8, outputTokens: 88.2 },
      feedback: {
        sections: input.selectedPerspectives.map((perspective) => ({
          perspectiveId: perspective.id,
          label: perspective.label,
          observation: `${perspective.label} observation`,
          evidenceBasis: "Visibility and material counts only.",
          advisorMove: "Ask one focused follow-up question.",
          riskOrUnknown: "Mark unknowns before recommending a product.",
        })),
        redLineFindings: input.redLineReview.allRules.map((rule) => ({
          redLineId: rule.id,
          label: rule.label,
          status: "NOT_APPLICABLE",
          evidenceBasis: "No matching summary signal in preview.",
        })),
      },
    };
  },
};

const failingProvider: TheaterRouteBFeedbackProviderAdapter = {
  async generate() {
    eventTrail.push("provider.error.generate");
    throw new Error("simulated provider outage with rawPayload sentinel");
  },
};

const usageLogger: TheaterRouteBFeedbackUsageLogger = {
  async writeSuccess(draft: TheaterRouteBFeedbackUsageLogDraft) {
    eventTrail.push("usage.success.write");
    const record = usageRecord("usage_success_001", draft);
    successRecords.push(record);
    return record;
  },
  async writeError(draft: TheaterRouteBFeedbackUsageLogDraft) {
    eventTrail.push("usage.error.write");
    const record = usageRecord("usage_error_001", draft);
    errorRecords.push(record);
    return record;
  },
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const successResult = await runTheaterRouteBFeedbackProviderContract({
    contract,
    providerKind: "OPENAI",
    provider: fakeProvider,
    usageLogger,
  });

  check(successResult.status === "SUCCESS", "provider success path returns success after usage logging");
  if (successResult.status !== "SUCCESS") {
    throw new Error("Expected Route B feedback provider success result.");
  }
  check(successResult.providerCallAttempted, "provider success path marks provider attempted");
  check(successResult.aiUsageLogWritten, "provider success path marks AiUsageLog written");
  check(successResult.usageLogId === "usage_success_001", "provider success path exposes usage log id");
  check(successResult.storesProviderBody === false, "provider success path does not store provider body");
  check(successResult.feedback.redLineFindings.length === 18, "provider success path can return all 18 red-line findings");
  check(successRecords.length === 1, "provider success path writes exactly one success usage record");
  check(successRecords[0]?.outcome === "SUCCESS", "success usage record outcome is SUCCESS");
  check(successRecords[0]?.inputTokens === 321, "success usage record floors input token count");
  check(successRecords[0]?.outputTokens === 88, "success usage record floors output token count");
  checkNoSentinel(successRecords, "success usage record excludes provider body and private sentinel text");

  const errorResult = await runTheaterRouteBFeedbackProviderContract({
    contract,
    providerKind: "OPENAI",
    provider: failingProvider,
    usageLogger,
  });

  check(errorResult.status === "PROVIDER_ERROR", "provider error path returns provider error after usage logging");
  if (errorResult.status !== "PROVIDER_ERROR") {
    throw new Error("Expected Route B feedback provider error result.");
  }
  check(errorResult.providerCallAttempted, "provider error path marks provider attempted");
  check(errorResult.aiUsageLogWritten, "provider error path marks AiUsageLog written");
  check(errorResult.usageLogId === "usage_error_001", "provider error path exposes usage log id");
  check(errorResult.errorCode === "PROVIDER_ERROR", "provider error path sanitizes error code");
  check(errorResult.storesProviderBody === false, "provider error path does not store provider body");
  check(errorRecords.length === 1, "provider error path writes exactly one error usage record");
  check(errorRecords[0]?.outcome === "PROVIDER_ERROR", "error usage record outcome is PROVIDER_ERROR");
  check(errorRecords[0]?.errorCode === "PROVIDER_ERROR", "error usage record uses sanitized error code");
  checkNoSentinel(errorRecords, "error usage record excludes provider error message and private sentinel text");

  check(
    eventTrail.join(">") === "provider.success.generate>usage.success.write>provider.error.generate>usage.error.write",
    "provider calls are followed by matching success/error usage writes",
    eventTrail.join(">"),
  );

  for (const result of checks) {
    console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
  }

  console.log(
    JSON.stringify(
      {
        successStatus: successResult.status,
        errorStatus: errorResult.status,
        successUsageLogId: successResult.usageLogId,
        errorUsageLogId: errorResult.usageLogId,
        providerCallAttempted: successResult.providerCallAttempted && errorResult.providerCallAttempted,
        aiUsageLogWritten: successResult.aiUsageLogWritten && errorResult.aiUsageLogWritten,
        storesProviderBody: successResult.storesProviderBody || errorResult.storesProviderBody,
        promptContextObjectionCount: providerInput.promptContext.librarySummary.objectionPromptCount,
        promptContextRedLineCount: providerInput.promptContext.librarySummary.redLineRuleCount,
        promptContextSelectedObjections: providerInput.promptContext.selectedObjections.map((cue) => cue.id),
        redLineReviewAllRuleCount: providerInput.redLineReview.allRules.length,
        redLineFindingsCount: successResult.status === "SUCCESS" ? successResult.feedback.redLineFindings.length : 0,
        eventTrail,
      },
      null,
      2,
    ),
  );
}

function usageRecord(
  usageLogId: string,
  draft: TheaterRouteBFeedbackUsageLogDraft,
): TheaterRouteBFeedbackUsageLogRecord {
  return {
    ...draft,
    usageLogId,
  };
}

function buildHandoffFixture(): TheaterRouteBHandoffPacket {
  return {
    id: "route_b_feedback_provider_handoff",
    sourcePacketId: "route_b_feedback_provider_packet",
    scene: {
      id: "route_b_feedback_provider_scene",
      sourcePacketId: "route_b_feedback_provider_packet",
      title: "林先生的家庭保障劇場",
      scenario: "釐清林先生與配偶對家庭保障的共同決策。",
      readiness: "READY",
      characters: [
        {
          id: "character_focus",
          displayName: "林先生",
          role: "FOCUS_CLIENT",
          isFocus: true,
          publicBrief: "科技公司營運長，重視效率。",
          knownFacts: [material("fact_focus_job", "林先生是科技公司營運長。", "CONFIRMED", "BACKGROUND_FACT")],
          personaHints: [{ label: "可能重視效率", factStatus: "INFERENCE", evidenceIds: ["mem_efficiency"] }],
          unknowns: [material("unknown_spouse", "尚未確認配偶是否參與決策。", "UNKNOWN", "NARRATOR_QUESTION")],
          exemplarLines: [],
        },
        {
          id: "character_spouse",
          displayName: "林太太",
          role: "DECISION_MAKER",
          isFocus: false,
          publicBrief: "共同決策者，可能關注現金流。",
          knownFacts: [material("fact_spouse", "林太太會一起討論家庭保障。", "CONFIRMED", "BACKGROUND_FACT")],
          personaHints: [],
          unknowns: [],
          exemplarLines: [],
        },
      ],
      relationships: [
        {
          id: "relation_spouse",
          summary: "林先生與林太太是共同決策關係。",
          factStatus: "CONFIRMED",
          visibilityScope: "GROUP",
          sourceRefs: [{ id: "rel_source", label: "QA fixture", factStatus: "CONFIRMED" }],
        },
      ],
      objections: [material("objection_busy", "太忙，想下次再談。", "INFERENCE", "PERSONA_HINT")],
      narratorQuestions: [material("narrator_spouse", "請確認林太太是否會參與本次拜訪。", "UNKNOWN", "NARRATOR_QUESTION")],
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
      statePatches: [],
    },
    aiUsagePlan: {
      noProviderDuringHandoffBuild: true,
      calls: [
        {
          kind: "FEEDBACK",
          purpose: "產生五視角質化回饋。",
          requiresAiUsageLog: true,
          logOn: "SUCCESS_AND_PROVIDER_ERROR",
          storesRawProviderPayload: false,
        },
      ],
    },
    runtimeActivation: {
      routeBEnabled: true,
      canStartProductionSession: true,
      rollbackNote: "Provider disabled 時只停在 guarded-disabled，不宣稱 production multi-character theater。",
    },
    compatibility: {
      legacyPersonaTypeStrategy: "compatibility-only",
      legacyTensionStrategy: "statePatches only",
      legacyScoreStrategy: "qualitative feedback only",
      migrationBoundary: "feedback provider logging contract proof",
    },
  };
}

function material(
  id: string,
  text: string,
  factStatus: TheaterRouteBMaterial["factStatus"],
  use: TheaterRouteBMaterial["use"],
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
  const forbidden = ["qa-private@example.com", "0912-345-678", "rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp"];
  const hasForbiddenSentinel = forbidden.some((sentinel) => serialized.toLowerCase().includes(sentinel.toLowerCase()));
  check(!hasForbiddenSentinel, label, hasForbiddenSentinel ? serialized : undefined);
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
}
