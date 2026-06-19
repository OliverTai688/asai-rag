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
| LCH-002 | DB-backed client CRUD | [x] | LCH-001 |
| LCH-003 | Member settings and workspace preferences | [x] | LCH-001 |
| LCH-004 | Three AI production minimum | [ ] | LCH-001、LCH-002、ITA Route B decision |
| LCH-005 | Demo account relogin QA | [ ] | LCH-001、LCH-002、LCH-004 |
| LCH-006 | Front office / share / client portal | [ ] | LCH-001、LCH-002 |
| LCH-007 | Org admin aggregate and org settings APIs | [x] | LCH-001、LCH-002、LCH-003 |
| LCH-008 | Super admin / audit / impersonation | [x] | LCH-001、PSA-009 |
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
- [x] 新增一筆 client，重新整理後仍存在。
- [x] 跑 `pnpm demo:runtime-audit`，確認 production runtime 不直接 import `src/domains/*/mocks.ts` 作業務資料。
- [x] 跑 `pnpm lint:changed`；動 schema 才跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。

完成註記：2026-06-19 已建立 `src/lib/clients/client-dto.ts`、`src/lib/clients/client-repository.ts`、`GET/POST /api/clients`、`GET/PATCH /api/clients/[id]`；新增路徑由 server session 推導 `organizationId`、`ownerId`、`unitId`，並在 transaction create 中初始化合規 checklist。`/crm` list、`AddClientDialog`、CRM detail layout/overview/subpages 已改 BFF/cache-first；新 browser context + `x-asai-demo-user-email: demo.member@asai.local` 可看到 DB seeded client `王大明`。已驗收 401/200 list/200 detail/400 validation；`/crm/c_wang`、relationships、policies、gap-analysis、reports、timeline desktop Browser console error 0 / no overflow。已補 `POST /api/clients/[id]/family-members`、`POST /api/clients/[id]/policies` 與 service methods；relationships dialog child mode 接 family member BFF，API 401/400 proof 與 dialog open Browser proof 通過。Operator 於 2026-06-19 已批准目前 Supabase target 可做 LCH demo/test 非破壞性寫入 proof；同日建立 demo/test client `cmqjsnwbf00005061en7zsevh`，`POST /api/clients` 201，重新 `GET /api/clients` 可找到，`GET /api/clients/cmqjsnwbf00005061en7zsevh` 200 且合規 checklist 初始化為 `MISSING`。

範圍外：不做 org aggregate；不做 client portal；不改 SPIN/Theater。

---

## Batch LCH-003 - Member Settings And Workspace Preferences

目標：把現有 `/settings` 定義並落地為 member settings，不混入 org-wide policy。

- [x] 建立 `/settings` 的 page design/implementation brief：個人資料、通知、AI 偏好、個人整合、預設 workspace、個人版 collaborator 入口。
- [x] 建立 `GET/PATCH /api/member/settings`，只讀寫 current user/member-scoped settings。
- [x] 若需要 schema，新增 member settings 或使用 `User.metadata` / membership metadata 的明確 contract；動 schema 跑 Prisma 驗收。
- [x] `/settings` 不得修改 organization branding、billing、unit policy、client portal、org AI quota、compliance defaults。
- [x] Personal plan owner 可看到 collaborator 入口，但 invite/limit 必須呼叫 server-side plan policy。
- [x] AI 偏好只作個人預設；若與 org policy 衝突，以 org policy 為上限。
- [x] 更新 sidebar/route naming，確保 member settings 與 org settings 不混淆。
- [x] 跑 `pnpm lint:changed`；必要時保存 desktop/mobile 截圖。

完成註記：2026-06-19 新增 `OrganizationMember.settings` nullable JSON contract；`GET/PATCH /api/member/settings` 只讀寫 current membership settings。`/settings` UI 已改為 member-scoped 個人設定，不含 org branding/billing/unit/client portal/quota/compliance policy 寫入；個人協作者入口只顯示 server-side plan policy 結果，未直接邀請；AI daily insight 上限由 `PlanConfig.monthlyAiQuota` 推導。驗收：Prisma validate/generate/db push、TypeScript、lint:changed、build、API GET/PATCH/GET persistence proof、desktop/mobile browser proof 通過。

範圍外：不做 org settings；不做 billing；不做 super admin settings。

---

## Batch LCH-004 - Three AI Production Minimum

目標：至少三個 AI 可正常使用，且每次呼叫可計量、可限額、可保存必要結果。

