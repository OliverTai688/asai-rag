import { z } from "zod";
import {
  ROUTE_B_RED_LINE_ACTION_REASON_CODES,
  ROUTE_B_RED_LINE_ACTION_STATES,
} from "@/domains/theater/route-b-red-line-action-workflow";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  getRouteBRedLineActionStateForMember,
  updateRouteBRedLineActionStateForMember,
} from "@/lib/theater/route-b-session-bff-repository";

interface RouteBRedLineActionsRouteContext {
  params: Promise<{ sessionId: string }>;
}

const routeBSevereRedLineIdSchema = z.enum([
  "SIGNATURE_SUBSTITUTION",
  "PREMIUM_ADVANCE",
  "GUARANTEED_RETURN",
  "UNLICENSED_FUNDRAISING",
  "PRODUCT_BEFORE_KYC",
]);

const routeBRedLineActionStateSchema = z.enum(ROUTE_B_RED_LINE_ACTION_STATES);
const routeBRedLineActionReasonCodeSchema = z.enum(ROUTE_B_RED_LINE_ACTION_REASON_CODES);

const routeBRedLineActionRecordSchema = z.object({
  ruleId: routeBSevereRedLineIdSchema,
  state: routeBRedLineActionStateSchema,
  advisorReasonCode: routeBRedLineActionReasonCodeSchema,
  updatedAt: z.string().datetime(),
});

const routeBRedLineActionInputSchema = z.object({
  records: z.array(routeBRedLineActionRecordSchema).max(5),
});

export async function GET(_req: Request, ctx: RouteBRedLineActionsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const result = await getRouteBRedLineActionStateForMember(session, sessionId);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "ROUTE_B_SESSION_NOT_FOUND" }, { status: 404 });
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

export async function POST(req: Request, ctx: RouteBRedLineActionsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsed = routeBRedLineActionInputSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return Response.json(
        {
          error: "INVALID_ROUTE_B_RED_LINE_ACTION_INPUT",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await updateRouteBRedLineActionStateForMember(session, sessionId, parsed.data);

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
