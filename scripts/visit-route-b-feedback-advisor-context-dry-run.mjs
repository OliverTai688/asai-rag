#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "visit-route-b-feedback-advisor-context-dry-run");

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
      "scripts/visit-route-b-feedback-advisor-context-dry-run.ts",
      "src/domains/client/types.ts",
      "src/domains/visit/reasoning.ts",
      "src/domains/visit/route-b-feedback-advisor-context.ts",
      "src/domains/visit/types.ts",
      "src/domains/theater/route-b-feedback-review.ts",
      "src/domains/theater/route-b-feedback.ts",
      "src/domains/theater/route-b-session.ts",
      "src/domains/theater/route-b-red-line-action-workflow.ts",
      "src/domains/theater/route-b-severe-red-line-preview.ts",
      "src/domains/theater/route-b-provider-prompt-context.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "visit-route-b-feedback-advisor-context-dry-run.js")], {
    cwd: root,
    stdio: "inherit",
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
