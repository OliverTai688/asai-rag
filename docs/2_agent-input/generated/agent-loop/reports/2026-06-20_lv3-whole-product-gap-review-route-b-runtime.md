# ASAI LV3 Whole-product Gap Review - Route B runtime

日期：2026-06-20  
輪次類型：第五輪 whole-product gap review  
Automation：`10-agents-batch-task`  
Push：skipped by user instruction

## Scope

本輪依 `loop-state.json` cadence 進入第五輪校準，改執行 `lv3-whole-product-gap-review-loop.md`。範圍是盤點 ASAI LV3 沉浸式專業系統的完整體驗鏈：

`新增客戶 -> 關係圖 -> 拜訪準備包 -> 推論/問題清單 -> 劇場舞台 -> 群聊/私聊/人物狀態更新 -> AI 訪談補強資料`

本輪不實作 source code、不呼叫 OpenAI/Anthropic provider、不執行 DB/Prisma write。

## Whole-flow Inventory

| Surface | 狀態 | 主要事實 |
| --- | --- | --- |
| 新增客戶 | Ready with BFF gaps | DB-backed client CRUD 與合規欄位初始化已有 proof；剩餘 CRM archive/update 與 related-list BFF 未全收斂。 |
| 建立關係圖 | Ready with product gaps | relationship graph metadata/source review 與 family member remote write proof 已完成；主客戶 `parentMemberId` persistence、role/business/beneficiary taxonomy 與 broader related-list BFF 仍待補。 |
| 拜訪準備包 | Ready | `/pre-visit` list/detail/notes 已走 BFF；reasoning evidence、questions、theater handoff CTA 已有 persistence proof。 |
| 問題清單與推論依據 | Ready | Visit package 已保留 fact/inference/unknown、source references 與 reasoning evidence；需後續擴大到 report/share surfaces。 |
| 準備包建立劇場舞台 | Ready with runtime blocker | previsit/client -> theater build handoff、高敏感 gate、source review 與 Route B handoff/schema adapter 已完成；尚未進入真正 Route B runtime。 |
| 劇場群聊/私聊/狀態更新 | Source/proof gap | Additive schema 與 typed adapter 已存在；缺正式 DB migration proof、director/character/feedback runtime routes、group/private UI、state patch runtime QA 與 `AiUsageLog` success/error proof。 |
| AI 訪談補強資料 | Ready with expansion gap | PIM writeback 已可產生 CRM candidate/insight/follow-up task；尚未直接建立 `VisitPlanDraft` 或 `TheaterBuildDraft`。 |
| Onboarding/navigation | Source/proof gap | AI-first sidebar 已完成；role-aware navigation RAS-001..005 仍未執行。 |
| BFF/data ownership | Source/proof gap | BFF-104 已完成；BFF-001/002 未完成，`/reports` 仍 local store，`/issues` 仍 static mock，admin surface 仍讀 demo seed。 |
| Release proof | Operator/environment gap | `pnpm build` 仍受 Next/Turbopack Google Font path blocker 影響；尚未有 clean-browser end-to-end LV3 smoke。 |

## Top 10 Gaps

1. Route B runtime provider/BFF route missing  
   Type: source/proof gap. Severity 2, leverage 3. Handoff/schema adapter 已完成，但 `/api/ai/theater` 與 score route 仍是 legacy/staging posture，缺 director/character/feedback runtime contract。

2. Route B DB migration/proof not applied  
   Type: operator/proof gap. Severity 3, leverage 3. `prisma/schema.prisma` 已 additive，但上一輪只做 dry-run/no-DB-write；production migration 仍需 approval，development target 也必須先確認。

3. Theater UI session does not consume Route B sessions/characters/turns  
   Type: source gap. Severity 2, leverage 3. `/theater/build` 可產出 handoff，但 `/theater/[sessionId]` 尚未呈現 group/private/state-patch runtime。

4. AI interview writeback cannot create VisitPlanDraft/TheaterBuildDraft  
   Type: source gap. Severity 2, leverage 3. PIM writeback 目前寫 CRM candidate/insight/task，尚未讓 AI 訪談直接建立準備包或劇場草稿。

5. Full-site BFF inventory and shared API foundation still open  
   Type: source/proof gap. Severity 2, leverage 3. BFF-001/002 未完成，無全站資料來源責任矩陣會讓後續 page proof 容易混入 local/mock。

