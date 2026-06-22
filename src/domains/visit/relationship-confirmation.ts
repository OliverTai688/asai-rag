import {
  buildClientRelationshipGraphReview,
  type ClientRelationshipGraphReview,
  type RelationshipGraphEdge,
  type RelationshipGraphFactStatus,
  type RelationshipGraphField,
  type RelationshipGraphPersonNode,
} from "../client/relationship-graph";
import type { Client } from "../client/types";
import type { VisitQuestionEvidenceStatus } from "./types";

export type VisitRelationshipConfirmationAction =
  | "CONFIRM_FACT"
  | "VERIFY_INFERENCE"
  | "ASK_OPEN_QUESTION";

export type VisitRelationshipConfirmationPriority = "HIGH" | "MEDIUM" | "LOW";

export type VisitRelationshipConfirmationCardKind =
  | "person_role"
  | "person_field"
  | "relationship_edge"
  | "suggested_question";

export interface VisitRelationshipConfirmationCard {
  id: string;
  kind: VisitRelationshipConfirmationCardKind;
  title: string;
  personName?: string;
  relation?: string;
  evidenceStatus: VisitQuestionEvidenceStatus;
  sourceLabel: string;
  evidenceDetail: string;
  confirmationPrompt: string;
  action: VisitRelationshipConfirmationAction;
  priority: VisitRelationshipConfirmationPriority;
  sourceReferenceIds: string[];
  guardrails: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesConfirmedCrmFact: false;
    storesRawProviderPayload: false;
    rawPrivateTranscriptIncluded: false;
  };
}

export interface VisitRelationshipConfirmationDeck {
  agentId: "asai.visit.preparation_package";
  sourceActionId: "relationship-graph-prep-confirmation-cards";
  clientId: string;
  graphVersion: string;
  generatedAt: string;
  summary: {
    cardCount: number;
    factCount: number;
    inferenceCount: number;
    unknownCount: number;
    highPriorityCount: number;
    sourceNodeCount: number;
    sourceEdgeCount: number;
  };
  cards: VisitRelationshipConfirmationCard[];
  proof: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesConfirmedCrmFact: false;
    storesRawProviderPayload: false;
    rawPrivateTranscriptIncluded: false;
    externalRegistryPublication: false;
  };
}

type GraphFieldKey = keyof RelationshipGraphPersonNode["fields"];

const FIELD_LABELS: Record<GraphFieldKey, string> = {
  jobTitle: "職位",
  annualIncome: "年薪",
  status: "狀態",
  relationshipContext: "關係脈絡",
};

const ACTION_LABELS: Record<VisitRelationshipConfirmationAction, string> = {
  CONFIRM_FACT: "請用一句話確認這項既有資料仍正確。",
  VERIFY_INFERENCE: "請確認這只是推論，現場需觀察或詢問後再使用。",
  ASK_OPEN_QUESTION: "請改用開放式問題補齊，不要把未知當成事實。",
};

const PRIORITY_SCORE: Record<VisitRelationshipConfirmationPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const STATUS_SCORE: Record<VisitQuestionEvidenceStatus, number> = {
  unknown: 3,
  inference: 2,
  confirmed: 1,
};

const MAX_CONFIRMATION_CARDS = 8;

export function buildVisitRelationshipConfirmationDeck(
  client: Client,
  now = new Date().toISOString(),
): VisitRelationshipConfirmationDeck {
  const graph = buildClientRelationshipGraphReview(client, now);
  const cards = sortConfirmationCards([
    ...buildRoleCards(graph),
    ...buildFieldCards(graph),
    ...buildEdgeCards(graph),
    ...buildSuggestedQuestionCards(graph),
  ]).slice(0, MAX_CONFIRMATION_CARDS);

  return {
    agentId: "asai.visit.preparation_package",
    sourceActionId: "relationship-graph-prep-confirmation-cards",
    clientId: client.id,
    graphVersion: graph.version,
    generatedAt: now,
    summary: {
      cardCount: cards.length,
      factCount: cards.filter((card) => card.evidenceStatus === "confirmed").length,
      inferenceCount: cards.filter((card) => card.evidenceStatus === "inference").length,
      unknownCount: cards.filter((card) => card.evidenceStatus === "unknown").length,
      highPriorityCount: cards.filter((card) => card.priority === "HIGH").length,
      sourceNodeCount: graph.sourceSummary.nodeCount,
      sourceEdgeCount: graph.sourceSummary.edgeCount,
    },
    cards,
    proof: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      externalRegistryPublication: false,
    },
  };
}

function buildRoleCards(graph: ClientRelationshipGraphReview): VisitRelationshipConfirmationCard[] {
  return graph.nodes
    .filter((node) => node.nodeKey !== "primary")
    .filter((node) => node.roleFactStatus !== "FACT")
    .map((node) =>
      card({
        id: `role.${node.nodeKey}`,
        kind: "person_role",
        title: `${node.displayName} 的決策角色`,
        personName: node.displayName,
        relation: node.relation,
        factStatus: node.roleFactStatus,
        sourceLabel: node.roleLabel,
        evidenceDetail: node.roleRationale,
        confirmationPrompt: `${node.displayName} 是否真的是「${node.roleLabel}」？${ACTION_LABELS[resolveAction(node.roleFactStatus)]}`,
        priority: node.role === "DECISION_MAKER" || node.role === "DEPENDENT" ? "HIGH" : "MEDIUM",
        sourceReferenceIds: node.sourceReferenceIds,
      }),
    );
}

