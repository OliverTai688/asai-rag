import { z } from "zod";
import { toPublicRouteBSessionSnapshot } from "@/domains/theater/route-b-session";
import type { TheaterRouteBHandoffPacket } from "@/domains/theater/route-b-handoff";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  isTheaterRouteBHandoffPacket,
  validateRouteBHandoffBoundary,
} from "@/lib/theater/route-b-boundary";
import {
  createRouteBSessionForMember,
  listRouteBSessionsForMember,
} from "@/lib/theater/route-b-session-bff-repository";

const routeBHandoffSchema = z.custom<TheaterRouteBHandoffPacket>(
  (value) => isTheaterRouteBHandoffPacket(value),
  "Invalid Route B handoff packet.",
);

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const sessions = await listRouteBSessionsForMember(session);

    return Response.json(
      { sessions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

const routeBSessionCreateSchema = z.object({
  handoff: routeBHandoffSchema,
  clientId: z.string().trim().min(1).max(80).optional(),
  spinSessionId: z.string().trim().min(1).max(80).optional(),
  isDemo: z.boolean().optional(),
  sensitivityApproval: z
    .object({
      reason: z.string().trim().min(8).max(300),
      riskAccepted: z.literal(true),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsed = routeBSessionCreateSchema.safeParse(await req.json().catch(() => null));

    if (!parsed.success) {
      return Response.json(
        {
          error: "INVALID_ROUTE_B_SESSION_INPUT",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const boundaryIssue = validateRouteBHandoffBoundary(parsed.data.handoff);

    if (boundaryIssue) {
      return Response.json(
        {
          error: "INVALID_ROUTE_B_SESSION_BOUNDARY",
          message: boundaryIssue,
        },
        { status: 400 },
      );
    }

    const result = await createRouteBSessionForMember(session, parsed.data);

    if (result.status === "CLIENT_NOT_FOUND") {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "CLIENT_FORBIDDEN") {
      return Response.json({ error: "CLIENT_FORBIDDEN" }, { status: 403 });
    }

    if (result.status === "BLOCKED_SENSITIVE") {
      return Response.json(
        {
          error: "BLOCKED_SENSITIVE",
          message: result.message,
        },
        { status: 403 },
      );
    }

    return Response.json(toPublicRouteBSessionSnapshot(result.data), {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
