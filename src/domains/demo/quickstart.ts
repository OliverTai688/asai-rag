import { getMockVisitPlan, type VisitMockData } from "@/domains/ai-mock/scripts/visit";
import type { SpinMessage, SpinSession } from "@/domains/spin/types";
import type { TheaterScore, TheaterSession, TheaterTurn } from "@/domains/theater/types";
import type { VisitPurpose } from "@/domains/visit/types";

export type DemoQuickstartStepId =
  | "overview"
  | "pre-visit"
  | "plan"
  | "spin"
  | "theater"
  | "report";

export type DemoQuickstartStatus = "idle" | "in_progress" | "completed";

export type DemoQuickstartStep = {
  id: DemoQuickstartStepId;
  order: string;
  title: string;
  screenTitle: string;
  bodyCopy: string;
  route: string;
  routeLabel: string;
  description: string;
  focus: string;
  output: string;
  completedOutput: string;
  nextLabel: string;
  primaryCta: string;
  nextRoute: string;
};

export const quickstartStatusStorageKey = "asai.quickstart.status";

export const demoQuickstart = {
  title: "王大明加保拜訪 Quickstart",
  subtitle: "用一位示範客戶跑完訪前準備、需求澄清、演練、報告與追蹤。",
  clientId: "c_wang",
  clientName: "王大明",
  clientContext: "45 歲科技業主管，家庭責任上升，既有保障需要重新配置。",
  purpose: "ADD_ON",
  purposeLabel: "加保",
  durationLabel: "約 10 分鐘",
  steps: [
    {
      id: "overview",
      order: "01",
      title: "體驗中樞",
      screenTitle: "歡迎體驗王大明加保拜訪",
      bodyCopy:
        "接下來只要一直按下一步，系統會帶你跑完訪前準備、需求澄清、演練、報告與追蹤。",
      route: "/pilot",
      routeLabel: "查看全路徑",
      description: "先看 demo 如何從客戶資料一路走到主管追蹤。",
      focus: "理解這不是單點 AI 工具，而是一條保險拜訪閉環。",
      output: "理解完整閉環",
      completedOutput: "理解完整閉環",
      nextLabel: "下一步：建立拜訪規劃",
      primaryCta: "下一步：建立拜訪規劃",
      nextRoute: "/pre-visit?demo=quickstart",
    },
    {
      id: "pre-visit",
      order: "02",
      title: "建立規劃",
      screenTitle: "建立王大明的訪前規劃",
      bodyCopy: "已帶入示範客戶與「加保」目的。確認後，AI 會生成這次拜訪的準備包。",
      route: "/pre-visit?demo=quickstart",
      routeLabel: "建立示範規劃",
      description: "預填王大明與加保目的，建立訪前準備任務。",
      focus: "確認客戶、拜訪目的與時間，讓 AI 知道這次拜訪要準備什麼。",
      output: "產生拜訪計畫",
      completedOutput: "建立王大明加保拜訪任務",
      nextLabel: "下一步：生成準備包",
      primaryCta: "下一步：生成準備包",
      nextRoute: "/pre-visit?demo=quickstart",
    },
    {
      id: "plan",
      order: "03",
      title: "生成準備包",
      screenTitle: "AI 已整理出門前準備包",
      bodyCopy: "先看三件事：拜訪目標、SPIN 提問、可能異議。其他細節可以先收合。",
      route: "/pre-visit?demo=quickstart",
      routeLabel: "檢視準備包",
      description: "取得拜訪目標、SPIN 問題、異議處理與材料清單。",
      focus: "快速掃過目標、問題、異議與材料，感受業務員出門前得到的準備品質。",
      output: "可帶去拜訪",
      completedOutput: "準備包：目標、提問、異議與材料",
      nextLabel: "下一步：開始 SPIN 澄清",
      primaryCta: "下一步：開始 SPIN 澄清",
      nextRoute: "/spin?clientId=c_wang&autoCreate=true&demo=quickstart",
    },
    {
      id: "spin",
      order: "04",
      title: "SPIN 澄清",
      screenTitle: "把需求問清楚",
      bodyCopy: "依照 S/P/I/N 四段，把王大明真正擔心的保障缺口整理成摘要。",
      route: "/spin?clientId=c_wang&autoCreate=true&demo=quickstart",
      routeLabel: "開始 SPIN",
      description: "用四階段問題釐清缺口、風險與加保動機。",
      focus: "看 AI 如何引導 Situation、Problem、Implication、Need-payoff，不用先學功能名詞。",
      output: "形成需求摘要",
      completedOutput: "需求摘要：保障缺口與加保動機",
      nextLabel: "下一步：劇場演練",
      primaryCta: "下一步：劇場演練",
      nextRoute: "/theater?clientId=c_wang&autoCreate=true&demo=quickstart",
    },
    {
      id: "theater",
      order: "05",
      title: "劇場演練",
      screenTitle: "先演練再拜訪",
      bodyCopy: "用疑慮型客戶 persona 預演回應，讓業務員在真正拜訪前修正說法。",
      route: "/theater?demo=quickstart",
      routeLabel: "演練話術",
      description: "用疑慮型 persona 預演客戶反應與異議處理。",
      focus: "直接進入一場可演練的客戶情境，理解話術如何在拜訪前被校準。",
      output: "修正說法",
      completedOutput: "演練紀錄：疑慮、回應與修正說法",
      nextLabel: "下一步：生成決策報告",
      primaryCta: "下一步：生成決策報告",
      nextRoute: "/reports?clientId=c_wang&autoCreate=true&demo=quickstart",
    },
    {
      id: "report",
      order: "06",
      title: "報告追蹤",
      screenTitle: "把拜訪輸出成可追蹤報告",
      bodyCopy: "比較內部摘要與客戶版說法，確認下一個追蹤動作。",
      route: "/reports?demo=quickstart",
      routeLabel: "生成報告",
      description: "輸出客戶版建議與內部追蹤，回到 dashboard 看後續行動。",
      focus: "比較內部視角與客戶視角，最後回到追蹤與主管管理。",
      output: "完成閉環",
      completedOutput: "決策報告：客戶版建議與內部追蹤",
      nextLabel: "完成 Demo：回到總覽",
      primaryCta: "完成 Demo：回到總覽",
      nextRoute: "/dashboard?demo=completed",
    },
  ] satisfies DemoQuickstartStep[],
};

