#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "theater-route-b-orchestration-dry-run");

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
      "scripts/theater-route-b-orchestration-dry-run.ts",
      "src/domains/theater/route-b-orchestration.ts",
      "src/domains/theater/route-b-handoff.ts",
      "src/domains/interview/types.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "theater-route-b-orchestration-dry-run.js")], {
    cwd: root,
    stdio: "inherit",
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
