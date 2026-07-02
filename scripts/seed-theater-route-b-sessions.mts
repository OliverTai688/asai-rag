/**
 * Pre-build a directly-enterable Route B theater session for every demo-member
 * client, using the real production build → handoff → persist path.
 *
 * Idempotent: each client gets a stable session id `demo_theater_rb_<slug>` and
 * is tagged with the demo scenario, so `pnpm demo:seed:reset` cleans it up and a
 * re-run replaces (never duplicates) the session.
 *
 * Run AFTER `pnpm demo:seed:reset` (needs the demo clients to exist). No dev
 * server or provider calls required — this only reads/writes the DB.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env into process.env BEFORE importing anything that reads DATABASE_URL.
loadDotEnv();

const scenario = "quickstart-insurance-advisor";
const version = 1;
const MEMBER_USER_ID = "demo_user_member";

const { prisma } = await import("@/lib/prisma");
const { toClientDto } = await import("@/lib/clients/client-dto");
const { buildClientTheaterBuild } = await import("@/domains/theater/client-build");
const { buildTheaterRouteBHandoff } = await import("@/domains/theater/route-b-handoff");
const { persistRouteBHandoffDraft } = await import("@/lib/theater/route-b-session-repository");

const clientInclude = {
  complianceChecklist: true,
  familyMembers: { orderBy: { createdAt: "asc" } },
  policies: { orderBy: { createdAt: "asc" } },
} as const;

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      ownerId: MEMBER_USER_ID,
      demoScenario: scenario,
      status: { not: "ARCHIVED" },
    },
    include: clientInclude,
    orderBy: { createdAt: "asc" },
  });

  if (clients.length === 0) {
    throw new Error("No demo-member clients found. Run `pnpm demo:seed:reset` first.");
  }

  console.log(`Found ${clients.length} demo-member clients. Building Route B theater sessions...\n`);

  const results: Array<{ name: string; sessionId: string; readiness: string; characters: number }> = [];

  for (const record of clients) {
    const client = toClientDto(record as never);
    const slug = client.id.replace(/^demo_client_/, "");
    const sessionId = `demo_theater_rb_${slug}`;

    const build = buildClientTheaterBuild({
      organizationId: record.organizationId,
      memberId: record.ownerId ?? MEMBER_USER_ID,
      unitId: record.unitId,
      client,
    });

    const handoff = buildTheaterRouteBHandoff(build.packet, { routeBEnabled: true });

    // Minimal session scope: the repository only reads organization.id, user.id
    // and membership.primaryUnitId.
    const session = {
      organization: { id: record.organizationId },
      user: { id: record.ownerId ?? MEMBER_USER_ID },
      membership: { primaryUnitId: record.unitId },
    } as never;

    await prisma.$transaction(async (tx) => {
      // Cascade removes prior characters/turns for this stable id.
      await tx.theaterSession.deleteMany({ where: { id: sessionId } });

      const persisted = await persistRouteBHandoffDraft(tx as never, session, handoff, {
        clientId: client.id,
        isDemo: true,
        sessionId,
      });

      await tx.theaterSession.update({
        where: { id: sessionId },
        data: {
          status: "ACTIVE",
          demoScenario: scenario,
          demoSeedKey: `${scenario}:theater-rb:${slug}:v${version}`,
          demoSeedVersion: version,
        },
      });

      results.push({
        name: client.name,
        sessionId,
        readiness: build.packet.readiness,
        characters: persisted.characterCount,
      });
    });

    console.log(
      `  ✓ ${client.name.padEnd(6)} → /theater/${sessionId}  (${build.packet.readiness}, ${handoff.scene.characters.length} 角色)`,
    );
  }

  console.log(`\nSeeded ${results.length} Route B theater sessions for scenario "${scenario}" v${version}.`);
  const notReady = results.filter((item) => item.readiness !== "READY");
  if (notReady.length > 0) {
    console.log(`Note: ${notReady.map((item) => item.name).join("、")} 建場 readiness 非 READY，但仍已建立可進入的場域。`);
  }
}

function loadDotEnv() {
  try {
    const contents = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      if (process.env[key] !== undefined) continue;
      process.env[key] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env optional if env already provided.
  }
}

await main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
