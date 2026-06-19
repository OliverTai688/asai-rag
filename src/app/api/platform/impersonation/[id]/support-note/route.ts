import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import {
  platformImpersonatedSupportNoteSchema,
  recordImpersonatedSupportNote,
} from "@/lib/platform/platform-impersonation-repository";

interface PlatformImpersonationSupportNoteRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: PlatformImpersonationSupportNoteRouteContext) {
  try {
    const session = await requirePlatformUser();
    const parsedBody = platformImpersonatedSupportNoteSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_IMPERSONATED_SUPPORT_NOTE_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { id } = await ctx.params;
    const result = await recordImpersonatedSupportNote(session, id, parsedBody.data);

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
