import { requireOrgSettingsRoute } from "@/lib/auth/route-guards";
import { OrgSettingsClient } from "./settings-client";

export default async function TeamSettingsPage() {
  await requireOrgSettingsRoute();

  return <OrgSettingsClient />;
}
