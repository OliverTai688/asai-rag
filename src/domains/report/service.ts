import { nanoid } from "nanoid";

import type { Client } from "../client/types";
import type { SpinSession } from "../spin/types";
import type { TheaterScore } from "../theater/types";
import {
  buildReportSection,
  DEFAULT_REPORT_PURPOSE,
  getReportPurposeMeta,
  type ReportBuildContext,
} from "./blueprints";
import { INTERNAL_ONLY_SECTION_TYPES, Report, ReportPurpose, ReportSection } from "./types";

function todayLabel(): string {
  return new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
}

export const reportService = {
  /**
   * 依「報告用途 / 目標」生成結構化報告。
   * 每份報告至少涵蓋情境、分析、方法論（SPIN）、行動四大構面，
   * 並依用途調整強調重點與長度（約 5–8 頁）。
   */
  generateReport: (params: {
    clientId: string;
    clientName: string;
    purpose?: ReportPurpose;
    goal?: string;
    client?: Client | null;
    spinSession?: SpinSession;
    theaterScore?: TheaterScore;
  }): Report => {
    const { clientId, clientName, spinSession, theaterScore, client } = params;
    const purpose = params.purpose ?? DEFAULT_REPORT_PURPOSE;
    const meta = getReportPurposeMeta(purpose);

    const ctx: ReportBuildContext = {
      clientName,
      purpose,
      goal: params.goal,
      client,
      spinSession,
      theaterScore,
      generatedDate: todayLabel(),
    };

    const sections: ReportSection[] = meta.blueprint.map((type) => {
      const built = buildReportSection(type, ctx);
      return {
        id: nanoid(),
        type,
        title: built.title,
        content: built.content,
      };
    });

    const now = new Date().toISOString();
    return {
      id: `rep_${Date.now()}`,
      clientId,
      clientName,
      purpose,
      goal: params.goal?.trim() || undefined,
      spinSessionId: spinSession?.id,
      theaterSessionId: theaterScore ? "from_sim" : undefined,
      sections,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * 過濾客戶可見的區塊（移除僅內部可見構面，例如 SPIN 方法論與演練回饋）。
   */
  getClientSections: (report: Report) => {
    return report.sections.filter((section) => !INTERNAL_ONLY_SECTION_TYPES.includes(section.type));
  },
};
