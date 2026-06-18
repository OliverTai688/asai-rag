# 誠問 AI Launch Readiness Implementation Batch Tasks v1.0

> 建立日期：2026-06-19  
> 狀態：待執行  
> 研究依據：`RES-012_launch-readiness-gap-research-v1.0.md`、`RES-013_four-surface-launch-implementation-research-v1.0.md`  
> 架構依據：`ARC-006_role-permission-route-architecture-v1.0.md`、`ACC-005_cross-surface-responsibility-matrix-v1.0.md`  
> 驗收依據：`ACC-004_multi-role-saas-architecture-acceptance-framework-v1.0.md`、`ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`

本計畫把「距離上線還差什麼」轉成可被 agent 逐張執行的 batch tasks。目標不是一次做到完整 production，而是先達成 **Level 1 受控 Staging Demo**：

> demo member 清空 browser storage 後登入仍看到 DB seed data；可新增客戶並刷新仍存在；可使用三個 AI（問誠問 AI、AI 顧問陪談、AI 劇場演練）；每次 AI 呼叫寫 `AiUsageLog`；demo manager 只看彙總；demo client 只看授權內容。

---

## 0. Hard Rules

- 不信任前端傳入的 `organizationId`、`userId`、role、unit scope；一律從 server session 推導。
- `member settings` 與 `org settings` 分離：`/settings` 不可改 org-wide policy，`/org/settings` 不可讀 member private preferences。
- Member admin 用 detail APIs；org admin 用 aggregate APIs；front office 用 token/client-scoped APIs；super admin 用 platform APIs。
- Org manager 只看彙總與輔導指標，不看 member 客戶姓名、保單明細、逐字稿或私聊內容。
- 每次 OpenAI/Anthropic call 必須寫 `AiUsageLog`。
- Client/policy 合規欄位不可刪除、不可改 optional。
- SPIN 狀態機不可破壞。
- Theater Route B 若進入實作，需照 `ARC-004` / `PLN-015`，不保留 legacy fallback 作新主流程。
- `src/generated/` 永遠不要手改。

---

## 1. 進度看板

| 卡片 | 主題 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| LCH-001 | Session / workspace foundation | [x] | Auth.js provider/env |
| LCH-002 | DB-backed client CRUD | [ ] | LCH-001 |
| LCH-003 | Member settings and workspace preferences | [ ] | LCH-001 |
| LCH-004 | Three AI production minimum | [ ] | LCH-001、LCH-002、ITA Route B decision |
| LCH-005 | Demo account relogin QA | [ ] | LCH-001、LCH-002、LCH-004 |
| LCH-006 | Front office / share / client portal | [ ] | LCH-001、LCH-002 |
| LCH-007 | Org admin aggregate and org settings APIs | [ ] | LCH-001、LCH-002、LCH-003 |
| LCH-008 | Super admin / audit / impersonation | [ ] | LCH-001、PSA-009 |
| LCH-009 | Production controls and release QA | [ ] | LCH-001-LCH-008 |

---

## Batch LCH-001 - Session / Workspace Foundation

目標：建立四種 surface 的 session 邊界，讓後續 API 都能從 server 端推導 user/org/role/scope。

- [x] 接 Auth.js / NextAuth server auth foundation；讀取 `AUTH_SECRET`，並保留正式 provider/email/SSO 接入點。
- [x] 建立 `src/lib/auth/session.ts`：`getAppSession()`、`getClientSession()`、`getPlatformSession()`。
- [x] 建立 `src/lib/auth/current-workspace.ts`：`requireCurrentMember()`、`requireOrgAdmin()`、`requirePlatformUser()`、`requireClientPortalUser()`。
- [x] 建立 `src/lib/auth/policies.ts`：`canReadClientDetail()`、`canWriteClient()`、`canReadOrgAggregate()`、`canUseAiModule()`、`canBreakGlass()`。
- [x] 建立 `/api/workspace/bootstrap`，回傳 current user、default organization、membership role、unit scope、plan capability、AI quota summary。
- [x] 加上 dashboard/member routes 的 guard：未登入導 `/login`。
- [x] 加上 org admin routes guard：`/team` 與未來 `/org/*` 需 owner/admin/manager；manager 只能 aggregate/scoped。
- [x] 加上 `/super-admin/*` platform-only guard，不接受一般 app session。
- [x] 若新增或改動 `middleware.ts` / route group / cookies，先讀 `node_modules/next/dist/docs/` 相關 Next.js 16 文件。
- [x] 跑 `pnpm lint:changed`；若動 Prisma schema 跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。

