import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  buildTheaterRouteBMeetingSignalGroundingSummary,
  type TheaterRouteBMeetingSignalGroundingInput,
} from "../src/domains/theater/route-b-handoff";
import {
  buildRouteBMeetingSignalSourceRenderModel,
  type TheaterRouteBMeetingSignalSourceRenderModel,
} from "../src/domains/theater/route-b-meeting-signal-source-render";

const nodeRequire = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = nodeRequire("playwright-core");
const bridgeSourceType = "MEETING_QUICK_NOTE_WRITEBACK_BRIDGE";

const checks: Array<{ label: string; detail?: string }> = [];
const consoleErrors: string[] = [];

const signalInputs: TheaterRouteBMeetingSignalGroundingInput[] = [
  {
    id: "meeting_session_raw_123_person_raw_456",
    status: "unknown",
    action: "ASK_IN_NEXT_VISIT",
    priority: "high",
    sourceType: bridgeSourceType,
    sourceLabel: "AI Meeting quick note",
    summary: "配偶可能需要共同參與保障決策，仍待顧問下一次確認。",
    prompt: "請確認配偶是否會一起參與家庭保障討論。",
  },
  {
    id: "source_ref_secret_should_not_render",
    status: "inference",
    action: "REVIEW_WITH_ADVISOR",
    priority: "medium",
    sourceType: "raw_session_secret",
    sourceLabel: "AI Meeting",
    summary: "顧問需要先確認決策人與現金流壓力。",
    prompt: "顧問確認後才可進入劇場角色狀態。",
  },
];

const grounding = buildTheaterRouteBMeetingSignalGroundingSummary(signalInputs, [
  "請確認配偶是否會一起參與家庭保障討論。",
]);
assert.ok(grounding, "meeting signal grounding should be created for render proof fixture");
const renderModel = buildRouteBMeetingSignalSourceRenderModel(grounding);

check(
  "render model targets RouteBMeetingSignalGroundingPanel",
  renderModel.componentName === "RouteBMeetingSignalGroundingPanel",
);
check(
  "render model exposes session panel data attribute",
  renderModel.dataAttribute === "data-route-b-meeting-signal-source-grounding",
);
check(
  "render model exposes source-type summary attribute",
  renderModel.sourceTypeDataAttribute === "data-route-b-meeting-signal-source-type-summary",
);
check("render model keeps card count", renderModel.cardCount === 2);
check("render model keeps unknown count", renderModel.unknownCount === 1);
check("render model keeps narrator question count", renderModel.narratorQuestionCount === 1);
check(
  "quick-note writeback bridge source type is advisor-visible",
  renderModel.sourceTypeChips.some((chip) => chip.sourceType === bridgeSourceType && chip.count === 1),
);
check("card-level source type survives render model", renderModel.cards[0]?.sourceType === bridgeSourceType);
check("raw-looking source type is redacted", renderModel.cards[1]?.sourceType === "REDACTED_SOURCE_TYPE");
check("source type proof is visible", renderModel.proof.sourceTypesVisibleToAdvisor);
check("render model does not include raw meeting session id", renderModel.proof.rawMeetingSessionIdIncluded === false);
check("render model does not include raw person id", renderModel.proof.rawPersonIdIncluded === false);
check("render model does not include source reference ids", renderModel.proof.sourceReferenceIdsIncluded === false);
check("render model does not include private transcript", renderModel.proof.rawPrivateTranscriptIncluded === false);
check("render model does not include provider payload", renderModel.proof.rawProviderPayloadIncluded === false);
check("render model does not call provider", renderModel.proof.providerCallAttempted === false);
check("render model does not write AiUsageLog", renderModel.proof.aiUsageLogWritten === false);
check("render model does not write relationship graph", renderModel.proof.writesRelationshipGraph === false);
check("render model does not write VisitPlan", renderModel.proof.writesVisitPlan === false);
check("render model does not write confirmed CRM fact", renderModel.proof.writesConfirmedCrmFact === false);

const serialized = JSON.stringify(renderModel);
for (const forbidden of [
  "meeting_session_raw_123",
  "person_raw_456",
  "source_ref_secret_should_not_render",
  "raw_session_secret",
  "raw provider",
  "private.client@example.com",
  "0912",
]) {
  check(`forbidden sentinel excluded: ${forbidden}`, !serialized.toLowerCase().includes(forbidden.toLowerCase()));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await runBrowserHarness(renderModel);

  assert.equal(checks.filter((check) => !check.detail).length, checks.length);
  assert.equal(consoleErrors.length, 0);

  for (const check of checks) {
    console.log(`PASS ${check.label}`);
  }

  console.log(
    JSON.stringify(
      {
        componentName: renderModel.componentName,
        dataAttribute: renderModel.dataAttribute,
        sourceTypeDataAttribute: renderModel.sourceTypeDataAttribute,
        sourceTypeChips: renderModel.sourceTypeChips,
        cardSourceTypes: renderModel.cards.map((card) => card.sourceType),
        proof: renderModel.proof,
      },
      null,
      2,
    ),
  );
}

function check(label: string, condition: boolean) {
  checks.push({ label, ...(condition ? {} : { detail: "failed" }) });
  if (!condition) {
    throw new Error(label);
  }
}

async function runBrowserHarness(renderModel: TheaterRouteBMeetingSignalSourceRenderModel) {
  const browser = await launchBrowser();

  try {
    await assertBrowserViewport(browser, renderModel, "desktop", { width: 1440, height: 1000, isMobile: false });
    await assertBrowserViewport(browser, renderModel, "mobile", { width: 390, height: 844, isMobile: true });
  } finally {
    await browser.close();
  }
}

