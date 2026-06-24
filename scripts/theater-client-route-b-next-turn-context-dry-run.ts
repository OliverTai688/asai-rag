import assert from "node:assert/strict";
import type { Client } from "../src/domains/client/types";
import { buildClientRouteBNextTurnContext } from "../src/domains/theater/client-route-b-next-turn-context";

const checks: Array<{ label: string; detail?: string }> = [];

const baseClient: Client = {
  id: "demo_client_route_b_next_turn_context",
  name: "林育誠",
  email: "private.client@example.com",
  phone: "0912-345-678",
  birthDate: "1982-03-04",
  occupation: "半導體廠營運長",
  annualIncome: 5200000,
  family: [
    {
      id: "spouse",
      relation: "配偶",
      name: "陳雅婷",
      age: 42,
      phone: "0988-111-222",
      profile: {
        schemaVersion: "2026-06-24.family-member-profile.v1",
        jobTitle: {
          value: "品牌顧問",
          factStatus: "FACT",
          sourceReferenceIds: ["relationship_graph_note_1"],
        },
        annualIncomeOrDependency: {
          value: "收入區間尚未確認",
          factStatus: "UNKNOWN",
          sourceReferenceIds: ["relationship_graph_note_2"],
        },
        personStatus: {
          value: "共同決策者",
          factStatus: "INFERENCE",
          sourceReferenceIds: ["advisor_observation_1"],
        },
        decisionRole: {
          value: "會一起檢查家庭現金流與月繳壓力",
          factStatus: "INFERENCE",
          sourceReferenceIds: ["relationship_graph_note_3"],
        },
        relationshipContext: {
          value: "會一起討論家庭現金流與教育金安排",
          factStatus: "INFERENCE",
          sourceReferenceIds: ["relationship_graph_note_4"],
        },
        sourceReferences: [
          {
            id: "relationship_graph_note_1",
            type: "relationship_graph",
            label: "關係圖",
            summary: "顧問確認配偶會參與家庭保障討論",
            factStatus: "FACT",
          },
        ],
      },
    },
    {
      id: "mother",
      relation: "母",
      name: "林媽媽",
      age: 70,
      profile: {
        schemaVersion: "2026-06-24.family-member-profile.v1",
        personStatus: {
          value: "長照安排需要釐清",
          factStatus: "UNKNOWN",
          sourceReferenceIds: ["relationship_graph_note_5"],
        },
        sourceReferences: [],
      },
    },
  ],
  existingPolicies: [
    {
      id: "policy-1",
      type: "壽險",
      provider: "誠問測試保險",
      amount: 3000000,
    },
  ],
  tags: ["家庭責任"],
  aiTags: ["教育金缺口", "長照責任待釐清"],
  status: "ACTIVE",
  notes: "raw provider payload token:=secret123 should never appear in theater context",
  complianceChecklist: {
    kycStatus: "PARTIAL",
    suitabilityStatus: "MISSING",
    consentStatus: "COMPLETE",
    missingItems: ["適合度評估"],
    reviewedAt: "2026-06-24T00:00:00.000Z",
  },
  sensitivityLevel: "NORMAL",
  kycStatus: "PARTIAL",
  lastInteraction: "2026-06-24T00:00:00.000Z",
};

const readyContext = buildClientRouteBNextTurnContext({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: baseClient,
  sessionId: "client_route_b_next_turn_source",
  routeBSessionId: "route_b_client_next_turn_preview",
  now: "2026-06-24T00:00:00.000Z",
  advisorTurn: {
    id: "advisor_group_latest",
    content:
      "我想先理解家庭中誰最在意現金流安排，再決定劇場下一位該由誰回應。qa-private@example.com",
    visibilityScope: "GROUP",
  },
});

