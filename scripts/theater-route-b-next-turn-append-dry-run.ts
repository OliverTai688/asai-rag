import assert from "node:assert/strict";
import {
  buildTheaterRouteBNextTurnAppendConfirmation,
  type TheaterRouteBNextTurnAppendCandidate,
} from "../src/domains/theater/route-b-next-turn-append";

const checks: string[] = [];
const availableRouteBCharacterIds = ["character_focus_lin", "character_spouse", "character_partner"];

const safeCharacterCandidate: TheaterRouteBNextTurnAppendCandidate = {
  actorKind: "CHARACTER",
  speakerRouteBCharacterId: "character_spouse",
  addresseeRouteBCharacterId: "character_spouse",
  visibilityScope: "PRIVATE",
  content: "我會先確認月繳預算，再請顧問補一個選項比較。providerPayload token 0912-345-678 should be removed.",
  statePatchCount: 2,
  generatedTextAllowed: true,
  requiresAdvisorConfirmation: true,
  writesConfirmedCrmFact: false,
  storesRawProviderPayload: false,
  rawPrivateTranscriptIncluded: false,
};

const safeNarratorCandidate: TheaterRouteBNextTurnAppendCandidate = {
  actorKind: "NARRATOR",
  visibilityScope: "GROUP",
  content: "旁白提醒：先把現金流底線問清楚，再回到家庭保障排序。",
  statePatchCount: 0,
  generatedTextAllowed: true,
  requiresAdvisorConfirmation: true,
  writesConfirmedCrmFact: false,
  storesRawProviderPayload: false,
  rawPrivateTranscriptIncluded: false,
};

const characterConfirmation = buildTheaterRouteBNextTurnAppendConfirmation({
  availableRouteBCharacterIds,
  input: {
    usageLogId: "usage_next_turn_success_001",
    confirmedByAdvisor: true,
    confirmationReason: "顧問確認角色回覆安全且可寫入舞台。",
    candidate: safeCharacterCandidate,
  },
});

check(characterConfirmation.status === "READY", "character append confirmation is ready");
if (characterConfirmation.status !== "READY") {
  throw new Error("Expected character append confirmation to be ready.");
}
check(characterConfirmation.actionId === "route-b-next-turn-append-confirmation", "append confirmation action id is explicit");
check(characterConfirmation.usageLogId === "usage_next_turn_success_001", "append confirmation preserves usage log id");
check(characterConfirmation.actorKind === "CHARACTER", "append confirmation preserves character actor kind");
check(characterConfirmation.speakerRouteBCharacterId === "character_spouse", "append confirmation preserves speaker");
check(characterConfirmation.addresseeRouteBCharacterId === "character_spouse", "append confirmation preserves private addressee");
check(characterConfirmation.visibilityScope === "PRIVATE", "append confirmation preserves private visibility");
check(characterConfirmation.metadata.confirmedByAdvisor, "append confirmation requires advisor confirmation");
check(characterConfirmation.metadata.noProviderCallInAppend, "append confirmation itself makes no provider call");
check(characterConfirmation.metadata.providerCallAttemptedInAppend === false, "append confirmation records no provider attempt in append path");
check(characterConfirmation.metadata.statePatchCount === 2, "append confirmation keeps provider state patch count as metadata only");
check(!characterConfirmation.metadata.writesConfirmedCrmFact, "append confirmation cannot write confirmed CRM fact");
check(!characterConfirmation.metadata.storesRawProviderPayload, "append confirmation forbids raw provider payload");
check(!characterConfirmation.metadata.rawPrivateTranscriptIncluded, "append confirmation excludes raw private transcript");
checkNoSentinel(characterConfirmation, "character append confirmation sanitizes candidate content");

const narratorConfirmation = buildTheaterRouteBNextTurnAppendConfirmation({
  availableRouteBCharacterIds,
  input: {
    usageLogId: "usage_next_turn_success_002",
    confirmedByAdvisor: true,
    candidate: safeNarratorCandidate,
  },
});

