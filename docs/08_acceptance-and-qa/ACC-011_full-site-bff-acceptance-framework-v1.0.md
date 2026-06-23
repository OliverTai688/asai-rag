# 誠問 AI Full-site BFF Acceptance Framework v1.0

> 建立日期：2026-06-19  
> 狀態：驗收框架，供 `PLN-019` 各卡使用  
> 研究依據：`docs/07_research-and-design/RES-018_full-site-bff-architecture-research-v1.0.md`  
> 架構依據：`docs/02_architecture-and-rules/ARC-008_full-site-bff-architecture-v1.0.md`

---

## 1. 驗收原則

Full-site BFF 驗收重點不是 endpoint 數量，而是資料邊界、session scope、DTO safety、refresh persistence 與 audit evidence。

每張 BFF 卡至少要交付：

- code 或文件變更。
- API proof：401/403/404/400/200/201/429/503 依情境覆蓋。
- Cross-role proof：member、manager/org admin、client token、platform user 至少覆蓋受影響角色。
- Private leakage proof：response 不含 secret、raw prompt、provider payload、foreign org/client data。
- Browser proof：若改 UI，desktop/mobile console error 0、無水平 overflow、refresh/new context persistence。
- `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

---

## 2. Surface Gates

### 2.1 Public Web

- Anonymous request 可讀 public-safe pricing/status。
- Public response 不含 provider secret、billing raw config、private plan cost、internal plan notes。
- Pricing CTA 與 DB/provider availability 一致。
- Public lead/status endpoint 若實作，需 rate-limit/spam/consent proof。

#### 2.1.1 Public Status / CTA Availability Gates

`BFF-305a` 必須證明 public pages 使用 public-safe server contract，而不是只靠 frontend hardcoded availability：

- `GET /api/public/status` 或等價 BFF 匿名可讀、cache-aware，且回 `maintenance`、`aiAvailability`、`checkoutAvailability`、`primaryCta`、`leadCapture`、`legalStatus`、`updatedAt`。
- `/api/public/pricing` 與 public status 共用同一 checkout / CTA availability source；pricing 不得宣稱 status 已標為 disabled / unavailable 的 checkout 或 CTA 狀態。
- Public response 不得包含 private plan cost、provider raw config、billing internal state、payment transaction data、tenant/client data、secret/token、raw prompt 或 raw provider payload。
- Landing / pricing CTA 必須依 BFF contract 呈現 private beta、invite、contact sales、checkout disabled、unavailable 等狀態。
- `/api/public/lead` 若同輪實作，必須具 rate limit、honeypot/spam protection、consent version、allowlisted persistence 與 abuse/failure proof；2026-06-21 起 BFF-305a 已獲 operator 決策納入 lead capture。
- Public status endpoint 不可被宣稱為 NANDA / third-party public discovery 或 external registry；agent publication、credential signing、cross-org agent access 仍需走 NAP gate 與 operator approval。
- Browser/API proof 需覆蓋 status 200、pricing 200、CTA consistency、checkout disabled/sandbox posture、private sentinel 0、desktop/mobile no overflow。
- 此 gate 不批准 real payment、real email、real notification 或 production write。

Evidence（2026-06-21 BFF-305a）：`PUBLIC_STATUS_QA_BASE_URL=http://127.0.0.1:3044 pnpm public:status-qa` 已通過 status/CTA/lead gate，89/89 checks passed。Proof 覆蓋 `GET /api/public/status` 200、`GET /api/public/pricing` 200、public cache header、DB-backed `PlanConfig` consistency、pricing/status checkout 與 CTA mode 一致、checkout action disabled、production payment disabled、public lead capture enabled、lead consent validation 400、honeypot 202 且不入庫、valid lead 201 且 `public_leads` +1、response 不 echo email、same email third request 429、external registry `not_public_discovery`、status/pricing/lead private sentinel 0、landing/pricing desktop/mobile no overflow、browser console error 0。截圖：`docs/06_audits-and-reports/screenshots/lv3-public-bff/bff-305a-landing-desktop.png`、`bff-305a-landing-mobile.png`、`bff-305a-pricing-desktop.png`、`bff-305a-pricing-mobile.png`。

#### 2.1.2 Public Status Degraded Fallback Gates

`BFF-305b` 必須證明 public status 在 DB unavailable 時安全降級，而不是讓 public landing / cross-flow proof 直接 500：

