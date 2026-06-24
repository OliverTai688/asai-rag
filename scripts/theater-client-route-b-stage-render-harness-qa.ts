import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { Browser } from "playwright-core";
import type { Client } from "../src/domains/client/types";
import { buildClientRouteBSessionSourceConsumption } from "../src/domains/theater/client-route-b-session-source-consumption";
import { buildClientRouteBSessionSourceReview } from "../src/domains/theater/client-route-b-session-source-review";
import { buildClientRouteBStageSourceAdapterFixture } from "../src/domains/theater/client-route-b-stage-source-fixture";
import {
  buildClientRouteBStageSourceRenderHarness,
  renderClientRouteBStageSourceHarnessHtml,
} from "../src/domains/theater/client-route-b-stage-render-harness";

const nodeRequire = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = nodeRequire("playwright-core") as typeof import("playwright-core");

const checks: Array<{ label: string; detail?: string }> = [];

const baseClient: Client = {
  id: "demo_client_route_b_stage_render_harness",
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
  notes: "raw provider payload token:=secret123 should never appear in stage render harness",
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

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

async function main() {
  const readyReview = buildClientRouteBSessionSourceReview({
    organizationId: "org_demo",
    memberId: "member_demo",
    unitId: "unit_demo",
    client: baseClient,
    sessionId: "client_route_b_stage_render_harness",
    routeBSessionId: "route_b_client_stage_render_harness_preview",
    now: "2026-06-25T00:00:00.000Z",
    advisorTurn: {
      id: "advisor_group_latest",
      content: "請讓共同決策者先回應家庭現金流壓力，並提醒我還有哪些未知需要問清楚。qa-private@example.com",
      visibilityScope: "GROUP",
    },
  });

  const blockedReview = buildClientRouteBSessionSourceReview({
    organizationId: "org_demo",
    memberId: "member_demo",
    unitId: "unit_demo",
    client: {
      ...baseClient,
      id: "demo_client_route_b_stage_render_harness_high_sensitive",
      sensitivityLevel: "HIGHLY_SENSITIVE",
    },
    sessionId: "client_route_b_stage_render_harness_blocked",
    routeBSessionId: "route_b_client_stage_render_harness_blocked",
    now: "2026-06-25T00:00:00.000Z",
    advisorTurn: {
      id: "advisor_blocked_latest",
      content: "請開始演練。",
      visibilityScope: "GROUP",
    },
  });

  const readyFixture = buildClientRouteBStageSourceAdapterFixture(
    buildClientRouteBSessionSourceConsumption(readyReview),
  );
  const blockedFixture = buildClientRouteBStageSourceAdapterFixture(
    buildClientRouteBSessionSourceConsumption(blockedReview),
  );
  const readyHarness = buildClientRouteBStageSourceRenderHarness(readyFixture);
  const blockedHarness = buildClientRouteBStageSourceRenderHarness(blockedFixture);
  const readyHtml = renderClientRouteBStageSourceHarnessHtml(readyHarness);
  const blockedHtml = renderClientRouteBStageSourceHarnessHtml(blockedHarness);

  check(readyHarness.status === "READY_FOR_RENDER_HARNESS", "ready harness reaches render status");
  check(readyHarness.source === "ClientRouteBStageSourceAdapterFixture.panels", "render harness consumes stage fixture panels");
  check(readyHarness.destinationSurface === "/theater/[sessionId]", "render harness targets Route B stage");
  check(readyHarness.panelCount === readyFixture.panelCount, "render harness panel count mirrors fixture");
  check(readyHarness.panelCount >= 1, "render harness exposes at least one panel");
  check(readyHarness.proof.familyProfilePanelRendered, "render harness exposes family profile panel");
  check(readyHarness.proof.visibleFactStatusSummary, "render harness exposes fact/inference/unknown summary");
  check(readyHarness.proof.providerCallAttempted === false, "render harness provider call false");
  check(readyHarness.proof.databaseWriteAttempted === false, "render harness database write false");
  check(readyHarness.proof.sourceGroundingPersistedToDatabase === false, "render harness source grounding persistence false");
  check(readyHarness.proof.rawSourceReferenceIdsIncluded === false, "render harness raw source refs false");
  check(readyHarness.proof.rawMetadataIncluded === false, "render harness raw metadata false");
  check(readyHarness.proof.writesConfirmedCrmFact === false, "render harness confirmed CRM fact write false");
  check(readyHarness.a11y.allPanelRegionsHaveLabels, "render harness panel regions have labels");
  check(readyHarness.a11y.allPanelRegionsHaveDescriptions, "render harness panel regions have descriptions");

  check(readyHtml.includes('data-route-b-stage-source-render-harness="true"'), "ready HTML has render harness data attribute");
  check(readyHtml.includes('data-route-b-family-profile-source-grounding="true"'), "ready HTML has family source data attribute");
  check(readyHtml.includes("RouteBFamilyProfileGroundingPanel"), "ready HTML names stage family component");
  check(readyHtml.includes("FACT=6 / INFERENCE=3 / UNKNOWN=3"), "ready HTML shows fact status counts");
  check(readyHtml.includes("sourceGroundingPersistedToDatabase=false"), "ready HTML shows no source persistence boundary");

  check(blockedHarness.status === "BLOCKED_SENSITIVE", "blocked harness remains blocked");
  check(blockedHarness.panelCount === 0, "blocked harness exposes no panels");
  check(blockedHtml.includes('data-route-b-high-sensitive-blocked="true"'), "blocked HTML has high-sensitive callout");
  check(!blockedHtml.includes('data-route-b-family-profile-source-grounding="true"'), "blocked HTML has no family source panel");

  const serialized = [
    collectStringValues([readyHarness, blockedHarness]).join("\n"),
    readyHtml,
    blockedHtml,
  ].join("\n");
  for (const forbidden of forbiddenSentinels()) {
    check(!serialized.toLowerCase().includes(forbidden.toLowerCase()), `forbidden sentinel excluded: ${forbidden}`);
  }

  const browser = await launchChromium();
  try {
    await runReadyBrowserProof(browser, readyHtml, { width: 1280, height: 900 }, "desktop");
    await runReadyBrowserProof(browser, readyHtml, { width: 390, height: 844 }, "mobile");
    await runBlockedBrowserProof(browser, blockedHtml);
  } finally {
    await browser.close();
  }

  for (const result of checks) {
    console.log(`PASS ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
  }

  console.log(
    JSON.stringify(
      {
        renderHarnessStatus: readyHarness.status,
        destinationSurface: readyHarness.destinationSurface,
        fixtureComponentFile: readyHarness.fixtureComponentFile,
        panelCount: readyHarness.panelCount,
        renderedPanels: readyHarness.panels.map((panel) => ({
          panelId: panel.panelId,
          componentName: panel.componentName,
          dataAttribute: panel.dataAttribute,
          factStatusMetric: panel.metrics.find((metric) => metric.label === "Fact status")?.value ?? null,
        })),
        proof: readyHarness.proof,
        highSensitiveStatus: blockedHarness.status,
        highSensitivePanelCount: blockedHarness.panelCount,
      },
      null,
      2,
    ),
  );
}

async function runReadyBrowserProof(
  browser: Browser,
  html: string,
  viewport: { width: number; height: number },
  label: string,
) {
  const page = await browser.newPage({ viewport });
  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(() => {
      const harness = document.querySelector('[data-route-b-stage-source-render-harness="true"]');
      const familyPanel = document.querySelector('[data-route-b-family-profile-source-grounding="true"]');
      const labelledBy = familyPanel?.getAttribute("aria-labelledby") ?? "";
      const describedBy = familyPanel?.getAttribute("aria-describedby") ?? "";
      const text = document.body.innerText;
      const htmlText = document.documentElement.innerHTML;
      return {
        hasHarness: Boolean(harness),
        harnessRole: harness?.getAttribute("role") ?? "",
        harnessLabel: harness?.getAttribute("aria-label") ?? "",
        hasFamilyPanel: Boolean(familyPanel),
        familyPanelRole: familyPanel?.getAttribute("role") ?? "",
        hasHeadingTarget: labelledBy.length > 0 && Boolean(document.getElementById(labelledBy)),
        hasDescriptionTarget: describedBy.length > 0 && Boolean(document.getElementById(describedBy)),
        hasComponentName: text.includes("RouteBFamilyProfileGroundingPanel"),
        hasFactStatus: text.includes("FACT=6 / INFERENCE=3 / UNKNOWN=3"),
        hasNoWriteBoundary:
          text.includes("providerCallAttempted=false") &&
          text.includes("databaseWriteAttempted=false") &&
          text.includes("writesConfirmedCrmFact=false"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        serialized: `${text}\n${htmlText}`,
      };
    });

    check(result.hasHarness, `${label} browser renders harness region`);
    check(result.harnessRole === "region", `${label} harness has region role`);
    check(result.harnessLabel === "Route B source grounding render harness", `${label} harness has aria label`);
    check(result.hasFamilyPanel, `${label} browser renders family profile source panel`);
    check(result.familyPanelRole === "region", `${label} family panel has region role`);
    check(result.hasHeadingTarget, `${label} family panel aria-labelledby target exists`);
    check(result.hasDescriptionTarget, `${label} family panel aria-describedby target exists`);
    check(result.hasComponentName, `${label} browser shows family stage component name`);
    check(result.hasFactStatus, `${label} browser shows fact status summary`);
    check(result.hasNoWriteBoundary, `${label} browser shows no-write boundary`);
    check(!result.horizontalOverflow, `${label} browser has no horizontal overflow`);

    for (const forbidden of forbiddenSentinels()) {
      check(!result.serialized.toLowerCase().includes(forbidden.toLowerCase()), `${label} browser excludes ${forbidden}`);
    }
  } finally {
    await page.close();
  }
}

async function runBlockedBrowserProof(browser: Browser, html: string) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(() => ({
      hasBlocked: Boolean(document.querySelector('[data-route-b-high-sensitive-blocked="true"]')),
      hasFamilyPanel: Boolean(document.querySelector('[data-route-b-family-profile-source-grounding="true"]')),
      status: document
        .querySelector('[data-route-b-stage-source-render-harness="true"]')
        ?.getAttribute("data-render-harness-status"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    check(result.status === "BLOCKED_SENSITIVE", "blocked browser preserves blocked status");
    check(result.hasBlocked, "blocked browser renders high-sensitive callout");
    check(!result.hasFamilyPanel, "blocked browser does not render family source panel");
    check(!result.horizontalOverflow, "blocked browser has no horizontal overflow");
  } finally {
    await page.close();
  }
}

async function launchChromium(): Promise<Browser> {
  const channels = [process.env.PLAYWRIGHT_CHANNEL, "msedge", "chrome"].filter(
    (channel): channel is string => Boolean(channel),
  );
  let lastError: unknown = null;
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel });
    } catch (error) {
      lastError = error;
    }
  }
  try {
    return await chromium.launch();
  } catch (error) {
    lastError = error;
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function forbiddenSentinels() {
  return [
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
    "relationship_graph_note_",
    "authorization",
    "cookie",
    "otp",
    "payment",
  ];
}

function check(condition: boolean, label: string, detail?: string) {
  assert.ok(condition, label);
  checks.push({ label, detail });
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((entry) => collectStringValues(entry));
  return Object.values(value).flatMap((entry) => collectStringValues(entry));
}
