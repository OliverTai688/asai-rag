import { z } from "zod";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { createPublicLeadCapture, extractClientIp } from "@/lib/public/lead-repository";

const publicLeadSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(80).optional(),
  company: z.string().trim().min(1).max(120).optional(),
  roleTitle: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  message: z.string().trim().min(1).max(1200).optional(),
  planInterest: z.enum(["FREE", "STARTER", "PRO", "ENTERPRISE", "UNSURE"]).optional(),
  source: z.enum(["landing", "pricing", "footer", "manual"]).default("pricing"),
  consentVersion: z.string().trim().min(1).max(80),
  consentAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  website: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request, publicLeadSchema, {
    error: "INVALID_PUBLIC_LEAD",
    message: "A valid email and consent are required.",
  });

  if (!parsedBody.success) {
    return parsedBody.response;
  }

  const result = await createPublicLeadCapture(parsedBody.data, {
    ip: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  if (result.status === "rate_limited") {
    return apiErrorResponse(
      apiErrors.rateLimited(
        "PUBLIC_LEAD_RATE_LIMITED",
        result.retryAfterSeconds,
        "Too many private beta requests. Please try again later.",
      ),
    );
  }

  if (result.status === "spam_accepted") {
    return privateJsonResponse(
      {
        lead: {
          status: "received",
        },
      },
      { status: 202 },
    );
  }

  return privateJsonResponse(
    {
      lead: {
        id: result.lead.id,
        status: "received",
        receivedAt: result.lead.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
