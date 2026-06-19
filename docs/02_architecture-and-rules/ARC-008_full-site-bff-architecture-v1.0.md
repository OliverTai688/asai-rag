# 誠問 AI Full-site BFF Architecture v1.0

> 建立日期：2026-06-19  
> 狀態：架構規則，供 `PLN-019` 執行  
> 研究依據：`docs/07_research-and-design/RES-018_full-site-bff-architecture-research-v1.0.md`  
> 驗收依據：`docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md`

---

## 1. 架構目標

本文件定義誠問 AI 從 partial BFF 推進到 full-site BFF 的實作規則。Full-site BFF 的核心不是新增一層抽象，而是把正式 business runtime 的信任邊界固定在 server：

```text
UI / Zustand cache
  -> Surface-specific BFF route handlers
  -> Use-case / repository / policy layer
  -> Prisma / AI provider / payment / external service
```

### 1.1 完成定義

- Production page 不以 mock、seed fixture、localStorage 或 Zustand 作 business truth source。
- 每個 surface 都有明確 BFF contract：public web、member app、org admin、client portal、platform admin。
- 所有 tenant/user/unit/client scope 由 server session/token 推導，不信任前端傳入。
- BFF 回傳 UI-ready DTO，不直接回 Prisma model、provider payload、raw prompt、secret、private metadata。
- AI、billing、share、client response、org write、platform break-glass 皆有 server-side authorization、quota/audit/usage evidence。

---

## 2. Surface Ownership

| Surface | UI routes | BFF namespace | Session/token | Default data boundary |
| --- | --- | --- | --- | --- |
| Public web | `/`、`/pricing`、`/privacy`、`/terms` | `/api/public/*` | anonymous | Public-safe marketing/pricing/status only |
| Member app | `/dashboard`、`/crm`、`/pre-visit`、`/interview`、`/spin`、`/theater`、`/reports`、`/issues`、`/settings` | `/api/workspace/*`、`/api/member/*`、`/api/clients/*`、`/api/visits/*`、`/api/reports/*`、`/api/issues/*`、`/api/ai/*` | app member session | Own/assigned client detail, member-scoped writes |
| Org admin | `/team`、`/team/settings` | `/api/org/*` | owner/admin/manager app session | Aggregate, unit/member metadata, org settings; no client private detail by default |
| Client portal | `/share/[token]`、`/client-login` | `/api/share/*`、`/api/client-portal/*` | share token or client portal cookie | Token-scoped client-safe report/response only |
| Platform admin | `/super-admin` | `/api/platform/*` | platform session | Platform metadata/aggregate; sensitive read requires break-glass |

### 2.1 Naming Rules

- Do not create generic catch-all APIs such as `/api/data` or `/api/runtime`.
- Reuse an endpoint only when the consumer has the same session type, same data boundary, and same DTO privacy level.
- Do not use member detail APIs to serve org manager aggregate views.
- Do not use public/share APIs to serve authenticated member pages.

---

## 3. Standard BFF Flow

Every BFF route must follow this order unless a file-level note explains why it differs:

```text
1. Parse request
2. Resolve session/token
3. Derive tenant/scope server-side
4. Validate input with schema
5. Check policy/capability/quota
6. Execute use-case/repository
7. Map to surface DTO
8. Write audit/usage/event if needed
9. Return consistent response or error
```

### 3.1 Scope Rules

- `organizationId`, `ownerId`, `userId`, `unitId`, `clientId`, `role` are not trusted when sent by browser.
- Member BFF uses `requireCurrentMember()`.
- Org BFF uses `requireOrgAdmin()` and policy helpers such as `canReadOrgAggregate()`.
- Client portal BFF uses `requireClientPortalUser()` or token lookup.
- Platform BFF uses `requirePlatformUser()`; impersonation/break-glass must carry reason and audit evidence.

### 3.2 DTO Rules

- DTOs must be surface-specific.
- DTOs must keep legally required fields where relevant: `complianceChecklist`, `sensitivityLevel`, `kycStatus`.
- Public/client portal DTOs must remove internal notes, raw AI prompts, provider payload, private scoring fields, policy numbers unless explicitly authorized.
- Org aggregate DTOs must not include client names, phone/email, report body, transcript, policy detail, or private notes.

---

## 4. Directory Conventions

短期沿用現有 `src/lib/<domain>/*-repository.ts` pattern，不做大型搬家。新增 BFF 時優先使用：

```text
src/app/api/<surface-or-domain>/.../route.ts
src/lib/<domain>/<domain>-repository.ts
src/lib/<domain>/<domain>-dto.ts
src/lib/<domain>/<domain>-schemas.ts
src/lib/auth/current-workspace.ts
src/lib/auth/policies.ts
src/lib/api/errors.ts
src/lib/api/response.ts
src/lib/api/sanitize.ts
```

Rules:

- `route.ts` handles protocol/session/contract, not large Prisma composition.
- Repository/use-case handles query, transaction, policy-adjacent business rules, and DTO mapping.
- Browser domain services call BFF and hydrate cache.
- Zustand is UI state/cache, not production business storage.
- Mock APIs and `mocks.ts` can remain for dev/test but must not be production-like truth source.

---

## 5. Cross-cutting Controls

### 5.1 API Response / Error

New BFF routes should converge on shared helpers for:

- auth error response
- validation error response
- not found / forbidden response
- request id / trace metadata
- no-store cache headers for private data
- safe payload sanitization

Existing routes can migrate incrementally. Do not do a broad mechanical rewrite without a specific batch card.

### 5.2 Audit / Usage

Required evidence:

- OpenAI/Anthropic calls: `AiUsageLog` success/error.
- Share/client portal events: safe event payload, no raw private payload.
- Org writes: `AuditLog` with actor, organization, resource, reason when relevant.
- Platform sensitive reads: break-glass/impersonation audit.
- Billing: transaction ledger and provider notification/query proof.

### 5.3 AI Module Rules

- All `/api/ai/*` routes must be session-scoped or explicitly client/public-token scoped.
- Every provider call writes `AiUsageLog`; quota-blocked calls must not call provider or fake usage.
- SPIN state machine must remain `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF`.
- Theater legacy enum/scoring contract must not be changed outside approved ITA migration tasks.

### 5.4 Billing Rules

- Browser must not generate ECPay CheckMacValue.
- Checkout activation must trust server notification/query confirmation, not browser redirect.
- Production ECPay credentials/callback domain require operator approval.

---

## 6. Implementation Gates

Before a card is marked complete:

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint:changed`
- Prisma validate/generate only when schema changes
- Targeted API proof for auth, validation, success, forbidden/not-found where applicable
- Browser proof when a user-facing surface changes
- Report/update note in `PLN-019` and `AGENTS.md`

