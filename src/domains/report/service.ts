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
      sections.push({
        id: nanoid(),
        type: 'situation',
        title: '現狀與需求背景',
        content: spinSession.outputs.SITUATION.join('；') || '客戶目前正處於評估階段，主要關注資產配置的穩定性。',
      });

      // 2. Problem -> 風險缺口
      sections.push({
        id: nanoid(),
        type: 'problem',
        title: '潛在風險缺口',
        content: `基於討論，我們發現了以下關鍵問題：${spinSession.outputs.PROBLEM.join('、') || '尚未明確定義'}。`,
      });

      // 3. Implication -> 風險影響分析
      sections.push({
        id: nanoid(),
        type: 'implication',
        title: '影響評估',
        content: spinSession.outputs.IMPLICATION.join(' ') || '若不即時處理，可能會對家庭長期財務穩健造成壓力。',
      });
    }

    // 4. Recommendation -> 建議方案
    sections.push({
      id: nanoid(),
      type: 'recommendation',
      title: '專業建議與方案',
      content: '建議優先補足意外與失能險種，並透過定期定額方式建構教育基金，以達成保全與增值的雙重目標。',
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
