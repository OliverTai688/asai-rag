# 誠問 AI — 多租戶上架計劃 v1.0

> 撰寫日期：2026-05-15  
> 目標：將 Phase 0.5 Beta 轉為可對外開放的多租戶 SaaS 產品  
> 研究來源：結合程式碼分析 + 市場研究（OWASP、Supabase 官方文件、台灣個資法 2025 修正案、Product Hunt 2025 算法）

---

## 一、現況分析

### 技術現況（截至 2026-05-15）

| 面向 | 狀態 | 說明 |
|------|------|------|
| 前端 UI | ✅ 完成 | 21 個頁面，含 CRM、SPIN、劇場、報告、儀表板 |
| AI 功能 | ✅ 運作中 | OpenAI GPT-4o-mini，串流回應 |
| 資料持久化 | ⚠️ localStorage / mockdata | Zustand + localStorage + `src/domains/*/mocks.ts`，**不跨裝置、不跨瀏覽器，也不是真實資料庫體驗** |
| 身份驗證 | ❌ 未實作 | 目前硬編碼預設用戶「王小明」 |
| 多租戶隔離 | ❌ 未實作 | 無 orgId 層級的資料隔離 |
| Supabase 整合 | ⚠️ 部分 | Prisma 已設定連線，但 schema 只有 Issue 一個 model |
| 新用戶引導 | ⚠️ 基礎 | Mock clients 自動載入，無正式 onboarding flow；需改為 DB demo seed |
| 法律文件 | ❌ 未建立 | 無隱私政策、服務條款 |

### 核心問題

1. **資料架構**：所有業務資料（客戶、SPIN、劇場、報告）仍可從 localStorage / local mockdata 產生，無法支撐多用戶，也無法驗證真實權限/分享/追蹤
2. **Auth 缺失**：無法讓外部用戶安全登入、區隔彼此的資料
3. **AI 成本控制**：無速率限制，開放後可能遭濫用

---

## 二、上架前技術準備

### P0 — 上架前必須完成（預計 2 週）

#### 2.1 Supabase Auth 整合

```
目標：讓外部用戶可以註冊/登入，並隔離各自資料
```

- [ ] 啟用 Supabase Auth（Email + Password 為主，Magic Link 為輔）
- [ ] 建立 `/login`、`/signup`、`/auth/callback` 頁面
- [ ] 整合 Supabase `@supabase/ssr` middleware（保護 dashboard 路由）
- [ ] 登入後自動建立 `Organization`（1 用戶 = 1 org，可擴充為團隊）
- [ ] 登出功能、Session 過期處理

#### 2.2 多租戶資料庫 Schema 設計

```
目標：org 層級資料隔離，使用 Supabase Row Level Security (RLS)
```

**建議 Prisma Schema 新增：**

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      Plan     @default(FREE)
  createdAt DateTime @default(now())
  
  users    OrganizationMember[]
  clients  Client[]
  sessions SpinSession[]
  theaters TheaterSession[]
  reports  Report[]
  visits   VisitPlan[]
}

model OrganizationMember {
  id     String           @id @default(cuid())
  userId String           // maps to Supabase Auth user.id
  orgId  String
  role   MemberRole       @default(AGENT)
  
  org    Organization     @relation(fields: [orgId], references: [id])
  
  @@unique([userId, orgId])
}

