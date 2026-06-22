import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildRouteBProviderPromptContext } from "../src/domains/theater/route-b-provider-prompt-context";
import {
  buildRouteBSevereRedLineWarningPreview,
  type RouteBSevereRedLineWarningPreview,
} from "../src/domains/theater/route-b-severe-red-line-preview";

const checks: string[] = [];
const expectedSevereIds = [
  "SIGNATURE_SUBSTITUTION",
  "PREMIUM_ADVANCE",
  "GUARANTEED_RETURN",
  "UNLICENSED_FUNDRAISING",
  "PRODUCT_BEFORE_KYC",
] as const;

const context = buildRouteBProviderPromptContext({
  role: "DECISION_MAKER",
  personaHints: ["家人共同決策", "保費負擔", "隱私敏感"],
  unknowns: ["尚未確認 KYC 完整度", "尚未確認是否有共同決策者"],
});
const preview = buildRouteBSevereRedLineWarningPreview(context);

check(preview.agentId === "asai.theater.route_b", "preview keeps Route B agent id");
check(preview.actionId === "route-b-severe-red-line-warning-preview", "preview declares severe red-line warning action");
check(preview.registryReadiness === "internal-only", "preview remains internal-only");
check(preview.sourceActionId === "route-b-provider-prompt-context", "preview is sourced from provider prompt context");
check(preview.warningCount === 5, "preview exposes five severe immediate red-line warnings");
check(preview.warnings.length === 5, "warning list length matches warningCount");
check(
  sameIds(preview.warnings.map((warning) => warning.id), expectedSevereIds),
  "preview warning ids match accepted severe five",
);
check(preview.warnings.every((warning) => warning.severity === "SEVERE"), "all preview warnings are severe");
check(preview.warnings.every((warning) => warning.detectionMode === "IMMEDIATE"), "all preview warnings are immediate");
check(preview.warnings.every((warning) => warning.status === "WATCHLIST_ONLY"), "preview warnings stay watchlist-only");
check(preview.warnings.every((warning) => warning.triggerSignals.length > 0), "preview warnings carry trigger signals");
check(preview.warnings.every((warning) => warning.evidencePolicy === "requires-evidence-or-mark-not-applicable"), "preview requires evidence or not-applicable");
check(preview.warnings.every((warning) => warning.falsePositiveHandling === "can-mark-not-applicable-but-keep-audit-record"), "preview keeps audit record for not-applicable handling");
check(preview.warnings.every((warning) => !warning.legalAdviceIncluded), "preview includes no legal advice");
check(preview.warnings.every((warning) => !warning.writesConfirmedCrmFact), "preview cannot write confirmed CRM facts");
check(preview.displayRules.showAsAdvisorWarningOnly, "display rules mark advisor warning only");
check(preview.displayRules.doNotBlockConversationAutomatically, "display rules do not auto-block conversation");
check(preview.displayRules.doNotProvideLegalAdvice, "display rules forbid legal advice");
check(preview.displayRules.doNotTreatAsComplianceFindingWithoutEvidence, "display rules require evidence before formal finding");
check(preview.displayRules.allowMarkNotApplicableButKeepAuditRecord, "display rules keep not-applicable audit posture");
check(!preview.providerBoundary.providerCallAttempted, "preview does not call provider");
check(!preview.providerBoundary.aiUsageLogWritten, "preview does not fake AiUsageLog");
check(preview.providerBoundary.successErrorAiUsageLogRequiredBeforeProviderEnablement, "live provider enablement still requires success/error usage logs");
check(!preview.providerBoundary.storesRawProviderPayload, "preview does not store provider payload");
check(!preview.privacyBoundary.rawPrivateTranscriptAllowed, "preview forbids raw private transcript");
check(!preview.privacyBoundary.directPrivateDialogAllowed, "preview forbids direct private dialog");
check(!preview.privacyBoundary.warningPreviewStoresTranscript, "preview stores no transcript");
check(!preview.privacyBoundary.warningPreviewWritesClientData, "preview writes no client data");
checkNoSensitiveSentinel(preview, "preview excludes sensitive sentinel values");
checkUiContract(preview);

for (const label of checks) {
  console.log(`PASS ${label}`);
}

console.log(
  JSON.stringify(
    {
      actionId: preview.actionId,
      sourceActionId: preview.sourceActionId,
      warningCount: preview.warningCount,
      warningIds: preview.warnings.map((warning) => warning.id),
      providerCallAttempted: preview.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: preview.providerBoundary.aiUsageLogWritten,
      legalAdviceIncluded: preview.warnings.some((warning) => warning.legalAdviceIncluded),
      writesConfirmedCrmFact: preview.warnings.some((warning) => warning.writesConfirmedCrmFact),
    },
    null,
    2,
  ),
);

function check(condition: boolean, label: string) {
  assert.equal(condition, true, label);
  checks.push(label);
}

function sameIds(actual: string[], expected: readonly string[]) {
  return actual.length === expected.length && expected.every((id) => actual.includes(id));
}

function checkNoSensitiveSentinel(value: RouteBSevereRedLineWarningPreview, label: string) {
  const serialized = JSON.stringify(value);
  check(!/qa-private@example\.com/i.test(serialized), label);
  check(!/0912[-\s]?345[-\s]?678/.test(serialized), label);
  check(!/\b(authorization|cookie|secret|token|otp|payment|policyNumber)\b/i.test(serialized), label);
}

function checkUiContract(preview: RouteBSevereRedLineWarningPreview) {
  const pagePath = resolve("src/app/(dashboard)/theater/[sessionId]/page.tsx");
  const source = readFileSync(pagePath, "utf8");

  check(source.includes("buildRouteBSevereRedLineWarningPreview"), "session UI imports severe red-line preview builder");
  check(source.includes("ROUTE_B_SEVERE_RED_LINE_WARNING_PREVIEW"), "session UI builds static severe red-line warning preview");
  check(source.includes("RouteBSevereRedLineWarningPanel"), "session UI renders severe red-line warning panel");
  check(source.includes("守門紅線"), "session UI names the advisor-facing guard panel");
  check(source.includes("只提醒顧問觀察"), "session UI explains watchlist-only posture");
  check(source.includes("不提供法律意見"), "session UI states no legal advice");
  check(source.includes("不寫 CRM confirmed fact"), "session UI states no confirmed CRM fact write");
  check(source.includes("warning.status"), "session UI renders watchlist status");
  check(source.includes("warning.evidencePolicy"), "session UI renders evidence policy");
  check(source.includes("warningPreview.providerBoundary.providerCallAttempted"), "session UI renders provider boundary");
  check(source.includes("warningPreview.providerBoundary.aiUsageLogWritten"), "session UI renders AiUsageLog boundary");
  for (const warningId of preview.warnings.map((warning) => warning.id)) {
    check(preview.warnings.some((warning) => warning.id === warningId), `preview includes ${warningId}`);
  }
}
