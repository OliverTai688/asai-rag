import type { OrganizationPlan } from "@/generated/prisma/enums";
import { authErrorResponse, requirePlatformUser } from "@/lib/auth/current-workspace";
import {
  canUpdatePlatformPlanConfig,
  platformPlanConfigPatchSchema,
  updatePlatformPlanConfig,
} from "@/lib/platform/platform-read-repository";

const ORGANIZATION_PLANS = new Set<OrganizationPlan>(["FREE", "STARTER", "PRO", "ENTERPRISE"]);

interface PlatformPlanConfigRouteContext {
  params: Promise<{ plan: string }>;
}

function organizationPlan(value: string) {
  const normalized = value.toUpperCase();
  return ORGANIZATION_PLANS.has(normalized as OrganizationPlan) ? (normalized as OrganizationPlan) : null;
}

export async function PATCH(req: Request, ctx: PlatformPlanConfigRouteContext) {
  try {
    const session = await requirePlatformUser();

    if (!canUpdatePlatformPlanConfig(session)) {
      return Response.json({ error: "PLATFORM_PLAN_CONFIG_WRITE_FORBIDDEN" }, { status: 403 });
    }

    const { plan: rawPlan } = await ctx.params;
    const plan = organizationPlan(rawPlan);

    if (!plan) {
      return Response.json({ error: "INVALID_PLAN" }, { status: 400 });
    }

    const parsedBody = platformPlanConfigPatchSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_PLATFORM_PLAN_CONFIG_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const response = await updatePlatformPlanConfig(session, plan, parsedBody.data);

    if (!response) {
      return Response.json({ error: "PLAN_CONFIG_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(response);
  } catch (error) {
    return authErrorResponse(error);
  }
}
