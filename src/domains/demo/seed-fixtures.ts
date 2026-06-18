import {
  benchmarkSites,
  developmentGaps,
  experienceSteps,
  experienceSummary,
  readinessSignals,
} from "@/domains/experience/mocks";
import { mockAdminMetrics, mockSubscriptionOrders } from "@/domains/subscription/mocks";
import { SEED_CLIENTS } from "@/domains/client/mocks";
import { SEED_EVENTS } from "@/domains/event/mocks";
import { SEED_REPORTS } from "@/domains/report/mocks";
import { SEED_SPIN_MESSAGES, SEED_SPIN_SESSIONS } from "@/domains/spin/mocks";
import { SEED_VISIT_PLANS } from "@/domains/visit/mocks";

export const demoSeedClients = SEED_CLIENTS;
export const demoSeedEvents = SEED_EVENTS;
export const demoSeedReports = SEED_REPORTS;
export const demoSeedSpinSessions = SEED_SPIN_SESSIONS;
export const demoSeedSpinMessages = SEED_SPIN_MESSAGES;
export const demoSeedVisitPlans = SEED_VISIT_PLANS;

export const demoExperienceSummary = experienceSummary;
export const demoExperienceSteps = experienceSteps;
export const demoBenchmarkSites = benchmarkSites;
export const demoReadinessSignals = readinessSignals;
export const demoDevelopmentGaps = developmentGaps;

export const demoSubscriptionOrders = mockSubscriptionOrders;
export const demoAdminMetrics = mockAdminMetrics;
