# 誠問 AI Batch Task Launch Proximity Research v1.0

> 建立日期：2026-06-19  
> 狀態：研究定稿，供 `AGENTS.md` / `PLN-017` 後續執行排序使用  
> 問題：目前 batch tasks 是否已經接近上線？還是仍有缺口？

---

## 1. 結論

目前 batch tasks **已經接近「可執行的上線衝刺計畫」**，但系統本身**尚未接近正式上線**。

更精準的判斷：

| 上線等級 | 目前距離 | 判斷 |
| --- | --- | --- |
| Level 0 本機/內部展示 | 已具備 | UI、demo seed、部分 AI、DB 連線基線可用。 |
| Level 1 受控 Staging Demo | 接近可開始衝刺，但尚未完成 | `PLN-017` 已拆出正確任務，但 `LCH-001` 到 `LCH-009` 全部尚未完成。 |
| Level 2 Private Beta | 還有明顯缺口 | 需要正式 auth/session、DB-backed CRUD、三 AI persistence/quota、demo relogin QA、org aggregate、監控與合規文件。 |
| Level 3 正式公開上線 | 不接近 | 仍缺 ECPay 完整串接、資安/個資/法務 review、production monitoring、備份回滾、incident response、super admin MFA/audit 實作驗證。 |

所以：**現在可以說「上線路線已經拆對」，不能說「已接近上線完成」。**

---

## 2. 本次評估依據

本文件對齊以下資料：

- `AGENTS.md` 的 Multi-role SaaS、Launch Readiness、訪談/劇場 workstream。
- `PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`。
- `RES-012_launch-readiness-gap-research-v1.0.md`。
- `RES-013_four-surface-launch-implementation-research-v1.0.md`。
- `ACC-005_cross-surface-responsibility-matrix-v1.0.md`。
- 本次實測指令：

```bash
pnpm demo:runtime-audit
pnpm prisma:validate
pnpm demo:preflight
```

實測結果摘要：

