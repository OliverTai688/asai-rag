import { VisitPurpose, VisitObjective, SpinQuestion, ObjectionHandling, VisitMaterial } from "@/domains/visit/types";

export interface VisitMockData {
  objectives: VisitObjective[];
  spinQuestions: SpinQuestion[];
  objections: ObjectionHandling[];
  timeline: { label: string; duration: number }[];
  materials: VisitMaterial[];
}

// ─── 林建華專屬腳本 (中小企業主 × 遺產稅 × 長照缺口) ───────────────────────────
const LIN_FIRST_VISIT: VisitMockData = {
  objectives: [
    {
      id: "obj-lin-1",
      description: "讓林老闆意識到現有終身壽險 1,000 萬在遺產稅上可能形成反效果",
      successCriteria: "林老闆主動詢問如何規避/最小化遺產稅",
    },
    {
      id: "obj-lin-2",
      description: "引導林老闆正視長照風險（平均 7.3 年、月費 4–8 萬）對企業資金的潛在衝擊",
      successCriteria: "客戶願意接受下一步「長照需求試算」的安排",
    },
  ],
  spinQuestions: [
    {
      id: "sq-lin-s1",
      type: "S",
      question: "林老闆，目前您的事業經營大概幾年了？現在公司的主要股東結構是您和張太太，還是有其他夥伴？",
    },
    {
      id: "sq-lin-s2",
      type: "S",
      question: "您目前持有的那張南山人壽終身壽險，當初是以「給家人的保障」為出發點，還是有財務傳承或節稅的考量？",
    },
    {
      id: "sq-lin-p1",
      type: "P",
      question: "您知道依現行法規，身故的人壽保險理賠金，在某些情況下是會被計入遺產課稅的嗎？1,000 萬的保額，可能讓繼承人先繳一筆不小的稅。",
    },
    {
      id: "sq-lin-p2",
      type: "P",
      question: "如果有一天您或張太太需要長期照護，以現在每月長照費用 4 到 8 萬來估算，7 年就是 300 到 600 萬。這筆費用，您目前打算怎麼準備？",
    },
    {
      id: "sq-lin-i1",
      type: "I",
      question: "如果長照費用必須從公司資金或存款挪出，這對您的事業運轉、甚至最終的傳承計畫，會造成什麼影響？",
    },
    {
      id: "sq-lin-i2",
      type: "I",
      question: "假設這兩件事（遺產稅 + 長照費）同時發生，張太太或下一代繼承人可能會面對的是：帳面上有資產，但現金嚴重不足，到時候怎麼辦？",
    },
    {
      id: "sq-lin-n1",
      type: "N",
      question: "如果我們可以做一個規劃，讓保險的理賠金合法不計入遺產，同時又能預備一筆長照專款，您覺得這樣的安排，對您的整體傳承計畫幫助大嗎？",
    },
  ],
  objections: [
    {
      id: "oh-lin-1",
      expectedObjection: "我現在有的保險已經夠了，1000 萬壽險很夠用了。",
      suggestedResponse: "林老闆您說的對，壽險保額確實不小。但我想和您分享一個常見的誤解：大額壽險保單如果規劃方式不對，理賠金反而可能被計入遺產課稅，讓家人先交一筆稅才能拿到錢。我們今天不是要您多買，而是讓現有的錢花得更聰明。",
    },
    {
      id: "oh-lin-2",
      expectedObjection: "長照的事太遙遠了，我身體很好，不需要擔心。",
      suggestedResponse: "這個心態我完全理解，很多企業主都這樣想。但實際上，長照不一定是老年才發生，50 歲以後因為意外或急性病造成需要照護的比例也相當高。而且最重要的是：長照費用一旦發生，它佔用的是您事業的現金流，不是個人開銷而已。",
    },
    {
      id: "oh-lin-3",
      expectedObjection: "保費太貴了，我寧願把錢投資。",
      suggestedResponse: "您的投資眼光很好。我想分享一個角度：保險在這裡扮演的不是報酬的角色，而是一個「防禦性資產」。它的功能是讓您的投資不因為一個意外事件被迫中斷或套現。我們可以做個試算，看看用多少費用可以鎖住哪些風險。",
    },
  ],
  timeline: [
    { label: "寒暄破冰", duration: 10 },
    { label: "現況盤點（保單 / 事業）", duration: 15 },
    { label: "遺產稅問題點出", duration: 15 },
    { label: "長照缺口試算", duration: 15 },
    { label: "方向總結 & 下一步", duration: 5 },
  ],
  materials: [
    { id: "mat-lin-1", name: "遺產稅概念說明 DM（圖解版）", checked: true },
    { id: "mat-lin-2", name: "南山現有保單健診報告", checked: true },
    { id: "mat-lin-3", name: "長照需求試算工具（10 分鐘版）", checked: false },
    { id: "mat-lin-4", name: "企業主保障規劃建議書（草稿）", checked: false },
    { id: "mat-lin-5", name: "節稅架構示意圖（信託 + 保險搭配）", checked: false },
  ],
};