check(narratorConfirmation.status === "READY", "narrator append confirmation is ready");
if (narratorConfirmation.status !== "READY") {
  throw new Error("Expected narrator append confirmation to be ready.");
}
check(narratorConfirmation.actorKind === "NARRATOR", "narrator append keeps narrator actor kind");
check(narratorConfirmation.visibilityScope === "GROUP", "narrator append stays group scoped");
check(!narratorConfirmation.speakerRouteBCharacterId, "narrator append has no character speaker");
check(!narratorConfirmation.addresseeRouteBCharacterId, "narrator append has no private addressee");

const rejectionCases = [
  {
    label: "missing advisor confirmation is rejected",
    expected: "ADVISOR_CONFIRMATION_REQUIRED",
    input: {
      usageLogId: "usage_next_turn_success_003",
      confirmedByAdvisor: false,
      candidate: safeCharacterCandidate,
    },
  },
  {
    label: "missing safe usage log id is rejected",
    expected: "USAGE_LOG_REQUIRED",
    input: {
      usageLogId: "token",
      confirmedByAdvisor: true,
      candidate: safeCharacterCandidate,
    },
  },
  {
    label: "unsafe candidate safety flag is rejected",
    expected: "INVALID_APPEND_CANDIDATE",
    input: {
      usageLogId: "usage_next_turn_success_004",
      confirmedByAdvisor: true,
      candidate: {
        ...safeCharacterCandidate,
        storesRawProviderPayload: true as false,
      },
    },
  },
  {
    label: "unknown character speaker is rejected",
    expected: "INVALID_CHARACTER_SPEAKER",
    input: {
      usageLogId: "usage_next_turn_success_005",
      confirmedByAdvisor: true,
      candidate: {
        ...safeCharacterCandidate,
        speakerRouteBCharacterId: "foreign_character",
      },
    },
  },
  {
    label: "private candidate without addressee is rejected",
    expected: "INVALID_PRIVATE_ADDRESSEE",
    input: {
      usageLogId: "usage_next_turn_success_006",
      confirmedByAdvisor: true,
      candidate: {
        ...safeCharacterCandidate,
        addresseeRouteBCharacterId: undefined,
      },
    },
  },
  {
    label: "narrator private scope is rejected",
    expected: "NARRATOR_SCOPE_INVALID",
    input: {
      usageLogId: "usage_next_turn_success_007",
      confirmedByAdvisor: true,
      candidate: {
        ...safeNarratorCandidate,
        visibilityScope: "PRIVATE",
        addresseeRouteBCharacterId: "character_spouse",
      } as TheaterRouteBNextTurnAppendCandidate,
    },
  },
] as const;

for (const testCase of rejectionCases) {
  const result = buildTheaterRouteBNextTurnAppendConfirmation({
    availableRouteBCharacterIds,
    input: testCase.input,
  });
  check(result.status === "REJECTED", testCase.label);
  if (result.status !== "REJECTED") {
    throw new Error(`Expected rejection for ${testCase.label}`);
  }
  check(result.errorCode === testCase.expected, `${testCase.label} uses expected error code`);
}

for (const result of checks) {
  console.log(`PASS ${result}`);
}

console.log(
  JSON.stringify(
    {
      characterStatus: characterConfirmation.status,
      narratorStatus: narratorConfirmation.status,
      appendActionId: characterConfirmation.actionId,
      usageLogIdRequired: characterConfirmation.privacyProof.usageLogIdRequired,
      confirmedByAdvisor: characterConfirmation.privacyProof.confirmedByAdvisor,
      noProviderCallInAppend: characterConfirmation.privacyProof.noProviderCallInAppend,
      writesConfirmedCrmFact: characterConfirmation.privacyProof.writesConfirmedCrmFact,
      storesRawProviderPayload: characterConfirmation.privacyProof.storesRawProviderPayload,
      rawPrivateTranscriptIncluded: characterConfirmation.privacyProof.rawPrivateTranscriptIncluded,
      rejectionCount: rejectionCases.length,
    },
    null,
    2,
  ),
);

function check(condition: boolean, label: string) {
  assert.ok(condition, label);
  checks.push(label);
}

function checkNoSentinel(value: unknown, label: string) {
  const serialized = collectStringValues(value).join("\n");
  check(
    !serialized.includes("@") &&
      !/09\d{2}/.test(serialized) &&
      !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp", "payment"].some((key) =>
        serialized.toLowerCase().includes(key.toLowerCase()),
      ),
    label,
  );
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
}