- [x] `/api/ai/chat` 改為 session-scoped，不信任前端自由傳入 org/user；寫 `AiUsageLog`。
- [x] 建立 `AssistantConversation` / `AssistantMessage` persistence；assistant tool commands 依 surface allowlist。
- [x] `/api/ai/interview` 與 `/api/ai/interview/outputs` 由 server session 注入 org/user/client scope，並保存 session/material/output draft。
- [x] `/interview` 頁面按鈕層完成 Browser QA：成功生成、console error 0、無水平 overflow。
- [x] Theater 採 Route B 最小版：多角色/旁白 NPC/visibility/五視角回饋，或在 staging 明確加 legacy demo gate，不宣稱新版 Theater production ready。
- [~] Theater 每次 director/character/feedback AI call 寫 `AiUsageLog`。
- [~] 建立 `canUseAiModule()` 與 quota check：超限回 429，UI 顯示友善訊息。
- [x] 三個 AI 都驗證 success/error path 寫 `AiUsageLog`。
- [ ] 跑 `pnpm lint:changed`；動 Theater schema 需 `pnpm prisma:validate`、`pnpm prisma:generate` 與 migration/rollback note。

進行中註記：2026-06-19 完成 `/api/ai/chat` session-scoped production slice：current member session 注入 organization/user/unit，route 不接受前端 org/user；success stream 結束後寫 `AiUsageLog`、`AssistantConversation`、`AssistantMessage`，並 increment organization `monthlyAiUsed`。驗收：`POST /api/ai/chat` 200；DB proof `CHAT usage=1`、`success_usage=1`、`assistant_conversations=1`、`assistant_messages=2`、`monthly_ai_used=1`；`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm build` 通過；`/dashboard` desktop/mobile Browser proof console error 0、無水平 overflow。

進行中註記：2026-06-19 續完成 `/api/ai/interview` 與 `/api/ai/interview/outputs` session-scoped production slice：server session 注入 organization/user/unit，前端不再送 `organizationId`；success path 寫 `AiUsageLog` 與 `InteractionEvent` 作訪談回合/輸出草稿 evidence，並 increment organization `monthlyAiUsed`。驗收：`POST /api/ai/interview` 200；`POST /api/ai/interview/outputs` 200；DB proof `INTERVIEW usage=5`、`success_usage=3`、`interaction_events=2`、latest sources `api/ai/interview/outputs`/`api/ai/interview`；`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm build` 通過；`/interview` desktop/mobile Browser proof console error 0、無水平 overflow。

進行中註記：2026-06-19 補 quota 429 proof：`pnpm demo:preflight` 通過；demo member default org `demo_org_asai_personal` 原始 `monthly_ai_used=3`、`monthly_ai_quota=200`，測試時暫設為滿額後呼叫 `/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs`，三者皆回 `429 QUOTA_EXCEEDED` 與友善訊息。DB proof：quota-blocked calls 前後 `AiUsageLog` count 維持 `CHAT=1`、`INTERVIEW=5`，確認超限在 provider call 前阻擋且不增加成本；測試後已還原並二次查詢確認 `monthly_ai_used=3`。此 proof 只覆蓋 chat/interview API guard；Theater Route B、quota UI、三 AI error-path 全覆蓋仍待後續。

進行中註記：2026-06-19 完成 Theater legacy staging gate 與 production-minimum usage：`/api/ai/theater`、`/api/ai/theater/score` 改為 session-scoped，不再信任前端 org/user scope；兩條 route 都加 `canUseAiModule(session, THEATER)`、success/failure `AiUsageLog`、success `InteractionEvent(type=THEATER)` 與 `monthlyAiUsed` increment。production 預設 gate：未設定 `ENABLE_LEGACY_THEATER_DEMO=true` 時回 `503 THEATER_ROUTE_B_REQUIRED`，避免 legacy flow 被誤宣稱為 Route B production ready。API proof：demo member `POST /api/ai/theater` 200、`POST /api/ai/theater/score` 200；DB proof `THEATER usage 0→2`、success usage `0→2`、interaction events `0→2`、monthly counter `3→5`。Quota proof：character/score 皆回 `429 QUOTA_EXCEEDED`，`THEATER usage` 維持 `2`，counter 還原 `5`。仍未完成新版 Route B 多角色/旁白 NPC/五視角回饋，也未完成 provider error-path 全覆蓋。

