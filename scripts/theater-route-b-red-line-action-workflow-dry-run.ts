import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildRouteBSevereRedLineActionWorkflow,
  ROUTE_B_RED_LINE_ACTION_STATES,
  summarizeRouteBRedLineActionWorkflow,
  type RouteBSevereRedLineActionWorkflow,
} from "../src/domains/theater/route-b-red-line-action-workflow";
import { buildRouteBProviderPromptContext } from "../src/domains/theater/route-b-provider-prompt-context";
import { buildRouteBSevereRedLineWarningPreview } from "../src/domains/theater/route-b-severe-red-line-preview";

const checks: string[] = [];
const expectedStates = ["WATCHING", "EVIDENCE_NEEDED", "NOT_APPLICABLE", "ESCALATE"] as const;
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
const workflow = buildRouteBSevereRedLineActionWorkflow(preview);
const summary = summarizeRouteBRedLineActionWorkflow(workflow);

check(workflow.agentId === "asai.theater.route_b", "workflow keeps Route B agent id");
check(workflow.actionId === "route-b-severe-red-line-action-workflow", "workflow declares action workflow id");
check(workflow.registryReadiness === "internal-only", "workflow remains internal-only");
check(workflow.sourceActionId === "route-b-severe-red-line-warning-preview", "workflow consumes severe warning preview");
check(workflow.actionCount === 5, "workflow exposes five action cards");
check(workflow.cards.length === workflow.actionCount, "workflow card count matches actionCount");
check(sameIds(workflow.cards.map((card) => card.ruleId), expectedSevereIds), "workflow card ids match accepted severe five");
check(sameIds([...ROUTE_B_RED_LINE_ACTION_STATES], expectedStates), "workflow state constants match expected states");
check(workflow.cards.every((card) => sameIds(card.allowedStates, expectedStates)), "every card allows all action states");
check(workflow.cards.every((card) => sameIds(card.options.map((option) => option.state), expectedStates)), "every card exposes all state options");
check(workflow.cards.every((card) => card.defaultState === "WATCHING"), "every card starts in WATCHING state");
check(workflow.cards.every((card) => card.severity === "SEVERE"), "all workflow cards are severe");
check(workflow.cards.every((card) => card.detectionMode === "IMMEDIATE"), "all workflow cards are immediate");
check(workflow.cards.every((card) => card.triggerSignals.length > 0), "workflow cards preserve trigger signals");
check(workflow.cards.every((card) => card.evidencePolicy === "requires-evidence-or-mark-not-applicable"), "workflow keeps evidence-or-not-applicable policy");
check(workflow.cards.every((card) => !card.guardEvidence.legalAdviceIncluded), "workflow includes no legal advice");
check(workflow.cards.every((card) => !card.guardEvidence.writesConfirmedCrmFact), "workflow cannot write confirmed CRM facts");
check(workflow.cards.every((card) => !card.guardEvidence.autoBlockConversation), "workflow cannot auto-block conversation");
check(workflow.cards.every((card) => !card.guardEvidence.formalFindingWithoutEvidence), "workflow cannot create formal finding without evidence");
check(workflow.workflowBoundary.advisorVisibleOnly, "workflow is advisor-visible only");
check(workflow.workflowBoundary.noLegalAdvice, "workflow forbids legal advice");
check(workflow.workflowBoundary.noFormalFindingWithoutEvidence, "workflow forbids formal finding without evidence");
check(workflow.workflowBoundary.noAutoBlock, "workflow forbids auto-blocking");
check(workflow.workflowBoundary.notApplicableKeepsAuditRecord, "workflow keeps audit posture when marked not applicable");
check(workflow.persistenceEnvelope.currentPersistence === "owner-scoped-scene-state", "workflow persists action state under owner-scoped sceneState");
check(workflow.persistenceEnvelope.ownerScopedSessionOnly, "workflow persistence stays owner-scoped");
check(
  sameIds(workflow.persistenceEnvelope.dbPersistenceAllowedFields, ["ruleId", "state", "advisorReasonCode", "updatedAt"]),
  "workflow DB persistence allowlist is action-state only",
);
check(!workflow.persistenceEnvelope.rawPrivateTranscriptAllowed, "workflow forbids raw private transcript persistence");
check(!workflow.persistenceEnvelope.rawProviderPayloadAllowed, "workflow forbids raw provider payload persistence");
check(!workflow.persistenceEnvelope.directPrivateDialogAllowed, "workflow forbids direct private dialog persistence");
check(!workflow.persistenceEnvelope.writesConfirmedCrmFact, "workflow persistence cannot write confirmed CRM facts");
check(!workflow.persistenceEnvelope.triggersExternalNotification, "workflow does not trigger real notification");
check(!workflow.providerBoundary.providerCallAttempted, "workflow does not call provider");
check(!workflow.providerBoundary.aiUsageLogWritten, "workflow does not fake AiUsageLog");
check(workflow.providerBoundary.successErrorAiUsageLogRequiredBeforeProviderEnablement, "workflow preserves provider usage-log requirement");
check(summary.noProvider, "summary proves no provider");
check(summary.noFakeUsageLog, "summary proves no fake usage log");
check(summary.noConfirmedCrmFact, "summary proves no confirmed CRM fact write");
check(summary.noExternalNotification, "summary proves no real notification");
checkNoSensitiveSentinel(workflow, "workflow excludes sensitive sentinel values");
checkUiContract();
checkManifestContract();

