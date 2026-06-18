import {
  IssueCategory,
  IssueReadinessDefinition,
  IssueReadinessDimension,
  IssueReadinessInput,
  IssueReadinessLevel,
  IssueReadinessResult,
  PqQuestion,
} from "./types";

export const ISSUE_READINESS_LEVELS: IssueReadinessDefinition[] = [
  {
    level: 0,
    label: "不適用 / 無資料",
    systemMeaning: "此議題沒有可靠資料，或目前不適用。",
    allowedOutput: "不生成建議，只列為未評估。",
  },
  {
    level: 1,
    label: "線索存在",
    systemMeaning: "有模糊訊號，但缺基本事實。",
    allowedOutput: "只能產生追問題。",
  },
  {
    level: 2,
    label: "初步成形",
    systemMeaning: "已有基本事實，可形成初步 issue summary，但缺關鍵數字、決策者或既有保障。",
    allowedOutput: "產生追問清單與資料缺口。",
  },
  {
    level: 3,
    label: "可評估",
    systemMeaning: "事實足以描述問題，風險、缺口、決策脈絡大致清楚，但仍需確認至少一個高影響項。",
    allowedOutput: "可生成訪談策略草稿，並標記待確認。",
  },
  {
    level: 4,
    label: "策略就緒",
    systemMeaning: "需求、背景、決策者、可行性與合規注意事項清楚。",
    allowedOutput: "可生成客戶輪廓、對話準備卡、SPIN/PQ 題。",
  },
  {
    level: 5,
    label: "行動已確認",
    systemMeaning: "關鍵事實已確認，價值排序與下一步明確，顧問有可追蹤行動。",
    allowedOutput: "可生成正式準備包、劇場場景、追蹤任務。",
  },
];

export const ISSUE_READINESS_DIMENSIONS: Record<IssueReadinessDimension, string> = {
  FACT_COMPLETENESS: "事實完整度",
  PROBLEM_REPRESENTATION: "問題表徵品質",
  RISK_AND_COPING_APPRAISAL: "風險與因應評估",
  DECISION_READINESS: "決策準備度",
  ADVISOR_ACTIONABILITY: "顧問行動性",
};

export const ISSUE_CATEGORIES: IssueCategory[] = [
  {
    key: "family_protection",
    label: "家庭責任保障",
    primaryEvidence: ["家庭成員", "經濟支柱", "扶養責任", "債務"],
    typicalNextStep: "確認責任期間與必要月現金流。",
  },
  {
    key: "income_interruption",
    label: "收入中斷風險",
    primaryEvidence: ["職業", "收入穩定度", "緊急預備金", "失能或傷病風險"],
    typicalNextStep: "釐清可承受停工月數。",
  },
  {
    key: "medical_care",
    label: "醫療與長照準備",
    primaryEvidence: ["既有醫療保障", "家族照護經驗", "長照責任"],
    typicalNextStep: "確認自費醫療與長照預算。",
  },
  {
    key: "retirement_cashflow",
    label: "退休與現金流",
    primaryEvidence: ["年齡", "退休目標", "儲蓄率", "資產配置"],
    typicalNextStep: "盤點退休收入來源與缺口。",
  },
  {
    key: "education_dependents",
    label: "子女教育 / 依賴者",
    primaryEvidence: ["子女年齡", "教育期程", "照顧安排"],
    typicalNextStep: "確認目標金額與時間。",
  },
  {
    key: "policy_clarity",
    label: "既有保單理解",
    primaryEvidence: ["保單清單", "保障內容", "重複或缺口"],
    typicalNextStep: "建立保單摘要與缺口表。",
  },
  {
    key: "decision_alignment",
    label: "決策一致性",
    primaryEvidence: ["共同決策者", "價值排序", "顧慮"],
    typicalNextStep: "安排共同討論或補資料。",
  },
  {
    key: "compliance_readiness",
    label: "合規與資料完整",
    primaryEvidence: ["KYC", "敏感資料同意", "錄音或揭露需求"],
    typicalNextStep: "補齊合規欄位與同意紀錄。",
  },
];

