#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";

const checks = [];

main().catch((error) => {
  push(false, "interview persistence QA crashed", error instanceof Error ? error.message : String(error));
  printChecks();
  process.exitCode = 1;
});

async function main() {
  const unauth = await postJson("/api/ai/interview/sessions", {
    interviewKind: "ADVISOR_COMPANION",
    outlineId: "advisor-companion",
  });
  push(unauth.status === 401, "unauthenticated session create returns 401", `status=${unauth.status}`);

  const create = await postJson(
    "/api/ai/interview/sessions",
    {
      interviewKind: "ADVISOR_COMPANION",
      outlineId: "advisor-companion",
      currentSegmentId: "context",
      title: `PIM-006 QA ${new Date().toISOString()}`,
    },
    demoMemberEmail,
  );

  const sessionId = create.body?.session?.id;
  push(create.status === 201 && typeof sessionId === "string", "member creates persistent interview session", `status=${create.status}`);

  if (typeof sessionId !== "string") {
    printChecks();
    process.exitCode = 1;
    return;
  }

  const turn = await postJson(
    `/api/ai/interview/sessions/${sessionId}/turns`,
    {
      role: "USER",
      modality: "VOICE_TRANSCRIPT_FALLBACK",
      content: "我確認客戶明年要優先整理教育金與醫療保障缺口，太太會一起參與決策。",
      transcriptFinal: true,
      outlineSegmentId: "context",
      issueTags: ["education-fund", "medical-gap"],
      pqQuestionIds: ["pq-risk-priority"],
    },
    demoMemberEmail,
  );

  const memoryIds = Array.isArray(turn.body?.memories)
    ? turn.body.memories.map((item) => item?.id).filter((id) => typeof id === "string")
    : [];
  push(turn.status === 201 && typeof turn.body?.turn?.id === "string", "member appends turn through BFF", `status=${turn.status}`);
  push(memoryIds.length >= 1, "turn persistence creates Park-style memory candidate", `memoryIds=${memoryIds.join(",")}`);
  push(
    !JSON.stringify(turn.body).includes("audioBase64"),
    "turn persistence proof contains no raw audio payload",
  );

  const reflection = await postJson(
    `/api/ai/interview/sessions/${sessionId}/reflections`,
    {
      segmentId: "context",
      summary: "客戶家庭保障議題已浮現，下一步應確認教育金金額與醫療保障缺口。",
      confirmedFacts: ["太太會一起參與決策"],
      inferredPatterns: ["家庭決策需要共同確認"],
      unknowns: ["教育金目標金額尚未量化"],
      issueReadinessImpact: "已有事實與未知項，可進入問題釐清。",
      theaterBuildImpact: "可生成太太作為關鍵決策者的演練角色。",
      recommendedNextFocus: "追問教育金缺口、醫療保障缺口與決策時間表。",
      supportingMemoryIds: memoryIds,
    },
    demoMemberEmail,
  );
  push(reflection.status === 201, "member creates reflection linked to memory ids", `status=${reflection.status}`);
  push(
    Array.isArray(reflection.body?.reflection?.supportingMemoryIds) &&
      reflection.body.reflection.supportingMemoryIds.length === memoryIds.length,
    "reflection preserves same-session supportingMemoryIds only",
  );

  const snapshot = await getJson(`/api/ai/interview/sessions/${sessionId}`, demoMemberEmail);
  push(snapshot.status === 200, "member reads snapshot after stateless API roundtrip", `status=${snapshot.status}`);
  push(snapshot.body?.turns?.length >= 1, "snapshot returns persisted turns");
  push(snapshot.body?.memories?.length >= 1, "snapshot returns persisted memories");
  push(snapshot.body?.reflections?.length >= 1, "snapshot returns persisted reflections");
  push(
    snapshot.body?.memories?.some?.((memory) => memory?.text?.includes("教育金")) === true,
    "snapshot memory text survives without browser storage",
  );

  const managerSnapshot = await getJson(`/api/ai/interview/sessions/${sessionId}`, demoManagerEmail);
  push(
    managerSnapshot.status === 404,
    "manager cannot read member private interview transcript/memory snapshot",
    `status=${managerSnapshot.status}`,
  );

  printChecks();

  if (checks.some((item) => item.status === "fail")) {
    process.exitCode = 1;
  }
}

async function postJson(path, body, userEmail) {
  return requestJson(path, {
    method: "POST",
    userEmail,
    body,
  });
}

async function getJson(path, userEmail) {
  return requestJson(path, {
    method: "GET",
    userEmail,
  });
}

async function requestJson(path, options) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        ...(options.userEmail ? { "x-asai-demo-user-email": options.userEmail } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    let body;

    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }

    return {
      status: response.status,
      body,
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
