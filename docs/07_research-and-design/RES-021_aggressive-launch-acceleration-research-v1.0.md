# 誠問 AI Aggressive Launch Acceleration Research v1.0

> 建立日期：2026-06-19  
> 狀態：研究定稿，供新增 aggressive launch workstream、`PLN` batch tasks 與 release gate 使用  
> 問題：若目標改為「大幅度、積極地推進上線」，哪些工作應被前移、平行化、凍結或降級，才能最快把誠問 AI 從 Level 1/2 foundation 推向可對外私測與後續公開上線？

---

## 1. 結論

目前最有效的加速策略不是把所有未完成項目平均推進，而是把工作拆成三條明確上線路徑：

1. **Level 2 Controlled Private Beta Fast Track**：短期目標。讓受邀顧問與少量通訊處可在 staging/private beta 使用真實帳號、真實少量資料與三個 AI，但仍受白名單、條款、配額、監控與人工支援限制。
2. **Level 3 Public Launch Hardening**：中期目標。補正式公開註冊、金流、production monitoring、incident response、資料權利、security evidence 與法遵 sign-off。
3. **Product Scope Freeze Lane**：立即啟動。凍結會拖慢上線的高變動功能，把產品承諾收斂成「保險顧問 SaaS 輔助工具」，不得宣稱網路投保、正式保險商品建議或全自動決策。

加速的核心判斷：

- **先上 Private Beta，不直接跳 Public Launch**。`RES-015` 已判斷 Level 3 還有 production controls 缺口；直接公開會把工程、合規、金流、支援與資安風險綁在一起，反而拖慢。
- **把 Level 2 定義為可真實使用但受控**。Private Beta 可允許少量真實客戶資料，但必須有受邀帳號、資料同意、AI 免責、org 隔離、quota、audit、backup/restore、monitoring 與人工客服通道。
- **以 release gates 驅動工程，不以功能清單驅動工程**。每一輪只問：這個變更能不能讓 beta 上線風險下降、證據增加、阻擋變少。
- **強制 parallel lanes**。Role-aware navigation、full-site BFF、AI governance、auth/onboarding、billing readiness、release ops 可以並行，但必須共用 session/policy/tenant boundary。
- **不再新增大型 UI redesign workstream**。UI 已足夠支持 beta；除非是 onboarding、錯誤狀態、權限提示、quota/upgrade、client portal safety，否則 UI polish 不應排在 launch blocker 前。

建議新增一條 **Aggressive Launch Acceleration** workstream：

```text
LCH Level 1/2 foundation
  -> ALA-001 Launch scope lock and risk register
  -> ALA-002 Private beta account and onboarding path
  -> ALA-003 BFF coverage for beta-critical workflows
  -> ALA-004 AI governance and kill-switch hardening
  -> ALA-005 Production observability and incident loop
  -> ALA-006 Legal/compliance beta packet
  -> ALA-007 ECPay test-to-production readiness gap closure
  -> ALA-008 Beta release candidate evidence pack
```

---

## 2. 目前狀態重估

依 `RES-012`、`RES-015`、`PLN-017` 與目前 batch 狀態，誠問 AI 已經越過「純 prototype」階段：

- UI / Modern Minimal / AI-first sidebar 已完成。
- Session/workspace foundation、DB-backed client CRUD、member settings、org aggregate、super admin/audit、client share portal 已有重要基礎。
- 三個 AI production minimum 已大幅推進：chat/interview/theater 均已朝 session-scoped、quota guard、`AiUsageLog`、error-path evidence 移動。
- Realtime voice / Park-style memory 已接近 cross-mode QA 收尾。
- Role-aware sidebar navigation 已開新 workstream，但尚未完成 resolver、bootstrap 對齊與跨角色 QA。

真正阻擋「大幅上線推進」的不是單一功能，而是以下幾類 release evidence 尚未成為單一閉環：

