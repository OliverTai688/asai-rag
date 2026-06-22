import type { TheaterRouteBCharacterRole } from "./route-b-handoff";

export const ROUTE_B_OBJECTION_IDS = [
  "TIME_PRESSURE",
  "PREMIUM_BURDEN",
  "TRUST_AND_TRANSPARENCY",
  "NEED_CLARITY",
  "FAMILY_ALIGNMENT",
  "PRODUCT_COMPLEXITY",
  "HEALTH_OR_UNDERWRITING",
  "PAST_BAD_EXPERIENCE",
  "LIQUIDITY_CONCERN",
  "DECISION_DEFERRAL",
  "COMPARISON_SHOPPING",
  "PRIVACY_SENSITIVITY",
] as const;

export const ROUTE_B_RED_LINE_IDS = [
  "SIGNATURE_SUBSTITUTION",
  "PREMIUM_ADVANCE",
  "GUARANTEED_RETURN",
  "UNLICENSED_FUNDRAISING",
  "PRODUCT_BEFORE_KYC",
  "FALSE_MEDICAL_DISCLOSURE",
  "MISREPRESENTED_POLICY_TERMS",
  "PRESSURED_SURRENDER_OR_REPLACEMENT",
  "UNAUTHORIZED_RECORDING_OR_SHARING",
  "BORROWED_IDENTITY_OR_ACCOUNT",
  "UNAPPROVED_REBATE_OR_KICKBACK",
  "UNSUITABLE_HIGH_RISK_RECOMMENDATION",
  "CLAIM_ASSISTANCE_PROMISE",
  "BLANK_FORM_OR_INCOMPLETE_FORM",
  "HIDDEN_FEES_OR_CHARGES",
  "MISLEADING_TAX_OR_LEGAL_ADVICE",
  "CLIENT_FUNDS_HANDLED_PERSONALLY",
  "PRIVATE_DATA_OVEREXPOSURE",
] as const;

export type RouteBObjectionId = (typeof ROUTE_B_OBJECTION_IDS)[number];
export type RouteBRedLineRuleId = (typeof ROUTE_B_RED_LINE_IDS)[number];
export type RouteBRedLineSeverity = "SEVERE" | "STANDARD";
export type RouteBRedLineDetectionMode = "IMMEDIATE" | "POST_REVIEW";

export interface RouteBObjectionPrompt {
  id: RouteBObjectionId;
  label: string;
  sampleClientLines: string[];
  underlyingConcern: string;
  advisorResponseDirection: string;
  applicableRoles: TheaterRouteBCharacterRole[];
  triggerSignals: string[];
  factBoundary: "roleplay-inference-not-confirmed-fact";
}

export interface RouteBRedLineRule {
  id: RouteBRedLineRuleId;
  label: string;
  severity: RouteBRedLineSeverity;
  detectionMode: RouteBRedLineDetectionMode;
  triggerSignals: string[];
  evidencePolicy: "requires-evidence-or-mark-not-applicable";
  falsePositiveHandling: "can-mark-not-applicable-but-keep-audit-record";
  advisorReminder: string;
  legalAdviceIncluded: false;
  writesConfirmedCrmFact: false;
}

export interface TheaterRouteBSevereRedLine {
  id:
    | "SIGNATURE_SUBSTITUTION"
    | "PREMIUM_ADVANCE"
    | "GUARANTEED_RETURN"
    | "UNLICENSED_FUNDRAISING"
    | "PRODUCT_BEFORE_KYC";
  label: string;
  severity: "SEVERE";
  detectionMode: "IMMEDIATE";
  triggerSignals: string[];
  evidencePolicy: "requires-evidence-or-mark-not-applicable";
  falsePositiveHandling: "can-mark-not-applicable-but-keep-audit-record";
  advisorReminder: string;
  legalAdviceIncluded: false;
  writesConfirmedCrmFact: false;
}

export interface RouteBObjectionSelectionInput {
  role?: TheaterRouteBCharacterRole;
  personaHints?: string[];
  unknowns?: string[];
  maxItems?: number;
}

