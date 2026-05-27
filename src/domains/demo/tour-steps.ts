import type { DriveStep } from "driver.js";

export const dashboardTourSteps: DriveStep[] = [
  {
    element: "[data-tour='welcome-intro']",
    popover: {
      title: "歡迎來到誠問 AI",
      description: "這是王大明的加保拜訪示範。45 歲科技主管，目的是補足保障缺口。接下來 5 個步驟，你會親眼看到 AI 如何輔助一次完整拜訪。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='welcome-cta']",
    popover: {
      title: "點這裡開始",
      description: "接下來只要一直按「下一步」，系統會自動帶入所有示範資料，不需要手動輸入任何東西。",
      side: "top",
      align: "start",
    },
  },
];

export const previsitTourSteps: DriveStep[] = [
  {
    element: "[data-tour='client-info']",
    popover: {
      title: "示範客戶：王大明",
      description: "45 歲科技業主管，家庭責任上升，既有保障需要重新配置。這份客戶資料已預填——AI 會根據它生成這次加保拜訪的完整準備包。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='previsit-cta']",
    popover: {
      title: "生成訪前準備包",
      description: "點擊後，AI 會整理出本次拜訪的目標、SPIN 提問清單、可能異議與必備材料。出門前的準備工作由 AI 完成。",
      side: "top",
      align: "start",
    },
  },
];

export const planTourSteps: DriveStep[] = [
  {
    element: "[data-tour='plan-summary']",
    popover: {
      title: "拜訪背景一目了然",
      description: "客戶：王大明｜目的：加保｜狀態：準備完成。AI 已確認所有資料，可直接進入 SPIN 需求澄清。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='plan-objectives']",
    popover: {
      title: "這次拜訪要達成什麼",
      description: "AI 根據「加保」情境生成了三個具體目標。出門前對齊這幾點，拜訪方向不會跑偏。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='plan-spin']",
    popover: {
      title: "AI 預先設計的提問",
      description: "S（情況）→ P（問題）→ I（影響）→ N（回報），四類問題幫你把真正的需求問出來，不靠即興發揮。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='plan-objections']",
    popover: {
      title: "常見異議已有回應方案",
      description: "「預算緊」「不急著加保」——客戶常見的疑慮，AI 已附上建議說法，不用臨場想話術。",
      side: "top",
      align: "start",
    },
  },
];

export const spinTourSteps: DriveStep[] = [
  {
    element: "[data-tour='spin-rows']",
    popover: {
      title: "需求已整理成四個維度",
      description: "S 情況：王大明現有保障概覽。P 問題：重大疾病自費與失能收入中斷是核心缺口。I 影響：長期休養會迫使挪用教育基金。N 回報：加保可在預算可控下補足保障。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='spin-actions']",
    popover: {
      title: "AI 建議的後續行動",
      description: "先提出低負擔加保方案，再用缺口試算讓王大明自行決策。這份摘要會直接帶進劇場演練，讓你的回應更有根據。",
      side: "top",
      align: "start",
    },
  },
];

export const theaterTourSteps: DriveStep[] = [
  {
    element: "[data-tour='theater-persona']",
    popover: {
      title: "王大明是「疑慮型」客戶",
      description: "說話謹慎、容易被預算顧慮卡住，但並非真正拒絕——他在測試你是否理解他的處境。這個 persona 讓你提前預演真實情況。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='client-objection']",
    popover: {
      title: "客戶的第一句話",
      description: "「預算有點緊，能不能先說最必要的是哪一個？」——這不是拒絕，是在探測你的專業度。好的回應不從方案開始，從理解他的限制開始。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='agent-response']",
    popover: {
      title: "AI 給的建議說法",
      description: "「先不談完整方案，只先把最可能影響家庭現金流的缺口補起來。」——縮小範圍、鎖定核心，讓王大明感覺你在幫他，而不是在賣他東西。",
      side: "top",
      align: "start",
    },
  },
];

export const reportTourSteps: DriveStep[] = [
  {
    element: "[data-tour='report-highlights']",
    popover: {
      title: "閉環完成！",
      description: "訪前準備 → SPIN 需求澄清 → 劇場演練——所有洞察已整合進這份決策報告。這就是一次完整拜訪的全貌。",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='report-sections']",
    popover: {
      title: "內部視角 vs 客戶版",
      description: "切換「客戶版」可以看到去除敏感資訊後、適合直接傳給王大明的建議書。點「展開」看完整內容，或複製分享連結直接傳給客戶。",
      side: "top",
      align: "start",
    },
  },
];
