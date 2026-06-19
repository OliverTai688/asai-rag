#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

loadEnvFile(".env");

const root = process.cwd();
const outDir = join(root, ".tmp", "interview-realtime-bff-qa");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

try {
  execFileSync(
    "pnpm",
    [
      "exec",
      "tsc",
      "--target",
      "ES2022",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "--esModuleInterop",
      "--skipLibCheck",
      "--strict",
      "--outDir",
      outDir,
      "scripts/interview-realtime-bff-qa.ts",
      "src/domains/interview/memory.ts",
      "src/domains/interview/types.ts",
      "src/lib/interview/realtime-bff.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "interview-realtime-bff-qa.js")], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
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