export function getQuickstartStep(stepId: DemoQuickstartStepId): DemoQuickstartStep {
  return demoQuickstart.steps.find((step) => step.id === stepId) ?? demoQuickstart.steps[0];
}

export function getQuickstartNextHref(stepId: DemoQuickstartStepId): string {
  return getQuickstartStep(stepId).nextRoute;
}

export function getQuickstartVisitFixture(): VisitMockData {
  return getMockVisitPlan(demoQuickstart.purpose as VisitPurpose, demoQuickstart.clientId);
}

export function getQuickstartSpinFixture(
  sessionId = "quickstart-spin",
  now = new Date().toISOString()
): {
  session: SpinSession;
  messages: SpinMessage[];
} {
  const session: SpinSession = {
    id: sessionId,
    clientId: demoQuickstart.clientId,
    clientName: demoQuickstart.clientName,
    phase: "COMPLETE",
    mode: "QUESTION_DESIGN",
    outputs: {
      SITUATION: ["王大明目前已有壽險與醫療險，家庭責任集中在配偶與兩名子女。"],
      PROBLEM: ["既有保障缺口集中在重大疾病自費、失能收入中斷與家庭現金流安全墊。"],
      IMPLICATION: ["若短期發生長期休養，家庭現金流與子女教育基金會被迫挪用。"],
      NEED_PAYOFF: ["加保可先補足失能與醫療實支，讓保障網更完整且預算可控。"],
    },
    transitions: [
      { from: "SITUATION", to: "PROBLEM", trigger: "AI", timestamp: now },
      { from: "PROBLEM", to: "IMPLICATION", trigger: "AI", timestamp: now },
      { from: "IMPLICATION", to: "NEED_PAYOFF", trigger: "AI", timestamp: now },
      { from: "NEED_PAYOFF", to: "COMPLETE", trigger: "AI", timestamp: now },
    ],
    summary: {
      keyInsights: ["家庭責任上升，王大明對預算敏感，但重視保障是否真的補到缺口。"],
      keyProblems: ["重大疾病自費、失能收入中斷與教育基金挪用風險是本次核心問題。"],
      suggestedActions: ["先提出低負擔加保方案，再用缺口試算協助王大明決策。"],
    },
    createdAt: now,
    updatedAt: now,
  };

  return {
    session,
    messages: [
      {
        id: `${sessionId}-msg-1`,
        sessionId,
        role: "assistant",
        type: "SUMMARY",
        content: "已整理王大明的 SPIN 需求摘要，可直接帶入劇場演練。",
        phase: "COMPLETE",
        createdAt: now,
      },
    ],
  };
}

export function getQuickstartTheaterFixture(
  sessionId = "quickstart-theater",
  spinSessionId = "quickstart-spin",
  now = new Date().toISOString()
): {
  session: TheaterSession;
  turns: TheaterTurn[];
  score: TheaterScore;
} {
  return {
    session: {
      id: sessionId,
      spinSessionId,
      clientId: demoQuickstart.clientId,
      clientName: demoQuickstart.clientName,
      personaType: "SKEPTICAL",
      difficulty: "MEDIUM",
      tension: 42,
      status: "COMPLETED",
      createdAt: now,
      updatedAt: now,
    },
    turns: [
      {
        id: `${sessionId}-client-1`,
        sessionId,
        role: "client",
        content: "我不是不想加保，只是最近預算真的有點緊，你能不能先說最必要的是哪一個？",
        tensionDelta: 8,
        createdAt: now,
      },
      {
        id: `${sessionId}-agent-1`,
        sessionId,
        role: "agent",
        content: "可以，我們先不談完整方案，只先把最可能影響家庭現金流的缺口補起來。",
        tensionDelta: -10,
        createdAt: now,
      },
    ],
    score: {
      empathy: 86,
      questioning: 82,
      clarity: 88,
      objectionHandling: 84,
      closing: 80,
      missedOpportunities: ["可再追問王大明可接受的月預算區間，讓方案更容易落地。"],
      improvedPhrasing: ["我們先抓一個不影響生活品質的預算上限，再看哪個缺口最值得優先補。"],
    },
  };
}