| 類別 | 現況 | 加速策略 |
| --- | --- | --- |
| Auth / onboarding | 有 Auth.js foundation 與 dev header proof；正式 provider/email/SSO 仍待決策。 | 先做 invite-only beta；正式 public signup 延後。 |
| Tenant / role boundary | 多數 API 已建立 server session/policy helper，但 sidebar/route/BFF 還需一致。 | 優先完成 RAS + BFF policy shared helper。 |
| AI governance | `AiUsageLog` 與 quota 已部分到位；缺 kill switch、red-team、retention。 | 建 AI control panel + per-module disable + scripted abuse tests。 |
| Client portal | share token / client session / response 已有；正式 client identity 尚未完整。 | Beta 先採 token-scoped client portal，不承諾完整 client account。 |
| Billing | ECPay schema/domain/UI 有骨架；正式 callback/query/idempotency 未完成。 | Beta 先關閉自助收費；ECPay test flow 並行做到 ready。 |
| Monitoring / ops | 有 runbook 與 readiness API；production ingestion 未證明。 | 先完成 Sentry/logging/uptime proof，沒有 proof 不出 beta。 |
| Legal / compliance | privacy/terms/AI disclaimer 已有初版。 | 補 beta consent packet、DPA/vendor register、資料刪除流程。 |

---

## 3. 上線分級重新定義

### 3.1 Level 1：Controlled Staging Demo

用途：內部展示、投資人/顧問 demo、固定 demo data。

可接受：

- 使用 demo account 與 seeded data。
- 使用 dev/staging auth shortcut，但需清楚標示。
- 可用 mock fixtures 作 seed source。

不可接受：

- 真實外部客戶資料。
- 正式收費。
- 無白名單公開入口。

目前狀態：接近完成，剩餘主要是補齊文件、QA evidence 與未完成 batch 勾選。

### 3.2 Level 2：Controlled Private Beta

用途：少量受邀顧問與通訊處真實試用。

最低條件：

- Invite-only account，禁止 public self-serve signup。
- 每個 beta org 有明確 owner、資料處理告知、AI 免責與支援聯絡窗口。
- 可新增真實少量客戶資料，但需同意與刪除流程。
- 三個 AI 可用；每次 provider call 寫 `AiUsageLog`；quota/kill switch 可立即停用。
- Member/org/client/platform surface 權限測試通過。
- Monitoring、error alert、backup/restore drill、incident playbook 有 evidence。
- Billing 自助收費可關閉；可用人工合約或免費 beta。

這是本研究建議的**下一個積極上線目標**。

### 3.3 Level 3：Public Launch

用途：公開註冊、正式收費、可規模化支援外部客戶。

最低條件：

- Production auth/email verification/signup abuse control。
- ECPay production-grade notification/query/idempotency/ledger。
- Security baseline、rate limit、privacy rights、vendor register、audit review。
- Production monitoring ingestion、on-call/incident response、support SLA。
- Legal/compliance sign-off。

Level 3 不應阻擋 Level 2 beta，但 Level 2 的 evidence 要可延伸成 Level 3。

---

## 4. Product Scope Freeze

為了加速上線，需要立即凍結第一個 beta 的產品承諾。

### 4.1 Beta 必做承諾

- 顧問可管理客戶基本資料、家庭/保單摘要、訪談準備與報告分享。
- 三個 AI 模組可用：問誠問 AI、AI 了解客戶、AI 劇場演練。
- AI output 是輔助建議，清楚標示 fact / inference / unknown 與免責。
- 通訊處主管只看 aggregate/coaching，不看客戶明細。
- 客戶只看授權分享內容與可提交回覆。
- 平台管理可看 readiness、usage、audit，敏感內容需 break-glass。

### 4.2 Beta 明確不承諾

- 不承諾網路投保或網路保險服務。
- 不承諾 AI 產出可直接作正式保險商品建議。
- 不承諾完整客戶帳號系統；beta 可先用 token-scoped client portal。
- 不承諾自助付費；ECPay 可在 test/hidden mode 完成 readiness。
- 不承諾多國語系；維持 zh-TW。
- 不承諾所有 legacy SPIN 功能都是新主流程；`/interview` 是新主入口，legacy SPIN 由 feature flag 控制。

