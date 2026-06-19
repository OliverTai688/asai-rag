import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireMemberRoute } from "@/lib/auth/route-guards";
import { demoLoginAccounts, isDemoPasswordLoginEnabled } from "@/lib/demo-login";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireMemberRoute();

  const unit = session.membership.primaryUnitId
    ? await prisma.organizationUnit.findUnique({
        where: { id: session.membership.primaryUnitId },
        select: { name: true },
      })
    : null;

  const viewer = {
    name: session.user.name,
    email: session.user.email,
    role: session.membership.role,
    organizationName: session.organization.name,
    unitName: unit?.name ?? null,
  };

  // Demo-only account switcher. Passwords stay server-side (resolved inside the
  // switch action), so only labels reach the client.
  const switchAccounts = isDemoPasswordLoginEnabled
    ? demoLoginAccounts.map((account) => ({
        email: account.email,
        label: account.label,
      }))
    : [];

  return (
    <DashboardShell viewer={viewer} switchAccounts={switchAccounts}>
      {children}
    </DashboardShell>
  );
}
