# Current UI/UX Audit — 誠問 AI

> Re-run via `/uiux-audit`. Findings are ranked by impact. Update each iteration.

## Method
Audit grounded in the actual repo (Next.js 16, shadcn + Tailwind v4 + Base UI, ARC-003 ElevenLabs token system, React Flow relationship graph) and the real advisor surfaces — not the generic template product.

## Findings (ranked by impact)

### P0 — Theme foundation missing → "dark-first" was impossible *(addressed in UIX-001)*
- Before UIX-001 there was **no theme mechanism**: `.dark` tokens existed in `globals.css` but nothing ever applied the `.dark` class, so the app was permanently light. The Sonner toaster read a theme that was never set.
- Resolved: `next-themes` provider (`defaultTheme="dark"`), refined premium deep-slate dark palette, accessible `ThemeToggle` in the dashboard top-bar and public header.

### P1 — Dashboard "first screen" does not yet read as a decision center
- `/dashboard` aggregates via BFF but the first viewport does not forcefully answer *"what is today's main line, and what is the single most important next step?"* KPI density and "今日主線" emphasis can be tightened (this is the documented MM-001 intent; revisit visually under the new dark theme).

### P1 — Relationship graph is the product's true "node workspace" but lacks workspace chrome
- `/crm/[clientId]/relationships` (React Flow) is the closest surface to a node/canvas editor. It has a stage graph + source-review panel, but lacks a consistent **canvas toolbar / right inspector** pattern and premium dark-canvas treatment. High leverage for the "professional workflow workspace" goal.

### P2 — Theater Route B stage can feel like cards, not a stage
- `/theater/[sessionId]` renders a relationship stage graph + panels, but the immersive "stage" framing (focus client centered, NPCs around, group/private lanes) can be pushed further now that a premium dark canvas exists.

### P1 — Advisor surfaces leak developer jargon + over-stack low-signal panels *(pattern addressed for `/pre-visit/[planId]` in UIX-006 + restructured in UIX-009; `MeetingWorkspace` in UIX-007)*
- The visit preparation package stacked 5 always-rendered "劇場/會議回帶" bridge panels and exposed internal proof text (`currentPersistence=`, `requiresProductDecision=`, "no provider call", "Transient boundary") in the advisor UI. Resolved there by: one collapsible `劇場與會議回帶` group (auto-open only when there's content), `SafetyNote` popovers for the compliance/boundary text, a `更多` header overflow, and an evidence `InfoHint` tooltip. **The same pattern should be swept across `/pre-visit/[planId]/notes`, the theater/meeting workspaces, and any other surface still rendering `Proof:`/`writes*: false` copy in the UI.**
- **UIX-007 (`MeetingWorkspace`):** removed `CLIENT_MEETING`/`No provider` badges, humanized `Deterministic no-provider`/`server-side BFF`/raw modality copy, dropped the 4-row **安全邊界** audit grid down to one quiet privacy footer (keeping the `未嘗試` proof node), and trimmed `X memories`/`不寫正式 CRM fact` writeback noise. **Still open:** the conditional Route B side panels (`meeting-route-b-*`) keep `provider: none` badge clusters — next in UIX-008.
- **UIX-009 (`/pre-visit/[planId]` structural restructure):** collapsed the ~13-block vertical wall into a persistent objective **briefing + progress HUD** (animated ring, merges the 4 KPI cards + theater launch) and a 4-tab segmented workspace (作戰總覽 / 問題異議 / 材料節奏 / 劇場會議) with reduced-motion-safe `motion` fade-in. Reuse-only; QA innerText contract preserved by keeping the required trio in the default tab. **Still open:** authenticated screenshots (dev-auth server), and the quickstart driver.js tour steps for tab-hidden anchors.
- **UIX-011 (`劇場會議` tab compaction):** the `關係圖確認卡` wall (5 tall cards + a 3-stat boundary sub-card) became a compact **review list** — one row per item with a status dot, `高` chip, detail Popover, and an inline `aria-pressed` segmented state control (待確認/已確認/轉追問); the boundary machinery moved to a footer button + `SafetyNote` popovers. The 4 secondary "回帶" panels are now grouped in one collapsed `Disclosure`. Reuse-only; the `aria-pressed={state === "confirmed_in_meeting"}` + boundary literals preserved. **Still open:** per-source quiet rows for the 4 context panels + a row state-change flash; authenticated screenshots.

### P2 — Empty / loading / error states uneven across surfaces
- Several surfaces have good empty states; others fall back to terse text. Standardize a compact, professional empty-state + skeleton pattern.

### P2 — Icon / spacing / radius consistency
- Mostly mature (Lucide, hairline cards, `--radius 0.625rem`). Spot-check for stray large radii / inconsistent icon strokes as surfaces are reworked.

### P3 — Two-theme contrast QA
- Light theme must remain AA-compliant and visually intact as the dark theme becomes primary. Needs a recurring per-surface dark+light contrast pass.

## Visual hierarchy problems
- Page title vs section title vs metadata scale is defined (`.text-display/.text-h1`) but not uniformly applied across older surfaces.

## Interaction problems
- Some icon-only controls historically lacked tooltips/aria (largely fixed in MM-013/AIS-002); keep enforcing on new controls.

## Missing states
- Inconsistent: loading skeletons, empty states, error states, disabled/justification states across CRM subpages and meeting/theater panels.

## Professional tone gap
- With the new premium dark theme the baseline tone is strong; the remaining gap is **workspace chrome** (toolbars, inspectors, status rails) on the canvas-like surfaces.

## Priority ranking for next iterations
1. **UIX-002** — Dashboard decision-center polish under the dark theme (today's main line + one next step + compact KPI rail).
2. **UIX-003** — Relationship graph workspace chrome (canvas toolbar + right inspector + premium dark canvas).
3. **UIX-004** — Standardized empty / loading / error state kit.
4. **UIX-005** — Theater Route B immersive stage polish.
5. **Ongoing** — per-surface dark+light contrast & a11y pass.