完成註記：2026-06-19 已完成 server session/policy/bootstrap foundation，並以 `ALLOW_DEV_AUTH_HEADER=true` + `x-asai-demo-user-email: demo.member@asai.local` 驗證 `/api/workspace/bootstrap` 200；無 header 401。同日依 operator 新方向改採 Auth.js / NextAuth：新增 `src/auth.ts`、`/api/auth/[...nextauth]` 與 Session type augmentation；`/api/auth/session` 200、`/api/auth/providers` 200。2026-06-19 補 route guard：dashboard/member routes 由 `(dashboard)/layout.tsx` server guard 未登入導 `/login`；`/team` server wrapper 套 owner/admin/manager guard；`/super-admin` platform-only guard，不接受一般 app session。Production `AUTH_SECRET`、正式 provider/email/SSO 與 client portal session contract 仍列為後續 release blocker / LCH-006。

範圍外：不做完整 CRUD；不接 ECPay；不改 AI prompt；不改 Theater schema。

阻擋：需要 operator 補 `AUTH_SECRET`、正式 provider/email/SSO 決策與 callback URL；client portal session contract 另待 LCH-006。

---

## Batch LCH-002 - DB-backed Client CRUD

目標：完成「資料能正常新增」的第一條垂直切片：member 可新增客戶、刷新後仍存在，Zustand 只作 cache/UI state。

- [x] 建立 `GET /api/clients`，依 current member policy 回傳 own/assigned clients。
- [x] 建立 `POST /api/clients`，由 server session 寫入 `organizationId`、`ownerId`、`unitId`。
- [x] 建立 `GET/PATCH /api/clients/[id]`，套 `canReadClientDetail()` / `canWriteClient()`。
- [x] 新增 client 時一併建立或初始化 `ComplianceChecklist`，不得省略 `kycStatus` / suitability / consent contract。
- [x] 建立最小 family/policy endpoint 或在 client detail API 內提供 transaction write path。
- [x] 將 CRM list/detail store/page 改為 server API / cache-first；localStorage 不再是 client business source of truth。
- [x] 清空 browser storage 後登入 demo member，仍可從 DB 看到 seeded clients。
- [ ] 新增一筆 client，重新整理後仍存在。
- [x] 跑 `pnpm demo:runtime-audit`，確認 production runtime 不直接 import `src/domains/*/mocks.ts` 作業務資料。
- [x] 跑 `pnpm lint:changed`；動 schema 才跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。

進行中註記：2026-06-19 已建立 `src/lib/clients/client-dto.ts`、`src/lib/clients/client-repository.ts`、`GET/POST /api/clients`、`GET/PATCH /api/clients/[id]`；新增路徑由 server session 推導 `organizationId`、`ownerId`、`unitId`，並在 transaction create 中初始化合規 checklist。`/crm` list、`AddClientDialog`、CRM detail layout/overview/subpages 已改 BFF/cache-first；新 browser context + `x-asai-demo-user-email: demo.member@asai.local` 可看到 DB seeded client `王大明`。已驗收 401/200 list/200 detail/400 validation；`/crm/c_wang`、relationships、policies、gap-analysis、reports、timeline desktop Browser console error 0 / no overflow。已補 `POST /api/clients/[id]/family-members`、`POST /api/clients/[id]/policies` 與 service methods；relationships dialog child mode 接 family member BFF，API 401/400 proof 與 dialog open Browser proof 通過。Operator 於 2026-06-19 已批准目前 Supabase target 可做 LCH demo/test 非破壞性寫入 proof；下一輪可補「新增一筆 client，重新整理後仍存在」。

範圍外：不做 org aggregate；不做 client portal；不改 SPIN/Theater。

---

## Batch LCH-003 - Member Settings And Workspace Preferences

目標：把現有 `/settings` 定義並落地為 member settings，不混入 org-wide policy。

- [ ] 建立 `/settings` 的 page design/implementation brief：個人資料、通知、AI 偏好、個人整合、預設 workspace、個人版 collaborator 入口。
- [ ] 建立 `GET/PATCH /api/member/settings`，只讀寫 current user/member-scoped settings。
- [ ] 若需要 schema，新增 member settings 或使用 `User.metadata` / membership metadata 的明確 contract；動 schema 跑 Prisma 驗收。
- [ ] `/settings` 不得修改 organization branding、billing、unit policy、client portal、org AI quota、compliance defaults。
- [ ] Personal plan owner 可看到 collaborator 入口，但 invite/limit 必須呼叫 server-side plan policy。
- [ ] AI 偏好只作個人預設；若與 org policy 衝突，以 org policy 為上限。
- [ ] 更新 sidebar/route naming，確保 member settings 與 org settings 不混淆。
- [ ] 跑 `pnpm lint:changed`；必要時保存 desktop/mobile 截圖。

範圍外：不做 org settings；不做 billing；不做 super admin settings。

---

## Batch LCH-004 - Three AI Production Minimum