const blockedContext = buildClientRouteBNextTurnContext({
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  client: {
    ...baseClient,
    id: "demo_client_route_b_next_turn_high_sensitive",
    sensitivityLevel: "HIGHLY_SENSITIVE",
  },
  sessionId: "client_route_b_next_turn_blocked",
  routeBSessionId: "route_b_client_next_turn_blocked",
  now: "2026-06-24T00:00:00.000Z",
  advisorTurn: {
    id: "advisor_blocked_latest",
    content: "請開始演練。",
    visibilityScope: "GROUP",
  },
});

check(readyContext.status === "READY_FOR_PROVIDER_DISABLED_PREVIEW", "ready client reaches provider-disabled next-turn context");
check(readyContext.handoffBridge.status === "READY_FOR_HANDOFF_REVIEW", "ready context keeps handoff review status");
check(Boolean(readyContext.sessionSnapshot), "ready context builds a RouteBSessionSnapshot");
check(readyContext.sessionSnapshot?.session.routeBEnabled === false, "snapshot keeps Route B production disabled");
check(readyContext.sessionSnapshot?.session.provider.callsEnabled === false, "snapshot provider calls disabled");
check(readyContext.nextTurnDraft?.status === "READY", "ready context builds next-turn draft");
check(readyContext.nextTurnDraft?.nextTurn.role === "CHARACTER", "next-turn draft selects a character");
check(readyContext.nextTurnDraft?.nextTurn.generatedTextAllowed === false, "next-turn draft does not generate role text");
check(readyContext.nextTurnDraft?.providerBoundary.providerCallAttempted === false, "next-turn draft does not call provider");
check(readyContext.nextTurnDraft?.providerBoundary.aiUsageLogWritten === false, "next-turn draft does not fake usage log");
check(
  readyContext.nextTurnDraft?.persistenceEnvelope.provider.aiUsageLogRequiredWhenProviderEnabled === true,
  "next-turn draft keeps future AiUsageLog gate",
);
check(
  readyContext.nextTurnDraft?.persistenceEnvelope.writesConfirmedCrmFact === false,
  "next-turn draft cannot write confirmed CRM fact",
);
check(
  readyContext.nextTurnDraft?.inputSummary.familyProfileGrounding.usedInNextTurnRuntime === true,
  "family profile grounding reaches next-turn runtime",
);
check(
  (readyContext.nextTurnDraft?.inputSummary.familyProfileGrounding.profiledMemberCount ?? 0) >= 3,
  "family profile runtime includes focus client and family",
);
check(
  (readyContext.nextTurnDraft?.inputSummary.familyProfileGrounding.unknownFieldCount ?? 0) >= 2,
  "family profile runtime preserves unknown fields",
);
check(
  readyContext.nextTurnDraft?.inputSummary.familyProfileGrounding.boundary.sourceReferenceIdsIncluded === false,
  "family profile runtime excludes source reference ids",
);
check(
  readyContext.nextTurnDraft?.inputSummary.familyProfileGrounding.boundary.rawMetadataIncluded === false,
  "family profile runtime excludes raw metadata",
);
check(
  readyContext.nextTurnDraft?.inputSummary.familyProfileGrounding.boundary.writesRelationshipGraph === false,
  "family profile runtime cannot write relationship graph",
);
check(Boolean(readyContext.providerPromptContext), "ready context builds provider prompt context");
check(
  readyContext.providerPromptContext?.providerBoundary.providerCallAttempted === false,
  "provider prompt context does not call provider",
);
check(
  readyContext.providerPromptContext?.providerBoundary.aiUsageLogWritten === false,
  "provider prompt context does not fake usage log",
);
check(
  readyContext.providerPromptContext?.promptRules.useFamilyProfilesAsRuntimeEvidence === true,
  "provider prompt context uses family profiles as runtime evidence",
);
check(
  readyContext.providerPromptContext?.familyProfileGrounding.usedInNextTurnRuntime === true,
  "provider prompt context carries family profile grounding",
);
check((readyContext.providerPromptContext?.selectedObjections.length ?? 0) > 0, "provider prompt context selects objection cues");
check(readyContext.providerPromptContext?.redLineCues.length === 18, "provider prompt context carries red-line cue library");
check(readyContext.proof.familyProfileGroundingIncluded, "proof marks family grounding included");
check(readyContext.proof.familyProfileGroundingUsedInNextTurn, "proof marks family grounding used in next-turn");
check(readyContext.proof.familyProfileGroundingUsedInProviderPrompt, "proof marks family grounding used in provider prompt");
check(readyContext.proof.providerCallAttempted === false, "proof provider call false");
check(readyContext.proof.databaseWriteAttempted === false, "proof DB write false");
check(readyContext.proof.aiUsageLogWritten === false, "proof AiUsageLog false for no-provider path");
check(readyContext.proof.routeBProductionStartAllowed === false, "proof production start false");
check(readyContext.proof.routeBAppendCandidatePersisted === false, "proof append candidate not persisted");
check(readyContext.proof.writesRelationshipGraph === false, "proof relationship graph write false");
check(readyContext.proof.writesVisitPlan === false, "proof VisitPlan write false");
check(readyContext.proof.writesConfirmedCrmFact === false, "proof confirmed CRM fact write false");