function buildFieldCards(graph: ClientRelationshipGraphReview): VisitRelationshipConfirmationCard[] {
  return graph.nodes.flatMap((node) =>
    (Object.entries(node.fields) as Array<[GraphFieldKey, RelationshipGraphField]>)
      .filter(([, field]) => field.factStatus !== "FACT")
      .map(([fieldKey, field]) =>
        card({
          id: `field.${node.nodeKey}.${fieldKey}`,
          kind: "person_field",
          title: `${node.displayName} 的${FIELD_LABELS[fieldKey]}`,
          personName: node.displayName,
          relation: node.relation,
          factStatus: field.factStatus,
          sourceLabel: field.label,
          evidenceDetail: field.rationale ? `${field.value}；${field.rationale}` : field.value,
          confirmationPrompt: `${node.displayName} 的${FIELD_LABELS[fieldKey]}目前標記為「${field.value}」。${ACTION_LABELS[resolveAction(field.factStatus)]}`,
          priority: resolveFieldPriority(node, fieldKey, field.factStatus),
          sourceReferenceIds: field.sourceReferenceIds,
        }),
      ),
  );
}

function buildEdgeCards(graph: ClientRelationshipGraphReview): VisitRelationshipConfirmationCard[] {
  return graph.edges
    .filter((edge) => edge.factStatus !== "FACT")
    .map((edge) => {
      const sourceNode = graph.nodes.find((node) => node.nodeKey === edge.sourceNodeKey);
      const targetNode = graph.nodes.find((node) => node.nodeKey === edge.targetNodeKey);
      const sourceName = sourceNode?.displayName ?? edge.sourceNodeKey;
      const targetName = targetNode?.displayName ?? edge.targetNodeKey;

      return card({
        id: `edge.${edge.edgeKey}`,
        kind: "relationship_edge",
        title: `${sourceName} ↔ ${targetName}`,
        personName: targetNode?.displayName,
        relation: edge.label,
        factStatus: edge.factStatus,
        sourceLabel: "關係連線",
        evidenceDetail: edge.rationale,
        confirmationPrompt: `請確認 ${sourceName} 與 ${targetName} 的「${edge.label}」關係脈絡。${ACTION_LABELS[resolveAction(edge.factStatus)]}`,
        priority: isDecisionEdge(edge, targetNode) ? "HIGH" : "MEDIUM",
        sourceReferenceIds: edge.sourceReferenceIds,
      });
    });
}

function buildSuggestedQuestionCards(graph: ClientRelationshipGraphReview): VisitRelationshipConfirmationCard[] {
  return graph.suggestedQuestions.slice(0, 3).map((question, index) =>
    card({
      id: `suggested-question.${index + 1}`,
      kind: "suggested_question",
      title: "關係圖追問",
      factStatus: "UNKNOWN",
      sourceLabel: "建議問題",
      evidenceDetail: question,
      confirmationPrompt: `把這題放進現場確認清單：${question}`,
      priority: index === 0 ? "HIGH" : "MEDIUM",
      sourceReferenceIds: ["relationship_graph.suggested_question"],
    }),
  );
}

function card(input: {
  id: string;
  kind: VisitRelationshipConfirmationCardKind;
  title: string;
  personName?: string;
  relation?: string;
  factStatus: RelationshipGraphFactStatus;
  sourceLabel: string;
  evidenceDetail: string;
  confirmationPrompt: string;
  priority: VisitRelationshipConfirmationPriority;
  sourceReferenceIds: string[];
}): VisitRelationshipConfirmationCard {
  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    personName: input.personName,
    relation: input.relation,
    evidenceStatus: toVisitEvidenceStatus(input.factStatus),
    sourceLabel: input.sourceLabel,
    evidenceDetail: input.evidenceDetail,
    confirmationPrompt: input.confirmationPrompt,
    action: resolveAction(input.factStatus),
    priority: input.priority,
    sourceReferenceIds: input.sourceReferenceIds,
    guardrails: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
    },
  };
}

function sortConfirmationCards(cards: VisitRelationshipConfirmationCard[]) {
  return [...cards].sort((left, right) => {
    const priorityDiff = PRIORITY_SCORE[right.priority] - PRIORITY_SCORE[left.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const statusDiff = STATUS_SCORE[right.evidenceStatus] - STATUS_SCORE[left.evidenceStatus];
    if (statusDiff !== 0) return statusDiff;

    return left.id.localeCompare(right.id);
  });
}

function resolveFieldPriority(
  node: RelationshipGraphPersonNode,
  fieldKey: GraphFieldKey,
  factStatus: RelationshipGraphFactStatus,
): VisitRelationshipConfirmationPriority {
  if (fieldKey === "annualIncome" && (node.nodeKey === "primary" || node.role === "DECISION_MAKER")) {
    return "HIGH";
  }

  if (fieldKey === "relationshipContext" || node.role === "DECISION_MAKER") {
    return factStatus === "UNKNOWN" ? "HIGH" : "MEDIUM";
  }

  if (fieldKey === "status") {
    return "MEDIUM";
  }

  return factStatus === "UNKNOWN" ? "MEDIUM" : "LOW";
}

function isDecisionEdge(edge: RelationshipGraphEdge, targetNode?: RelationshipGraphPersonNode) {
  return edge.label.includes("配偶") || targetNode?.role === "DECISION_MAKER" || targetNode?.role === "DEPENDENT";
}

function resolveAction(status: RelationshipGraphFactStatus): VisitRelationshipConfirmationAction {
  if (status === "FACT") return "CONFIRM_FACT";
  if (status === "INFERENCE") return "VERIFY_INFERENCE";
  return "ASK_OPEN_QUESTION";
}

function toVisitEvidenceStatus(status: RelationshipGraphFactStatus): VisitQuestionEvidenceStatus {
  if (status === "FACT") return "confirmed";
  if (status === "INFERENCE") return "inference";
  return "unknown";
}
