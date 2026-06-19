import "server-only";

import { redirect } from "next/navigation";
import {
  AuthRequiredError,
  requireCurrentMember,
  requireOrgAdmin,
  requirePlatformUser,
} from "@/lib/auth/current-workspace";

export async function requireMemberRoute() {
  try {
    return await requireCurrentMember();
  } catch (error) {
    if (error instanceof AuthRequiredError && error.code === "UNAUTHENTICATED") {
      redirect("/login");
    }

    throw error;
  }
}

export async function requireOrgAdminRoute() {
  try {
    return await requireOrgAdmin();
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login");
      }

      if (error.code === "ORG_ADMIN_REQUIRED") {
        redirect("/dashboard");
      }
    }

    throw error;
  }
}

export async function requirePlatformRoute() {
  try {
    return await requirePlatformUser();
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      redirect("/super-admin/login");
    }

    throw error;
  }
}
