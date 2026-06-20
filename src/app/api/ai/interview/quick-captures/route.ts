import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createPersistentQuickCaptureBridge,
  createQuickCaptureBridgeInputSchema,
} from "@/lib/interview/interview-persistence-repository";

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsedBody = createQuickCaptureBridgeInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_QUICK_CAPTURE_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await createPersistentQuickCaptureBridge(session, parsedBody.data);

    if (!result) {
      return Response.json({ error: "QUICK_CAPTURE_SCOPE_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "BLOCKED") {
      return Response.json(result, { status: 409 });
    }

    return Response.json(result, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
