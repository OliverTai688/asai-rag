import { requireOrgAdminRoute } from "@/lib/auth/route-guards";
import { getOrgTeamDashboardForSession } from "@/lib/org/org-aggregate-repository";
import { TeamPageClient } from "./team-page-client";

export default async function TeamPage() {
  const session = await requireOrgAdminRoute();
  const dashboard = await getOrgTeamDashboardForSession(session);

  return <TeamPageClient dashboard={dashboard} />;
}
