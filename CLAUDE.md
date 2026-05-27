# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Generate Prisma client then build (requires DIRECT_URL env var)
pnpm lint         # ESLint via next/core-web-vitals + next/typescript rules
pnpm prisma:generate   # Regenerate Prisma client after schema changes
pnpm prisma:validate   # Validate schema without generating
```

No test suite is configured. There is an extensive mock layer under `src/domains/ai-mock/` and `src/app/api/mock/` for development without live AI.

## Environment

Copy `.env.example` to `.env.local`. Required vars:

- `DATABASE_URL` / `DIRECT_URL` — Supabase Postgres (pooled + direct)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `OPENAI_API_KEY` — primary AI provider (OpenAI 6.x SDK)
- `ANTHROPIC_API_KEY` — secondary provider

## Architecture

**Domain-driven structure** — business logic lives in `src/domains/`, not colocated with routes.

Each domain follows this pattern:

```text
src/domains/<name>/
  types.ts    # Shared TypeScript types & enums
  service.ts  # API calls & business logic
  store.ts    # Zustand 5 store (one per domain)
  mocks.ts    # Optional mock data
```

Core domains: `rag`, `assistant`, `spin`, `theater`, `visit`, `report`, `client`, `team`, `session`, `calendar`, `event`, `experience`.

**API routes** live in `src/app/api/` with one route per AI feature (`/rag`, `/ai/chat`, `/ai/spin`, `/ai/theater`, `/ai/visit`, `/ai/report`, `/ai/spin-suggestions`, `/ai/theater/score`). Mock equivalents at `/api/mock/*`.

**UI** uses shadcn components (`src/components/ui/`) with Tailwind CSS v4 and Base UI. Route groups `(dashboard)/` and `(public)/` separate authenticated and unauthenticated layouts.

**State** — Zustand 5 stores per domain; access via each domain's `store.ts`. No Redux or Context for app state.

**Database** — Prisma 7 schema at `prisma/schema.prisma`. Multi-tenant: all records are scoped to `organizationId`. Key models: `Organization`, `User`, `Client`, `Policy`, `VisitPlan`, `SpinSession`, `TheaterSession`, `Report`, `AiUsageLog`. Prisma client is generated into `src/generated/prisma/` and accessed via the singleton at `src/lib/prisma.ts`.

**Internationalization** — Traditional Chinese (zh-TW) only. String translations in `src/lib/i18n/`. App name: "誠問 AI".

## Key Constraints

- **SPIN methodology** is a first-class feature: sessions progress through phases `SITUATION → PROBLEM → IMPLICATION → NEED_PAYOFF`. Preserve this state machine in any changes to `src/domains/spin/`.
- **Theater personas** are typed enums: `CONSERVATIVE`, `SKEPTICAL`, `BUSY`, `EMOTIONAL`. Scoring and turns are tracked server-side.
- **AiUsageLog** must be written for every OpenAI/Anthropic call for cost tracking — see existing API routes for the pattern.
- **Compliance fields** (`complianceChecklist`, `sensitivityLevel`, `kycStatus`) on client/policy models are regulatory requirements — do not remove or make optional.
- The `src/generated/` directory is gitignored and produced by `prisma:generate` — never edit files there manually.
