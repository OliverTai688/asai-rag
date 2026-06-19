import { z } from "zod";
import { requestEmailLoginCode } from "@/lib/auth/email-code";

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(req: Request) {
  const parsedBody = requestSchema.safeParse(await req.json().catch(() => null));

  if (!parsedBody.success) {
    return Response.json(
      {
        error: "INVALID_EMAIL_CODE_REQUEST",
        issues: parsedBody.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await requestEmailLoginCode(parsedBody.data.email);

  if (result.reason === "EMAIL_PROVIDER_NOT_CONFIGURED") {
    return Response.json(
      {
        error: "EMAIL_PROVIDER_NOT_CONFIGURED",
        message: "Transactional email provider is required for email-code login.",
      },
      { status: 503 },
    );
  }

  if (result.reason === "EMAIL_PROVIDER_REJECTED") {
    return Response.json(
      {
        error: "EMAIL_PROVIDER_REJECTED",
        status: result.status,
      },
      { status: 502 },
    );
  }

  return Response.json({
    requested: true,
    sent: result.sent,
  });
}
