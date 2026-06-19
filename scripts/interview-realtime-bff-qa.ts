import {
  createDryRunRealtimeClientSecret,
  findRealtimeEventPayloadViolations,
  mirrorRealtimeEventToMemoryCandidates,
  responseContainsServerSecret,
  sanitizeRealtimeClientSecretResponse,
} from "../src/lib/interview/realtime-bff";

interface Check {
  status: "pass" | "fail" | "warn";
  label: string;
  detail?: string;
}

const checks: Check[] = [];
const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoClientId = process.env.DEMO_QA_CLIENT_ID ?? "c_wang";

main().catch((error) => {
  check(false, "interview realtime BFF QA crashed", error instanceof Error ? error.message : String(error));
  printChecks();
  process.exitCode = 1;
});

async function main() {
  runHelperChecks();
  await runApiChecks();
  printChecks();

  if (checks.some((check) => check.status === "fail")) {
    process.exitCode = 1;
  }
}

function runHelperChecks() {
  const sanitized = sanitizeRealtimeClientSecretResponse(
    {
      value: "ek_test_short_lived",
      expires_at: 1_800_000_000,
      session: {
        id: "sess_test_123",
        type: "realtime",
        model: "gpt-realtime-2",
      },
    },
    { provider: "OPENAI" },
  );

  check(
    sanitized.clientSecret.value === "ek_test_short_lived" && sanitized.rawAudioStored === false,
    "sanitizes OpenAI realtime client secret response",
  );
  check(
    !responseContainsServerSecret(sanitized, "sk-project-server-secret"),
    "sanitized realtime response does not contain server API key",
  );

  const dryRun = createDryRunRealtimeClientSecret({ sessionId: "qa" });
  check(dryRun.provider === "DRY_RUN" && dryRun.clientSecret.value.startsWith("ek_dry_run_"), "creates non-production dry-run client secret");

  const rejectedFields = findRealtimeEventPayloadViolations({
    type: "FINAL_TRANSCRIPT",
    sessionId: "interview_rt_1",
    audioBase64: "AAAA",
    client_secret: "ek_should_not_be_here",
    nested: { authorization: "Bearer sk-test" },
  });
  check(
    rejectedFields.length >= 3,
    "rejects secret/raw-audio realtime event payload fields",
    rejectedFields.join(","),
  );

  const mirrored = mirrorRealtimeEventToMemoryCandidates(
    {
      type: "FINAL_TRANSCRIPT",
      sessionId: "interview_rt_1",
      interviewKind: "ADVISOR_COMPANION",
      text: "客戶已確認明年會先整理教育金缺口。",
      transcriptFinal: true,
    },
    {
      organizationId: "org_demo",
      memberId: "user_demo",
      unitId: "unit_demo",
      clientId: "client_demo",
    },
  );
  check(mirrored.rawAudioStored === false, "event mirror never marks raw audio as stored");
  check(
    mirrored.memoryCandidates.length === 1 && mirrored.memoryCandidates[0]?.source === "VOICE_TRANSCRIPT",
    "final transcript produces voice transcript memory candidate",
  );
}

async function runApiChecks() {
  const unauth = await postJson("/api/ai/interview/realtime-session", { dryRun: true });
  check(unauth.status === 401, "realtime session route unauth returns 401", `status=${unauth.status}`);

  const memberSession = await postJson(
    "/api/ai/interview/realtime-session",
    {
      dryRun: true,
      sessionId: "qa-realtime-session",
      clientId: demoClientId,
    },
    demoEmail,
  );

  if (memberSession.status === 200) {
    check(memberSession.body?.mode === "dry-run", "member realtime session dry-run returns 200");
    check(
      !JSON.stringify(memberSession.body).includes(process.env.OPENAI_API_KEY ?? "never-match-openai-key"),
      "member session response does not leak server API key",
    );
  } else {
    check(
      memberSession.status === 200,
      "member realtime session dry-run returns 200",
      `status=${memberSession.status}; ensure dev server has ALLOW_DEV_AUTH_HEADER=true and demo seed`,
    );
  }

  const quotaExceeded = await postJson(
    "/api/ai/interview/realtime-session",
    {
      dryRun: true,
      sessionId: "qa-quota-session",
      clientId: demoClientId,
    },
    demoEmail,
    { "x-asai-qa-force-quota-exceeded": "true" },
  );
  check(
    quotaExceeded.status === 429 && !JSON.stringify(quotaExceeded.body).includes("ek_"),
    "quota exceeded returns 429 and does not mint realtime token",
    `status=${quotaExceeded.status}`,
  );

  const eventMirror = await postJson(
    "/api/ai/interview/realtime-events",
    {
      type: "FINAL_TRANSCRIPT",
      sessionId: "qa-realtime-session",
      clientId: demoClientId,
      text: "我確認客戶希望先看醫療保障缺口。",
    },
    demoEmail,
  );

  if (eventMirror.status === 200) {
    check(eventMirror.body?.rawAudioStored === false, "event mirror returns rawAudioStored=false");
    check(
      Array.isArray(eventMirror.body?.memoryCandidates) &&
        eventMirror.body.memoryCandidates.length >= 1,
      "event mirror returns memory candidate",
    );
  } else {
    check(
      eventMirror.status === 200,
      "event mirror returns 200",
      `status=${eventMirror.status}; ensure dev server has ALLOW_DEV_AUTH_HEADER=true and demo seed`,
    );
  }

  const rejected = await postJson(
    "/api/ai/interview/realtime-events",
    {
      type: "FINAL_TRANSCRIPT",
      sessionId: "qa-realtime-session",
      audioBase64: "AAAA",
      text: "這個 payload 應被拒收。",
    },
    demoEmail,
  );
  check(rejected.status === 400, "event mirror rejects raw audio payload", `status=${rejected.status}`);
}

async function postJson(
  path: string,
  body: unknown,
  userEmail?: string,
  extraHeaders: Record<string, string> = {},
) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userEmail ? { "x-asai-demo-user-email": userEmail } : {}),
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let parsedBody: unknown;

    try {
      parsedBody = JSON.parse(text);
    } catch {
      parsedBody = undefined;
    }

    return {
      status: response.status,
      body: parsedBody as Record<string, unknown> | undefined,
      text,
    };
  } catch (error) {
    check("warn", "API route proof skipped", error instanceof Error ? error.message : String(error));
    return {
      status: 0,
      body: undefined,
      text: "",
    };
  }
}

function check(condition: boolean | "warn", label: string, detail = "") {
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