enum MemberRole { OWNER MANAGER AGENT }
enum Plan      { FREE STARTER PRO ENTERPRISE }
```

- [ ] 為所有業務 model 加入 `orgId` 外鍵
- [ ] 在 Supabase 設定 RLS policies（`auth.uid()` → `orgId`）
- [ ] 撰寫 migration script（目前 schema 只有 Issue，從零建立）

#### 2.3 localStorage / mockdata → Supabase DB runtime 遷移

```
目標：資料存到 Supabase DB，Zustand 只作 cache / UI state；runtime 不再以本地 mockdata 作為業務資料來源
```

- [ ] Client（客戶）domain → `clients` table
- [ ] SpinSession domain → `spin_sessions` table
- [ ] TheaterSession domain → `theater_sessions` table
- [ ] Report domain → `reports` table（含 share token）
- [ ] VisitPlan domain → `visit_plans` table
- [ ] Event/Timeline domain → `events` table
- [ ] 修改 service 層改為 API calls（`/api/clients`、`/api/sessions` 等）
- [ ] Zustand store 改為 cache-first pattern（樂觀更新 + 背景 sync）
- [ ] `src/domains/*/mocks.ts` 只保留為 seed fixture 或移入 `prisma/seed`，production UI 不得 import 作為資料來源
- [ ] `/api/mock/*` 加 dev/test guard，production UI 不得呼叫 mock API 作為資料來源
- [ ] 清空 browser storage 後，登入 demo account 仍可從 DB 看到完整範例資料

#### 2.4 Demo Account 與範例資料自動載入

```
目標：新用戶或體驗帳號登入後看到資料庫中的示範資料，立即可用；示範資料不是本地 mockdata
```

- [ ] 建立 idempotent seed script / `POST /api/onboarding/seed` 端點
- [ ] 在 Organization 建立後觸發 seed（10 個示範客戶，含家庭、保單、合規、訪前規劃、SPIN、劇場、報告、互動紀錄）
- [ ] 建立 demo member / manager / client portal / staging super admin accounts
- [ ] Seed records 必須有 `organizationId` 與 `isDemo` 或 seed scenario metadata
- [ ] 在 UI 顯示「這是示範資料」的明顯提示（橫幅或 badge）
- [ ] 提供「清除示範資料」與「重新載入範例」按鈕；只刪 demo records，不刪真實資料

#### 2.5 AI API 速率限制

```
目標：避免 OpenAI 費用爆炸，每用戶設上限
工具：Upstash Redis + @upstash/ratelimit（滑動窗口算法）
```

- [ ] 安裝 `@upstash/ratelimit` + `@upstash/redis`
- [ ] 在 Next.js middleware 實作 per-org 速率限制（key by `org_id`，非 IP）
- [ ] 免費方案限制：每日 30 次 AI 對話、10 次報告生成
- [ ] 設定回應 header：`X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`
- [ ] 超出配額時回傳 `429` + `Retry-After`，UI 顯示友善升級提示
- [ ] 在 Vercel 設定 OpenAI 費用警報（每日 $30 USD 警報線）

#### 2.6 環境變數與 Production 設定

- [ ] 建立 production `.env`（分離 dev/prod Supabase project）
- [ ] 設定 `NEXT_PUBLIC_APP_URL` 為正式域名
- [ ] 確認 Supabase Connection Pooler 設定正確（transaction mode 給 Prisma）
- [ ] Vercel 部署設定（推薦）或其他 hosting

---

### P1 — 上線後 2 週內完成

#### 2.7 Onboarding Flow（新用戶引導）

- [ ] 首次登入後顯示歡迎畫面（Welcome Modal）
  - 介紹 3 個核心功能：SPIN 對話、劇場練習、報告
- [ ] 功能引導 Tooltip Tour（使用 Shepherd.js 或 Intro.js）
  - Dashboard → CRM → 第一次 SPIN 對話 的操作路徑
- [ ] 空狀態友善設計（當沒有資料時，顯示「新增第一個客戶」引導）
- [ ] 完成第一個 SPIN 對話後給予正向回饋（成就感設計）

#### 2.8 錯誤監控

- [ ] 整合 **Sentry**（`@sentry/nextjs`）
  - 監控 API route 錯誤、前端錯誤
  - 設定 source maps for production
- [ ] Supabase 開啟 pg_stat_statements 監控慢查詢

#### 2.9 用量分析

- [ ] 整合 **PostHog**（自架或 cloud，台灣有 EU server 可選）
  - 追蹤：登入、SPIN 完成、報告生成、分享報告開啟
  - 設定 funnel：landing → signup → first SPIN
- [ ] 匿名化處理，符合隱私要求

#### 2.10 法律文件

- [ ] `/privacy` — 隱私政策頁面（繁體中文）
  - 說明收集哪些資料、如何使用、Supabase/OpenAI 資料處理
  - 符合台灣個人資料保護法（個資法）
- [ ] `/terms` — 服務條款頁面
  - AI 生成內容免責聲明（保險建議僅供參考）
  - 資料使用授權

---

### P2 — 上線後 1 個月內（可選）

- [ ] 計費整合（Stripe）：免費/付費方案切換
- [ ] 電子郵件通知（Resend / SendGrid）：報告分享通知
- [ ] 邀請團隊成員功能（Manager 邀請 Agent）
- [ ] 管理者儀表板（用量統計、用戶管理）

---

## 三、多租戶架構設計

### 資料隔離策略

```
選擇：Schema-per-tenant vs Row-level isolation
決策：使用 Row-level isolation（Supabase RLS）
原因：適合中小型 SaaS，管理成本低，Supabase 原生支援
```

### RLS Policy 範例

```sql
-- 1. 在 Supabase Auth hook 中，登入時將 org_id 注入 JWT custom claim
-- （在 organization_members 查到 org_id 後放進 token）

-- 2. 所有 tenant 資料表都加 org_id 索引（缺少索引是 RLS 最大效能殺手）
CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_clients_org_id_created ON clients(org_id, created_at);

-- 3. RLS policy 使用 JWT claim（比 subquery 更快）
CREATE POLICY "clients_org_isolation" ON clients
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
```

**⚠️ 關鍵陷阱（研究發現）：**

1. **務必從 Supabase Client SDK 測試 RLS**，SQL Editor 以 superuser 執行，會繞過 RLS
2. **service_role key 完全繞過 RLS** — 只在 seed/admin 腳本使用，絕對不能出現在前端
3. **INSERT/UPDATE 同時需要 WITH CHECK**，否則用戶可能寫入其他 org 的資料

### Org → Member → Data 層級

```
Organization (org_tpe_001)
├── OrganizationMember (OWNER: 王經理)
│   └── userId → Supabase Auth user
├── OrganizationMember (AGENT: 王業務)
├── clients[] (只有本 org 可見)
├── spin_sessions[] (只有本 org 可見)
└── reports[] (有 share_token 的可公開)
```

### Share Token 設計（跨 org 分享報告）

```
/share/[token] → 不需登入，任何人可瀏覽
報告 token 是 cuid()，無法猜測
追蹤 open event（timestamp + user agent）
```

---

## 四、用戶引導設計

### 新用戶旅程

```
1. 訪問 landing page (/)
   ↓
2. 點擊「免費開始使用」
   ↓
3. 填寫 signup（姓名、email、公司名稱）
   ↓
4. 驗證 email（Magic Link 或 確認信）
   ↓
5. 自動建立 Organization + 載入 Demo 資料
   ↓
6. 進入 Dashboard（顯示 Welcome Modal）
   ↓
7. 引導完成第一個 SPIN 對話
   ↓
8. 看到自動生成的報告
   ↓
9. 正式使用
```

### Demo 資料設計

新用戶進入後自動看到 10 個預設示範客戶（取自現有 mocks.ts）：

| 示範客戶 | 特色 | 適合展示功能 |
|---------|------|------------|
| 王大明 | 科技主管，高收入 | SPIN 對話、保障缺口分析 |
| 林建華 | 企業主，退休規劃 | Pre-Visit 規劃 |
| 陳雅婷 | 自由工作者，低保障 | 劇場練習 |
| 吳美玲 | 退休老師，長照需求 | 報告生成與分享 |

**Demo 資料識別**：
- 在 UI 頂部顯示「📊 示範模式」橫幅
- 每個 demo 客戶旁顯示「示範」badge
- 清除示範資料後橫幅消失

### Welcome Modal 設計

```
第 1 頁：「歡迎來到誠問 AI！」
  → 3 個核心功能圖示（SPIN / 劇場 / 報告）

第 2 頁：「我們已為您準備示範資料」
  → 說明可以直接試用，不影響正式資料

第 3 頁：「開始您的第一次 AI 對話」
  → CTA 按鈕：「選擇客戶開始 SPIN」
```

---

## 五、上架策略

### 5.1 上架時程表

```
Week 1-2 (2026-05-15 ~ 2026-05-29): P0 技術工作
  - Supabase Auth 整合
  - 資料庫 schema 設計
  - 第一波資料遷移

Week 3 (2026-06-01 ~ 2026-06-07): 整合測試
  - End-to-end 測試（signup → SPIN → report → share）
  - 安全測試（RLS 驗證、CSRF 保護）
  - 效能測試（AI 速率限制驗證）

Week 4 (2026-06-08 ~ 2026-06-14): 封測（Closed Beta）
  - 邀請 5-10 位保險業務員試用
  - 收集回饋，修復關鍵 bug
  - 完成法律文件

Week 5-6 (2026-06-15 ~ 2026-06-28): 軟上線（Soft Launch）
  - 開放 Landing page 自助註冊
  - 限制：前 100 名免費使用
  - 監控：Sentry + PostHog 觀察

Week 7-8 (2026-06-29 ~ 2026-07-12): 推廣上線（Full Launch）
  - Product Hunt 登台
  - LinkedIn 發文
  - 保險業社群推廣
```

### 5.2 前 100 名早鳥計劃

```
🎁 早鳥方案（前 100 名）
- 6 個月免費使用 Pro 功能
- 優先體驗新功能
- 直接與創辦人對話的管道（Discord 或 Line 群組）
```

---

## 六、行銷推廣策略

### 目標族群

| 族群 | 特徵 | 痛點 |
|------|------|------|
| 壽險業務員 | 台灣約 40 萬人，獨立經營 | 客戶追蹤效率低、開發流程沒有系統化 |
| 保險代理店主管 | 管理 5-20 人團隊 | 業績追蹤難、新人培訓耗時 |
| 保經、保代公司 | 多商品、多業務員 | 標準化銷售流程缺失 |

### 推廣管道

#### Product Hunt（全球 SaaS 首選上架平台）

- 上線時間：**週二～週四台灣時間下午 3 點**（美西 12:01 AM，競爭較少但流量高的時段）
- 上線前須有 **400+ waitlist 訂閱者**，這是 2025 算法調整後進入 Top 5 的門檻
- 前 4 小時目標 150-200 upvotes，**真實留言比點讚更重要**（2025 新算法）
- 準備資產：Demo GIF、產品截圖（繁體中文 UI）、英文 tagline
- 上線後 24 小時內回覆每則留言，邀約 demo

#### 台灣創業生態系

- **Meet 創業小聚**（meet.bnext.com.tw）— 台灣最大創業媒體，申請編輯採訪
- **Taiwan Tech Arena (TTA)** — 經濟部支持計畫，可獲得國際曝光與資金媒合
- **Startup Grind Taipei** — 月度活動，適合創辦人 networking
- **數位時代、TechOrange** — 投稿科技媒體，目標保險 AI 題材

#### 台灣保險業社群

- Facebook 保險業務員社團（人數多，互動活躍）
- LINE Official Account — 台灣 90%+ 滲透率，**客服與更新通知的必要管道**
- LinkedIn 壽險主管圈（決策者在此），**創辦人個人品牌內容效果遠優於公司頁面**
- PTT Ins 版（保險版）
- YouTube / Instagram 保險 KOL 合作

#### 內容行銷

- 「如何用 AI 做 SPIN 銷售」教學影片（繁體中文）
- Before/After 對比：傳統拜訪準備 vs 誠問 AI 1 分鐘生成
- 案例分享（經過同意的用戶故事）
- 英文內容同步發布 Show HN（Hacker News）+ Indie Hackers

#### 異業合作

- 保險公司內訓部門（企業購買）
- 保經公司 IT 部門
- 保險代理學校合作

---

## 七、技術安全與合規

### 必要安全措施

| 項目 | 工具/方式 |
|------|---------|
| Auth 安全 | Supabase Auth（bcrypt, JWT + leaked password protection） |
| CSRF 保護 | Next.js 內建 + `SameSite=Strict` cookie |
| SQL Injection | Prisma 參數化查詢（原生防護） |
| XSS | React JSX 原生防護 + DOMPurify（若有 HTML render） |
| RLS 隔離 | Supabase Row Level Security（每個 table 都要開啟） |
| HTTPS | Vercel/Cloudflare 強制 TLS + HSTS header |
| Security Headers | CSP、X-Frame-Options、Referrer-Policy |
| Secret 管理 | Vercel env vars（執行 `git log` 確認 .env 未入庫） |
| AI 注入防護 | System prompt hardening，過濾用戶輸入 |
| 依賴掃描 | 上線前執行 `pnpm audit`，修復 critical/high 漏洞 |

### 可觀測性（Observability）堆疊

| 類別 | 工具 | 用途 |
| --- | --- | --- |
| 錯誤監控 | **Sentry** (`@sentry/nextjs`) | 生產錯誤分群、source maps、效能追蹤 |
| 產品分析 | **PostHog** | 用戶漏斗、session 錄製、功能旗標 |
| 上線監控 | **Better Stack** | 60 秒內偵測斷線並通知 |
| 結構化日誌 | **Axiom** 或 **Logtail** | 每筆 log 帶 `org_id` context |
| 資料庫效能 | Supabase pg_stat_statements | 慢查詢監控 |

Sentry + PostHog 可互相整合，將錯誤事件對應到用戶 session。

### 台灣個資法合規（2025 修正案）

台灣個資法於 **2025 年 11 月 11 日完成重大修正**，大幅向 GDPR 靠攏：

- **個人資料保護委員會（PDPC）** 已於 2025 年 8 月成立，為獨立監管機構
- **資料外洩通報義務**（修正第 12 條）：發現外洩後須立即通報 PDPC 與當事人，**不可等待調查完成才通報**
- 企業須建立書面「安全維護計劃」，防止資料竊取、竄改、滅失、洩漏

**對誠問 AI 的具體要求：**

- 隱私政策須包含：收集項目、收集目的、保存期限、用戶權利（查詢/更正/刪除）、跨境傳輸說明
- 服務條款須載明：AI 生成內容免責聲明（保險建議僅供參考，非正式核保）、資料所有權（客戶擁有）
- 帳號刪除流程：用戶申請後 30 天內完成資料清除，並記錄書面證明
- Supabase 資料儲存：選擇 **AP-Northeast（東京）**，符合鄰近地區保護原則
- 簽署 **Supabase DPA**（Supabase 提供 GDPR 合規 DPA，直接簽署即可）
- Cookie 同意橫幅（對 EU 用戶強制，對台灣用戶為信任建立的好做法）

---

## 八、定價策略

### 方案選擇：試用期 vs 免費方案

研究建議：**月費超過 $50 USD 的 B2B SaaS 應採 14 天試用期**（非永久免費方案），轉換率比免費方案高 40-60%。

### 建議定價結構

| 方案 | 月費 | 核心限制 | 目標族群 |
| --- | --- | --- | --- |
| **體驗版**（14 天試用） | 免費 | 全功能，到期後降為基本版 | 新用戶評估期 |
| **個人版 Starter** | NT$590/月 | 1 位用戶，50 次 AI/月 | 獨立業務員 |
| **專業版 Pro** | NT$1,490/月 | 3 位用戶，無限 AI，報告分享追蹤 | 小型團隊 |
| **團隊版 Team** | NT$3,990/月 | 10 位用戶，團隊儀表板，優先支援 | 保代公司 |
| **企業版 Enterprise** | 詢價 | 無限用戶，SSO，專屬 SLA | 保險公司內訓 |

### 定價頁面設計原則

- **三個方案**為主要展示（Individual / Pro / Team），Enterprise 獨立詢價
- 預設標記「最受歡迎」在 Pro 方案（錨定效果）
- 提供**年付切換**（年付享 8 折，明顯顯示省多少）
- CTA 文案具體化：「開始 14 天免費試用」而非「立即開始」
- 定價頁加入**成效試算器**：「您每月拜訪 X 位客戶，節省 Y 小時」

### 試用期優化

- 試用第 1、3、7、12 天發送**活化 email**（提示下一步功能）
- 試用到期前 4 天在 App 內顯示**倒數提示**
- 對已完成 5+ 次 SPIN 但未升級的用戶，提供**5 天延長試用**
- Day 7 主動邀約線上 Demo（B2B 轉換的最大槓桿）

---

## 九、成功指標（KPI）

### 上線前 3 個月目標

| 指標 | 目標 |
|------|------|
| 註冊用戶 | 200 人 |
| 活躍用戶（MAU）| 80 人 |
| SPIN 對話完成數 | 500 次 |
| 報告生成數 | 200 份 |
| 報告分享開啟率 | > 40% |
| 用戶留存（30天）| > 30% |
| NPS 分數 | > 40 |

### 產品健康指標

- AI 回應時間 < 3 秒（P95）
- 系統可用性 > 99.5%
- 每日 AI 費用控制在 $50 USD 以內（初期）

---

## 十、風險與應對

| 風險 | 可能性 | 影響 | 應對方式 |
|------|--------|------|---------|
| OpenAI API 費用超出預算 | 中 | 高 | Upstash 速率限制 + Vercel 費用警報 |
| 資料隔離漏洞（RLS 設定錯誤） | 低 | 極高 | 從 client SDK 驗證 RLS，上線前 penetration test |
| 用戶資料遺失 | 低 | 高 | Supabase Pro 開啟 Point-in-time recovery |
| 資料外洩未即時通報 | 低 | 高 | 建立外洩應變流程，PDPC 通報 SOP 文件化 |
| AI 生成不當保險建議 | 中 | 中 | System prompt 限制 + 所有 AI 輸出加免責聲明 |
| 競爭對手抄襲 | 中 | 低 | 快速迭代，建立保險業社群護城河 |

---

## 十一、下一步行動

### 立即（本週）

1. **決定 Supabase project 設定**：確認 region（AP-Northeast）、plan（Pro，開啟 PITR）
2. **設計 DB Schema**：繪製 ER 圖，確認 org/member/data 關係，規劃所有 RLS policies
3. **建立 Auth 頁面**：`/login`、`/signup` 原型，整合 `@supabase/ssr`
4. **建立 waitlist 頁面**：在 landing page 加入 email 收集，目標上線前累積 400+ 訂閱者

### 下週

1. **RLS policy 撰寫與從 client SDK 驗證**：每個 table 都要測試
2. **開始 API 遷移**：從 client domain 開始（`/api/clients` CRUD）
3. **安裝 Sentry + PostHog**：開發環境先接通

### 封測前（Week 3-4）

1. **招募 Beta 用戶**：找 5 位真實保險業務員，準備 LINE 群組
2. **準備法律文件**：使用 Iubenda 或委請法律顧問審閱隱私政策與服務條款
3. **執行 `pnpm audit`**：修復所有 critical/high 安全漏洞
4. **定價頁面上線**：含年付切換、方案比較表

---

*文件版本：v1.0 | 最後更新：2026-05-15*  
*下次更新：封測完成後（預計 2026-06-14）*
