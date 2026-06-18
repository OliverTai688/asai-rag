import { requireOrgAdminRoute } from "@/lib/auth/route-guards";
import { OrgSettingsClient } from "./settings-client";

export default async function TeamSettingsPage() {
  await requireOrgAdminRoute();

  return <OrgSettingsClient />;
}
