import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import {
  platformImpersonatedReadProofSchema,
  recordImpersonatedReadProof,
} from "@/lib/platform/platform-impersonation-repository";

interface PlatformImpersonationReadProofRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: PlatformImpersonationReadProofRouteContext) {
  try {
    const session = await requirePlatformUser();
    const parsedBody = platformImpersonatedReadProofSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_IMPERSONATED_READ_PROOF_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { id } = await ctx.params;
    const result = await recordImpersonatedReadProof(session, id, parsedBody.data);

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
