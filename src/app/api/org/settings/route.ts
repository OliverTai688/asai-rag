import { authErrorResponse, requireOrgSettingsAdmin } from "@/lib/auth/current-workspace";
import {
  getOrgSettings,
  orgSettingsPatchSchema,
  updateOrgSettings,
} from "@/lib/org-settings/org-settings-repository";

export async function GET() {
  try {
    const session = await requireOrgSettingsAdmin();
    const response = await getOrgSettings(session);

    return Response.json(response);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireOrgSettingsAdmin();
    const parsedBody = orgSettingsPatchSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_ORG_SETTINGS_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const response = await updateOrgSettings(session, parsedBody.data);

    return Response.json(response);
  } catch (error) {
    if (error instanceof Error && error.name === "OrgSettingsForbiddenError") {
      return Response.json(
        {
          error: "ORG_SETTINGS_WRITE_FORBIDDEN",
          message: "Org settings can only be changed by organization owner or admin.",
        },
        { status: 403 },
      );
    }

    return authErrorResponse(error);
  }
}
