export type ExperienceStatus = "ready" | "partial" | "missing";

export type GapPriority = "P0" | "P1" | "P2";

export interface ExperienceSummary {
  version: string;
  readiness: number;
  promise: string;
  primaryRoute: string;
}

export interface ExperienceStep {
  id: string;
  order: string;
  title: string;
  route: string;
  routeLabel: string;
  description: string;
  outcome: string;
  status: ExperienceStatus;
  metric: string;
}

export interface BenchmarkSite {
  name: string;
  url: string;
  position: string;
  capabilities: string[];
  implication: string;
}

export interface ReadinessSignal {
  label: string;
  value: string;
  detail: string;
  status: ExperienceStatus;
}

export interface DevelopmentGap {
  priority: GapPriority;
  title: string;
  detail: string;
  nextAction: string;
  status: ExperienceStatus;
}

