import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import { performPlatformBreakGlass, platformBreakGlassSchema } from "@/lib/platform/platform-break-glass-repository";

export async function POST(req: Request) {
  try {
    const session = await requirePlatformUser();
    const parsedBody = platformBreakGlassSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_BREAK_GLASS_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await performPlatformBreakGlass(session, parsedBody.data);

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