進行中註記：2026-06-19 補三 AI provider error-path proof：以測試用無效 OpenAI key 啟動 dev server，分別呼叫 `/api/ai/chat`、`/api/ai/interview`、`/api/ai/theater`，三者皆回 500 且 `AiUsageLog.error` 實際落庫。DB proof：error count deltas `CHAT +1`、`INTERVIEW +1`、`THEATER +1`；latest error logs 皆帶 `model=gpt-4o-mini`。同輪補 `/api/ai/interview` outer catch，使 OpenAI stream create 前失敗也會寫 `persistInterviewFailure()`。三 AI success/error path 已完成；Route B 新版 Theater、director/NPC/五視角與 quota UI proof 仍未完成。

範圍外：不做 RAG 真檢索；不做 ECPay；不讓 org admin 讀逐字稿。

阻擋：Theater Route B 若開 schema migration，需要先依 `PLN-015` / `ARC-004` 執行；OpenAI quota 必須可用。

---

## Batch LCH-005 - Demo Account Relogin QA

目標：讓體驗帳號真的從 DB 取資料，不靠 browser storage 或本地 mock。

- [x] 確認 `pnpm demo:preflight` 通過。
- [x] 確認 `pnpm demo:seed:reset` 可重跑且不刪真實資料。
- [ ] 將 demo users 連到 Supabase Auth `supabase_auth_id`。
- [x] 清空 browser storage 後，用 demo member 登入，仍看到 DB seeded clients、visit plans、reports、sessions。
- [x] demo member 新增 client、建立至少一筆 AI output，刷新後仍存在。
- [x] demo manager 登入，只看到 aggregate/coaching/unit/member health，不看到客戶明細。
- [ ] demo client 登入，只看到 authorized share/client portal content。
- [x] 確認 `/api/mock/*` 在 production-like env 預設不可用。
- [x] 保存 QA evidence：commands、必要 screenshots、AiUsageLog count before/after。
- [x] 跑 `pnpm lint:changed`。

進行中註記：2026-06-19 新增 `pnpm demo:relogin-qa`，以 Playwright 新 browser context + demo auth header 清空 local/session storage 後檢查 DB seeded surfaces。驗收：`pnpm demo:preflight` 通過；`pnpm demo:seed:reset` 通過；`pnpm demo:relogin-qa` 通過，覆蓋 `/crm`、`/crm/c_wang`、`/pre-visit`、`/reports`、`/spin`、`/theater`，確認清空 storage 後仍看到 DB seeded client/visit/report/session/theater surface，且 final page 無水平 overflow。截圖存於 `docs/06_audits-and-reports/screenshots/launch-readiness/lch-005/`。

進行中註記：2026-06-19 新增 `pnpm demo:member-write-qa`，以 demo member 走 BFF 建立測試 client，接著呼叫 `/api/ai/interview/outputs` 產生 DB-backed AI output，再重讀 API/DB。驗收通過：created client `cmqjwzrem0004ai619szx7z9p` 可重讀且合規 checklist 初始化 `MISSING`；AI output 200 且回傳 known facts、prep questions、issue readiness；DB proof `INTERVIEW AiUsageLog 1→2`、`monthlyAiUsed 1→2`、created client count `1`、client-linked `InteractionEvent(type=VISIT)` count `1`。

進行中註記：2026-06-19 新增 `GET /api/org/overview` 與 `pnpm demo:manager-aggregate-qa`，以 demo manager session 驗證只能讀 aggregate/coaching/unit/member health。驗收通過：overview 回傳 `totals`、`coaching`、`unitHealth`、`memberHealth`，並以 DB demo clients/policies 產生 7 個 forbidden sentinels 驗證不含 client name/email/phone/occupation/notes/policy/product/report body/transcript/detail field names；同時確認 `/api/clients` 在 manager session 下不洩漏其他 member seeded client details。

進行中註記：2026-06-19 新增 `pnpm mock:production-guard-qa`，在 `ALLOW_MOCK_API=false pnpm start` production-like runtime 實打所有 `/api/mock/*` route。驗收通過：assistant、spin-outline、theater、visit、track mock routes 均回 `404 mock_api_disabled`，確認 production-like env 預設不可用。

範圍外：不開放 public self-serve signup；不給外部 super admin demo。

阻擋：Supabase Auth env/callback；staging access policy。

---

## Batch LCH-006 - Front Office / Share / Client Portal