### 4.3 暫緩項目

- 新的大型 visual redesign。
- 與 launch blocker 無關的 dashboard widget polish。
- 完整 command palette。
- 未經核可的 production email/notification/payment。
- 真實 raw audio 保存。
- 網路投保法規流程。

---

## 5. Aggressive Parallel Work Lanes

### Lane A：Release Command Center

目標：建立每天可判斷 go/no-go 的 release command center。

交付物：

- `GET /api/platform/release-readiness` 補齊 beta gate：auth、tenant isolation、AI controls、monitoring、backup、legal、billing mode、mock disabled。
- Super admin readiness panel 顯示每個 gate 的 evidence link、最後驗收時間、owner、blocker。
- `pnpm beta:release-candidate-qa` 一鍵跑 beta critical scripts。
- 每輪 report 自動聚合：commit、DB operation、QA command、screenshot/proof、open blockers。

成功標準：

- 任一 gate 沒 evidence 時不可顯示為 pass。
- Readiness API 不洩漏 client/private payload。
- Super admin route 一般 app session 403。

### Lane B：Invite-only Beta Auth

目標：最快建立可外部試用的正式帳號邊界，同時避免 public signup abuse。

交付物：

- Beta invite flow：owner/admin 建立 invite，email 可先人工傳送，系統產 token。
- Accept invite 後建立/連結 app session、organization membership、default workspace。
- Public `/signup` 先導向 waitlist 或 invite required。
- Demo/dev auth header 只能在 non-production 且 explicit env 開啟。
- Session cookie/security header proof。

成功標準：

- 未受邀使用者不能建立 production workspace。
- 手打 dashboard/org/super/client URL 不比 session 權限更寬。
- Invite token 過期、重放、錯誤 org 均被拒絕。

### Lane C：BFF Coverage For Beta Critical Workflows

目標：把 beta 真實工作流從前端 store 移到 server-trusted BFF。

優先 API：

- Clients/family/policies/compliance。
- Visit plans / interview output drafts / reports / share token。
- Theater sessions / turns / feedback minimum。
- Member settings / org settings / org aggregate。
- Client portal responses。

成功標準：

- 前端不得自行傳入可信 `organizationId` / `userId` / role。
- Zustand 只作 UI cache。
- `pnpm demo:runtime-audit` 不發現 production runtime import mocks 作 business source。

### Lane D：AI Governance And Emergency Brake

目標：把 AI 從「能跑」推到「可控、可停、可稽核」。

交付物：

- Central AI gateway 或至少 shared provider wrapper。
- Per-org/per-user/per-module quota。
- Per-module kill switch：CHAT / INTERVIEW / THEATER 可獨立關閉。
- Error-path `AiUsageLog` 全覆蓋。
- Prompt injection / data exfiltration scripted tests。
- Sensitive data redaction / reason / risk consent policy。
- Retention setting：transcript、memory、output draft 保存與刪除規則。

成功標準：

- Provider key 錯誤、quota 超限、kill switch、timeout 均有友善錯誤與安全 log。
- AI failure 不造成資料寫入半套或跨租戶洩漏。
- 每次 OpenAI/Anthropic call 都可追蹤 provider/model/module/org/user/cost metadata。

### Lane E：Role-aware Surface Boundary

目標：讓 navigation、bootstrap、route guard、API policy 對齊。

交付物：

- 完成 `RAS-001..005`。
- `resolveSidebarSections(context)` 與 route policy helper 共用同一套角色/capability 判斷。
- Member、manager、owner/admin、super admin、client viewer 的 sidebar 與手打 URL negative tests。
- Legacy SPIN feature flag visibility。

成功標準：

- Sidebar 隱藏不是唯一權限控制；API/route guard 必須同時拒絕。
- Client portal 不出現 CRM/team/AI coaching item。
- Super admin navigation 不出現在一般 app session。

