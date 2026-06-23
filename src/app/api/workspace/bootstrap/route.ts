import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { buildBillingSubscriptionCapability } from "@/lib/billing/subscription-capability-repository";
import {
  buildWorkspaceBootstrapNavigation,
  toWorkspaceBootstrapSurface,
} from "@/lib/navigation/workspace-sidebar";

export async function GET(request: Request) {
  try {
    const session = await requireCurrentMember();
    const subscription = await buildBillingSubscriptionCapability(session);
    const aiRemaining = Math.max(0, session.organization.monthlyAiQuota - session.organization.monthlyAiUsed);
    const requestedSurface = toWorkspaceBootstrapSurface(
      new URL(request.url).searchParams.get("surface"),
    );
    const navigation = buildWorkspaceBootstrapNavigation(session, requestedSurface, {
      subscription,
    });

    return Response.json({
      user: session.user,
      organization: session.organization,
      membership: session.membership,
      planCapability: session.planCapability,
      subscription,
      aiQuota: {
        monthly: session.organization.monthlyAiQuota,
        used: session.organization.monthlyAiUsed,
        remaining: aiRemaining,
      },
      navigation,
      auth: session.authHealth,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
