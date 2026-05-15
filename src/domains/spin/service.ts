import { useSpinStore } from "./store";
import { SpinPhase, SpinMode } from "./types";
import { clientService } from "../client/service";
import { nanoid } from "nanoid";

export const spinService = {
  /**
   * 獲取下一個階段
   */
  getNextPhase: (current: SpinPhase): SpinPhase => {
    const phases: SpinPhase[] = ["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF", "COMPLETE"];
    const idx = phases.indexOf(current);
    if (idx < phases.length - 1) return phases[idx + 1];
    return current;
  },

  /**
   * 封裝客戶脈絡
   */
  getClientContext: (clientId: string) => {
    const client = clientService.getClientById(clientId);
    if (!client) return "找不到客戶資料";
    
    return {
      profile: {
        name: client.name,
        occupation: client.occupation,
        income: client.annualIncome,
      },
      family: client.family,
      tags: client.aiTags,
      policies: client.existingPolicies,
    };
  },

  /**
   * 檢查回應是否包含階段完成信號
   */
  checkPhaseComplete: (text: string) => {
    return text.includes("[[PHASE_COMPLETE]]");
  },

  /**
   * 清理回應中的特殊標記
   */
  cleanResponse: (text: string) => {
    return text
      .replace(/\[\[PHASE_COMPLETE\]\]/g, "")
      .replace(/\[\[(INSIGHT|QUESTION|SUGGESTION|OUTPUT|PROFILE):.*?\]\]/g, "")
      .trim();
  },

  /**
   * 解析回應中的結構化數據
   */
  parseStructuredData: (text: string) => {
    const results: { type: string, content: string }[] = [];
    const regex = /\[\[(INSIGHT|QUESTION|SUGGESTION|OUTPUT|PROFILE):(.*?)\]\]/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      results.push({
        type: match[1],
        content: match[2].trim()
      });
    }
    
    return results;
  }
};
