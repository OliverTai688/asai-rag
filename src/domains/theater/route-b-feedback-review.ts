import {
  buildRouteBObjectionRedLineLibrarySummary,
  buildRouteBRedLineReviewPlan,
  ROUTE_B_FEEDBACK_PERSPECTIVES,
  type RouteBRedLineDetectionMode,
  type RouteBRedLineRuleId,
  type RouteBRedLineSeverity,
  type TheaterRouteBFeedbackPerspectiveId,
} from "./route-b-feedback";
import {
  buildRouteBRedLineActionPersistenceState,
  type RouteBRedLineActionPersistenceState,
  type RouteBRedLineActionReasonCode,
  type RouteBRedLineActionState,
} from "./route-b-red-line-action-workflow";
import {
  buildRelationshipEdgeShadowRuntimeGrounding,
  type TheaterRouteBRelationshipEdgeShadowRuntimeGrounding,
} from "./route-b-next-turn";
import type { RouteBSessionSnapshot } from "./route-b-session";

export type TheaterRouteBFeedbackReviewStatus = "DETERMINISTIC_NO_PROVIDER";
export type TheaterRouteBFeedbackEvidenceLabel =
  | "FACT"
  | "INFERENCE"
  | "UNKNOWN"
  | "STAGE_STATE"
  | "ACTION_STATE"
  | "EDGE_SHADOW";
export type TheaterRouteBFeedbackRedLineStatus = "NEEDS_REVIEW" | "NOT_APPLICABLE";
export type TheaterRouteBFeedbackRelationshipEdgeShadowGrounding = Omit<
  TheaterRouteBRelationshipEdgeShadowRuntimeGrounding,
  "usedInNextTurnRuntime"
> & {
  usedInFeedbackReview: boolean;
};

export interface TheaterRouteBFeedbackReviewEvidence {
  label: TheaterRouteBFeedbackEvidenceLabel;
  source:
    | "characters"
    | "relationships"
    | "turns"
    | "state-proposals"
    | "narrator-questions"
    | "red-line-actions"
    | "relationship-edge-shadow";
  summary: string;
  count: number;
}

export interface TheaterRouteBFeedbackReviewSection {
  perspectiveId: TheaterRouteBFeedbackPerspectiveId;
  label: string;
  observation: string;
  evidenceBasis: TheaterRouteBFeedbackReviewEvidence[];
  advisorMove: string;
  riskOrUnknown: string;
}

export interface TheaterRouteBFeedbackReviewRedLineFinding {
  redLineId: RouteBRedLineRuleId;
  label: string;
  severity: RouteBRedLineSeverity;
  detectionMode: RouteBRedLineDetectionMode;
  status: TheaterRouteBFeedbackRedLineStatus;
  evidenceBasis: string;
  notApplicableReason?: string;
  actionContext?: TheaterRouteBFeedbackReviewRedLineActionContext;
}

export interface TheaterRouteBFeedbackReviewRedLineActionContext {
  sourceActionId: "route-b-severe-red-line-action-persistence";
  state: RouteBRedLineActionState;
  advisorReasonCode: RouteBRedLineActionReasonCode;
  updatedAt: string;
  persistedByOwnerScopedSession: true;
  noLegalAdvice: true;
  noFormalFinding: true;
  writesConfirmedCrmFact: false;
  triggersExternalNotification: false;
}

export interface TheaterRouteBFeedbackReviewRedLineActionSummary {
  sourceActionId: "route-b-severe-red-line-action-persistence";
  recordCount: number;
  watchingCount: number;
  evidenceNeededCount: number;
  notApplicableCount: number;
  escalateCount: number;
  consumedByFeedbackReview: true;
  ownerScopedSessionOnly: true;
  noProviderCall: true;
  writesConfirmedCrmFact: false;
  triggersExternalNotification: false;
  noLegalAdvice: true;
  noFormalFinding: true;
}

