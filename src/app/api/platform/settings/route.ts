import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import {
  canReadPlatformSettings,
  canUpdatePlatformSettings,
  getPlatformSettings,
  platformSettingsPatchSchema,
  updatePlatformSettings,
} from "@/lib/platform/platform-settings-repository";

export async function GET() {
  try {
    const session = await requirePlatformUser();

    if (!canReadPlatformSettings(session)) {
      return Response.json({ error: "PLATFORM_SETTINGS_READ_FORBIDDEN" }, { status: 403 });
    }

    return Response.json({
      scope: {
        role: session.role,
        requireMfa: session.requireMfa,
      },
      settings: await getPlatformSettings(),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requirePlatformUser();

    if (!canUpdatePlatformSettings(session)) {
      return Response.json({ error: "PLATFORM_SETTINGS_WRITE_FORBIDDEN" }, { status: 403 });
    }

    const parsedBody = platformSettingsPatchSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_PLATFORM_SETTINGS_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    return Response.json(await updatePlatformSettings(session, parsedBody.data));
  } catch (error) {
    return authErrorResponse(error);
  }
}
