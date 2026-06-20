import { getAppSession, getClientSession, getPlatformSession } from "./session";
import type { AppSession, ClientSession, PlatformSession } from "./session";
import {
  canManageWorkspaceOrgSettings,
  canReadWorkspaceOrgAggregate,
} from "@/lib/navigation/workspace-sidebar";

export class AuthRequiredError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "ORG_ADMIN_REQUIRED"
      | "ORG_SETTINGS_REQUIRED"
      | "PLATFORM_REQUIRED"
      | "CLIENT_SESSION_REQUIRED",
    message: string,
    public readonly status = 401,
  ) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export async function requireCurrentMember(): Promise<AppSession> {
  const session = await getAppSession();

  if (!session) {
    throw new AuthRequiredError("UNAUTHENTICATED", "App session is required.");
  }

  return session;
}

export async function requireOrgAdmin(): Promise<AppSession> {
  const session = await requireCurrentMember();

  if (!canReadWorkspaceOrgAggregate(session)) {
    throw new AuthRequiredError("ORG_ADMIN_REQUIRED", "Org admin or scoped manager access is required.", 403);
  }

  return session;
}

export async function requireOrgSettingsAdmin(): Promise<AppSession> {
  const session = await requireCurrentMember();

  if (!canManageWorkspaceOrgSettings(session)) {
    throw new AuthRequiredError("ORG_SETTINGS_REQUIRED", "Organization owner or admin access is required.", 403);
  }

  return session;
}

export async function requirePlatformUser(): Promise<PlatformSession> {
  const session = await getPlatformSession();

  if (!session) {
    throw new AuthRequiredError("PLATFORM_REQUIRED", "Platform session is required.", 403);
  }

  return session;
}

export async function requireClientPortalUser(): Promise<ClientSession> {
  const session = await getClientSession();

  if (!session) {
    throw new AuthRequiredError("CLIENT_SESSION_REQUIRED", "Client portal session is required.", 401);
  }

  return session;
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthRequiredError) {
    return Response.json(
      {
        error: error.code,
        message: error.message,
      },
      { status: error.status },
    );
  }

  throw error;
}
