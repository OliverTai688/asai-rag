import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildRouteBRedLineActionPersistenceState,
  buildRouteBRedLineActionRecordsFromStateMap,
  buildRouteBSevereRedLineActionWorkflow,
  sanitizeRouteBRedLineActionRecords,
  type RouteBRedLineActionRecord,
} from "../src/domains/theater/route-b-red-line-action-workflow";

const checks: string[] = [];
const workflow = buildRouteBSevereRedLineActionWorkflow();
const updatedAt = "2026-06-22T09:00:00.000Z";
const records = buildRouteBRedLineActionRecordsFromStateMap(
  {
    SIGNATURE_SUBSTITUTION: "EVIDENCE_NEEDED",
    PREMIUM_ADVANCE: "NOT_APPLICABLE",
    GUARANTEED_RETURN: "ESCALATE",
  },
  workflow,
  updatedAt,
);
const state = buildRouteBRedLineActionPersistenceState(records, workflow, updatedAt);
const unsafeRecords = sanitizeRouteBRedLineActionRecords(
  [
    {
      ruleId: "SIGNATURE_SUBSTITUTION",
      state: "ESCALATE",
      advisorReasonCode: "ESCALATION_REQUESTED",
      updatedAt: "not-a-date",
      rawProviderPayload: "must be ignored",
    } as RouteBRedLineActionRecord,
  ],
  workflow,
  updatedAt,
);

check(workflow.persistenceEnvelope.currentPersistence === "owner-scoped-scene-state", "workflow declares owner-scoped sceneState persistence");
check(workflow.persistenceEnvelope.ownerScopedSessionOnly, "workflow persistence is owner-scoped only");
check(workflow.persistenceEnvelope.dbPersistenceAllowedFields.join(",") === "ruleId,state,advisorReasonCode,updatedAt", "workflow DB allowlist is four fields");
check(records.length === 5, "state-map builder returns five severe red-line records");
check(records.every((record) => Object.keys(record).sort().join(",") === "advisorReasonCode,ruleId,state,updatedAt"), "records contain only safe persistence fields");
check(records.find((record) => record.ruleId === "SIGNATURE_SUBSTITUTION")?.advisorReasonCode === "EVIDENCE_PENDING", "evidence-needed state maps to evidence pending reason code");
check(records.find((record) => record.ruleId === "PREMIUM_ADVANCE")?.advisorReasonCode === "FALSE_POSITIVE_CONTEXT", "not-applicable state maps to false-positive reason code");
check(records.find((record) => record.ruleId === "GUARANTEED_RETURN")?.advisorReasonCode === "ESCALATION_REQUESTED", "escalate state maps to escalation reason code");
check(state.actionId === "route-b-severe-red-line-action-persistence", "persistence state declares action id");
check(state.sourceActionId === "route-b-severe-red-line-action-workflow", "persistence state consumes workflow action");
check(state.recordCount === 5, "persistence state records all severe red lines");
check(state.actionSummary.evidenceNeededCount === 1, "persistence summary counts evidence-needed state");
check(state.actionSummary.notApplicableCount === 1, "persistence summary counts not-applicable state");
check(state.actionSummary.escalateCount === 1, "persistence summary counts escalation state");
check(!state.providerBoundary.providerCallAttempted, "persistence state does not call provider");
check(!state.providerBoundary.aiUsageLogWritten, "persistence state does not fake AiUsageLog");
check(!state.persistenceEnvelope.rawPrivateTranscriptAllowed, "persistence state forbids raw private transcript");
check(!state.persistenceEnvelope.rawProviderPayloadAllowed, "persistence state forbids raw provider payload");
check(!state.persistenceEnvelope.triggersExternalNotification, "persistence state forbids real notification");
check(!state.persistenceEnvelope.writesConfirmedCrmFact, "persistence state does not write confirmed CRM facts");
check(unsafeRecords[0]?.updatedAt === updatedAt, "sanitizer replaces invalid timestamps");
checkNoSensitiveSentinel(state, "persistence state excludes sensitive sentinel values");
checkSourceContracts();

for (const label of checks) {
  console.log(`PASS ${label}`);
}

console.log(
  JSON.stringify(
    {
      actionId: state.actionId,
      recordCount: state.recordCount,
      currentPersistence: state.persistenceEnvelope.currentPersistence,
      providerCallAttempted: state.providerBoundary.providerCallAttempted,
      aiUsageLogWritten: state.providerBoundary.aiUsageLogWritten,
      writesConfirmedCrmFact: state.persistenceEnvelope.writesConfirmedCrmFact,
      triggersExternalNotification: state.persistenceEnvelope.triggersExternalNotification,
    },
    null,
    2,
  ),
);

