import type {
  ClientRouteBStageSourceAdapterFixture,
  RouteBStageSourcePanelFixture,
} from "./client-route-b-stage-source-fixture";
import type {
  RouteBSessionSourceReviewDataAttribute,
  RouteBSessionSourceReviewNoWriteBoundary,
} from "./client-route-b-session-source-consumption";

export type ClientRouteBStageSourceRenderHarnessStatus =
  | "READY_FOR_RENDER_HARNESS"
  | "NEEDS_STAGE_ADAPTER_FIXTURE"
  | "BLOCKED_SENSITIVE";

export interface RouteBStageSourceRenderedMetric {
  label: string;
  value: string;
  ariaLabel: string;
}

export interface RouteBStageSourceRenderedPanel {
  panelId: RouteBStageSourcePanelFixture["panelId"];
  componentName: RouteBStageSourcePanelFixture["componentName"];
  dataAttribute: RouteBSessionSourceReviewDataAttribute;
  dataAttributeSelector: string;
  role: "region";
  headingId: string;
  descriptionId: string;
  heading: string;
  summary: string;
  metrics: RouteBStageSourceRenderedMetric[];
  badges: string[];
  boundaryLines: string[];
  safePreviewLines: string[];
  noWriteBoundary: RouteBSessionSourceReviewNoWriteBoundary;
}

export interface ClientRouteBStageSourceRenderHarness {
  status: ClientRouteBStageSourceRenderHarnessStatus;
  source: "ClientRouteBStageSourceAdapterFixture.panels";
  destinationSurface: "/theater/[sessionId]";
  fixtureComponentFile: ClientRouteBStageSourceAdapterFixture["componentFile"];
  renderHarnessSurface: "no-db deterministic Route B source grounding render harness";
  reviewId: string | null;
  sessionId: string | null;
  routeBSceneId: string | null;
  routeBSourcePacketId: string | null;
  clientId: string | null;
  panelCount: number;
  panels: RouteBStageSourceRenderedPanel[];
  a11y: {
    landmarkRole: "region";
    landmarkLabel: string;
    panelRegionCount: number;
    allPanelRegionsHaveLabels: boolean;
    allPanelRegionsHaveDescriptions: boolean;
    mobileSingleColumnExpected: true;
  };
  proof: RouteBSessionSourceReviewNoWriteBoundary & {
    fixtureStatus: ClientRouteBStageSourceAdapterFixture["status"];
    allRenderedPanelsHaveDataAttributes: boolean;
    familyProfilePanelRendered: boolean;
    visibleFactStatusSummary: boolean;
    browserRenderHarnessRequired: true;
    noDbBrowserRender: true;
    highSensitiveBlocked: boolean;
    routeBProductionStartAllowed: false;
  };
}

export function buildClientRouteBStageSourceRenderHarness(
  fixture: ClientRouteBStageSourceAdapterFixture,
): ClientRouteBStageSourceRenderHarness {
  const highSensitiveBlocked = fixture.status === "BLOCKED_SENSITIVE";
  const panels = highSensitiveBlocked
    ? []
    : fixture.panels.map((panel) => buildRenderedPanel(panel));
  const status: ClientRouteBStageSourceRenderHarnessStatus = highSensitiveBlocked
    ? "BLOCKED_SENSITIVE"
    : panels.length
      ? "READY_FOR_RENDER_HARNESS"
      : "NEEDS_STAGE_ADAPTER_FIXTURE";

  return {
    status,
    source: "ClientRouteBStageSourceAdapterFixture.panels",
    destinationSurface: fixture.destinationSurface,
    fixtureComponentFile: fixture.componentFile,
    renderHarnessSurface: "no-db deterministic Route B source grounding render harness",
    reviewId: fixture.reviewId,
    sessionId: fixture.sessionId,
    routeBSceneId: fixture.routeBSceneId,
    routeBSourcePacketId: fixture.routeBSourcePacketId,
    clientId: fixture.clientId,
    panelCount: panels.length,
    panels,
    a11y: {
      landmarkRole: "region",
      landmarkLabel: "Route B source grounding render harness",
      panelRegionCount: panels.length,
      allPanelRegionsHaveLabels: panels.every((panel) => panel.headingId.length > 0),
      allPanelRegionsHaveDescriptions: panels.every((panel) => panel.descriptionId.length > 0),
      mobileSingleColumnExpected: true,
    },
    proof: {
      ...pickNoWriteBoundary(fixture.proof),
      fixtureStatus: fixture.status,
      allRenderedPanelsHaveDataAttributes: panels.every((panel) => panel.dataAttributeSelector.length > 0),
      familyProfilePanelRendered: panels.some(
        (panel) => panel.dataAttribute === "data-route-b-family-profile-source-grounding",
      ),
      visibleFactStatusSummary: panels.some((panel) =>
        panel.metrics.some((metric) => metric.label === "Fact status" && metric.value.includes("UNKNOWN")),
      ),
      browserRenderHarnessRequired: true,
      noDbBrowserRender: true,
      highSensitiveBlocked,
      routeBProductionStartAllowed: false,
    },
  };
}

