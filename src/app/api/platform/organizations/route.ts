import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import { canReadPlatformSummary, listPlatformOrganizations } from "@/lib/platform/platform-read-repository";

export async function GET() {
  try {
    const session = await requirePlatformUser();

    if (!canReadPlatformSummary(session)) {
      return Response.json({ error: "PLATFORM_SUMMARY_FORBIDDEN" }, { status: 403 });
    }

    return Response.json(await listPlatformOrganizations(session));
  } catch (error) {
    return authErrorResponse(error);
  }
}
