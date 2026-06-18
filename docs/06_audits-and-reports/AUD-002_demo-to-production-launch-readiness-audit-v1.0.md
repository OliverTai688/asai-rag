# 誠問 AI Demo-to-Production 上線就緒度審計 v1.0

> 審計日期：2026-06-18  
> 狀態：v1.0（首版，現況快照）  
> 範圍：盤點目前哪些功能仍停留在 demo/mock 階段、哪些為真實可運作，並驗證上線所需的 operator 憑證就緒度。本文只做**現況事實記錄與 operator 前置盤點**，不重寫架構決策（架構決策見 `RES-007`、`ARC-006`、`PRD-003`）。  
> 審計依據：靜態程式碼掃描 + 實際連線測試（Supabase / Prisma / `.env`），於 2026-06-18 進行。  
> 關聯文件：`PLN-011_multi-tenant-launch-plan-v1.0.md`、`PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`RES-007_product-surface-and-admin-architecture-v1.0.md`、`RES-009_demo-account-and-mockdata-database-migration-v1.0.md`、`ARC-006_role-permission-route-architecture-v1.0.md`、`ACC-004_multi-role-saas-architecture-acceptance-framework-v1.0.md`。

---

## 1. 審計結論（TL;DR）

誠問 AI 目前是**「真實 AI、假後端」**的狀態：7 條 AI route 確實呼叫 OpenAI `gpt-4o-mini`，但**所有業務資料只存在瀏覽器 localStorage（Zustand），沒有任何一條 API route 真的寫入資料庫**，且**沒有任何驗證 / 授權 / 多租戶隔離 / AiUsageLog**。

四個面（前台 / 使用者後台 / org admin / super admin）皆已有 UI 外殼，但**四面之間沒有任何 auth 或資料隔離**——任何人可直接開啟 `/admin`。

最關鍵的上線阻擋不是程式，而是**憑證**：2026-06-18 實測，`DATABASE_URL` 指向真實 Supabase 專案但**密碼驗證失敗（P1000）**，`NEXT_PUBLIC_SUPABASE_URL` 與 `ANON_KEY` 仍為 `.env.example` 範本值。在 operator 補齊正確憑證前，PSA / 多租戶上線相關卡只能交付 schema / 程式骨架，**不得標示 production integration 已完成**（對齊 `PLN-013` Blockers 與 `RES-009` 硬規則）。

---

## 2. Real vs Mock 矩陣（依四面分類）

狀態圖示：✅ 真實可運作｜🟡 UI 真但資料/邏輯為 mock/localStorage｜🔴 純 mock / 介面殼。

### 2.1 前台 Front Office（`(public)`）
| 功能 | 路由 | 狀態 | 事實 |
| --- | --- | --- | --- |
| Landing / 行銷 | `/` | 🟡 | UI 真，無 signup/login 出口 |
| Pricing | `/pricing` | 🟡 | 方案為 `subscription` mock |
| 報告分享頁 | `/share/[token]` | 🟡 | token 僅比對 localStorage；追蹤打 `/api/mock/track/[token]`；無 org/unit branding；無 client 登入 |

### 2.2 使用者後台 User/Member Admin（`(dashboard)`）
| 功能 | AI 真？ | 存 DB？ | AiUsageLog？ | 狀態 | 事實 |
| --- | --- | --- | --- | --- | --- |
| CRM 客戶（含合規欄位） | — | ❌ | — | 🟡 | 6 筆 seed client 在 `client/mocks.ts` → localStorage |
| SPIN 會談 | ✅ | ❌ | ❌ | 🟡 | `/api/ai/spin` 真呼叫 OpenAI；session 存 localStorage |
| Theater 演練 | ✅ | ❌ | ❌ | 🟡 | `/api/ai/theater` + `/theater/score` 真；session 存 localStorage |
| Pre-visit 拜訪規劃 | ✅ | ❌ | ❌ | 🟡 | `/api/ai/visit` 真；plan 存 localStorage |
| Reports 報告 | ✅ | ❌ | ❌ | 🟡 | `/api/ai/report` 真；share token 在記憶體生成 |
| Issues 議題單 | — | ❌ | — | 🔴 | `MOCK_ISSUES` 寫死；Prisma 有 `Issue` model 但未接 |
| Calendar 日曆 | — | ❌ | — | 🔴 | `calendar` domain 只有 `types.ts`+`store.ts`，無 service、無 Google OAuth、無 DB model、3 筆假事件 |
| Team 團隊 | — | ❌ | — | 🔴 | `MOCK_TEAM_MEMBERS` 寫死，無真實成員來源 |
| Settings | — | ❌ | — | 🔴 | 自承「Google 登入尚未接入」「資料隔離待實作」，全存 localStorage |
| RAG 查詢 | ❌ | ❌ | ❌ | 🔴 | `/api/rag` 為 placeholder，未接向量庫 / LLM |

### 2.3 Org Admin 通訊處 / 團隊管理
🔴 僅 `/team` 一頁 mock。缺：`OrganizationUnit`（HQ/REGION/BRANCH）、role guard、彙總視圖（manager 不可看客戶明細）、席次 / 邀請。

### 2.4 Super Admin 平台管理（`(admin)`）
🔴 `/admin` 一頁 mock metrics + 假訂單（`subscription/mocks.ts`）。缺：平台級登入、role guard、impersonation + AuditLog、綠界金流、`PlanConfig`。

---

## 3. 跨面地基缺口（四面共用，皆未落地）

| 地基 | 現況 | schema 已備？ | 影響 |
| --- | --- | --- | --- |
| 登入 / 驗證 | ❌ 無 `middleware.ts`、無 Supabase Auth client、無 `/login`/`/signup` | `User.supabaseAuthId` 已備（nullable，未用） | 四面裸奔 |
| 多租戶 `organizationId` 隔離 | ❌ runtime 完全未套 | ✅ 全 model 已有 | 所有人看同一份 mock |
| 資料庫持久化 | ❌ 0 條 API route import `@/lib/prisma` | ✅ schema 完整、client 已生成 | 換裝置 / 清快取即失資料 |
| AiUsageLog | ❌ 6 條 OpenAI route 皆未寫 | ✅ `AiUsageLog` model 已備 | **違反 CLAUDE.md 硬規則**，AI 成本無上限、無 quota |
| RBAC / route guard | ❌ 無任何檢查 | ✅ `MemberRole` enum 已備 | 角色形同虛設 |
| 金流 | ❌ schema 為 Stripe 命名 mock；綠界未接 | 部分（`stripeCustomerId` 等） | 無法真實收費 |
| 合規欄位寫入 | ❌ `ComplianceChecklist` 從未被寫/讀 | ✅ model 已備 | 受監管要求未落地 |

> 註：Prisma schema（`prisma/schema.prisma`）非常完整，缺的是「runtime 接線」與「憑證」，不是資料模型。

---

## 4. Operator 憑證前置盤點（2026-06-18 實測）

這是目前文件系統中**唯一沒有被記錄、且實際擋住上線**的部分。所有 PSA 卡與 `PLN-011` P0 都依賴下列憑證；缺一則對應卡只能交付 draft。

| 憑證 / 環境 | `.env` 現況（值已遮罩） | 實測結果 | 阻擋的卡 |
| --- | --- | --- | --- |
| `DATABASE_URL` | `postgresql://…@db.wwocdcicvpmbdmqvskzi.supabase.co:5432`（102 字元） | 🔴 **P1000 認證失敗**：host 真實，密碼無效 | CRM 落地、AI 產出落地、AiUsageLog、PSA-004/005 |
| `DIRECT_URL` | `postgresql://…`（87 字元） | 🔴 同上（migration 用） | Prisma migrate |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project…`（範本值） | 🔴 placeholder | PSA-002 auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-ke…`（13 字元，真 key 約 200+） | 🔴 placeholder | PSA-002 auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **欄位不存在** | 🔴 缺欄位 | server 端建帳號 / 驗證 |
| `OPENAI_API_KEY` | `sk-proj-…`（164 字元） | ✅ 真實可用 | — |
| `ANTHROPIC_API_KEY` | `sk-ant-…`（10 字元） | 🟡 範本，次要 | 備援 provider（不擋上線） |
| `ELEVENLABS_API_KEY` / `DEEPGRAM_API_KEY` | 範本值 | 🟡 未使用 | 不擋上線 |
| 綠界 ECPay | **未設定** | 🔴 缺 MerchantID / HashKey / HashIV / 測試環境 | PSA-007 billing |