export const PQ_QUESTION_BANK: PqQuestion[] = [
  {
    id: "family-protection-dependents",
    issueKey: "family_protection",
    text: "目前家中有哪些人主要依靠你的收入或照顧？",
    followUp: "若你暫時無法工作，誰會最先受到影響？",
    dimensions: ["FACT_COMPLETENESS", "RISK_AND_COPING_APPRAISAL"],
  },
  {
    id: "family-protection-duration",
    issueKey: "family_protection",
    text: "你希望家人在發生重大事件時，至少維持多久的生活穩定？",
    followUp: "這段期間每月大概需要多少現金流？",
    dimensions: ["RISK_AND_COPING_APPRAISAL", "ADVISOR_ACTIONABILITY"],
  },
  {
    id: "family-protection-decision-party",
    issueKey: "family_protection",
    text: "家裡重大財務決策通常由誰一起討論？",
    followUp: "下一次若談到保障安排，誰需要在場？",
    dimensions: ["DECISION_READINESS"],
  },
  {
    id: "income-interruption-reserve",
    issueKey: "income_interruption",
    text: "如果收入中斷 3-6 個月，現在的預備金能支撐多久？",
    followUp: "哪些支出最難降低？",
    dimensions: ["FACT_COMPLETENESS", "RISK_AND_COPING_APPRAISAL"],
  },
  {
    id: "income-interruption-volatility",
    issueKey: "income_interruption",
    text: "你的收入比較固定，還是受業績或案量影響？",
    followUp: "最近一年收入波動大概落在哪個範圍？",
    dimensions: ["FACT_COMPLETENESS"],
  },
  {
    id: "medical-care-policy-clarity",
    issueKey: "medical_care",
    text: "你目前對自己的醫療保障內容有多清楚？",
    followUp: "哪些項目你不確定有沒有理賠？",
    dimensions: ["FACT_COMPLETENESS", "DECISION_READINESS"],
  },
  {
    id: "medical-care-family-experience",
    issueKey: "medical_care",
    text: "家中是否有照顧長輩或重大醫療支出的經驗？",
    followUp: "那次經驗中最吃力的是費用、時間還是人力？",
    dimensions: ["RISK_AND_COPING_APPRAISAL", "PROBLEM_REPRESENTATION"],
  },
  {
    id: "retirement-cashflow-target",
    issueKey: "retirement_cashflow",
    text: "你心中理想退休年齡和每月生活費大概是多少？",
    followUp: "這個數字包含房貸、醫療或孝親嗎？",
    dimensions: ["FACT_COMPLETENESS", "PROBLEM_REPRESENTATION"],
  },
  {
    id: "retirement-cashflow-risk-preference",
    issueKey: "retirement_cashflow",
    text: "你偏好穩定現金流，還是願意接受波動換取成長？",
    followUp: "過去投資或保單經驗讓你更保守還是更積極？",
    dimensions: ["RISK_AND_COPING_APPRAISAL", "DECISION_READINESS"],
  },
  {
    id: "education-dependents-responsibility",
    issueKey: "education_dependents",
    text: "對子女教育或家人照顧，你有沒有一定想完成的責任？",
    followUp: "這個責任大概會持續到什麼時間點？",
    dimensions: ["FACT_COMPLETENESS", "RISK_AND_COPING_APPRAISAL"],
  },
  {
    id: "policy-clarity-known-unknown",
    issueKey: "policy_clarity",
    text: "你現在手上的保單，哪些是你很清楚用途的？",
    followUp: "哪些是買了但不確定還適不適合的？",
    dimensions: ["FACT_COMPLETENESS", "DECISION_READINESS"],
  },
  {
    id: "decision-alignment-blocker",
    issueKey: "decision_alignment",
    text: "過去做保險決策時，最讓你卡住的是價格、信任、條款，還是家人意見？",
    followUp: "這次若要往前一步，哪個卡點要先處理？",
    dimensions: ["DECISION_READINESS", "ADVISOR_ACTIONABILITY"],
  },
];

export function getIssueReadinessLevel(level: IssueReadinessLevel): IssueReadinessDefinition {
  return ISSUE_READINESS_LEVELS.find((definition) => definition.level === level) ?? ISSUE_READINESS_LEVELS[0];
}

export function getPqQuestionsByIssue(issueKey: string): PqQuestion[] {
  return PQ_QUESTION_BANK.filter((question) => question.issueKey === issueKey);
}

export function evaluateIssueReadiness(input: IssueReadinessInput): IssueReadinessResult {
  const hasConfirmedEvidence = input.evidenceKinds.includes("CONFIRMED");
  const hasAnyReliableEvidence = input.evidenceKinds.some((kind) => kind === "FACT" || kind === "CONFIRMED");
  const missingDimensions: IssueReadinessDimension[] = [];

  if (input.knownFactsCount === 0 || !hasAnyReliableEvidence) missingDimensions.push("FACT_COMPLETENESS");
  if (!input.hasProblemRepresentation) missingDimensions.push("PROBLEM_REPRESENTATION");
  if (!input.hasRiskAndCopingAppraisal) missingDimensions.push("RISK_AND_COPING_APPRAISAL");
  if (!input.hasDecisionContext) missingDimensions.push("DECISION_READINESS");
  if (!input.hasAdvisorNextStep) missingDimensions.push("ADVISOR_ACTIONABILITY");

  let level: IssueReadinessLevel = 0;
  if (hasAnyReliableEvidence) level = 1;
  if (input.knownFactsCount >= 2 && input.hasProblemRepresentation) level = 2;
  if (input.knownFactsCount >= 3 && input.hasProblemRepresentation && input.hasRiskAndCopingAppraisal) level = 3;
  if (level >= 3 && input.hasDecisionContext && input.hasAdvisorNextStep) level = 4;
  if (level >= 4 && hasConfirmedEvidence && missingDimensions.length === 0) level = 5;

  const definition = getIssueReadinessLevel(level);

  return {
    issueKey: input.issueKey,
    level,
    label: definition.label,
    missingDimensions,
  };
}
