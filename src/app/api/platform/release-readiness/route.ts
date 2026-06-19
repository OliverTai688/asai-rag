import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import { canReadPlatformSummary } from "@/lib/platform/platform-read-repository";
import { getPlatformReleaseReadiness } from "@/lib/platform/platform-release-readiness-repository";

export async function GET() {
  try {
    const session = await requirePlatformUser();

    if (!canReadPlatformSummary(session)) {
      return Response.json({ error: "PLATFORM_RELEASE_READINESS_FORBIDDEN" }, { status: 403 });
    }

    return Response.json({
      scope: {
        role: session.role,
        requireMfa: session.requireMfa,
      },
      readiness: await getPlatformReleaseReadiness(),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
