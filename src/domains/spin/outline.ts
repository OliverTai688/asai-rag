import type { SpinSession } from "./types";

export interface SpinOutlineClientInfo {
  name: string;
  occupation?: string;
  income?: string | number;
  family?: unknown;
  policies?: unknown[];
}

export interface BuildSpinOutlineInput {
  session: SpinSession;
  clientInfo: SpinOutlineClientInfo;
  generatedAt?: Date;
}

export function buildSpinOutline(input: BuildSpinOutlineInput) {
  const { session, clientInfo } = input;
  const name = clientInfo.name || session.clientName || "客戶";
  const occupation = clientInfo.occupation || "（職業待確認）";
  const income = clientInfo.income || "（收入待確認）";
  const today = (input.generatedAt ?? new Date()).toISOString().split("T")[0];

  const situationOutputs = session.outputs?.SITUATION ?? [];
  const problemOutputs = session.outputs?.PROBLEM ?? [];
  const implicationOutputs = session.outputs?.IMPLICATION ?? [];
  const needPayoffOutputs = session.outputs?.NEED_PAYOFF ?? [];
  const transitionCount = session.transitions?.length ?? 0;

  const buildSituationQuestions = () => {
    const base = [
      "□ 目前家裡有幾個人？孩子幾歲了？有奉養父母嗎？",
      "□ 工作是固定薪資還是浮動收入？大概做多久了？",
      "□ 目前有幫自己或家人規劃過保險嗎？是什麼種類？",
      "□ 家裡目前有房貸或車貸嗎？大概還要繳多久？",
    ];
    if (situationOutputs.length > 0) {
      return [...base, "", "**已掌握的情況：**", ...situationOutputs.map((output) => `- ${output}`)].join("\n");
    }
    return base.join("\n");
  };

  const buildProblemQuestions = () => {
    const base = [
      "□ 如果突然生病住院三個月，目前的保險理賠金夠用嗎？",
      "□ 如果收入突然中斷，存款可以支撐家庭多久？",
      "□ 身邊有沒有朋友或家人，最近遇過比較大的事情？（生病、意外）",
      "□ 您覺得目前保障上最擔心的是哪一塊？",
    ];
    if (problemOutputs.length > 0) {
      return [...base, "", "**對話中浮現的問題點：**", ...problemOutputs.map((output) => `- ${output}`)].join("\n");
    }
    return base.join("\n");
  };

  const buildImplicationQuestions = () => {
    const base = [
      "□ 如果住院費自費要 20-30 萬，這對您家裡存款影響有多大？",
      "□ 假設有半年沒辦法工作，房貸和孩子的學費還能照常繳嗎？",
      "□ 如果這個缺口沒有填補，最快多久會影響到家人的生活品質？",
      "□ 這段期間的開銷，會主要由誰來承擔？",
    ];
    if (implicationOutputs.length > 0) {
      return [...base, "", "**引發的連鎖影響：**", ...implicationOutputs.map((output) => `- ${output}`)].join("\n");
    }
    return base.join("\n");
  };

  const buildNeedPayoffQuestions = () => {
    const base = [
      "□ 如果有一個方案，能確保您萬一無法工作時家人生活不受影響，這對您來說值得認真規劃嗎？",
      "□ 對您來說，現在最想先解決的保障問題是哪一個？",
      "□ 如果我下次幫您整理一份針對這些需求的規劃方案，我們可以一起來看看嗎？",
    ];
    if (needPayoffOutputs.length > 0) {
      return [...base, "", "**客戶表達的需求方向：**", ...needPayoffOutputs.map((output) => `- ${output}`)].join("\n");
    }
    return base.join("\n");
  };

  const buildRiskPriority = () => {
    const risks: string[] = [];
    const allOutputs = [
      ...situationOutputs,
      ...problemOutputs,
      ...implicationOutputs,
      ...needPayoffOutputs,
    ]
      .join(" ")
      .toLowerCase();

    if (allOutputs.includes("醫療") || allOutputs.includes("住院")) {
      risks.push("1. 醫療／住院費用缺口（最易切入）");
    }
    if (allOutputs.includes("失能") || allOutputs.includes("收入中斷") || allOutputs.includes("中斷")) {
      risks.push(`${risks.length + 1}. 失能／收入中斷風險（後果最重）`);
    }
    if (allOutputs.includes("壽險") || allOutputs.includes("身故") || allOutputs.includes("家人")) {
      risks.push(`${risks.length + 1}. 壽險保障缺口（家庭責任）`);
    }
    if (allOutputs.includes("退休") || allOutputs.includes("老年")) {
      risks.push(`${risks.length + 1}. 退休規劃（長期需求）`);
    }
    if (allOutputs.includes("長照") || allOutputs.includes("父母")) {
      risks.push(`${risks.length + 1}. 長期照護（跨代財務）`);
    }

    if (risks.length === 0) {
      return "- 尚待訪談確認，建議從醫療缺口切入";
    }
    return risks.join("\n");
  };

  return `# 訪談大綱 — ${name} ／ ${today}

> **SPIN 對話摘要**：已完成 ${transitionCount} 個階段切換｜職業：${occupation}｜年收入：${income}

---

## 一、客戶基本輪廓（訪前確認）

| 項目 | 現況 | 備註 |
|------|------|------|
| 家庭結構 | 待確認 | 配偶、子女、父母情況 |
| 職業收入 | ${occupation} ／ ${income} | 收入穩定性、浮動比例 |
| 財務負債 | 待確認 | 房貸、車貸、每月固定支出 |
| 既有保障 | 待確認 | 保單種類、購買年份、保額 |
| 健康狀況 | 待確認 | 本人及家人重大病史 |

---

## 二、S — 情況性問題（掌握現況，3-5 題為宜）

${buildSituationQuestions()}

---

## 三、P — 問題性問題（引發思考）

${buildProblemQuestions()}

---

## 四、I — 暗示性問題（放大影響，重點準備）

> 這是 SPIN 最關鍵的階段，請在 P 問題引發反應後才進入

${buildImplicationQuestions()}

---

## 五、N — 需求性問題（確認動機，讓客戶自己說出需求）

${buildNeedPayoffQuestions()}

---

## 六、本次訪談預期重點風險（依優先序）

${buildRiskPriority()}

---

## 七、本次拜訪目標

- [ ] 完整掌握客戶家庭結構與財務輪廓
- [ ] 引發至少一個 I 問題的強烈反應（記錄客戶原話）
- [ ] 讓客戶自己說出他最想先解決的保障缺口
- [ ] 取得下次提案的授權

---

## 八、建議攜帶資料

- 需求分析工作表（讓客戶填寫家庭基本資料）
- 六大保障風險說明圖
- 同類型客戶的保障規劃案例（匿名）
- 手機計算機（陪客戶現場計算缺口金額）

---

## 九、訪後記錄欄

**客戶最強烈反應的問題：**

（訪談後填寫）

**客戶原話（關鍵句）：**

（訪談後填寫）

**下次提案方向：**

（訪談後填寫）

**下次見面時間：**

（訪談後填寫）

---

*由誠問 AI 根據正式 SPIN 對話紀錄自動生成 ｜ ${today}*`;
}
