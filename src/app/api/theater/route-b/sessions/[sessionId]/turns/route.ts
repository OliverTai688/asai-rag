import { z } from "zod";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { appendRouteBAdvisorTurnForMember } from "@/lib/theater/route-b-session-bff-repository";

interface RouteBSessionTurnRouteContext {
  params: Promise<{ sessionId: string }>;
}

const routeBAdvisorTurnSchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
    visibilityScope: z.enum(["GROUP", "PRIVATE"]),
    addresseeRouteBCharacterId: z.string().trim().min(1).max(120).optional(),
    statePatch: z
      .object({
        targetRouteBCharacterId: z.string().trim().min(1).max(120),
        summary: z.string().trim().min(3).max(500),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.visibilityScope === "PRIVATE" && !value.addresseeRouteBCharacterId) {
      ctx.addIssue({
        code: "custom",
        path: ["addresseeRouteBCharacterId"],
        message: "Private Route B turns require an addressee.",
      });
    }
  });

export async function POST(req: Request, ctx: RouteBSessionTurnRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsed = routeBAdvisorTurnSchema.safeParse(await req.json().catch(() => null));

    if (!parsed.success) {
      return Response.json(
        {
          error: "INVALID_ROUTE_B_ADVISOR_TURN_INPUT",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await appendRouteBAdvisorTurnForMember(session, sessionId, {
      content: parsed.data.content,
      visibilityScope: parsed.data.visibilityScope,
      addresseeRouteBCharacterId: parsed.data.addresseeRouteBCharacterId,
      statePatch: parsed.data.statePatch ?? null,
    });

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "ROUTE_B_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "INVALID_PRIVATE_ADDRESSEE") {
      return Response.json({ error: "INVALID_PRIVATE_ADDRESSEE" }, { status: 400 });
    }

    if (result.status === "INVALID_STATE_PATCH_TARGET") {
      return Response.json({ error: "INVALID_STATE_PATCH_TARGET" }, { status: 400 });
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
