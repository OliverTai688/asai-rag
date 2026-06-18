import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import {
  platformImpersonationStartSchema,
  startPlatformImpersonation,
} from "@/lib/platform/platform-impersonation-repository";

export async function POST(req: Request) {
  try {
    const session = await requirePlatformUser();
    const parsedBody = platformImpersonationStartSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_IMPERSONATION_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await startPlatformImpersonation(session, parsedBody.data);

    if (!result.ok) {
      return Response.json(
        {
          error: result.error,
          message: "message" in result ? result.message : undefined,
        },
        { status: result.status },
      );
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
