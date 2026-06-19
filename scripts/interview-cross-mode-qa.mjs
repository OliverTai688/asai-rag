#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const checks = [];

const commandChecks = [
  {
    label: "advisor text multi-turn proof keeps memory evidence and avoids re-asking confirmed facts",
    command: ["pnpm", "interview:park-loop-dry-run"],
  },
  {
    label: "theater field build proof separates confirmed/inference/unknown and caps NPC count",
    command: ["pnpm", "interview:theater-build-dry-run"],
  },
  {
    label: "voice memory/correction proof keeps uncertain transcript as unknown until corrected",
    command: ["pnpm", "interview:memory-dry-run"],
  },
  {
    label: "Realtime BFF proof covers ephemeral-token guard and event mirror no-raw-audio boundary",
    command: ["pnpm", "interview:realtime-bff-qa"],
  },
  {
    label: "persistence proof restores session/memory through stateless DB read",
    command: ["pnpm", "interview:persistence-qa"],
  },
  {
    label: "reflection/planning proof preserves supporting memory IDs and privacy guard",
    command: ["pnpm", "interview:reflection-planning-qa"],
  },
  {
    label: "confirmation writeback proof blocks inference-to-CRM fact leakage",
    command: ["pnpm", "interview:writeback-qa"],
  },
  {
    label: "voice/writeback browser proof covers desktop/mobile shell and confirmation UI",
    command: ["pnpm", "interview:writeback-browser-qa"],
  },
  {
    label: "org manager aggregate proof omits client/private payload sentinels",
    command: ["pnpm", "demo:org-coaching-ai-usage-qa"],
  },
];

for (const check of commandChecks) {
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  push(result.status === 0, check.label, summarize(output));

  if (output) {
    console.log(`\n--- ${check.label} ---`);
    console.log(output);
  }
}

sourceProofs();
printChecks();

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function sourceProofs() {
  const interviewPage = read("src/app/(dashboard)/interview/page.tsx");
  push(
    allPresent(interviewPage, [
      "預設不保存 raw audio",
      "麥克風被拒或瀏覽器不支援時",
      "加入 correction memory placeholder",
      "aria-label=\"即時語音轉寫草稿\"",
      "aria-label=\"轉寫修正內容\"",
    ]),
    "source proof: voice shell exposes mic consent, fallback, and correction UI copy",
  );

  const orgCoaching = read("src/app/api/org/coaching/route.ts");
  const orgAiUsage = read("src/app/api/org/ai-usage/route.ts");
  const orgAggregateSource = `${orgCoaching}\n${orgAiUsage}`;
  const forbiddenOrgAggregateTokens = [
    "interviewSession",
    "interviewTurn",
    "interviewMemory",
    "interviewReflection",
    "InterviewSession",
    "InterviewTurn",
    "InterviewMemory",
    "InterviewReflection",
    "transcript",
    "memoryText",
  ];
  const leakedTokens = forbiddenOrgAggregateTokens.filter((token) => orgAggregateSource.includes(token));
  push(
    leakedTokens.length === 0,
    "source proof: org aggregate routes do not query interview transcript/memory/private payload models",
    leakedTokens.join(", "),
  );

  const packageJson = JSON.parse(read("package.json"));
  push(
    packageJson.scripts?.["interview:cross-mode-qa"] === "node scripts/interview-cross-mode-qa.mjs",
    "source proof: package script exposes cross-mode QA entrypoint",
  );
}

function read(path) {
  if (!existsSync(path)) {
    push(false, `source file missing: ${path}`);
    return "";
  }

  return readFileSync(path, "utf8");
}

function allPresent(content, needles) {
  return needles.every((needle) => content.includes(needle));
}

function summarize(output) {
  if (!output) return "";
  const lines = output.split(/\r?\n/).filter(Boolean);
  return lines.slice(-3).join(" | ");
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}

function printChecks() {
  console.log("\n=== interview:cross-mode-qa summary ===");
  for (const item of checks) {
    const prefix = item.status === "pass" ? "PASS" : "FAIL";
    console.log(`${prefix} ${item.label}${item.detail ? ` - ${item.detail}` : ""}`);
  }
}
