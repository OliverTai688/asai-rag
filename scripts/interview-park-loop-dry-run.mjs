#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "interview-park-loop-dry-run");

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
      "scripts/interview-park-loop-dry-run.ts",
      "src/domains/interview/memory.ts",
      "src/domains/interview/park-loop.ts",
      "src/domains/interview/outlines/advisor-companion.ts",
      "src/domains/interview/outlines/index.ts",
      "src/domains/interview/types.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "interview-park-loop-dry-run.js")], { cwd: root, stdio: "inherit" });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
