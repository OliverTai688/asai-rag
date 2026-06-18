import type { Prisma } from "@/generated/prisma/client";
import { InteractionEventType } from "@/generated/prisma/enums";
import { authErrorResponse, requireClientPortalUser } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";

type ClientPortalResponseType = "SUPPLEMENT" | "QUESTION" | "BOOKING_INTENT";

const allowedTypes: ClientPortalResponseType[] = ["SUPPLEMENT", "QUESTION", "BOOKING_INTENT"];

export async function POST(request: Request) {
  try {
    const session = await requireClientPortalUser();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const responseType = normalizeResponseType(body?.type);
    const message = normalizeMessage(body?.message);

    if (!responseType || !message) {
      return Response.json(
        {
          error: "INVALID_CLIENT_PORTAL_RESPONSE",
          message: "Response type and message are required.",
        },
        { status: 400 },
      );
    }

    const event = await prisma.interactionEvent.create({
      data: {
        organizationId: session.organizationId,
        unitId: session.unitId,
        clientId: session.clientId,
        type: InteractionEventType.TASK,
        title: toEventTitle(responseType),
        description: message,
        metadata: toSafeMetadata({
          source: "client_portal",
          responseType,
          shareId: session.shareId,
          reportId: session.reportId,
          payload: body?.payload,
        }),
      },
      select: {
        id: true,
        type: true,
        title: true,
        occurredAt: true,
      },
    });

    return Response.json(
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

function normalizeMessage(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const message = value.trim().slice(0, 1200);
  return message.length > 0 ? message : null;
}

function toEventTitle(type: ClientPortalResponseType): string {
  const titles: Record<ClientPortalResponseType, string> = {
    SUPPLEMENT: "客戶補充資料",
    QUESTION: "客戶提問",
    BOOKING_INTENT: "客戶預約意向",
  };

  return titles[type];
}

function toSafeMetadata(input: {
  source: string;
  responseType: ClientPortalResponseType;
  shareId: string;
  reportId: string;
  payload: unknown;
}): Prisma.InputJsonValue {
  const payload = input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
    ? (input.payload as Record<string, unknown>)
    : {};

  return {
    source: input.source,
    responseType: input.responseType,
    shareId: input.shareId,
    reportId: input.reportId,
    preferredTime: toSafeString(payload.preferredTime, 120),
    contactMethod: toSafeString(payload.contactMethod, 80),
    topic: toSafeString(payload.topic, 160),
  };
}

function toSafeString(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const text = value.trim().slice(0, limit);
  return text.length > 0 ? text : undefined;
}