- DB unavailable fallback 只允許回 public-safe degraded contract，必須明確標示 `dbAvailable=false` 或等價 evidence，且不能回 DB host、connection string、secret、tenant/client/payment data、provider raw config、raw prompt 或 raw provider payload。
- Degraded mode 下 checkout/payment/provider AI/real notification 均不可被宣稱可用；CTA 必須維持 private-beta/contact/unavailable 等安全狀態。
- `/api/public/pricing` 與 public status 在 degraded mode 下仍需一致；pricing 不得繞過 degraded disabled posture。
- App shell notification fetch endpoint 必須存在或改為正確 BFF；disabled/no-notification posture 只能回 empty/safe DTO，不得模擬真實 delivery success。
- Proof 需覆蓋 DB unavailable status 200 或 page graceful render、pricing/status CTA consistency、notification route no 404、private sentinel 0、no provider call/no fake `AiUsageLog`，以及 clean cross-flow browser 不因 public status 讀取或 notification BFF 缺口起不來。
- 此 gate 不代表 production DB outage policy、real payment/email/notification enablement、provider AI availability 或 external NANDA/public discovery 已批准。

Evidence（2026-06-23 BFF-305b）：`pnpm public:status-degraded-qa` 已通過 39/39 checks。Proof 使用 invalid DB URL 啟動 dev server，驗證 `GET /api/public/status` 200、`source=degraded_local`、`dbAvailable=false`、`degradedReason=database_unavailable`、checkout/payment/AI/lead persistence disabled、`GET /api/public/pricing` 200 且 fallback plans/CTA 與 status 一致、`GET /api/bff/notifications` 200 且 no-delivery empty DTO、landing/pricing page 在 DB unavailable 下不 500、status/pricing/notification private sentinel 0。此 proof 不呼叫 provider、不寫 DB、不產生 fake `AiUsageLog`、不啟用 real notification/payment/email。

### 2.2 Member App

- Unauthenticated request returns 401 or redirects to login.
- Member request derives org/user/unit from server session.
- Member cannot read/write foreign organization or unauthorized client.
- CRM DTO keeps `complianceChecklist`、`sensitivityLevel`、`kycStatus`.
- Refresh/new browser context shows DB-backed data, not browser storage-only data.

#### 2.2.1 CRM Related-list Recovery Gates

`BFF-103d` 的 related-list DTO 已有 partial implementation；若 DB/DNS 中斷，僅可記為 blocked/partial，不得宣稱完成。恢復驗收必須額外證明：

- `GET /api/clients/[id]/related-lists` 由 current member session 推導 org/member/unit/client scope；不信任前端傳入的 organization/member/client scope。
- DTO 覆蓋 policies、timeline、reports、gap-analysis、previsit/theater readiness signals，並保留 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- Response/page 不含 raw report body、raw provider payload、policyNumber、email/phone sentinel、private transcript、raw metadata。
- Gap-analysis / report / previsit handoff 消費 facts / inferences / unknowns 與 source references；inference 不得被標成 confirmed fact。
- Cross-role proof 覆蓋 member owner success 與 manager/foreign 403 或 404；org aggregate 權限不得升格為 member client-detail 權限。
- Browser proof 覆蓋 policies、timeline、gap-analysis 至少 desktop/mobile no overflow 與 refresh/new-context persistence。
- No-provider proof 顯示 `AiUsageLog` count unchanged；若任何 related-list action 後續接 AI provider，success/error path 必須另寫 `AiUsageLog`。
- 若 Supabase DB/DNS 無法連線，只能提交 proof-plan 或 blocked report，不得把 fixture/mock output 當 DB-backed proof。

Recovery evidence（2026-06-21）：`DEMO_QA_BASE_URL=http://localhost:3000 pnpm bff:crm-related-lists-qa` 已通過上述恢復 gates。DB-backed proof 建立 demo/test client、family member、policy、visit plan 與 report，驗證 member 200/201、manager 403、DTO 合規欄位保留、raw report body / raw section field / email / phone / policyNumber 不外洩、policies/timeline/gap-analysis/reports desktop no overflow、gap-analysis mobile no overflow、`AiUsageLog` count 147->147。後續若 DB/DNS 再中斷，新的 proof 仍需重新跑同等命令，不得沿用舊截圖宣稱當前通過。

### 2.3 Org Admin

- Member without org role gets 403.
- Manager gets aggregate/scoped data only.
- Org response does not include client name, phone/email, policy detail, report body, transcript, private note.
- Org writes create audit records and enforce plan limits.

### 2.4 Client Portal