目標：至少三個 AI 可正常使用，且每次呼叫可計量、可限額、可保存必要結果。

- [ ] `/api/ai/chat` 改為 session-scoped，不信任前端自由傳入 org/user；寫 `AiUsageLog`。
- [ ] 建立 `AssistantConversation` / `AssistantMessage` persistence；assistant tool commands 依 surface allowlist。
- [ ] `/api/ai/interview` 與 `/api/ai/interview/outputs` 由 server session 注入 org/user/client scope，並保存 session/material/output draft。
- [ ] `/interview` 頁面按鈕層完成 Browser QA：成功生成、console error 0、無水平 overflow。
- [ ] Theater 採 Route B 最小版：多角色/旁白 NPC/visibility/五視角回饋，或在 staging 明確加 legacy demo gate，不宣稱新版 Theater production ready。
- [ ] Theater 每次 director/character/feedback AI call 寫 `AiUsageLog`。
- [ ] 建立 `canUseAiModule()` 與 quota check：超限回 429，UI 顯示友善訊息。
- [ ] 三個 AI 都驗證 success/error path 寫 `AiUsageLog`。
- [ ] 跑 `pnpm lint:changed`；動 Theater schema 需 `pnpm prisma:validate`、`pnpm prisma:generate` 與 migration/rollback note。

範圍外：不做 RAG 真檢索；不做 ECPay；不讓 org admin 讀逐字稿。

阻擋：Theater Route B 若開 schema migration，需要先依 `PLN-015` / `ARC-004` 執行；OpenAI quota 必須可用。

---

## Batch LCH-005 - Demo Account Relogin QA

目標：讓體驗帳號真的從 DB 取資料，不靠 browser storage 或本地 mock。

- [ ] 確認 `pnpm demo:preflight` 通過。
- [ ] 確認 `pnpm demo:seed:reset` 可重跑且不刪真實資料。
- [ ] 將 demo users 連到 Supabase Auth `supabase_auth_id`。
- [ ] 清空 browser storage 後，用 demo member 登入，仍看到 DB seeded clients、visit plans、reports、sessions。
- [ ] demo member 新增 client、建立至少一筆 AI output，刷新後仍存在。
- [ ] demo manager 登入，只看到 aggregate/coaching/unit/member health，不看到客戶明細。
- [ ] demo client 登入，只看到 authorized share/client portal content。
- [ ] 確認 `/api/mock/*` 在 production-like env 預設不可用。
- [ ] 保存 QA evidence：commands、必要 screenshots、AiUsageLog count before/after。
- [ ] 跑 `pnpm lint:changed`。

範圍外：不開放 public self-serve signup；不給外部 super admin demo。

阻擋：Supabase Auth env/callback；staging access policy。

---

## Batch LCH-006 - Front Office / Share / Client Portal

目標：讓前台不只是頁面，而是 token/client-scoped 的客戶安全入口。

- [ ] 建立 `GET /api/public/pricing`，讀 DB-backed plan capability 或 stable server config。
- [ ] 建立 `GET /api/share/[token]`，只回 client-safe report sections、org/unit branding、CTA、合規免責。
- [ ] 建立 `POST /api/share/[token]/events`，寫 `ShareEvent`，IP/user-agent 只存 hash 或 safe metadata。
- [ ] `/share/[token]` 改用 DB-backed token lookup，不再依賴 local store。
- [ ] 建立 `GET /api/client-portal/bootstrap`，client session 只看授權資料。
- [ ] 建立 `POST /api/client-portal/responses`，支援客戶補資料/回覆/預約意向的最小 contract。
- [ ] client session 不可進 member/org admin。
- [ ] share/client portal desktop/mobile QA：invalid token、expired token、authorized token、client login。
- [ ] 跑 `pnpm lint:changed`。

範圍外：不做完整客戶自助保單管理；不讓 client 看內部 AI prompt/coaching note。

---

## Batch LCH-007 - Org Admin Aggregate And Org Settings APIs

目標：完成 org admin 可用的 aggregate/coaching surface 與 org settings，並保持 manager 不看明細。

- [ ] 建立 `GET /api/org/overview`：unit/member health、今日輔導隊列、usage summary。
- [ ] 建立 `GET /api/org/members`：member metadata、role、seat、unit、last active；不得回客戶明細。
- [ ] 建立 `GET /api/org/coaching`：完成率、卡關階段、常見異議、訓練建議。
- [ ] 建立 `GET /api/org/ai-usage`：module/member/unit aggregate usage。
- [ ] 建立 `GET/POST /api/org/units`：HQ/region/branch tree，套 plan `maxUnits`。
- [ ] 建立 `POST /api/org/invites`：server-side plan limit check，個人協作者上限由 `PlanConfig.maxCollaborators` 控制。
- [ ] 建立 `/org/settings` 或 `/team/settings` surface；管理 organization profile、branding、client portal、compliance defaults、billing visibility、AI quota。
- [ ] 建立 `GET/PATCH /api/org/settings`；owner/admin 可寫，manager 只能 scoped read-only/limited write。
- [ ] Org settings 不得讀 member private settings；org admin API 不得回 client name、phone/email、policy number、report body、SPIN/Theater transcript。
- [ ] Browser QA `/team` + org settings desktop/mobile；console error 0、無水平 overflow。
- [ ] 跑 `pnpm lint:changed`；動 schema 才跑 Prisma 驗收。

