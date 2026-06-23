import { buildDisabledEcpayNotifyDto, ecpayNotifyInputSchema } from "@/domains/subscription/ecpay";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { flattenZodIssues, type ParsedJsonBody } from "@/lib/api/validation";
import type { EcpayNotifyInput } from "@/domains/subscription/ecpay";
import type { EcpayCheckMacHashInfo } from "@/domains/subscription/ecpay-checkmac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseEcpayNotifyBody(request);

  if (!parsed.success) {
    return parsed.response;
  }

  return privateJsonResponse(
    {
      error: "BILLING_ECPAY_NOTIFY_DISABLED",
      notification: buildDisabledEcpayNotifyDto(parsed.data, new Date(), readEcpayCheckMacHashInfoFromEnv()),
    },
    { status: 503 },
  );
}

async function parseEcpayNotifyBody(request: Request): Promise<ParsedJsonBody<EcpayNotifyInput>> {
  const rawBody = await readNotifyBody(request);
  const parsed = ecpayNotifyInputSchema.safeParse(rawBody);

  if (!parsed.success) {
    return {
      success: false,
      response: apiErrorResponse(
        apiErrors.validation(
          "INVALID_BILLING_ECPAY_NOTIFY_INPUT",
          flattenZodIssues(parsed.error),
          "A valid ECPay notification payload is required.",
        ),
      ),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

async function readNotifyBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formBody = await request.text().catch(() => "");
    const params = new URLSearchParams(formBody);
    const output: Record<string, string> = {};

    for (const [key, value] of params.entries()) {
      output[key] = value;
    }

    return output;
  }

  return null;
}

function readEcpayCheckMacHashInfoFromEnv(): EcpayCheckMacHashInfo | null {
  const hashKey = process.env.ECPAY_HASH_KEY?.trim();
  const hashIv = process.env.ECPAY_HASH_IV?.trim();

  if (!hashKey || !hashIv) {
    return null;
  }

  return {
    hashKey,
    hashIv,
  };
}
