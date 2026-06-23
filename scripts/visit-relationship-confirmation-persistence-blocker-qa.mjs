#!/usr/bin/env node
import { readFileSync } from "node:fs";

const files = {
  issueQuestion: "docs/2_agent-input/generated/agent-loop/issue-question.md",
  loopState: "docs/2_agent-input/generated/agent-loop/loop-state.json",
  report:
    "docs/2_agent-input/generated/agent-loop/reports/2026-06-23_lv3-relationship-confirmation-persistence-blocker-analysis.md",
  packageJson: "package.json",
  domain: "src/domains/visit/relationship-confirmation-state.ts",
  route: "src/app/api/visits/[id]/relationship-confirmation-state/route.ts",
  decisionContractReport:
    "docs/2_agent-input/generated/agent-loop/reports/2026-06-23_lv3-relationship-confirmation-persistence-decision-contract.md",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")]),
);

const checks = [];

checkIssueQuestion();
checkLoopState();
checkReport();
checkPackageScript();
checkSourceBoundary();
checkPriorDecisionContract();

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function checkIssueQuestion() {
  const requiredMarkers = [
    "2026-06-23 open update / L4 blocker analysis",
    "Minimal operator answer needed",
    "Option A: `visit-plan-json-subdocument`",
    "Option B: `dedicated-relationship-confirmation-state-table`",
    "Option C: `defer-relationship-confirmation-persistence`",
    "selectedOption=null",
    "persistedToDatabase=false",
    "pnpm visit:relationship-confirmation-persistence-blocker-qa",
  ];

  for (const marker of requiredMarkers) {
    push(source.issueQuestion.includes(marker), `issue-question records blocker marker: ${marker}`);
  }
}

function checkLoopState() {
  const state = JSON.parse(source.loopState);
  push(
    state.cadenceReview?.normalLoopsSinceLastWholeProductReview === 3,
    "loop-state increments normal loop cadence to 3",
    `value=${state.cadenceReview?.normalLoopsSinceLastWholeProductReview}`,
  );
  push(
    String(state.cadenceReview?.nextRecommendedImplementationSlice ?? "").includes(
      "LV3-RELATIONSHIP-CONFIRMATION-PERSISTENCE-IMPLEMENTATION-001",
    ),
    "loop-state points next slice to implementation after operator decision",
  );
  push(
    String(state.cadenceReview?.nextRecommendedImplementationSlice ?? "").includes("Option C"),
    "loop-state records defer option fallback",
  );
}

function checkReport() {
  const requiredMarkers = [
    "LV3-RELATIONSHIP-CONFIRMATION-PERSISTENCE-BLOCKER-ANALYSIS-001",
    "Root Cause",
    "Risk Tradeoffs",
    "Minimal Operator Answer",
    "Option A",
    "Option B",
    "Option C",
    "selectedOption=null",
    "persistedToDatabase=false",
    "push skipped by user instruction",
  ];

  for (const marker of requiredMarkers) {
    push(source.report.includes(marker), `report records blocker analysis marker: ${marker}`);
  }
}

function checkPackageScript() {
  const packageJson = JSON.parse(source.packageJson);
  push(
    packageJson.scripts?.["visit:relationship-confirmation-persistence-blocker-qa"] ===
      "node scripts/visit-relationship-confirmation-persistence-blocker-qa.mjs",
    "package.json exposes blocker QA command",
  );
}

function checkSourceBoundary() {
  const requiredDomainMarkers = [
    'currentPersistence: "local-only-ui-state"',
    "decisionStatus: \"product_schema_decision_required\"",
    "requiresProductDecision: true",
    "selectedOption: null",
    "persistedToDatabase: false",
    "VISIT_RELATIONSHIP_CONFIRMATION_STATE_ALLOWED_FIELDS",
    "VISIT_RELATIONSHIP_CONFIRMATION_STATE_FORBIDDEN_FIELDS",
    "visit-plan-json-subdocument",
    "dedicated-relationship-confirmation-state-table",
  ];

  for (const marker of requiredDomainMarkers) {
    push(source.domain.includes(marker), `domain boundary still has marker: ${marker}`);
  }

  push(source.route.includes("requireCurrentMember"), "route derives current member");
  push(source.route.includes("getVisitPlanForMember"), "route derives owner-scoped VisitPlan");
  push(!source.route.includes("prisma."), "route still performs no direct Prisma persistence");
  push(!source.route.includes("AiUsageLog"), "route still performs no provider call or fake AiUsageLog");
}

function checkPriorDecisionContract() {
  push(
    source.decisionContractReport.includes("relationship confirmation card transient state -> explicit persistence decision contract"),
    "prior decision-contract report exists and names the source contract",
  );
  push(
    source.decisionContractReport.includes("selectedOption=null") &&
      source.decisionContractReport.includes("persistedToDatabase=false"),
    "prior decision-contract report preserved no-selected-option/no-DB boundary",
  );
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
