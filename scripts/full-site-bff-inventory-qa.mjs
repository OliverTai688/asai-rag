#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const auditPath = "docs/06_audits-and-reports/AUD-006_full-site-bff-data-source-inventory-v1.0.md";
const auditAbsolutePath = path.join(rootDir, auditPath);

const sourceRoots = ["src/app", "src/components", "src/domains"];
const allowedExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

const requiredAuditTokens = [
  "Responsibility Matrix",
  "Mock / Local Truth Baseline",
  "Next BFF Queue",
  "src/app/(dashboard)/issues/page.tsx",
  "src/app/(dashboard)/team/team-page-client.tsx",
  "src/app/(admin)/admin/page.tsx",
  "src/app/(dashboard)/pilot/page.tsx",
  "src/app/(dashboard)/spin/[sessionId]/page.tsx",
  "src/domains/client/store.ts",
  "src/domains/event/store.ts",
  "src/domains/report/store.ts",
  "src/domains/visit/store.ts",
  "src/domains/spin/store.ts",
  "src/domains/calendar/store.ts",
  "src/domains/assistant/store.ts",
  "src/components/demo/dashboard-welcome-card.tsx",
  "src/app/api/notifications/visit-reminder/route.ts",
  "/api/reports",
  "/api/issues",
  "/api/visits",
  "/api/clients",
  "/api/theater/route-b/sessions",
  "/api/share/[token]",
];

const riskPatterns = [
  {
    name: "demo seed fixture import",
    regex: /@\/domains\/demo\/seed-fixtures/g,
  },
  {
    name: "domain mocks import",
    regex: /@\/domains\/[^"']+\/mocks/g,
  },
  {
    name: "MOCK constant",
    regex: /\bMOCK_[A-Z0-9_]*\b/g,
  },
  {
    name: "mock API usage",
    regex: /\/api\/mock\//g,
  },
  {
    name: "browser storage or persisted Zustand",
    regex: /\bwindow\.localStorage\b|\blocalStorage\b|\bsessionStorage\b|\bcreateJSONStorage\b|\bpersist\s*\(/g,
  },
];

const skippedPathFragments = [
  "src/app/api/mock/",
  "src/domains/demo/seed-fixtures.ts",
  "src/domains/ai-mock/",
];

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function shouldSkip(relativePath) {
  return skippedPathFragments.some((fragment) => relativePath.includes(fragment));
}

function listSourceFiles(directory) {
  const absoluteDirectory = path.join(rootDir, directory);
  if (!existsSync(absoluteDirectory)) {
    return [];
  }

  const entries = readdirSync(absoluteDirectory);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDirectory, entry);
    const relativePath = toPosix(path.relative(rootDir, absolutePath));
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...listSourceFiles(relativePath));
      continue;
    }

    if (!allowedExtensions.has(path.extname(entry))) {
      continue;
    }

    if (shouldSkip(relativePath)) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

function findRiskyFiles() {
  const riskyFiles = new Map();
  const files = sourceRoots.flatMap(listSourceFiles);

  for (const relativePath of files) {
    const source = readFileSync(path.join(rootDir, relativePath), "utf8");

    for (const pattern of riskPatterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(source)) {
        const reasons = riskyFiles.get(relativePath) ?? new Set();
        reasons.add(pattern.name);
        riskyFiles.set(relativePath, reasons);
      }
    }
  }

  return [...riskyFiles.entries()].map(([relativePath, reasons]) => ({
    relativePath,
    reasons: [...reasons].sort(),
  }));
}

function main() {
  if (!existsSync(auditAbsolutePath)) {
    console.error(`FAIL ${auditPath} is missing.`);
    process.exit(1);
  }

  const audit = readFileSync(auditAbsolutePath, "utf8");
  const failures = [];

  for (const token of requiredAuditTokens) {
    if (!audit.includes(token)) {
      failures.push(`audit missing required token: ${token}`);
    }
  }

  const riskyFiles = findRiskyFiles();
  for (const finding of riskyFiles) {
    if (!audit.includes(finding.relativePath)) {
      failures.push(
        `undocumented risk path: ${finding.relativePath} (${finding.reasons.join(", ")})`,
      );
    }
  }

  if (!audit.includes("No OpenAI/Anthropic provider calls were made")) {
    failures.push("audit must include explicit no-provider proof");
  }

  if (failures.length > 0) {
    console.error("FAIL full-site BFF inventory QA");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("PASS full-site BFF inventory QA");
  console.log(`- documented risky source paths: ${riskyFiles.length}`);
  for (const finding of riskyFiles) {
    console.log(`  - ${finding.relativePath}: ${finding.reasons.join(", ")}`);
  }
}

main();
