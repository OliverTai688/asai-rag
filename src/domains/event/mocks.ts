import { InteractionEvent } from "./types";

export const SEED_EVENTS: InteractionEvent[] = [
  {
    id: "ev_1",
    clientId: "c_wang",
    clientName: "王大明",
    type: "SPIN",
    title: "完成 SPIN Situation 階段",
    description: "已確認家庭背景與現有定期壽險額度。",
    timestamp: "2026-04-24T10:30:00Z",
  },
  {
    id: "ev_2",
    clientId: "c_tsai",
    clientName: "蔡佩芬",
    type: "REPORT",
    title: "生成保障缺口報告",
    description: "建議書已產出，主要針對重大疾病一次金加強。",
    timestamp: "2026-04-24T09:15:00Z",
  },
  {
    id: "ev_3",
    clientId: "c_lo",
    clientName: "羅德華",
    type: "THEATER",
    title: "劇場演練：處理反對意見",
    description: "與 AI 客戶進行 '疑慮型' 人格對話演練，獲得 8.5 分。",
    timestamp: "2026-04-23T16:20:00Z",
  },
  {
    id: "ev_4",
    clientId: "c_wang",
    clientName: "王大明",
    type: "SHARE_OPEN",
    title: "客戶開啟分享報告",
    description: "王大明 於 15:30 檢視了保障缺口分析報告。",
    timestamp: "2026-04-23T15:30:00Z",
  },
  {
    id: "ev_5",
    clientId: "c_chen",
    clientName: "陳雅婷",
    type: "SPIN",
    title: "開始新對話",
    description: "初步釐清自由工作者的意外風險需求。",
    timestamp: "2026-04-22T14:00:00Z",
  },
  {
    id: "ev_6",
    clientId: "c_lin",
    clientName: "林建華",
    type: "SYSTEM",
    title: "新增客戶資料",
    description: "從 Excel 匯入成功。",
    timestamp: "2026-04-21T11:00:00Z",
  }
];
