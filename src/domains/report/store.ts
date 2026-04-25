"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Report, ReportSection, ShareMeta } from "./types";
import { nanoid } from "nanoid";
import { SEED_REPORTS } from "./mocks";

interface ReportState {
  reports: Report[];
  
  // Actions
  addReport: (report: Report) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  updateSection: (reportId: string, sectionId: string, content: string) => void;
  generateShareToken: (reportId: string) => string;
  recordAccess: (token: string) => void;
  getReportById: (id: string) => Report | undefined;
  getReportByToken: (token: string) => Report | undefined;
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      reports: SEED_REPORTS,

      addReport: (report) => {
        set((state) => ({ reports: [report, ...state.reports] }));
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
              updatedAt: new Date().toISOString()
            };
          }),
        }));
      },

      generateShareToken: (reportId) => {
        const token = nanoid(10);
        const share: ShareMeta = {
          token,
          accessCount: 0,
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
              }
            };
          }),
        }));
      },

      getReportById: (id) => get().reports.find((r) => r.id === id),
      
      getReportByToken: (token) => get().reports.find((r) => r.share?.token === token),
    }),
    {
      name: "sincerely:v1:reports",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
