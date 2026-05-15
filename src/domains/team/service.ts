import { VisitPlan } from "../visit/types";
import { Client } from "../client/types";
import { TeamAggregatedStats } from "./types";

export const teamService = {
  aggregateStats: (plans: VisitPlan[], clients: Client[]): TeamAggregatedStats => {
    // 1. Calculate active plans
    const totalActivePlans = plans.filter(p => p.status === "READY" || p.status === "DRAFT").length;
    
    // 2. Calculate completed visits
    const totalCompletedVisits = plans.filter(p => p.status === "COMPLETED").length;

    // 3. Risk points & Opportunities (Mocking based on client AI tags for now)
    // In a real app, we'd parse the AI analysis results
    const totalRiskPoints = clients.length * 2; // Simulated
    const totalOpportunities = clients.length * 1.5; // Simulated

    // 4. Client Heatmap (Top Tags)
    const allTags = clients.flatMap(c => c.aiTags);
    const tagCounts: Record<string, number> = {};
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    const clientHeatmap = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalActivePlans,
      totalCompletedVisits,
      totalRiskPoints: Math.floor(totalRiskPoints),
      totalOpportunities: Math.floor(totalOpportunities),
      clientHeatmap
    };
  }
};
