# UI/UX Iteration Log — 誠問 AI

> Newest first. One entry per iteration.

---

# Iteration 5 — UIX-011: `劇場會議` tab compaction — relationship confirmation review list

## Goal
After UIX-009 the `劇場會議` tab still read as a wall of cards, **especially 關係圖確認卡** (up to 5 tall cards, each with 3 badges + 2 detail lines + 3 full-width buttons + a footer, plus a boundary sub-card of 3 stat tiles). Compact it into a scannable review list with an inline state control, and demote the 4 other "回帶" panels behind one quiet disclosure — Notion-style progressive disclosure.

## User Story
Flow C: As an advisor on the 劇場會議 tab, I want the relationship confirmations as a tight review list I can triage one-thumb (待確認 / 已確認 / 轉追問 inline), with detail on demand — not a stack of tall cards — and the secondary theater/meeting feedback tucked away until I ask for it.

## Package / Component Strategy
- **Hand-built compact segmented control** (3 `<button aria-pressed>` in a bordered `inline-flex`) — not `Select`/`dropdown-menu`: a 3-way toggle is faster always-visible, and the QA source-grep **requires** `aria-pressed={state === "confirmed_in_meeting"}` verbatim, which a dropdown can't provide.
- **shadcn `Popover`** for per-row detail (evidence detail + confirmation prompt + priority + source) and for the boundary machinery; **lightweight inline `Disclosure`** (`useState` + `motion-reduce`-safe chevron) for the 4 secondary panels — no Base-UI accordion, no new dep.
- **magicUI: not added** (corroborated by the design sub-agent) — regulated-insurance tone favors removal over shimmer/beams.
- Reused existing `motion` `MotionPanel`; no new setState-in-effect (respects the React 19 lint red-line).

## Changes Made (`src/app/(dashboard)/pre-visit/[planId]/page.tsx`)
- **`關係確認卡` → review list:** each tall card is now a **one-row item** — status dot (by evidence状態) + priority `高` chip + title + a small **info Popover** (`ConfirmationDetailPopover`: detail/prompt/priority/state/source) + an inline **`ConfirmationStateControl`** segmented control. Card height ~180px → ~48px.
- **Boundary block collapsed:** the 3-stat "建場前狀態檢查" sub-card became a compact footer line (已確認・轉追問・已驗證) + the `檢查狀態邊界` button + two `SafetyNote` popovers holding the boundary/proof literals. All boundary literals (`currentPersistence=`/`requiresProductDecision=`/`persistedToDatabase=`, `data-relationship-confirmation-state-boundary`, `validateRelationshipConfirmationStateBoundary`, `/relationship-confirmation-state`) preserved.
- **Tab reflow:** the relationship review list is now full-width and first; the 4 context panels (feedback / state-proposal / red-line / meeting-signal) are grouped inside one collapsed `Disclosure` ("劇場與會議回帶明細", auto-open only when it has content, rendered only when any context exists) — so the resting tab is one review list + one quiet row, not 5 cards.
- New helpers: `Disclosure`, `ConfirmationStateControl`, `ConfirmationDetailPopover` (+ re-added `ChevronDown` import). No sub-component data wiring changed.

## Verification
- `pnpm exec tsc --noEmit --pretty false` → **0 errors in the target file** (repo-wide fails only in `src/lib/ai/generators/visit-package.ts`, an **unrelated** concurrent AI-visit edit — not this change).
- `pnpm exec eslint <page>` → **exit 0**.
- QA source-grep: `visit:relationship-confirmation-state-ui-qa` (+ state-proposal / feedback-advisor / meeting-signal) → **all exit 0, 0 fails**; required literals present (missing=0), incl. exact `aria-pressed={state === "confirmed_in_meeting"}` and all boundary strings.
- Running dev server compiles (`/login` 200) after HMR. **Authenticated screenshot still blocked** (no `ALLOW_DEV_AUTH_HEADER` on the running server + Next 16 single-dev-server lock + DB DNS) — not faked; ready-to-run command as in UIX-009.

