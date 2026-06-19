import { buildVisitTheaterHandoff } from "@/domains/theater/visit-handoff";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getVisitPlanForMember } from "@/lib/visits/visit-plan-repository";

interface VisitTheaterHandoffRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: VisitTheaterHandoffRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const source = await getVisitPlanForMember(session, id);

    if (!source) {
      return Response.json({ error: "VISIT_PLAN_NOT_FOUND" }, { status: 404 });
    }

    const handoff = buildVisitTheaterHandoff({
      organizationId: session.organization.id,
      memberId: session.user.id,
      unitId: session.membership.primaryUnitId,
      client: source.client,
      visitPlan: source.visitPlan,
      sessionId: `visit_theater_${source.visitPlan.id}`,
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
  } catch (error) {
    return authErrorResponse(error);
  }
}
