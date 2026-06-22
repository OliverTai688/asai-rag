import { z } from "zod";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { appendRouteBNextTurnCandidateForMember } from "@/lib/theater/route-b-session-bff-repository";

interface RouteBAppendCandidateRouteContext {
  params: Promise<{ sessionId: string }>;
}

const routeBNextTurnAppendCandidateSchema = z
  .object({
    usageLogId: z.string().trim().min(8).max(160),
    confirmedByAdvisor: z.literal(true),
    confirmationReason: z.string().trim().max(500).optional(),
    candidate: z.object({
      actorKind: z.enum(["CHARACTER", "NARRATOR"]),
      speakerRouteBCharacterId: z.string().trim().min(1).max(120).optional(),
      addresseeRouteBCharacterId: z.string().trim().min(1).max(120).optional(),
      visibilityScope: z.enum(["GROUP", "PRIVATE"]),
      content: z.string().trim().min(1).max(2000),
      statePatchCount: z.number().int().min(0).max(50),
      generatedTextAllowed: z.literal(true),
      requiresAdvisorConfirmation: z.literal(true),
      writesConfirmedCrmFact: z.literal(false),
      storesRawProviderPayload: z.literal(false),
      rawPrivateTranscriptIncluded: z.literal(false),
    }),
  })
  .superRefine((value, ctx) => {
    const { candidate } = value;

    if (candidate.actorKind === "CHARACTER" && !candidate.speakerRouteBCharacterId) {
      ctx.addIssue({
        code: "custom",
        path: ["candidate", "speakerRouteBCharacterId"],
        message: "Character append candidates require a speaker.",
      });
    }

    if (candidate.actorKind === "NARRATOR" && candidate.speakerRouteBCharacterId) {
      ctx.addIssue({
        code: "custom",
        path: ["candidate", "speakerRouteBCharacterId"],
        message: "Narrator append candidates cannot include a character speaker.",
      });
    }

    if (candidate.visibilityScope === "PRIVATE" && !candidate.addresseeRouteBCharacterId) {
      ctx.addIssue({
        code: "custom",
        path: ["candidate", "addresseeRouteBCharacterId"],
        message: "Private append candidates require an addressee.",
      });
    }
  });

export async function POST(req: Request, ctx: RouteBAppendCandidateRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsed = routeBNextTurnAppendCandidateSchema.safeParse(await req.json().catch(() => null));

    if (!parsed.success) {
      return Response.json(
        {
          error: "INVALID_ROUTE_B_NEXT_TURN_APPEND_INPUT",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await appendRouteBNextTurnCandidateForMember(session, sessionId, parsed.data);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "ROUTE_B_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "INVALID_APPEND_CANDIDATE") {
      return Response.json(
        {
          error: result.errorCode,
          message: result.message,
        },
        { status: 400 },
      );
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
