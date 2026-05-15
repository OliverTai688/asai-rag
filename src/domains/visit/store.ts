"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { VisitPlan, VisitPurpose, VisitPlanStatus } from "./types";
import { SEED_VISIT_PLANS } from "./mocks";

interface VisitState {
  plans: VisitPlan[];
  
  // Actions
  addPlan: (plan: VisitPlan) => void;
  updatePlan: (id: string, updates: Partial<VisitPlan>) => void;
  deletePlan: (id: string) => void;
  getPlanById: (id: string) => VisitPlan | undefined;
  getPlansByClientId: (clientId: string) => VisitPlan[];
  createEmptyPlan: (clientId: string, purpose: VisitPurpose, visitTime?: string) => string; // returns new plan ID
  clearAll: () => void;
}

export const useVisitStore = create<VisitState>()(
  persist(
    (set, get) => ({
      plans: SEED_VISIT_PLANS,

      addPlan: (plan) => set((state) => ({ 
        plans: [plan, ...state.plans] 
      })),

      updatePlan: (id, updates) => set((state) => ({
        plans: state.plans.map((p) => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
      })),

      deletePlan: (id) => set((state) => ({
        plans: state.plans.filter((p) => p.id !== id)
      })),

      getPlanById: (id) => get().plans.find((p) => p.id === id),

      getPlansByClientId: (clientId) => get().plans.filter((p) => p.clientId === clientId),

      createEmptyPlan: (clientId, purpose, visitTime) => {
        const newId = `plan-${Date.now()}`;
        const newPlan: VisitPlan = {
          id: newId,
          clientId,
          purpose,
          status: "DRAFT",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          visitTime: visitTime,
          objectives: [],
          spinQuestions: [],
          objections: [],
          materials: [],
        };
        set((state) => ({ plans: [newPlan, ...state.plans] }));
        return newId;
      },

      clearAll: () => set({ plans: [] })
    }),
    {
      name: "sincerely:v1:visits",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
