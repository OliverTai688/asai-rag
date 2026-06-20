import { headers } from "next/headers";
import { z } from "zod";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, jsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { recordShareEvent } from "@/lib/share/share-repository";

const shareEventSchema = z.object({
  type: z.enum(["OPEN", "SCROLL", "CLICK", "EXIT", "DOWNLOAD"]).default("OPEN"),
  payload: z.unknown().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsedBody = await parseJsonBody(req, shareEventSchema, {
    error: "INVALID_SHARE_EVENT",
    fallbackBody: {},
  });

  if (!parsedBody.success) {
    return parsedBody.response;
  }

  const headerList = await headers();
  const result = await recordShareEvent({
    token,
    type: parsedBody.data.type,
    payload: parsedBody.data.payload,
    userAgent: headerList.get("user-agent"),
    ip: getForwardedIp(headerList.get("x-forwarded-for")),
  });

  if (!result) {
    return apiErrorResponse(apiErrors.notFound("SHARE_NOT_FOUND", "Share link is invalid or expired."));
  }

  return jsonResponse(result);
}

function getForwardedIp(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}
