import { getPublicPricing } from "@/lib/public/pricing-repository";

export async function GET() {
  const pricing = await getPublicPricing();

  return Response.json(pricing);
}
