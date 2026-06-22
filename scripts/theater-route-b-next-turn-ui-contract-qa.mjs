#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pagePath = resolve("src/app/(dashboard)/theater/[sessionId]/page.tsx");
const source = readFileSync(pagePath, "utf8");
const checks = [];

function check(condition, label) {
  assert.equal(condition, true, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

check(
  source.includes('import type { TheaterRouteBNextTurnDraft } from "@/domains/theater/route-b-next-turn"'),
  "Route B next-turn draft type is imported as type-only client boundary",
);
check(
  source.includes("/api/theater/route-b/sessions/${encodeURIComponent(snapshot.session.id)}/next-turn"),
  "session page fetches owner-scoped next-turn endpoint",
);
check(source.includes("cache: \"no-store\""), "next-turn preview fetch is no-store");
check(source.includes("RouteBNextTurnPreviewPanel"), "next-turn preview panel is rendered in Route B stage");
check(source.includes("onAdvisorTurnCommitted={fetchNextTurnDraft}"), "advisor turn write triggers next-turn preview refresh");
check(source.includes("generatedTextAllowed={String(draft.nextTurn.generatedTextAllowed)}"), "UI exposes generatedTextAllowed guard");
check(source.includes("draft.providerBoundary.providerCallAttempted"), "UI exposes providerCallAttempted boundary");
check(source.includes("draft.providerBoundary.aiUsageLogWritten"), "UI exposes aiUsageLogWritten boundary");
check(source.includes("draft.providerBoundary.storesRawProviderPayload"), "UI exposes raw provider payload boundary");
check(source.includes("draft.privacyProof.directPrivateDialogReturned"), "UI exposes private dialog boundary");
check(source.includes("draft.persistenceEnvelope.writesConfirmedCrmFact"), "UI exposes writesConfirmedCrmFact boundary");
check(source.includes("nextTurnGuardLines"), "UI renders named-addressee and consecutive-speaker guard evidence");
check(source.includes("等待 provider candidate"), "UI shows provider candidate wait state");
check(
  source.includes("/append-candidate") &&
    source.includes("confirmedByAdvisor: true") &&
    source.includes("appendCandidate") &&
    source.includes("appendUsageLogId") &&
    source.includes("canConfirmAppend"),
  "future character text append requires provider candidate, usageLogId, and advisor confirmation",
);
check(!source.includes("providerPayload"), "session UI source does not introduce raw provider payload rendering");

console.log(
  JSON.stringify(
    {
      checkedFile: pagePath,
      checkedCount: checks.length,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      generatedTextAllowed: false,
      directPrivateDialogReturned: false,
      writesConfirmedCrmFact: false,
    },
    null,
    2,
  ),
);
