# 2026-06-20 - LV3 BFF-103c CRM Client Lifecycle Source Truth

## Scope
- Loop type: normal LV3 immersive implementation/proof loop.
- Selected slice: BFF-103c CRM client update/archive source-truth.
- Goal: make CRM client lifecycle writes owner-scoped and server-confirmed, then prove relationship graph and CRM UI read the same persisted client facts.

## Candidate Score
- BFF-103c CRM lifecycle + relationship graph proof: 23/25. Connects client update/archive, relationship graph, CRM detail/list refresh, compliance fields, DB proof, and no-provider safety.
- RAS-001 role-aware navigation contract: 17/25. Important for `/interview` vs legacy `/spin`, but less direct source/proof impact for the core client -> graph -> prep flow.
- ITA-003f Route B provider orchestration: 18/25. High theater value, but provider enablement and AiUsageLog success/error runtime proof should wait until explicit provider approval and a smaller Route B provider slice.

## Changes
- Added `DELETE /api/clients/[id]` as soft archive, scoped by `requireCurrentMember()` and `canWriteClient()`.
- Added `archiveClientForMember()` and archived DTO mapping that preserves `complianceChecklist`, `sensitivityLevel`, and `kycStatus`.
- Added client service `updateClientRemote()` and `archiveClientRemote()`; local client update/delete helpers are marked dev-only.
- Added `pnpm bff:crm-client-lifecycle-qa` API/browser/DB proof.
- Updated BFF-103 docs, issue-question, and loop-state; BFF-103 remains incomplete because related-list DTOs are still open.

## Data / DB / Prisma
- Prisma schema unchanged; no generate/db push.
- QA performed non-destructive demo/test writes: created QA clients, patched one, then soft-archived it by setting `clients.status=ARCHIVED`.
- DB proof: archived QA client remained in `clients`; `compliance_checklists.kyc_status=MISSING` remained attached.

## API Proof
- `DELETE /api/clients/not-a-client` unauthenticated: 401.
- `POST /api/clients` demo member: 201.
- `PATCH /api/clients/[id]` demo member: 200 and returned updated occupation, annual income, status, and compliance fields.
- `GET /api/clients/[id]/relationship-graph`: 200 and primary node reflected patched occupation, annual income, and status.
- Demo manager `PATCH/DELETE /api/clients/[id]`: 404.
- Owner `DELETE /api/clients/[id]`: 200, `archived=true`, status `ARCHIVED`, compliance fields present.
- Archived client `GET /api/clients/[id]` and relationship graph: 404.
- `GET /api/clients` no longer listed archived client.

## Browser Proof
- `/crm/[clientId]` desktop rendered patched occupation and annual income, compliance signal visible, no horizontal overflow.
- `/crm` desktop and mobile refresh hid the archived client, no horizontal overflow.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-bff-crm-client-lifecycle/2026-06-20-bff-103c-crm-detail-updated.png`
  - `docs/06_audits-and-reports/screenshots/lv3-bff-crm-client-lifecycle/2026-06-20-bff-103c-crm-list-after-archive.png`
  - `docs/06_audits-and-reports/screenshots/lv3-bff-crm-client-lifecycle/2026-06-20-bff-103c-crm-list-mobile-after-archive.png`

## Privacy / Boundary Proof
- No OpenAI/Anthropic provider route invoked.
- `AiUsageLog` count unchanged during QA: `147 -> 147`.
- Manager could not patch/archive member-owned client.
- Archive route does not physically delete client, compliance checklist, or related business records.

## Validation
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `DEMO_QA_BASE_URL=http://localhost:3027 pnpm bff:crm-client-lifecycle-qa`: pass.
- `pnpm lint:changed`: pass.
- `pnpm exec eslint scripts/bff-crm-client-lifecycle-qa.mjs`: pass.

## Git
- Push policy: `push skipped by user instruction`.
- Commit: local commit expected after validation.

## Remaining Blockers
- CRM policy/timeline/report/gap-analysis related-list BFF DTOs remain open.
- Admin/pilot demo seed and notification mock-success source blockers remain outside this slice.
- Route B provider success/error AiUsageLog orchestration remains blocked until a provider-approved slice.

## Next Recommended Loop
- `BFF-103d CRM related-list DTO source-truth`: finish policy/timeline/report/gap-analysis related-list BFF DTOs for CRM subpages with member scope, refresh proof, and no raw private leakage.
- Fallback: `RAS-001 role-aware navigation contract / legacy SPIN visibility`.
