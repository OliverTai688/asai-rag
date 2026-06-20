export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500 | 502 | 503;

export type ApiErrorKind =
  | "AUTHENTICATION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMIT"
  | "QUOTA"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "PROVIDER"
  | "INTERNAL";

export type ApiErrorBody = {
  error: string;
  kind: ApiErrorKind;
  message?: string;
  issues?: Record<string, string[] | undefined>;
  requestId?: string;
  remaining?: number;
  retryAfterSeconds?: number;
  launchPosture?: string;
  providerAttempted?: boolean;
};

export type ApiErrorInput = {
  error: string;
  kind: ApiErrorKind;
  status: ApiErrorStatus;
  message?: string;
  issues?: Record<string, string[] | undefined>;
  requestId?: string;
  remaining?: number;
  retryAfterSeconds?: number;
  launchPosture?: string;
  providerAttempted?: boolean;
};

export const apiErrors = {
  unauthenticated: (error = "UNAUTHENTICATED", message = "Authentication is required."): ApiErrorInput => ({
    error,
    kind: "AUTHENTICATION",
    status: 401,
    message,
  }),
  forbidden: (error = "FORBIDDEN", message = "You do not have access to this resource."): ApiErrorInput => ({
    error,
    kind: "FORBIDDEN",
    status: 403,
    message,
  }),
  notFound: (error = "NOT_FOUND", message = "Resource was not found."): ApiErrorInput => ({
    error,
    kind: "NOT_FOUND",
    status: 404,
    message,
  }),
  validation: (
    error = "INVALID_INPUT",
    issues: Record<string, string[] | undefined> = {},
    message = "Request input is invalid.",
  ): ApiErrorInput => ({
    error,
    kind: "VALIDATION",
    status: 400,
    message,
    issues,
  }),
  rateLimited: (
    error = "RATE_LIMITED",
    retryAfterSeconds?: number,
    message = "Too many requests.",
  ): ApiErrorInput => ({
    error,
    kind: "RATE_LIMIT",
    status: 429,
    message,
    retryAfterSeconds,
  }),
  quotaExceeded: (
    error = "AI_QUOTA_EXCEEDED",
    remaining = 0,
    message = "AI usage quota is exhausted.",
  ): ApiErrorInput => ({
    error,
    kind: "QUOTA",
    status: 429,
    message,
    remaining,
  }),
  conflict: (error = "CONFLICT", message = "Request conflicts with the current resource state."): ApiErrorInput => ({
    error,
    kind: "CONFLICT",
    status: 409,
    message,
  }),
  payloadTooLarge: (error = "PAYLOAD_TOO_LARGE", message = "Request payload is too large."): ApiErrorInput => ({
    error,
    kind: "PAYLOAD_TOO_LARGE",
    status: 413,
    message,
  }),
  providerUnavailable: (
    error = "PROVIDER_UNAVAILABLE",
    message = "Provider is temporarily unavailable.",
  ): ApiErrorInput => ({
    error,
    kind: "PROVIDER",
    status: 503,
    message,
    providerAttempted: false,
  }),
  internal: (error = "INTERNAL_ERROR", message = "Unexpected server error."): ApiErrorInput => ({
    error,
    kind: "INTERNAL",
    status: 500,
    message,
  }),
};

export function buildApiErrorBody(input: ApiErrorInput): ApiErrorBody {
  return stripUndefined({
    error: input.error,
    kind: input.kind,
    message: input.message,
    issues: input.issues,
    requestId: input.requestId,
    remaining: input.remaining,
    retryAfterSeconds: input.retryAfterSeconds,
    launchPosture: input.launchPosture,
    providerAttempted: input.providerAttempted,
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const output = {} as T;

  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) {
      output[key as keyof T] = item as T[keyof T];
    }
  }

  return output;
}
