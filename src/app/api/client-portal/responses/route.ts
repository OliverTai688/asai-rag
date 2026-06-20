import { z } from "zod";
import { InteractionEventType } from "@/generated/prisma/enums";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { sanitizeClientPortalResponseMetadata } from "@/lib/api/sanitize";
import { parseJsonBody } from "@/lib/api/validation";
import { authErrorResponse, requireClientPortalUser } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";

type ClientPortalResponseType = "SUPPLEMENT" | "QUESTION" | "BOOKING_INTENT";

const allowedTypes: ClientPortalResponseType[] = ["SUPPLEMENT", "QUESTION", "BOOKING_INTENT"];
const clientPortalResponseSchema = z.object({
  type: z.string().trim(),
  message: z.string().trim().min(1).max(1200),
  payload: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireClientPortalUser();
    const parsedBody = await parseJsonBody(request, clientPortalResponseSchema, {
      error: "INVALID_CLIENT_PORTAL_RESPONSE",
      message: "Response type and message are required.",
    });

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const responseType = normalizeResponseType(parsedBody.data.type);

    if (!responseType) {
      return apiErrorResponse(
        apiErrors.validation("INVALID_CLIENT_PORTAL_RESPONSE", {
          type: ["Response type is not supported."],
        }),
      );
    }

    const event = await prisma.interactionEvent.create({
      data: {
        organizationId: session.organizationId,
        unitId: session.unitId,
        clientId: session.clientId,
        type: InteractionEventType.TASK,
        title: toEventTitle(responseType),
        description: parsedBody.data.message,
        metadata: sanitizeClientPortalResponseMetadata({
          source: "client_portal",
          responseType,
          shareId: session.shareId,
          reportId: session.reportId,
          payload: parsedBody.data.payload,
        }),
      },
      select: {
        id: true,
        type: true,
        title: true,
        occurredAt: true,
      },
    });

    return privateJsonResponse(
      {
        response: {
          id: event.id,
          type: event.type,
          title: event.title,
          occurredAt: event.occurredAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

function normalizeResponseType(value: unknown): ClientPortalResponseType | null {
  if (typeof value !== "string") {
    return null;
  }

  const type = value.trim().toUpperCase();
  return allowedTypes.includes(type as ClientPortalResponseType) ? (type as ClientPortalResponseType) : null;
}

function toEventTitle(type: ClientPortalResponseType): string {
  const titles: Record<ClientPortalResponseType, string> = {
    SUPPLEMENT: "客戶補充資料",
    QUESTION: "客戶提問",
    BOOKING_INTENT: "客戶預約意向",
  };

  return titles[type];
}
