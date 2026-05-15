import { Report, ReportSection } from "./types";
import { SpinSession } from "../spin/types";
import { TheaterScore } from "../theater/types";
import { nanoid } from "nanoid";

export const reportService = {
  /**
   * 生成全新的報告
   */
  generateReport: (params: {
    clientId: string;
    clientName: string;
    spinSession?: SpinSession;
    theaterScore?: TheaterScore;
  }): Report => {
    const { clientId, clientName, spinSession, theaterScore } = params;
    const sections: ReportSection[] = [];

    // 1. Situation -> 需求背景
    if (spinSession) {
      const situationItems = spinSession.outputs.SITUATION.length > 0 
        ? spinSession.outputs.SITUATION.map(item => `- ${item}`).join('\n')
        : '- 客戶目前正處於評估階段，主要關注資產配置的穩定性。';
      
      sections.push({
        id: nanoid(),
        type: 'situation',
        title: '現狀與需求背景',
        content: `### 核心現況\n${situationItems}`,
      });

      // 2. Problem -> 風險缺口
      const problemItems = spinSession.outputs.PROBLEM.length > 0
        ? spinSession.outputs.PROBLEM.map(item => `- ${item}`).join('\n')
        : '- 尚未明確定義';

      sections.push({
        id: nanoid(),
        type: 'problem',
        title: '潛在風險缺口',
        content: `### 關鍵缺口分析\n> 基於討論，我們發現了以下關鍵問題：\n\n${problemItems}`,
      });

      // 3. Implication -> 風險影響分析
      const implicationItems = spinSession.outputs.IMPLICATION.length > 0
        ? spinSession.outputs.IMPLICATION.map(item => `- ${item}`).join('\n')
        : '- 若不即時處理，可能會對家庭長期財務穩健造成壓力。';

      sections.push({
        id: nanoid(),
        type: 'implication',
        title: '影響評估',
        content: `### 風險影響評估\n${implicationItems}`,
      });
    }

    // 4. Recommendation -> 建議方案
    sections.push({
      id: nanoid(),
      type: 'recommendation',
      title: '專業建議與方案',
      content: `### 配置建議方案\n- **優先補足**：意外與失能險種，建立家庭防護網。\n- **資產增值**：透過定期定額方式建構教育基金。\n- **核心目標**：達成保全與增值的雙重平衡。`,
    });

    // 5. Performance -> 內部演練回饋 (Internal Only 用)
    if (theaterScore) {
       sections.push({
         id: nanoid(),
         type: 'performance',
         title: '銷售演練回饋',
         content: `本次演練得分：${theaterScore.empathy}/100。建議：${theaterScore.improvedPhrasing[0] || '繼續保持'}。`,
       });
    }

    return {
      id: `rep_${Date.now()}`,
      clientId,
      clientName,
      spinSessionId: spinSession?.id,
      theaterSessionId: theaterScore ? 'from_sim' : undefined,
      sections,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * 過濾客戶可見的區塊
   */
  getClientSections: (report: Report) => {
    return report.sections.filter(s => s.type !== 'performance');
  }
};
