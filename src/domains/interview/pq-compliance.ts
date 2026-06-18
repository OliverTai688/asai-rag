import { ComplianceFieldDefinition, ComplianceFieldKey, PqComplianceMapping } from "./types";

export const COMPLIANCE_FIELD_SET: ComplianceFieldDefinition[] = [
  {
    key: "solicitation_context",
    label: "招攬經過",
    minimumData: ["來源", "關係", "接觸契機", "對話目的"],
    evidenceKinds: ["FACT", "UNKNOWN"],
    pqIntent: "釐清為何拜訪",
  },
  {
    key: "identity_relationship",
    label: "身分與關係",
    minimumData: ["要保人", "被保險人", "受益人", "關係"],
    evidenceKinds: ["FACT", "CONFIRMED"],
    pqIntent: "確認角色與責任",
  },
  {
    key: "insurance_purpose_need",
    label: "投保目的與需求",
    minimumData: ["保障目的", "醫療/長照/退休/家庭責任", "價值排序"],
    evidenceKinds: ["FACT", "INFERENCE", "CONFIRMED"],
    pqIntent: "釐清需求與價值",
  },
  {
    key: "income_financial_status",
    label: "收入與財務狀況",
    minimumData: ["工作收入", "其他收入", "現金流", "保費負擔能力"],
    evidenceKinds: ["FACT", "UNKNOWN"],
    pqIntent: "評估 risk capacity",
  },
  {
    key: "existing_commercial_insurance",
    label: "既有商業保險",
    minimumData: ["保單種類", "保額", "缺口", "不確定項"],
    evidenceKinds: ["FACT", "UNKNOWN"],
    pqIntent: "避免重複或缺口",
  },
  {
    key: "recent_policy_actions",
    label: "近期保單/借貸動作",
    minimumData: ["三個月內解約", "貸款", "保單借款"],
    evidenceKinds: ["FACT", "UNKNOWN"],
    pqIntent: "防止不當替換與財務壓力",
  },
  {
    key: "primary_economic_provider",
    label: "家中主要經濟來源者",
    minimumData: ["經濟支柱", "依賴者", "扶養責任"],
    evidenceKinds: ["FACT", "INFERENCE"],
    pqIntent: "家庭保障責任",
  },
  {
    key: "beneficiary_reasonableness",
    label: "受益人合理性",
    minimumData: ["受益人", "與被保險人關係", "非直系/配偶原因"],
    evidenceKinds: ["FACT", "UNKNOWN"],
    pqIntent: "身故保障與倫理",
  },
  {
    key: "senior_suitability",
    label: "高齡適合性",
    minimumData: ["65+ 辨識能力", "不利因素理解", "商品適合理由"],
    evidenceKinds: ["FACT", "CONFIRMED"],
    pqIntent: "高齡關懷與風險揭露",
  },
  {
    key: "product_understanding",
    label: "商品理解",
    minimumData: ["承保範圍", "除外不保", "商品風險"],
    evidenceKinds: ["CONFIRMED", "UNKNOWN"],
    pqIntent: "KYP / disclosure",
  },
  {
    key: "risk_tolerance_capacity",
    label: "風險承受與能力",
    minimumData: ["投資屬性", "波動接受度", "保費負擔", "流動性"],
    evidenceKinds: ["FACT", "INFERENCE"],
    pqIntent: "投資型/長期繳費適合度",
  },
  {
    key: "advisor_compliance_notes",
    label: "業務員補充說明",
    minimumData: ["特殊情境", "有利核保資訊", "需法遵確認事項"],
    evidenceKinds: ["FACT", "INFERENCE", "UNKNOWN"],
    pqIntent: "補足特殊情境",
  },
];

export const PQ_COMPLIANCE_MAPPINGS: PqComplianceMapping[] = [
  {
    intentKey: "clarify_visit_trigger",
    complianceFieldKey: "solicitation_context",
    defaultQuestion: "你這次想找這位客戶談，是最近有什麼契機嗎？",
    allowedRewrite: true,
    evidenceKind: "FACT",
    requiresConfirmationBeforeWriteback: true,
    riskFlags: [],
  },
  {
    intentKey: "identify_dependents",
    complianceFieldKey: "primary_economic_provider",
    defaultQuestion: "目前家中有哪些人主要依靠他的收入或照顧？",
    allowedRewrite: true,
    evidenceKind: "INFERENCE",
    requiresConfirmationBeforeWriteback: true,
    riskFlags: ["family_dependency"],
  },
  {
    intentKey: "estimate_income_resilience",
    complianceFieldKey: "income_financial_status",
    defaultQuestion: "如果收入中斷 3-6 個月，現在預備金能撐多久？",
    allowedRewrite: true,
    evidenceKind: "FACT",
    requiresConfirmationBeforeWriteback: true,
    riskFlags: ["sensitive_financial_data"],
  },
  {
    intentKey: "review_existing_coverage",
    complianceFieldKey: "existing_commercial_insurance",
    defaultQuestion: "他現在有哪些保險？哪些內容你很確定？",
    allowedRewrite: true,
    evidenceKind: "UNKNOWN",
    requiresConfirmationBeforeWriteback: true,
    riskFlags: ["do_not_fabricate_policy"],
  },
  {
    intentKey: "detect_recent_policy_actions",
    complianceFieldKey: "recent_policy_actions",
    defaultQuestion: "最近三個月是否有解約、貸款或保單借款？",
    allowedRewrite: true,
    evidenceKind: "UNKNOWN",
    requiresConfirmationBeforeWriteback: true,
    riskFlags: ["replacement_risk", "loan_or_surrender_risk"],
  },
  {
    intentKey: "understand_decision_party",
    complianceFieldKey: "identity_relationship",
    defaultQuestion: "這類保障安排通常誰會一起決定？",
    allowedRewrite: true,
    evidenceKind: "INFERENCE",
    requiresConfirmationBeforeWriteback: true,
    riskFlags: ["decision_alignment"],
  },
  {
    intentKey: "assess_product_understanding",
    complianceFieldKey: "product_understanding",
    defaultQuestion: "若下一步談方案，他需要先理解哪些保障範圍或除外事項？",
    allowedRewrite: true,
    evidenceKind: "CONFIRMED",
    requiresConfirmationBeforeWriteback: true,
    riskFlags: ["kyp_disclosure"],
  },
  {
    intentKey: "senior_suitability_check",
    complianceFieldKey: "senior_suitability",
    defaultQuestion: "若客戶 65 歲以上，他是否能理解商品的不利因素與長期承諾？",
    allowedRewrite: true,
    evidenceKind: "CONFIRMED",
    requiresConfirmationBeforeWriteback: true,
    riskFlags: ["senior_customer", "requires_audit_note"],
  },
];

export function getComplianceField(key: ComplianceFieldKey): ComplianceFieldDefinition | undefined {
  return COMPLIANCE_FIELD_SET.find((field) => field.key === key);
}

export function getPqComplianceMapping(intentKey: string): PqComplianceMapping | undefined {
  return PQ_COMPLIANCE_MAPPINGS.find((mapping) => mapping.intentKey === intentKey);
}

export function deriveComplianceGaps(availableFieldKeys: ComplianceFieldKey[]): ComplianceFieldDefinition[] {
  const available = new Set(availableFieldKeys);
  return COMPLIANCE_FIELD_SET.filter((field) => !available.has(field.key));
}
