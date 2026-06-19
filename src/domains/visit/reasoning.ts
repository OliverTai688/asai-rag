import type { Client } from "../client/types";
import type {
  SpinQuestion,
  VisitPurpose,
  VisitQuestionEvidence,
  VisitQuestionReasoning,
} from "./types";

interface VisitQuestionReasoningContext {
  client: Client;
  purpose: VisitPurpose;
}

const PURPOSE_COPY: Record<VisitPurpose, string> = {
  FIRST_VISIT: "初訪需要先建立現況共識，再確認客戶是否願意揭露家庭與保障資訊。",
  ADD_ON: "加保拜訪要把既有保障、家庭責任與新增缺口放在同一張圖上檢視。",
  RENEWAL: "續約拜訪要確認原保障是否仍符合家庭與收入狀態，並釐清變更需求。",
  CARE: "關懷拜訪要先確認近況變化，再決定是否需要調整保障或服務節奏。",
  REFERRAL: "轉介紹拜訪要先理解信任來源與關係脈絡，再自然確認可協助的人。",
};

export function enrichSpinQuestionsWithReasoning(
  questions: SpinQuestion[],
  context: VisitQuestionReasoningContext,
): SpinQuestion[] {
  return questions.map((question, index) => ({
    ...question,
    reasoning: buildQuestionReasoning(question, index, context),
  }));
}

function buildQuestionReasoning(
  question: SpinQuestion,
  index: number,
  context: VisitQuestionReasoningContext,
): VisitQuestionReasoning {
  const evidence = selectEvidenceForQuestion(question.type, context);

  return {
    summary: buildSummary(question.type, context),
    evidence: evidence.map((item, evidenceIndex) => ({
      ...item,
      id: `${question.id || `q-${index + 1}`}-e${evidenceIndex + 1}`,
    })),
    confirmationPrompt: buildConfirmationPrompt(question.type),
  };
}

function buildSummary(type: SpinQuestion["type"], context: VisitQuestionReasoningContext) {
  const familyCount = context.client.family.length;
  const policyCount = context.client.existingPolicies.length;

  if (type === "S") {
    return familyCount > 0
      ? "先確認家庭角色與目前責任，避免直接跳到商品或方案。"
      : "先補齊家庭與決策背景，讓後續問題有現況依據。";
  }

  if (type === "P") {
    return policyCount > 0
      ? "既有保單只能代表過去配置，需要確認現在是否仍有缺口。"
      : "缺少保單資訊時，先把保障空白與客戶擔心的風險問清楚。";
  }

  if (type === "I") {
    return familyCount > 0
      ? "把家庭成員與收入責任連到風險後果，協助客戶看見不處理的影響。"
      : "把尚未確認的責任關係轉成後果問題，避免把推論當成事實。";
  }

  return "最後把客戶已承認的缺口轉成可執行下一步，而不是直接推銷商品。";
}

function selectEvidenceForQuestion(
  type: SpinQuestion["type"],
  context: VisitQuestionReasoningContext,
): VisitQuestionEvidence[] {
  const sharedEvidence = [
    buildPurposeEvidence(context.purpose),
    buildClientProfileEvidence(context.client),
  ];

  if (type === "S") {
    return [buildRelationshipEvidence(context.client), ...sharedEvidence].slice(0, 3);
  }

  if (type === "P") {
    return [buildPolicyEvidence(context.client), buildAiTagEvidence(context.client), ...sharedEvidence].slice(0, 3);
  }

  if (type === "I") {
    return [buildRelationshipEvidence(context.client), buildPolicyEvidence(context.client), buildAiTagEvidence(context.client)].slice(0, 3);
  }

  return [buildPurposeEvidence(context.purpose), buildPolicyEvidence(context.client), buildUnknownEvidence()].slice(0, 3);
}

function buildPurposeEvidence(purpose: VisitPurpose): VisitQuestionEvidence {
  return {
    id: "purpose",
    source: "visit_purpose",
    status: "inference",
    label: "拜訪目的",
    detail: PURPOSE_COPY[purpose],
  };
}

function buildClientProfileEvidence(client: Client): VisitQuestionEvidence {
  const parts = [
    client.occupation ? `職業：${client.occupation}` : null,
    client.annualIncome ? `年收入：約 ${formatCurrency(client.annualIncome)}` : null,
  ].filter(Boolean);

  return {
    id: "profile",
    source: "client_profile",
    status: parts.length > 0 ? "confirmed" : "unknown",
    label: "客戶輪廓",
    detail: parts.length > 0 ? parts.join("；") : "尚未確認職業、收入或主要責任來源。",
  };
}

function buildRelationshipEvidence(client: Client): VisitQuestionEvidence {
  const family = client.family.slice(0, 4).map((member) => `${member.relation} ${member.name}`);

  return {
    id: "relationship",
    source: "relationship_graph",
    status: family.length > 0 ? "confirmed" : "unknown",
    label: "關係圖",
    detail: family.length > 0 ? `已知關係人：${family.join("、")}` : "尚未建立可用的家庭或關係圖節點。",
  };
}

function buildPolicyEvidence(client: Client): VisitQuestionEvidence {
  const policies = client.existingPolicies.slice(0, 3).map((policy) => `${policy.provider} ${policy.type}`);

  return {
    id: "policy",
    source: "policy",
    status: policies.length > 0 ? "confirmed" : "unknown",
    label: "既有保障",
    detail: policies.length > 0 ? `已知保單：${policies.join("、")}` : "尚未確認既有保單，需先問出保障基準。",
  };
}

function buildAiTagEvidence(client: Client): VisitQuestionEvidence {
  return {
    id: "ai-tags",
    source: "ai_tag",
    status: client.aiTags.length > 0 ? "inference" : "unknown",
    label: "AI 缺口線索",
    detail: client.aiTags.length > 0 ? `可能缺口：${client.aiTags.slice(0, 4).join("、")}` : "目前沒有已整理的缺口標籤。",
  };
}

function buildUnknownEvidence(): VisitQuestionEvidence {
  return {
    id: "unknown",
    source: "unknown",
    status: "unknown",
    label: "待確認",
    detail: "此題需要顧問在現場確認客戶是否認同前面的推論。",
  };
}

function buildConfirmationPrompt(type: SpinQuestion["type"]) {
  if (type === "S") return "先確認這項現況是否仍正確。";
  if (type === "P") return "問完後標記這是否是真缺口、誤解或待補資料。";
  if (type === "I") return "避免替客戶放大恐懼，請確認他是否同意這個後果推論。";
  return "只有在客戶認同需求後，才把下一步整理成行動。";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "TWD",
  }).format(value);
}