目標：讓前台不只是頁面，而是 token/client-scoped 的客戶安全入口。

- [x] 建立 `GET /api/public/pricing`，讀 DB-backed plan capability 或 stable server config。
- [x] 建立 `GET /api/share/[token]`，只回 client-safe report sections、org/unit branding、CTA、合規免責。
- [x] 建立 `POST /api/share/[token]/events`，寫 `ShareEvent`，IP/user-agent 只存 hash 或 safe metadata。
- [x] `/share/[token]` 改用 DB-backed token lookup，不再依賴 local store。
- [x] 建立 `GET /api/client-portal/bootstrap`，client session 只看授權資料。
- [x] 建立 `POST /api/client-portal/responses`，支援客戶補資料/回覆/預約意向的最小 contract。
- [x] client session 不可進 member/org admin。
- [x] share/client portal desktop/mobile QA：invalid token、expired token、authorized token、client login。
- [x] 跑 `pnpm lint:changed`。

進行中註記：2026-06-19 新增 DB-backed share token vertical slice：`GET /api/share/[token]` 只回 client-safe report sections、org/unit branding、CTA、portal scope；`POST /api/share/[token]/events` 寫 safe `ShareEvent`，IP 僅 hash、payload 只允許 section/href/scrollDepth/label/source。`/share/[token]` 改用 BFF fetch，不再依賴 local report store 或 `/api/mock/track`。驗收：`pnpm share:token-qa` 通過，`demo-share-wang` GET 200、invalid token 404、`ReportShare.access_count 0→1`、`ShareEvent 0→1`、private payload key count `0`；Browser smoke `/share/demo-share-wang` console error 0、無水平 overflow。2026-06-19 續補 client portal token-scoped session：`getClientSession()` 從 `x-asai-client-token` header 或 `asai_client_share_token` cookie 驗證 DB `ReportShare`，不從 member app session 推導 client identity；`GET /api/client-portal/bootstrap` 只回 authorized report/client-safe sections/branding/CTA；`POST /api/client-portal/responses` 寫 `InteractionEvent(type=TASK)`，metadata 只保留 source/responseType/shareId/reportId/preferredTime/contactMethod/topic。驗收：`pnpm client-portal:qa` 通過，missing client session 401、client token 打 `/api/workspace/bootstrap` 401、bootstrap 200、response 201、invalid type 400、`InteractionEvent` 0→1、unsafe payload key count 0。2026-06-19 續補 public pricing：`GET /api/public/pricing` 由 DB `PlanConfig` 產生 public-safe DTO，含四個方案、能力上限、CTA、ECPay provider 狀態；`checkoutEnabled=false`，正式 checkout 仍需 server notification/query proof。驗收：`pnpm public:pricing-qa` 通過，API 200、source=database、四方案能力上限與 DB 一致、private billing/env sentinels 0。2026-06-19 續補 client login token/cookie handoff：`POST /api/client-portal/session` 驗證 share token 後寫 httpOnly `asai_client_share_token` cookie，`DELETE` 可清 cookie；`/client-login?token=demo-share-wang` 預填 token 並可建立 client session。驗收：擴充 `pnpm client-portal:qa` 通過，session POST 200、Set-Cookie 含 HttpOnly/SameSite=Lax、cookie bootstrap 200、cookie 打 `/api/workspace/bootstrap` 401、invalid session token 404；Browser smoke `/client-login?token=demo-share-wang` console error 0、無水平 overflow。2026-06-19 續補 expired token proof 與完整 browser QA：`pnpm share:token-qa` / `pnpm client-portal:qa` 會 idempotent upsert `demo-share-wang-expired`，驗證 expired share GET 404、event POST 404、session POST 404、bootstrap 401、workspace 401，且 expired share 不增加 access/event count；Browser matrix 覆蓋 desktop 1440x1000 與 mobile 390x844 的 authorized、invalid、expired、client-login，全部 console error 0、無水平 overflow。

範圍外：不做完整客戶自助保單管理；不讓 client 看內部 AI prompt/coaching note。

---

## Batch LCH-007 - Org Admin Aggregate And Org Settings APIs

目標：完成 org admin 可用的 aggregate/coaching surface 與 org settings，並保持 manager 不看明細。

