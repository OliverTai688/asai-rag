import { z } from "zod";
import { buildVisitRelationshipConfirmationDeck } from "@/domains/visit/relationship-confirmation";
import {
  VISIT_RELATIONSHIP_CONFIRMATION_ADVISOR_STATES,
  buildVisitRelationshipConfirmationStateBoundary,
} from "@/domains/visit/relationship-confirmation-state";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getVisitPlanForMember } from "@/lib/visits/visit-plan-repository";

interface VisitRelationshipConfirmationStateRouteContext {
  params: Promise<{ id: string }>;
}

const relationshipConfirmationStateRecordSchema = z.object({
  cardId: z.string().trim().min(1).max(120),
  state: z.enum(VISIT_RELATIONSHIP_CONFIRMATION_ADVISOR_STATES),
  updatedAt: z
    .string()
    .trim()
    .max(80)
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
      message: "INVALID_UPDATED_AT",
    })
    .optional()
    .or(z.literal("")),
  safeNoteSummary: z.string().trim().max(500).optional().or(z.literal("")),
});

const relationshipConfirmationStateRequestSchema = z.object({
  records: z.array(relationshipConfirmationStateRecordSchema).max(20).default([]),
});

export async function GET(_req: Request, ctx: VisitRelationshipConfirmationStateRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const source = await getVisitPlanForMember(session, id);

    if (!source) {
      return Response.json({ error: "VISIT_PLAN_NOT_FOUND" }, { status: 404 });
    }

    return buildRelationshipConfirmationStateResponse(source);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: VisitRelationshipConfirmationStateRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const source = await getVisitPlanForMember(session, id);

    if (!source) {
      return Response.json({ error: "VISIT_PLAN_NOT_FOUND" }, { status: 404 });
    }

    const parsedBody = relationshipConfirmationStateRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_RELATIONSHIP_CONFIRMATION_STATE_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    return buildRelationshipConfirmationStateResponse(source, parsedBody.data.records);
  } catch (error) {
    return authErrorResponse(error);
  }
}

function buildRelationshipConfirmationStateResponse(
  source: NonNullable<Awaited<ReturnType<typeof getVisitPlanForMember>>>,
  records = relationshipConfirmationStateRequestSchema.parse({}).records,
) {
  const generatedAt = new Date().toISOString();
  const deck = buildVisitRelationshipConfirmationDeck(source.client, generatedAt);
  const boundary = buildVisitRelationshipConfirmationStateBoundary({
    visitPlanId: source.visitPlan.id,
    clientId: source.client.id,
    deck,
    states: records.map((record) => ({
      cardId: record.cardId,
      state: record.state,
      updatedAt: record.updatedAt || undefined,
      safeNoteSummary: record.safeNoteSummary || undefined,
    })),
    now: generatedAt,
  });

  return Response.json(
    {
      visitPlan: {
        id: source.visitPlan.id,
        clientId: source.client.id,
        updatedAt: source.visitPlan.updatedAt,
      },
      relationshipConfirmationState: boundary,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
