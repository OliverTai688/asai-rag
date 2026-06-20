#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const checks = [];

const requiredFiles = [
  "src/lib/api/errors.ts",
  "src/lib/api/response.ts",
  "src/lib/api/validation.ts",
  "src/lib/api/sanitize.ts",
  "src/app/api/member/settings/route.ts",
  "src/app/api/share/[token]/route.ts",
  "src/app/api/share/[token]/events/route.ts",
  "src/app/api/client-portal/responses/route.ts",
  "src/lib/share/share-repository.ts",
];

for (const file of requiredFiles) {
  push(existsSync(path.join(rootDir, file)), `${file} exists`);
}

expectContains("src/lib/api/errors.ts", [
  "unauthenticated",
  "forbidden",
  "notFound",
  "validation",
  "rateLimited",
  "quotaExceeded",
  "providerUnavailable",
  "buildApiErrorBody",
]);

expectContains("src/lib/api/response.ts", [
  "privateJsonResponse",
  "apiErrorResponse",
  "Cache-Control",
  "no-store",
  "x-asai-request-id",
]);

expectContains("src/lib/api/validation.ts", [
  "parseJsonBody",
  "flattenZodIssues",
  "apiErrorResponse",
]);

expectContains("src/lib/api/sanitize.ts", [
  "sanitizeShareEventPayload",
  "sanitizeClientPortalResponseMetadata",
  "sanitizeAuditMetadata",
  "sanitizeWhitelistRecord",
]);

expectContains("src/app/api/member/settings/route.ts", [
  "privateJsonResponse",
  "parseJsonBody",
  "INVALID_MEMBER_SETTINGS_INPUT",
]);

expectContains("src/app/api/share/[token]/route.ts", [
  "privateJsonResponse",
  "apiErrorResponse",
  "SHARE_NOT_FOUND",
]);

expectContains("src/app/api/share/[token]/events/route.ts", [
  "parseJsonBody",
  "jsonResponse",
  "apiErrorResponse",
  "INVALID_SHARE_EVENT",
]);

expectContains("src/app/api/client-portal/responses/route.ts", [
  "sanitizeClientPortalResponseMetadata",
  "privateJsonResponse",
  "parseJsonBody",
  "INVALID_CLIENT_PORTAL_RESPONSE",
]);

expectContains("src/lib/share/share-repository.ts", [
  "sanitizeShareEventPayload",
]);

expectNotContains("src/lib/share/share-repository.ts", [
  "function toSafePayload",
]);

expectNotContains("src/lib/api/response.ts", [
  "stack",
  "process.env",
  "rawPayload",
  "providerPayload",
]);

expectNotContains("src/lib/api/errors.ts", [
  "stack",
  "process.env",
  "rawPayload",
  "providerPayload",
]);

for (const check of checks) {
  const prefix = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${prefix} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function expectContains(file, tokens) {
  const source = readSource(file);

  for (const token of tokens) {
    push(source.includes(token), `${file} includes ${token}`);
  }
}

function expectNotContains(file, tokens) {
  const source = readSource(file);

  for (const token of tokens) {
    push(!source.includes(token), `${file} omits ${token}`);
  }
}

function readSource(file) {
  const fullPath = path.join(rootDir, file);
  if (!existsSync(fullPath)) {
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
