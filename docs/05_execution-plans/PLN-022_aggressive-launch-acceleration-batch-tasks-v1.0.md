# 誠問 AI Aggressive Launch Acceleration Batch Tasks v1.0

> 建立日期：2026-06-19  
> 狀態：待執行  
> 研究依據：`RES-021_aggressive-launch-acceleration-research-v1.0.md`  
> 架構依據：`ARC-009_beta-production-boundary-architecture-v1.0.md`  
> 驗收依據：`ACC-014_private-beta-release-gates-v1.0.md`

本計畫把「大幅度積極推進上線」轉成可被 agent 逐張執行的 batch tasks。目標不是直接跳 Level 3 public launch，而是最快達成 **Level 2 Controlled Private Beta**：invite-only、可真實少量試用、三 AI 可控、資料/權限/監控/備份/法遵 evidence 完整，且正式金流與 public signup 預設關閉。

---

## 0. 執行協定

每張卡固定流程：

1. 讀 `RES-021`、`ARC-009`、`ACC-014` 與本卡。
2. 若改 route/layout/middleware/cookies/server component boundary，先讀 `node_modules/next/dist/docs/` 對應 Next.js 文件。
3. 先寫 brief：本卡要降低哪個 release blocker、影響哪些 surface、需要哪些 proof。
4. 實作或文件化；不可開啟 production email/payment/notification/destructive DB/raw audio retention。
5. 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。
6. 依卡片需要跑 Prisma、API、Browser、release gate script。
7. 更新本文件與 AGENTS 對應 workstream；若 AGENTS 有 unrelated dirty changes，先只更新本文件並在 final/report 註明。
8. 留下 report / issue-question / proof。

---

## 1. 進度看板

| 卡片 | 範圍 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| ALA-000 | 文件與 AGENTS workstream 登錄 | ☐ | `RES-021` |
| ALA-001 | Launch scope lock and risk register | [x] | ALA-000 |
| ALA-002 | Private beta account and onboarding path | ☐ | ALA-001, LCH-001 |
| ALA-003 | BFF coverage for beta-critical workflows | ☐ | ALA-001, BFF/RAS context |
| ALA-004 | AI governance and kill-switch hardening | ☐ | LCH-004 |
| ALA-005 | Production observability and incident loop | ☐ | LCH-009 |
| ALA-006 | Legal/compliance beta packet | ☐ | ALA-001 |
| ALA-007 | ECPay test-to-production readiness gap closure | ☐ | billing schema/domain |
| ALA-008 | Beta release candidate evidence pack | ☐ | ALA-002 to ALA-007 |

---

## Batch ALA-000 - 文件與 AGENTS Workstream 登錄

目標：把 aggressive launch acceleration 變成 AGENTS 可撿卡執行的正式 workstream。

- [ ] 新增 `ARC-009_beta-production-boundary-architecture-v1.0.md`。
- [ ] 新增 `PLN-022_aggressive-launch-acceleration-batch-tasks-v1.0.md`。
- [ ] 新增 `ACC-014_private-beta-release-gates-v1.0.md`。
- [ ] 更新 `MAN-000` 文件數量與 `MAN-001` 文件索引。
- [ ] 將本文件的 AGENTS snippet 同步到 `AGENTS.md`；若 `AGENTS.md` 有 unrelated dirty changes，先保留 snippet 在本文件並記錄未同步原因。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

範圍外：不改程式、不改 DB、不啟用 beta feature flag。

### AGENTS.md Workstream Snippet

以下段落可貼入 `AGENTS.md` 的 workstream 區：

