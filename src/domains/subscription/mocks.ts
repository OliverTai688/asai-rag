import type { PaymentProvider, SubscriptionOrderStatus } from "./types";

export interface MockSubscriptionOrder {
  id: string;
  organizationId: string;
  organizationName: string;
  amount: number;
  currency: string;
  status: SubscriptionOrderStatus;
  provider: PaymentProvider | null;
  createdAt: string;
}

export const mockSubscriptionOrders: MockSubscriptionOrder[] = [
  {
    id: "ord_8f2k3l",
    organizationId: "org_001",
    organizationName: "永信保險經紀",
    amount: 79,
    currency: "TWD",
    status: "PAID",
    provider: "ECPAY",
    createdAt: "2026-06-11",
  },
  {
    id: "ord_7d1j2m",
    organizationId: "org_002",
    organizationName: "新光通訊處",
    amount: 29,
    currency: "TWD",
    status: "PAID",
    provider: "ECPAY",
    createdAt: "2026-06-10",
  },
  {
    id: "ord_6c0i1n",
    organizationId: "org_003",
    organizationName: "富邦業務一組",
    amount: 79,
    currency: "TWD",
    status: "PENDING",
    provider: "ECPAY",
    createdAt: "2026-06-09",
  },
  {
    id: "ord_5b9h0o",
    organizationId: "org_004",
    organizationName: "南山菁英團隊",
    amount: 29,
    currency: "TWD",
    status: "FAILED",
    provider: "ECPAY",
    createdAt: "2026-06-08",
  },
  {
    id: "ord_4a8g9p",
    organizationId: "org_005",
    organizationName: "中信尊榮通訊",
    amount: 0,
    currency: "TWD",
    status: "MANUAL_REVIEW",
    provider: "MANUAL",
    createdAt: "2026-06-07",
  },
];

export const mockAdminMetrics = {
  totalRevenue: 18420,
  activeSubscriptions: 132,
  activeTrials: 27,
  conversionRate: 0.34,
};
