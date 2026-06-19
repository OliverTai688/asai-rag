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

