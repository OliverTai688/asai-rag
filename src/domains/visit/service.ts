import { useVisitStore } from "./store";
import { useClientStore } from "@/domains/client/store";
import type { Client } from "@/domains/client/types";
import { VisitPlan, VisitPurpose } from "./types";

type VisitPlanWithClientResponse = {
  client: Client;
  visitPlan: VisitPlan;
};

type VisitPlanListResponse = {
  visits: VisitPlanWithClientResponse[];
};

type CreateVisitPlanRemoteInput = {
  clientId: string;
  purpose: VisitPurpose;
  visitTime?: string;
};

type UpdateVisitPlanRemoteInput = Partial<
  Pick<
    VisitPlan,
    | "purpose"
    | "status"
    | "visitTime"
    | "objectives"
    | "spinQuestions"
    | "objections"
    | "materials"
    | "postVisitNotes"
    | "postVisitAnalysis"
  >
>;

async function parseApiError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null);
  const message =
    body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : `Request failed with status ${response.status}`;

  return new Error(message);
}

function cacheVisitResponse(response: VisitPlanWithClientResponse) {
  useClientStore.getState().setClient(response.client);
  useVisitStore.getState().setPlan(response.visitPlan);
}

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

  static async fetchPlansRemote() {
    const response = await fetch("/api/visits", { cache: "no-store" });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as VisitPlanListResponse;
    for (const item of body.visits) {
      useClientStore.getState().setClient(item.client);
    }
    useVisitStore.getState().setPlans(body.visits.map((item) => item.visitPlan));
    return body.visits;
  }

  static async fetchPlanByIdRemote(id: string) {
    const response = await fetch(`/api/visits/${id}`, { cache: "no-store" });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as VisitPlanWithClientResponse;
    cacheVisitResponse(body);
    return body;
  }

  static async createPlanRemote(input: CreateVisitPlanRemoteInput) {
    const response = await fetch("/api/visits", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as VisitPlanWithClientResponse;
    cacheVisitResponse(body);
    return body.visitPlan;
  }

  static async updatePlanRemote(id: string, updates: UpdateVisitPlanRemoteInput) {
    const response = await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const body = await response.json() as VisitPlanWithClientResponse;
    cacheVisitResponse(body);
    return body.visitPlan;
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
