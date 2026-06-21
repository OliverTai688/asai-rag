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
