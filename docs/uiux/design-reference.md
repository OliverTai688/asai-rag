# UI/UX Design Reference — 誠問 AI

> Status: living document · Owner: UI/UX iteration workstream (UIX) · Source of truth for *tokens* remains `docs/02_architecture-and-rules/ARC-003_elevenlabs-design-direction-v1.0.md`.

## What this product actually is

誠問 AI (`asai-rag`) is a **regulated, Traditional-Chinese (zh-TW) insurance-advisory AI SaaS** for professional insurance advisors (保險顧問), their managers (org admin), the platform operator (super admin), and end clients (client portal). It is **not** a generic "workflow modeling / land-administration" tool.

The closest thing to a "workflow workspace / node canvas" in this product is the **relationship network graph** (`/crm/[clientId]/relationships`, React Flow) and the **Theater Route B stage** (`/theater/[sessionId]`). UI/UX work should treat *those* as the node-editor surfaces, and treat the rest of the app as a focused B2B SaaS dashboard.

Core advisor surfaces:

- `/dashboard` — daily decision center (今日主線 + next step + compact KPI)
- `/crm`, `/crm/[clientId]/*` — client 360 (overview, policies, relationships, timeline, gap-analysis, reports)
- `/interview` — AI 了解客戶 (Park-memory interview, voice + text)
- `/spin` — SPIN advisor sessions (state machine, protected)
- `/theater`, `/theater/build`, `/theater/[sessionId]` — AI 劇場演練 (Route B multi-character roleplay)
- `/pre-visit`, `/pre-visit/[planId]`, `/notes` — visit preparation + AI meeting workspace
- `/reports`, `/share/[token]` — report editing + client-facing share
- `/team`, `/team/settings` — org admin coaching/aggregate
- `/super-admin/*` — platform console

## Primary design reference: Plasma

Reference: https://plasma-nextjs-template.vercel.app/

Plasma is used **only** as a *visual & product-tone reference for premium dark automation SaaS*. 

### Borrow
- Deep, calm, trustworthy **dark SaaS** texture (deep navy / slate, not flat black)
- Information hierarchy of **metric cards / status blocks / feature panels**
- Product-tone language around **AI suggestion → structured output**, **execution / observability** trust
- Restraint: lots of negative space, hairline separation, controlled accent
- Professional, cool, "senior advisor" gravity

### Do NOT borrow
- Plasma brand name, copy, illustrations, screenshots, assets
- Landing-page structure, hero-first marketing order, testimonial carousels, pricing-section layout
- Any consumer / playful styling

The product core is an **application workspace**, not a landing page.

## Theme strategy (operator decision, 2026-06-26)

Two themes — **dark** and **light** — both expressed through the existing theme-aware `paper / ink / hairline` token system in `globals.css` (`.dark` block flips the runtime vars).

- **Dark theme is primary for now** and is the default (`next-themes`, `defaultTheme="dark"`). UIX-001 refined the dark palette to a premium deep-slate (`--background #0B0E14`, `--surface #11151D`, `--sidebar #0D1117`, cool translucent hairlines).
- **Light theme is developed afterward** — it already exists (the ElevenLabs paper canvas) and must keep working; do not break it.
- Switching is one CSS class (`.dark` on `<html>`). No token has to move to retheme.

## Product-specific adaptation of Plasma's "warm accent"

Plasma uses a warm orange accent. This product is **regulated insurance** with an established brand (navy `#1A3A6B` + rare gold `#C9A227`). We **do not** introduce orange. Plasma's *role* for a warm accent is fulfilled by the brand's restrained **gold**, used <3% of any screen. This keeps brand and compliance integrity while achieving the same "rare premium signal" effect.

## Visual tone
- Calm, cool, professional, trustworthy, senior.
- Quality comes from **removal**, not decoration.
- Navy is the ink/accent anchor; gold is the rare premium signal; everything else is neutral.

## Layout principles
- Workspace surfaces favor: **top bar (context + actions) → left nav (role-aware) → center work area → right inspector/detail** where a record/canvas warrants it.
- Hairline (1px) borders over drop shadows.
- `tabular-nums` for figures; editorial display scale for page titles (`.text-display`, `.text-h1`).
- Every page answers: *what is this for, what is my first action, what is my next action.*

## Component principles
- Reuse shadcn primitives in `src/components/ui/`; compose, don't fork.
- Customize via tokens + `className`, never hardcoded hex.
- Maintain WCAG AA contrast in **both** themes; respect `prefers-reduced-motion`.
- Icon-only controls always carry `aria-label` + tooltip.

## Package-first UI direction
See `package-strategy.md`. Standard UI patterns → mature packages; custom code only for product-specific domain logic (SPIN state machine, Theater orchestration, relationship graph semantics, AI writeback boundaries).
