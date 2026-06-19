import type { Client } from "../client/types";
import type { SpinSession } from "../spin/types";
import type { TheaterScore } from "../theater/types";
import type { ReportPurpose, ReportSectionType } from "./types";

/**
 * 結構化報告藍圖：依「報告用途 / 目標」決定要產生哪些構面、順序與內容語氣。
 * 每份報告至少涵蓋情境、分析、方法論（SPIN）、行動四大構面，
 * 並依用途調整強調重點與長度（約 5–8 頁）。
 */

export interface ReportPurposeMeta {
  id: ReportPurpose;
  label: string;
  description: string;
  estimatedPages: string;
  /** 此用途的結構化區塊順序 */
  blueprint: ReportSectionType[];
}

export const REPORT_PURPOSES: ReportPurposeMeta[] = [
  {
    id: "comprehensive",
    label: "全面需求分析報告",
    description: "完整涵蓋情境、SPIN 探詢、風險缺口、家庭藍圖與行動計畫，適合首次深度規劃。",
    estimatedPages: "7–8 頁",
    blueprint: [
      "cover",
      "situation",
      "methodology",
      "analysis",
      "family",
      "recommendation",
      "action",
      "compliance",
      "performance",
    ],
  },
  {
    id: "proposal",
    label: "方案建議書",
    description: "聚焦分析結論與配置建議，快速進入提案與成交，適合已釐清需求的客戶。",
    estimatedPages: "5–6 頁",
    blueprint: ["cover", "situation", "analysis", "recommendation", "action", "compliance", "performance"],
  },
  {
    id: "policy_review",
    label: "保單健檢報告",
    description: "以現有保單盤點與缺口比對為主，凸顯重複、不足與優化空間。",
    estimatedPages: "5–7 頁",
    blueprint: ["cover", "situation", "analysis", "recommendation", "action", "compliance", "performance"],
  },
  {
    id: "family_protection",
    label: "家庭保障規劃",
    description: "以家庭成員與責任缺口為核心，強調整體防護網與世代傳承。",
    estimatedPages: "6–7 頁",
    blueprint: ["cover", "situation", "family", "analysis", "recommendation", "action", "compliance", "performance"],
  },
  {
    id: "retirement",
    label: "退休與資產規劃",
    description: "聚焦退休現金流、資產配置與長期目標的缺口與建議。",
    estimatedPages: "6–7 頁",
    blueprint: ["cover", "situation", "analysis", "recommendation", "action", "compliance", "performance"],
  },
  {
    id: "follow_up",
    label: "回訪追蹤摘要",
    description: "精簡版，整理本次重點、待確認事項與下一步行動，適合回訪追蹤。",
    estimatedPages: "3–4 頁",
    blueprint: ["cover", "situation", "action", "compliance"],
  },
];

export const DEFAULT_REPORT_PURPOSE: ReportPurpose = "comprehensive";

export function getReportPurposeMeta(purpose?: ReportPurpose): ReportPurposeMeta {
  return REPORT_PURPOSES.find((item) => item.id === purpose) ?? REPORT_PURPOSES[0];
}

/** 區塊類型的中文標籤（顯示用） */
export const SECTION_TYPE_LABELS: Record<ReportSectionType, string> = {
  cover: "執行摘要",
  situation: "情境與背景",
  methodology: "探詢脈絡 (SPIN)",
  problem: "問題釐清",
  implication: "影響評估",
  analysis: "風險與缺口分析",
  family: "家庭保障藍圖",
  recommendation: "建議方案",
  action: "行動計畫",
  compliance: "合規聲明與後續",
  summary: "重點摘要",
  performance: "演練回饋（內部）",
  appendix: "附錄",
};

// ---------------------------------------------------------------------------
// 內容建構
// ---------------------------------------------------------------------------

export interface ReportBuildContext {
  clientName: string;
  purpose: ReportPurpose;
  goal?: string;
  client?: Client | null;
  spinSession?: SpinSession;
  theaterScore?: TheaterScore;
  generatedDate: string;
}

function formatCurrency(value?: number): string {
  if (!value || value <= 0) return "—";
  return `NT$ ${value.toLocaleString("zh-TW")}`;
}