- Missing/invalid/expired/revoked token gets 401/404.
- Client token cannot access `/api/workspace/*`、`/api/member/*`、`/api/org/*`、`/api/platform/*`.
- Authorized token only receives client-safe report sections and CTA.
- Response/event payload is whitelisted; unsafe keys are not persisted.

### 2.5 Platform Admin

- App session is rejected by platform APIs.
- Platform metadata APIs do not expose sensitive client content by default.
- Impersonation/break-glass requires reason, scope, expiry, actor/target.
- Sensitive read writes audit proof.

#### 2.5.1 Platform BFF Completion Gates

`BFF-304a` must prove platform session separation before any platform release-readiness or break-glass claim is accepted:

- App/member/org/client portal sessions calling platform APIs return 401/403; sidebar hide/show is not accepted as the permission proof.
- Platform session success returns only organization metadata, plan/status/readiness aggregates, AI usage aggregates, and audit metadata by default; it must not return client names, phone/email, report body, transcript, policy number, provider raw payload, token, secret, or raw payment data.
- Sensitive read paths must write `AuditLog` with actor, resource, reason, scope, and a response-visible proof id.
- Impersonation/break-glass requests require reason, target, scope, expiry, actor, and risk acceptance; missing or expired scope must fail closed.
- API proof must cover app session rejected, platform fixture/session success, sensitive read audit created, break-glass invalid input rejected, and response sentinel checks.
- If live platform auth/session is unavailable, a deterministic fixture/source proof is acceptable only as fallback and must be reported as not a live production/staging platform auth matrix.

---

## 3. AI BFF Gates

Every AI route must prove:

- Session/token scope.
- Capability/quota check before provider call.
- Success `AiUsageLog`.
- Error `AiUsageLog` for provider attempt failures.
- Quota blocked calls do not call provider and do not fake usage.
- Response separates fact/inference/unknown/recommendation where user-facing.
- SPIN state machine remains unchanged.
- Theater legacy contract remains unchanged unless an approved ITA migration card is active.

### 3.1 Theater / RAG Hardening Addendum

`BFF-204` / `BFF-205` 的驗收不得只看 `pnpm ai:bff-audit` route manifest pass；還必須證明 launch posture、source ownership、evidence boundary 與 no-provider posture 沒有被誤寫成正式 AI 成功。

`BFF-204` Theater hardening acceptance：

- Legacy `/api/ai/theater` 與 `/api/ai/theater/score` 保持 session/quota/input/success-error `AiUsageLog` proof，但不得改 legacy persona enum、score JSON 或 SPIN-adjacent contract。
- Route B provider-disabled proof 需明確回 guarded 503 或 deterministic preflight；no-provider path 必須證明不呼叫 provider、不寫 fake `AiUsageLog`。
- `/theater` list/session browser proof 要顯示 staging/demo gate 或 guarded-disabled 狀態；不得宣稱 Route B director/character/feedback live provider 已 production-ready。
- Relationship graph / VisitPlan / quick-capture source 進劇場時要保留 fact / inference / unknown / source reference；人物狀態 proposal 不得直接寫入 confirmed CRM facts。
- 若啟用 live Route B director/character/feedback provider，需 operator 明確批准，且 success/error 都要寫 `AiUsageLog` 後才能把該 provider path 記為 pass。

`BFF-205` Assistant / RAG / Interview hardening acceptance：

- `/api/rag` private-beta disabled posture 必須回 503 guarded disabled、`providerAttempted=false`、RAG `AiUsageLog` count unchanged；不得用 mock answer 或 fake usage 冒充 retrieval proof。
- `/api/ai/chat` persistence / assistant memory 若新增或調整，response/evidence 不得包含 raw tool payload、secret、token、cookie、raw private transcript 或 provider raw payload。
- Interview output / quick-capture / writeback DTO 需維持 fact / inference / unknown / supporting evidence；inference 不得升格為 CRM confirmed fact 或 theater confirmed role fact。
- NANDA / AgentFacts local manifests 只可作 internal capability / source adoption proof；external registry publication、public discovery endpoint、signing、cross-org access 仍需 operator approval。
- Suggested targeted proof set：`pnpm ai:bff-audit`、`pnpm rag:launch-posture-qa`、`pnpm ai:protocol-registry-qa`，加上被改 route 的 401/400/429/503/success/provider-error proof。

Suggested command:

```bash
pnpm ai:bff-audit
```

If the command does not exist yet, the responsible card must create or update it.

---

## 4. Billing BFF Gates

