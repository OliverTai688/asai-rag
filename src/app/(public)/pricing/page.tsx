import { getPublicPricing } from "@/lib/public/pricing-repository";
import { getPublicStatus } from "@/lib/public/status-repository";
import { PricingPageClient } from "./pricing-page-client";

export default async function PricingPage() {
  const [pricing, status] = await Promise.all([getPublicPricing(), getPublicStatus()]);

  return <PricingPageClient pricing={pricing} status={status} />;
}