export interface RouteBObjectionRedLineLibrarySummary {
  agentId: "asai.theater.route_b";
  actionId: "route-b-objection-red-line-library";
  registryReadiness: "internal-only";
  objectionPromptCount: number;
  redLineRuleCount: number;
  severeRedLineCount: number;
  standardRedLineCount: number;
  immediateDetectionIds: RouteBRedLineRuleId[];
  postReviewDetectionIds: RouteBRedLineRuleId[];
  severeLabels: string[];
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    providerEnablementRequiresSuccessErrorAiUsageLog: true;
  };
  auditBoundary: {
    canMarkNotApplicable: true;
    keepsAuditRecordWhenNotApplicable: true;
    legalAdviceIncluded: false;
    writesConfirmedCrmFact: false;
  };
}

export interface RouteBRedLineReviewFindingPlan {
  redLineId: RouteBRedLineRuleId;
  label: string;
  severity: RouteBRedLineSeverity;
  detectionMode: RouteBRedLineDetectionMode;
  status: "NEEDS_REVIEW" | "NOT_APPLICABLE";
  evidenceBasis: string;
  notApplicableReason?: string;
}

export const ROUTE_B_OBJECTION_LIBRARY: RouteBObjectionPrompt[] = [
  {
    id: "TIME_PRESSURE",
    label: "時間壓力",
    sampleClientLines: ["我今天時間不多，可以快一點嗎？", "這個之後再說好了。"],
    underlyingConcern: "擔心談話失控、資訊太多，或當下沒有決策空間。",
    advisorResponseDirection: "先縮小本次目標，確認只處理一個最重要問題，並約定下一步。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "INFLUENCER"],
    triggerSignals: ["忙", "下次", "快一點", "沒有時間", "先不要"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "PREMIUM_BURDEN",
    label: "保費負擔",
    sampleClientLines: ["每個月多一筆保費會不會太重？", "我怕之後繳不下去。"],
    underlyingConcern: "現金流、長期承諾與家庭支出排序不清楚。",
    advisorResponseDirection: "回到可負擔範圍與優先順序，先討論保障缺口而不是商品額度。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "DEPENDENT"],
    triggerSignals: ["保費", "繳不下去", "現金流", "太貴", "負擔"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "TRUST_AND_TRANSPARENCY",
    label: "信任與透明",
    sampleClientLines: ["你是不是只是想賣我一張保單？", "這裡面有沒有我沒看到的成本？"],
    underlyingConcern: "擔心被推銷、資訊不對稱、或利益揭露不足。",
    advisorResponseDirection: "主動說明顧問角色、比較基準與待確認資料，避免承諾未驗證利益。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "INFLUENCER"],
    triggerSignals: ["只是想賣", "透明", "佣金", "成本", "不相信"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "NEED_CLARITY",
    label: "需求不明確",
    sampleClientLines: ["我其實不知道自己缺什麼。", "先不用幫我規劃那麼多。"],
    underlyingConcern: "尚未理解風險情境，也未建立決策標準。",
    advisorResponseDirection: "用一個生活場景釐清風險與影響，先形成待確認問題清單。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "NARRATOR"],
    triggerSignals: ["不知道", "不確定", "不用規劃", "看不出來", "沒想過"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "FAMILY_ALIGNMENT",
    label: "家庭共識",
    sampleClientLines: ["這件事要跟另一半討論。", "我爸媽可能不會同意。"],
    underlyingConcern: "家庭決策者、影響者與實際付款者尚未對齊。",
    advisorResponseDirection: "辨識誰需要參與下一次討論，先建立共同問題而不是逼迫單人決定。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "INFLUENCER", "DEPENDENT"],
    triggerSignals: ["另一半", "家人", "爸媽", "小孩", "不同意"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "PRODUCT_COMPLEXITY",
    label: "商品複雜",
    sampleClientLines: ["我聽不懂這些條款差在哪。", "保障和投資到底怎麼分？"],
    underlyingConcern: "術語過多、商品結構與保障目的混在一起。",
    advisorResponseDirection: "把商品拆成保障目的、費用、限制與待確認事項，不用話術掩蓋不確定。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER"],
    triggerSignals: ["聽不懂", "條款", "差在哪", "投資", "保障"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "HEALTH_OR_UNDERWRITING",
    label: "健康與核保",
    sampleClientLines: ["我以前有病史，會不會很麻煩？", "這些健康資料一定要講嗎？"],
    underlyingConcern: "擔心揭露健康狀況後被拒保或費率變高。",
    advisorResponseDirection: "提醒誠實揭露與核保流程，不能引導隱匿或替客戶判斷可不填。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER"],
    triggerSignals: ["病史", "體檢", "核保", "健康告知", "不想講"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "PAST_BAD_EXPERIENCE",
    label: "過往負面經驗",
    sampleClientLines: ["我以前買過，理賠時很不舒服。", "之前的業務都講得很好聽。"],
    underlyingConcern: "曾被誤導、理賠體驗不佳或對保險產生防衛。",
    advisorResponseDirection: "先承認經驗造成的不信任，釐清當時發生什麼，再談本次決策標準。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "INFLUENCER"],
    triggerSignals: ["以前買過", "理賠", "不舒服", "被騙", "講得很好聽"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "LIQUIDITY_CONCERN",
    label: "資金流動性",
    sampleClientLines: ["如果臨時要用錢怎麼辦？", "我不想錢被卡住太久。"],
    underlyingConcern: "擔心資金鎖定、解約成本或未來支出變動。",
    advisorResponseDirection: "先確認緊急預備金與資金用途，再討論保障配置的可調整性。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER"],
    triggerSignals: ["用錢", "卡住", "解約", "流動", "預備金"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "DECISION_DEFERRAL",
    label: "延後決策",
    sampleClientLines: ["我再想想。", "等明年收入比較穩再說。"],
    underlyingConcern: "不想承諾、風險急迫性不足或資訊還沒被整理成決策。",
    advisorResponseDirection: "尊重延後，但把延後前需要確認的風險與資料列成下一步。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "NARRATOR"],
    triggerSignals: ["再想想", "明年", "之後", "等穩定", "不急"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "COMPARISON_SHOPPING",
    label: "比較與比價",
    sampleClientLines: ["我想再問別家看看。", "網路上是不是有更便宜的？"],
    underlyingConcern: "需要比較標準，不只是價格，也包含保障、限制與服務。",
    advisorResponseDirection: "建立比較表的評估欄位，避免用保證或貶低競品取得信任。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "INFLUENCER"],
    triggerSignals: ["別家", "比較", "便宜", "網路", "方案"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
  {
    id: "PRIVACY_SENSITIVITY",
    label: "隱私敏感",
    sampleClientLines: ["這些家庭資料一定要講這麼細嗎？", "我不想讓家人知道這段。"],
    underlyingConcern: "擔心家庭、財務、健康或私聊資訊被不當揭露。",
    advisorResponseDirection: "說明資料使用邊界與可不回答選項，私聊內容回群聊前需先確認。",
    applicableRoles: ["FOCUS_CLIENT", "DECISION_MAKER", "DEPENDENT", "NARRATOR"],
    triggerSignals: ["隱私", "家人知道", "不要講", "資料", "私下"],
    factBoundary: "roleplay-inference-not-confirmed-fact",
  },
];

export const ROUTE_B_RED_LINE_RULES: RouteBRedLineRule[] = [
  severe("SIGNATURE_SUBSTITUTION", "代簽", ["幫你簽", "我代簽", "不用本人簽"]),
  severe("PREMIUM_ADVANCE", "代墊", ["我先幫你墊", "保費我先出", "之後再還我"]),
  severe("GUARANTEED_RETURN", "保證獲利", ["保證賺", "一定會獲利", "不會虧"]),
  severe("UNLICENSED_FUNDRAISING", "吸金", ["一起集資", "代操", "固定分紅"]),
  severe("PRODUCT_BEFORE_KYC", "未做 KYC 即推商品", ["先買這張", "資料之後補", "不用先了解狀況"]),
  standard("FALSE_MEDICAL_DISCLOSURE", "引導不實健康告知", ["不要寫病史", "這個不用告知", "健康資料省略"]),
  standard("MISREPRESENTED_POLICY_TERMS", "誤導條款內容", ["一定理賠", "條款不用看", "限制不重要"]),
  standard("PRESSURED_SURRENDER_OR_REPLACEMENT", "不當催促解約或轉保", ["馬上解掉", "舊的都不好", "不用比較就換"]),
  standard("UNAUTHORIZED_RECORDING_OR_SHARING", "未授權錄音或轉分享", ["我錄一下不用說", "轉給別人看", "群組裡大家都能看"]),
  standard("BORROWED_IDENTITY_OR_ACCOUNT", "借名或借帳戶操作", ["用你家人的名義", "借帳戶", "掛別人的名字"]),
  standard("UNAPPROVED_REBATE_OR_KICKBACK", "不當回饋或退佣", ["我退你一點", "私下回饋", "佣金分你"]),
  standard("UNSUITABLE_HIGH_RISK_RECOMMENDATION", "不適合高風險推薦", ["不用管風險承受度", "高風險也沒差", "先衝高報酬"]),
  standard("CLAIM_ASSISTANCE_PROMISE", "不當理賠承諾", ["理賠一定過", "我保證幫你過", "資料我幫你處理到過"]),
  standard("BLANK_FORM_OR_INCOMPLETE_FORM", "空白或未完整表單", ["先簽空白", "內容我之後補", "表格不用看"]),
  standard("HIDDEN_FEES_OR_CHARGES", "費用揭露不足", ["費用不重要", "成本不用看", "沒有什麼費用"]),
  standard("MISLEADING_TAX_OR_LEGAL_ADVICE", "誤導稅務或法律效果", ["絕對節稅", "法律上一定沒問題", "不用問專業人士"]),
  standard("CLIENT_FUNDS_HANDLED_PERSONALLY", "私人收受或保管客戶款項", ["錢先匯給我", "我幫你保管", "不用匯公司帳戶"]),
  standard("PRIVATE_DATA_OVEREXPOSURE", "私密資料過度揭露", ["把家人資料都傳群組", "身分證拍給大家", "私聊內容直接公開"]),
];

export const ROUTE_B_SEVERE_RED_LINES = ROUTE_B_RED_LINE_RULES.filter(
  (rule): rule is TheaterRouteBSevereRedLine => rule.severity === "SEVERE",
);

export function getRouteBObjectionLibrary() {
  return ROUTE_B_OBJECTION_LIBRARY;
}

export function getRouteBRedLineLibrary() {
  return ROUTE_B_RED_LINE_RULES;
}

export function buildRouteBObjectionRedLineLibrarySummary(): RouteBObjectionRedLineLibrarySummary {
  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-objection-red-line-library",
    registryReadiness: "internal-only",
    objectionPromptCount: ROUTE_B_OBJECTION_LIBRARY.length,
    redLineRuleCount: ROUTE_B_RED_LINE_RULES.length,
    severeRedLineCount: ROUTE_B_SEVERE_RED_LINES.length,
    standardRedLineCount: ROUTE_B_RED_LINE_RULES.length - ROUTE_B_SEVERE_RED_LINES.length,
    immediateDetectionIds: ROUTE_B_RED_LINE_RULES.filter((rule) => rule.detectionMode === "IMMEDIATE").map((rule) => rule.id),
    postReviewDetectionIds: ROUTE_B_RED_LINE_RULES.filter((rule) => rule.detectionMode === "POST_REVIEW").map((rule) => rule.id),
    severeLabels: ROUTE_B_SEVERE_RED_LINES.map((rule) => rule.label),
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      providerEnablementRequiresSuccessErrorAiUsageLog: true,
    },
    auditBoundary: {
      canMarkNotApplicable: true,
      keepsAuditRecordWhenNotApplicable: true,
      legalAdviceIncluded: false,
      writesConfirmedCrmFact: false,
    },
  };
}

export function selectRouteBObjectionPrompts(input: RouteBObjectionSelectionInput = {}) {
  const maxItems = Math.max(1, Math.min(input.maxItems ?? 4, ROUTE_B_OBJECTION_LIBRARY.length));
  const keywords = normalizeSignalText([...(input.personaHints ?? []), ...(input.unknowns ?? [])]);

  return ROUTE_B_OBJECTION_LIBRARY.map((prompt) => ({
    prompt,
    score: scoreObjectionPrompt(prompt, input.role, keywords),
  }))
    .sort((left, right) => right.score - left.score || left.prompt.id.localeCompare(right.prompt.id))
    .slice(0, maxItems)
    .map(({ prompt }) => prompt);
}

export function buildRouteBRedLineReviewPlan(
  notApplicableRedLines: Array<{ redLineId: RouteBRedLineRuleId; reason?: string }> = [],
): RouteBRedLineReviewFindingPlan[] {
  const notApplicableById = new Map(
    notApplicableRedLines.map((item) => [item.redLineId, sanitizeLibraryText(item.reason ?? "顧問標記本輪未觀察到明確證據。")]),
  );

  return ROUTE_B_RED_LINE_RULES.map((rule) => {
    const notApplicableReason = notApplicableById.get(rule.id);
    return {
      redLineId: rule.id,
      label: rule.label,
      severity: rule.severity,
      detectionMode: rule.detectionMode,
      status: notApplicableReason ? "NOT_APPLICABLE" : "NEEDS_REVIEW",
      evidenceBasis: notApplicableReason
        ? "顧問已標記本輪不適用；仍保留 audit review 狀態。"
        : `${rule.detectionMode === "IMMEDIATE" ? "嚴重項可即時提示" : "一般項以事後回饋檢查"}；no-provider review 不存取 raw transcript，需依公司流程確認證據。`,
      ...(notApplicableReason ? { notApplicableReason } : {}),
    };
  });
}

function severe(id: TheaterRouteBSevereRedLine["id"], label: string, triggerSignals: string[]): TheaterRouteBSevereRedLine {
  return {
    id,
    label,
    severity: "SEVERE",
    detectionMode: "IMMEDIATE",
    triggerSignals,
    evidencePolicy: "requires-evidence-or-mark-not-applicable",
    falsePositiveHandling: "can-mark-not-applicable-but-keep-audit-record",
    advisorReminder: "嚴重紅線只作演練提醒；需由顧問依公司流程升級確認。",
    legalAdviceIncluded: false,
    writesConfirmedCrmFact: false,
  };
}

function standard(id: Exclude<RouteBRedLineRuleId, TheaterRouteBSevereRedLine["id"]>, label: string, triggerSignals: string[]): RouteBRedLineRule {
  return {
    id,
    label,
    severity: "STANDARD",
    detectionMode: "POST_REVIEW",
    triggerSignals,
    evidencePolicy: "requires-evidence-or-mark-not-applicable",
    falsePositiveHandling: "can-mark-not-applicable-but-keep-audit-record",
    advisorReminder: "一般紅線以事後回饋提醒；不取代正式法遵審核或法律意見。",
    legalAdviceIncluded: false,
    writesConfirmedCrmFact: false,
  };
}

function scoreObjectionPrompt(prompt: RouteBObjectionPrompt, role?: TheaterRouteBCharacterRole, keywords = "") {
  let score = prompt.applicableRoles.includes(role ?? "FOCUS_CLIENT") ? 8 : 0;
  for (const signal of prompt.triggerSignals) {
    if (keywords.includes(signal)) score += 3;
  }
  return score;
}

function normalizeSignalText(values: string[]) {
  return values.join(" ").replace(/\s+/g, " ").toLowerCase();
}

function sanitizeLibraryText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[removed]")
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber)\b/gi, "[removed]")
    .slice(0, 240)
    .trim();
}
