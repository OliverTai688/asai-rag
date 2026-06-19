"use client";

import { create } from "zustand";
import { VisitPlan, VisitPurpose } from "./types";
import { demoSeedVisitPlans } from "@/domains/demo/seed-fixtures";

interface VisitState {
  plans: VisitPlan[];
  
  // Actions
  setPlans: (plans: VisitPlan[]) => void;
  setPlan: (plan: VisitPlan) => void;
  addPlan: (plan: VisitPlan) => void;
  updatePlan: (id: string, updates: Partial<VisitPlan>) => void;
  deletePlan: (id: string) => void;
  getPlanById: (id: string) => VisitPlan | undefined;
  getPlansByClientId: (clientId: string) => VisitPlan[];
  createEmptyPlan: (clientId: string, purpose: VisitPurpose, visitTime?: string) => string; // returns new plan ID
  clearAll: () => void;
}

export const useVisitStore = create<VisitState>()((set, get) => ({
  plans: demoSeedVisitPlans,

  setPlans: (plans) => set({ plans }),

  setPlan: (plan) => set((state) => {
    const exists = state.plans.some((item) => item.id === plan.id);

    return {
      plans: exists
        ? state.plans.map((item) => item.id === plan.id ? plan : item)
        : [plan, ...state.plans],
    };
  }),

  addPlan: (plan) => set((state) => ({
    plans: [plan, ...state.plans],
  })),

  updatePlan: (id, updates) => set((state) => ({
    plans: state.plans.map((p) => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p),
  })),

  deletePlan: (id) => set((state) => ({
    plans: state.plans.filter((p) => p.id !== id),
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

  clearAll: () => set({ plans: [] }),
}));
