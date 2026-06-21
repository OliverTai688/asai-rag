import { jsonResponse } from "@/lib/api/response";
import { getPublicPricing } from "@/lib/public/pricing-repository";

const PUBLIC_PRICING_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
} as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const pricing = await getPublicPricing();

  return jsonResponse(pricing, { headers: PUBLIC_PRICING_CACHE_HEADERS });
}