### 4.1 上線前 operator 必補清單（pre-flight checklist）
1. **修復 DB 密碼** → Supabase 後台 → Project Settings → Database → reset password / 取得正確 connection string，更新 `DATABASE_URL` 與 `DIRECT_URL`。
2. **真實 `NEXT_PUBLIC_SUPABASE_URL`** → 形如 `https://wwocdcicvpmbdmqvskzi.supabase.co`。
3. **真實 `NEXT_PUBLIC_SUPABASE_ANON_KEY`** → Project Settings → API → `anon public`。
4. **新增 `SUPABASE_SERVICE_ROLE_KEY`** → 同頁 `service_role`（server-only，勿外洩）。
5. **（PSA-007 才需）綠界**：MerchantID、HashKey、HashIV、測試環境 URL、webhook 回拋網址。
6. 補齊 1–4 後，先跑 `pnpm prisma migrate dev`（首次，目前 `prisma/migrations/` 不存在）建立 schema，再依 `RES-009` 跑 demo seed。

---

## 5. 缺口 → 既有任務卡對照（讓本審計可被執行）

| 本審計缺口 | 對應卡 / 文件 |
| --- | --- |
| 登入 / 帳號隔離 | `PLN-013` PSA-002、`ARC-006` §3–5、`PLN-011` P0 |
| CRM / SPIN / Theater / Report 落地 DB | `RES-009` Phase 3、`PLN-011` P0「localStorage→DB」 |
| AiUsageLog 補寫 | CLAUDE.md 硬規則、`ACC-004` §demo §AiUsageLog coverage |
| Issues / Calendar / Team 真實化 | `RES-009`（mock→seed/DB）、Org admin 見 PSA-006 |
| Org admin 彙總（manager 不看明細） | `PLN-013` PSA-006、`ARC-006` §5.2 |
| Super admin + impersonation audit | `PLN-013` PSA-009、`ARC-006` §9 |
| 綠界 billing | `PLN-013` PSA-007、`ARC-006` §8 |
| Demo 帳號 / mock 隔離 | `PLN-013` PSA-005、`RES-009` 全篇 |

---

## 6. 建議上線收斂（不擴張範圍，只排序）

在 operator 補齊 §4.1 憑證的前提下，依下列順序可得到「真的能用且安全」的最小上線版本；org admin / super admin / 綠界排為 fast-follow：

1. **地基（阻擋全部）**：Supabase Auth + `middleware.ts` 守衛 + 首次 Prisma migration + AiUsageLog 封裝。
2. **使用者後台落地**：CRM / SPIN / Theater / Report 由 localStorage 改寫 DB（依 `RES-009`）。
3. **前台收尾**：share page 改真實 DB token；signup/login 出口。
4. **隱藏未就緒面**：Issues / Calendar / 綠界 / super admin 暫以「即將推出」或 dev-guard 隱藏，避免假功能上線。
5. **fast-follow**：org admin 彙總台 → super admin + impersonation → 綠界 billing。

> 在憑證缺口未解前，第 1–3 點均只能交付程式骨架；本審計據此標記為「operator-blocked」，對齊 `PLN-013` Blockers。

---

## 7. 變更紀錄
- 2026-06-18 v1.0：首版。基於 2026-06-18 靜態掃描 + Supabase/Prisma 實連測試建立現況快照與 operator 憑證盤點。