export interface TheaterRouteBFeedbackReview {
  id: string;
  agentId: "asai.theater.route_b";
  actionId: "route-b-feedback-persistence";
  registryReadiness: "internal-only";
  sessionId: string;
  status: TheaterRouteBFeedbackReviewStatus;
  generatedAt: string;
  selectedPerspectiveIds: TheaterRouteBFeedbackPerspectiveId[];
  sections: TheaterRouteBFeedbackReviewSection[];
  redLineFindings: TheaterRouteBFeedbackReviewRedLineFinding[];
  redLineActionState: TheaterRouteBFeedbackReviewRedLineActionSummary;
  relationshipEdgeShadowGrounding: TheaterRouteBFeedbackRelationshipEdgeShadowGrounding;
  redLineLibrary: ReturnType<typeof buildRouteBObjectionRedLineLibrarySummary>;
  complianceReminder: string;
  outputContract: {
    qualitativeOnly: true;
    totalScoreAllowed: false;
    rankingAllowed: false;
    canMarkNotApplicable: true;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    storesRawProviderPayload: false;
    successErrorAiUsageLogRequiredBeforeProviderEnablement: true;
  };
  persistenceEnvelope: {
    requiresAdvisorConfirmation: true;
    writesConfirmedCrmFact: false;
    storesPrivateLaneTurnContent: false;
    allowedWriteTarget: "THEATER_FEEDBACK_SUMMARY";
  };
  privacyProof: {
    directPrivateDialogReturned: false;
    rawProviderPayloadReturned: false;
    rawPrivateTranscriptReturned: false;
    personalContactReturned: false;
    policyNumberReturned: false;
  };
}

export interface BuildTheaterRouteBFeedbackReviewOptions {
  snapshot: RouteBSessionSnapshot;
  selectedPerspectiveIds?: TheaterRouteBFeedbackPerspectiveId[];
  notApplicableRedLines?: Array<{
    redLineId: RouteBRedLineRuleId;
    reason?: string;
  }>;
  now?: Date;
}

export function buildTheaterRouteBFeedbackReview(
  options: BuildTheaterRouteBFeedbackReviewOptions,
): TheaterRouteBFeedbackReview {
  const selectedPerspectives = selectReviewPerspectives(options.selectedPerspectiveIds);
  const redLineActionState = resolveRedLineActionState(options.snapshot);
  const redLineActionSummary = buildRedLineActionSummary(redLineActionState);
  const relationshipEdgeShadowGrounding = buildFeedbackRelationshipEdgeShadowGrounding(options.snapshot);
  const evidence = buildReviewEvidence(options.snapshot, redLineActionState, relationshipEdgeShadowGrounding);
  const generatedAt = (options.now ?? new Date()).toISOString();

  return {
    id: `route_b_feedback_review_${options.snapshot.session.id}`,
    agentId: "asai.theater.route_b",
    actionId: "route-b-feedback-persistence",
    registryReadiness: "internal-only",
    sessionId: options.snapshot.session.id,
    status: "DETERMINISTIC_NO_PROVIDER",
    generatedAt,
    selectedPerspectiveIds: selectedPerspectives.map((perspective) => perspective.id),
    sections: selectedPerspectives.map((perspective) =>
      buildReviewSection({
        evidence,
        perspectiveId: perspective.id,
        label: perspective.label,
        snapshot: options.snapshot,
        redLineActionState,
      }),
    ),
    redLineFindings: buildRedLineFindings(options.notApplicableRedLines, redLineActionState),
    redLineActionState: redLineActionSummary,
    relationshipEdgeShadowGrounding,
    redLineLibrary: buildRouteBObjectionRedLineLibrarySummary(),
    complianceReminder: "此回饋只作演練與合規提醒，不取代正式法遵審核或法律意見；嚴重紅線需由顧問依公司流程升級確認。",
    outputContract: {
      qualitativeOnly: true,
      totalScoreAllowed: false,
      rankingAllowed: false,
      canMarkNotApplicable: true,
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      storesRawProviderPayload: false,
      successErrorAiUsageLogRequiredBeforeProviderEnablement: true,
    },
    persistenceEnvelope: {
      requiresAdvisorConfirmation: true,
      writesConfirmedCrmFact: false,
      storesPrivateLaneTurnContent: false,
      allowedWriteTarget: "THEATER_FEEDBACK_SUMMARY",
    },
    privacyProof: {
      directPrivateDialogReturned: false,
      rawProviderPayloadReturned: false,
      rawPrivateTranscriptReturned: false,
      personalContactReturned: false,
      policyNumberReturned: false,
    },
  };
}

