import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  getMemberSettings,
  memberSettingsPatchSchema,
  updateMemberSettings,
} from "@/lib/member-settings/member-settings-repository";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const response = await getMemberSettings(session);

    return Response.json(response);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsedBody = memberSettingsPatchSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_MEMBER_SETTINGS_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const response = await updateMemberSettings(session, parsedBody.data);

    return Response.json(response);
  } catch (error) {
    return authErrorResponse(error);
  }
}
