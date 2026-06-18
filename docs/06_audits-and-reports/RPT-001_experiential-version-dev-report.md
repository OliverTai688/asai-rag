# 誠問 AI 可體驗版 Dev Report

| 項目 | 內容 |
| :--- | :--- |
| 研究日期 | 2026-05-22 |
| 依據文件 | `docs/06_audits-and-reports/AUD-001_experiential-version-audit-report.md` |
| 本輪開發目標 | 建立可體驗版中樞模組，串起現有 CRM、訪前規劃、SPIN、劇場、報告與追蹤 |
| 技術基準 | Next.js 16.2.4 App Router、React 19、Zustand persist、Tailwind v4、shadcn / Base UI |

## 1. 實作策略

Audit 結論顯示：現有功能已接近可 demo，但缺少「讓使用者知道如何體驗」的中樞。因此本輪開發不先重做任一單點功能，而是新增一個 **Experience Preview Hub**。

此模組要做到：

1. 把可體驗版功能包拆成清楚的 6 步路徑。
2. 顯示目前產品 readiness、已完成模組與待開發缺口。
3. 對外部 Top 3 標竿做功能定位，避免產品方向變成泛 CRM。
4. 提供可點 CTA，直接進入現有功能頁。
5. 保持純前端 mock，不引入新後端風險。

## 2. 現有程式碼盤點

| 區塊 | 目前狀態 |
| :--- | :--- |
| Routing | 已使用 `src/app` App Router；dashboard route group 為 `src/app/(dashboard)` |
| Layout | `src/app/(dashboard)/layout.tsx` 內含 Sidebar、TopBar、GlobalAssistant |
| Navigation | `src/components/layout/sidebar.tsx` 以 `navItems` 陣列定義 |
| CRM | `src/domains/client/*` + `/crm`、`/crm/[clientId]`，Zustand persist seed clients |
| Visit | `src/domains/visit/*` + `/pre-visit`，Zustand persist seed plans |
| SPIN | `src/domains/spin/*` + `/spin`，階段輸出與 mock suggestions |
| Theater | `src/domains/theater/*` + `/theater`，角色演練與 score |
| Report | `src/domains/report/*` + `/reports`、`/share/[token]` |
| Team | `/team` 已有團隊聚合雛形 |
| AI | `/api/ai/*` 與 `/api/mock/ai/*` 並存 |
| DB | `prisma/schema.prisma` 目前只有 Issue model，尚未承接核心業務資料 |

## 3. 本輪新增模組

### 3.1 Domain 模組

新增：

- `src/domains/experience/types.ts`
- `src/domains/experience/mocks.ts`

目的：

- 將體驗版路徑、標竿網站、readiness、開發缺口集中管理。
- 避免在 page component 內硬編大段資料。
- 未來可以替換為後端返回的 demo configuration。

### 3.2 Page 模組

新增：

- `src/app/(dashboard)/pilot/page.tsx`

頁面內容：

1. 可體驗版總覽與目前 readiness。
2. 六步體驗路徑，每步有對應 route CTA。
3. Top 3 benchmark 摘要。
4. 開發缺口清單。
5. 下一步工程任務。

### 3.3 Navigation

更新：

- `src/components/layout/sidebar.tsx`

新增側欄入口：

- 名稱：`體驗版`
- 路徑：`/pilot`
- Icon：`Compass`

## 4. 路由與 Next.js 注意事項

已依本機 `node_modules/next/dist/docs/` 確認：

- App Router 以資料夾 + `page.tsx` 建立 route。
- 頁面預設為 Server Component；若需要 state / event handler 才加 `"use client"`。
- 本輪 `pilot/page.tsx` 為靜態資料呈現，可維持 Server Component，減少 client JS。
- 不新增 route handler，因此不涉及 route handler caching 或 HTTP method 行為。

## 5. 待開發項目

| 優先級 | 項目 | 說明 |
| :--- | :--- | :--- |
| P0 | Auth / org / role | 目前沒有登入、多租戶、角色權限；正式 beta 前必須補 |
| P0 | Core Prisma schema | Client、Policy、VisitPlan、SpinSession、Report、Event 尚未入 DB |
| P0 | AI 模型狀態治理 | 需統一 mock / real AI 開關、錯誤狀態、輸出 disclaimer |
| P0 | Engagement tracking | `/share/[token]` 追蹤需從 mock event 轉真資料 |
| P1 | KYC / suitability checklist | 客戶頁與訪前規劃應加入合規檢核 |
| P1 | Report template versions | 初訪、加保、續保、轉介紹應有不同模板 |
| P1 | Team coaching workflow | 主管可回饋 SPIN / theater / report 品質 |
| P1 | Import / export | CSV 匯入、PDF / DOCX 匯出、LINE 分享 |
| P2 | Carrier / calendar integrations | 保險公司 API、Google Calendar、通知通道 |

## 6. 驗收標準

本輪完成後應符合：

1. `/pilot` 可以在 dashboard layout 中開啟。
2. Sidebar 顯示 `體驗版` 且 active state 正常。
3. 頁面能引導使用者進入 `/crm`、`/pre-visit`、`/spin`、`/theater`、`/reports`、`/team`。
4. 頁面內容與 audit report 的功能包一致。
5. `pnpm build` 成功。

## 7. 後續建議開發順序

1. **Pilot Hub v1**：本輪實作。
2. **Demo scenario state**：為體驗版建立固定 demo client / plan / report chain，避免每頁資料脫節。
3. **KYC checklist**：加入 CRM / pre-visit，強化保險垂直可信度。
4. **Real event tracking**：把 share open / click / read duration 存入 event domain。
5. **Prisma core schema**：從 Client、Policy、VisitPlan、SpinSession、Report 開始落 DB。
6. **Auth + org isolation**：完成 beta 上線基本安全線。

## 8. 本輪開發決策

先實作 `Pilot Hub v1`，因為它能立刻提升可體驗版完整性，且不會破壞既有 mock data 與業務流程。這個模組也會成為後續 demo scenario、合規 checklist 與 tracking 的承載入口。
