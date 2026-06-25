#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const qaStamp = `Relationship Edge QA ${Date.now()}`;
const sourceOnly =
  process.env.RELATIONSHIP_EDGE_PERSISTENCE_SOURCE_ONLY === "1" ||
  process.argv.includes("--source-only");

const checks = [];
let memberClientId = "";

if (sourceOnly) {
  runSourceOnlyProof();
} else {
  await runApiProof();
}

for (const check of checks) {
  console.log(`${check.status === "pass" ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function runSourceOnlyProof() {
  const packageJson = readText("package.json");
  const schema = readText("prisma/schema.prisma");
  const repository = readText("src/lib/clients/relationship-edge-repository.ts");
  const route = readText("src/app/api/clients/[id]/relationship-edges/route.ts");
  const runtimeSources = `${repository}\n${route}`;

  push(packageJson.includes('"client:relationship-edge-persistence-qa"'), "package script exposes formal edge persistence QA");
  push(schema.includes("model RelationshipEdge"), "Prisma schema defines RelationshipEdge model");
  push(schema.includes("relationshipEdges   RelationshipEdge[]"), "Client relation exposes relationshipEdges");
  push(schema.includes("enum RelationshipEdgeType"), "Prisma schema defines RelationshipEdgeType enum");
  push(schema.includes("enum RelationshipEdgeFactStatus"), "Prisma schema defines RelationshipEdgeFactStatus enum");
  for (const field of [
    "organizationId",
    "clientId",
    "sourceNodeId",
    "targetNodeId",
    "type",
    "factStatus",
    "backfillKey",
    "@@unique([clientId, backfillKey])",
    "@@index([organizationId, clientId])",
  ]) {
    push(schema.includes(field), `RelationshipEdge schema includes ${field}`);
  }

  push(route.includes("export async function GET"), "relationship-edges route exports GET");
  push(route.includes("export async function POST"), "relationship-edges route exports POST");
  push(route.includes("requireCurrentMember"), "route derives current member session server-side");
  push(route.includes("listRelationshipEdgesForClient"), "GET delegates to relationship edge repository");
  push(route.includes("backfillRelationshipEdgesForClient"), "POST delegates to relationship edge repository");
  push(route.includes("CLIENT_NOT_FOUND") && route.includes("CLIENT_FORBIDDEN"), "route maps not-found/forbidden without leaking scope");
  push(route.includes("cache-control") && route.includes("no-store"), "route responses are no-store");

  for (const token of [
    "canReadClientDetail",
    "canWriteClient",
    "session.organization.id",
    "prisma.relationshipEdge.findMany",
    "prisma.relationshipEdge.create",
    "prisma.relationshipEdge.update",
    "prisma.relationshipEdge.deleteMany",
    "buildRelationshipEdgeShadowBackfill",
    "RELATIONSHIP_EDGE_ALLOWED_METADATA_KEYS",
    "providerCallAttempted: false",
    "writesConfirmedCrmFact: false",
  ]) {
    push(repository.includes(token), `repository source contains ${token}`);
  }

  const allowedMetadataKeys = [
    "schemaVersion",
    "derivedFrom",
    "relationLabel",
    "safeSummary",
    "confidence",
    "warningCodes",
  ];
  for (const key of allowedMetadataKeys) {
    push(repository.includes(key), `metadata allowlist includes ${key}`);
  }

  push(!/\b(email|phone|policyNumber)\s*:/.test(runtimeSources), "edge DTO/runtime source does not expose contact or policy-number fields");
  push(!/rawProviderPayload|rawPrivateTranscript|rawTranscript|secret|otp|paymentData/.test(runtimeSources), "edge source omits raw/private/payment sentinel fields");
  push(!/openai|anthropic|provider\.|AiUsageLog/i.test(runtimeSources), "source-only proof: no provider call or fake AiUsageLog path");
}

async function runApiProof() {
  // unauth
  const unauth = await fetch(`${baseUrl}/api/clients/not-a-client/relationship-edges`, { method: "GET" });
  push(unauth.status === 401, "GET relationship-edges unauth returns 401", `status=${unauth.status}`);

  const client = await createClient();
  memberClientId = client.id;
  if (!memberClientId) return;

  // Seed a network: elder parent (root), spouse, sibling, social, descendant child re-parented under spouse.
  const spouse = await createMember(memberClientId, { name: `${qaStamp} 配偶`, relation: "配偶", age: 44 });
  await createMember(memberClientId, { name: `${qaStamp} 父`, relation: "父", age: 71 });
  await createMember(memberClientId, { name: `${qaStamp} 兄`, relation: "兄", age: 49 });
  await createMember(memberClientId, { name: `${qaStamp} 朋友`, relation: "朋友", age: 46 });
  const child = await createMember(memberClientId, { name: `${qaStamp} 子`, relation: "子", age: 14 });
  if (spouse.id && child.id) {
    await memberRequest("PATCH", `/api/clients/${memberClientId}/family-members/${child.id}`, {
      parentMemberId: spouse.id,
    });
  }

  // Backfill (first run): expect created edges, updated 0.
  const first = await memberRequest("POST", `/api/clients/${memberClientId}/relationship-edges`);
  push(first.status === 200, "POST relationship-edges backfill returns 200", `status=${first.status}`);
  push(first.body?.created >= 5, "first backfill creates edges from family members", `created=${first.body?.created}`);
  push(first.body?.updated === 0, "first backfill updates nothing", `updated=${first.body?.updated}`);
  push(first.body?.proof?.writesConfirmedCrmFact === false, "backfill proof: no confirmed CRM fact write");

  const firstTotal = first.body?.total ?? 0;
  const types = new Set((first.body?.edges ?? []).map((edge) => edge.type));
  push(types.has("PARENT_OF"), "edges include PARENT_OF (elder + descendant)");
  push(types.has("SPOUSE_OF"), "edges include SPOUSE_OF (couple union)");
  push(types.has("SIBLING_OF"), "edges include SIBLING_OF");
  push(types.has("SOCIAL_TIE"), "edges include SOCIAL_TIE (social relation)");

  // Backfill (second run): idempotent → created 0, updated == firstTotal, total unchanged.
  const second = await memberRequest("POST", `/api/clients/${memberClientId}/relationship-edges`);
  push(second.body?.created === 0, "second backfill is idempotent (creates nothing)", `created=${second.body?.created}`);
  push(second.body?.total === firstTotal, "second backfill keeps total stable", `total=${second.body?.total} first=${firstTotal}`);

  // GET list returns persisted edges with node ids + fact status.
  const list = await memberRequest("GET", `/api/clients/${memberClientId}/relationship-edges`);
  push(list.status === 200, "GET relationship-edges returns 200", `status=${list.status}`);
  push((list.body?.edges?.length ?? 0) === firstTotal, "GET returns persisted edge count", `count=${list.body?.edges?.length}`);
  const sample = (list.body?.edges ?? [])[0];
  push(
    Boolean(sample?.sourceNodeId && sample?.targetNodeId && sample?.type && sample?.factStatus),
    "persisted edge carries node ids, type and factStatus",
  );

  // Privacy sentinel: no email/phone in serialized edge payload.
  const serialized = JSON.stringify(list.body ?? {});
  push(!serialized.includes(client.email), "edge payload omits client email sentinel");
  push(!serialized.includes(client.phone), "edge payload omits client phone sentinel");

  // Metadata allowlist: only 6 safe keys.
  const allowed = ["schemaVersion", "derivedFrom", "relationLabel", "safeSummary", "confidence", "warningCodes"];
  const extraKeys = sample?.metadata
    ? Object.keys(sample.metadata).filter((key) => !allowed.includes(key))
    : [];
  push(extraKeys.length === 0, "edge metadata stays within safe allowlist", `extra=${extraKeys.join(",")}`);

  // Org scoping: manager (foreign owner) cannot read/backfill member's client edges.
  const managerGet = await managerRequest("GET", `/api/clients/${memberClientId}/relationship-edges`);
  push([403, 404].includes(managerGet.status), "manager cannot read foreign client edges", `status=${managerGet.status}`);
  const managerPost = await managerRequest("POST", `/api/clients/${memberClientId}/relationship-edges`);
  push([403, 404].includes(managerPost.status), "manager cannot backfill foreign client edges", `status=${managerPost.status}`);
}

async function createClient(request = memberRequest) {
  const email = `relationship-edge-${Date.now()}@asai.local`;
  const phone = "0912-553-118";
  const res = await request("POST", "/api/clients", {
    name: `${qaStamp} 客戶`,
    email,
    phone,
    occupation: "家族企業負責人",
    annualIncome: 4200000,
    status: "ACTIVE",
  });
  const id = res.body?.client?.id ?? "";
  push(res.status === 201 && Boolean(id), "POST /api/clients creates edge QA client", `status=${res.status}`);
  return { id, email, phone };
}

async function createMember(clientId, body) {
  const res = await memberRequest("POST", `/api/clients/${clientId}/family-members`, body);
  const family = res.body?.client?.family ?? [];
  let member = null;
  for (let i = family.length - 1; i >= 0; i -= 1) {
    if (family[i].name === body.name) {
      member = family[i];
      break;
    }
  }
  push(res.status === 201 && Boolean(member?.id), `POST family member ${body.name}`, `status=${res.status}`);
  return { id: member?.id ?? "" };
}

async function memberRequest(method, path, body) {
  return requestJson(method, path, demoMemberEmail, body);
}

async function managerRequest(method, path, body) {
  return requestJson(method, path, demoManagerEmail, body);
}

async function requestJson(method, path, email, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-asai-demo-user-email": email },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
