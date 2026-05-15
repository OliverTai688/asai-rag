export interface TeamMemberStats {
  clients: number;
  closedThisMonth: number;
  revenue: number;
  spinSessions: number;
  visitPlans: {
    total: number;
    completed: number;
    draft: number;
  };
  aiInsightHits: number; // Risks + Opportunities identified
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  region: string;
  avatar: string;
  color: string;
  status: "online" | "away" | "offline";
  tags: string[];
  stats: TeamMemberStats;
}

export interface TeamAggregatedStats {
  totalActivePlans: number;
  totalCompletedVisits: number;
  totalRiskPoints: number;
  totalOpportunities: number;
  clientHeatmap: {
    tag: string;
    count: number;
  }[];
}
