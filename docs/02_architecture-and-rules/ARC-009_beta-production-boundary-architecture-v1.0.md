# 誠問 AI Beta / Production Boundary Architecture v1.0

> 建立日期：2026-06-19  
> 狀態：架構規則，供 `PLN-022` aggressive launch acceleration 執行  
> 研究依據：`docs/07_research-and-design/RES-021_aggressive-launch-acceleration-research-v1.0.md`  
> 驗收依據：`docs/08_acceptance-and-qa/ACC-014_private-beta-release-gates-v1.0.md`

---

## 1. 架構目標

本文件定義誠問 AI 從 Level 1 staging demo 推進到 Level 2 controlled private beta，再延伸到 Level 3 public launch 的環境、權限、資料、AI、金流與營運邊界。核心原則：

- **Beta 可以積極，但不能偽裝成 production**。
- **Private beta 允許少量真實使用，但必須 invite-only、可停用、可追蹤、可回滾**。
- **Public launch 需要更高的金流、法遵、監控、資安與支援證據，不得用 beta proof 直接替代**。

---

## 2. Launch Levels

| Level | 目標 | 可接受 | 不可接受 |
| --- | --- | --- | --- |
| Level 1 Staging Demo | 內部或受控展示 | Demo account、seed data、staging auth shortcut | 真實客戶資料、正式收費、公開註冊 |
| Level 2 Controlled Private Beta | 少量受邀真實試用 | Invite-only、少量真實資料、quota、monitoring、人工支援 | Public signup、自助正式收費、網路投保承諾 |
| Level 3 Public Launch | 正式公開使用 | Public signup、正式金流、production controls、法遵 sign-off | 未驗證監控、半套金流、未完成資料權利流程 |

### 2.1 Private Beta Scope Lock

Level 2 private beta 的產品範圍固定為：

- 保險顧問 SaaS 輔助工具。
- AI 輔助訪談、演練、整理與報告分享。
- 不構成保險商品建議、法律建議、稅務建議或財務建議。
- 不包含網路投保或網路保險服務。
- Client portal 可先以 token-scoped access 運作，不承諾完整 client account。
- Billing 可關閉自助付款，以免費 beta 或人工合約運作。

若 operator 要解除以上任一限制，必須新增 issue-question 與對應 release gate，不可在一般 batch 中順手打開。

---

## 3. Environment Boundary

| Capability | Development | Staging / Private Beta | Production / Public Launch |
| --- | --- | --- | --- |
| Dev auth header | 可用，需 explicit env | 預設不可用；若用於 QA 必須隔離 | 禁止 |
| Mock API | 可用 | Production-like env 必須關閉 | 禁止 |
| Demo seed reset | 可用，需 idempotent | 僅 demo namespace，不刪真實資料 | 禁止 destructive reset |
| Real user invite | 可測試 | Invite-only beta | Public signup 或 invite |
| Real payment | 禁止 | 自助收費 off；ECPay test only | 需 CheckMacValue/notify/query/idempotency proof |
| AI provider | 可用 | 可用，需 quota/kill switch/logging | 可用，需 monitoring/cost controls |
| Raw audio retention | 禁止 | 禁止，除非 legal approval | 需 formal retention policy |

### 3.1 Required Environment Flags

新增或整理 beta/prod 邊界時，優先使用明確 env flag，不依賴 route 名稱猜測：

```text
APP_ENV=development|staging|production
ALLOW_DEV_AUTH_HEADER=false
ALLOW_MOCK_API=false
ENABLE_PUBLIC_SIGNUP=false
ENABLE_SELF_SERVE_CHECKOUT=false
ENABLE_CLIENT_PORTAL_ACCOUNTS=false
ENABLE_LEGACY_SPIN_NAV=false
ENABLE_LEGACY_THEATER_DEMO=false
AI_CHAT_ENABLED=true
AI_INTERVIEW_ENABLED=true
AI_THEATER_ENABLED=true
```

Rules:

- Production-like env 的 default posture 必須保守：public signup off、self-serve checkout off、mock off、dev auth off。
- Feature flag 只能放寬 UI/flow exposure；server policy guard 不可只靠 flag。
- 任何正式 email、notification、payment/refund、production DB destructive operation 都需 operator approval。

---

