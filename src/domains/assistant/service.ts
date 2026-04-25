import { AssistantMessage, AssistantContext } from "./types";

export const assistantService = {
  /**
   * 解析 AI 回應中的工具指令
   * 格式: [[TOOL:action:params]]
   */
  parseTools: (text: string) => {
    const tools: { action: string, params: string }[] = [];
    const regex = /\[\[TOOL:(.*?)(?::(.*?))?\]\]/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      tools.push({
        action: match[1],
        params: match[2] || ""
      });
    }
    
    return tools;
  },

  /**
   * 清理 AI 回應中的工具標記
   */
  cleanResponse: (text: string) => {
    return text.replace(/\[\[TOOL:.*?\]\]/g, "").trim();
  },

  /**
   * 獲取當前應用的建議清單 (靜態模擬)
   */
  getStaticSuggestions: (context: AssistantContext) => {
    const { route, clientName } = context;
    
    if (route.includes('/crm/')) {
      return [
        { id: '1', label: `分析 ${clientName || '客戶'} 的保障缺口`, action: 'ANALYZE_GAP', type: 'INFO' as const },
        { id: '2', label: '生成拜訪建議', action: 'GENERATE_TIPS', type: 'ACTION' as const },
      ];
    }
    
    if (route.includes('/spin')) {
      return [
        { id: '3', label: '我該如何引發問題？', action: 'ASK_PROBLEM_TIPS', type: 'INFO' as const },
        { id: '4', label: '總結目前進度', action: 'SUMMARY_PROGRESS', type: 'ACTION' as const },
      ];
    }

    return [
      { id: '5', label: '本週待開發客戶', action: 'LIST_PROSPECTS', type: 'ACTION' as const },
      { id: '6', label: '分析高風險清單', action: 'ANALYZE_RISKS', type: 'ALERT' as const },
    ];
  }
};