- [x] 建立 `GET /api/org/overview`：unit/member health、今日輔導隊列、usage summary。
- [x] 建立 `GET /api/org/members`：member metadata、role、seat、unit、last active；不得回客戶明細。
- [x] 建立 `GET /api/org/coaching`：完成率、卡關階段、常見異議、訓練建議。
- [x] 建立 `GET /api/org/ai-usage`：module/member/unit aggregate usage。
- [x] 建立 `GET/POST /api/org/units`：HQ/region/branch tree，套 plan `maxUnits`。
- [x] 建立 `POST /api/org/invites`：server-side plan limit check，個人協作者上限由 `PlanConfig.maxCollaborators` 控制。
- [x] 建立 `/org/settings` 或 `/team/settings` surface；管理 organization profile、branding、client portal、compliance defaults、billing visibility、AI quota。
- [x] 建立 `GET/PATCH /api/org/settings`；owner/admin 可寫，manager 只能 scoped read-only/limited write。
- [x] Org settings 不得讀 member private settings；org admin API 不得回 client name、phone/email、policy number、report body、SPIN/Theater transcript。
- [x] Browser QA `/team` + org settings desktop/mobile；console error 0、無水平 overflow。
- [x] 跑 `pnpm lint:changed`；動 schema 才跑 Prisma 驗收。