// ─── 通用腳本（依拜訪目的）──────────────────────────────────────────────────────
export const VISIT_MOCKS: Record<VisitPurpose, VisitMockData> = {
  FIRST_VISIT: {
    objectives: [
      { id: "obj-1", description: "建立專業信賴感與個人品牌印象", successCriteria: "客戶願意主動分享目前的財務擔憂" },
      { id: "obj-2", description: "完成初步需求探索 (Fact Finding)", successCriteria: "蒐集到至少 3 項現有保障缺口" },
    ],
    spinQuestions: [
      { id: "sq-1", type: "S", question: "目前您的保單大約是多久以前規劃的呢？" },
      { id: "sq-2", type: "P", question: "這幾年醫療環境變化很大，您是否擔心過現有保單可能跟不上現在的醫療自費水準？" },
      { id: "sq-3", type: "I", question: "如果真的發生需要大額自費的情況，這對您目前的緊急預備金會造成什麼樣的衝擊？" },
      { id: "sq-4", type: "N", question: "如果有一個方式可以在不增加太多預算的狀況下，把這個缺口補起來，您會想聽聽看嗎？" },
    ],
    objections: [
      {
        id: "oh-1",
        expectedObjection: "我已經有很多保險了。",
        suggestedResponse: "太好了！代表您很有風險意識。我今天不是要叫您多買，而是幫您檢視現有的保障是否還符合現況。",
      },
    ],
    timeline: [
      { label: "破冰", duration: 10 },
      { label: "初步溝通", duration: 15 },
      { label: "需求探索", duration: 20 },
      { label: "總結與下一步", duration: 15 },
    ],
    materials: [
      { id: "m-1", name: "個人簡介與公司簡報", checked: false },
      { id: "m-2", name: "理賠實例手札", checked: false },
      { id: "m-3", name: "空白需求分析表", checked: false },
    ],
  },
  ADD_ON: {
    objectives: [
      {
        id: "obj-1",
        description: "針對最近提出的理賠案，引導至保障不足的討論",
        successCriteria: "客戶同意增加醫療險額度",
      },
    ],
    spinQuestions: [
      { id: "sq-1", type: "S", question: "上次理賠過程還順利嗎？有沒有哪部分讓您覺得差一點點？" },
      { id: "sq-2", type: "P", question: "如果下次遇到的狀況比這次更嚴重，目前的保險額度您覺得夠嗎？" },
      { id: "sq-3", type: "I", question: "要是缺口沒補上，萬一真的發生重大疾病，是不是得動用到小孩的教育基金？" },
      { id: "sq-4", type: "N", question: "我們把缺口補足，讓您的家庭防護網更完整，這樣您心裡是不是會踏實許多？" },
    ],
    objections: [
      {
        id: "oh-1",
        expectedObjection: "最近預算有點緊。",
        suggestedResponse: "我了解。那我們先針對最迫切的缺口做微調，用少少的保費換大大的安心。",
      },
    ],
    timeline: [
      { label: "關懷與回訪", duration: 10 },
      { label: "理賠回顧", duration: 15 },
      { label: "缺口分析", duration: 20 },
      { label: "建議方案", duration: 15 },
    ],
    materials: [
      { id: "m-1", name: "原有保單健診報告", checked: true },
      { id: "m-2", name: "加保建議書", checked: false },
      { id: "m-3", name: "試算平衡表", checked: false },
    ],
  },
  RENEWAL: {
    objectives: [{ id: "obj-1", description: "確保客戶續約並維持良好關係", successCriteria: "完成續約手續" }],
    spinQuestions: [
      { id: "sq-1", type: "S", question: "這一年來您的生活或是工作有什麼大的變動嗎？" },
      { id: "sq-2", type: "P", question: "現有的保單內容，您還有哪一部分是覺得不太清楚或想調整的嗎？" },
      { id: "sq-3", type: "I", question: "如果這些調整沒做，未來理賠時才發現不符合需求，那時候可能就來不及了。" },
      { id: "sq-4", type: "N", question: "趁這次續約，我們一起把保障內容重新校準，讓它最符合您現在的狀態好嗎？" },
    ],
    objections: [
      {
        id: "oh-1",
        expectedObjection: "保費怎麼好像變貴了？",
        suggestedResponse: "那是因為隨著年齡增長，風險成本略有提高，這正說明了及時規劃的重要性。",
      },
    ],
    timeline: [
      { label: "近況更新", duration: 15 },
      { label: "保單內容檢視", duration: 20 },
      { label: "續約手續辦理", duration: 15 },
      { label: "後續服務說明", duration: 10 },
    ],
    materials: [
      { id: "m-1", name: "續約通知單", checked: true },
      { id: "m-2", name: "服務承諾卡", checked: false },
    ],
  },
  CARE: {
    objectives: [
      {
        id: "obj-1",
        description: "深化關係，不涉及銷售壓力",
        successCriteria: "客戶感到被重視並願意約下一次見面",
      },
    ],
    spinQuestions: [
      { id: "sq-1", type: "S", question: "好久不見，最近家裡一切都好嗎？" },
      {
        id: "sq-2",
        type: "P",
        question: "最近社會上討論的長照議題，您會擔心身邊的長輩也遇到類似狀況嗎？",
      },
      { id: "sq-3", type: "I", question: "這種事情要是沒個頭緒，家人都會覺得很不安吧？" },
      {
        id: "sq-4",
        type: "N",
        question: "今天我就是來看看有沒有什麼能幫上忙的，哪怕只是聊聊分享資訊也好。",
      },
    ],
    objections: [
      {
        id: "oh-1",
        expectedObjection: "我現在沒空聊保險。",
        suggestedResponse: "沒問題！我今天只是單純路過來關心一下，順便帶個小資訊給您參考。",
      },
    ],
    timeline: [
      { label: "閒話家常", duration: 20 },
      { label: "生活資訊分享", duration: 25 },
      { label: "關懷致意", duration: 15 },
    ],
    materials: [
      { id: "m-1", name: "客戶專屬生日小禮/資訊卡", checked: true },
      { id: "m-2", name: "最新理財健康週報", checked: false },
    ],
  },
  REFERRAL: {
    objectives: [
      {
        id: "obj-1",
        description: "取得至少 1 位準客戶的轉介紹",
        successCriteria: "獲得轉介紹對象的聯繫方式與背景",
      },
    ],
    spinQuestions: [
      { id: "sq-1", type: "S", question: "這段時間我的服務，您還滿意嗎？" },
      {
        id: "sq-2",
        type: "P",
        question: "身邊的朋友中，有沒有人也像您當初一樣，對保障規劃感到迷惘？",
      },
      { id: "sq-3", type: "I", question: "如果他們一直沒得到正確的資訊，萬一遇到風險可能真的會很困擾。" },
      {
        id: "sq-4",
        type: "N",
        question: "如果您覺得我的服務不錯，願意幫我牽個線，讓我也能幫幫他們嗎？",
      },
    ],
    objections: [
      {
        id: "oh-1",
        expectedObjection: "我怕朋友會反感。",
        suggestedResponse: "我明白。我絕對不會強迫推銷，只是分享有用的資訊，讓他們多一個專業管道諮詢而已。",
      },
    ],
    timeline: [
      { label: "服務滿意度確認", duration: 15 },
      { label: "價值分享", duration: 15 },
      { label: "轉介紹引導", duration: 20 },
      { label: "致謝與總結", duration: 10 },
    ],
    materials: [
      { id: "m-1", name: "轉介紹推薦卡", checked: false },
      { id: "m-2", name: "服務價值介紹簡報", checked: false },
    ],
  },
};

/**
 * 取得 AI 模擬訪前規劃內容
 * 優先依 clientId 返回角色專屬腳本，其次依拜訪目的返回通用腳本
 */
export function getMockVisitPlan(purpose: VisitPurpose, clientId?: string): VisitMockData {
  // 林建華 × 初訪 → 專屬企業主/遺產稅/長照腳本
  if (clientId === "c_lin" && purpose === "FIRST_VISIT") {
    return LIN_FIRST_VISIT;
  }
  return VISIT_MOCKS[purpose] ?? VISIT_MOCKS.FIRST_VISIT;
}
