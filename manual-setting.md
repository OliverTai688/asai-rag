# Manual Setting

Last updated: 2026-06-21

This file tracks operator-only environment and external-console settings. Do not commit real secret values.

## Current Operator Decisions

- Git push remains paused. Codex should validate, stage, and local-commit only until the operator explicitly restores push.
- External NANDA / third-party registry publication remains paused. Internal AgentFacts-style manifests and local adapter dry-runs are allowed; public discovery, signing, and cross-organization agent access are not.
- Live AI provider proof is approved for implementation, but every OpenAI / Anthropic success and error path must write `AiUsageLog`.
- Public lead capture is approved as part of `BFF-305a`.
- Production/payment/email/notification code may be implemented by Codex, but real environment secrets, provider console setup, and production-side effect enablement remain operator manual settings.
- AI Meeting / notes is approved to enter the formal product workstream. Raw audio storage is still not approved.

## Required Environment Settings

Set these in local/staging/production secrets managers as appropriate:

- `DATABASE_URL`: Prisma pooled connection string.
- `DIRECT_URL`: Prisma direct connection string for migration / db push / generate workflows.
- `AUTH_SECRET` or `NEXTAUTH_SECRET`: authentication secret.
- `NEXT_PUBLIC_APP_URL`: canonical app URL.
- `ALLOW_DEV_AUTH_HEADER`: must be `false` or unset outside local/dev QA.
- `ENABLE_DEMO_LOGIN`: keep disabled outside controlled demo environments.

## Public Lead Capture

- `PUBLIC_LEAD_HASH_SALT`: secret salt for hashing public lead email/IP/user-agent proof keys. If omitted, code falls back to `AUTH_SECRET`, then a development fallback.
- Ensure the `public_leads` table exists before enabling production traffic.
- Current endpoint: `POST /api/public/lead`.
- Current consent version: `public-beta-2026-06-21`.
- No real email notification is sent by the first implementation.

## AI Provider Live Proof

- `OPENAI_API_KEY`: required before OpenAI-backed provider proof.
- `ANTHROPIC_API_KEY`: required before Anthropic-backed provider proof.
- `ENABLE_ROUTE_B_THEATER_PROVIDER`: only set when Route B director/character/feedback live provider proof is intentionally being run.
- Live provider proof must record usage/cost evidence and `AiUsageLog` for success/error paths.

## Email / Notification

- `RESEND_API_KEY`: required for real invite/support/notification email.
- `EMAIL_FROM`: verified sender address/domain.
- `ENABLE_REAL_INVITE_EMAIL`: only enable after sender domain verification and QA.
- Production notification delivery should remain off until retry/idempotency/failure proof exists.

## ECPay / Payment

Production payment remains off until ECPay credentials and callback proof exist:

- `ECPAY_MERCHANT_ID`
- `ECPAY_HASH_KEY`
- `ECPAY_HASH_IV`
- Production callback domain for notify/query/result URLs.

Required proof before real payment enablement:

- Server-side CheckMacValue generation.
- Notify callback verification.
- Query confirmation.
- Duplicate notify idempotency.
- Refund/void/manual adjustment runbook.

## AI Meeting / Notes

- First formal slice should validate and commit AMM-owned files separately.
- `InterviewKind.CLIENT_MEETING` and `InterviewMeetingSummary` migration require confirmed local/development/staging DB target before db push.
- Raw audio retention remains disabled unless legal/compliance approval is added.
- Supabase pgvector setup is manual before vector retrieval can be claimed.
