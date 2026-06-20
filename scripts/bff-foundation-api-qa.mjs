#!/usr/bin/env node

const baseUrl = process.env.BFF_FOUNDATION_QA_BASE_URL ?? process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const shareToken = process.env.BFF_FOUNDATION_SHARE_TOKEN ?? process.env.CLIENT_PORTAL_QA_TOKEN ?? "demo-share-wang";
const checks = [];

const forbiddenText = [
  "AUTH_SECRET",
  "DATABASE_URL",
  "DIRECT_URL",
  "rawPayload",
  "providerPayload",
  "unsafeRawPrivatePayload",
  "stack",
];

const memberUnauth = await get("/api/member/settings");
push(memberUnauth.status === 401, "GET /api/member/settings rejects unauthenticated requests", `status=${memberUnauth.status}`);

const memberGet = await get("/api/member/settings", appHeaders());
push(memberGet.status === 200, "GET /api/member/settings returns member-scoped settings", `status=${memberGet.status}`);
push(hasNoStore(memberGet), "Member settings GET uses private no-store cache header", memberGet.headers.get("cache-control") ?? "missing");
push(hasRequestId(memberGet), "Member settings GET includes x-asai-request-id", memberGet.headers.get("x-asai-request-id") ?? "missing");
push(memberGet.body?.settings?.defaultWorkspace?.organizationId, "Member settings includes current member workspace scope");

const memberInvalidPatch = await patch("/api/member/settings", { aiPreferences: { tone: "too-loud" } }, appHeaders());
push(memberInvalidPatch.status === 400, "PATCH /api/member/settings validates input", `status=${memberInvalidPatch.status}`);
push(memberInvalidPatch.body?.kind === "VALIDATION", "Member settings invalid PATCH returns validation kind", memberInvalidPatch.body?.kind ?? "missing");
push(hasNoStore(memberInvalidPatch), "Member settings invalid PATCH uses no-store error response");
push(hasRequestId(memberInvalidPatch), "Member settings invalid PATCH includes requestId");
push(noForbiddenText(memberInvalidPatch), "Member settings invalid PATCH omits stack/env/raw payload");

const shareGet = await get(`/api/share/${shareToken}`);
push(shareGet.status === 200, "GET /api/share/[token] returns shared report", `status=${shareGet.status}`);
push(hasNoStore(shareGet), "Share GET uses private no-store cache header", shareGet.headers.get("cache-control") ?? "missing");
push(hasRequestId(shareGet), "Share GET includes x-asai-request-id");

const shareMissing = await get("/api/share/not-a-real-share-token");
push(shareMissing.status === 404, "Missing share token returns 404", `status=${shareMissing.status}`);
push(shareMissing.body?.kind === "NOT_FOUND", "Missing share token returns not-found kind", shareMissing.body?.kind ?? "missing");
push(hasNoStore(shareMissing), "Missing share token error uses no-store");
push(noForbiddenText(shareMissing), "Missing share token error omits stack/env/raw payload");

const invalidShareEvent = await post(`/api/share/${shareToken}/events`, { type: "UNSAFE" });
push(invalidShareEvent.status === 400, "POST /api/share/[token]/events validates event type", `status=${invalidShareEvent.status}`);
push(invalidShareEvent.body?.kind === "VALIDATION", "Invalid share event returns validation kind", invalidShareEvent.body?.kind ?? "missing");
push(hasNoStore(invalidShareEvent), "Invalid share event error uses no-store");

const invalidClientResponse = await post(
  "/api/client-portal/responses",
  { type: "UNSAFE", message: "bad" },
  clientHeaders(),
);
push(invalidClientResponse.status === 400, "POST /api/client-portal/responses validates response type", `status=${invalidClientResponse.status}`);
push(invalidClientResponse.body?.kind === "VALIDATION", "Invalid client response returns validation kind", invalidClientResponse.body?.kind ?? "missing");
push(hasNoStore(invalidClientResponse), "Invalid client response error uses no-store");
push(noForbiddenText(invalidClientResponse), "Invalid client response omits stack/env/raw payload");

const validClientResponse = await post(
  "/api/client-portal/responses",
  {
    type: "BOOKING_INTENT",
    message: "BFF foundation QA：想安排下一次保單缺口討論。",
    payload: {
      preferredTime: "next Tuesday afternoon",
      contactMethod: "phone",
      topic: "medical coverage gap",
      unsafeRawPrivatePayload: "must-not-return",
    },
  },
  clientHeaders(),
);
push(validClientResponse.status === 201, "POST /api/client-portal/responses stores safe client response", `status=${validClientResponse.status}`);
push(hasNoStore(validClientResponse), "Client response success uses private no-store cache header");
push(hasRequestId(validClientResponse), "Client response success includes x-asai-request-id");
push(noForbiddenText(validClientResponse), "Client response success omits unsafe private payload text");

for (const check of checks) {
  const prefix = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${prefix} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function get(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return parseResponse(response);
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function patch(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body, text, headers: response.headers };
}

function appHeaders() {
  return {
    "x-asai-demo-user-email": demoEmail,
  };
}

function clientHeaders() {
  return {
    "x-asai-client-token": shareToken,
  };
}

function hasNoStore(response) {
  return response.headers.get("cache-control")?.includes("no-store") ?? false;
}

function hasRequestId(response) {
  return Boolean(response.headers.get("x-asai-request-id") || response.body?.requestId);
}

function noForbiddenText(response) {
  return forbiddenText.every((token) => !response.text.includes(token));
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
