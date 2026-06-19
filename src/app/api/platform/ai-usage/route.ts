import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import { canReadPlatformSummary, getPlatformAiUsage } from "@/lib/platform/platform-read-repository";

export async function GET() {
  try {
    const session = await requirePlatformUser();

    if (!canReadPlatformSummary(session)) {
      return Response.json({ error: "PLATFORM_AI_USAGE_FORBIDDEN" }, { status: 403 });
    }

    return Response.json(await getPlatformAiUsage());
  } catch (error) {
    return authErrorResponse(error);
  }
}