- Browser never receives ECPay HashKey/HashIV.
- Browser does not generate CheckMacValue.
- Return/OrderResult URL does not activate subscription by itself.
- Server notification validates CheckMacValue.
- Query confirmation can reconcile pending transactions.
- Duplicate notification is idempotent.
- Transaction ledger and audit evidence exist.
- Production credentials/callback domain are explicitly approved before live mode.

`BFF-401a` disabled/sandbox proof is acceptable before full payment launch only if:

- `POST /api/billing/checkout` requires current member auth and rejects unauthenticated requests with 401.
- Invalid or non-self-serve plans return 400; server must not trust client amount, organizationId, ownerId, provider, or raw payment payload.
- Disabled posture returns 503 and explicitly proves `orderCreated=false`, `transactionCreated=false`, `providerAttempted=false`, and no redirect payload.
- Response and logs do not expose HashKey, HashIV, CheckMacValue, provider raw payload, payment token, card data, raw payment data, raw cookie, secret, or env values.
- DB proof confirms disabled posture does not insert `subscription_orders` or `payment_transactions`.
- This proof does not satisfy BFF-402: notification validation, query confirmation, duplicate notify idempotency, refund/void/manual review, and real plan activation remain blocked.

Evidence（2026-06-21 BFF-401a）：`BILLING_CHECKOUT_QA_BASE_URL=http://127.0.0.1:3046 pnpm billing:checkout-qa` covers unauth 401, invalid/non-self-serve plan 400, disabled 503, no-store/request-id, no provider attempt, no redirect payload, no order/transaction insert, redirect-only activation disabled, browser checksum generation disabled, and payment/private sentinel 0.

`BFF-402a` visit reminder disabled proof is acceptable before real notification launch only if:

- `/api/notifications/visit-reminder` no longer returns fake `success: true` delivery or "sent successfully" copy.
- The route validates input, requires current member auth, and returns 401 for unauthenticated requests and 400 for invalid payloads.
- Disabled notification posture returns 503 and explicitly proves `providerAttempted=false`, `jobQueued=false`, `realEmailSent=false`, `realNotificationSent=false`, and `mockSuccess=false`.
- Auth database outage fails closed with a 503 unavailable error and still proves provider delivery was not attempted.
- Response and logs do not echo recipient email or expose raw cookie, secret, token, provider payload, private transcript, payment data, or env values.
- This proof does not satisfy full BFF-402: ECPay notification validation, query confirmation, duplicate notify idempotency, refund/void/manual review, and real notification delivery remain blocked until provider/env proof is completed.

Evidence（2026-06-23 BFF-402a）：`pnpm notification:visit-reminder-disabled-qa` covers source removal of mock success, unauth 401, invalid input 400, DB-unavailable 503 fail-closed with `providerAttempted=false`, no-store/request-id, and private sentinel 0. The current local Supabase DB target returned Prisma `P1001 DatabaseNotReachable`, so authenticated disabled DTO runtime proof is deferred to rerun the same command when DB is reachable; the source DTO remains guarded-disabled and no provider/job/email/notification was attempted.

`BFF-402b` ECPay notify/query disabled skeleton proof is acceptable before full payment callback/query launch only if:

- `POST /api/billing/ecpay/notify` accepts a provider-shaped payload but fails closed with 503 disabled until CheckMacValue validation, server query confirmation, and ledger idempotency are implemented.
- Notify invalid input returns 400; repeated notify payloads expose duplicate-safe disabled posture without creating transactions, updating orders, activating plans, or writing ledger rows.
- `POST /api/billing/ecpay/query` is server-owned/authenticated; invalid input returns 400, unauthenticated requests return 401, and auth DB outage fails closed without provider query attempts.
- Response and logs do not expose HashKey, HashIV, raw CheckMacValue, provider raw payload, payment token, card data, raw payment data, raw cookie, secret, token, OTP, or env values.
- This proof does not satisfy full BFF-402: real CheckMacValue validation, ECPay server query confirmation, transaction ledger persistence, refund/void/manual review, and real plan activation remain blocked until provider/env/DB proof is completed.

Evidence（2026-06-23 BFF-402b）：`pnpm billing:ecpay-disabled-qa` passed 57/57 checks. Proof covers source boundary, notify invalid 400, notify form payload 503 disabled, duplicate notify 503 disabled with duplicate-safe/no-ledger/no-transaction/no-activation posture, query invalid 400, query unauth 401, DB-unavailable authenticated query 503 `BILLING_ECPAY_AUTH_UNAVAILABLE` with `providerAttempted=false`, no-store/request-id, and payment/private sentinel 0. No ECPay provider call, no DB write, no fake `AiUsageLog`, no real payment, and no production checkout enablement was attempted.

