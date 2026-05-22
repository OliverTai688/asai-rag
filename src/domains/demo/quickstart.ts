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
  output: string;
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
      output: "理解完整閉環",
    },
    {
      id: "pre-visit",
      order: "02",
      title: "建立規劃",
      route: "/pre-visit?demo=quickstart",
      routeLabel: "建立示範規劃",
      description: "預填王大明與加保目的，建立訪前準備任務。",
      output: "產生拜訪計畫",
    },
    {
      id: "plan",
      order: "03",
      title: "生成準備包",
      route: "/pre-visit?demo=quickstart",
      routeLabel: "檢視準備包",
      description: "取得拜訪目標、SPIN 問題、異議處理與材料清單。",
      output: "可帶去拜訪",
    },
    {
      id: "spin",
      order: "04",
      title: "SPIN 澄清",
      route: "/spin?clientId=c_wang&autoCreate=true&demo=quickstart",
      routeLabel: "開始 SPIN",
      description: "用四階段問題釐清缺口、風險與加保動機。",
      output: "形成需求摘要",
    },
    {
      id: "theater",
      order: "05",
      title: "劇場演練",
      route: "/theater?demo=quickstart",
      routeLabel: "演練話術",
      description: "用疑慮型 persona 預演客戶反應與異議處理。",
      output: "修正說法",
    },
    {
      id: "report",
      order: "06",
      title: "報告追蹤",
      route: "/reports?demo=quickstart",
      routeLabel: "生成報告",
      description: "輸出客戶版建議與內部追蹤，回到 dashboard 看後續行動。",
      output: "完成閉環",
    },
  ] satisfies DemoQuickstartStep[],
};
