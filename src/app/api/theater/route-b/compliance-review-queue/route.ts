import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { listRouteBComplianceReviewQueueForMember } from "@/lib/theater/route-b-session-bff-repository";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const result = await listRouteBComplianceReviewQueueForMember(session);

    return Response.json(result.data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