for (const label of checks) {
  console.log(`PASS ${label}`);
}

console.log(
  JSON.stringify(
    {
      actionId: workflow.actionId,
      sourceActionId: workflow.sourceActionId,
      actionCount: workflow.actionCount,
      states: ROUTE_B_RED_LINE_ACTION_STATES,
      providerCallAttempted: workflow.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: workflow.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: workflow.persistenceEnvelope.writesConfirmedCrmFact,
      triggersExternalNotification: workflow.persistenceEnvelope.triggersExternalNotification,
    },
    null,
    2,
  ),
);

function check(condition: boolean, label: string) {
  assert.equal(condition, true, label);
  checks.push(label);
}

function sameIds(actual: readonly string[], expected: readonly string[]) {
  return actual.length === expected.length && expected.every((id) => actual.includes(id));
}

function checkNoSensitiveSentinel(value: RouteBSevereRedLineActionWorkflow, label: string) {
  const serialized = JSON.stringify(value);
  check(!/qa-private@example\.com/i.test(serialized), label);
  check(!/0912[-\s]?345[-\s]?678/.test(serialized), label);
  check(!/\b(authorization|cookie|secret|token|otp|payment|policyNumber)\b/i.test(serialized), label);
}

function checkUiContract() {
  const pageSource = readFileSync(resolve("src/app/(dashboard)/theater/[sessionId]/page.tsx"), "utf8");

  check(pageSource.includes("buildRouteBSevereRedLineActionWorkflow"), "session UI imports red-line action workflow builder");
  check(pageSource.includes("ROUTE_B_SEVERE_RED_LINE_ACTION_WORKFLOW"), "session UI builds static red-line action workflow");
  check(pageSource.includes("RouteBSevereRedLineWarningPanel"), "session UI renders red-line action panel");
  check(pageSource.includes("actionWorkflow"), "session UI passes action workflow to panel");
  check(pageSource.includes("Action state"), "session UI renders action state");
  check(pageSource.includes("requiresAdvisorReasonCode"), "session UI renders advisor reason-code requirement");
  check(pageSource.includes("requiresEvidenceReference"), "session UI renders evidence-reference requirement");
  check(pageSource.includes("aria-pressed"), "session UI exposes selected action state to assistive tech");
  check(pageSource.includes("currentPersistence"), "session UI renders action-state persistence boundary");
  check(pageSource.includes("/red-line-actions"), "session UI can persist red-line action state");
}

function checkManifestContract() {
  const manifestSource = readFileSync(resolve("src/domains/ai-protocol/manifest.ts"), "utf8");
  const registryQaSource = readFileSync(resolve("scripts/ai-protocol-registry-qa.ts"), "utf8");
  const packageSource = readFileSync(resolve("package.json"), "utf8");

  check(manifestSource.includes("route-b-severe-red-line-action-workflow"), "manifest declares action workflow capability");
  check(manifestSource.includes("RouteBSevereRedLineActionWorkflow"), "manifest references action workflow DTO");
  check(manifestSource.includes("RouteBRedLineActionState.EVIDENCE_NEEDED"), "manifest references evidence-needed state");
  check(manifestSource.includes("RouteBRedLineActionState.NOT_APPLICABLE"), "manifest references not-applicable state");
  check(manifestSource.includes("RouteBRedLineActionState.ESCALATE"), "manifest references escalate state");
  check(manifestSource.includes("pnpm theater:route-b-red-line-action-workflow-dry-run"), "manifest declares action workflow proof command");
  check(manifestSource.includes("route-b-severe-red-line-action-persistence"), "manifest declares action persistence capability");
  check(registryQaSource.includes("route-b-severe-red-line-action-workflow"), "registry QA requires action workflow capability");
  check(registryQaSource.includes("RouteBSevereRedLineActionWorkflow"), "registry QA requires action workflow DTO");
  check(registryQaSource.includes("pnpm theater:route-b-red-line-action-workflow-dry-run"), "registry QA requires action workflow command");
  check(packageSource.includes("theater:route-b-red-line-action-workflow-dry-run"), "package exposes action workflow dry-run command");
}