範圍外：不做 super admin break-glass；不做 member detail API。

---

## Batch LCH-008 - Super Admin / Audit / Impersonation

目標：建立 platform-only 營運後台，不讓 super admin 成為無痕萬能後門。

- [ ] 完成 platform session guard；`/super-admin/*` 不接受 app session。
- [ ] 建立 `GET /api/platform/organizations` 與 `GET /api/platform/organizations/[id]`，預設只回 tenant summary/health。
- [ ] 建立 `GET /api/platform/ai-usage`，跨租戶成本與錯誤 aggregate。
- [ ] 建立 `PATCH /api/platform/plan-configs/[plan]`，寫 `AuditLog`。
- [ ] 建立 `POST /api/platform/impersonation`：actor、target org/user、reason、scope、expiresAt 必填。
- [ ] 建立 impersonation end/revoke flow，所有 impersonated read/write 寫 `AuditLog` 並帶 `impersonationSessionId`。
- [ ] 建立 `POST /api/platform/break-glass`，敏感內容查詢需 reason、scope、expiry、audit。
- [ ] 建立 `GET /api/platform/audit-logs`，支援 tenant/action/sensitivity filter。
- [ ] 建立 platform settings 區塊：feature flags、provider policy、support policy；敏感改動寫 audit。
- [ ] 跑 `pnpm lint:changed`；動 schema 跑 Prisma 驗收。

範圍外：不讓 support 無限制讀客戶內容；不接正式金流前不得宣稱 billing production complete。

阻擋：platform auth/MFA/staging access；ECPay credentials 若碰 billing reconcile。

---

## Batch LCH-009 - Production Controls And Release QA

目標：讓受控 staging demo 進入 private beta 前，有基本成本、錯誤、合規與回滾控制。

- [ ] 建立 AI quota/cost alert：至少 DB counter + UI quota warning；若導入 Redis rate limit 需文件化。
- [ ] 對所有 OpenAI/Anthropic routes 做 audit，列出 module、provider、success/error `AiUsageLog` evidence。
- [ ] 關閉 production-like env 的 `/api/mock/*`，保留 dev/test guard。
- [ ] 建立 Sentry 或等價錯誤監控方案；若暫不接，寫入 release blocker。
- [ ] 建立 DB backup/restore 與 migration rollback note。
- [ ] 建立 privacy / terms / AI disclaimer 最小頁面或 release blocker。
- [ ] 建立 ECPay test flow checklist；正式收費開關預設關閉。
- [ ] 做 full smoke：front office、member admin、org admin、super admin、client portal。
- [ ] 保存 release QA evidence：desktop/mobile screenshots、console error、API status、AiUsageLog count、demo relogin result。
- [ ] 跑 `pnpm lint:changed`、`pnpm exec tsc --noEmit --pretty false`、`pnpm prisma:validate`、`pnpm demo:preflight`、`pnpm demo:runtime-audit`。

範圍外：不宣稱 full public production，除非 LCH-001-LCH-008 與 operator blockers 全部解除。

---

## Current Launch Blockers

- Supabase Auth public env、service role、callback URL 尚未完整接入。
- Demo account relogin 仍未完成：清空 browser storage 後需證明資料從 DB 還原。
- 多數 AI routes 尚未完成 `AiUsageLog` success/error 實寫驗證。
- Theater Route B 尚未 migration；若用 legacy Theater，只能標 staging demo。
- ECPay credentials、callback domain、CheckMacValue、notification/query API 尚未完成。
- Super admin platform auth/MFA/staging access 仍需 operator。
- Production monitoring、privacy/terms/AI disclaimer、backup/rollback 尚未完成。

---

## Suggested Review Nodes

依 `PLN-016`，建議不要把 LCH 全部塞進單一 PR：

1. RN-LCH-001：session/workspace/auth foundation。
2. RN-LCH-002：member client CRUD + member settings。
3. RN-LCH-003：three AI usage/persistence/quota。
4. RN-LCH-004：demo relogin + front office/share/client portal。
5. RN-LCH-005：org admin aggregate + org settings。
6. RN-LCH-006：super admin/audit/production controls。
