import { useVisitStore } from "./store";
import { VisitPlan, VisitPurpose } from "./types";

export class VisitService {
  static getPlans() {
    return useVisitStore.getState().plans;
  }

  static getPlanById(id: string) {
    return useVisitStore.getState().getPlanById(id);
  }

  static getPlansByClientId(clientId: string) {
    return useVisitStore.getState().getPlansByClientId(clientId);
  }

  static createPlan(clientId: string, purpose: VisitPurpose) {
    return useVisitStore.getState().createEmptyPlan(clientId, purpose);
  }

  static updatePlan(id: string, updates: Partial<VisitPlan>) {
    return useVisitStore.getState().updatePlan(id, updates);
  }

  static deletePlan(id: string) {
    return useVisitStore.getState().deletePlan(id);
  }

  // Helper function to calculate if a plan is "READY" based on its filled content
  static evaluatePlanStatus(plan: VisitPlan): "DRAFT" | "READY" {
    // If it has objectives, spin questions, and materials, we consider it READY
    const isReady = 
      plan.objectives && plan.objectives.length > 0 &&
      plan.spinQuestions && plan.spinQuestions.length > 0 &&
      plan.objections && plan.objections.length > 0;
      
    return isReady ? "READY" : "DRAFT";
  }
}
