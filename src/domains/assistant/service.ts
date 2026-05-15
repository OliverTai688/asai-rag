import { AssistantMessage, AssistantContext } from "./types";
import { clientService } from "../client/service";
import { useSpinStore } from "../spin/store";

export const assistantService = {
  /**
   * 獲取智能風險提示
   */
  getRiskAlerts: () => {
    const clients = clientService.getAllClients();
    const sessions = useSpinStore.getState().sessions;
    
    // 1. 跟進逾期 (超過 7 天未聯繫)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const overdueClients = clients.filter(c => {
      if (!c.lastInteraction) return true;
      return new Date(c.lastInteraction) < sevenDaysAgo;
    });
    
    // 2. SPIN 缺口 (高價值客戶尚未完成風險缺口定義)
    // 定義高價值: 年收入 > 200萬
    // 定義缺口: 沒有 session 或 session 沒有 IMPLICATION 階段的 output
    const highValueClients = clients.filter(c => c.annualIncome > 2000000);
    const gapClients = highValueClients.filter(c => {
      const clientSessions = sessions.filter(s => s.clientId === c.id);
      if (clientSessions.length === 0) return true;
      
      // 檢查是否所有 session 都沒有 IMPLICATION 產出
      return clientSessions.every(s => !s.outputs.IMPLICATION || s.outputs.IMPLICATION.length === 0);
    });
    
    return {
      overdue: {
        count: overdueClients.length,
        names: overdueClients.slice(0, 3).map(c => c.name),
        description: overdueClients.length > 0 
          ? `${overdueClients.slice(0, 2).map(c => c.name).join('、')}${overdueClients.length > 2 ? ' 等' : ''} 已超過 7 天未聯繫。`
          : "目前沒有跟進逾期的客戶。"
      },
      spinGap: {
        count: gapClients.length,
        description: gapClients.length > 0
          ? `有 ${gapClients.length} 位高價值客戶尚未完成風險缺口定義。`
          : "所有高價值客戶均已完成風險缺口定義。"
      }
    };
  },

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
        { id: '1', label: `分析 ${clientName || '該客戶'} 的潛在保障缺口`, action: 'ANALYZE_GAP', type: 'INFO' as const },
        { id: '2', label: '幫我針對此客戶生成三條拜訪建議', action: 'GENERATE_TIPS', type: 'ACTION' as const },
        { id: '7', label: '這名客戶最近有哪些重要動態？', action: 'GET_TIMELINE', type: 'INFO' as const },
      ];
    }
    
    if (route.includes('/spin')) {
      return [
        { id: '3', label: '我該如何針對這個痛點引發「暗示性問題」？', action: 'ASK_PROBLEM_TIPS', type: 'INFO' as const },
        { id: '4', label: '總結目前的對話進度與待辦事項', action: 'SUMMARY_PROGRESS', type: 'ACTION' as const },
        { id: '8', label: '查看 SPIN 銷售模型範例', action: 'VIEW_MODEL', type: 'INFO' as const },
      ];
    }

    return [
      { id: '5', label: '我想看本週所有「待開發」的客戶清單', action: 'LIST_PROSPECTS', type: 'ACTION' as const },
      { id: '6', label: '幫我分析高風險客戶並跳轉到詳細報告', action: 'ANALYZE_RISKS', type: 'ALERT' as const },
      { id: '9', label: '目前的團隊整體目標達成率是多少？', action: 'TEAM_GOAL', type: 'INFO' as const },
      { id: '10', label: '幫我串接 Google Calendar 行事曆', action: 'CONNECT_CALENDAR', type: 'ACTION' as const },
    ];
  }
};
