import { requireCurrentMember } from "@/lib/auth/current-workspace";
import { getMemberDashboardForSession } from "@/lib/dashboard/member-dashboard-repository";
import { DashboardPageClient } from "./dashboard-page-client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ demo?: string | string[] }>;
}) {
  const params = await searchParams;
  const demoMode = readSearchParam(params?.demo);
  const session = await requireCurrentMember();
  const dashboard = await getMemberDashboardForSession(session);

  return <DashboardPageClient initialDashboard={dashboard} demoMode={demoMode} />;
}

function readSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