6. Reports library/detail/share action still local-store oriented  
   Type: source gap. Severity 2, leverage 2. `/reports` 與 `/reports/[reportId]` 仍依賴 `useReportStore`、local generation/share token。

7. Issues page still static mock  
   Type: source gap. Severity 2, leverage 2. `/issues` 使用 `MOCK_ISSUES`，尚未 member-scoped BFF。

8. Role-aware navigation unresolved  
   Type: source/proof gap. Severity 2, leverage 2. AI-first sidebar 完成，但 role/session/surface-aware projection 尚未落地。

9. Relationship graph taxonomy and root persistence incomplete  
   Type: product/source gap. Severity 1, leverage 2. 人物職位/年薪/狀態/source review 已可見；但 root primary client parent persistence 與保單受益/業務關係 taxonomy 仍待整理。

10. Full LV3 clean-browser release proof blocked  
    Type: environment/proof gap. Severity 2, leverage 2. Build font blocker 與缺少完整 clean-context smoke，讓「可上手、可沉浸」尚無 release-grade proof。

## Candidate Scores

| Candidate slice | Score | Reason |
| --- | ---: | --- |
| ITA-003b Route B development migration + deterministic runtime BFF gate | 19 | 直接接上 previsit/client/interview -> theater runtime，覆蓋群聊/私聊/人物狀態核心缺口；可用 guarded-disabled/no-provider proof 控制成本與安全。 |
| BFF-001 Full-site data-source inventory and responsibility matrix | 17 | 高安全、低風險，可一次暴露 reports/issues/admin/local-store 真相源缺口，避免後續 UI proof 建在混合資料源上。 |
| PIM/BFF writeback -> VisitPlanDraft | 16 | 強化「AI 訪談建立準備包」入口，能連接 interview -> previsit -> theater，但需要先界定 draft persistence 與 confirmation boundary。 |

## Selected Slice

Selected next implementation slice：`ITA-003b Route B development migration + deterministic runtime BFF gate`。

Acceptance shape:

- 開始前先確認 DB target 是 local/development 或明確授權 staging；不能確認時不做 db push，改 dry-run 並切到 `BFF-001`。
- 透過 `route-b-session-repository` 建立/讀取 Route B scene、characters、opening turn 的 deterministic proof。
- 補 director/character/feedback runtime route contract；provider 未啟用時回 guarded-disabled/no-provider proof，不寫假 usage。
- 若 provider 啟用，success/error path 都必須寫 `AiUsageLog`，且不得保存 raw provider payload。
- Proof 覆蓋 group/private visibility、private sentinel 不外洩、state patch 不寫 confirmed CRM fact、NPC 不杜撰 unknown。

## Changes

- 更新 `loop-state.json`：第五輪 review 計數歸零，指向本 report，下一輪推薦 `ITA-003b`。
- 更新 `AGENTS.md`：在 ITA-003 與 BFF-001 留下 whole-product review next-slice/fallback 註記。
- 更新 `PLN-015`：同步 ITA-003b runtime proof 入口。
- 更新 `PLN-019`：同步 BFF-001 fallback 盤點重點。
- 新增本 report。

## Validation

- PASS `git diff --check`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`

## Evidence

Source/read proof:

- `prisma/schema.prisma` 已包含 Route B additive schema fields。
- `src/lib/theater/route-b-session-repository.ts` 已提供 typed persistence adapter。
- `src/domains/theater/route-b-handoff.ts` 已提供 handoff contract。
- `/api/ai/theater` 與 `/api/ai/theater/score` 尚未成為 Route B director/character/feedback runtime。
- `/reports`、`/reports/[reportId]` 仍讀 local report store。
- `/issues` 仍讀 static mock issue data。

## DB/Prisma

本輪未執行 DB/Prisma 操作；未執行 provider call；無 `AiUsageLog` 需求。下一輪若要做 Route B migration，必須先確認 DB target 與 approval。

## Git

Local commit pending at report write time; push skipped by user instruction.

## Blockers

- Production Route B migration 仍需 operator approval。
- 若 current DB target 不能確認為 local/development/已授權 staging，下一輪不得 db push。
- Provider route 啟用前必須先定義 `AiUsageLog` success/error proof。
- `pnpm build` 仍有 Next/Turbopack Google Font path blocker，另案處理。

## Next Recommended Loop

`ITA-003b Route B development migration + deterministic runtime BFF gate`。

若 DB target/approval 不可確認，改跑：

`BFF-001 Full-site data-source inventory and responsibility matrix`。
