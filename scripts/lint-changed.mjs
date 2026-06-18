#!/usr/bin/env node
/**
 * Diff-scoped lint gate for the ElevenLabs redesign batch tasks.
 *
 * The repo carries a pre-existing red ESLint baseline (strict React 19
 * `react-hooks/set-state-in-effect` + `no-explicit-any` errors, mostly in
 * protected SPIN/theater/AI business logic that must NOT be rewritten during a
 * UI redesign — see CLAUDE.md). A full `pnpm lint` therefore cannot be the gate.
 *
 * This script lints ONLY the files changed on the current branch versus a base
 * ref, so a redesign card's DoD becomes "introduce no new lint problems in the
 * files you touched" — the standard approach for a legacy baseline.
 *
 * Usage:
 *   pnpm lint:changed                 # diff vs origin/main (fallback: main, then HEAD)
 *   BASE=HEAD pnpm lint:changed       # diff vs working tree changes only
 *   pnpm lint:changed -- --max-warnings=0   # extra flags passed straight to eslint
 */
import { execSync, spawnSync } from "node:child_process";

const LINT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function resolveBase() {
  if (process.env.BASE) return process.env.BASE;
  for (const ref of ["origin/main", "main"]) {
    if (sh(`git rev-parse --verify --quiet ${ref}`)) return ref;
  }
  return "HEAD";
}

const base = resolveBase();
const range = base === "HEAD" ? "HEAD" : `${base}...HEAD`;

// Files this branch/working tree actually changed:
//   • committed in the range vs base
//   • staged (git add)
//   • unstaged but tracked
// Untracked files are intentionally excluded by default — this repo already
// carries many pre-existing untracked dirs (subscription/, admin/, …) that are
// not part of any given card. Stage a genuinely new file (git add) to lint it,
// or pass it explicitly: `pnpm lint:changed -- path/to/new-file.tsx`.
const committed = base === "HEAD" ? "" : sh(`git diff --name-only --diff-filter=ACMR ${range}`);
const staged = sh(`git diff --name-only --cached --diff-filter=ACMR`);
const unstaged = sh(`git diff --name-only --diff-filter=ACMR`);
const explicit = process.argv.slice(2).filter((a) => !a.startsWith("-"));

const files = [...new Set([committed, staged, unstaged, explicit.join("\n")].join("\n").split("\n"))]
  .map((f) => f.trim())
  .filter((f) => f && LINT_EXT.test(f));

if (files.length === 0) {
  console.log(`lint:changed — no changed lintable files vs ${base}. ✅`);
  process.exit(0);
}

console.log(`lint:changed — linting ${files.length} changed file(s) vs ${base}:`);
for (const f of files) console.log(`  • ${f}`);

const flags = process.argv.slice(2).filter((a) => a.startsWith("-"));
const result = spawnSync("eslint", [...files, ...flags], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