export function isTheaterRouteBFeedbackReview(value: unknown): value is TheaterRouteBFeedbackReview {
  const record = asRecord(value);
  const outputContract = asRecord(record.outputContract);
  const providerBoundary = asRecord(record.providerBoundary);
  const persistenceEnvelope = asRecord(record.persistenceEnvelope);
  const privacyProof = asRecord(record.privacyProof);
  const redLineActionState = asRecord(record.redLineActionState);
  const relationshipEdgeShadowGrounding = asRecord(record.relationshipEdgeShadowGrounding);
  const relationshipEdgeShadowBoundary = asRecord(relationshipEdgeShadowGrounding.boundary);

  return (
    record.agentId === "asai.theater.route_b" &&
    record.actionId === "route-b-feedback-persistence" &&
    record.registryReadiness === "internal-only" &&
    typeof record.sessionId === "string" &&
    Array.isArray(record.sections) &&
    Array.isArray(record.redLineFindings) &&
    redLineActionState.sourceActionId === "route-b-severe-red-line-action-persistence" &&
    redLineActionState.consumedByFeedbackReview === true &&
    redLineActionState.ownerScopedSessionOnly === true &&
    redLineActionState.noProviderCall === true &&
    redLineActionState.writesConfirmedCrmFact === false &&
    redLineActionState.triggersExternalNotification === false &&
    relationshipEdgeShadowGrounding.source === "RouteBSessionSnapshot.scene.sourceGrounding.relationshipEdgeShadow" &&
    relationshipEdgeShadowGrounding.providerPromptUsage === "relationship-readiness-context-only" &&
    relationshipEdgeShadowBoundary.rawDraftEdgesIncluded === false &&
    relationshipEdgeShadowBoundary.clientFacingDraftEdgesReturned === false &&
    relationshipEdgeShadowBoundary.formalSchemaApproved === false &&
    relationshipEdgeShadowBoundary.databaseWriteAttempted === false &&
    relationshipEdgeShadowBoundary.writesRelationshipGraph === false &&
    relationshipEdgeShadowBoundary.writesVisitPlan === false &&
    relationshipEdgeShadowBoundary.writesConfirmedCrmFact === false &&
    record.redLineLibrary !== undefined &&
    outputContract.qualitativeOnly === true &&
    outputContract.totalScoreAllowed === false &&
    outputContract.rankingAllowed === false &&
    providerBoundary.providerCallAttempted === false &&
    providerBoundary.aiUsageLogWritten === false &&
    providerBoundary.storesRawProviderPayload === false &&
    persistenceEnvelope.requiresAdvisorConfirmation === true &&
    persistenceEnvelope.writesConfirmedCrmFact === false &&
    privacyProof.directPrivateDialogReturned === false &&
    privacyProof.rawProviderPayloadReturned === false
  );
}

function selectReviewPerspectives(selectedPerspectiveIds?: TheaterRouteBFeedbackPerspectiveId[]) {
  if (!selectedPerspectiveIds?.length) return ROUTE_B_FEEDBACK_PERSPECTIVES;
  const requested = new Set(selectedPerspectiveIds);
  const selected = ROUTE_B_FEEDBACK_PERSPECTIVES.filter((perspective) => requested.has(perspective.id));
  return selected.length ? selected : ROUTE_B_FEEDBACK_PERSPECTIVES;
}

