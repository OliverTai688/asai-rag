import { buildDisabledNotificationsBffDto } from "@/domains/notifications/bff";
import { privateJsonResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  return privateJsonResponse(buildDisabledNotificationsBffDto());
}
