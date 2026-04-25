/**
 * 誠問 AI - 繁體中文語系字串集中管理盒
 * 雖然目前不接多國語系套件，但將字串集中在此處便於後續維護。
 */
export const STRINGS = {
  common: {
    appName: "誠問 AI",
    slogan: "從真誠對話開始，看見保障價值",
    back: "返回",
    save: "儲存",
    cancel: "取消",
    edit: "編輯",
    delete: "刪除",
    confirm: "確認",
    loading: "載入中...",
    error: "發生錯誤",
    noData: "目前沒有資料",
    search: "搜尋...",
    unsupported: "此功能開發中，敬請期待",
  },
  roles: {
    AGENT: "業務專員",
    MANAGER: "通訊處經理",
    OWNER: "區經理/總監",
  },
  dashboard: {
    greeting: "早安，",
    kpi: {
      spinCount: "本週 SPIN 次數",
      pendingTasks: "待跟進客戶",
      notifications: "未讀通知",
      reportCount: "本月報告產出",
    },
    tasks: {
      title: "今日任務",
      empty: "今日尚無待辦事項，祝您業務順利！",
    },
    timeline: {
      title: "近期互動",
    },
  },
  crm: {
    title: "客戶管理",
    addClient: "新增客戶",
    list: "客戶列表",
    details: "客戶 360°",
    gapAnalysis: "保障缺口分析",
    categories: {
      PROSPECT: "潛在客戶",
      ACTIVE: "正式客戶",
      CLOSED: "結案客戶",
    },
  },
  spin: {
    title: "SPIN 對話引導",
    newChat: "開始新對話",
    phases: {
      SITUATION: "現況 (Situation)",
      PROBLEM: "問題 (Problem)",
      IMPLICATION: "痛點 (Implication)",
      NEED_PAYOFF: "需求 (Need-Payoff)",
    },
    modes: {
      SELF_CLARIFY: "釐清自我",
      QUESTION_DESIGN: "設計提問",
    },
  },
  theater: {
    title: "劇場模擬演練",
    startTrial: "開始演練",
    scoreReport: "評分報告",
    textMode: "文字演練",
    voiceMode: "語音演練 (開發中)",
  },
  assistant: {
    fabTitle: "誠問 AI 助手",
    placeholder: "問問 AI：王小明最近的互動重點是什麼？",
  }
};