export function renderClientRouteBStageSourceHarnessHtml(
  harness: ClientRouteBStageSourceRenderHarness,
): string {
  const panelHtml = harness.panels.map(renderPanelHtml).join("\n");
  const blockedHtml =
    harness.status === "BLOCKED_SENSITIVE"
      ? `<div class="blocked" data-route-b-high-sensitive-blocked="true" role="note">High-sensitivity client data is blocked from this render harness. No stage source panels are exposed.</div>`
      : "";

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Route B Source Grounding Render Harness</title>
  <style>
    :root {
      color-scheme: light;
      --paper: #f8f7f3;
      --ink: #141414;
      --muted: #5b5b56;
      --hairline: #dedbd2;
      --accent: #1a3a6b;
      --surface: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main {
      min-height: 100vh;
      padding: 32px;
    }
    .harness {
      width: min(1040px, 100%);
      margin: 0 auto;
      border: 1px solid var(--hairline);
      background: var(--surface);
    }
    .header,
    .blocked,
    .boundary {
      padding: 20px;
      border-bottom: 1px solid var(--hairline);
    }
    h1,
    h2 {
      margin: 0;
      letter-spacing: 0;
    }
    h1 {
      font-size: 24px;
      line-height: 1.12;
    }
    h2 {
      font-size: 17px;
      line-height: 1.2;
    }
    p {
      margin: 8px 0 0;
      color: var(--muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 0;
    }
    .panel {
      min-width: 0;
      padding: 20px;
      border-right: 1px solid var(--hairline);
      border-bottom: 1px solid var(--hairline);
      overflow-wrap: anywhere;
    }
    .panel:nth-child(even) {
      border-right: 0;
    }
    .badges,
    .metrics,
    .lines {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .badge,
    .metric,
    .line {
      border: 1px solid var(--hairline);
      padding: 6px 8px;
      font-size: 12px;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .metric strong {
      display: block;
      color: var(--muted);
      font-weight: 500;
    }
    .metric span {
      font-variant-numeric: tabular-nums;
    }
    .blocked {
      background: #fff9ed;
      color: #5d3b00;
    }
    .boundary {
      color: var(--muted);
      font-size: 13px;
    }
    @media (max-width: 640px) {
      main { padding: 16px; }
      .header,
      .blocked,
      .boundary,
      .panel { padding: 16px; }
      .grid { grid-template-columns: 1fr; }
      .panel { border-right: 0; }
    }
  </style>
</head>
<body>
  <main>
    <section
      class="harness"
      data-route-b-stage-source-render-harness="true"
      data-render-harness-status="${escapeAttribute(harness.status)}"
      data-destination-surface="${escapeAttribute(harness.destinationSurface)}"
      role="${harness.a11y.landmarkRole}"
      aria-label="${escapeAttribute(harness.a11y.landmarkLabel)}"
    >
      <header class="header">
        <h1>Route B source grounding render harness</h1>
        <p>${escapeHtml(harness.renderHarnessSurface)} · ${escapeHtml(harness.destinationSurface)} · panels=${harness.panelCount}</p>
      </header>
      ${blockedHtml}
      <div class="grid">
        ${panelHtml}
      </div>
      <footer class="boundary" data-route-b-stage-source-render-boundary="true">
        providerCallAttempted=${String(harness.proof.providerCallAttempted)} · databaseWriteAttempted=${String(harness.proof.databaseWriteAttempted)} · writesConfirmedCrmFact=${String(harness.proof.writesConfirmedCrmFact)} · sourceGroundingPersistedToDatabase=${String(harness.proof.sourceGroundingPersistedToDatabase)}
      </footer>
    </section>
  </main>
</body>
</html>`;
}

function buildRenderedPanel(panel: RouteBStageSourcePanelFixture): RouteBStageSourceRenderedPanel {
  const headingId = `route-b-source-panel-${panel.panelId}-heading`;
  const descriptionId = `route-b-source-panel-${panel.panelId}-summary`;
  const factStatus = formatFactStatusCounts(panel.expectedSummary.factStatusCounts);

  return {
    panelId: panel.panelId,
    componentName: panel.componentName,
    dataAttribute: panel.dataAttribute,
    dataAttributeSelector: panel.dataAttributeSelector,
    role: "region",
    headingId,
    descriptionId,
    heading: panel.label,
    summary: panel.expectedSummary.summary,
    metrics: [
      {
        label: "Source panel",
        value: String(panel.expectedSummary.count),
        ariaLabel: `${panel.label} source count`,
      },
      {
        label: "Unknowns",
        value: String(panel.expectedSummary.unknownCount),
        ariaLabel: `${panel.label} unknown count`,
      },
      {
        label: "Fact status",
        value: factStatus,
        ariaLabel: `${panel.label} fact, inference, and unknown status counts`,
      },
      {
        label: "Safe previews",
        value: String(panel.expectedSummary.previewItemCount),
        ariaLabel: `${panel.label} safe preview count`,
      },
    ],
    badges: [
      panel.componentName,
      panel.dataAttribute,
      `source=${panel.source}`,
    ],
    boundaryLines: [
      "providerCallAttempted=false",
      "databaseWriteAttempted=false",
      "sourceGroundingPersistedToDatabase=false",
      "rawSourceReferenceIdsIncluded=false",
      "rawMetadataIncluded=false",
      "writesConfirmedCrmFact=false",
    ],
    safePreviewLines: [
      `${panel.expectedSummary.previewItemCount} safe preview items are available; raw source references and raw metadata are excluded.`,
    ],
    noWriteBoundary: panel.noWriteBoundary,
  };
}

function renderPanelHtml(panel: RouteBStageSourceRenderedPanel) {
  const metrics = panel.metrics
    .map(
      (metric) =>
        `<div class="metric" aria-label="${escapeAttribute(metric.ariaLabel)}"><strong>${escapeHtml(metric.label)}</strong><span>${escapeHtml(metric.value)}</span></div>`,
    )
    .join("");
  const badges = panel.badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("");
  const boundaryLines = panel.boundaryLines
    .map((line) => `<span class="line">${escapeHtml(line)}</span>`)
    .join("");
  const previewLines = panel.safePreviewLines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  return `<article
    class="panel"
    role="${panel.role}"
    aria-labelledby="${escapeAttribute(panel.headingId)}"
    aria-describedby="${escapeAttribute(panel.descriptionId)}"
    data-panel-id="${escapeAttribute(panel.panelId)}"
    data-component-name="${escapeAttribute(panel.componentName)}"
    ${panel.dataAttribute}="true"
  >
    <h2 id="${escapeAttribute(panel.headingId)}">${escapeHtml(panel.heading)}</h2>
    <p id="${escapeAttribute(panel.descriptionId)}">${escapeHtml(panel.summary)}</p>
    <div class="metrics">${metrics}</div>
    <div class="badges">${badges}</div>
    <div class="lines">${boundaryLines}</div>
    ${previewLines}
  </article>`;
}

function formatFactStatusCounts(counts: Record<string, number>) {
  return ["FACT", "INFERENCE", "UNKNOWN"]
    .map((key) => `${key}=${counts[key] ?? 0}`)
    .join(" / ");
}

function pickNoWriteBoundary(input: RouteBSessionSourceReviewNoWriteBoundary): RouteBSessionSourceReviewNoWriteBoundary {
  return {
    providerCallAttempted: input.providerCallAttempted,
    databaseWriteAttempted: input.databaseWriteAttempted,
    aiUsageLogWritten: input.aiUsageLogWritten,
    aiUsageLogRequiredBeforeProviderEnablement: input.aiUsageLogRequiredBeforeProviderEnablement,
    routeBSessionPersisted: input.routeBSessionPersisted,
    sourceGroundingPersistedToDatabase: input.sourceGroundingPersistedToDatabase,
    rawPrivateTranscriptIncluded: input.rawPrivateTranscriptIncluded,
    rawProviderPayloadIncluded: input.rawProviderPayloadIncluded,
    rawSourceReferenceIdsIncluded: input.rawSourceReferenceIdsIncluded,
    rawMetadataIncluded: input.rawMetadataIncluded,
    directPrivateDialogReturned: input.directPrivateDialogReturned,
    writesRelationshipGraph: input.writesRelationshipGraph,
    writesVisitPlan: input.writesVisitPlan,
    writesClientProfile: input.writesClientProfile,
    writesPolicy: input.writesPolicy,
    writesConfirmedCrmFact: input.writesConfirmedCrmFact,
  };
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
  return escapeHtml(value);
}
