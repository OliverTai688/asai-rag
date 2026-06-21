# 2026-06-21 Quiet Research Loop - BFF-305 Public Status / CTA Gap

## Scope

- User request: further research the gap and turn it into AGENTS goals plus executable related docs.
- Selected gap: `BFF-305a public status and CTA availability proof`.
- Product source changed: none.
- DB / Prisma changed: none.
- Provider calls: none.
- External NANDA / third-party registry publication: none.

## Research Basis

- Local strategic state after `BFF-304a`: platform session separation, metadata, audit proof, and release-readiness platform gate are already closed by `pnpm bff:platform-qa`.
- Remaining public-facing release gap: landing / pricing / public CTA / beta availability can still drift if each surface infers availability locally instead of using one public-safe BFF contract.
- External protocol sanity check: Project NANDA and current AgentFacts-oriented papers frame agent systems around discovery, verifiable metadata, least-disclosure capability claims, and cross-protocol interoperability. References checked on 2026-06-21: [Project NANDA](https://projectnanda.org/), [Project NANDA GitHub](https://github.com/projnanda/projnanda), [Beyond DNS: Unlocking the Internet of AI Agents via the NANDA Index and Verified AgentFacts](https://arxiv.org/abs/2507.14263), [Using the NANDA Index Architecture in Practice](https://arxiv.org/abs/2508.03101), and [A Survey of AI Agent Registry Solutions](https://arxiv.org/abs/2508.03095).

## Gap Research

- Public status is not yet an explicit release-readiness contract for anonymous visitors.
- Public CTA state can overclaim if landing / pricing copy says "start", "checkout", or "AI available" while payment, provider, or beta access is disabled.
- Public pricing can leak or contradict internal source state if pricing and status do not share the same checkout / CTA availability source.
- Public lead capture becomes unsafe if exposed before rate limit, spam protection, consent version, allowlisted persistence, and abuse/failure proof exist.
- Public endpoints must remain separate from NANDA external discovery. `BFF-305a` is not a public agent registry, public discovery endpoint, signed AgentFacts publication, or cross-org agent access gate.

## Research-To-Executable Mapping

- `AGENTS.md` now contains a concrete `BFF-305a` card under Public BFF completion.
- `docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md` now mirrors the `BFF-305a` execution checklist.
- `docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md` now includes Public Status / CTA Availability Gates.
- `docs/2_agent-input/generated/agent-loop/loop-state.json` now keeps the next implementation slice pointed at `BFF-305a` and records this as normal loop 2/4 after the whole-product review.

## Acceptance Slice

`BFF-305a` should implement and prove:

- `GET /api/public/status` or equivalent anonymous BFF returns `maintenance`, `aiAvailability`, `checkoutAvailability`, `primaryCta`, `leadCapture`, `legalStatus`, and `updatedAt`.
- Status DTO excludes private plan cost, provider raw config, billing internal state, payment transaction data, tenant/client data, secret/token, raw prompt, and raw provider payload.
- `/api/public/pricing` and public status share checkout / CTA availability source.
- Landing / pricing CTA renders private beta, invite, contact sales, checkout disabled, and unavailable states from the BFF contract.
- `/api/public/lead` remains deferred unless rate limit, spam protection, consent version, allowlisted persistence, and abuse/failure proof exist.
- Proof covers status 200, pricing 200, CTA consistency, checkout disabled/sandbox posture, private sentinel 0, and desktop/mobile no overflow.

## NANDA Alignment

- No AI module or manifest changed in this loop.
- NAP remains the AI protocol workstream for AgentFacts-style manifests, internal registry readiness, local-only adapter exports, and external publication gates.
- This loop reinforces the same least-disclosure posture on public BFF surfaces: public endpoints expose only visitor-safe status and CTA facts, not raw prompts, private transcripts, provider payloads, secrets, payment data, or agent registry claims.
- External NANDA / registry publication, credential signing, public discovery endpoints, and cross-org agent access still require explicit operator approval.

## Validation

- `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8'))"`: pass.
- `git diff --check -- AGENTS.md docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md docs/2_agent-input/generated/agent-loop/loop-state.json docs/2_agent-input/generated/agent-loop/reports/2026-06-21_quiet-bff-305-public-status-cta-gap.md`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.

## DB / Prisma

- No DB write.
- No Prisma schema change.
- No Prisma generate / db push.

## Git

- Stage only this loop's related files.
- Push skipped by user instruction: `先不用 git push`.

## Blockers

- None for this documentation loop.
- Implementation of `BFF-305a` may later require an operator decision if public lead capture or production checkout/email/notification is requested.

## Next Recommended Loop

Implement `BFF-305a public status and CTA availability proof`: add the public-safe status BFF, connect pricing/landing/pricing CTA to the shared availability source, defer unsafe lead capture, and run the targeted API/browser proof plus `pnpm exec tsc --noEmit --pretty false` and `pnpm lint:changed`.
