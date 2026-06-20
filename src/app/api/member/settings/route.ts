import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import {
  getMemberSettings,
  memberSettingsPatchSchema,
  updateMemberSettings,
} from "@/lib/member-settings/member-settings-repository";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const response = await getMemberSettings(session);

    return privateJsonResponse(response);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsedBody = await parseJsonBody(req, memberSettingsPatchSchema, {
      error: "INVALID_MEMBER_SETTINGS_INPUT",
    });

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const response = await updateMemberSettings(session, parsedBody.data);

    return privateJsonResponse(response);
  } catch (error) {
    return authErrorResponse(error);
  }
}