check(blockedContext.status === "BLOCKED_SENSITIVE", "high-sensitive client remains blocked");
check(blockedContext.proof.highSensitiveBlocked, "high-sensitive proof flag remains true");
check(blockedContext.nextTurnDraft === undefined, "high-sensitive context does not build next-turn draft");
check(blockedContext.providerPromptContext === undefined, "high-sensitive context does not build provider prompt context");
check(blockedContext.proof.providerCallAttempted === false, "high-sensitive path does not call provider");
check(blockedContext.proof.databaseWriteAttempted === false, "high-sensitive path does not write DB");
check(blockedContext.proof.writesConfirmedCrmFact === false, "high-sensitive path writes no confirmed CRM fact");

const serialized = collectStringValues([readyContext, blockedContext]).join("\n");

for (const forbidden of [
  "private.client@example.com",
  "qa-private@example.com",
  "0912-345-678",
  "0988-111-222",
  "raw provider payload",
  "token:=secret123",
  "secret123",
  "rawPayload",
  "providerPayload",
  "rawPrivateTranscript",
  "authorization",
  "cookie",
  "otp",
  "payment",
]) {
  check(!serialized.toLowerCase().includes(forbidden.toLowerCase()), `forbidden private/provider sentinel excluded: ${forbidden}`);
}

for (const result of checks) {
  console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
}

console.log(
  JSON.stringify(
    {
      status: readyContext.status,
      handoffStatus: readyContext.handoffBridge.status,
      nextTurnStatus: readyContext.nextTurnDraft?.status,
      selectedSpeaker: readyContext.nextTurnDraft?.nextTurn.speakerRouteBCharacterId,
      selectedObjectionCount: readyContext.providerPromptContext?.selectedObjections.length,
      redLineCueCount: readyContext.providerPromptContext?.redLineCues.length,
      familyProfileRuntimeMemberCount: readyContext.nextTurnDraft?.inputSummary.familyProfileGrounding.profiledMemberCount,
      familyProfileRuntimeUnknownCount: readyContext.nextTurnDraft?.inputSummary.familyProfileGrounding.unknownFieldCount,
      familyProfileUsedInProviderPrompt: readyContext.proof.familyProfileGroundingUsedInProviderPrompt,
      providerCallAttempted: readyContext.proof.providerCallAttempted,
      databaseWriteAttempted: readyContext.proof.databaseWriteAttempted,
      aiUsageLogWritten: readyContext.proof.aiUsageLogWritten,
      writesConfirmedCrmFact: readyContext.proof.writesConfirmedCrmFact,
      highSensitiveStatus: blockedContext.status,
      highSensitiveNextTurnBuilt: Boolean(blockedContext.nextTurnDraft),
    },
    null,
    2,
  ),
);

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