### Lane F：Observability, Backup, Incident

目標：上 beta 前能知道壞在哪、能回復、能通知。

交付物：

- Sentry 或等價 monitoring production/staging ingestion proof。
- PII-safe logging policy 與 redaction tests。
- Uptime check：front office、dashboard bootstrap、AI health、share token。
- Backup restore drill：至少 staging restore proof 或 Supabase PITR/backup evidence。
- Incident response runbook：AI outage、data leak suspicion、billing incident、auth incident。

成功標準：

- 沒有 live monitoring evidence 時 readiness gate 保持 blocked。
- Log 不含 raw prompt、Authorization、cookie、private payload。
- Backup/restore 不是文件聲明，需有時間戳 proof。

### Lane G：Legal / Compliance Beta Packet

目標：讓 private beta 有可接受的資料處理與免責界線。

交付物：

- Beta Terms addendum。
- Privacy notice + AI data processing notice。
- Client data consent template。
- AI disclaimer：非保險商品建議、非法律/稅務/財務建議。
- Data rights playbook：查詢、修正、刪除、停止處理。
- Vendor register：OpenAI、Supabase、ECPay、hosting、monitoring。
- Launch scope lock：不含網路投保/網路保險服務。

成功標準：

- Beta user 必須可見並接受條款/免責。
- 客戶資料輸入前有資料使用提醒。
- 高敏感資料與 AI 使用有 reason/risk consent path。

### Lane H：Billing Readiness Without Blocking Beta

目標：金流不拖慢 private beta，但不能讓 production billing 半套誤開。

交付物：

- `checkoutEnabled=false` 預設。
- ECPay test flow：create order、CheckMacValue、ReturnURL、OrderResultURL、ServerReplyURL、query reconcile、idempotency。
- Billing ledger / transaction audit。
- Manual plan activation path with audit。
- Production credentials checklist。

成功標準：

- Beta 可以免費或人工合約運作。
- Production 自助收費 gate 未通過前不可啟用。
- 前端 redirect 不會啟用方案。

---

## 6. Fast-track Sequence

### Sprint 0：48 小時內的範圍鎖定

目標：停止發散，建立 launch command center。

- 決定 beta scope：advisor SaaS only，不含網路投保/正式商品建議。
- 決定 beta participant：內部、3-5 位顧問、1-2 個通訊處。
- 決定 data policy：允許少量真實資料或只允許半匿名資料。
- 決定 billing mode：private beta 免費或人工合約，self-serve payment off。
- 建立 ALA workstream 與 release gate。

### Sprint 1：Private beta release candidate

目標：可由受邀帳號完成核心工作流。

- 完成 RAS role-aware navigation / route guard alignment。
- 完成 beta invite-only auth path。
- 補齊 beta-critical BFF endpoints。
- 三 AI kill switch / quota / usage / error proof。
- Monitoring ingestion + backup proof。
- Legal beta packet 初版。
- 一鍵 `beta:release-candidate-qa`。

### Sprint 2：Small cohort beta

目標：少量外部使用者真實試跑，有支援與回滾。

- Onboard 第一批 beta org。
- Daily readiness review。
- Collect product/AI failure cases。
- Fix P0/P1 only；P2 進 backlog。
- Weekly export audit/log/usage/incident report。

### Sprint 3：Public launch hardening

目標：把 beta evidence 擴充成 Level 3。

- Public signup / abuse prevention。
- ECPay production-grade flow。
- Formal support / incident process。
- Security review / dependency audit / ASVS evidence。
- Data rights automation。
- Legal/compliance sign-off。

---

## 7. Release Gates

### Gate 1：Beta Scope Gate

- [ ] Launch scope lock 完成：advisor SaaS only。
- [ ] Beta terms / privacy / AI disclaimer 可見。
- [ ] Billing self-serve off。
- [ ] Production mock API off。

### Gate 2：Identity And Tenant Gate

