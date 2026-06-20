import { buildQuickCaptureMemoryBridge } from "../src/domains/interview/quick-capture";

const now = "2026-06-20T15:06:28.007Z";

const serverScope = {
  organizationId: "org_demo",
  memberId: "member_demo",
  unitId: "unit_demo",
  clientId: "client_wang",
  visitPlanId: "visit_plan_demo",
  interviewSessionId: "interview_quick_capture_demo",
};

const linkedConfirmed = buildQuickCaptureMemoryBridge({
  captureId: "capture-confirmed",
  origin: "POST_VISIT_NOTE",
  assignment: "VISIT_PLAN",
  serverScope,
  clientProvidedScope: {
    organizationId: "org_attacker",
    memberId: "member_attacker",
    clientId: "client_attacker",
    visitPlanId: "visit_attacker",
  },
  content: "確認王大明下一次希望先討論退休現金流，而不是立即看商品。",
  createdAt: now,
  issueTags: ["retirement", "visit_follow_up"],
  approval: {
    reason: "QA 確認只建立候選補強，不寫 confirmed CRM fact。",
    riskAccepted: true,
  },
});

const linkedInference = buildQuickCaptureMemoryBridge({
  captureId: "capture-inference",
  origin: "GLOBAL_QUICK_CAPTURE",
  assignment: "CLIENT",
  serverScope,
  content: "太太可能會擔心方案太複雜，需要先用家庭決策語言說明。",
  createdAt: now,
  issueTags: ["relationship_tension", "spouse"],
});

const unknownQuestion = buildQuickCaptureMemoryBridge({
  captureId: "capture-unknown",
  origin: "POST_VISIT_NOTE",
  assignment: "FOLLOW_UP_REVIEW",
  serverScope,
  content: "不確定下一次是否需要邀請女兒一起參與決策。",
  createdAt: now,
  issueTags: ["decision_maker"],
});

const highSensitiveBlocked = buildQuickCaptureMemoryBridge({
  captureId: "capture-sensitive-blocked",
  origin: "POST_VISIT_NOTE",
  assignment: "CLIENT",
  serverScope,
  content: "確認客戶收入與保費壓力需要納入下次討論。",
  createdAt: now,
});

const highSensitivePrivate = buildQuickCaptureMemoryBridge({
  captureId: "capture-sensitive-private",
  origin: "POST_VISIT_NOTE",
  assignment: "PRIVATE_DRAFT",
  serverScope,
  content: "確認客戶收入與保費壓力需要納入下次討論。",
  createdAt: now,
});

const secretBlocked = buildQuickCaptureMemoryBridge({
  captureId: "capture-secret",
  origin: "MEETING_NOTE",
  assignment: "PRIVATE_DRAFT",
  serverScope,
  content: "debug token sk-test-secret should never be stored",
  createdAt: now,
});

const checks: Array<[boolean, string]> = [
  [linkedConfirmed.status === "READY", "linked confirmed quick-capture is ready"],
  [linkedConfirmed.scope.organizationId === serverScope.organizationId, "server organization scope wins over client-provided scope"],
  [linkedConfirmed.scope.clientId === serverScope.clientId, "server client scope wins over client-provided scope"],
  [linkedConfirmed.safety.clientProvidedScopeIgnored, "client-provided scope is explicitly ignored"],
  [linkedConfirmed.memoryCandidates[0]?.dataClass === "CONFIRMED", "confirmed note maps to CONFIRMED memory"],
  [linkedConfirmed.memoryCandidates[0]?.source === "TEXT_INPUT", "manual note source is TEXT_INPUT"],
  [linkedConfirmed.preparationPackageSupplements.length === 1, "confirmed note can supplement preparation package"],
  [linkedConfirmed.crmWritebackCandidates.length === 1, "confirmed linked note becomes CRM writeback candidate only"],
  [linkedConfirmed.crmWritebackCandidates[0]?.writesConfirmedCrmFact === false, "CRM candidate does not write confirmed fact"],
  [linkedInference.memoryCandidates[0]?.dataClass === "INFERENCE", "inference note maps to INFERENCE memory"],
  [linkedInference.crmWritebackCandidates.length === 0, "inference never becomes CRM writeback candidate"],
  [linkedInference.theaterStateProposals[0]?.requiresConfirmation === true, "inference creates confirmable theater state proposal"],
  [linkedInference.theaterStateProposals[0]?.writesConfirmedCrmFact === false, "theater state proposal does not write confirmed CRM fact"],
  [unknownQuestion.memoryCandidates[0]?.dataClass === "UNKNOWN", "unknown note maps to UNKNOWN memory"],
  [unknownQuestion.narratorQuestions.length === 1, "unknown note creates narrator/follow-up question"],
  [highSensitiveBlocked.status === "BLOCKED", "linked high-sensitive note is blocked without reason/riskAccepted"],
  [highSensitiveBlocked.memoryCandidates.length === 0, "blocked high-sensitive note creates no memory candidate"],
  [highSensitivePrivate.status === "READY", "private high-sensitive note is allowed as private draft"],
  [highSensitivePrivate.safety.sensitivity === "HIGHLY_SENSITIVE", "high-sensitive private note is flagged"],
  [secretBlocked.status === "BLOCKED", "secret-like quick-capture note is blocked"],
  [linkedConfirmed.safety.providerCallAttempted === false, "no-provider proof: providerCallAttempted=false"],
  [linkedConfirmed.safety.aiUsageLogRequired === false, "no-provider proof: AiUsageLog not required"],
  [linkedConfirmed.safety.rawAudioStored === false, "raw audio is not stored"],
  [linkedConfirmed.safety.rawPrivateTranscriptStored === false, "raw private transcript is not stored"],
];

const failures = checks.filter(([passed]) => !passed).map(([, label]) => label);

if (failures.length > 0) {
  console.error("interview:quick-capture-bridge-dry-run — failed");
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}

console.log("interview:quick-capture-bridge-dry-run — quick-capture bridge contract passed. ✅");
console.log(
  JSON.stringify(
    {
      confirmedMemoryId: linkedConfirmed.memoryCandidates[0].id,
      inferenceStateProposalCount: linkedInference.theaterStateProposals.length,
      unknownNarratorQuestionCount: unknownQuestion.narratorQuestions.length,
      blockedHighSensitive: highSensitiveBlocked.status,
      privateHighSensitive: highSensitivePrivate.status,
      providerCallAttempted: linkedConfirmed.safety.providerCallAttempted,
      aiUsageLogRequired: linkedConfirmed.safety.aiUsageLogRequired,
    },
    null,
    2,
  ),
);
