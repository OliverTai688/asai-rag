#!/usr/bin/env node
import { readFileSync } from "node:fs";

const checks = [];

assertFileContains("src/app/(dashboard)/layout.tsx", [
  "buildBillingSubscriptionCapability",
  "let subscription: BillingSubscriptionCapabilityDto | undefined",
  "subscription = await buildBillingSubscriptionCapability(session)",
  "member: buildWorkspaceSidebarRenderModel(session, \"member\",",
  "orgAdmin: buildWorkspaceSidebarRenderModel(session, \"orgAdmin\",",
  "subscription,",
]);

assertFileContains("src/app/api/workspace/bootstrap/route.ts", [
  "const subscription = await buildBillingSubscriptionCapability(session)",
  "buildWorkspaceBootstrapNavigation(session, requestedSurface,",
  "subscription,",
]);

assertFileContains("src/lib/navigation/workspace-sidebar.ts", [
  "BillingSubscriptionCapabilityDto",
  "WorkspaceSubscriptionBoundary",
  "server_subscription_dto",
  "session_plan_capability_fallback",
  "buildWorkspaceSubscriptionBoundary",
  "buildWorkspaceSidebarPlanCapabilities(",
  "subscription?: BillingSubscriptionCapabilityDto",
  "subscriptionBoundary: buildWorkspaceSubscriptionBoundary(session, options.subscription)",
  "subscriptionBoundary: navigation.subscriptionBoundary",
]);

assertFileContains("src/components/layout/role-aware-sidebar.tsx", [
  "SidebarSubscriptionBoundary",
  "data-subscription-source",
  "data-subscription-contract-version",
  "data-checkout-status",
  "data-browser-plan-assumptions-allowed",
  "data-provider-call-attempted",
  "data-db-write-attempted",
]);

assertFileContains("package.json", [
  "\"billing:subscription-ui-qa\": \"node scripts/billing-subscription-ui-qa.mjs\"",
]);

assertNoFrontEndPlanAssumptions("src/components/layout/role-aware-sidebar.tsx");
assertNoFrontEndPlanAssumptions("src/lib/navigation/workspace-sidebar.ts");

push(
  true,
  "no provider/payment side effects",
  "UI proof is static/source-only and does not contact ECPay/OpenAI/Anthropic or create billing records",
);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function assertFileContains(path, fragments) {
  const contents = readFile(path);

  for (const fragment of fragments) {
    push(contents.includes(fragment), `${path} contains ${fragment}`);
  }
}

function assertNoFrontEndPlanAssumptions(path) {
  const contents = readFile(path);
  const forbiddenFragments = [
    "localStorage",
    "sessionStorage",
    "document.cookie",
    "window.location",
    "URLSearchParams",
    "plan=",
    "paidPlan",
    "isPaid",
  ];
  const matches = forbiddenFragments.filter((fragment) => contents.includes(fragment));

  push(
    matches.length === 0,
    `${path} avoids browser-side plan assumptions`,
    matches.length === 0 ? `${forbiddenFragments.length} sentinels checked` : matches.join(", "),
  );
}

function readFile(path) {
  return readFileSync(path, "utf8");
}

function push(passed, label, detail = "") {
  checks.push({
    status: passed ? "pass" : "fail",
    label,
    detail,
  });
}
