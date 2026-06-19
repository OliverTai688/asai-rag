import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireMemberRoute } from "@/lib/auth/route-guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMemberRoute();

  return <DashboardShell>{children}</DashboardShell>;
}