```markdown
## Aggressive Launch Acceleration Batch Tasks

Context: 將誠問 AI 從 Level 1/2 foundation 積極推進到 Level 2 Controlled Private Beta。研究依據：`docs/07_research-and-design/RES-021_aggressive-launch-acceleration-research-v1.0.md`；架構規則：`docs/02_architecture-and-rules/ARC-009_beta-production-boundary-architecture-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-022_aggressive-launch-acceleration-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-014_private-beta-release-gates-v1.0.md`。本條只做 private beta launch blocker、release gate、auth/onboarding、BFF critical workflows、AI control、observability、legal/compliance beta packet、ECPay readiness 與 evidence pack；不直接開 public signup、不啟用 production payment、不做 destructive DB operation、不宣稱網路投保/正式保險商品建議。

### Current Aggressive Launch Gaps
- `RES-021` 已判斷下一個積極目標應是 Level 2 Controlled Private Beta，而非直接 Level 3 Public Launch。
- UI / Modern Minimal / AI-first sidebar 已足夠支持 beta；下一步應優先 release blockers。
- Session、DB-backed client CRUD、org aggregate、client portal、super admin/audit、三 AI usage/quota 已有基礎，但缺 beta release command center、invite-only onboarding、AI kill switch、live monitoring proof、legal beta packet、ECPay readiness 與完整 evidence pack。
- Production email/payment/notification/public signup/destructive DB/raw audio retention 仍需 operator approval。

### Batch ALA-000 — 文件與 AGENTS workstream 登錄
- [ ] 新增 `ARC-009_beta-production-boundary-architecture-v1.0.md`。
- [ ] 新增 `PLN-022_aggressive-launch-acceleration-batch-tasks-v1.0.md`。
- [ ] 新增 `ACC-014_private-beta-release-gates-v1.0.md`。
- [ ] 更新 `MAN-000` 文件數量與 `MAN-001` 文件索引。
- [ ] 將本 workstream 同步到 `AGENTS.md`；若 AGENTS 有 unrelated dirty changes，記錄未同步原因。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

### Batch ALA-001 — Launch scope lock and risk register
- [ ] 建立 private beta launch scope lock：advisor SaaS only，不含網路投保/正式商品建議。
- [ ] 建立 beta risk register，至少覆蓋 tenant leak、AI cost、AI advice misuse、client token abuse、billing half-enable、monitoring missing、super admin break-glass。
- [ ] 將 release gates 寫入 platform readiness 或 report checklist。
- [ ] 更新 `RES-016` issue-question，記錄需 operator 決策的 scope、billing、real user invite、real data policy。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

### Batch ALA-002 — Private beta account and onboarding path
- [ ] 建立或補齊 invite-only beta account flow；public signup 預設 waitlist/invite required。
- [ ] Invite accept 後建立/連結 user、organization membership、default workspace。
- [ ] Dev auth header 只在 non-production explicit env 可用。
- [ ] 補 invite token expiry/replay/invalid org proof。
- [ ] Browser/API proof：受邀 member 可進 dashboard；未受邀 user 不能建立 production workspace。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；改 auth/route 時讀 Next docs。

### Batch ALA-003 — BFF coverage for beta-critical workflows
- [ ] 盤點 beta-critical workflows：client、family、policy、visit/interview output、report/share、theater session、member/org settings、client portal response。
- [ ] 補足缺口或建立 explicit blocker matrix，不讓 frontend store 作 production business truth。
- [ ] 建立或更新 `pnpm beta:bff-critical-qa`。
- [ ] API/browser proof 覆蓋 refresh/relogin/new context。
- [ ] 跑 `pnpm demo:runtime-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch ALA-004 — AI governance and kill-switch hardening
- [ ] 建立 per-module AI kill switch：CHAT / INTERVIEW / THEATER。
- [ ] 補 quota/provider-error/disabled/success proof matrix。
- [ ] 確認每次 OpenAI/Anthropic call 寫 `AiUsageLog`，且 error path 不洩漏 raw provider payload。
- [ ] 補 sensitive data reason/risk consent 或 blocked state。
- [ ] 更新 platform readiness AI control gate。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

### Batch ALA-005 — Production observability and incident loop
- [ ] 完成 monitoring ingestion proof，不只文件 runbook。
- [ ] 建立 PII-safe logging/redaction proof。
- [ ] 建立 uptime/health checks：public、member bootstrap、AI health、client portal、platform readiness。
- [ ] 完成 backup/restore proof 與 incident response runbook。
- [ ] 更新 readiness gate：缺 live proof 時 blocked。
- [ ] 跑 `pnpm monitoring:readiness-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch ALA-006 — Legal/compliance beta packet
- [ ] 建立 beta terms addendum、privacy notice、AI data processing notice、client data consent template。
- [ ] 建立 data rights playbook：查詢、修正、刪除、停止處理。
- [ ] 建立 vendor register：OpenAI、Supabase、ECPay、hosting、monitoring。
- [ ] Beta UI/flow 可見 AI disclaimer 與非網路投保/非正式商品建議界線。
- [ ] 更新 issue-question 中需人工/法務核可項。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

### Batch ALA-007 — ECPay test-to-production readiness gap closure
- [ ] 確認 `ENABLE_SELF_SERVE_CHECKOUT=false` default posture。
- [ ] 建立 ECPay test flow proof：payload、CheckMacValue、notify、query、idempotency。
- [ ] Return/OrderResult URL 不直接啟用 plan。
- [ ] HashKey/HashIV 不進 browser bundle。
- [ ] Platform readiness billing gate 顯示 credentials/callback/production approval blocker。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

### Batch ALA-008 — Beta release candidate evidence pack
- [ ] 建立 `pnpm beta:release-candidate-qa`，聚合 critical scripts。
- [ ] Browser QA 覆蓋 dashboard、CRM、interview、theater、reports、team/org settings、super admin、share/client-login。
- [ ] 保存 release evidence report，含 commands、screenshots、API proof、AiUsageLog deltas、DB/Prisma 操作、open blockers。
- [ ] 更新 `AGENTS.md`、`PLN-022`、`RES-016`、必要 report。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma/Browser QA。

### Current Aggressive Launch Blockers
- Production auth provider/email/SSO、public signup policy、beta real-data policy 需 operator 決策。
- Production email/notification/payment/refund、production DB destructive operation、raw audio retention、網路投保範圍擴張需明確 approval。
- ECPay production MerchantID/HashKey/HashIV/callback domain 與 production payment approval 尚未提供。
- 若 AGENTS.md 已有 unrelated dirty changes，先以 `PLN-022` 為單一任務真相，待工作樹可安全同步再更新 AGENTS。
```

