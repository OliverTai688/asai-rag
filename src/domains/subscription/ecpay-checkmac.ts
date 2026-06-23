import { createHash, timingSafeEqual } from "node:crypto";

export const BILLING_ECPAY_CHECKMAC_CONTRACT_VERSION = "asai.billing.ecpay.checkmac.v1";

export type EcpayCheckMacHashInfo = {
  hashKey: string;
  hashIv: string;
};

export type EcpayCheckMacValidationStatus = "not_configured" | "missing" | "verified" | "invalid";

export type EcpayCheckMacValidationDto = {
  version: typeof BILLING_ECPAY_CHECKMAC_CONTRACT_VERSION;
  method: "SHA256";
  source: "server_only";
  validationAttempted: boolean;
  verified: boolean;
  status: EcpayCheckMacValidationStatus;
  receivedCheckMacValue: {
    provided: boolean;
    echoed: false;
    stored: false;
  };
  dataBoundary: {
    hashKeyReturned: false;
    hashIvReturned: false;
    rawCheckMacValueReturned: false;
    rawCheckMacValueStored: false;
    browserGeneratedChecksumAllowed: false;
  };
  providerCallAttempted: false;
  aiUsageLogRequired: false;
};

type FlatCheckMacValue = string | number | boolean | bigint;

export function buildGuardedEcpayCheckMacValidation(
  input: Record<string, unknown>,
  hashInfo: EcpayCheckMacHashInfo | null = null,
): EcpayCheckMacValidationDto {
  const receivedCheckMacValue = normalizeEcpayCheckMacValue(input.CheckMacValue);
  const provided = receivedCheckMacValue !== null;
  const configuredHashInfo = normalizeEcpayCheckMacHashInfo(hashInfo);

  if (!provided) {
    return buildEcpayCheckMacValidationDto({
      validationAttempted: false,
      verified: false,
      status: "missing",
      provided,
    });
  }

  if (configuredHashInfo === null) {
    return buildEcpayCheckMacValidationDto({
      validationAttempted: false,
      verified: false,
      status: "not_configured",
      provided,
    });
  }

  const verified = verifyEcpayCheckMacValue(input, receivedCheckMacValue, configuredHashInfo);

  return buildEcpayCheckMacValidationDto({
    validationAttempted: true,
    verified,
    status: verified ? "verified" : "invalid",
    provided,
  });
}

export function createEcpayCheckMacValue(input: Record<string, unknown>, hashInfo: EcpayCheckMacHashInfo): string {
  const configuredHashInfo = normalizeEcpayCheckMacHashInfo(hashInfo);

  if (configuredHashInfo === null) {
    throw new Error("ECPay CheckMacValue requires server HashKey and HashIV.");
  }

  const canonicalSource = buildEcpayCheckMacCanonicalSource(input, configuredHashInfo);
  return createHash("sha256").update(canonicalSource, "utf8").digest("hex").toUpperCase();
}

export function verifyEcpayCheckMacValue(
  input: Record<string, unknown>,
  receivedCheckMacValue: string,
  hashInfo: EcpayCheckMacHashInfo,
): boolean {
  const expectedCheckMacValue = createEcpayCheckMacValue(input, hashInfo);
  const received = normalizeEcpayCheckMacValue(receivedCheckMacValue);

  if (received === null || received.length !== expectedCheckMacValue.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expectedCheckMacValue, "utf8"));
}

export function normalizeEcpayCheckMacValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function buildEcpayCheckMacCanonicalSource(input: Record<string, unknown>, hashInfo: EcpayCheckMacHashInfo): string {
  const sortedParams = Object.entries(flattenCheckMacInput(input)).sort(([leftKey], [rightKey]) =>
    compareCaseInsensitiveAscii(leftKey, rightKey),
  );
  const rawSource = [
    `HashKey=${hashInfo.hashKey}`,
    ...sortedParams.map(([key, value]) => `${key}=${value}`),
    `HashIV=${hashInfo.hashIv}`,
  ].join("&");

  return encodeEcpayCheckMacSource(rawSource).toLowerCase();
}

function flattenCheckMacInput(input: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    if (key === "CheckMacValue" || key === "HashKey" || key === "HashIV") {
      continue;
    }

    if (isFlatCheckMacValue(value)) {
      output[key] = String(value);
    }
  }

  return output;
}

function encodeEcpayCheckMacSource(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/%2D/gi, "-")
    .replace(/%5F/gi, "_")
    .replace(/%2E/gi, ".")
    .replace(/%21/gi, "!")
    .replace(/%2A/gi, "*")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")");
}

function normalizeEcpayCheckMacHashInfo(hashInfo: EcpayCheckMacHashInfo | null): EcpayCheckMacHashInfo | null {
  const hashKey = hashInfo?.hashKey.trim();
  const hashIv = hashInfo?.hashIv.trim();

  if (!hashKey || !hashIv) {
    return null;
  }

  return { hashKey, hashIv };
}

function buildEcpayCheckMacValidationDto(input: {
  validationAttempted: boolean;
  verified: boolean;
  status: EcpayCheckMacValidationStatus;
  provided: boolean;
}): EcpayCheckMacValidationDto {
  return {
    version: BILLING_ECPAY_CHECKMAC_CONTRACT_VERSION,
    method: "SHA256",
    source: "server_only",
    validationAttempted: input.validationAttempted,
    verified: input.verified,
    status: input.status,
    receivedCheckMacValue: {
      provided: input.provided,
      echoed: false,
      stored: false,
    },
    dataBoundary: {
      hashKeyReturned: false,
      hashIvReturned: false,
      rawCheckMacValueReturned: false,
      rawCheckMacValueStored: false,
      browserGeneratedChecksumAllowed: false,
    },
    providerCallAttempted: false,
    aiUsageLogRequired: false,
  };
}

function compareCaseInsensitiveAscii(left: string, right: string): number {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();

  if (normalizedLeft < normalizedRight) {
    return -1;
  }

  if (normalizedLeft > normalizedRight) {
    return 1;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}

function isFlatCheckMacValue(value: unknown): value is FlatCheckMacValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  );
}
