import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const aiRemaining = Math.max(0, session.organization.monthlyAiQuota - session.organization.monthlyAiUsed);

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
      auth: session.authHealth,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