---

## Batch ALA-001 - Launch Scope Lock And Risk Register

目標：先鎖定 beta 可承諾與不可承諾的範圍，避免「積極上線」變成無邊界地打開 production risk。

- [x] 建立 private beta launch scope lock：advisor SaaS only，不含網路投保/正式商品建議。
- [x] 建立 beta risk register，至少覆蓋 tenant leak、AI cost、AI advice misuse、client token abuse、billing half-enable、monitoring missing、super admin break-glass。
- [x] 將 `ACC-014` Gate 1-7 寫入 platform readiness 或 report checklist。
- [x] 更新 `RES-016` issue-question，記錄 scope、billing、real user invite、real data policy 的 operator 決策項。
- [x] 若有 UI 文案或 public page 暗示正式保險建議，改成 beta-safe wording 或記 blocker。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

範圍外：不開 signup、不開 payment、不改 AI prompt。

完成註記：2026-06-19 新增 `RPT-004_private-beta-launch-scope-risk-register-v1.0.md`，明確鎖定 Level 2 Controlled Private Beta 為 advisor SaaS only，不含網路投保/網路保險服務、不承諾正式保險商品建議、不開 public signup、不啟用 production payment/email/notification/raw audio。風險表覆蓋 tenant leak、AI cost、AI advice misuse、client token abuse、billing half-enable、monitoring missing、super admin break-glass 等 P0/P1；`ACC-014` Gate 1-7 已轉成 report checklist。已更新 `RES-016` 新增 IQ-025 operator decisions。UI wording scan 未發現需立即改動的 public UI 高風險承諾；ALA-006 仍需補 beta UI/flow disclaimer 可見驗收。

---

## Batch ALA-002 - Private Beta Account And Onboarding Path

目標：建立 invite-only beta account path，讓外部受邀使用者可試用，但 public signup 仍關閉。

- [ ] 盤點既有 `/login`、`/signup`、`/invite/[token]`、Auth.js/Supabase/Auth helper 狀態。
- [ ] 建立或補齊 invite-only beta account flow；public signup 預設 waitlist/invite required。
- [ ] Invite accept 後建立/連結 user、organization membership、default workspace。
- [ ] Dev auth header 只在 non-production explicit env 可用。
- [ ] Invite token expiry/replay/invalid org/used token proof。
- [ ] Browser/API proof：受邀 member 可進 dashboard；未受邀 user 不能建立 production workspace。
- [ ] 更新 issue-question：正式 provider/email/SSO、callback URL、beta participant policy。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；改 auth/route 時讀 Next docs。

範圍外：不做 public self-serve signup、不寄 production email。

進行中註記：2026-06-19 已完成 manual invite token accept BFF slice：新增 `POST /api/invite/[token]/accept`，token 暫採 existing `OrganizationMember.id`；驗證 token exists、email match、`INVITED` status、14-day expiry、replay guard。成功後更新 user/membership 為 active、寫 `acceptedAt`、必要時設 default membership，並寫 `AuditLog(resourceType=ORG_INVITE_ACCEPT)`。新增 `scripts/beta-invite-accept-qa.mjs`，API proof 通過：invalid 404、wrong email 403、valid 200、replay 409、expired 410、audit count 1。Proof report：`RPT-005_private-beta-invite-accept-proof-v1.0.md`。整卡仍未完成：尚缺 invite accept 後建立正式 app session、public signup invite-required/waitlist behavior、Browser QA、正式 provider/email/SSO 決策。

---

## Batch ALA-003 - BFF Coverage For Beta-critical Workflows

目標：確保 beta 會用到的真實工作流都走 server-trusted BFF，而非 frontend/local mock truth。

