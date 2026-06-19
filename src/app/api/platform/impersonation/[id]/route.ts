import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import {
  endPlatformImpersonation,
  platformImpersonationEndSchema,
} from "@/lib/platform/platform-impersonation-repository";

interface PlatformImpersonationRouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, ctx: PlatformImpersonationRouteContext) {
  try {
    const session = await requirePlatformUser();
    const parsedBody = platformImpersonationEndSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_IMPERSONATION_END_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { id } = await ctx.params;
    const result = await endPlatformImpersonation(session, id, parsedBody.data);

    if (!result.ok) {
      return Response.json(
        {
          error: result.error,
          message: "message" in result ? result.message : undefined,
          status: "statusValue" in result ? result.statusValue : undefined,
        },
        { status: result.status },
      );
    }

    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
