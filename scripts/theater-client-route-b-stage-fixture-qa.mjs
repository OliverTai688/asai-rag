#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "theater-client-route-b-stage-fixture-qa");

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
      "scripts/theater-client-route-b-stage-fixture-qa.ts",
      "src/domains/client/family-member-profile.ts",
      "src/domains/client/types.ts",
      "src/domains/interview/memory.ts",
      "src/domains/interview/theater-build.ts",
      "src/domains/interview/outlines/advisor-companion.ts",
      "src/domains/interview/outlines/theater-field-build.ts",
      "src/domains/interview/outlines/index.ts",
      "src/domains/interview/types.ts",
      "src/domains/theater/client-build.ts",
      "src/domains/theater/client-route-b-handoff.ts",
      "src/domains/theater/client-route-b-next-turn-context.ts",
      "src/domains/theater/client-route-b-session-source-consumption.ts",
      "src/domains/theater/client-route-b-session-source-review.ts",
      "src/domains/theater/client-route-b-stage-source-fixture.ts",
      "src/domains/theater/route-b-handoff.ts",
      "src/domains/theater/route-b-next-turn.ts",
      "src/domains/theater/route-b-orchestration.ts",
      "src/domains/theater/route-b-objection-red-line-library.ts",
      "src/domains/theater/route-b-provider-prompt-context.ts",
      "src/domains/theater/route-b-session.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "theater-client-route-b-stage-fixture-qa.js")], {
    cwd: root,
    stdio: "inherit",
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