- [ ] 盤點 beta-critical workflows：client、family、policy、visit/interview output、report/share、theater session、member/org settings、client portal response。
- [ ] 建立 missing BFF blocker matrix，標示已完成、需補、可 beta 降級、不可宣稱。
- [ ] 補足 P0 缺口或建立 explicit staging gate，不讓 frontend store 作 production business truth。
- [ ] 建立或更新 `pnpm beta:bff-critical-qa`。
- [ ] API/browser proof 覆蓋 refresh/relogin/new context。
- [ ] 跑 `pnpm demo:runtime-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不做全站大型重構；全站 BFF 深化仍依 `PLN-019`。

---

## Batch ALA-004 - AI Governance And Kill-switch Hardening

目標：把三 AI 從「可用」推進到「可控、可停、可稽核」。

- [ ] 建立 per-module AI kill switch：CHAT / INTERVIEW / THEATER。
- [ ] 補 quota/provider-error/disabled/success proof matrix。
- [ ] 確認每次 OpenAI/Anthropic call 寫 `AiUsageLog`，且 error path 不洩漏 raw provider payload。
- [ ] 補 sensitive data reason/risk consent 或 blocked state。
- [ ] Prompt/tool command allowlist proof。
- [ ] 更新 platform readiness AI control gate。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

範圍外：不改 SPIN 狀態機；Theater Route B schema migration 仍依 `PLN-015`。

---

## Batch ALA-005 - Production Observability And Incident Loop

目標：讓 private beta 有 live observability、redaction、backup/restore 與 incident loop，不只文件聲明。

- [ ] 完成 monitoring ingestion proof；若缺 DSN/provider，readiness gate 保持 blocked。
- [ ] 建立 PII-safe logging/redaction proof。
- [ ] 建立 uptime/health checks：public、member bootstrap、AI health、client portal、platform readiness。
- [ ] 完成 backup/restore proof 與 incident response runbook。
- [ ] 更新 readiness gate：缺 live proof 時 blocked。
- [ ] 跑 `pnpm monitoring:readiness-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不承諾 production on-call SLA；先做 private beta evidence。

---

## Batch ALA-006 - Legal / Compliance Beta Packet

目標：讓 beta 可以處理少量真實使用情境時，有清楚告知、同意、資料權利與 AI 免責。

- [ ] 建立 beta terms addendum、privacy notice、AI data processing notice、client data consent template。
- [ ] 建立 data rights playbook：查詢、修正、刪除、停止處理。
- [ ] 建立 vendor register：OpenAI、Supabase、ECPay、hosting、monitoring。
- [ ] Beta UI/flow 可見 AI disclaimer 與非網路投保/非正式商品建議界線。
- [ ] 高敏感資料進 AI 的 reason/risk consent 或 blocked state 與 `ARC-009` 對齊。
- [ ] 更新 issue-question 中需人工/法務核可項。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

範圍外：不做正式法務 sign-off；只建立 beta packet 與 blocker。

---

## Batch ALA-007 - ECPay Test-to-production Readiness Gap Closure

目標：金流不阻擋 private beta，但 public launch 前的 ECPay server-trusted flow 缺口要收斂。

- [ ] 確認 `ENABLE_SELF_SERVE_CHECKOUT=false` default posture。
- [ ] 建立 ECPay test flow proof：payload、CheckMacValue、notify、query、idempotency。
- [ ] Return/OrderResult URL 不直接啟用 plan。
- [ ] HashKey/HashIV 不進 browser bundle。
- [ ] Manual beta plan activation 若實作需寫 audit。
- [ ] Platform readiness billing gate 顯示 credentials/callback/production approval blocker。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

範圍外：不啟用 production payment；不處理 refund/receipt production flow。

---

## Batch ALA-008 - Beta Release Candidate Evidence Pack

目標：建立可交付的 private beta release candidate evidence pack。

- [ ] 建立 `pnpm beta:release-candidate-qa`，聚合 critical scripts。
- [ ] Browser QA 覆蓋 dashboard、CRM、interview、theater、reports、team/org settings、super admin、share/client-login。
- [ ] 保存 release evidence report，含 commands、screenshots、API proof、AiUsageLog deltas、DB/Prisma 操作、open blockers。
- [ ] 更新 `AGENTS.md`、`PLN-022`、`RES-016`、必要 report；若 AGENTS 有 unrelated dirty changes，記錄未同步原因。
- [ ] Final go/no-go summary：哪些 gates pass、哪些 blocked、是否可進 invite-only beta。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma/Browser QA。

範圍外：不宣稱 Level 3 public launch ready。

---

## Current Aggressive Launch Blockers

- Production auth provider/email/SSO、public signup policy、beta real-data policy 需 operator 決策。
- Production email/notification/payment/refund、production DB destructive operation、raw audio retention、網路投保範圍擴張需明確 approval。
- ECPay production MerchantID/HashKey/HashIV/callback domain 與 production payment approval 尚未提供。
- 若 `AGENTS.md` 已有 unrelated dirty changes，先以 `PLN-022` 為單一任務真相，待工作樹可安全同步再更新 AGENTS。
