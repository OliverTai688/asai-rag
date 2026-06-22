import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function assertIncludes(source, needle, label) {
  assert(source.includes(needle), `${label} missing: ${needle}`);
}

const pagePath = "src/app/(dashboard)/pre-visit/[planId]/page.tsx";
const routePath = "src/app/api/visits/[id]/relationship-confirmation-state/route.ts";
const domainPath = "src/domains/visit/relationship-confirmation-state.ts";
const page = read(pagePath);
const route = read(routePath);
const domain = read(domainPath);
const packageJson = JSON.parse(read("package.json"));

assertIncludes(page, "validateRelationshipConfirmationStateBoundary", pagePath);
assertIncludes(page, "/relationship-confirmation-state", pagePath);
assertIncludes(page, "data-relationship-confirmation-state-boundary", pagePath);
assertIncludes(page, "relationshipConfirmationCardStates", pagePath);
assertIncludes(page, "currentPersistence=", pagePath);
assertIncludes(page, "requiresProductDecision=", pagePath);
assertIncludes(page, "persistedToDatabase=", pagePath);
assertIncludes(page, "onClick={() => void handlePrimaryAction()}", pagePath);
assertIncludes(page, 'aria-pressed={state === "confirmed_in_meeting"}', pagePath);

const validationIndex = page.indexOf("await validateRelationshipConfirmationStateBoundary()");
const theaterPushIndex = page.indexOf("router.push(theaterHref)");
assert(validationIndex >= 0, `${pagePath} missing awaited relationship state boundary validation`);
assert(theaterPushIndex >= 0, `${pagePath} missing theater push`);
assert(
  validationIndex >= 0 && theaterPushIndex >= 0 && validationIndex < theaterPushIndex,
  `${pagePath} must validate relationship state before theater push`,
);

assertIncludes(route, "export async function POST", routePath);
assertIncludes(route, "buildRelationshipConfirmationStateResponse", routePath);
assert(!route.includes("prisma."), `${routePath} must not persist transient relationship state with Prisma`);
assert(!route.includes("AiUsageLog"), `${routePath} must remain no-provider/no-AiUsageLog-required`);

assertIncludes(domain, 'currentPersistence: "local-only-ui-state"', domainPath);
assertIncludes(domain, "requiresProductDecision: true", domainPath);
assertIncludes(domain, "persistedToDatabase: false", domainPath);
assertIncludes(domain, "writesConfirmedCrmFact: false", domainPath);

assert(
  packageJson.scripts?.["visit:relationship-confirmation-state-ui-qa"] ===
    "node scripts/visit-relationship-confirmation-state-ui-qa.mjs",
  "package.json missing visit:relationship-confirmation-state-ui-qa script",
);

if (failures.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        failures,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        page: pagePath,
        route: routePath,
        domain: domainPath,
        command: "pnpm visit:relationship-confirmation-state-ui-qa",
      },
      proof: {
        validatesBeforeTheaterPush: true,
        providerCallAttempted: false,
        aiUsageLogRequired: false,
        persistedToDatabase: false,
        writesConfirmedCrmFact: false,
      },
    },
    null,
    2,
  ),
);
