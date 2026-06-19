import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import {
  canReadPlatformTurnUsage,
  getPlatformAiTurnUsage,
  platformAiTurnFilterSchema,
} from "@/lib/platform/platform-read-repository";

export async function GET(req: Request) {
  try {
    const session = await requirePlatformUser();

    if (!canReadPlatformTurnUsage(session)) {
      return Response.json({ error: "PLATFORM_AI_TURN_USAGE_FORBIDDEN" }, { status: 403 });
    }

    const url = new URL(req.url);
    const parsed = platformAiTurnFilterSchema.safeParse({
      module: url.searchParams.get("module") ?? undefined,
      provider: url.searchParams.get("provider") ?? undefined,
      organizationId: url.searchParams.get("organizationId") ?? undefined,
      userId: url.searchParams.get("userId") ?? undefined,
      clientId: url.searchParams.get("clientId") ?? undefined,
      errorsOnly: url.searchParams.get("errorsOnly") === "true" ? true : undefined,
      sinceDays: url.searchParams.get("sinceDays") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        { error: "INVALID_TURN_USAGE_FILTERS", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const usage = await getPlatformAiTurnUsage({
      module: parsed.data.module as AiModule | undefined,
      provider: parsed.data.provider as AiProvider | undefined,
      organizationId: parsed.data.organizationId,
      userId: parsed.data.userId,
      clientId: parsed.data.clientId,
      errorsOnly: parsed.data.errorsOnly,
      sinceDays: parsed.data.sinceDays,
      limit: parsed.data.limit,
    });

    return Response.json(usage, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