## Result
The 劇場會議 tab goes from a 5-card wall to: a compact, one-thumb-triage relationship **review list** + a single collapsed disclosure for secondary feedback. Inline segmented state, detail-on-demand popovers, boundary machinery preserved but silent until asked.

## Remaining Issues / Next Step
- Authenticated dark+light desktop/mobile screenshots owed once a dev-auth server is free.
- Optional: turn the 4 context panels themselves into per-source quiet rows (the sub-agent's full accordion), and add the row "state-change flash" motion. Sweep the compact-review-row pattern to other confirmation surfaces (meeting writeback cards).

---

# Iteration 4 — UIX-009: `/pre-visit/[planId]` game-inspired workspace (HUD + segmented tabs)

## Goal
UIX-006 decluttered the visit-prep page but it was still a ~13-block vertical wall. Restructure the *experience* like a game mission-prep screen: a persistent **objective briefing + progress HUD**, then a **segmented tab workspace** so only one focused view shows at a time — minimal but rich, with tasteful motion. Reuse-only (re-parent existing sub-components), no data/logic changes, QA contract intact.

## User Story
Flow C: As an advisor opening a preparation package, I want a HUD that instantly reads my readiness + next action (like a quest briefing), and to switch between focused views (總覽 / 問題 / 材料 / 劇場) instead of scrolling a 13-block wall — so prep feels like operating a tool, not reading a report.

## Package / Component Strategy
- **shadcn `Tabs`** (Base UI) for the segmented workspace — already in `src/components/ui/`, unused until now. Segmented control = the "game menu" pattern.
- **`motion` v12 (`motion/react`)** — already installed (repo convention, used by UIX-007). Two guarded microinteractions: an **animated progress ring** (SVG `strokeDashoffset` fill via `motion.circle`) and a **fade-up on tab-panel mount** (`MotionPanel`). Both gated by `useReducedMotion()`. **No setState-in-effect** (respects the repo's strict React 19 lint red-line) — animation is purely declarative on motion values.
- **magicUI: not added.** Its NumberTicker/ring effects are nice, but a count-up needs setState-in-effect (lint red-line) and the regulated-insurance tone favors restraint. Built the ring inline on `motion` instead — 0 new deps.
- Risk: the browser QA (`visit:bff-qa`) reads `document.body.innerText` (excludes hidden), so tab-hidden panels don't count. Mitigated: the **default `作戰總覽` tab contains the QA-required trio** (核心問題清單 + 決策地圖 + 推論證據, incl. `保單缺口` evidence), and 專案情境/決策地圖/推論依據 also live in the always-mounted hero + HUD.

## Changes Made (`src/app/(dashboard)/pre-visit/[planId]/page.tsx`)
- **New components:** `PrepHud` (merges the 4 KPI cards **and** the theater launch panel into one HUD: progress ring + 3 compact meters 關係節點/推論依據/材料 + theater status/CTA), `ProgressRing` (animated SVG ring), `MotionPanel` (reduced-motion-safe fade-up). Removed the now-unused `PrepMetric` and `CollapsibleSection` (+ orphaned `ChevronDown` import).
- **Briefing row:** dark objective hero (kept) + `PrepHud` on the right — replaces the old hero+theater row **and** the separate 4-up KPI strip (2 blocks → 1 HUD).
- **Segmented workspace:** replaced the KPI row + priority/decision row + the whole `<main>` stack with `<Tabs defaultValue="overview">`:
  - `作戰總覽` (default) — 核心問題清單 + 決策地圖 + 推論證據.
  - `問題異議` — 完整 SPIN 問題庫 + 可能異議.
  - `材料節奏` — 拜訪材料 + 時間分配 + 拜訪後筆記.
  - `劇場會議` — the 5 Route B / meeting / relationship panels (badge shows live signal count); replaces the old always-stacked collapsible.
- All sub-components, handlers, data wiring, and `data-tour` anchors reused verbatim (re-parented).

## Preservation (QA contract)
Source-grep literals: all preserved (missing=0), incl. exact `onClick={() => void handlePrimaryAction()}`, `aria-pressed={state === "confirmed_in_meeting"}`, every `data-*` attr and `writes*: false`/boundary string. Rendered-DOM: `h1 拜訪準備包`, `專案情境` (hero), `核心問題清單`+`決策地圖`+`推論依據`+`保單缺口` (default tab + HUD), clickable `AI 會議`, theater CTA — all in the default view.

## Verification
- `pnpm exec tsc --noEmit --pretty false` → **exit 0, 0 errors repo-wide**.
- `pnpm exec eslint <page>` → **exit 0**.
- Source-grep QA: `visit:relationship-confirmation-state-ui-qa`, `visit:route-b-state-proposal-context-qa`, `visit:route-b-feedback-advisor-context-qa`, `visit:meeting-relationship-signal-bff-ui-qa` → **all exit 0, 0 fails**.
- Runtime path de-risked: `motion/react` resolves (`motion` + `useReducedMotion`), base-ui `Tabs` accepts `defaultValue`; running dev server serves `/login` 200 (compiles) and 307-guards `/pre-visit` → `/login`.
- **Authenticated screenshot blocked** (same as UIX-007): the running dev server has no `ALLOW_DEV_AUTH_HEADER`, Next 16 single-dev-server lock + port 3000 busy, direct-DB DNS `ENOTFOUND`. Not faked. Ready-to-run: `ALLOW_DEV_AUTH_HEADER=true pnpm exec next dev --port <free>` then Playwright `/pre-visit?demo=quickstart` (DB-free quickstart seeds the plan).

## Result
The page goes from a 13-block scroll to: header → objective + progress-HUD briefing → a 4-tab focused workspace. Readiness reads at a glance (ring + meters), each view is one job, and motion gives a subtle "meter fills / view slides in" game feel — all reduced-motion-safe, both themes, QA-preserved.

## Remaining Issues
- Authenticated dark+light desktop/mobile screenshots owed once a dev-auth server is free.
- Quickstart `driver.js` tour steps for `plan-spin`/`plan-objections` now live in the non-default `問題異議` tab; driver.js centers the popover gracefully (no crash) but won't auto-switch tabs — minor demo-tour degradation, not a functional break.
- Overview tab still holds 3 blocks to satisfy the innerText QA; if that QA is later relaxed to `textContent`, the overview could slim further.

## Next Step
Sweep the same HUD + segmented pattern (or at least the "no jargon, on-demand detail") to `/theater/[sessionId]` and `/pre-visit/[planId]/notes`; capture the owed screenshots when a dev-auth server is available.

---

# Iteration 3 — UIX-007: Declutter the AI Meeting workspace

## Goal
Strip engineering/audit scaffolding leaking onto the advisor-facing `MeetingWorkspace` so the surface reads as a calm capture → summarize → confirm tool, not a debug console.

## User Story
As an advisor opening the AI Meeting workspace, I want a clean, plain-language interface that shows only what helps me run and record the meeting — not internal jargon (`CLIENT_MEETING`, `No provider`, `Deterministic no-provider`, `server-side BFF`, raw modality enums) or a compliance-proof grid.

## Package / Component Strategy
- **Reuse** shadcn `Badge`/`Button`/`Textarea` primitives — no new UI kit.
- **Polish** with the already-installed `motion` v12 (`motion/react`, repo convention) for a single guarded fade-up on the generated summary; `useReducedMotion()` disables it for reduced-motion users. **0 new dependencies.**
- Risk: load-bearing test IDs (`meeting-safety-provider` must contain "未嘗試", `meeting-turn-count`, capture/summary/writeback IDs). Mitigated by preserving them while restyling; verified against all meeting browser-QA selectors before editing.

## Changes Made (`src/components/meeting/meeting-workspace.tsx`, net −18 lines)
- Header badges 4 → 2 (dropped `CLIENT_MEETING`, `No provider`); metric cards 3 → 2 with human labels (`會議段落`, `已擷取重點`); removed the now-unused `transcriptFinalCount` memo.
- Rewrote engineering copy into advisor language across capture, turn list, memory rail (`會議重點`), and summary subtitles.
- Replaced the 4-row **安全邊界** audit panel with one quiet privacy footer — preserving the `meeting-safety-provider` "未嘗試" proof node; removed the orphaned `SafetyRow` helper.
- Turn cards: dropped the raw `modality` enum badge, humanized labels (`逐字轉寫` / `手動筆記`).
- Summary: removed `source turns` / `provider` jargon badges, humanized `N 則引用`, hidden when zero; wrapped in a guarded `motion.div` fade-up.
- Writeback candidate cards: dropped internal `X memories` / `不寫正式 CRM fact` badges.

## Verification
- `pnpm exec tsc --noEmit --pretty false` → **exit 0** (0 errors repo-wide).
- `pnpm lint:changed` / `eslint` on the file → **0 problems** (the one warning is a pre-existing untouched script).
- Route compile smoke: `GET /crm/c_wang/meeting` on the running dev server → HTTP 404 (auth/data outcome) with **0 build/error markers** → the changed module compiles cleanly in turbopack.
- **Pixel screenshots blocked this iteration**: Next 16 enforces a single dev server, the already-running servers were not started with `ALLOW_DEV_AUTH_HEADER=true`, and the direct-DB host is DNS `ENOTFOUND` — so an authenticated browser render can't be forced without killing the user's server. Not faked. Ready-to-run command below.

## Result
The advisor surface now leads with meeting content and plain guarantees; internal proof language is either humanized or demoted to a single subtle footer, while every compliance/data guarantee (no provider, no audio, no auto CRM write) and every QA hook stays intact.

## Remaining Issues
- Operator can capture screenshots once a dev-auth server is free:
  `ALLOW_DEV_AUTH_HEADER=true pnpm exec next dev --port <free>` (stop other dev servers first), then
  `DEMO_QA_BASE_URL=http://localhost:<free> DIRECT_URL="$DATABASE_URL" node scripts/meeting-workspace-ui-qa.mjs`.
- The conditional Route B side panels still carry `provider: none` badge clusters; out of scope here (rarely shown, own QA) — candidate for a later pass.

## Next Step
**UIX-008 — Route B context panels declutter**: apply the same jargon-to-plain-language pass to the conditional Route B red-line / state-proposal / feedback panels, collapsing their `provider: none` badge rows into a shared quiet assurance line.

---

# Iteration 2 — UIX-006: Visit preparation package (`/pre-visit/[planId]`) simplification

## Goal
The 拜訪準備包 detail page had become a ~7,700px wall: the right rail stacked 5 "劇場/會議回帶" bridge panels that rendered full cards even when empty, and leaked developer jargon into the advisor-facing UI ("Proof: owner-scoped visitPlanId, no provider call, no AiUsageLog", "Transient boundary", `currentPersistence=local-only-ui-state`, `requiresProductDecision=true`, `persistedToDatabase=false`, `requiresConfirmation=true`). Reorganize into a simple, clear, reconstructable workspace using tooltips + popovers, without changing data wiring or breaking QA.

## User Story
Flow C (visit prep): As an advisor opening a preparation package, I want the first screen to show only what I act on — situation, priority questions, decision map, prep progress — and let me pull up劇場/會議 feedback and data-boundary detail on demand, so the page feels like a focused prep tool, not a debug dump.

## Package / Component Strategy
- **Reuse existing Base UI primitives** in `src/components/ui/`: `Popover` (header overflow menu + on-demand "資料邊界" safety notes), `Tooltip` (evidence definitions). No new package — the repo already ships these; a collapsible was built inline (`CollapsibleSection`, `useState` + `aria-expanded`, `motion-reduce` safe) since no collapsible primitive exists. Custom code limited to composition, not new UI mechanics.

## Changes Made (all in `src/app/(dashboard)/pre-visit/[planId]/page.tsx`)
- **Helpers added:** `CollapsibleSection` (accessible disclosure with live badge), `InfoHint` (self-contained `TooltipProvider` + info button), `SafetyNote` (popover that holds the compliance/boundary text on demand). `SectionHeader` gained an optional `action` slot.
- **Header actions decluttered:** 5 buttons → `AI 會議` (kept visible/clickable — required by meeting QA) + a `更多` popover (拜訪筆記 / SPIN 澄清 / 列印) + the primary CTA (exact `onClick={() => void handlePrimaryAction()}` preserved).
- **Right rail reorganized:** the 5 advanced panels (Route B feedback / state-proposal / red-line, meeting relationship signals, relationship confirmation) are now grouped under ONE `劇場與會議回帶` `CollapsibleSection` with a live "n 項來源有可回帶內容" summary + count badge; it auto-opens only when there is READY content (`advancedSignals > 0`), so the common empty case collapses to a single tidy row instead of 5 empty cards. Core sidebar (推論證據 / 時間分配 / 拜訪後筆記) stays visible.
- **Developer jargon removed from the always-on view:** every "Proof:" / boundary / `currentPersistence=`/`requiresProductDecision=`/`persistedToDatabase=`/`requiresConfirmation=true` block moved into `SafetyNote` popovers (icon-triggered, `aria-label`ed). The raw `requiresConfirmation=true` badge on the feedback row became a human `待確認再寫回` label.
- **On-demand definitions:** 推論證據 header now carries an `InfoHint` explaining 已知/推論/待確認.

## Preservation (QA contract)
The QA scripts for this page are **source-file string greps** (`readFileSync(page.tsx).includes(...)`) plus a few rendered-DOM checks. All 35 required literals were kept in-source (relocated into popover/tooltip children where needed), and all rendered requirements stay visible: `h1 拜訪準備包`, `專案情境`, `核心問題清單`, `決策地圖`, `推論依據`, clickable `AI 會議`, `拜訪後筆記` heading, theater CTA. Exact `onClick={() => void handlePrimaryAction()}` and `aria-pressed={state === "confirmed_in_meeting"}` untouched.

## Verification
- `pnpm exec tsc --noEmit --pretty false` → **target file clean** (0 errors in `pre-visit/[planId]/page.tsx`). NOTE: repo-wide tsc currently fails in an **unrelated** file, `crm/[clientId]/relationships/page.tsx` (broken `editingProfileMemberId`/`openProfileEditor` refs), from concurrent in-progress work — not this change.
- `pnpm exec eslint "…/pre-visit/[planId]/page.tsx"` → **exit 0**.
- QA source-grep scripts (assert this page's contract): `visit:relationship-confirmation-state-ui-qa`, `visit:route-b-state-proposal-context-qa`, `visit:route-b-feedback-advisor-context-qa`, `visit:meeting-relationship-signal-bff-ui-qa` → **all exit 0**.
- Screenshot: **environment-blocked** — port 3000 is held by a concurrent dev server and Next 16 enforces a single-dev-server lock, so an isolated live capture would either fail or disturb another active session. Not faked. Change is presentation-only and type/lint/QA-verified.

## Result
The default view drops from ~8 stacked right-rail panels (mostly empty + jargon) to a clean core sidebar + one collapsible advanced group. Compliance/boundary text is now on-demand via popovers instead of always-on developer noise. All data wiring and QA contracts intact.

## Remaining Issues / Notes
- Live dark+light desktop/mobile screenshots owed once the dev server is free (or run `/pre-visit?demo=quickstart` for a DB-free capture).
- Concurrent background work is editing this repo (added a visit-goal Dialog to this page; broke `relationships/page.tsx` tsc) — this iteration builds on top of the goal-Dialog and does not touch relationships.
- Next candidate: apply the same "collapse advanced bridges + on-demand safety notes" pattern to `/pre-visit/[planId]/notes` and the theater/meeting workspaces.

---

# Iteration 1 — UIX-001: Premium dark theme foundation

## Goal
Make a polished **dark theme the primary/default experience** (operator decision 2026-06-26), on top of the existing ARC-003 theme-aware token system, with a working light fallback and an accessible toggle. This is the prerequisite for all subsequent "dark-first" page iterations.

## User Story
Cross-cutting (Flow E): As any user, I want the app to open in a calm, premium dark workspace and let me switch to light, so the product feels like a senior, trustworthy B2B SaaS.

## Package / Component Strategy
- **Install `next-themes`** — no theme mechanism existed; canonical SSR-safe, FOUC-free dark/light with `attribute="class"` mapping onto the existing `.dark` token block. Zero architecture/auth/DB impact. (See `package-strategy.md` decision log.)
- Toggle built from existing shadcn `Button` + Lucide `Sun`/`Moon`; **CSS-driven** icon (`dark:` variants) to satisfy the repo's strict React 19 `react-hooks/set-state-in-effect` lint rule — no `mounted` state, no effect, no hydration mismatch.

## Changes Made
- `src/components/theme/theme-provider.tsx` (new) — `next-themes` provider, `defaultTheme="dark"`, `enableSystem={false}`, `disableTransitionOnChange`.
- `src/components/theme/theme-toggle.tsx` (new) — accessible, CSS-driven dark/light toggle.
- `src/app/layout.tsx` — wrap app in `ThemeProvider`.
- `src/app/globals.css` — refined `.dark` block to a premium deep-slate palette (`--background #0B0E14`, `--surface #11151D`, `--card #11151D`, `--sidebar #0D1117`, cool translucent hairlines, navy-tinted primary `#6FA0D6`, gold kept as the rare accent).
- `src/components/layout/top-bar.tsx` — `ThemeToggle` in the right action cluster.
- `src/app/page.tsx` — `ThemeToggle` in the public header.

## Verification
- `pnpm exec tsc --noEmit --pretty false` → **exit 0**.
- `pnpm lint:changed` → **0 errors** (1 pre-existing warning in an untouched script). `eslint` on new theme files → **exit 0**.
- Dev server (`/`, DB-free fallback) + Playwright (chrome) screenshots, dark + light, desktop 1440 + mobile 390:
  - dark default: `<html>` has `dark` class, body bg `rgb(11,14,20)` = `#0B0E14`; light: no dark class, body bg `#FAFAF9`.
  - **0 console errors, no horizontal overflow, all HTTP 200** in every shot.
  - Screenshots: `docs/06_audits-and-reports/screenshots/uiux/uix-001-dark-theme-foundation/uix-001-home-{dark,light}-{desktop,mobile}.png`.

## Result
The whole app now defaults to a premium deep-slate dark theme and can switch to light. Verified end-to-end on the public surface; the change is token + provider + toggle only, so every surface inherits it without logic changes.

## Remaining Issues
- In-app dashboard/CRM dark screenshots not captured this iteration (DB-backed surfaces; Supabase DNS may block). Public-surface proof is solid; per-surface dark QA folds into later iterations.
- Light theme is intentionally left as-is for now (develop later per the dark-first decision).

## Next Step
**UIX-002 — Dashboard decision center**: make `/dashboard` first viewport answer "today's main line + the one next step" under the dark theme, reusing `MemberDashboardDto` (no new data source).
