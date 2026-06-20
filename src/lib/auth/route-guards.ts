import "server-only";

import { redirect } from "next/navigation";
import {
  AuthRequiredError,
  requireCurrentMember,
  requirePlatformUser,
} from "@/lib/auth/current-workspace";
import {
  canManageWorkspaceOrgSettings,
  canReadWorkspaceOrgAggregate,
} from "@/lib/navigation/workspace-sidebar";

export async function requireMemberRoute() {
  let shouldRedirectToLogin = false;

  try {
    return await requireCurrentMember();
  } catch (error) {
    if (error instanceof AuthRequiredError && error.code === "UNAUTHENTICATED") {
      shouldRedirectToLogin = true;
    } else {
      throw error;
    }
  }

  if (shouldRedirectToLogin) {
    redirect("/login");
  }

  throw new Error("UNREACHABLE_MEMBER_ROUTE_GUARD");
}

export async function requireOrgAdminRoute() {
  const session = await requireMemberRoute();

  if (canReadWorkspaceOrgAggregate(session)) {
    return session;
  }

  redirect("/dashboard");
}

export async function requireOrgSettingsRoute() {
  const session = await requireMemberRoute();

  if (canManageWorkspaceOrgSettings(session)) {
    return session;
  }

  if (canReadWorkspaceOrgAggregate(session)) {
    redirect("/team");
  }

  redirect("/dashboard");
}

export async function requirePlatformRoute() {
  let shouldRedirectToLogin = false;

  try {
    return await requirePlatformUser();
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      shouldRedirectToLogin = true;
    } else {
      throw error;
    }
  }

  if (shouldRedirectToLogin) {
    redirect("/super-admin/login");
  }

  throw new Error("UNREACHABLE_PLATFORM_ROUTE_GUARD");
}
