import { cookies } from "next/headers";
import { CLIENT_PORTAL_TOKEN_COOKIE } from "@/lib/auth/session";
import { getSharedReportByToken } from "@/lib/share/share-repository";

const CLIENT_PORTAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const token = normalizeToken(body?.token);

  if (!token) {
    return Response.json(
      {
        error: "INVALID_CLIENT_PORTAL_TOKEN",
        message: "Client portal token is required.",
      },
      { status: 400 },
    );
  }

  const shared = await getSharedReportByToken(token);

  if (!shared) {
    return Response.json(
      {
        error: "CLIENT_PORTAL_TOKEN_NOT_FOUND",
        message: "Client portal token is invalid or expired.",
      },
      { status: 404 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(CLIENT_PORTAL_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_PORTAL_SESSION_MAX_AGE_SECONDS,
  });

  return Response.json({
    session: {
      type: "client",
      expiresInSeconds: CLIENT_PORTAL_SESSION_MAX_AGE_SECONDS,
    },
    client: {
      id: shared.report.clientId,
      displayName: shared.report.clientName,
    },
    report: {
      id: shared.report.id,
      sections: shared.report.sections.length,
    },
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_PORTAL_TOKEN_COOKIE);

  return Response.json({ ok: true });
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();
  if (!token || token.length > 240) {
    return null;
  }

  return token;
}
