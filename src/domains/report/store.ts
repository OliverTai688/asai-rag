"use client";

import { create } from "zustand";
import { Report, ShareMeta } from "./types";
import { nanoid } from "nanoid";
import { demoSeedReports } from "@/domains/demo/seed-fixtures";

interface ReportState {
  reports: Report[];
  
  // Actions
  addReport: (report: Report) => void;
  upsertReports: (reports: Report[]) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  updateSection: (reportId: string, sectionId: string, content: string) => void;
  generateShareToken: (reportId: string) => string;
  recordAccess: (token: string) => void;
  getReportById: (id: string) => Report | undefined;
  getReportByToken: (token: string) => Report | undefined;
  clearAll: () => void;
}

export const useReportStore = create<ReportState>()((set, get) => ({
  reports: demoSeedReports,

  addReport: (report) => {
    set((state) => ({ reports: [report, ...state.reports] }));
  },

  // Merge DB-backed reports into the cache without dropping in-session reports.
  upsertReports: (incoming) => {
    set((state) => {
      const incomingIds = new Set(incoming.map((report) => report.id));
      const retained = state.reports.filter((report) => !incomingIds.has(report.id));
      return { reports: [...incoming, ...retained] };
    });
  },

  updateReport: (id, updates) => {
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    }));
  },

  updateSection: (reportId, sectionId, content) => {
    set((state) => ({
      reports: state.reports.map((r) => {
        if (r.id !== reportId) return r;
        return {
          ...r,
          sections: r.sections.map((s) =>
            s.id === sectionId ? { ...s, content, isEdited: true } : s
          ),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  generateShareToken: (reportId) => {
    const token = nanoid(10);
    const share: ShareMeta = {
      token,
      accessCount: 0,
      branding: {
        organizationName: "誠問 AI Demo 個人工作區",
        unitName: "Demo 台北通訊處",
        brandColor: "#1A3A6B",
        poweredByLabel: "誠問 AI",
      },
      portal: {
        enabled: true,
        loginHref: "/client-login",
        visibleScopes: ["授權報告", "預約下一步", "補充資料"],
      },
      ctaConfig: {
        primaryLabel: "預約下一步",
        primaryHref: "#next-step",
        secondaryLabel: "登入客戶入口",
        secondaryHref: "/client-login",
      },
    };
    get().updateReport(reportId, { share });
    return token;
  },

  recordAccess: (token) => {
    set((state) => ({
      reports: state.reports.map((r) => {
        if (r.share?.token !== token) return r;
        return {
          ...r,
          share: {
            ...r.share,
            accessCount: r.share.accessCount + 1,
            lastAccessedAt: new Date().toISOString(),
          },
        };
      }),
    }));
  },

  getReportById: (id) => get().reports.find((r) => r.id === id),

  getReportByToken: (token) => get().reports.find((r) => r.share?.token === token),

  clearAll: () => set({ reports: [] }),
}));