- [ ] Invite-only account path。
- [ ] App/client/platform session 分離。
- [ ] Route guard negative tests。
- [ ] Org manager aggregate-only proof。
- [ ] Client portal token/session scope proof。

### Gate 3：Business Runtime Gate

- [ ] Client CRUD DB-backed。
- [ ] Visit/interview/report/share DB-backed。
- [ ] Theater session/feedback minimum DB-backed 或明確 staging gate。
- [ ] Refresh/relogin proof。
- [ ] No runtime mock business source。

### Gate 4：AI Control Gate

- [ ] CHAT / INTERVIEW / THEATER success/error `AiUsageLog`。
- [ ] Quota 429 proof。
- [ ] Kill switch proof。
- [ ] Provider outage graceful fail proof。
- [ ] Sensitive data policy proof。

### Gate 5：Ops Gate

- [ ] Monitoring ingestion proof。
- [ ] PII-safe logging proof。
- [ ] Backup/restore proof。
- [ ] Incident response runbook。
- [ ] Release rollback path。

### Gate 6：Beta Evidence Pack

- [ ] `pnpm exec tsc --noEmit --pretty false` pass。
- [ ] `pnpm lint:changed` pass。
- [ ] Prisma validate/generate/db push/migration proof when schema changes。
- [ ] Browser desktop/mobile proof for dashboard, CRM, interview, theater, reports, team, super admin, share/client login。
- [ ] API/script proof archived。
- [ ] Open blockers listed with owner and launch decision。

---

## 8. Risk Register

| 風險 | 等級 | 加速處理方式 |
| --- | --- | --- |
| 誤把 beta 當正式公開上線 | P0 | Scope lock、beta banner、invite-only、terms addendum。 |
| 跨租戶資料洩漏 | P0 | Shared policy helper、negative tests、BFF server session only。 |
| AI 成本暴衝 | P0 | Quota、rate limit、kill switch、usage alert。 |
| AI 輸出被當正式保險建議 | P0 | Disclaimer、fact/inference/unknown、保留人工確認流程。 |
| Client portal token 被濫用 | P1 | Expiry、revocation、event audit、rate limit、token scope。 |
| ECPay 半套誤啟用 | P1 | checkout off by default、server-trusted confirmation gate。 |
| Monitoring 只有文件沒有 ingestion | P1 | readiness gate 需 live proof。 |
| Super admin 成無痕後門 | P1 | platform session、break-glass reason、audit every read/write。 |
| Legacy SPIN / Theater 與新主流程混淆 | P2 | Feature flag、navigation naming、scope docs。 |

---

## 9. 建議新增文件

為了把本研究轉成可執行 workstream，建議下一輪新增：

1. `PLN-022_aggressive-launch-acceleration-batch-tasks-v1.0.md`
   - ALA-001 到 ALA-008，可逐張打勾。
   - 每張卡包含 command、proof、report、issue-question 更新要求。
2. `ACC-014_private-beta-release-gates-v1.0.md`
   - 將 Gate 1-6 轉成可機器/人工驗收的 evidence checklist。
3. `ARC-009_beta-production-boundary-architecture-v1.0.md`
   - 定義 beta/prod env、auth、tenant isolation、AI controls、billing off/on、logging/redaction、mock 禁用邊界。

若只先做一份，優先順序是 `PLN-022`，因為它能立刻把下一輪 agent 工作導向 launch blocker。

---

## 10. 下一輪最建議入口

最建議入口不是直接補 Level 3，而是：

```text
1. 新增 PLN-022 / ACC-014
2. 完成 RAS-001..005，讓 role-aware navigation 與 route guard 對齊
3. 建立 beta release command script：pnpm beta:release-candidate-qa
4. 補 AI kill switch + readiness gate
5. 補 invite-only beta path
6. 做第一份 Beta Evidence Pack
```

這條路線最積極，因為它允許產品盡快進入受控外部試用，同時不跳過保險 SaaS 必須有的權限、個資、AI、監控與回滾底線。

