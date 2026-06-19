import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createVisitPlanForMember,
  createVisitPlanInputSchema,
  listVisitPlansForMember,
} from "@/lib/visits/visit-plan-repository";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const visits = await listVisitPlansForMember(session);

    return Response.json(
      { visits },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsedBody = createVisitPlanInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_VISIT_PLAN_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const visit = await createVisitPlanForMember(session, parsedBody.data);

    if (!visit) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(visit, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
