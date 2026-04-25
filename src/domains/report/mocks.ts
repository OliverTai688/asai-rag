import { Report } from "./types";

export const SEED_REPORTS: Report[] = [
  {
    id: "rep-lin-1",
    clientId: "c_lin",
    clientName: "林建華",
    version: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    sections: [
      {
        id: "rs-1",
        type: "summary",
        title: "高資產傳承與長照風險摘要",
        content: "林先生身為中小企業主，事業有成但資產過於集中於公司股權與不動產。目前雖有 1,000 萬壽險，但若未經結構化設計，理賠金恐被計入遺產課稅。同時，家庭對長照風險的現金流支應能力尚有優化空間。",
      },
      {
        id: "rs-2",
        type: "situation",
        title: "財務與保障現況",
        content: "1. 現有南山人壽終身壽險 1,000 萬。\n2. 公司股東結構單一，資產流動性需關注。\n3. 家庭成員包含配偶張女士（50歲），正處於資產傳承關鍵期。",
      },
      {
        id: "rs-3",
        type: "problem",
        title: "潛在風險點分析",
        content: "1. 稅務風險：現有大額壽險理賠金若計入遺產，可能產生最高 20% 的稅賦負擔。\n2. 長照缺口：若發生長照需求，每月約 5-8 萬之開銷將由事業現金流支應，影響企業營運。",
      },
      {
        id: "rs-4",
        type: "recommendation",
        title: "專業配置建議",
        content: "1. 稅務優化：透過保單要被保險人調整或信託搭配，確保理賠金發揮最大節稅效果。\n2. 專款專用：配置 300-500 萬長照專屬帳戶，鎖定未來照護成本，釋放事業資金壓力。",
      },
    ],
    share: {
      token: "lin-demo-share",
      accessCount: 3,
      lastAccessedAt: new Date().toISOString(),
    }
  }
];
