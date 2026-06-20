import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { getSharedReportByToken } from "@/lib/share/share-repository";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedReportByToken(token);

  if (!shared) {
    return apiErrorResponse(apiErrors.notFound("SHARE_NOT_FOUND", "Share link is invalid or expired."));
  }

  return privateJsonResponse(shared);
}
