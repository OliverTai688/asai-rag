import { jsonResponse } from "@/lib/api/response";
import { getPublicStatus } from "@/lib/public/status-repository";

const PUBLIC_STATUS_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
} as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getPublicStatus();

  return jsonResponse(status, { headers: PUBLIC_STATUS_CACHE_HEADERS });
}
