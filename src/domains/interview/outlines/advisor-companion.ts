import { InterviewOutline } from "../types";

export const advisorCompanionOutline: InterviewOutline = {
  id: "advisor-companion-v1",
  name: "顧問陪談",
  role: "顧問訪談業務員",
  framework: "SPIN_HIDDEN",
  principles: [
    "全程用白話，不對業務員提 SPIN。",
    "核心題每段必問，追問依回答彈性使用，但不跳段。",
    "段落自然接續，不使用 phase-complete 機制。",
    "業務員答不出來的內容，視為下次拜訪要確認的資料。",
    "最後一定要收斂成客戶輪廓表與對話準備卡。",
  ],
  segments: [
    {
      order: 0,
      id: "focus-client",
      title: "先確定我們在談誰",
      subtitle: "暖身・聚焦",
      frameworkStep: "SYNTHESIS",
      goal: "鎖定一位具體客戶，了解業務員的起點與最沒把握的地方。",
      dataSource: "訪談",
      purpose: "建立訪談焦點與業務員卡點。",
      coreQuestions: [
        {
          id: "focus-client-relationship",
          text: "你這次想準備拜訪的是哪一位客戶？你跟他的關係是？",
        },
        {
          id: "focus-client-uncertainty",
          text: "關於要怎麼跟他開口、聊什麼，你現在最沒把握的是哪一塊？",
        },
      ],
      followUps: [
        {
          id: "focus-client-trigger",
          text: "為什麼想找這位客戶談？最近有什麼契機嗎？",
        },
        {
          id: "focus-client-history",
          text: "你之前跟他接觸過嗎？上次大概聊到哪裡？",
        },
      ],
      guideNote: "先讓業務員放鬆，講出真正的卡點。",
    },
    {
      order: 1,
      id: "current-situation",
      title: "先把客戶現況拼出來",
      subtitle: "顧問框架：Situation 情境",
      frameworkStep: "SITUATION",
      goal: "整理客戶的家庭、工作、財務與現有保障，分出已知與待確認。",
      dataSource: "系統／會議／訪談",
      purpose: "建立客戶輪廓的事實面與待確認清單。",
      coreQuestions: [
        {
          id: "situation-family",
          text: "他的家庭大概是什麼狀況？誰是家裡的經濟支柱？",
        },
        {
          id: "situation-work-income",
          text: "他的工作跟收入，你知道多少？",
        },
        {
          id: "situation-career-stage",
          text: "他的職涯階段或未來規劃，你知道多少？",
        },
        {
          id: "situation-policies",
          text: "他現在有哪些保險？內容你清楚嗎？",
        },
      ],
      followUps: [
        {
          id: "situation-known-unknown",
          text: "這些裡面，哪些是你確定的，哪些其實是你猜的？",
        },
        {
          id: "situation-next-questions",
          text: "那些還不確定的，下次見面可以怎麼自然問出來？",
        },
      ],
      guideNote: "邊聽邊把已知與待確認分兩欄。",
    },
    {
      order: 2,
      id: "possible-problems",
      title: "他可能在煩惱什麼",
      subtitle: "顧問框架：Problem 問題",
      frameworkStep: "PROBLEM",
      goal: "從客戶現況推測潛在困擾與風險，找出自然關心與切入點。",
      dataSource: "訪談／推論",
      purpose: "形成客戶痛點與可切入的關心點。",
      coreQuestions: [
        {
          id: "problem-pressure",
          text: "以你對他的了解，他生活裡可能有哪些煩惱或壓力？",
        },
        {
          id: "problem-unseen-risks",
          text: "有哪些風險，是他自己可能還沒意識到的？",
        },
      ],
      followUps: [
        {
          id: "problem-recent-trigger",
          text: "他最近生活有沒有發生什麼事，可能讓他開始在意這些？",
        },
        {
          id: "problem-most-felt",
          text: "這些煩惱裡，你覺得哪一個他最有感？",
        },
        {
          id: "problem-client-owned",
          text: "你會怎麼讓他自己講出這個煩惱，而不是你直接點破？",
        },
      ],
      guideNote: "讓客戶自己說出煩惱，遠比業務員直接指出更有效。",
    },
    {
      order: 3,
      id: "implications",
      title: "如果不處理會怎樣",
      subtitle: "顧問框架：Implication 影響",
      frameworkStep: "IMPLICATION",
      goal: "想清楚問題若不處理的後果，作為引導客戶思考的素材。",
      dataSource: "訪談／推論",
      purpose: "建立影響層素材，但不製造恐懼或壓迫。",
      coreQuestions: [
        {
          id: "implication-family-impact",
          text: "如果這些煩惱一直沒處理，對他和家人可能造成什麼影響？",
        },
        {
          id: "implication-worst-outcome",
          text: "這些影響裡，哪一個是他最不希望發生的？",
        },
      ],
      followUps: [
        {
          id: "implication-important-person",
          text: "這些影響牽涉到他最在意的誰？",
        },
        {
          id: "implication-ask-not-tell",
          text: "對話時，你可以怎麼用問的讓他自己想到這些，而不是你直接說？",
        },
      ],
      guideNote: "影響是用來幫客戶看清楚，不是拿來嚇客戶。",
    },
    {
      order: 4,
      id: "need-payoff",
      title: "幫他解決後，他會在意什麼",
      subtitle: "顧問框架：Need-Payoff 需求",
      frameworkStep: "NEED_PAYOFF",
      goal: "釐清客戶真正想要的安心與價值，作為對話收尾方向。",
      dataSource: "訪談／推論",
      purpose: "形成價值主張與下一步承諾方向。",
      coreQuestions: [
        {
          id: "need-payoff-feeling",
          text: "如果這些問題都被妥善解決，他最想得到的是什麼感覺或結果？",
        },
        {
          id: "need-payoff-helpful-plan",
          text: "什麼樣的規劃，會讓他覺得這真的有幫到我？",
        },
        {
          id: "need-payoff-support",
          text: "除了保單規劃本身，身邊有沒有後勤資源可以服務客戶？",
        },
      ],
      followUps: [
        {
          id: "need-payoff-decision-party",
          text: "他做決定時，會不會需要跟誰商量？",
        },
        {
          id: "need-payoff-next-step",
          text: "對話的最後，你希望他答應你的下一步是什麼？",
        },
      ],
      guideNote: "價值要讓客戶自己說出口，同時先想好下一步承諾。",
    },
    {
      order: 5,
      id: "conversation-plan",
      title: "那你打算怎麼跟他聊",
      subtitle: "收斂・對話準備",
      frameworkStep: "SYNTHESIS",
      goal: "收斂開場、切入點、注意事項與先問問題。",
      dataSource: "訪談",
      purpose: "產出可帶去拜訪的對話準備卡。",
      coreQuestions: [
        {
          id: "conversation-opening",
          text: "根據我們剛剛談的，你打算怎麼開場？先想一個不談商品的版本。",
        },
        {
          id: "conversation-topics",
          text: "哪些話題可以幫你自然破冰、拉近距離？",
        },
        {
          id: "conversation-landmines",
          text: "跟這位客戶相處，有什麼要特別注意或避免的？",
        },
      ],
      followUps: [
        {
          id: "conversation-top-three",
          text: "你準備好先問哪三個問題了嗎？",
        },
        {
          id: "conversation-defensive",
          text: "如果他防備、不太想聊，你會怎麼回應？",
        },
      ],
      guideNote: "陪業務員把開場白實際講一遍，並整理到準備卡。",
    },
    {
      order: 6,
      id: "review-and-confirm",
      title: "整理成可帶走的準備",
      subtitle: "產出・確認",
      frameworkStep: "SYNTHESIS",
      goal: "把訪談內容整理成客戶輪廓表、對話準備卡、待確認清單與 PQ/Issue placeholder。",
      dataSource: "訪談整理",
      purpose: "讓業務員能檢查 AI 總結、編輯並確認後再用於拜訪。",
      coreQuestions: [
        {
          id: "review-profile",
          text: "這份客戶輪廓有沒有哪裡需要修正或補充？",
        },
        {
          id: "review-prep-card",
          text: "這張對話準備卡，你覺得明天真的拿去用還缺什麼？",
        },
      ],
      followUps: [
        {
          id: "review-pq",
          text: "是否需要補 Personal Questionnaire 題目來確認風險感受？",
        },
        {
          id: "review-visit-plan",
          text: "這些內容要不要升級成一份訪前規劃？",
        },
      ],
      guideNote: "AI 總結只作草稿，需由業務員確認後才成立。",
    },
  ],
  outputSchema: [
    {
      key: "client_profile",
      label: "客戶輪廓表",
      type: "table",
      sourceSegments: [0, 1, 2, 3, 4],
      description: "客戶與關係、家庭狀況、工作收入、現有保障、已知與待確認、可能風險、最在意的人、相處風格。",
    },
    {
      key: "known_facts",
      label: "已確認事實",
      type: "list",
      sourceSegments: [0, 1],
    },
    {
      key: "unknowns_to_confirm",
      label: "待確認清單",
      type: "list",
      sourceSegments: [1, 2, 3, 4],
    },
    {
      key: "spin_question_candidates",
      label: "SPIN 問題清單",
      type: "spinQuestions",
      sourceSegments: [1, 2, 3, 4, 5],
    },
    {
      key: "conversation_prep_card",
      label: "對話準備卡",
      type: "table",
      sourceSegments: [5, 6],
      description: "開場白、可切入話題、先問三題、要避免的地雷、想取得的下一步。",
    },
    {
      key: "pq_placeholder",
      label: "Personal Questionnaire",
      type: "pq",
      sourceSegments: [3, 6],
      description: "依 RES-010 題庫補齊家庭責任、收入中斷、醫療長照、退休現金流、子女/依賴者、保單理解與決策一致性。",
    },
    {
      key: "issue_maturity",
      label: "Issue Readiness Level 0-5",
      type: "table",
      sourceSegments: [2, 3, 4, 6],
      description: "依 RES-010 評估議題就緒度：事實完整度、問題表徵、風險與因應、決策準備、顧問行動性。",
    },
  ],
};
