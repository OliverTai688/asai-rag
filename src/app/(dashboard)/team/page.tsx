import { requireOrgAdminRoute } from "@/lib/auth/route-guards";
import { TeamPageClient } from "./team-page-client";

export default async function TeamPage() {
  await requireOrgAdminRoute();

  return <TeamPageClient />;
}
