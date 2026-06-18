#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["src/app", "src/components", "src/domains"];
const ALLOWED_IMPORTERS = new Set(["src/domains/demo/seed-fixtures.ts"]);
const ALLOWED_LOCAL_STORAGE_FILES = new Set([
  "src/app/(dashboard)/settings/page.tsx",
  "src/components/demo/dashboard-welcome-card.tsx",
  "src/domains/assistant/store.ts",
  "src/domains/calendar/store.ts",
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const MOCK_IMPORT_PATTERN = /from\s+["'][^"']*\/mocks["']|from\s+["']@\/domains\/[^"']+\/mocks["']/g;
const LOCAL_STORAGE_PATTERN = /\blocalStorage\b|\bsessionStorage\b|createJSONStorage\s*\(/g;

function extensionOf(filePath) {
  const dot = filePath.lastIndexOf(".");
  return dot === -1 ? "" : filePath.slice(dot);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === "generated") continue;
      walk(fullPath, files);
      continue;
    }
    if (SOURCE_EXTENSIONS.has(extensionOf(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

const violations = [];
const storageViolations = [];

for (const root of SCAN_ROOTS) {
  const absRoot = join(ROOT, root);
  for (const file of walk(absRoot)) {
    const rel = relative(ROOT, file);
    if (ALLOWED_IMPORTERS.has(rel)) continue;
    const source = readFileSync(file, "utf8");
    if (MOCK_IMPORT_PATTERN.test(source)) {
      violations.push(rel);
    }
    MOCK_IMPORT_PATTERN.lastIndex = 0;

    if (!ALLOWED_LOCAL_STORAGE_FILES.has(rel) && LOCAL_STORAGE_PATTERN.test(source)) {
      storageViolations.push(rel);
    }
    LOCAL_STORAGE_PATTERN.lastIndex = 0;
  }
}

if (violations.length > 0 || storageViolations.length > 0) {
  if (violations.length > 0) {
  console.error("demo:runtime-audit — runtime files import domain mocks directly:");
  for (const violation of violations) console.error(`  • ${violation}`);
  console.error("\nImport demo seed material through src/domains/demo/seed-fixtures.ts, or move the runtime path to DB/API.");
  }

  if (storageViolations.length > 0) {
    console.error("demo:runtime-audit — runtime files use browser storage outside the UI-state allowlist:");
    for (const violation of storageViolations) console.error(`  • ${violation}`);
    console.error("\nPersist only UI state in browser storage; business/demo records should come from DB/API or seed fixtures.");
  }

  process.exit(1);
}

console.log("demo:runtime-audit — no direct domain mock imports or disallowed browser-storage persistence. ✅");
