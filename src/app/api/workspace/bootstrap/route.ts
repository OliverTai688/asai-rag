import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  buildWorkspaceBootstrapNavigation,
  toWorkspaceBootstrapSurface,
} from "@/lib/navigation/workspace-sidebar";

export async function GET(request: Request) {
  try {
    const session = await requireCurrentMember();
    const aiRemaining = Math.max(0, session.organization.monthlyAiQuota - session.organization.monthlyAiUsed);
    const requestedSurface = toWorkspaceBootstrapSurface(
      new URL(request.url).searchParams.get("surface"),
    );
    const navigation = buildWorkspaceBootstrapNavigation(session, requestedSurface);

    return Response.json({
      user: session.user,
      organization: session.organization,
      membership: session.membership,
      planCapability: session.planCapability,
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
