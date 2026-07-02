# UI/UX Refactor Plan — 誠問 AI

> One high-impact iteration at a time. No big-bang rewrites. Each iteration: pick from `current-audit.md`, write a package/component strategy, implement small, verify, log, critique.

## Guardrails (every iteration)
- Preserve business logic, data structures, SPIN state machine, Theater enums/scoring, compliance fields, `AiUsageLog`.
- Do not touch auth / payment / database schema / deployment.
- Reuse `src/components/ui/` shadcn primitives; customize via tokens, not hex.
- Both themes must stay AA-contrast and visually intact; respect reduced-motion.
- Verify with `pnpm exec tsc --noEmit`, `pnpm lint:changed`, and a Playwright screenshot (desktop + mobile, dark + light where relevant).
- DB-backed surfaces may be blocked by the Supabase DNS issue; prefer DB-free verification or report the limitation honestly — never fake proof.

## Iteration backlog

### ✅ UIX-001 — Premium dark theme foundation (done)
Establish two themes with dark as default; refine dark palette to premium deep-slate; accessible toggle. Verified on the public surface (dark + light, desktop + mobile).

### UIX-002 — Dashboard decision center (next)
- **Problem:** `/dashboard` first viewport doesn't forcefully answer "today's main line + the one next step."
- **Approach:** Use existing `MemberDashboardDto`; reorganize first screen into a dominant 今日主線 block + single primary CTA + compact 4-up KPI rail. Reuse shadcn Card/Badge; no new data source.
- **Verify:** dark + light, desktop + mobile (DB-permitting; else component-level + source proof).

### UIX-003 — Relationship graph workspace chrome
- **Problem:** The true node canvas lacks workspace toolbar + right inspector + premium dark canvas.
- **Approach:** Canvas toolbar (zoom/fit/add) with aria-labels, right inspector for selected node, dark React Flow theming via tokens. Custom only for node semantics; chrome via shadcn.

### UIX-004 — Empty / loading / error state kit
- Standardize a compact professional empty-state + skeleton + error pattern; apply to CRM subpages, meeting/theater panels.

### UIX-005 — Theater Route B immersive stage
- Push the stage framing (focus client centered, NPC ring, group/private lanes, speaker highlight) on the premium dark canvas.

### Ongoing — dark+light contrast & a11y pass
- Per-surface AA contrast, focus ring, reduced-motion, tooltip/aria audit as surfaces are reworked.

## Package / Component Strategy (per iteration)
Filled in `package-strategy.md` and the iteration log before each implementation. Default mapping: base UI → shadcn/Radix/Lucide; canvas → React Flow; forms → React Hook Form + Zod; tables → TanStack Table; toasts → Sonner; theming → next-themes; animation → Framer Motion only where it aids UX.