完成註記：2026-06-19 新增 `GET /api/org/members`，回傳 organization scope、units、members 與 totals；member item 只含 membership id、user id、display name、avatar、user/member status、role、title、region、seat timestamps、primary/managed units 與 aggregate counts。`pnpm demo:org-members-qa` 通過：demo manager 200、scope role `MANAGER`、members/units/totals 存在、client/private forbidden field names 0、DB seeded client/policy/report sentinels 0。2026-06-19 續補 `GET /api/org/coaching` 與 `GET /api/org/ai-usage`；coaching 只回完成率、卡關階段、persona load、member coaching aggregate 與 training recommendation focus；AI usage 只回 module/provider/member/unit current-month aggregate usage，不回 requestId/error 原文。`pnpm demo:org-coaching-ai-usage-qa` 通過：兩 API 皆 200、role `MANAGER`、aggregate structures 存在、client/private forbidden field names 0、DB seeded client/policy/report/message/AI sentinels 0。2026-06-19 續補 `GET/POST /api/org/units`；GET 回 active HQ/region/branch tree、planUsage、permissions 與 unit aggregate counts；POST 僅 OWNER/ADMIN 可用，驗證 parent hierarchy、slug conflict 與 `PlanConfig.maxUnits`。`pnpm demo:org-units-qa` 通過：demo manager GET 200、manager POST 403、idempotent demo owner POST 因 STARTER `maxUnits=1` 且 activeUnits=2 回 `MAX_UNITS_REACHED`、unit count 2→2、client/private sentinels 0。2026-06-19 續補 `POST /api/org/invites`；OWNER/ADMIN 才能邀請，必填 reason/riskAccepted，建立或重送 pending membership，不寄真 email，套 `PlanConfig.maxCollaborators` / `maxMembers`，response 只回 masked email，AuditLog 記 email hash/masked/limit decision。`pnpm demo:org-invites-qa` 通過：manager POST 403、owner collaborator invite 201、AuditLog > 0、overflow collaborator 403 `MAX_COLLABORATORS_REACHED`、membership count 不變、response 不回 raw invited email。2026-06-19 續補 `GET/PATCH /api/org/settings`、`/team/settings` 與 `pnpm demo:org-settings-qa` / `pnpm demo:org-settings-browser-qa`。Manager GET 200 且 read-only、PATCH 403；owner PATCH 200 並寫 `AuditLog(resourceType=ORG_SETTINGS)`；private/client forbidden field names 0、DB seeded client/policy/report sentinels 0。Browser QA 覆蓋 desktop/mobile：org settings title、privacy badge、client portal section、manager read-only notice、save disabled、console error 0、無水平 overflow。截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-007/org-settings-desktop.png`、`docs/06_audits-and-reports/screenshots/launch-readiness/lch-007/org-settings-mobile.png`。驗收 server 需以 `ALLOW_DEV_AUTH_HEADER=true pnpm dev` 啟動；未開 dev auth header 時會 401，屬 guard 正常。

範圍外：不做 super admin break-glass；不做 member detail API。

---

## Batch LCH-008 - Super Admin / Audit / Impersonation

目標：建立 platform-only 營運後台，不讓 super admin 成為無痕萬能後門。

- [x] 完成 platform session guard；`/super-admin/*` 不接受 app session。
- [x] 建立 `GET /api/platform/organizations` 與 `GET /api/platform/organizations/[id]`，預設只回 tenant summary/health。
- [x] 建立 `GET /api/platform/ai-usage`，跨租戶成本與錯誤 aggregate。
- [x] 建立 `PATCH /api/platform/plan-configs/[plan]`，寫 `AuditLog`。
- [x] 建立 `POST /api/platform/impersonation`：actor、target org/user、reason、scope、expiresAt 必填。
- [x] 建立 impersonation end/revoke flow。
- [x] 所有 impersonated read/write 寫 `AuditLog` 並帶 `impersonationSessionId`。
- [x] 建立 `POST /api/platform/break-glass`，敏感內容查詢需 reason、scope、expiry、audit。
- [x] 建立 `GET /api/platform/audit-logs`，支援 tenant/action/sensitivity filter。
- [x] 建立 platform settings 區塊：feature flags、provider policy、support policy；敏感改動寫 audit。
- [x] 跑 `pnpm lint:changed`；動 schema 跑 Prisma 驗收。

進行中註記：2026-06-19 完成 platform read-only summary slice。新增 platform repository、organizations summary/detail、cross-tenant AI usage aggregate、audit log query 與 `demo:platform-read-qa`；一般 app session 403，platform user 200；private seeded sentinels 與 forbidden field names 0 leak。2026-06-19 續補 `PATCH /api/platform/plan-configs/[plan]` 與 `demo:platform-plan-config-qa`；FINANCE 403、SUPER_ADMIN invalid input 400、SUPER_ADMIN 可更新並還原 STARTER quota，兩次寫 PLAN_UPDATE audit。2026-06-19 續補 impersonation start/end/revoke API 與 `demo:platform-impersonation-qa`；FINANCE start 403、缺 reason 400、超時 403、SUPER_ADMIN start/end/revoke 寫 BREAK_GLASS audit。2026-06-19 續補 impersonated read/write audit context：`read-proof` 只讀 tenant summary 並寫 `IMPERSONATED_READ`；`support-note` 只寫 audit metadata、不修改租戶業務資料並寫 `IMPERSONATED_WRITE`；兩者均驗證 active/expiry/actor/scope 且帶 `impersonationSessionId`。2026-06-19 續補 break-glass API：`POST /api/platform/break-glass` 要求 reason/scope/expiresAt/riskAccepted，FINANCE 403、expiry 上限 30 分鐘、SUPPORT 成功只回 counts-only proof 並寫 BREAK_GLASS audit。2026-06-19 續補 platform settings：`SystemSettings` 增加 feature flags/provider policy/support policy，`GET/PATCH /api/platform/settings` 僅 SUPER_ADMIN 可寫，PATCH 要 reason/riskAccepted，寫 `SUPPORT_NOTE/HIGH` audit；`demo:platform-settings-qa` 通過 FINANCE read-only、SUPER_ADMIN update/restore、DB row 與 audit query metadataKeys proof。LCH-008 已完成；正式 platform auth/MFA 仍為 production blocker。

範圍外：不讓 support 無限制讀客戶內容；不接正式金流前不得宣稱 billing production complete。

阻擋：platform auth/MFA/staging access；ECPay credentials 若碰 billing reconcile。

---

## Batch LCH-009 - Production Controls And Release QA

目標：讓受控 staging demo 進入 private beta 前，有基本成本、錯誤、合規與回滾控制。

- [x] 建立 AI quota/cost alert：至少 DB counter + UI quota warning；若導入 Redis rate limit 需文件化。
- [x] 對所有 OpenAI/Anthropic routes 做 audit，列出 module、provider、success/error `AiUsageLog` evidence。
- [x] 關閉 production-like env 的 `/api/mock/*`，保留 dev/test guard。
- [ ] 建立 Sentry 或等價錯誤監控方案；若暫不接，寫入 release blocker。
- [x] 建立 DB backup/restore 與 migration rollback note。
- [x] 建立 privacy / terms / AI disclaimer 最小頁面或 release blocker。
- [x] 建立 ECPay test flow checklist；正式收費開關預設關閉。
- [ ] 做 full smoke：front office、member admin、org admin、super admin、client portal。
- [ ] 保存 release QA evidence：desktop/mobile screenshots、console error、API status、AiUsageLog count、demo relogin result。
- [ ] 跑 `pnpm lint:changed`、`pnpm exec tsc --noEmit --pretty false`、`pnpm prisma:validate`、`pnpm demo:preflight`、`pnpm demo:runtime-audit`。

進行中註記：2026-06-19 新增 `GET /api/platform/release-readiness`、`src/lib/platform/platform-release-readiness-repository.ts`、super-admin `Release readiness` / `AI quota warning` 面板與 `pnpm demo:release-readiness-qa`。Readiness API 只允許 platform user 讀取，一般 app session 403；回傳 current-month `AiUsageLog` aggregate、organization quota usage、pending/failed billing order count、mock/email/notification/billing/auth/monitoring/legal/backup/ECPay control gate。QA 通過 API 200/403、required controls、private seeded sentinel 0 leak、super-admin desktop Playwright screenshot、console error 0、無水平 overflow。此切片只完成 AI quota/cost alert 與 production controls visibility；Sentry/backup/legal/ECPay/full smoke 仍為 LCH-009 blocker。

進行中註記：2026-06-19 續補 release blocker 文檔與 public legal pages。新增 `/privacy`、`/terms`，兩頁皆標明 private beta 最小揭露、AI 輔助不構成保險/法律/稅務建議、正式公開上線前仍需法務/合規核可。新增 `ACC-007_release-rollback-and-backup-runbook.md` 與 `ACC-008_ecpay-test-flow-checklist.md`，readiness gate 的 legal_pages、backup_restore、ecpay_checklist 可由檔案存在與 QA 驗證轉為 pass；production monitoring、AI route usage audit、full smoke、正式 ECPay credentials/callback/CheckMacValue 與 production payment approval 仍是 blocker。

進行中註記：2026-06-19 新增 `pnpm ai:usage-audit` 與 `AUD-005_ai-usage-route-audit-v1.0.md`。Audit source + DB aggregate proof 顯示 production-minimum pass：`/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs`、`/api/ai/theater`、`/api/ai/theater/score`；gap：legacy `/api/ai/spin`、`/api/ai/spin-suggestions`、`/api/ai/visit`、`/api/ai/report` 缺 auth/quota/success/error `AiUsageLog`，`/api/rag` 為 placeholder 且缺 guard/quota。此項完成 audit evidence，不代表 legacy gap 已修復。

進行中註記：2026-06-19 續轉換 `/api/ai/visit` 與 `/api/ai/report`：兩條 route 改為 `requireCurrentMember()` session-scoped、server 端以 `clientId` 查 DB client、不再信任前端傳入完整 client payload，並加入 `canUseAiModule()` quota guard；success path 寫 `AiUsageLog` 並 increment organization `monthlyAiUsed`，missing key / provider / empty / schema error path 寫 `AiUsageLog.error`。新增 `pnpm demo:ai-generation-qa`，驗證 unauth visit 401、demo member visit/report 200、response shape/markdown 正常、DB `VISIT`/`REPORT` success usage 各增加 `1→2`。`pnpm ai:usage-audit` 更新後剩餘 gaps：`/api/ai/spin`、`/api/ai/spin-suggestions`、`/api/rag`。

範圍外：不宣稱 full public production，除非 LCH-001-LCH-008 與 operator blockers 全部解除。

---

## Current Launch Blockers

- Supabase Auth public env、service role、callback URL 尚未完整接入。
- Demo account relogin 仍未完成：清空 browser storage 後需證明資料從 DB 還原。
- Legacy `/api/ai/spin`、`/api/ai/spin-suggestions` 缺 auth/quota/success/error `AiUsageLog`；`/api/rag` 仍是 placeholder 且缺 guard/quota。
- Theater Route B 尚未 migration；若用 legacy Theater，只能標 staging demo。
- ECPay credentials、callback domain、CheckMacValue、notification/query API、refund/void process 尚未完成。
- Super admin platform auth/MFA/staging access 仍需 operator。
- Production monitoring 尚未完成；privacy/terms/AI disclaimer 與 backup/rollback 已有 private beta draft，但仍需正式 legal/compliance/operator sign-off。

---

## Suggested Review Nodes

依 `PLN-016`，建議不要把 LCH 全部塞進單一 PR：

1. RN-LCH-001：session/workspace/auth foundation。
2. RN-LCH-002：member client CRUD + member settings。
3. RN-LCH-003：three AI usage/persistence/quota。
4. RN-LCH-004：demo relogin + front office/share/client portal。
5. RN-LCH-005：org admin aggregate + org settings。
6. RN-LCH-006：super admin/audit/production controls。
