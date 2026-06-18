import { getSharedReportByToken } from "@/lib/share/share-repository";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedReportByToken(token);

  if (!shared) {
    return Response.json(
      {
        error: "SHARE_NOT_FOUND",
        message: "Share link is invalid or expired.",
      },
      { status: 404 },
    );
  }

  return Response.json(shared);
}