function buildReviewSection({
  evidence,
  label,
  perspectiveId,
  snapshot,
  redLineActionState,
}: {
  evidence: TheaterRouteBFeedbackReviewEvidence[];
  label: string;
  perspectiveId: TheaterRouteBFeedbackPerspectiveId;
  snapshot: RouteBSessionSnapshot;
  redLineActionState: RouteBRedLineActionPersistenceState;
}): TheaterRouteBFeedbackReviewSection {
  const characterCount = snapshot.characters.length;
  const turnCount = snapshot.turns.length;
  const statePatchCount = snapshot.scene.statePatchCount;
  const { evidenceNeededCount, escalateCount, notApplicableCount } = redLineActionState.actionSummary;

  switch (perspectiveId) {
    case "COACH_EAR":
      return {
        perspectiveId,
        label,
        observation: `本輪有 ${turnCount} 個舞台回合與 ${characterCount} 位角色；請先觀察顧問是否把群聊節奏拉回下一個可回答問題。`,
        evidenceBasis: pickEvidence(evidence, ["turns", "characters"]),
        advisorMove: "下一輪先用一個可被角色回答的開放題收束，不急著推商品或結論。",
        riskOrUnknown: "若角色回應變短或只剩同意，需回到未知缺口而非繼續往結論推進。",
      };
    case "CLIENT_EYES":
      return {
        perspectiveId,
        label,
        observation: "從客戶視角，私聊與群聊邊界要清楚；被點名角色應知道自己為何被問，而不是只被要求配合演出。",
        evidenceBasis: pickEvidence(evidence, ["turns", "relationships", "relationship-edge-shadow"]),
        advisorMove: "對每次私聊補一句情境說明，避免角色感覺被突然拉出群聊。",
        riskOrUnknown: "若私聊內容需要回到群聊，必須由顧問明確確認可引用範圍。",
      };
    case "SILENT_NEED":
      return {
        perspectiveId,
        label,
        observation: "未知項與旁白補問是下一輪最值得追的材料；不要把沉默或迴避直接解讀成已確認需求。",
        evidenceBasis: pickEvidence(evidence, ["narrator-questions", "characters", "relationship-edge-shadow"]),
        advisorMove: "挑一個未知缺口轉成旁白問題，再請焦點客戶確認是不是本次拜訪要處理的核心。",
        riskOrUnknown: "目前仍有未知或推論素材，任何結論都應標成待確認。",
      };
    case "COMPLIANCE_CONSCIENCE":
      return {
        perspectiveId,
        label,
        observation: "回饋只能指出嚴重紅線是否需要檢查，不能作成正式法遵判定或法律意見。",
        evidenceBasis: pickEvidence(evidence, ["turns", "state-proposals", "red-line-actions"]),
        advisorMove: `守門動作目前有 ${escalateCount} 條升級審閱、${evidenceNeededCount} 條需要佐證、${notApplicableCount} 條標示不適用；先依公司流程處理升級與佐證，不推商品結論。`,
        riskOrUnknown: `本輪有 ${statePatchCount} 個狀態 proposal；守門動作只屬 advisor context，不是正式法遵裁決，也不可改寫 CRM confirmed fact。`,
      };
    case "DECISION_BRIDGE":
      return {
        perspectiveId,
        label,
        observation: "決策橋接應把本輪練習轉成下一次拜訪可確認的事實、推論與未知清單，而不是總分或排名。",
        evidenceBasis: pickEvidence(evidence, [
          "relationships",
          "relationship-edge-shadow",
          "state-proposals",
          "narrator-questions",
        ]),
        advisorMove: "收尾時列出一個已確認、一個待確認、一個下一步問題，交給拜訪準備包或下次劇場。",
        riskOrUnknown: "不要把回饋文字直接寫成 CRM 事實；需要 advisor confirmation/writeback card。",
      };
  }
}

function buildReviewEvidence(
  snapshot: RouteBSessionSnapshot,
  redLineActionState: RouteBRedLineActionPersistenceState,
  relationshipEdgeShadowGrounding: TheaterRouteBFeedbackRelationshipEdgeShadowGrounding,
): TheaterRouteBFeedbackReviewEvidence[] {
  const characterKnownFacts = snapshot.characters.reduce((total, character) => total + routeBRecords(character.knownFacts).length, 0);
  const characterInferences = snapshot.characters.reduce((total, character) => total + routeBRecords(character.personaHints).length, 0);
  const characterUnknowns = snapshot.characters.reduce((total, character) => total + routeBRecords(character.unknowns).length, 0);
  const relationships = routeBRecords(snapshot.scene.relationships);
  const narratorQuestions = routeBRecords(snapshot.scene.narratorQuestions);

  return [
    {
      label: "FACT",
      source: "characters",
      summary: "角色卡已確認或背景事實數",
      count: characterKnownFacts,
    },
    {
      label: "INFERENCE",
      source: "characters",
      summary: "角色 persona / 行為推論數",
      count: characterInferences,
    },
    {
      label: "UNKNOWN",
      source: "characters",
      summary: "角色待確認未知項數",
      count: characterUnknowns,
    },
    {
      label: "FACT",
      source: "relationships",
      summary: "關係證據數",
      count: relationships.length,
    },
    {
      label: "EDGE_SHADOW",
      source: "relationship-edge-shadow",
      summary: "RelationshipEdge shadow readiness 候選數；正式 schema 未核可且不寫回關係圖",
      count: relationshipEdgeShadowGrounding.candidateEdgeCount,
    },
    {
      label: "STAGE_STATE",
      source: "turns",
      summary: "舞台回合數，不回傳 raw 對話內容",
      count: snapshot.turns.length,
    },
    {
      label: "STAGE_STATE",
      source: "state-proposals",
      summary: "待確認人物狀態 proposal 數",
      count: snapshot.scene.statePatchCount,
    },
    {
      label: "UNKNOWN",
      source: "narrator-questions",
      summary: "旁白補問數",
      count: narratorQuestions.length,
    },
    {
      label: "ACTION_STATE",
      source: "red-line-actions",
      summary: "已保存守門紅線 action state 數，僅作 advisor context",
      count: redLineActionState.records.length,
    },
  ];
}