function calcAge(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

function bulletList(items: string[], fallback: string): string {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (!cleaned.length) return `- ${fallback}`;
  return cleaned.map((item) => `- ${item}`).join("\n");
}

function spinItems(ctx: ReportBuildContext, phase: "SITUATION" | "PROBLEM" | "IMPLICATION" | "NEED_PAYOFF"): string[] {
  return ctx.spinSession?.outputs?.[phase] ?? [];
}

// 各構面建構器 -------------------------------------------------------------

type SectionBuilder = (ctx: ReportBuildContext) => { title: string; content: string };

const buildCover: SectionBuilder = (ctx) => {
  const meta = getReportPurposeMeta(ctx.purpose);
  const client = ctx.client;
  const age = calcAge(client?.birthDate);
  const goalLine = ctx.goal?.trim()
    ? ctx.goal.trim()
    : `為 ${ctx.clientName} 建立一份「${meta.label}」，釐清需求並提出可執行的下一步。`;

  const overviewRows = [
    `| 客戶 | ${ctx.clientName}${age ? `（${age} 歲）` : ""} |`,
    `| 報告類型 | ${meta.label} |`,
    `| 製作日期 | ${ctx.generatedDate} |`,
    client?.occupation ? `| 職業 | ${client.occupation} |` : null,
    client ? `| 家庭成員 | ${client.family.length} 人 |` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: "執行摘要",
    content: `### 報告目標
${goalLine}

### 報告概覽
| 項目 | 內容 |
| --- | --- |
${overviewRows}

### 三個重點結論
1. 已盤點客戶現況與家庭責任，確認本次規劃的核心方向。
2. 比對既有保障與潛在缺口，標示需優先補強的項目。
3. 提出分階段行動計畫，明確下一步與時程。

:::strategy
本份摘要為自動生成草稿，請於提案前依實際對談調整三項結論的措辭與順序，突出客戶最在意的痛點。
:::`,
  };
};

const buildSituation: SectionBuilder = (ctx) => {
  const client = ctx.client;
  const age = calcAge(client?.birthDate);
  const profileRows = [
    `| 年齡 | ${age ?? "—"} |`,
    `| 職業 | ${client?.occupation ?? "—"} |`,
    `| 年收入 | ${formatCurrency(client?.annualIncome)} |`,
    `| 家庭成員 | ${client ? `${client.family.length} 人` : "—"} |`,
    `| 現有保單 | ${client ? `${client.existingPolicies.length} 張` : "—"} |`,
  ].join("\n");

  const situationFromSpin = spinItems(ctx, "SITUATION");

  return {
    title: "情境與背景",
    content: `### 客戶輪廓
| 項目 | 內容 |
| --- | --- |
${profileRows}

### 現況與關注重點
${bulletList(situationFromSpin, "客戶目前正處於評估階段，主要關注資產配置的穩定性與家庭保障的完整度。")}

${
  client?.family.length
    ? `### 家庭結構摘要\n${client.family
        .slice(0, 8)
        .map((member) => `- ${member.relation}：${member.name}${member.age ? `（${member.age} 歲）` : ""}`)
        .join("\n")}`
    : ""
}`.trim(),
  };
};

const buildMethodology: SectionBuilder = (ctx) => {
  const s = spinItems(ctx, "SITUATION");
  const p = spinItems(ctx, "PROBLEM");
  const i = spinItems(ctx, "IMPLICATION");
  const n = spinItems(ctx, "NEED_PAYOFF");

  return {
    title: "探詢脈絡 (SPIN)",
    content: `> 本段為內部紀錄，整理本次以 SPIN 探詢法釐清需求的脈絡，協助後續追蹤與交接。

### S・現況 (Situation)
${bulletList(s, "尚未記錄現況問題")}

### P・問題 (Problem)
${bulletList(p, "尚未記錄問題點")}

### I・影響 (Implication)
${bulletList(i, "尚未記錄問題延伸的影響")}

### N・需求回報 (Need-Payoff)
${bulletList(n, "尚未記錄客戶期望的解決後價值")}

:::strategy
若某一階段線索不足，回訪時優先補問 Implication（影響），這是放大需求急迫性的關鍵。
:::`,
  };
};

