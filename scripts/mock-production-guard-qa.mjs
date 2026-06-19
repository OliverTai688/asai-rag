#!/usr/bin/env node
const baseUrl = process.env.MOCK_QA_BASE_URL ?? process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";

const routes = [
  {
    path: "/api/mock/ai/assistant",
    body: { messages: [{ role: "user", content: "顯示待開發客戶" }], context: {} },
  },
  {
    path: "/api/mock/ai/spin-outline",
    body: {
      session: { clientName: "測試客戶", outputs: {}, transitions: [] },
      clientInfo: { name: "測試客戶" },
    },
  },
  {
    path: "/api/mock/ai/theater",
    body: { personaType: "SKEPTICAL", tension: 10, spinOutputs: { PROBLEM: [] } },
  },
  {
    path: "/api/mock/ai/visit",
    body: { purpose: "FIRST_VISIT", clientId: "demo-client" },
  },
  {
    path: "/api/mock/track/demo-token",
    body: {},
  },
];

const checks = [];

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route.path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(route.body),
  });
  const text = await response.text();
  const disabled = response.status === 404 && text.includes("mock_api_disabled");
  push(disabled, `${route.path} is disabled in production-like runtime`, `status=${response.status}`);
}

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
