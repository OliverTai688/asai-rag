# 2026-06-21 LV3 BFF-305a Public Status / CTA / Lead Capture Proof

## Scope
- Type: normal LV3 implementation/proof loop, loop 3/4 after the scheduled whole-product review.
- Selected slice: `BFF-305a public status, CTA, and lead capture availability proof`.
- Goal: make public website, pricing, CTA, checkout posture, lead capture posture, and legal/privacy status derive from a public-safe server contract.
- Not included: real payment, production checkout, real email, real notification, provider call, external NANDA/third-party registry publication, public discovery endpoint, or cross-org agent access.

## Candidate Score
1. `BFF-305a public status and CTA availability proof` - 93/100: follows loop-state recommendation, closes public-facing release gate, connects API + landing + pricing surfaces, and is source-backed with browser/API proof.
2. `BFF-401a checkout disabled/sandbox server-payload proof` - 85/100: high payment-risk boundary, but should follow public status so checkout posture has a public truth source.
3. `BFF-102 member settings hardening` - 76/100: useful member BFF cleanup, but lower leverage than public/billing release gates.

## Last-two Classification / Anti-repetition
- Previous completed loop: direct user-request prompt/preference update, documentation/config guardrail.
- Loop before that: `BFF-304a`, L2 source/proof.
- This loop is L2 implementation/proof and resolves the docs-only risk by implementing the BFF-305a source slice rather than producing another proof plan.

## Changes
- Added `PublicStatusDto` / `PublicPricingDto` shared types.
- Added public-safe `GET /api/public/status` with cache-aware anonymous JSON response.
- Added read-only `getPublicStatus()` repository that reads `system_settings` with fallback defaults, without public upsert/write side effects.
- Updated `/api/public/pricing` to share checkout / CTA / lead / legal availability from public status.
- Updated landing page CTA to render the BFF primary CTA and checkout status data attributes.
- Converted `/pricing` to a server page that fetches public pricing/status, with a client shell for interaction.
- Updated pricing cards to render checkout posture, lead capture state, and data-bound CTA modes; disabled checkout no longer opens the payment modal.
- Added `public_leads` additive schema and `POST /api/public/lead`.
- Added public lead capture form on `/pricing#private-beta-lead`.
- Lead capture includes consent version, honeypot spam protection, email/IP rate limit, hashed proof keys, allowlisted DB persistence, and public-safe receipt response.
- Updated release-readiness public BFF gate to `pnpm public:status-qa`.
- Added `pnpm public:status-qa` with API, DB consistency, private sentinel, and browser proof.
- Marked BFF-305/BFF-305a complete in `AGENTS.md` and `PLN-019`; added ACC evidence.
- Recorded operator decisions in `issue-question.md`, `loop-state.json`, and `manual-setting.md`.

## API / Browser Proof
- `PUBLIC_STATUS_QA_BASE_URL=http://127.0.0.1:3044 pnpm public:status-qa`: pass.
- API proof:
  - `GET /api/public/status`: 200, public cache header.
  - `GET /api/public/pricing`: 200, public cache header.
  - Status DTO includes maintenance, AI availability, checkout availability, primary CTA, lead capture, legal status, updatedAt, and `not_public_discovery`.
  - Pricing DTO reads DB-backed `PlanConfig` for all four public plans.
  - Pricing checkout and CTA mode match public status.
  - Checkout action disabled and production payment disabled.
  - Public lead capture enabled for private beta with explicit `/api/public/lead` endpoint and consent version.
  - Lead API rejects missing consent, accepts honeypot without persistence, stores consented lead, does not echo email, and rate-limits repeated submissions.
  - Status/pricing private sentinel 0.
- Browser proof:
  - Landing desktop/mobile CTA mode and checkout status match public status.
  - Pricing desktop/mobile CTA mode and checkout status match public status.
  - Pricing desktop renders public lead form with matching consent version.
  - Pricing desktop does not render checkout payment step by default.
  - Landing/pricing desktop/mobile no horizontal overflow.
  - Console error count 0.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-public-bff/bff-305a-landing-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-public-bff/bff-305a-landing-mobile.png`
  - `docs/06_audits-and-reports/screenshots/lv3-public-bff/bff-305a-pricing-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-public-bff/bff-305a-pricing-mobile.png`

## Validation
- `node --check scripts/public-status-qa.mjs`: pass.
- `pnpm prisma:validate`: pass.
- `pnpm prisma:generate`: pass.
- `pnpm exec prisma db push`: pass; database already in sync with additive `public_leads` schema.
- `PUBLIC_STATUS_QA_BASE_URL=http://127.0.0.1:3044 pnpm public:status-qa`: pass.
- `PUBLIC_PRICING_QA_BASE_URL=http://127.0.0.1:3045 pnpm public:pricing-qa`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.
- `git diff --check`: pass.

## DB / Prisma
- Prisma schema changed additively: `PublicLeadStatus` enum and `PublicLead` model mapped to `public_leads`.
- `pnpm prisma:validate`, `pnpm prisma:generate`, and `pnpm exec prisma db push` completed; no `--accept-data-loss`.
- DB operation: read-only public pricing/status proof, `PlanConfig` consistency check, and non-destructive QA inserts into `public_leads`.
- No provider call; no `AiUsageLog` expected or required.
- No real payment, real email, real notification, provider call, external registry publication, or production payment activation.

## NANDA Alignment
- No AI module or AgentFacts-style manifest changed.
- Public status explicitly states it is not NANDA / AgentFacts / third-party public discovery, signed publication, or cross-org agent access.
- External registry publication, credential signing, public discovery endpoint, and cross-org access still require operator approval through NAP gates.

## Git
- Local commit required after validation.
- Push skipped by user instruction.
- Unrelated pre-existing dirty files were intentionally left unstaged.

## Remaining Blockers
- Source/proof: `BFF-401/BFF-402` checkout server payload and notification/query/idempotency remain open.
- Product/operator: real payment/email/notification, production checkout, external registry/public discovery, and cross-org agent access still require env/setup and targeted proof. Live provider proof is approved but still requires provider env and `AiUsageLog` success/error evidence.
- Worktree: pre-existing AI meeting/notes prototype and manual/sidebar/previsit changes remain unrelated and unstaged.

## Next Recommended Loop
Run `BFF-401a checkout disabled/sandbox server-payload proof`.

Suggested prompt:
> Execute BFF-401a only. Add or harden a server-owned `/api/billing/checkout` contract that never exposes ECPay HashKey/HashIV or browser-generated CheckMacValue, keeps production payment disabled without explicit approval, returns disabled 503 or sandbox-only posture as appropriate, and proves unauth 401, invalid plan 400, disabled/sandbox response, no raw payment/provider secret leakage, no real payment, no production write, and no fake subscription activation.

push skipped by user instruction
