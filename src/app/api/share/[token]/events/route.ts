import { headers } from "next/headers";
import { z } from "zod";
import { recordShareEvent } from "@/lib/share/share-repository";

const shareEventSchema = z.object({
  type: z.enum(["OPEN", "SCROLL", "CLICK", "EXIT", "DOWNLOAD"]).default("OPEN"),
  payload: z.unknown().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsedBody = shareEventSchema.safeParse(await req.json().catch(() => ({})));

  if (!parsedBody.success) {
    return Response.json(
      {
        error: "INVALID_SHARE_EVENT",
        issues: parsedBody.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
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
    return Response.json(
      {
        error: "SHARE_NOT_FOUND",
        message: "Share link is invalid or expired.",
      },
      { status: 404 },
    );
  }

  return Response.json(result);
}

function getForwardedIp(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}