- `pnpm demo:runtime-audit` 通過：目前 runtime 沒有直接 import domain mocks，且沒有 allowlist 外的 browser-storage business persistence。
- `pnpm prisma:validate` 通過：Prisma schema valid。
- `pnpm demo:preflight` 通過 DB host DNS、DB connection、必要 demo seed tables；但仍警告 `NEXT_PUBLIC_SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是 placeholder。

---

## 3. Batch Task 現況判斷

### 3.1 Multi-role SaaS workstream

`AGENTS.md` 內的 Multi-role SaaS Architecture workstream 大致完成：

- 已完成 PRD/ARC、auth surface skeleton、plan config、organization unit、share branding、billing schema/domain、super admin schema/domain、cross-surface matrix。
- 目前只剩 PSA-005 的一項核心驗收未完成：**清空 browser storage 後，demo account 重新登入仍看到完整 DB-backed 範例資料。**

這代表 multi-role SaaS 的**產品邊界與資料模型骨架已經有了**，但還不能等同 runtime production integration。

### 3.2 Launch Readiness workstream

`Launch Readiness Implementation Batch Tasks` 是真正判斷上線距離的 workstream。現在狀態是：

- `LCH-001` 到 `LCH-009` 全部尚未勾選。
- `AGENTS.md` 中 Launch workstream 有 82 個可驗收項，完成數為 0。
- `PLN-017` 的目標明確是 Level 1 受控 Staging Demo，不是完整 production launch。

因此，目前的 batch tasks **足以指引上線衝刺**，但還沒有產生上線所需的 runtime 證據。

---

## 4. 已經足夠的部分

### 4.1 產品架構方向足夠

目前四介面已經分清楚：

- Front office / client portal：公開介紹、方案、share page、client login。
- Member admin：顧問自己的 CRM、訪談、劇場、報告、個人 settings。
- Org admin：通訊處/企業的彙總、輔導、unit、org settings。
- Super admin：平台營運、plan config、impersonation、audit、跨租戶用量。

這個劃分足以支撐後續開發，不需要再大改架構方向。

### 4.2 UI 與入口骨架足夠

目前已有：

- `/login`
- `/signup`
- `/invite/[token]`
- `/client-login`
- `/super-admin/login`
- `/super-admin`
- `/pricing`
- `/share/[token]`
- `/settings`
- `/team`
- `/interview`
- `/theater`
- `/crm`

這表示使用者看得到未來產品輪廓，但多數頁面仍需要接上正式 session、DB API 與 role guard。

### 4.3 DB seed foundation 已經變好

本次 `pnpm demo:preflight` 已確認：

- DB host 可解析。
- DB connection 可開啟。
- 必要 demo seed tables 存在。

這比早期「Supabase DNS / password / schema engine 阻擋」的狀態更接近可驗收。不過 Supabase public auth env 仍是 placeholder，因此 demo account relogin 還不能視為完成。

### 4.4 Runtime mock 風險已下降

`pnpm demo:runtime-audit` 通過，表示目前至少有自動檢查能擋住：

- production runtime 直接 import `src/domains/*/mocks.ts`。
- allowlist 外的 browser storage business persistence。

但這只能證明「沒有明顯違規來源」，不能證明「所有資料都已 DB-backed」。

---

## 5. 主要上線缺口

### 5.1 Auth / Session 還是第一阻擋

目前已有 auth route skeleton，但尚未完成：

- Supabase Auth server/client helper。
- app session、client session、platform session 分離。
- dashboard/member route guard。
- org admin aggregate-only guard。
- `/super-admin/*` platform-only guard。
- invite token DB 驗證。
- password reset / email flow / callback URL 驗證。

只要 `LCH-001` 沒完成，就不能讓外部使用者輸入真實資料。

### 5.2 DB-backed CRUD 還沒形成產品閉環

目前 API route 清單仍主要是 AI 與 mock route，尚未看到：

- `/api/clients`
- `/api/clients/[id]`
- `/api/member/settings`
- `/api/org/settings`
- `/api/share/[token]`
- `/api/client-portal/bootstrap`
- `/api/client-portal/responses`
- `/api/platform/*`

所以「資料能正常新增」目前還不能用 production 角度成立。即使 seed 可用，member 新增客戶、刷新、重新登入仍需 `LCH-002` 與 `LCH-005` 驗收。

### 5.3 三個 AI 還沒全部達到 production minimum

目前只有 Interview route 明確接到 `writeAiUsageLogSafely`，其餘多數 OpenAI route 還沒有完成 usage logging 與 session scope：

- `/api/ai/chat`
- `/api/ai/report`
- `/api/ai/spin`
- `/api/ai/spin-suggestions`
- `/api/ai/theater`
- `/api/ai/theater/score`
- `/api/ai/visit`

缺口包含：

- 不信任前端傳入 org/user/client scope。
- 每次 success/error 都寫 `AiUsageLog`。
- quota / rate limit。
- assistant conversation persistence。
- Theater Route B migration。
- AI output DB persistence。

這是目前最容易造成「展示可跑，但上線不安全」的區域。

### 5.4 Demo account relogin 尚未證明

上線體驗帳號不能只靠 seeded data 存在 DB。必須完成完整 QA：

1. 清空 browser storage。
2. demo member 登入。
3. 看到 DB seeded clients、visit plans、reports、sessions。
4. 新增一筆 client，重新整理後仍存在。
5. 產生至少一筆 AI output，刷新後仍存在。
6. demo manager 只看 aggregate。
7. demo client 只看 authorized content。

目前這條還沒完成，所以不能說已經可以穩定提供體驗帳號。

### 5.5 Org admin / super admin 還是 contract 多於 runtime

`PSA` 已建立了很好的 contract，但 runtime 還缺：

- org aggregate APIs。
- org settings route/API。
- manager unit scope query enforcement。
- super admin platform session guard。
- impersonation start/end/revoke route。
- break-glass audit write path。
- audit log 查詢與敏感操作 evidence。

這些缺口不一定阻擋 Level 1 staging demo，但會阻擋 private beta 與 production。

### 5.6 Release ops / 法務 / 監控缺口仍在

正式或 private beta 前仍需要：

- Sentry 或等價錯誤監控。
- AI cost / quota alert。
- DB backup / restore / migration rollback note。
- Privacy / Terms / AI disclaimer。
- ECPay test flow、CheckMacValue、callback URL、notification/query verification。
- incident response 與 support policy。
- production env / secrets checklist。

`LCH-009` 有列到這些，但目前尚未執行。

---

## 6. Batch Tasks 是否足夠？

### 6.1 對 Level 1 受控 Staging Demo：足夠

`PLN-017` 的 `LCH-001` 到 `LCH-005` 足以讓產品達到 Level 1：

- session/workspace foundation。
- DB-backed client CRUD。
- member settings。
- 三個 AI production minimum。
- demo account relogin QA。

若這五張卡完成並有 QA evidence，就可以提供受控體驗帳號，但仍要明確標示為 staging/demo，而非正式 production。

### 6.2 對 Level 2 Private Beta：大致足夠，但需要提高 `LCH-009` 的嚴格度

Level 2 需要完成 `LCH-001` 到 `LCH-009`，並補強以下驗收：

- 所有外部可達 API 都有 auth/authorization 測試。
- 所有 tenant-scoped query 都不能信任前端 `organizationId`。
- 所有 AI route 都有 success/error `AiUsageLog` evidence。
- demo 與真實資料隔離。
- privacy/terms/AI disclaimer 有頁面與 release approval。
- monitoring 有實際 dashboard 或至少 error ingestion evidence。

目前 `LCH-009` 有列，但較像 checklist；進入 private beta 前建議拆成獨立 review node 或新增 acceptance evidence 範本。

### 6.3 對 Level 3 正式公開上線：不夠

正式公開上線還需要額外工作流，不宜只靠 `PLN-017`：

- Security / privacy review。
- Supabase RLS 或 server-only data access policy 決策與測試。
- ECPay production cutover playbook。
- Data retention / deletion / export policy。
- Incident response / support escalation。
- Production migration strategy。
- Load / abuse / rate limit test。
- Legal approval gate。

這些可以後續新增為 `PLN-018` 或擴充 `LCH-009`，但不應在 `LCH-009` 一張卡裡含糊帶過。

---

## 7. 建議的下一步順序

### 第一優先：先完成 Level 1 的五張卡

1. `LCH-001`：Session / Workspace Foundation。
2. `LCH-002`：DB-backed Client CRUD。
3. `LCH-004`：Three AI Production Minimum。
4. `LCH-005`：Demo Account Relogin QA。
5. `LCH-003`：Member Settings，若會卡 auth，可與 `LCH-002` 平行但不應早於 session foundation 驗收。

原因：這五張卡決定「體驗帳號是否真的可用」。

### 第二優先：補四介面的 runtime 邊界

1. `LCH-006`：Front office / share / client portal。
2. `LCH-007`：Org admin aggregate and org settings APIs。
3. `LCH-008`：Super admin / audit / impersonation。

原因：這三張卡決定 member、org、client、platform 是否能獨立操作且彼此不越權。

### 第三優先：private beta release gate

1. `LCH-009`：Production controls and release QA。
2. 建議補一份 release evidence template，固定收：
   - 指令輸出。
   - API smoke result。
   - Browser screenshots。
   - AiUsageLog before/after count。
   - Demo relogin result。
   - Known blockers / waived risks。

---

## 8. 建議補充的新缺口文件或 Batch

`PLN-017` 已足夠推進 Level 1，但若目標是 private beta 或 public launch，建議後續新增：

### 建議文件

- `ACC-007_release-evidence-template`：定義每次上線候選版要保存哪些證據。
- `ARC-007_security-and-data-boundary-architecture`：auth、tenant scope、RLS/server-only policy、sensitive data/break-glass。
- `PLN-018_private-beta-release-hardening-batch-tasks`：把 `LCH-009` 中的 production controls 拆成可逐張驗收的 hardening tasks。

### 建議 batch 主題

- Security hardening：auth bypass、tenant isolation、CSRF/session/cookie、rate limit。
- Data governance：retention、deletion、export、support access、audit retention。
- Release operations：migration rollback、DB backup restore drill、incident response。
- Billing hardening：ECPay callback verification、query reconcile、manual activation audit。
- Legal launch gate：privacy、terms、AI disclaimer、insurance compliance wording。

---

## 9. Go / No-go 判定

### 現在可以 Go 的事

- 繼續照 `AGENTS.md` 執行 `LCH-001` 到 `LCH-005`。
- 將 demo account 目標定位為 Level 1 受控 Staging Demo。
- 使用 DB seed foundation 與 runtime audit 作為上線衝刺基線。

### 現在不應 Go 的事

- 不應開放 public signup 給外部真實客戶資料。
- 不應宣稱正式 production ready。
- 不應讓 org manager 使用 detail API 或看到 member 客戶明細。
- 不應讓 super admin/support 無 audit 查敏感內容。
- 不應在 ECPay callback/query 未完成前宣稱可正式收費。
- 不應在三個 AI 全部完成 `AiUsageLog` / quota 前開放大量使用。

---

## 10. 最短可上線路徑

若目標是最短時間推出可控體驗：

```text
LCH-001 session foundation
  -> LCH-002 DB-backed client CRUD
  -> LCH-004 three AI minimum
  -> LCH-005 demo relogin QA
  -> Level 1 controlled staging demo
```

若目標是 private beta：

```text
Level 1
  -> LCH-006 client/share portal
  -> LCH-007 org aggregate/settings
  -> LCH-008 super admin/audit
  -> LCH-009 release controls
  -> Level 2 private beta
```

若目標是正式公開上線：

```text
Level 2
  -> Security/privacy/legal/release hardening
  -> ECPay production cutover
  -> monitoring + incident + rollback drill
  -> Level 3 public launch
```

---

## 11. 最終判斷

目前 batch tasks 的品質是足夠的，方向也正確；問題不是「還不知道該做什麼」，而是「真正上線需要的 runtime 卡片還沒有被執行」。

因此下一步不建議再擴大研究範圍，而是開始按 `LCH-001` 往下實作，並在每個 review node 保存 evidence。只要 `LCH-001` 到 `LCH-005` 完成，就可以合理宣稱進入 **Level 1 受控 Staging Demo**；在此之前，仍只能說是「具備上線衝刺藍圖的內部展示版」。
