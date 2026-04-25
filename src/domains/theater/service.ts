import { TheaterPersonaType, TheaterScore } from "./types";
import { SpinSession } from "../spin/types";
import { Client } from "../client/types";

export const theaterService = {
  /**
   * 根據客戶脈絡與 SPIN 產出推論人格
   */
  derivePersona: (client: Client, _spinSession: SpinSession): TheaterPersonaType => {
    // 邏輯：高收入且有標籤提到焦慮 -> 可能是 BUSY 或 SKEPTICAL
    if (client.annualIncome > 2000000) {
      return Math.random() > 0.5 ? 'BUSY' : 'SKEPTICAL';
    }
    
    // 如果有標籤提到感性或家庭連結
    if (client.aiTags.some((t: string) => t.includes('家庭') || t.includes('子女'))) {
      return 'EMOTIONAL';
    }

    return 'CONSERVATIVE';
  },

  /**
   * 獲取人格特質描述
   */
  getPersonaDetails: (type: TheaterPersonaType) => {
    const details = {
      CONSERVATIVE: {
        label: "保守穩健型",
        traits: ["重視品牌", "反覆確認細節", "不喜歡激進方案"],
        style: "客氣但有距離感",
      },
      SKEPTICAL: {
        label: "邏輯懷疑型",
        traits: ["數據導向", "質疑 ROI", "對業務員有防備心"],
        style: "直接、尖銳、富有邏輯",
      },
      BUSY: {
        label: "精明忙碌型",
        traits: ["沒耐心", "重點導向", "時間成本極高"],
        style: "簡短、節奏快",
      },
      EMOTIONAL: {
        label: "情感驅動型",
        traits: ["重視關懷", "容易受故事感動", "決策受家人影響大"],
        style: "感性語氣、分享生活點滴",
      }
    };
    return details[type];
  },

  /**
   * 計算緊張度變化 (模擬)
   */
  calculateTensionDelta: (message: string): number => {
    const triggerWords = ["合約", "簽名", "預算", "多少錢"];
    const empathyWords = ["理解", "感同身受", "沒關係", "辛苦了"];
    
    let delta = 0;
    triggerWords.forEach(w => { if (message.includes(w)) delta += 5; });
    empathyWords.forEach(w => { if (message.includes(w)) delta -= 8; });
    
    return delta;
  },

  /**
   * 生成最終評分
   */
  generateMockScore: (): TheaterScore => {
    return {
      empathy: 85,
      questioning: 70,
      clarity: 90,
      objectionHandling: 65,
      closing: 50,
      missedOpportunities: [
        "客戶提到擔心小孩教育時，未能及時切入教育金保障",
        "在客戶詢問回報率時，解釋過於繁複"
      ],
      improvedPhrasing: [
        "原句：『這個方案很划算』 -> 建議：『這個方案能在您最需要時提供穩定的支撐』",
        "原句：『您要不要簽字』 -> 建議：『我們可以先針對這個保障點做個初步規劃』"
      ]
    };
  }
};
