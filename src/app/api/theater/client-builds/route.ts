import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { listTheaterClientBuildOptionsForMember } from "@/lib/theater/client-build-repository";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const clients = await listTheaterClientBuildOptionsForMember(session);

    return Response.json(
      { clients },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
