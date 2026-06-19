# 2026-06-20 LV3 Previsit Prep Package Redesign

## Scope

本輪依使用者補充「previsit 拜訪準備包可以重新研究、介面結構可全部改掉，變成更適合專案情」選擇一個可 review / 可驗收 slice：重整 `/pre-visit/[planId]` detail 介面為專案型拜訪準備包。

LV3 定義仍為產品架構、體驗、介面與容易操作的沉浸式專業系統成熟度；本輪不宣稱 public launch Level 3 ready。

## Candidate Score

1. `lv3-previsit-reasoning-trace + lv3-relationship-to-previsit-package` — 20/20  
   直接回應使用者最新偏好，連接關係圖、準備包、問題清單、推論依據與劇場 handoff，且可用現有 BFF/browser proof 驗收。
2. `lv3-previsit-to-theater-stage / Route B interaction shell` — 17/20  
   可延伸準備包到 theater，但目前使用者更明確要求先把 previsit 本身改成專案情境；provider 仍需 guarded-disabled。
3. `lv3-cross-flow-onboarding-proof` — 16/20  
   有助整體易上手驗證，但若未先重整準備包資訊架構，proof 只能驗現況而不能提升核心體驗。

## Selected Slice

Selected: `LV3 previsit preparation package redesign`

外部研究依據：
- [Cirrus Insight: Sales Call Preparation](https://www.cirrusinsight.com/blog/sales-call-preparation)：call prep 應包含買方/公司研究、CRM history、目標、關鍵問題、異議與下一步。
- [HubSpot: Pre-call Planning](https://blog.hubspot.com/sales/pre-call-planning)：pre-call/demo 應使用 discovery notes、痛點與具體 use case，避免 generic prep。
- [Gong: Sales Call Planning](https://www.gong.io/blog/sales-call-planning)：需辨識決策者、組織/關係結構、競品與 agenda。
- [SiftHub: Pre-call Planning](https://www.sifthub.io/blog/pre-call-planning)：準備包應整理 account history、目標、可能問題/異議、證據與下一步。
- [Upcell: Sales Call Planning](https://www.upcell.io/glossary/sales-call-planning/)：call plan 應精簡成 objective、prospect context、top questions、objections、next step。

## Changes

- `/pre-visit/[planId]` 標題與第一屏改為「拜訪準備包」而非作戰台。
- 新增「專案情境」first-screen summary：成功判準、決策地圖焦點、第一個問題、劇場下一步。
- 新增「核心問題清單」：從完整 SPIN 題組排序出前三個高價值問題，顯示已知/推論/待確認數量、推論摘要、evidence line 與現場確認 prompt。
- 新增「決策地圖」：主客戶顯示職位、年薪、狀態、KYC 與 tag；關係節點顯示關係脈絡、年齡/連結狀態、推論/待確認標籤。
- 完整 SPIN 題組保留為下方完整問題庫；Theater handoff CTA 保留為 `建立劇場舞台` / `帶入劇場建場`。
- `scripts/visit-bff-qa.mjs` 更新 browser proof：驗證「拜訪準備包」「專案情境」「核心問題清單」「決策地圖」「推論依據」「劇場 handoff」。

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `DEMO_QA_BASE_URL=http://localhost:3023 pnpm visit:bff-qa`
  - unauth `GET /api/visits` returns 401
  - demo user client/visit APIs return 200/201
  - deterministic generated package PATCH persists objective, questions, evidence, notes
  - theater handoff returns READY
  - browser desktop/mobile renders new prep-package structure
  - no horizontal overflow on detail desktop/mobile and notes desktop
  - no provider route invoked
- PASS in-app Browser demo session read-only check:
  - visible `/pre-visit/cmqljjhdi0000c461km0mxtzb`
  - `hasPrepPackage=true`
  - `hasProjectContext=true`
  - `hasPriorityQuestions=true`
  - `hasDecisionMap=true`
  - `hasReasoningEvidence=true`
  - `hasTheaterHandoff=true`
  - `horizontalOverflow=false`

## Evidence

- Screenshots updated:
  - `docs/06_audits-and-reports/screenshots/lv3-previsit-bff/2026-06-20-previsit-bff-detail-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-previsit-bff/2026-06-20-previsit-bff-detail-mobile.png`
  - `docs/06_audits-and-reports/screenshots/lv3-previsit-bff/2026-06-20-previsit-bff-notes-desktop.png`
- QA-created demo/test VisitPlan: `cmqljjhdi0000c461km0mxtzb`
- Provider/AiUsageLog proof: no OpenAI/Anthropic provider call; `visit:bff-qa` explicitly does not call `/api/ai/visit`.

## DB/Prisma

- No Prisma schema change.
- No `prisma generate`, no `prisma db push`, no destructive DB operation.
- Non-destructive development/demo DB write proof only: `POST /api/visits` + `PATCH /api/visits/[id]` created/updated a demo VisitPlan for evidence.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 18]`, clean.
- Final commit is created after this report is written; final response includes commit hash.
- Push: `push skipped by user instruction`.

## Blockers

- No new blocker from this slice.
- Existing blocker remains: `pnpm build` still has Next/Turbopack Google Font path issue.
- Existing provider blocker remains: Route B live provider success/error paths still need explicit approval and `AiUsageLog` proof.

## Next Recommended Loop

Cadence now reaches 4 normal loops since last whole-product review. Next loop should run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md` and review client -> relationship graph -> previsit package -> theater continuity after this previsit redesign.
