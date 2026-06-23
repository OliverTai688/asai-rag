import { buildVisitTheaterHandoff } from "@/domains/theater/visit-handoff";
import type { VisitTheaterSensitivityApproval } from "@/domains/theater/visit-handoff";
import { z } from "zod";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getVisitPlanForMember } from "@/lib/visits/visit-plan-repository";
import { getVisitMeetingRelationshipSignalDeckForMember } from "@/lib/visits/meeting-relationship-signal-repository";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

interface VisitTheaterHandoffRouteContext {
  params: Promise<{ id: string }>;
}

const sensitivityApprovalSchema = z.object({
  reason: z.string().trim().min(8).max(500),
  riskAccepted: z.literal(true),
});

export async function GET(_req: Request, ctx: VisitTheaterHandoffRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const source = await getVisitPlanForMember(session, id);

    if (!source) {
      return Response.json({ error: "VISIT_PLAN_NOT_FOUND" }, { status: 404 });
    }

    return buildHandoffResponse(session, source);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: VisitTheaterHandoffRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const source = await getVisitPlanForMember(session, id);

    if (!source) {
      return Response.json({ error: "VISIT_PLAN_NOT_FOUND" }, { status: 404 });
    }

    const parsedBody = sensitivityApprovalSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "SENSITIVITY_APPROVAL_REQUIRED",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const response = await buildHandoffResponse(session, source, parsedBody.data);

    if (source.client.sensitivityLevel === "HIGHLY_SENSITIVE") {
      await prisma.interactionEvent.create({
        data: {
          organizationId: session.organization.id,
          unitId: session.membership.primaryUnitId,
          clientId: source.client.id,
          actorId: session.user.id,
          type: "THEATER",
          title: "高敏感客戶劇場建場確認",
          description: `顧問確認可用 ${source.client.name} 的拜訪準備包建立劇場場域。`,
          metadata: {
            source: "visit_theater_handoff_approval",
            visitPlanId: source.visitPlan.id,
            sensitivityLevel: source.client.sensitivityLevel,
            riskAccepted: true,
            reason: parsedBody.data.reason,
          },
        },
      });
    }

    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}

async function buildHandoffResponse(
  session: AppSession,
  source: NonNullable<Awaited<ReturnType<typeof getVisitPlanForMember>>>,
  sensitivityApproval?: VisitTheaterSensitivityApproval,
) {
  const meetingRelationshipSignalResult = await getVisitMeetingRelationshipSignalDeckForMember(
    session,
    source.visitPlan.id,
  );
  const meetingRelationshipSignalDeck =
    meetingRelationshipSignalResult.status === "OK" ? meetingRelationshipSignalResult.data.deck : null;

  const handoff = buildVisitTheaterHandoff({
    organizationId: session.organization.id,
    memberId: session.user.id,
    unitId: session.membership.primaryUnitId,
    client: source.client,
    visitPlan: source.visitPlan,
    sessionId: `visit_theater_${source.visitPlan.id}`,
    sensitivityApproval,
    meetingRelationshipSignalDeck,
  });

  return Response.json(
    {
      client: {
        id: source.client.id,
        name: source.client.name,
        sensitivityLevel: source.client.sensitivityLevel,
        kycStatus: source.client.kycStatus,
      },
      visitPlan: {
        id: source.visitPlan.id,
        purpose: source.visitPlan.purpose,
        status: source.visitPlan.status,
        updatedAt: source.visitPlan.updatedAt,
        sourceCounts: handoff.sourceSummary.sourceCounts,
      },
      handoff: {
        status: handoff.status,
        knownMaterials: handoff.knownMaterials,
        warnings: handoff.warnings,
        missing: handoff.missing,
        sourceSummary: handoff.sourceSummary,
        packet: handoff.packet,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
