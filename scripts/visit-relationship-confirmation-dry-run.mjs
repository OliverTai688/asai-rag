#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "visit-relationship-confirmation-dry-run");

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
      "scripts/visit-relationship-confirmation-dry-run.ts",
      "src/domains/visit/relationship-confirmation.ts",
      "src/domains/visit/types.ts",
      "src/domains/client/relationship-graph.ts",
      "src/domains/client/types.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "visit-relationship-confirmation-dry-run.js")], {
    cwd: root,
    stdio: "inherit",
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
