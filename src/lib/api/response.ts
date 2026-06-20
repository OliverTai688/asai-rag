import { buildApiErrorBody, type ApiErrorInput } from "./errors";

type JsonResponseOptions = {
  status?: number;
  headers?: HeadersInit;
  requestId?: string;
  privateData?: boolean;
};

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

export function apiRequestId(prefix = "api"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function jsonResponse<T>(body: T, options: JsonResponseOptions = {}): Response {
  const requestId = options.requestId ?? apiRequestId();
  const headers = mergeHeaders(options.headers, {
    "x-asai-request-id": requestId,
    ...(options.privateData ? PRIVATE_CACHE_HEADERS : {}),
  });

  return Response.json(body, {
    status: options.status,
    headers,
  });
}

export function privateJsonResponse<T>(body: T, options: Omit<JsonResponseOptions, "privateData"> = {}): Response {
  return jsonResponse(body, { ...options, privateData: true });
}

export function apiErrorResponse(input: ApiErrorInput, options: Omit<JsonResponseOptions, "status"> = {}): Response {
  const requestId = options.requestId ?? apiRequestId("err");

  return jsonResponse(buildApiErrorBody({ ...input, requestId }), {
    ...options,
    status: input.status,
    requestId,
    privateData: true,
  });
}

export function mergeHeaders(...headersList: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const headersInit of headersList) {
    if (!headersInit) continue;

    new Headers(headersInit).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}
