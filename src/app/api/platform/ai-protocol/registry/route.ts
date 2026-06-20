import { getAgentProtocolRegistryReadiness } from "@/domains/ai-protocol";
import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import { privateJsonResponse } from "@/lib/api/response";
import { canReadPlatformSummary } from "@/lib/platform/platform-read-repository";

export async function GET() {
  try {
    const session = await requirePlatformUser();

    if (!canReadPlatformSummary(session)) {
      return privateJsonResponse(
        { error: "PLATFORM_AI_PROTOCOL_REGISTRY_FORBIDDEN" },
        { status: 403 },
      );
    }

    return privateJsonResponse({
      scope: {
        role: session.role,
        requireMfa: session.requireMfa,
      },
      registry: getAgentProtocolRegistryReadiness(),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
