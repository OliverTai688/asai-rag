import { z } from "zod";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createRouteBFeedbackReviewForMember,
  getRouteBFeedbackReviewForMember,
} from "@/lib/theater/route-b-session-bff-repository";

interface RouteBFeedbackReviewRouteContext {
  params: Promise<{ sessionId: string }>;
}

const routeBFeedbackPerspectiveSchema = z.enum([
  "COACH_EAR",
  "CLIENT_EYES",
  "SILENT_NEED",
  "COMPLIANCE_CONSCIENCE",
  "DECISION_BRIDGE",
]);

const routeBFeedbackRedLineSchema = z.enum([
  "SIGNATURE_SUBSTITUTION",
  "PREMIUM_ADVANCE",
  "GUARANTEED_RETURN",
  "UNLICENSED_FUNDRAISING",
  "PRODUCT_BEFORE_KYC",
]);

const routeBFeedbackReviewInputSchema = z.object({
  selectedPerspectiveIds: z.array(routeBFeedbackPerspectiveSchema).max(5).optional(),
  notApplicableRedLines: z
    .array(
      z.object({
        redLineId: routeBFeedbackRedLineSchema,
        reason: z.string().trim().max(240).optional(),
      }),
    )
    .max(5)
    .optional(),
});

export async function GET(_req: Request, ctx: RouteBFeedbackReviewRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const result = await getRouteBFeedbackReviewForMember(session, sessionId);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "ROUTE_B_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "EMPTY") {
      return Response.json(
        {
          status: "EMPTY",
          providerCallAttempted: false,
          aiUsageLogWritten: false,
          writesConfirmedCrmFact: false,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return Response.json(result.data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: RouteBFeedbackReviewRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsed = routeBFeedbackReviewInputSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return Response.json(
        {
          error: "INVALID_ROUTE_B_FEEDBACK_REVIEW_INPUT",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await createRouteBFeedbackReviewForMember(session, sessionId, parsed.data);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "ROUTE_B_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result.data, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
