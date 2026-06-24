import type { TheaterRouteBFeedbackReview } from "../theater/route-b-feedback-review";
import type { VisitQuestionEvidence, VisitQuestionEvidenceStatus } from "./types";

export type VisitRouteBFeedbackAdvisorContextStatus =
  | "READY"
  | "NO_ROUTE_B_SESSION"
  | "NO_FEEDBACK_REVIEW"
  | "NO_FEEDBACK_PROFILE_CONTEXT";

export interface VisitRouteBFeedbackAdvisorContextItem {
  id: string;
  source: "theater_route_b_feedback_profile";
  status: VisitQuestionEvidenceStatus;
  memberLabel: string;
  relationLabel: string;
  fieldLabel: string;
  label: string;
  detail: string;
  followUpQuestion: string;
  requiresAdvisorConfirmation: true;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
  writesClientProfile: false;
  writesPolicy: false;
  writesConfirmedCrmFact: false;
}

export interface VisitRouteBFeedbackAdvisorContext {
  agentId: "asai.visit.preparation_package";
  actionId: "route-b-feedback-family-profile-advisor-context";
  registryReadiness: "internal-only";
  sourceAgentId: "asai.theater.route_b";
  sourceActionId: "route-b-feedback-persistence";
  items: VisitRouteBFeedbackAdvisorContextItem[];
  unknownPrompts: string[];
  summary: {
    itemCount: number;
    confirmedCount: number;
    inferenceCount: number;
    unknownCount: number;
    profiledMemberCount: number;
    fieldCount: number;
  };
  outputContract: {
    factsInferencesUnknownsSeparated: true;
    advisorContextOnly: true;
    requiresAdvisorConfirmation: true;
    doesNotOverwriteVisitFacts: true;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesClientProfile: false;
    writesPolicy: false;
    writesConfirmedCrmFact: false;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    storesRawProviderPayload: false;
  };
  privacyProof: {
    rawMetadataReturned: false;
    sourceReferenceIdsReturned: false;
    rawPrivateTranscriptReturned: false;
    rawProviderPayloadReturned: false;
    rawTheaterSessionIdReturned: false;
    rawPersonIdReturned: false;
    personalContactReturned: false;
    policyNumberReturned: false;
  };
}

export function buildVisitRouteBFeedbackAdvisorContextFromFeedbackReview(
  review: TheaterRouteBFeedbackReview,
): VisitRouteBFeedbackAdvisorContext {
  const grounding = review.familyProfileGrounding;
  const items = grounding.fields.map((field, index): VisitRouteBFeedbackAdvisorContextItem => {
    const status = normalizeStatus(field.status);
    const memberLabel = sanitizeAdvisorContextText(field.memberLabel) || "關係人";
    const relationLabel = sanitizeAdvisorContextText(field.relationLabel) || "關係待確認";
    const fieldLabel = sanitizeAdvisorContextText(field.fieldLabel) || "人物資料";
    const valueSummary = sanitizeAdvisorContextText(field.valueSummary) || "尚未形成可用摘要";

    return {
      id: `route-b-feedback-profile-${index + 1}`,
      source: "theater_route_b_feedback_profile",
      status,
      memberLabel,
      relationLabel,
      fieldLabel,
      label: `劇場回饋人物脈絡：${memberLabel} / ${fieldLabel}`,
      detail: buildProfileDetail({
        memberLabel,
        relationLabel,
        fieldLabel,
        status,
        valueSummary,
      }),
      followUpQuestion: buildFollowUpQuestion({
        memberLabel,
        relationLabel,
        fieldLabel,
        status,
        valueSummary,
      }),
      requiresAdvisorConfirmation: true,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesClientProfile: false,
      writesPolicy: false,
      writesConfirmedCrmFact: false,
    };
  });

  return {
    agentId: "asai.visit.preparation_package",
    actionId: "route-b-feedback-family-profile-advisor-context",
    registryReadiness: "internal-only",
    sourceAgentId: review.agentId,
    sourceActionId: review.actionId,
    items,
    unknownPrompts: grounding.unknownPrompts.map(sanitizeAdvisorContextText).filter(Boolean).slice(0, 6),
    summary: {
      itemCount: items.length,
      confirmedCount: items.filter((item) => item.status === "confirmed").length,
      inferenceCount: items.filter((item) => item.status === "inference").length,
      unknownCount: items.filter((item) => item.status === "unknown").length,
      profiledMemberCount: grounding.profiledMemberCount,
      fieldCount: grounding.fieldCount,
    },
    outputContract: {
      factsInferencesUnknownsSeparated: true,
      advisorContextOnly: true,
      requiresAdvisorConfirmation: true,
      doesNotOverwriteVisitFacts: true,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesClientProfile: false,
      writesPolicy: false,
      writesConfirmedCrmFact: false,
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      storesRawProviderPayload: false,
    },
    privacyProof: {
      rawMetadataReturned: false,
      sourceReferenceIdsReturned: false,
      rawPrivateTranscriptReturned: false,
      rawProviderPayloadReturned: false,
      rawTheaterSessionIdReturned: false,
      rawPersonIdReturned: false,
      personalContactReturned: false,
      policyNumberReturned: false,
    },
  };
}

