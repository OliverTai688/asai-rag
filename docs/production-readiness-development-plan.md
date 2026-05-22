# 誠問 AI 上線級開發計劃

| 項目 | 內容 |
| :--- | :--- |
| 建立日期 | 2026-05-22 |
| 目標 | 從可體驗版推進到可封測 / 軟上線的 SaaS 版本 |
| 第一優先 | 體驗情境完整度，而不是單點功能堆疊 |
| 本輪實作 | Prisma 多租戶核心 schema、Supabase 銜接設定、上線資料骨架 |

## 1. 產品體驗情境優先順序

上線級版本必須先滿足三條真實路徑。每一條路徑都要能從資料模型、權限、UI、AI 與追蹤回到同一個閉環。

### 情境 A：業務員第一次成功體驗

目標：新業務員登入後 15 分鐘內感覺「這套工具真的幫我準備好拜訪」。

流程：

1. 註冊 / 登入。
2. 系統建立通訊處或個人 workspace。
3. 自動載入示範客戶，清楚標示為 demo data。
4. 業務員選擇一位客戶。
5. 看見客戶 360、保障缺口與 KYC 待確認項。
6. 一鍵產出訪前規劃。
7. 用 SPIN 完成需求澄清。
8. 做一次劇場演練。
9. 生成客戶版報告並分享。
10. 客戶開啟後回到 dashboard 產生 follow-up 任務。

成功指標：

- Time-to-first-value 小於 15 分鐘。
- 第一次 session 至少完成 `client_viewed`、`visit_plan_created`、`spin_started`、`report_generated` 其中三個事件。
- 每個空狀態都有下一步 CTA。

### 情境 B：主管封測體驗

目標：主管能看見團隊是否真的在使用，並知道該輔導誰。

流程：

1. 主管登入後進入團隊視角。
2. 看到本週訪前規劃覆蓋率、SPIN 完成率、劇場演練率、報告開啟率。
3. 點入某位業務員或某位客戶，查看對話摘要、報告品質、追蹤事件。
4. 留下 coaching feedback 或指派下一步任務。

成功指標：

- 每個團隊 KPI 都能回溯到 `InteractionEvent`。
- 主管不需要讀完整對話，也能理解風險與機會。

### 情境 C：客戶分享頁體驗

目標：客戶收到報告後覺得專業、個人化、可信，而不是 AI 罐頭文。

流程：

1. 客戶從 LINE / Email 打開 `/share/[token]`。
2. 看到自己的名字、情境、保障重點與下一步。
3. 可點擊「我想討論」或「預約下一次」。
4. 系統記錄開啟、停留、CTA 點擊。

成功指標：

- 分享 token 不可猜測，可過期。
- 分享事件能回寫到 CRM timeline。
- 公開頁不暴露內部銷售備註與 theater 評分。

## 2. 階段開發計劃

### Phase 1：資料底座與上線邊界

目標：讓現有 mock 產品可以開始往 Supabase/Postgres 遷移。

任務：

- Prisma core schema：Organization、User、Membership、Client、Policy、VisitPlan、SpinSession、TheaterSession、Report、ShareEvent、InteractionEvent。
- 所有業務資料加入 `organizationId`，支援 API 層多租戶查詢。
- 補 `src/lib/prisma.ts` 作為 server-side Prisma Client 入口。
- 補 Supabase connection string 範例：runtime pooled URL + migration direct URL。
- 建立資料分類欄位：demo data、sensitivity、compliance checklist。

本輪已開始實作此階段。

### Phase 2：Auth 與 Workspace

目標：讓使用者能安全登入，資料能隔離。

任務：

- Supabase Auth：Email + Magic Link。
- `User.supabaseAuthId` 對應 Supabase `auth.users.id`。
- 登入後建立或選擇 Organization。
- Middleware 保護 dashboard routes。
- API routes 從 session 取 `organizationId`，所有 query 必須 scope by organization。

決策：

- Prisma 作為 server-side ORM。若使用 Supabase Data API，才讓前端直接依 RLS 讀資料。
- 若 Prisma runtime 使用具高權限 DB role，必須在 API 層做 ownership check，不能把 RLS 當唯一防線。

### Phase 3：Demo Data 與 Onboarding

目標：新使用者一進來就能體驗完整閉環。

任務：

- `POST /api/onboarding/seed`：建立示範客戶、保單、事件、SPIN、報告。
- Demo banner：明確標示示範資料。
- 清除 demo data。
- 首次使用引導：CRM → Visit → SPIN → Report。

### Phase 4：核心資料遷移

目標：把 localStorage store 逐步替換成 API + Prisma。

順序：

1. Client + Policy + FamilyMember。
2. InteractionEvent + ReportShare tracking。
3. VisitPlan。
4. SpinSession + SpinMessage。
5. Report。
6. TheaterSession。

原則：

- 每次只換一條情境鏈，保持 demo 可用。
- Zustand 留作 cache，不再作為真實資料來源。
- API 使用 optimistic UI + background revalidation。

### Phase 5：AI 治理與成本控制

目標：AI 可以被監控、限流、回溯。

任務：

- `AiUsageLog` 紀錄 provider、module、tokens、latency、error。
- 每 org / 每 user 限額。
- Mock / real AI provider 狀態清楚顯示。
- 報告與建議加上 AI disclaimer 與人工確認狀態。

### Phase 6：封測與軟上線

目標：支援 5-10 位保險業務員封測，再開放小流量註冊。

任務：

- Sentry / logging。
- PostHog 或等價產品事件 funnel。
- 隱私政策與服務條款。
- 資料匯出與刪除。
- Supabase backup / PITR 策略。

## 3. Prisma / Supabase 設計決策

本輪依據官方文件做以下決策：

- Supabase Prisma guide 建議建立 Prisma DB user，並在 Supabase dashboard 取得 connection string。
- Supabase connection docs 區分 direct connection、session pooler 與 transaction pooler；serverless runtime 適合 transaction pooler，migration / admin tooling 適合 direct 或 session connection。
- Prisma PostgreSQL docs 建議 pooled runtime URL 與 direct CLI URL 分開，Prisma CLI / migrate 使用 direct URL。

落地方式：

- `.env.example` 提供 `DATABASE_URL` 給 runtime pooled connection。
- `.env.example` 提供 `DIRECT_URL` 給 Prisma CLI / migration。
- `prisma.config.ts` 改用 `DIRECT_URL`，避免 migration 經過 transaction pooler。
- Schema 全部核心業務 table 都加入 `organizationId` 與索引。
- Prisma 7 不再把 `url` / `directUrl` 放在 `schema.prisma`，並且 generated client 需要明確 `output`；本專案生成到 `src/generated/prisma`。
- Prisma 7 PostgreSQL runtime 透過 `@prisma/adapter-pg` 建立 `PrismaClient`，入口為 `src/lib/prisma.ts`。

參考來源：

- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Supabase connection strings: https://supabase.com/docs/guides/database/connecting-to-postgres
- Prisma 7 upgrade guide: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- Prisma PostgreSQL connector: https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql

## 4. 第一批驗收標準

- `prisma/schema.prisma` 能通過 `prisma validate`。
- `pnpm build` 不因 Prisma 基礎設施失敗。
- Prisma schema 能承接現有體驗版六步流程。
- 後續 API route 可用 `organizationId` 做強制 scope。
- 文件清楚標示上線還差哪些 Phase。
