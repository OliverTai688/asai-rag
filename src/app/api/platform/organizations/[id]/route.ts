import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import { canReadPlatformSummary, getPlatformOrganization } from "@/lib/platform/platform-read-repository";

interface PlatformOrganizationRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, ctx: PlatformOrganizationRouteContext) {
  try {
    const session = await requirePlatformUser();

    if (!canReadPlatformSummary(session)) {
      return Response.json({ error: "PLATFORM_SUMMARY_FORBIDDEN" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const organization = await getPlatformOrganization(session, id);

    if (!organization) {
      return Response.json({ error: "PLATFORM_ORGANIZATION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(organization);
  } catch (error) {
    return authErrorResponse(error);
  }
}
