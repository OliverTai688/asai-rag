import { z } from "zod";
import { buildDisabledVisitReminderNotificationDto } from "@/domains/notifications/bff";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, visitReminderInputSchema, {
    error: "INVALID_VISIT_REMINDER_INPUT",
    message: "A visit plan id is required before reminder delivery can be evaluated.",
  });

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    await requireCurrentMember();

    return privateJsonResponse(
      {
        success: false,
        error: "VISIT_REMINDER_DELIVERY_DISABLED",
        reminder: buildDisabledVisitReminderNotificationDto(parsed.data),
      },
      { status: 503 },
    );
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
    }

    if (isDatabaseUnavailableError(error)) {
      return apiErrorResponse({
        error: "VISIT_REMINDER_AUTH_UNAVAILABLE",
        kind: "INTERNAL",
        status: 503,
        message: "Workspace authentication data is temporarily unavailable. Visit reminder delivery was not attempted.",
        providerAttempted: false,
      });
    }

    throw error;
  }
}

export const dynamic = "force-dynamic";

const visitReminderInputSchema = z.object({
  planId: z.string().trim().min(1).max(128),
  agentEmail: z.string().trim().email().max(254).optional(),
});

function isDatabaseUnavailableError(error: unknown): boolean {
  const errorCode = isRecord(error) && typeof error.code === "string" ? error.code : "";
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);

  return [
    "P1001",
    "DatabaseNotReachable",
    "Can't reach database server",
    "ENOTFOUND",
    "ECONNREFUSED",
    "ETIMEDOUT",
  ].some((fragment) => errorCode === fragment || message.includes(fragment));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
