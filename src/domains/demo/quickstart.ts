export type DemoQuickstartStepId =
  | "overview"
  | "pre-visit"
  | "plan"
  | "spin"
  | "theater"
  | "report";

export type DemoQuickstartStep = {
  id: DemoQuickstartStepId;
  order: string;
  title: string;
  route: string;
  routeLabel: string;
  description: string;
  focus: string;
  output: string;
  nextLabel: string;
  nextRoute: string;
};

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
      route: "/pilot",
      routeLabel: "查看全路徑",
      description: "先看 demo 如何從客戶資料一路走到主管追蹤。",
      focus: "理解這不是單點 AI 工具，而是一條保險拜訪閉環。",
      output: "理解完整閉環",
      nextLabel: "下一步：建立示範規劃",
      nextRoute: "/pre-visit?demo=quickstart",
    },
    {
      id: "pre-visit",
      order: "02",
      title: "建立規劃",
      route: "/pre-visit?demo=quickstart",
      routeLabel: "建立示範規劃",
      description: "預填王大明與加保目的，建立訪前準備任務。",
      focus: "確認客戶、拜訪目的與時間，讓 AI 知道這次拜訪要準備什麼。",
      output: "產生拜訪計畫",
      nextLabel: "下一步：生成準備包",
      nextRoute: "/pre-visit?demo=quickstart",
    },
    {
      id: "plan",
      order: "03",
      title: "生成準備包",
      route: "/pre-visit?demo=quickstart",
      routeLabel: "檢視準備包",
      description: "取得拜訪目標、SPIN 問題、異議處理與材料清單。",
      focus: "快速掃過目標、問題、異議與材料，感受業務員出門前得到的準備品質。",
      output: "可帶去拜訪",
      nextLabel: "下一步：開始 SPIN 澄清",
      nextRoute: "/spin?clientId=c_wang&autoCreate=true&demo=quickstart",
    },
    {
      id: "spin",
      order: "04",
      title: "SPIN 澄清",
      route: "/spin?clientId=c_wang&autoCreate=true&demo=quickstart",
      routeLabel: "開始 SPIN",
      description: "用四階段問題釐清缺口、風險與加保動機。",
      focus: "看 AI 如何引導 Situation、Problem、Implication、Need-payoff，不用先學功能名詞。",
      output: "形成需求摘要",
      nextLabel: "下一步：劇場演練",
      nextRoute: "/theater?clientId=c_wang&autoCreate=true&demo=quickstart",
    },
    {
      id: "theater",
      order: "05",
      title: "劇場演練",
      route: "/theater?demo=quickstart",
      routeLabel: "演練話術",
      description: "用疑慮型 persona 預演客戶反應與異議處理。",
      focus: "直接進入一場可演練的客戶情境，理解話術如何在拜訪前被校準。",
      output: "修正說法",
      nextLabel: "下一步：生成報告",
      nextRoute: "/reports?clientId=c_wang&autoCreate=true&demo=quickstart",
    },
    {
      id: "report",
      order: "06",
      title: "報告追蹤",
      route: "/reports?demo=quickstart",
      routeLabel: "生成報告",
      description: "輸出客戶版建議與內部追蹤，回到 dashboard 看後續行動。",
      focus: "比較內部視角與客戶視角，最後回到追蹤與主管管理。",
      output: "完成閉環",
      nextLabel: "完成 Demo：回到總覽",
      nextRoute: "/dashboard?demo=completed",
    },
  ] satisfies DemoQuickstartStep[],
};