## 4. Identity And Session Boundary

四種 session 不得混用：

| Session | Entry | Data boundary |
| --- | --- | --- |
| App member session | `/login`、invite accept | Own/assigned clients, member workflows |
| Org admin session | app session + owner/admin/manager membership | Aggregate/coaching/org settings; manager scoped/read-only |
| Client portal session | share token or client cookie | Authorized client-safe report/response only |
| Platform session | `/super-admin/login` | Platform metadata/aggregate; sensitive read requires break-glass |

Rules:

- Browser 傳入的 `organizationId`、`userId`、`role`、`unitId` 不可信。
- Every BFF route derives tenant/scope from session/token.
- Sidebar visibility is not authorization.
- Client token hitting member/org/platform APIs must return 401/403.
- App session hitting platform APIs must return 403.
- Platform session does not automatically become a member session; impersonation requires reason, scope, expiry, and audit.

---

## 5. Data Boundary

### 5.1 Allowed In Private Beta

Private beta 可允許：

- 少量真實 client metadata。
- 顧問輸入的訪談素材、準備包、報告草稿。
- Share token/client response events。
- AI output、memory、reflection、usage log。

前提：

- Beta terms/privacy/AI disclaimer 已接受。
- 客戶資料使用告知已可見。
- 可刪除或停止處理資料。
- Backup/restore 與 incident flow 已有 evidence。

### 5.2 Sensitive Data Rules

- `complianceChecklist`、`sensitivityLevel`、`kycStatus` 不得刪除或 optional。
- 高敏感 client data 進 AI 前需要 reason/risk consent 或明確 blocked state。
- AI output 必須區分 fact / inference / unknown。
- Org manager aggregate 不得回 client name、phone/email、policy number、report body、transcript、private note。
- Client portal DTO 不得回 internal notes、raw prompt、provider payload、coaching note。

---

## 6. AI Boundary

AI 模組必須可控：

```text
Request
  -> session/scope
  -> capability/quota/kill-switch
  -> input validation/redaction
  -> provider call
  -> AiUsageLog success/error
  -> safe DTO / persistence
```

Rules:

- 每次 OpenAI/Anthropic call 必須寫 `AiUsageLog`。
- Quota exceeded must block before provider call and must not write fake usage.
- Kill switch must return friendly disabled response and must not call provider.
- Provider error must write error evidence when a provider call was attempted.
- Prompt/tool commands must use allowlist.
- Raw secret, token, provider payload, private prompt must not be exposed in response/report/log.

---

## 7. Billing Boundary

Private beta:

- `ENABLE_SELF_SERVE_CHECKOUT=false` by default.
- Plan can be activated by manual audited admin action or free beta contract.
- ECPay can be tested in sandbox/test mode only.

Public launch:

```text
Create order
  -> ECPay redirect
  -> server notification
  -> CheckMacValue verification
  -> idempotent transaction ledger
  -> query confirmation when needed
  -> plan activation
  -> audit billing state change
```

Rules:

- Frontend redirect never activates plan.
- Missing ECPay credentials/callback domain keeps billing gate blocked.
- HashKey/HashIV never enter browser bundle.
- Duplicate notification must not double activate.

---

## 8. Observability And Incident Boundary

Private beta cannot open without:

- Monitoring ingestion proof.
- PII-safe logging/redaction proof.
- Uptime/health check for public, member, AI, client portal, platform readiness.
- Backup/restore evidence.
- Incident response runbook.
- Release rollback path.

Readiness gates must show blocked when proof is missing. A written plan is useful, but it is not equivalent to live evidence.

---

## 9. AGENTS Execution Rules

When executing `PLN-022`:

- Prefer beta release blockers over cosmetic UI polish.
- Do not enable public signup, production payment, real email/notification, production DB destructive operation, or raw audio retention without explicit operator approval.
- If a task changes Next.js route/layout/middleware/cookies/server component boundaries, read `node_modules/next/dist/docs/` relevant docs before coding.
- Each round must run `pnpm exec tsc --noEmit --pretty false` and `pnpm lint:changed`.
- If schema changes, run `pnpm prisma:validate` and `pnpm prisma:generate`; only push DB when target is confirmed allowed.
- Every completed card must leave code/docs/proof/report/issue-question.

