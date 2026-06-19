# 誠問 AI Private Beta Release Gates v1.0

> 建立日期：2026-06-19  
> 適用範圍：`PLN-022_aggressive-launch-acceleration-batch-tasks-v1.0.md`。  
> 關聯研究：`RES-021_aggressive-launch-acceleration-research-v1.0.md`。  
> 關聯架構：`ARC-009_beta-production-boundary-architecture-v1.0.md`。

---

## 1. 驗收目標

本框架定義 Level 2 controlled private beta 的 release gates。每張 `ALA` 卡完成時，不只要功能可用，也要留下可追溯 evidence：

- 命令輸出或 QA script 結果。
- API proof。
- Browser desktop/mobile proof。
- DB/Prisma 操作紀錄。
- Screenshot/report path。
- Open blocker 或 operator decision。

不得把 mock success、dev-only shortcut 或文件聲明寫成 production/beta gate 通過。

---

## 2. Gate 1：Scope And Legal Boundary

- [ ] Launch scope lock 明確：advisor SaaS only，不含網路投保/網路保險服務。
- [ ] Beta terms/privacy/AI disclaimer 可被 beta user 看到。
- [ ] 使用者進入 beta 前有 invite-only 或明確受控 access。
- [ ] 自助正式金流關閉。
- [ ] Production-like env 的 `/api/mock/*` 關閉。
- [ ] 若允許少量真實 client data，需有資料使用告知與刪除/停止處理流程。

Hard stop:

- UI 或文件暗示 AI 可替代正式保險商品建議。
- Public signup 或 production checkout 在沒有 gate proof 時開啟。

---

## 3. Gate 2：Identity, Role, Tenant

- [ ] App member session、org admin session、client portal session、platform session 分離。
- [ ] Invite token expiry/replay/invalid org proof。
- [ ] Dashboard/member routes unauth 會導向 login 或回 401。
- [ ] Org manager 只能 aggregate/scoped，不看 client detail。
- [ ] Client portal token 打 workspace/member/org/platform APIs 401/403。
- [ ] App session 打 super admin/platform APIs 403。
- [ ] Platform sensitive read 需要 break-glass reason/scope/expiry/audit。
- [ ] Role-aware sidebar 與 route/API guard 對齊；sidebar hide/show 不是唯一權限控制。

Required proof:

- API negative tests for member/manager/client/platform.
- Browser proof for at least member, org admin, client portal, super admin surface.

---

## 4. Gate 3：Business Runtime

- [ ] Client CRUD DB-backed，新增/刷新/重登入仍存在。
- [ ] Family/policy/compliance write path 保留合規欄位。
- [ ] Visit/interview/report/share beta-critical workflows DB-backed。
- [ ] Theater session/turn/feedback 有 beta minimum persistence，或明確 staging gate 不宣稱 production-ready。
- [ ] Zustand 只作 UI/cache，不作 production business truth source。
- [ ] Production runtime 不 import `mocks.ts` 或 seed fixtures 作 business data source。
- [ ] Client portal share token authorized/invalid/expired/revoked proof。

Required commands:

```bash
pnpm demo:runtime-audit
pnpm demo:relogin-qa
pnpm demo:member-write-qa
```

若 command 尚不存在，對應 ALA 卡需建立或記錄替代 script。

---

## 5. Gate 4：AI Control

- [ ] CHAT / INTERVIEW / THEATER success path 寫 `AiUsageLog`。
- [ ] CHAT / INTERVIEW / THEATER provider error path 寫 error evidence。
- [ ] Quota exceeded 429 在 provider call 前阻擋，不寫 fake usage。
- [ ] Per-module kill switch proof：CHAT / INTERVIEW / THEATER 可獨立關閉。
- [ ] AI request 不信任前端 org/user/client scope。
- [ ] Sensitive data reason/risk consent 或 blocked state。
- [ ] Output DTO 區分 fact / inference / unknown。
- [ ] Prompt/tool command allowlist proof。
- [ ] AI usage/cost readiness panel 不洩漏 raw prompt/provider payload。

Required proof:

- API proof for 200, 401, 400, 429, disabled, provider error.
- DB count proof for `AiUsageLog` success/error deltas.

---

## 6. Gate 5：Observability And Ops

- [ ] Monitoring ingestion proof exists for staging/private beta.
- [ ] Error reporting redacts Authorization, cookie, raw prompt, private payload, secret.
- [ ] Uptime/health checks cover public, member bootstrap, AI health, client portal, platform readiness.
- [ ] Backup/restore proof exists with timestamp.
- [ ] Incident response runbook covers AI outage, suspected data leak, auth incident, billing incident.
- [ ] Release rollback path exists.
- [ ] Readiness API marks missing live evidence as blocked.

Required proof:

- `pnpm monitoring:readiness-qa` or successor command.
- Backup/restore evidence path.
- Screenshot/API proof of readiness panel.

---

## 7. Gate 6：Billing Safety

- [ ] `ENABLE_SELF_SERVE_CHECKOUT=false` by default for beta.
- [ ] Public pricing indicates checkout availability from server, not hardcoded frontend copy.
- [ ] ECPay test flow has CheckMacValue generation/verification proof before public launch.
- [ ] Return/OrderResult URL does not activate plan.
- [ ] Server notification/query confirmation controls activation.
- [ ] Duplicate notification idempotency proof.
- [ ] Manual beta plan activation writes audit if implemented.

Hard stop:

- Any frontend redirect directly activates paid plan.
- HashKey/HashIV exposed to browser.
- Production credentials used without operator approval.

---

## 8. Gate 7：Beta Evidence Pack

Before declaring a private beta release candidate:

- [ ] `pnpm exec tsc --noEmit --pretty false` pass.
- [ ] `pnpm lint:changed` pass.
- [ ] `pnpm prisma:validate` pass if schema changed.
- [ ] `pnpm prisma:generate` pass if schema changed.
- [ ] `pnpm beta:release-candidate-qa` pass or documented equivalent script matrix.
- [ ] Browser QA covers dashboard, CRM, interview, theater, reports, team/org settings, super admin, share/client-login.
- [ ] Console error 0 for checked pages, or known non-blocker documented.
- [ ] No horizontal overflow on desktop/mobile checked pages.
- [ ] Report file saved under `docs/2_agent-input/generated/agent-loop/reports/` or `docs/06_audits-and-reports/`.
- [ ] Issue-question updated for unresolved operator decisions.
- [ ] Commit and push succeeded, or failure reason documented.

---

## 9. AGENTS Card Completion Checklist

Each `ALA` card may be marked `[x]` only when:

- The card's acceptance items are complete.
- Relevant gates above are updated or explicitly not applicable.
- `AGENTS.md` and `PLN-022` statuses are synchronized, unless `AGENTS.md` is dirty with unrelated changes; in that case, report the blocker and keep `PLN-022` as the source for next sync.
- Verification commands were run and results recorded.
- No hard stop condition remains.