async function assertBrowserViewport(
  browser: Awaited<ReturnType<typeof launchBrowser>>,
  renderModel: TheaterRouteBMeetingSignalSourceRenderModel,
  viewportName: string,
  viewport: { width: number; height: number; isMobile: boolean },
) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: viewport.isMobile,
  });
  const page = await context.newPage();

  page.on("console", (message: { type(): string; text(): string }) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error: { message: string }) => consoleErrors.push(error.message));

  try {
    await page.setContent(renderMeetingSignalSourceHarnessHtml(renderModel), { waitUntil: "domcontentloaded" });

    const summary = page.locator('[data-route-b-meeting-signal-source-type-summary="visible"]');
    const sourceTypeContainer = page.locator('[data-route-b-meeting-signal-source-types="true"]');
    const bridgeChip = page.locator(`[data-route-b-meeting-signal-source-type-chip="${bridgeSourceType}"]`);
    const bridgeCard = page.locator(`[data-route-b-meeting-signal-card-source-type="${bridgeSourceType}"]`);
    const redactedCard = page.locator('[data-route-b-meeting-signal-card-source-type="REDACTED_SOURCE_TYPE"]');

    check(`${viewportName} browser harness renders source-type summary`, (await summary.count()) === 1);
    check(`${viewportName} browser harness renders source-type chip container`, (await sourceTypeContainer.count()) === 1);
    check(`${viewportName} browser harness renders quick-note bridge source-type chip`, (await bridgeChip.count()) === 1);
    check(`${viewportName} browser harness renders card-level bridge source type`, (await bridgeCard.count()) === 1);
    check(`${viewportName} browser harness redacts raw-looking source type`, (await redactedCard.count()) === 1);

    const domProof = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasNoOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        includesProviderDisabled: text.includes("providerCallAttempted=false"),
        includesUsageDisabled: text.includes("aiUsageLogWritten=false"),
        includesNoWrites:
          text.includes("writesRelationshipGraph=false") &&
          text.includes("writesVisitPlan=false") &&
          text.includes("writesConfirmedCrmFact=false"),
        includesForbiddenRaw:
          text.includes("meeting_session_raw_123") ||
          text.includes("person_raw_456") ||
          text.includes("source_ref_secret_should_not_render") ||
          text.includes("raw_session_secret"),
      };
    });

    check(`${viewportName} browser harness has no horizontal overflow`, domProof.hasNoOverflow);
    check(`${viewportName} browser harness renders provider disabled proof`, domProof.includesProviderDisabled);
    check(`${viewportName} browser harness renders no fake AiUsageLog proof`, domProof.includesUsageDisabled);
    check(`${viewportName} browser harness renders no-write proof`, domProof.includesNoWrites);
    check(`${viewportName} browser harness excludes raw source sentinels`, !domProof.includesForbiddenRaw);
  } finally {
    await context.close();
  }
}

async function launchBrowser() {
  const preferredChannel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";
  try {
    return await chromium.launch({ channel: preferredChannel });
  } catch (error) {
    if (process.env.PLAYWRIGHT_CHANNEL) throw error;
    return chromium.launch({ channel: "chrome" });
  }
}

function renderMeetingSignalSourceHarnessHtml(renderModel: TheaterRouteBMeetingSignalSourceRenderModel) {
  const summaryVisibility = renderModel.sourceTypeChips.length ? "visible" : "empty";
  const chips = renderModel.sourceTypeChips
    .map(
      (chip) =>
        `<span class="chip" data-route-b-meeting-signal-source-type-chip="${escapeAttribute(chip.sourceType)}">${escapeHtml(
          chip.label,
        )}</span>`,
    )
    .join("");
  const cards = renderModel.cards
    .map(
      (card) => `<article class="card">
        <span data-route-b-meeting-signal-card-source-type="${escapeAttribute(card.sourceType ?? "none")}">${escapeHtml(
          card.sourceType ?? "none",
        )}</span>
        <p>${escapeHtml(card.summary)}</p>
      </article>`,
    )
    .join("");

  return `<!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: #111; background: #f8f8f5; }
          main { width: min(100%, 720px); padding: 24px; }
          section { display: grid; gap: 12px; border: 1px solid #d8d8d2; background: #fff; padding: 16px; }
          .chips { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
          .chip, .card span { max-width: 100%; overflow-wrap: anywhere; border: 1px solid #d8d8d2; padding: 4px 8px; font-size: 12px; }
          .card { display: grid; gap: 8px; min-width: 0; border: 1px solid #d8d8d2; padding: 12px; }
          p { margin: 0; line-height: 1.6; }
        </style>
      </head>
      <body>
        <main>
          <section
            data-route-b-meeting-signal-source-grounding="true"
            data-route-b-meeting-signal-source-type-summary="${summaryVisibility}"
          >
            <h1>Route B meeting signal source harness</h1>
            <div class="chips" data-route-b-meeting-signal-source-types="true">${chips}</div>
            ${cards}
            <p>providerCallAttempted=${String(renderModel.proof.providerCallAttempted)}</p>
            <p>aiUsageLogWritten=${String(renderModel.proof.aiUsageLogWritten)}</p>
            <p>writesRelationshipGraph=${String(renderModel.proof.writesRelationshipGraph)}</p>
            <p>writesVisitPlan=${String(renderModel.proof.writesVisitPlan)}</p>
            <p>writesConfirmedCrmFact=${String(renderModel.proof.writesConfirmedCrmFact)}</p>
          </section>
        </main>
      </body>
    </html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
