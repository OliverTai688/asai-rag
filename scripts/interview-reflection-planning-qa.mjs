#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const checks = [];

main().catch((error) => {
  push(false, "interview reflection/planning QA crashed", error instanceof Error ? error.message : String(error));
  printChecks();
  process.exitCode = 1;
});

async function main() {
  const unauthPlan = await postJson("/api/ai/interview/sessions/non-existent/plans", {});
  push(unauthPlan.status === 401, "planning route unauth returns 401", `status=${unauthPlan.status}`);

  const create = await postJson(
    "/api/ai/interview/sessions",
    {
      interviewKind: "ADVISOR_COMPANION",
      outlineId: "advisor-companion-v1",
      currentSegmentId: "current-situation",
      title: `PIM-007 QA ${new Date().toISOString()}`,
    },
    demoMemberEmail,
  );
  const sessionId = create.body?.session?.id;
  push(create.status === 201 && typeof sessionId === "string", "member creates planning QA interview session", `status=${create.status}`);

  if (typeof sessionId !== "string") {
    printChecks();
    process.exitCode = 1;
    return;
  }

  await appendTurn(sessionId, "我確認客戶太太會一起參與醫療保障決策。", "current-situation");
  await appendTurn(sessionId, "他可能擔心明年教育金壓力，但這只是我目前的推測。", "current-situation");
  await appendTurn(sessionId, "我不確定他既有醫療險是否快到期。", "current-situation");

  const generatedReflection = await postJson(
    `/api/ai/interview/sessions/${sessionId}/reflections/generate`,
    {
      currentSegmentId: "current-situation",
    },
    demoMemberEmail,
  );
  push(generatedReflection.status === 201, "generated reflection persists through BFF", `status=${generatedReflection.status}`);
  const reflection = generatedReflection.body?.reflection;
  push(
    Array.isArray(reflection?.confirmedFacts) &&
      reflection.confirmedFacts.some((text) => text.includes("太太")) &&
      Array.isArray(reflection?.inferredPatterns) &&
      reflection.inferredPatterns.some((text) => text.includes("可能")) &&
      Array.isArray(reflection?.unknowns) &&
      reflection.unknowns.some((text) => text.includes("不確定")),
    "reflection separates confirmed facts, inferences, and unknowns",
  );
  push(
    Array.isArray(reflection?.supportingMemoryIds) && reflection.supportingMemoryIds.length >= 3,
    "reflection keeps supporting memory IDs",
    `ids=${reflection?.supportingMemoryIds?.join(",") ?? ""}`,
  );
  push(
    !JSON.stringify(generatedReflection.body).includes("providerEventId") &&
      !JSON.stringify(generatedReflection.body).includes("rawAudio"),
    "reflection response does not expose raw private payload fields",
  );

  const plan = await postJson(
    `/api/ai/interview/sessions/${sessionId}/plans`,
    {
      currentSegmentId: "current-situation",
      queryText: "請產生下一題",
    },
    demoMemberEmail,
  );
  push(plan.status === 200, "generated plan returns 200", `status=${plan.status}`);
  push(
    typeof plan.body?.microPlan?.nextQuestion === "string" &&
      plan.body.microPlan.nextQuestion.includes("不確定") &&
      !plan.body.microPlan.nextQuestion.includes("太太會一起參與"),
    "planning prioritizes unknown and does not re-ask confirmed fact",
    plan.body?.microPlan?.nextQuestion,
  );
  push(
    Array.isArray(plan.body?.supportingMemoryIds) && plan.body.supportingMemoryIds.length >= 1,
    "planning returns supporting memory IDs",
  );
  push(
    plan.body?.microPlan?.avoid?.includes("不要把推論說成事實"),
    "planning includes inference-to-fact guard",
  );

  const managerPlan = await postJson(`/api/ai/interview/sessions/${sessionId}/plans`, {}, demoManagerEmail);
  push(
    managerPlan.status === 404,
    "manager cannot generate plan from member private transcript/memory",
    `status=${managerPlan.status}`,
  );

  printChecks();

  if (checks.some((item) => item.status === "fail")) {
    process.exitCode = 1;
  }
}

async function appendTurn(sessionId, content, outlineSegmentId) {
  const response = await postJson(
    `/api/ai/interview/sessions/${sessionId}/turns`,
    {
      role: "USER",
      modality: "TEXT",
      content,
      transcriptFinal: true,
      outlineSegmentId,
    },
    demoMemberEmail,
  );

  push(response.status === 201, `append turn: ${content.slice(0, 18)}`, `status=${response.status}`);
  return response;
}

async function postJson(path, body, userEmail) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userEmail ? { "x-asai-demo-user-email": userEmail } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let parsedBody;

    try {
      parsedBody = JSON.parse(text);
    } catch {
      parsedBody = undefined;
    }

    return {
      status: response.status,
      body: parsedBody,
      text,
    };
  } catch (error) {
    push("warn", "API route proof skipped", error instanceof Error ? error.message : String(error));
    return {
      status: 0,
      body: undefined,
      text: "",
    };
  }
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition === "warn" ? "warn" : condition ? "pass" : "fail",
    label,
    detail,
  });
}

function printChecks() {
  for (const item of checks) {
    const prefix = item.status === "pass" ? "PASS" : item.status === "warn" ? "WARN" : "FAIL";
    console.log(`${prefix} ${item.label}${item.detail ? ` - ${item.detail}` : ""}`);
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
