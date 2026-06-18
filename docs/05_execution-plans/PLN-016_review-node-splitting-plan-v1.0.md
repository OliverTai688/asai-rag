# 誠問 AI Review Node Splitting Plan v1.0

> 建立日期：2026-06-18  
> 狀態：待執行  
> 目的：把目前大型 working tree 拆成可審查、可回滾、可接續的 review 節點。

---

## 1. 結論

目前 working tree 混合了 docs migration、UI redesign、PSA 多角色架構、demo seed、subscription/billing、super admin、ITA 訪談 Agent 等多條 workstream。若直接做單一 PR，review 風險過高，也不利 rollback。

建議拆成 6 個 review nodes：

| Node | 名稱 | 性質 | 風險 |
| --- | --- | --- | --- |
| RN-001 | Docs governance and batch-task source of truth | docs only | 低 |
| RN-002 | Modern UI / AI-first sidebar completed work | UI | 中 |
| RN-003 | Multi-role SaaS schema and surfaces | schema + UI + docs | 高 |
| RN-004 | Demo seed and runtime mockdata removal | script + store + DB | 高 |
| RN-005 | Interview Agent M1 | AI route + UI + domain | 中高 |
| RN-006 | Theater Route B migration | schema + AI + UI | 最高 |

---

## RN-001 - Docs Governance And Batch-task Source Of Truth

範圍：

- `AGENTS.md`
- `docs/00_manual-and-index/`
- `docs/01_product-requirements/`
- `docs/02_architecture-and-rules/`
- `docs/05_execution-plans/`
- `docs/06_audits-and-reports/`
- `docs/07_research-and-design/`
- `docs/08_acceptance-and-qa/`

驗收：

- MAN index 連結正確。
- 文件數量與新增文件一致。
- AGENTS 的 workstream 與 PLN/ACC 文件互相引用。
- `pnpm lint:changed` 通過。

不含：

- UI code。
- schema migration。
- AI route。

---

## RN-002 - Modern UI / AI-first Sidebar Completed Work

範圍：

- `src/app/(dashboard)/*` modern UI 改版。
- `src/components/layout/sidebar.tsx` AI-first navigation。
- UI primitives / global CSS。
- modern-ui screenshots。

驗收：

- `MM-*`、`AIS-*` 在 AGENTS 與 PLN 文件狀態一致。
- desktop/mobile 無水平 overflow。
- icon-only controls 有 aria/tooltip。
- `pnpm lint:changed` 通過。

不含：

- PSA schema。
- demo seed。
- ITA routes。

---

## RN-003 - Multi-role SaaS Schema And Surfaces

範圍：

- `prisma/schema.prisma` 中 PSA schema：PlanConfig、OrganizationUnit、billing、platform audit/impersonation。
- `src/app/(auth)/`、`src/app/(client-auth)/`、`src/app/(super-admin)/`。
- `src/domains/subscription/`、`src/domains/platform/`、`src/domains/team/unit-scope.ts`。
- `src/components/subscription/`。

驗收：

- `pnpm prisma:validate`、`pnpm prisma:generate`、`pnpm prisma db push --accept-data-loss` 通過或 migration plan 明確。
- super admin session 與 app session 分離。
- org manager aggregate-only。
- ECPay production readiness 不啟用正式金流。

阻擋：

- Supabase Auth env/session guard 尚未完成。
- ECPay credentials/callback domain 尚未提供。
- staging access cookie/password 尚未提供。

---

## RN-004 - Demo Seed And Runtime Mockdata Removal

範圍：

- `scripts/seed-demo.mjs`
- `scripts/demo-preflight.mjs`
- `scripts/demo-runtime-audit.mjs`
- `src/domains/demo/seed-fixtures.ts`
- stores 移除 business localStorage persistence。
- `/api/mock/*` production guard。

驗收：

- `pnpm demo:preflight` 通過。
- `pnpm demo:seed:reset` 通過。
- `pnpm demo:runtime-audit` 通過。
- 清空 browser storage 後 demo account 重新登入仍看到完整範例資料。

阻擋：

- Supabase Auth public env/session guard 尚未完成，因此最後一項仍需 auth work 完成後補驗。

---

## RN-005 - Interview Agent M1

範圍：

- `src/domains/interview/`
- `src/app/(dashboard)/interview/page.tsx`
- `src/app/api/ai/interview/`
- `src/lib/ai/usage-log.ts`
- `prisma/schema.prisma` 的 `AiModule.INTERVIEW`
- `RES-010`、`RES-011`、`PLN-015`、`ACC-006`

驗收：

- 獨立模式可開始、送出回答、累積素材、生成準備卡。
- output success/error path 都寫 `AiUsageLog`。
- Issue/PQ 使用 fact/inference/unknown 與 compliance mapping。
- `pnpm lint:changed`、`pnpm exec tsc --noEmit --pretty false` 通過。

阻擋：

- OpenAI quota 已可用；`/api/ai/interview/outputs` success path 與 `AiUsageLog` 實際寫入驗證已完成，仍需補 `/interview` 頁面按鈕層 Browser 截圖與 console QA。
- 不包含 CRM 寫回與 DB persistence。

---

## RN-006 - Theater Route B Migration

範圍：

- Theater schema 一次切換。
- 多角色導演編排。
- narrator NPC 缺資料詢問機制。
- 五視角質化回饋。
- 異議庫與紅線偵測。
- RAG / pgvector 樁。

驗收：

- migration/rollback note。
- 不保留 legacy Theater fallback 作新主流程。
- NPC 不杜撰 facts；unknown 由旁白 NPC 提問，使用者可略過或補充資訊。
- 高敏感客戶需 owner reason + risk consent。
- Org manager aggregate-only。
- 每次 AI call 寫 `AiUsageLog`。

阻擋：

- Supabase pgvector 權限。
- 成本/quota API gate。
- migration review。

---

## 2. Suggested Order

1. RN-001：先固定文件與 batch truth source。
2. RN-005：訪談 Agent M1 可單獨 review，避免被 UI/PSA 大量 diff 淹沒。
3. RN-004：demo seed/mockdata removal，需接 auth 最後驗收。
4. RN-003：schema + auth/billing/super admin。
5. RN-002：UI redesign 可在 RN-001 後獨立 review。
6. RN-006：Theater Route B，最後單獨處理。

---

## 3. Agent Instructions

- 不要把 RN-006 Theater migration 混進 RN-005。
- RN-003/004 若缺 env 或 credentials，不得宣稱 production complete。
- 每個 review node 必須列出 verification commands。
- 若要 commit，先只 stage 該 node 的檔案，避免把其他 workstream 混入。