function check(condition: boolean, label: string) {
  assert.equal(condition, true, label);
  checks.push(label);
}

function checkNoSensitiveSentinel(value: unknown, label: string) {
  const serialized = JSON.stringify(value);
  check(!/qa-private@example\.com/i.test(serialized), label);
  check(!/0912[-\s]?345[-\s]?678/.test(serialized), label);
  check(!/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber)\b/i.test(serialized), label);
}

function checkSourceContracts() {
  const pageSource = readFileSync(resolve("src/app/(dashboard)/theater/[sessionId]/page.tsx"), "utf8");
  const routeSource = readFileSync(resolve("src/app/api/theater/route-b/sessions/[sessionId]/red-line-actions/route.ts"), "utf8");
  const repositorySource = readFileSync(resolve("src/lib/theater/route-b-session-bff-repository.ts"), "utf8");
  const manifestSource = readFileSync(resolve("src/domains/ai-protocol/manifest.ts"), "utf8");
  const registryQaSource = readFileSync(resolve("scripts/ai-protocol-registry-qa.ts"), "utf8");
  const packageSource = readFileSync(resolve("package.json"), "utf8");
  const repositoryBlock =
    repositorySource.match(/export async function getRouteBRedLineActionStateForMember[\s\S]*?export async function appendRouteBAdvisorTurnForMember/)?.[0] ??
    "";

  check(routeSource.includes("requireCurrentMember"), "red-line action route requires current member");
  check(routeSource.includes("getRouteBRedLineActionStateForMember"), "red-line action route supports owner-scoped GET");
  check(routeSource.includes("updateRouteBRedLineActionStateForMember"), "red-line action route supports owner-scoped POST");
  check(routeSource.includes("ROUTE_B_RED_LINE_ACTION_STATES"), "red-line action route validates action states");
  check(routeSource.includes("ROUTE_B_RED_LINE_ACTION_REASON_CODES"), "red-line action route validates reason codes");
  check(routeSource.includes("Cache-Control"), "red-line action route responses are no-store");

  check(repositoryBlock.includes("organizationId: session.organization.id"), "repository scopes red-line action by organization");
  check(repositoryBlock.includes("ownerId: session.user.id"), "repository scopes red-line action by owner");
  check(repositoryBlock.includes("routeBEnabled: true"), "repository scopes red-line action to Route B sessions");
  check(repositoryBlock.includes("redLineActionState"), "repository persists redLineActionState under sceneState");
  check(repositoryBlock.includes("writesConfirmedCrmFact: false"), "repository preserves no confirmed CRM fact writes");
  check(!repositoryBlock.includes("providerPayload"), "repository block does not store provider payload");
  check(!repositoryBlock.includes("interactionEvent.create"), "repository block does not create formal compliance event or notification");

  check(pageSource.includes("/red-line-actions"), "stage UI calls red-line-actions endpoint");
  check(pageSource.includes("RouteBRedLineActionPersistenceState"), "stage UI uses red-line persistence DTO");
  check(pageSource.includes("buildRouteBRedLineActionRecordsFromStateMap"), "stage UI builds safe red-line persistence records");
  check(pageSource.includes("讀取狀態"), "stage UI exposes read persisted action state control");
  check(pageSource.includes("保存狀態"), "stage UI exposes save persisted action state control");
  check(pageSource.includes("Persisted record count"), "stage UI renders persisted record count");

  check(manifestSource.includes("route-b-severe-red-line-action-persistence"), "AgentFacts manifest declares red-line action persistence capability");
  check(manifestSource.includes("/api/theater/route-b/sessions/[sessionId]/red-line-actions"), "AgentFacts manifest declares red-line action endpoint");
  check(manifestSource.includes("RouteBRedLineActionPersistenceState"), "AgentFacts manifest references red-line action persistence DTO");
  check(manifestSource.includes("pnpm theater:route-b-red-line-action-persistence-qa"), "AgentFacts manifest declares red-line action persistence proof command");
  check(registryQaSource.includes("route-b-severe-red-line-action-persistence"), "registry QA requires red-line action persistence capability");
  check(registryQaSource.includes("RouteBRedLineActionPersistenceState"), "registry QA requires red-line action persistence DTO");
  check(registryQaSource.includes("pnpm theater:route-b-red-line-action-persistence-qa"), "registry QA requires red-line action persistence command");
  check(packageSource.includes("theater:route-b-red-line-action-persistence-qa"), "package exposes red-line action persistence QA command");
}