export function selectVisitRouteBFeedbackAdvisorQuestionEvidence(
  context: VisitRouteBFeedbackAdvisorContext | undefined,
  maxItems = 2,
): VisitQuestionEvidence[] {
  if (!context) return [];

  const prioritizedItems = context.items
    .filter((item) => item.status === "unknown" || item.status === "inference")
    .slice(0, maxItems);
  const items = prioritizedItems.length ? prioritizedItems : context.items.slice(0, maxItems);

  return items.map((item): VisitQuestionEvidence => ({
    id: item.id,
    source: item.source,
    status: item.status,
    label: item.label,
    detail: `${item.detail} 下一題：${item.followUpQuestion}`,
  }));
}

function normalizeStatus(status: "confirmed" | "inference" | "unknown"): VisitQuestionEvidenceStatus {
  if (status === "confirmed") return "confirmed";
  if (status === "inference") return "inference";
  return "unknown";
}

function buildProfileDetail(input: {
  memberLabel: string;
  relationLabel: string;
  fieldLabel: string;
  status: VisitQuestionEvidenceStatus;
  valueSummary: string;
}) {
  const statusLabel =
    input.status === "confirmed" ? "已知但仍需現場確認是否沿用" : input.status === "inference" ? "推論待驗證" : "未知待補問";

  return `Route B 回饋把「${input.memberLabel}（${input.relationLabel}）」的「${input.fieldLabel}」標為${statusLabel}：${input.valueSummary}。這只能作為顧問追問脈絡，不得寫回 relationship graph、VisitPlan、client profile、policy 或 confirmed CRM fact。`;
}

function buildFollowUpQuestion(input: {
  memberLabel: string;
  relationLabel: string;
  fieldLabel: string;
  status: VisitQuestionEvidenceStatus;
  valueSummary: string;
}) {
  if (input.status === "unknown") {
    return `關於${input.memberLabel}（${input.relationLabel}）的${input.fieldLabel}，目前哪些資訊仍需要我們先確認？`;
  }

  if (input.status === "inference") {
    return `我先把${input.memberLabel}的${input.fieldLabel}視為推論：${input.valueSummary}。現場是否能確認或修正？`;
  }

  return `${input.memberLabel}的${input.fieldLabel}目前記錄為「${input.valueSummary}」，這次拜訪是否仍然正確？`;
}

function sanitizeAdvisorContextText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[removed]")
    .replace(/\b(?:policy|保單)[\s:#-]*[A-Z0-9-]{4,}\b/gi, "[removed]")
    .replace(/\b(?:rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment)\b/gi, "[removed]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}
