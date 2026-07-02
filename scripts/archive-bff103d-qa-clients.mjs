// Archive leftover BFF-103d / related-list QA test clients so they stop showing
// on the member dashboard (dashboard queries already exclude ARCHIVED clients,
// which cascades their visit plans and reports out of every panel).
//
// Usage:
//   node --env-file=.env scripts/archive-bff103d-qa-clients.mjs           # dry run
//   node --env-file=.env scripts/archive-bff103d-qa-clients.mjs --apply   # archive
//
// Reversible: re-run with a SET status = 'ACTIVE' if you ever need them back.
// Only touches clients matching the QA fingerprint; never deletes rows.

import { Client as PgClient } from "pg";

const apply = process.argv.includes("--apply");
const dbUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DIRECT_URL ??
  process.env.POSTGRES_URL_NON_POOLING;

if (!dbUrl) {
  console.error("Missing DATABASE_URL / DIRECT_URL. Run with: node --env-file=.env scripts/archive-bff103d-qa-clients.mjs");
  process.exit(1);
}

// QA fingerprint: BFF-103d related-list clients are named `BFF-103d related-list <runId> 客戶`
// and/or tagged is_demo + demo_scenario by the QA script's markDemoRecords().
const MATCH = `
  (name LIKE 'BFF-103d related-list%')
  OR (is_demo = true AND demo_scenario = 'lv3-bff-crm-related-lists-qa')
`;

const db = new PgClient({ connectionString: dbUrl });

async function main() {
  await db.connect();

  const preview = await db.query(
    `SELECT c.id, c.name, c.status, c.is_demo, c.demo_scenario, c.owner_id,
            (SELECT count(*)::int FROM visit_plans v WHERE v.client_id = c.id) AS visit_plans,
            (SELECT count(*)::int FROM reports r WHERE r.client_id = c.id)     AS reports
       FROM clients c
      WHERE ${MATCH}
      ORDER BY c.created_at DESC`,
  );

  if (preview.rows.length === 0) {
    console.log("No BFF-103d / related-list QA test clients found. Nothing to archive.");
    return;
  }

  const alreadyArchived = preview.rows.filter((r) => r.status === "ARCHIVED").length;
  console.log(`Matched ${preview.rows.length} QA client(s) (${alreadyArchived} already ARCHIVED):\n`);
  for (const r of preview.rows) {
    console.log(
      `  ${r.status.padEnd(9)} ${r.name}  [id=${r.id}] visits=${r.visit_plans} reports=${r.reports} is_demo=${r.is_demo}`,
    );
  }

  if (!apply) {
    console.log(`\nDry run only. Re-run with --apply to archive the ${preview.rows.length - alreadyArchived} non-archived client(s).`);
    return;
  }

  const result = await db.query(
    `UPDATE clients
        SET status = 'ARCHIVED', updated_at = now()
      WHERE (${MATCH}) AND status <> 'ARCHIVED'`,
  );
  console.log(`\nArchived ${result.rowCount} client(s). They are now excluded from every member-dashboard panel.`);
}

main()
  .catch((error) => {
    console.error("Archive failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end().catch(() => {}));
