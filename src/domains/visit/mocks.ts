import { VisitPlan } from "./types";

export const SEED_VISIT_PLANS: VisitPlan[] = [
  {
    id: "plan-1",
    clientId: "c_wang", // 王大明
    purpose: "ADD_ON",
    status: "READY",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    objectives: [
      {
        id: "obj-1",
        description: "確認客戶對目前醫療險理賠上限的認知",
        successCriteria: "客戶能說出目前醫療實支實付的額度不足",
      },
    ],
    spinQuestions: [
      { id: "sq-1", type: "S", question: "請問目前小朋友的醫療開銷有準備專戶嗎？" },
      { id: "sq-2", type: "P", question: "如果遇到腸病毒需要住院一週，目前的保單能 cover 嗎？" },
      { id: "sq-3", type: "I", question: "這樣會不會影響到您和太太請假照顧的薪資收入？" },
      { id: "sq-4", type: "N", question: "如果有一個方案可以補足這段期間的薪資損失，您會想了解嗎？" },
    ],
    objections: [
      {
        id: "objh-1",
        expectedObjection: "現在保費太貴了，以後再說。",
        suggestedResponse: "我理解預算是考量，但我們可以先從基礎的定期險開始，用較低的預算先補足缺口。",
      },
    ],
    materials: [
      { id: "mat-1", name: "新生兒保單建議書", checked: true },
      { id: "mat-2", name: "醫療險理賠實例 DM", checked: false },
      { id: "mat-3", name: "建議書試算表", checked: false },
    ],
  },
  {
    id: "plan-2",
    clientId: "c_lin", // 林建華 — 中小企業主，年收 500 萬，妻 50 歲，現有終身壽 1000 萬
    purpose: "FIRST_VISIT",
    status: "READY",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
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
    materials: [
      { id: "mat-lin-1", name: "遺產稅概念說明 DM（圖解版）", checked: true },
      { id: "mat-lin-2", name: "南山現有保單健診報告", checked: true },
      { id: "mat-lin-3", name: "長照需求試算工具（10 分鐘版）", checked: false },
      { id: "mat-lin-4", name: "企業主保障規劃建議書（草稿）", checked: false },
      { id: "mat-lin-5", name: "節稅架構示意圖（信託 + 保險搭配）", checked: false },
    ],
    postVisitNotes: "",
  },
];
