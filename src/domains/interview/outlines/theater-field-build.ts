import type { InterviewOutline } from "../types";

export const theaterFieldBuildOutline: InterviewOutline = {
  id: "theater-field-build-v1",
  name: "劇場場域建構",
  role: "劇場導演訪談員",
  framework: "SCHEIN_3LAYER",
  principles: [
    "先建構可演練場域，再進入劇場；資料不足時只補問，不生成劇情。",
    "只把業務員明確確認的內容當作事實；推論必須保留推論語氣。",
    "NPC 不超過 4 位，優先保留焦點客戶、決策者、主要影響者與旁白補問角色。",
    "未知缺口交給旁白 NPC 或補問清單，不讓角色在演練中自行編造。",
    "不改 legacy Theater persona enum；本訪綱只產生 Route B 可消費的 build packet。",
  ],
  segments: [
    {
      order: 0,
      id: "theater-focus",
      title: "鎖定演練焦點",
      subtitle: "場域入口",
      frameworkStep: "SYNTHESIS",
      goal: "確定要演練的焦點客戶、拜訪場景與業務員最想練的瞬間。",
      dataSource: "訪談",
      purpose: "建立劇場 packet 的 focus client 與 scenario。",
      coreQuestions: [
        {
          id: "theater-focus-client",
          text: "這次劇場要演練哪一位客戶？你想練的是哪個拜訪情境？",
        },
        {
          id: "theater-focus-moment",
          text: "你最想練的是開場、釐清需求、處理異議，還是收下一步？",
        },
      ],
      followUps: [
        {
          id: "theater-focus-success",
          text: "如果演練成功，你希望自己在那一刻做得更好的是什麼？",
        },
      ],
    },
    {
      order: 1,
      id: "theater-roles",
      title: "辨識角色與關係",
      subtitle: "角色圖",
      frameworkStep: "SITUATION",
      goal: "整理客戶、決策者、影響者、業務員之間的關係與互動張力。",
      dataSource: "訪談／CRM",
      purpose: "建立劇場 NPC 種子與關係線。",
      coreQuestions: [
        {
          id: "theater-decision-maker",
          text: "這位客戶做決定時，通常還會受誰影響？",
        },
        {
          id: "theater-relationship",
          text: "你跟這位客戶目前的信任關係到哪裡？有哪些互動歷史？",
        },
      ],
      followUps: [
        {
          id: "theater-npc-priority",
          text: "如果只能放進一到兩位陪演角色，哪幾位最需要出現？",
        },
      ],
    },
    {
      order: 2,
      id: "theater-objections",
      title: "收斂異議與敏感點",
      subtitle: "阻力圖",
      frameworkStep: "PROBLEM",
      goal: "收集客戶可能的拒絕理由、防備語句與不適合直接碰觸的敏感資料。",
      dataSource: "訪談／推論",
      purpose: "讓演練能呈現真實阻力，但不把未確認推論當事實。",
      coreQuestions: [
        {
          id: "theater-objection-lines",
          text: "他最可能怎麼拒絕或岔開話題？你聽過他怎麼說嗎？",
        },
        {
          id: "theater-sensitive",
          text: "哪些話題屬於敏感資料，演練時只能輕碰或要先確認？",
        },
      ],
      followUps: [
        {
          id: "theater-known-or-guess",
          text: "這些阻力哪些是你確定聽過的，哪些只是目前推測？",
        },
      ],
    },
    {
      order: 3,
      id: "theater-confirmation",
      title: "補齊未知與開演門檻",
      subtitle: "準備檢核",
      frameworkStep: "SYNTHESIS",
      goal: "判斷是否能產生可演練劇場，或改回補問清單。",
      dataSource: "訪談整理",
      purpose: "輸出 TheaterBuildPacket 或 narrator question list。",
      coreQuestions: [
        {
          id: "theater-confirmed-facts",
          text: "哪些內容是可以讓 AI 角色直接採用的已確認事實？",
        },
        {
          id: "theater-open-questions",
          text: "哪些資訊還不夠確定，需要旁白或你下一次先補問？",
        },
      ],
      followUps: [
        {
          id: "theater-start-or-ask",
          text: "以現在資料量，你想先開演，還是先補問一輪？",
        },
      ],
    },
  ],
  outputSchema: [
    {
      key: "theater_build_packet",
      label: "劇場場域建構包",
      type: "rolecard",
      sourceSegments: [0, 1, 2, 3],
      description: "焦點客戶、場景、NPC 種子、關係、異議、敏感點、已知/推論/未知與旁白補問清單。",
    },
  ],
};
