import { authErrorResponse, requireClientPortalUser } from "@/lib/auth/current-workspace";
import { getSharedReportByToken } from "@/lib/share/share-repository";

export async function GET() {
  try {
    const session = await requireClientPortalUser();
    const shared = await getSharedReportByToken(session.shareToken);

    if (!shared || shared.report.clientId !== session.clientId) {
      return Response.json(
        {
          error: "CLIENT_PORTAL_SCOPE_NOT_FOUND",
          message: "Client portal authorization is invalid or expired.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      session: {
        type: session.sessionType,
        scopes: ["authorized_report", "supplement_response", "booking_intent"],
      },
      client: {
        id: session.clientId,
        displayName: shared.report.clientName,
      },
      report: {
        id: shared.report.id,
        title: `${shared.report.clientName}的授權報告`,
        version: shared.report.version,
        updatedAt: shared.report.updatedAt,
        sections: shared.report.sections,
      },
      share: {
        token: shared.share.token,
        expiresAt: shared.share.expiresAt,
        branding: shared.share.branding,
        portal: shared.share.portal,
        ctaConfig: shared.share.ctaConfig,
      },
      auth: session.authHealth,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