const buildAnalysis: SectionBuilder = (ctx) => {
  const client = ctx.client;
  const problems = spinItems(ctx, "PROBLEM");
  const implications = spinItems(ctx, "IMPLICATION");
  const income = client?.annualIncome ?? 0;
  const recommendedCover = income > 0 ? income * 10 : 0;

  const policyTable = client?.existingPolicies.length
    ? `| 險種 | 保額 | 承保公司 |\n| --- | --- | --- |\n${client.existingPolicies
        .map((policy) => `| ${policy.type} | ${formatCurrency(policy.amount)} | ${policy.provider} |`)
        .join("\n")}`
    : "目前尚無建檔的現有保單，建議於下次面談補齊保單明細以利精準比對。";

  const gapNote =
    recommendedCover > 0
      ? `以年收入十倍的常見壽險保障原則估算，建議壽險保障約 ${formatCurrency(
          recommendedCover,
        )}。實際缺口需再扣除既有保額與資產後確認（此為估算，非正式核保結果）。`
      : "尚未取得年收入資料，無法量化保障缺口，建議補齊財務資訊後再行計算。";

  return {
    title: "風險與缺口分析",
    content: `### 關鍵問題
${bulletList(problems, "尚未明確定義主要風險問題。")}

### 若不處理的影響
${bulletList(implications, "若不即時處理，可能對家庭長期財務穩健造成壓力。")}

### 現有保障盤點
${policyTable}

### 保障缺口估算
${gapNote}

:::market
保障規劃應隨人生階段（成家、購屋、子女教育、退休）動態調整，建議每 1–2 年檢視一次。
:::`,
  };
};

const buildFamily: SectionBuilder = (ctx) => {
  const client = ctx.client;
  if (!client?.family.length) {
    return {
      title: "家庭保障藍圖",
      content: `### 家庭保障藍圖
尚未建立家庭成員資料。建議於下次面談時補齊家庭結構，以便評估整體防護網與責任缺口。`,
    };
  }

  const memberRows = client.family
    .slice(0, 10)
    .map((member) => {
      const focus =
        member.age && member.age < 22
          ? "教育金 / 醫療保障"
          : member.relation === "配偶"
          ? "收入替代 / 共同責任"
          : "醫療 / 長照風險";
      return `| ${member.relation} | ${member.name}${member.age ? `（${member.age}）` : ""} | ${focus} |`;
    })
    .join("\n");

  return {
    title: "家庭保障藍圖",
    content: `### 成員責任與保障重點
| 關係 | 成員 | 規劃重點 |
| --- | --- | --- |
${memberRows}

### 整體防護網建議
- 以家庭主要收入來源為核心，優先建立收入替代與重大事故防護。
- 子女階段以教育金與醫療保障為主，兼顧時間複利效益。
- 長輩階段留意醫療與長照風險，降低家庭照護財務衝擊。`,
  };
};

