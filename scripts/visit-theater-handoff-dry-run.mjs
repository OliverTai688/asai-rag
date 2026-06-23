#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "visit-theater-handoff-dry-run");

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
      "scripts/visit-theater-handoff-dry-run.ts",
      "src/domains/theater/visit-handoff.ts",
      "src/domains/interview/theater-build.ts",
      "src/domains/interview/memory.ts",
      "src/domains/interview/outlines/index.ts",
      "src/domains/interview/outlines/theater-field-build.ts",
      "src/domains/interview/types.ts",
      "src/domains/visit/reasoning.ts",
      "src/domains/visit/meeting-relationship-signal.ts",
      "src/domains/visit/types.ts",
      "src/domains/client/relationship-edge-shadow.ts",
      "src/domains/client/relationship-graph.ts",
      "src/domains/client/types.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "visit-theater-handoff-dry-run.js")], {
    cwd: root,
    stdio: "inherit",
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
