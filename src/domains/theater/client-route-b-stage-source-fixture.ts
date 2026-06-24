import type {
  RouteBSessionSourceReviewAdvisorPanel,
  RouteBSessionSourceReviewConsumption,
  RouteBSessionSourceReviewDataAttribute,
  RouteBSessionSourceReviewNoWriteBoundary,
  RouteBSessionSourceReviewPanelDestination,
} from "./client-route-b-session-source-consumption";

export type ClientRouteBStageSourceAdapterFixtureStatus =
  | "READY_FOR_STAGE_ADAPTER_FIXTURE"
  | "NEEDS_ADVISOR_SOURCE_REVIEW"
  | "BLOCKED_SENSITIVE";

export interface RouteBStageSourcePanelFixture {
  panelId: RouteBSessionSourceReviewAdvisorPanel["id"];
  label: string;
  source: RouteBSessionSourceReviewAdvisorPanel["source"];
  componentName: RouteBSessionSourceReviewPanelDestination;
  dataAttribute: RouteBSessionSourceReviewDataAttribute;
  dataAttributeSelector: string;
  stageSourceRequiredSnippets: string[];
  expectedSummary: {
    summary: string;
    count: number;
    unknownCount: number;
    factStatusCounts: Record<string, number>;
    previewItemCount: number;
  };
  adapterAssertions: string[];
  noWriteBoundary: RouteBSessionSourceReviewNoWriteBoundary;
}

export interface ClientRouteBStageSourceAdapterFixture {
  status: ClientRouteBStageSourceAdapterFixtureStatus;
  source: "RouteBSessionSourceReviewConsumption.advisorVisiblePanels";
  destinationSurface: "/theater/[sessionId]";
  componentFile: "src/app/(dashboard)/theater/[sessionId]/page.tsx";
  stageSection: "RouteBSessionStage.aside.sourceGroundingPanels";
  reviewId: string | null;
  sessionId: string | null;
  routeBSceneId: string | null;
  routeBSourcePacketId: string | null;
  clientId: string | null;
  panelCount: number;
  panels: RouteBStageSourcePanelFixture[];
  sourceCounts: RouteBSessionSourceReviewConsumption["sourceCounts"];
  stageAdapter: {
    consumes: "RouteBSessionSnapshot.scene.sourceGrounding";
    stageDataAttributes: RouteBSessionSourceReviewDataAttribute[];
    routeBEnabled: false;
    providerCallsEnabled: false;
    routeBProductionStartAllowed: false;
    ownerScopedSessionRequired: true;
    browserSuppliedSessionIdTrusted: false;
    browserSuppliedPersonIdTrusted: false;
  };
  proof: RouteBSessionSourceReviewNoWriteBoundary & {
    sourceConsumptionStatus: RouteBSessionSourceReviewConsumption["status"];
    advisorPanelsReady: boolean;
    allPanelsHaveStageSelectors: boolean;
    familyProfileSelectorReady: boolean;
    meetingSignalSelectorReady: boolean;
    relationshipEdgeShadowSelectorReady: boolean;
    factsInferencesUnknownsVisible: boolean;
    highSensitiveBlocked: boolean;
    stageSourceFileScanRequired: true;
  };
}

export function buildClientRouteBStageSourceAdapterFixture(
  consumption: RouteBSessionSourceReviewConsumption,
): ClientRouteBStageSourceAdapterFixture {
  const highSensitiveBlocked = consumption.status === "BLOCKED_SENSITIVE";
  const panels = highSensitiveBlocked
    ? []
    : consumption.advisorVisiblePanels.map((panel) => buildPanelFixture(panel));

  return {
    status: highSensitiveBlocked
      ? "BLOCKED_SENSITIVE"
      : panels.length
        ? "READY_FOR_STAGE_ADAPTER_FIXTURE"
        : "NEEDS_ADVISOR_SOURCE_REVIEW",
    source: "RouteBSessionSourceReviewConsumption.advisorVisiblePanels",
    destinationSurface: "/theater/[sessionId]",
    componentFile: "src/app/(dashboard)/theater/[sessionId]/page.tsx",
    stageSection: "RouteBSessionStage.aside.sourceGroundingPanels",
    reviewId: consumption.reviewId,
    sessionId: consumption.sessionId,
    routeBSceneId: consumption.routeBSceneId,
    routeBSourcePacketId: consumption.routeBSourcePacketId,
    clientId: consumption.clientId,
    panelCount: panels.length,
    panels,
    sourceCounts: consumption.sourceCounts,
    stageAdapter: {
      consumes: "RouteBSessionSnapshot.scene.sourceGrounding",
      stageDataAttributes: panels.map((panel) => panel.dataAttribute),
      routeBEnabled: false,
      providerCallsEnabled: false,
      routeBProductionStartAllowed: false,
      ownerScopedSessionRequired: true,
      browserSuppliedSessionIdTrusted: false,
      browserSuppliedPersonIdTrusted: false,
    },
    proof: {
      ...pickNoWriteBoundary(consumption.proof),
      sourceConsumptionStatus: consumption.status,
      advisorPanelsReady: panels.length > 0,
      allPanelsHaveStageSelectors: panels.every((panel) => panel.stageSourceRequiredSnippets.length > 0),
      familyProfileSelectorReady: hasPanel(panels, "data-route-b-family-profile-source-grounding"),
      meetingSignalSelectorReady: hasPanel(panels, "data-route-b-meeting-signal-source-grounding"),
      relationshipEdgeShadowSelectorReady: hasPanel(panels, "data-route-b-edge-shadow-source-grounding"),
      factsInferencesUnknownsVisible: consumption.proof.factsInferencesUnknownsVisible,
      highSensitiveBlocked,
      stageSourceFileScanRequired: true,
    },
  };
}

function buildPanelFixture(panel: RouteBSessionSourceReviewAdvisorPanel): RouteBStageSourcePanelFixture {
  return {
    panelId: panel.id,
    label: panel.label,
    source: panel.source,
    componentName: panel.destination,
    dataAttribute: panel.dataAttribute,
    dataAttributeSelector: `[${panel.dataAttribute}="true"]`,
    stageSourceRequiredSnippets: [
      panel.destination,
      `${panel.dataAttribute}="true"`,
      "RouteBSessionStage",
    ],
    expectedSummary: {
      summary: panel.summary,
      count: panel.count,
      unknownCount: panel.unknownCount,
      factStatusCounts: panel.factStatusCounts,
      previewItemCount: panel.previewItems.length,
    },
    adapterAssertions: [
      `${panel.destination}.dataAttribute=${panel.dataAttribute}`,
      `${panel.destination}.source=${panel.source}`,
      `${panel.destination}.providerCallAttempted=false`,
      `${panel.destination}.databaseWriteAttempted=false`,
      `${panel.destination}.writesConfirmedCrmFact=false`,
    ],
    noWriteBoundary: panel.noWriteBoundary,
  };
}

function hasPanel(panels: RouteBStageSourcePanelFixture[], dataAttribute: RouteBSessionSourceReviewDataAttribute) {
  return panels.some((panel) => panel.dataAttribute === dataAttribute);
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
