import {
  BenchmarkSite,
  DevelopmentGap,
  ExperienceStep,
  ExperienceSummary,
  ReadinessSignal,
} from "./types";

export const experienceSummary: ExperienceSummary = {
  version: "Experience Preview 0.8",
  readiness: 72,
  promise: "20-30 分鐘內跑完客戶洞察、訪前準備、SPIN、演練、報告分享與回訪追蹤。",
  primaryRoute: "/pre-visit?demo=quickstart",
};

export const experienceSteps: ExperienceStep[] = [
  {
    id: "crm",
    order: "01",
    title: "客戶 360",
    route: "/crm",
    routeLabel: "查看客戶",
    description: "用家庭、保單、標籤、互動與保障缺口建立保險垂直 CRM 的第一印象。",
    outcome: "業務員能在 2 分鐘內說出此客戶的關鍵風險與下一步。",
    status: "ready",
    metric: "6 位 seed clients",
  },
  {
    id: "visit",
    order: "02",
    title: "訪前智能規劃",
    route: "/pre-visit?demo=quickstart",
    routeLabel: "建立規劃",
    description: "選擇客戶與拜訪目的，生成目標、SPIN 問題、異議處理與應備資料。",
    outcome: "產出可直接帶去拜訪的準備包。",
    status: "ready",
    metric: "AI mock ready",
  },
  {
    id: "spin",
    order: "03",
    title: "SPIN 對話",
    route: "/spin",
    routeLabel: "開始 SPIN",
    description: "以 Situation、Problem、Implication、Need-payoff 四類問題推進需求澄清。",
    outcome: "形成可轉報告的階段摘要。",
    status: "ready",
    metric: "4 phases",
  },
  {
    id: "theater",
    order: "04",
    title: "劇場演練",
    route: "/theater",
    routeLabel: "演練話術",
    description: "用保守型、疑慮型、忙碌型、感性型客戶 persona 做拜訪前排練。",
    outcome: "取得評分、遺漏痛點與話術修正。",
    status: "ready",
    metric: "4 personas",
  },
  {
    id: "report",
    order: "05",
    title: "雙版本報告",
    route: "/reports",
    routeLabel: "生成報告",
    description: "把 SPIN 摘要轉成內部洞察與客戶可讀的專業建議報告。",
    outcome: "報告可分享，並回寫客戶互動事件。",
    status: "partial",
    metric: "tracking mock",
  },
  {
    id: "team",
    order: "06",
    title: "主管追蹤",
    route: "/team",
    routeLabel: "看團隊",
    description: "聚合訪前規劃、演練與客戶熱點，讓主管找到輔導與成交機會。",
    outcome: "Demo 能從個人流程延伸到通訊處管理。",
    status: "partial",
    metric: "team mock",
  },
];

export const benchmarkSites: BenchmarkSite[] = [
  {
    name: "Salesforce FSC",
    url: "https://www.salesforce.com/financial-services/insurance-brokerage-management-software/",
    position: "保險經紀 CRM / AI CRM 標竿",
    capabilities: ["360 client view", "Policy lifecycle", "Action plans", "Agentforce automation"],
    implication: "誠問 AI 的 demo 第一屏要呈現 client lifecycle，而不是只展示 AI 對話。",
  },
  {
    name: "Applied Epic",
    url: "https://www1.appliedsystems.com/en-us/solutions/for-agents/agency-management-system/applied-epic",
    position: "全球最廣泛使用的保險 AMS 之一",
    capabilities: ["Prospecting", "Pipeline", "Quoting", "Reporting", "Sales automation"],
    implication: "可體驗版要看起來像保險作業平台，有保單、續保、報告與追蹤骨架。",
  },
  {
    name: "Vertafore AMS360",
    url: "https://www.vertafore.com/products/agency-management-software/ams360",
    position: "保險代理營運與 BI 標竿",
    capabilities: ["Policy lifecycle", "Accounting", "BI trends", "AI email / reconciliation agents"],
    implication: "誠問 AI 要補強營運效率敘事：任務、通知、主管 coaching 與追蹤。",
  },
];

export const readinessSignals: ReadinessSignal[] = [
  {
    label: "Demo flow",
    value: "6 / 6",
    detail: "核心路徑已有頁面可進入",
    status: "ready",
  },
  {
    label: "Data layer",
    value: "Mock",
    detail: "Zustand persist 可體驗，核心 Prisma schema 待補",
    status: "partial",
  },
  {
    label: "AI layer",
    value: "Mixed",
    detail: "Mock 與 OpenAI route 並存，需統一狀態治理",
    status: "partial",
  },
  {
    label: "Compliance",
    value: "Design",
    detail: "KYC / 適合度提示尚未產品化",
    status: "missing",
  },
];

export const developmentGaps: DevelopmentGap[] = [
  {
    priority: "P0",
    title: "Auth / org / role",
    detail: "正式 beta 前必須有登入、通訊處隔離與主管 / 業務員角色。",
    nextAction: "設計 User、Org、Membership schema 與 route guard。",
    status: "missing",
  },
  {
    priority: "P0",
    title: "核心資料入庫",
    detail: "Client、Policy、VisitPlan、SpinSession、Report、Event 仍在 mock store。",
    nextAction: "先落 Client + Event，支撐客戶與追蹤閉環。",
    status: "missing",
  },
  {
    priority: "P0",
    title: "AI 狀態治理",
    detail: "Mock / real AI 切換、錯誤狀態、輸出免責與引用需要一致。",
    nextAction: "建立 AI provider config 與 response metadata。",
    status: "partial",
  },
  {
    priority: "P1",
    title: "KYC / suitability checklist",
    detail: "保險垂直可信度需要可見的合規檢核。",
    nextAction: "在 CRM 與 pre-visit 加入檢核卡。",
    status: "missing",
  },
  {
    priority: "P1",
    title: "分享追蹤真資料",
    detail: "客戶報告開啟目前偏 mock，無法形成正式 engagement analytics。",
    nextAction: "將 share open / click 寫入 Event domain。",
    status: "partial",
  },
];