`BFF-403a` subscription capability BFF read contract is acceptable as a partial subscription gate only if:

- `GET /api/billing/subscription` requires current member auth and rejects unauthenticated requests with 401.
- DTO is versioned and includes current plan/status, server-side capability, quota, seat/collaborator/unit usage, checkout disabled status, and activation boundary.
- The route/repository may read session/org/member/unit data but must not create subscription orders, payment transactions, checkout redirects, ledger rows, provider calls, or fake `AiUsageLog` records.
- Response must prove redirect-only activation and browser plan assumptions are not allowed; plan activation remains allowed only from confirmed transaction/query paths.
- Response and logs must not expose HashKey, HashIV, CheckMacValue, provider raw payload, provider account identifiers, payment token, card data, raw payment data, raw cookie, secret, token, OTP, or env values.
- Workspace bootstrap may include the same server capability contract, but org/member UI consumption and real plan-change persistence remain separate proof requirements.

Evidence（2026-06-23 BFF-403a）：`BILLING_SUBSCRIPTION_QA_BASE_URL=http://127.0.0.1:3058 pnpm billing:subscription-capability-qa` passed. Proof covers source boundary, unauth 401, no-store/request-id, DB-unavailable authenticated 503 `BILLING_SUBSCRIPTION_UNAVAILABLE` with `providerAttempted=false`, payment/private sentinel 0, and repository no-write checks. No ECPay/OpenAI/Anthropic provider call, no DB write, no fake `AiUsageLog`, no real payment, and no production checkout/plan activation was attempted. Authenticated 200 + bootstrap payload proof can be rerun by operator with the same command when DB is reachable; it is not a product decision blocker.

`BFF-403b` subscription capability UI consumption is acceptable only if:

- Workspace bootstrap, org/member navigation/render models, and adjacent settings/team/billing UI consume the server `subscription` contract or `/api/billing/subscription` DTO for plan capability, quota, seat/collaborator/unit usage, checkout disabled status, and activation boundary.
- Browser UI must not infer paid-plan capability, checkout availability, or plan activation from hardcoded plan labels, redirect-only status, URL params, local storage, or client-provided organization/member scope.
- Unavailable subscription reads must fail closed or render a guarded unavailable state; they must not enable checkout, member invite, unit creation, client portal, branding, or AI quota affordances that the server contract does not allow.
- The slice must not create subscription orders, payment transactions, checkout redirects, ledger rows, provider calls, fake `AiUsageLog`, or real plan activation.
- Proof should include a targeted static/API/browser command such as `pnpm billing:subscription-ui-qa` or equivalent, plus `pnpm exec tsc --noEmit --pretty false` and `pnpm lint:changed`; DB-authenticated 200 proof can be rerun by the operator with the existing BFF-403a command when DB is reachable, but it must not replace this source/UI consumption slice.

---

## 5. Data-source Inventory Gates

The full-site inventory is acceptable only when every production route/page has:

- Source classification: DB/BFF, server component query, mock API, Zustand local, static fixture, mixed.
- BFF endpoint owner or explicit deferred blocker.
- Session type.
- DTO name or response contract.
- Read/write capability.
- Audit/usage/event requirement.
- QA script or manual browser proof.

No production page may use `src/domains/**/mocks.ts` or `seed-fixtures.ts` as business truth source without a blocker note.

---

## 6. Browser QA Matrix

When UI changes are included:

| Viewport | Required checks |
| --- | --- |
| Desktop 1440x1000 | no console error, no horizontal overflow, expected data visible, refresh persistence |
| Mobile 390x844 | no console error, no horizontal overflow, primary action reachable, text not clipped |

Required contexts:

- Fresh browser context.
- Cleared local/session storage.
- Relogin or demo auth header where applicable.
- Authorized and unauthorized role/session.

---

## 7. Reporting Template

Each BFF implementation report should include:

```markdown
## <date> - <card id> <title>

### Goal
- ...

### Changes
- ...

### Data / DB / Prisma
- ...

### API Proof
- ...

### Browser Proof
- ...

### Privacy / Boundary Proof
- ...

### Validation
- `pnpm exec tsc --noEmit --pretty false`: pass/fail
- `pnpm lint:changed`: pass/fail
- Prisma / Browser / custom QA: pass/fail

### Remaining Blockers
- ...

### Next Recommended Entry
- ...
```