const buildRecommendation: SectionBuilder = (ctx) => {
  const needs = spinItems(ctx, "NEED_PAYOFF");
  const purposeLine: Record<ReportPurpose, string> = {
    comprehensive: "依全面需求分析，提出分層的保障與資產配置方向。",
    proposal: "依釐清後的需求，提出聚焦的提案方向，便於進入決策。",
    policy_review: "依保單健檢結果，提出補強、調整與保留的具體方向。",
    family_protection: "依家庭責任缺口，提出家庭整體防護網配置方向。",
    retirement: "依退休現金流與資產目標，提出長期配置方向。",
    follow_up: "整理本次討論後建議優先推進的方向。",
  };

  return {
    title: "建議方案",
    content: `> ${purposeLine[ctx.purpose]}

### 配置建議方案
- **優先補足**：意外與失能險種，建立家庭防護網的第一道防線。
- **風險轉嫁**：依缺口估算補強壽險與醫療保障，降低重大事故衝擊。
- **資產增值**：透過定期定額方式建構教育金 / 退休金，發揮時間複利。
- **核心目標**：達成「保全」與「增值」的雙重平衡。

${
  needs.length
    ? `### 對應客戶期望\n${needs.map((item) => `- 回應「${item}」`).join("\n")}`
    : ""
}

:::legal
本建議僅供參考，實際投保內容、保額與費率以保險公司核保結果與正式保單條款為準。
:::`.trim(),
  };
};

const buildAction: SectionBuilder = (ctx) => {
  const goal = ctx.goal?.trim();
  return {
    title: "行動計畫",
    content: `### 分階段行動
| 階段 | 行動 | 時程 |
| --- | --- | --- |
| 第 1 步 | 確認需求與保障優先序，補齊缺漏資料 | 本週 |
| 第 2 步 | 提供正式建議書與費率試算 | 1–2 週內 |
| 第 3 步 | 協助投保與核保，完成保障到位 | 2–4 週內 |
| 後續 | 定期檢視與調整規劃 | 每 1–2 年 |

### 待確認事項
- 補齊財務與既有保單明細，以利精準缺口計算。
- 確認預算範圍與優先處理的保障項目。
${goal ? `- 對齊本份報告目標：「${goal}」。` : ""}

### 下一步
建議於 7 日內安排下一次面談，逐項確認上述行動。

:::strategy
回訪前先以一句話複述客戶最在意的影響（Implication），再帶入行動清單，成交動能會更強。
:::`,
  };
};

const buildCompliance: SectionBuilder = (ctx) => {
  const client = ctx.client;
  const checklist = client?.complianceChecklist;
  const complianceRows = checklist
    ? `| KYC | ${checklist.kycStatus} |\n| 適合度評估 | ${checklist.suitabilityStatus} |\n| 個資同意 | ${checklist.consentStatus} |`
    : `| KYC | 待確認 |\n| 適合度評估 | 待確認 |\n| 個資同意 | 待確認 |`;
  const missing = checklist?.missingItems?.length
    ? checklist.missingItems.map((item) => `- ${item}`).join("\n")
    : "- 無待補項目";

  return {
    title: "合規聲明與後續",
    content: `### 合規檢核狀態
| 項目 | 狀態 |
| --- | --- |
${complianceRows}

### 待補項目
${missing}

:::legal
本報告由 誠問 AI 輔助生成，內容僅供需求分析與溝通參考，不構成保險、投資、法律或稅務之最終建議。實際投保以保險公司核保結果與正式保單條款為準。客戶個人資料之蒐集、處理與利用，均依個人資料保護法及相關規範辦理。
:::`,
  };
};

const buildPerformance: SectionBuilder = (ctx) => {
  const score = ctx.theaterScore;
  if (!score) {
    return {
      title: "演練回饋（內部）",
      content: `### 演練回饋
本份報告尚未連結劇場演練紀錄。建議於提案前進行一次演練，強化臨場應對。`,
    };
  }
  return {
    title: "演練回饋（內部）",
    content: `### 劇場演練回饋（僅內部可見）
- 同理表現：${score.empathy}/100
- 建議改進：${score.improvedPhrasing?.[0] || "繼續保持目前節奏"}

:::strategy
將演練中表現最好的一句開場，直接套用到真實面談的破冰環節。
:::`,
  };
};

const SECTION_BUILDERS: Record<ReportSectionType, SectionBuilder> = {
  cover: buildCover,
  situation: buildSituation,
  methodology: buildMethodology,
  analysis: buildAnalysis,
  family: buildFamily,
  recommendation: buildRecommendation,
  action: buildAction,
  compliance: buildCompliance,
  performance: buildPerformance,
  // legacy 構面映射到語意相近的建構器
  problem: buildAnalysis,
  implication: buildAnalysis,
  summary: buildCover,
  appendix: (ctx) => ({
    title: "附錄",
    content: `### 附錄\n本報告相關資料來源與假設說明，請洽顧問 ${ctx.clientName ? "" : ""}索取完整明細。`,
  }),
};

export function buildReportSection(type: ReportSectionType, ctx: ReportBuildContext) {
  const builder = SECTION_BUILDERS[type] ?? SECTION_BUILDERS.situation;
  return builder(ctx);
}