function buildFeedbackRelationshipEdgeShadowGrounding(
  snapshot: RouteBSessionSnapshot,
): TheaterRouteBFeedbackRelationshipEdgeShadowGrounding {
  const { usedInNextTurnRuntime, ...grounding } = buildRelationshipEdgeShadowRuntimeGrounding(
    snapshot.scene.sourceGrounding?.relationshipEdgeShadow,
  );

  return {
    ...grounding,
    usedInFeedbackReview: usedInNextTurnRuntime,
  };
}

function pickEvidence(
  evidence: TheaterRouteBFeedbackReviewEvidence[],
  sources: TheaterRouteBFeedbackReviewEvidence["source"][],
) {
  const sourceSet = new Set(sources);
  return evidence.filter((item) => sourceSet.has(item.source));
}

function buildRedLineFindings(
  notApplicableRedLines?: BuildTheaterRouteBFeedbackReviewOptions["notApplicableRedLines"],
  redLineActionState?: RouteBRedLineActionPersistenceState,
): TheaterRouteBFeedbackReviewRedLineFinding[] {
  const actionState = redLineActionState ?? buildRouteBRedLineActionPersistenceState();
  const actionRecordsByRule = new Map<string, RouteBRedLineActionPersistenceState["records"][number]>(
    actionState.records.map((record) => [record.ruleId, record]),
  );

  return buildRouteBRedLineReviewPlan(notApplicableRedLines).map((finding) => {
    const actionRecord = actionRecordsByRule.get(finding.redLineId);
    if (!actionRecord) return finding;

    const actionContext: TheaterRouteBFeedbackReviewRedLineActionContext = {
      sourceActionId: actionState.actionId,
      state: actionRecord.state,
      advisorReasonCode: actionRecord.advisorReasonCode,
      updatedAt: actionRecord.updatedAt,
      persistedByOwnerScopedSession: true,
      noLegalAdvice: true,
      noFormalFinding: true,
      writesConfirmedCrmFact: false,
      triggersExternalNotification: false,
    };

    if (actionRecord.state !== "NOT_APPLICABLE") {
      return {
        ...finding,
        actionContext,
      };
    }

    return {
      ...finding,
      status: "NOT_APPLICABLE",
      notApplicableReason: finding.notApplicableReason ?? `Persisted advisor action: ${actionRecord.advisorReasonCode}.`,
      actionContext,
    };
  });
}

function resolveRedLineActionState(snapshot: RouteBSessionSnapshot): RouteBRedLineActionPersistenceState {
  return snapshot.scene.redLineActionState ?? buildRouteBRedLineActionPersistenceState();
}

function buildRedLineActionSummary(
  redLineActionState: RouteBRedLineActionPersistenceState,
): TheaterRouteBFeedbackReviewRedLineActionSummary {
  return {
    sourceActionId: redLineActionState.actionId,
    recordCount: redLineActionState.records.length,
    watchingCount: redLineActionState.actionSummary.watchingCount,
    evidenceNeededCount: redLineActionState.actionSummary.evidenceNeededCount,
    notApplicableCount: redLineActionState.actionSummary.notApplicableCount,
    escalateCount: redLineActionState.actionSummary.escalateCount,
    consumedByFeedbackReview: true,
    ownerScopedSessionOnly: true,
    noProviderCall: true,
    writesConfirmedCrmFact: false,
    triggersExternalNotification: false,
    noLegalAdvice: true,
    noFormalFinding: true,
  };
}

function routeBRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
