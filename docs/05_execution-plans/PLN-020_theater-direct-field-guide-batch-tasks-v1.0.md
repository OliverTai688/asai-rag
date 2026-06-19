# 誠問 AI Theater Direct Field Guide Batch Tasks v1.0

> 建立日期：2026-06-19  
> 狀態：待執行  
> 研究依據：`RES-019_theater-direct-field-guide-gap-framework-v1.0.md`  
> 架構依據：`ARC-004_interview-theater-dual-agent-design-v1.1.md`  
> 訪綱依據：`RES-003_theater-field-semi-structured-interview-guide.md`、`RES-004_advisor-companion-semi-structured-interview-guide.md`  
> 驗收依據：`ACC-012_theater-direct-field-guide-acceptance-framework-v1.0.md`、`ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`

本計畫把 `RES-019` 的 TDF-GAP 研究轉成 `AGENTS.md` 可逐張執行的 batch tasks。核心修正是：`AI 劇場演練` 不以「已完成 AI 了解客戶 / SPIN 摘要」作為唯一前置條件，而是支援三種建場來源：劇場訪綱 B 直接建場、帶客戶資料建場、從既有訪談產物轉入。

本 workstream 是 ITA-003 Route B 前置切片：先解除 `/theater` legacy SPIN 入口依賴、建立訪綱 B 與 setup draft contract，再進入多角色 schema / director / visibility scope 的高風險遷移。除 TDF-005 外，不改 Theater legacy enum/scoring/schema。

---

## 0. 執行協定

每張卡固定遵守：

1. 先讀 `AGENTS.md`、`RES-019`、本 `PLN-020`、`ACC-012`；涉及 ITA Route B 時再讀 `ARC-004`、`PLN-015`、`ACC-006`。
2. 改 Next route/page/layout 前，先讀 `node_modules/next/dist/docs/` 對應文件。
3. 不改 SPIN 狀態機；不刪改 client/policy 合規欄位。
4. 除 TDF-005 外，不改 Theater legacy enum、score route、tension schema；避免把 Route B migration 混進入口修正。
5. 所有素材 contract 必須能區分 `fact` / `inference` / `unknown` 與來源 provenance。
6. 每輪跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；動 schema 才跑 `pnpm prisma:validate` / `pnpm prisma:generate`。
7. 完成卡片後同步本文件、`AGENTS.md`，並記錄變更檔案與 QA proof。

---

## 1. 進度看板

| 卡片 | 主題 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| TDF-000 | Workstream 文件與 AGENTS 登錄 | [x] | `RES-019` |
| TDF-001 | Theater direct setup IA correction | [x] | TDF-000 |
| TDF-002 | 訪綱 B TS outline + setup draft contract | [x] | TDF-000 |
| TDF-003 | 劇場訪綱建場 prototype | [x] | TDF-001、TDF-002 |
| TDF-004 | 客戶資料一鍵建場與合規 gate | [ ] | TDF-002、session/BFF guard |
| TDF-005 | Route B handoff packet for multi-character Theater | [x] | TDF-002、ITA-003 |
| TDF-006 | Cross-state QA and docs sync | [ ] | TDF-001..TDF-004 |

---

## Batch TDF-000 - Workstream 文件與 AGENTS 登錄

目標：把 `RES-019` 研究轉成可執行 batch workstream。

- [x] 新增 `PLN-020`，拆成可逐張執行的 Theater Direct Field Guide batch tasks。
- [x] 新增 `ACC-012`，定義 direct setup、訪綱 B、setup draft、客戶資料建場、合規、QA 驗收。
- [x] 更新 `AGENTS.md`，新增 TDF workstream 鏡像。
- [x] 更新 `MAN-001` 文件索引。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不改 `/theater` UI；不改 Theater schema；不改 API route。

---

## Batch TDF-001 - Theater direct setup IA correction

目標：先修正 `/theater` 產品心智，讓 AI 劇場不是 SPIN / 顧問訪談的附屬頁。

- [ ] `/theater` header 文案移除「從一份 SPIN 摘要開始」前置語意，改成「選建場方式 -> 確認素材 -> 開始演練」。
- [ ] 第一屏新增三入口 selector：`用劇場訪綱建場`、`帶客戶資料建場`、`從既有訪談轉入`。
- [ ] 無 SPIN / interview material 時仍能選 `用劇場訪綱建場`，主 CTA 不 disabled。
- [ ] 既有 `fromSpin` / `spinId` quickstart path 保持可用，不破壞 Quickstart demo flow。
- [ ] 空狀態改為引導劇場訪綱 B，不再要求先完成 AI 了解客戶。
- [ ] 不改 Theater legacy enum、store schema、score route。
- [ ] Browser QA：`/theater` desktop/mobile 無水平 overflow、console error 0、三入口 accessible name 可讀。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不做訪綱 B wizard；不生成多角色 session。

---

## Batch TDF-002 - 訪綱 B TS outline + setup draft contract

目標：把 `RES-003` 從文件轉成可被 engine / UI / Route B 使用的純 TS contract。

- [ ] 新增 `theaterFieldOutline`，沿用 `InterviewOutline` 型別，包含 7 段、核心題、追問、goal/dataSource/purpose、output schema。
- [ ] 新增 `TheaterSetupDraft`、`TheaterCharacterDraft`、`TheaterRelationDraft`、`TheaterMaterialSource`、`TheaterMaterialFactStatus` 等 pure types。
- [ ] 建立 mapping helper：outline answers/materials -> setup draft，輸出場域概述、角色卡、關係張力、三層次摘要、核心場景、待確認問題。
- [ ] 每條素材可標記 `fact` / `confirmed` / `inference` / `unknown` 與 source reference。
- [ ] NPC draft 上限 <= 4；焦點客戶必須存在。
- [ ] 不呼叫 provider、不動 Prisma、不改 legacy Theater store。
- [ ] Unit/pure test 或 source-level proof：給定最小素材能產出 setup draft，未知項不被升格成 fact。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不做 DB persistence；不做 Route B director。

---

## Batch TDF-003 - 劇場訪綱建場 prototype

目標：讓使用者可從 `/theater` 直接跑劇場訪綱 B，產生可確認的 setup draft。

- [ ] `/theater` 點 `用劇場訪綱建場` 開啟 wizard/sheet/full-page flow。
- [ ] 訪綱 B 依段落推進，不跳段；核心題未填時清楚提示，但允許標 `unknown`。
- [ ] 右側或完成頁顯示 setup draft review：場域、角色、關係、三層次、核心場景、未知資訊。
- [ ] 使用者可編輯 draft；編輯後保留 fact/inference/unknown 標記。
- [ ] 完成 draft 後回到 setup summary，主 CTA 可進入 legacy-safe placeholder 或明確標示 Route B 尚未啟用。
- [ ] 不把 draft 寫入 CRM；不把 inference 當 confirmed fact。
- [ ] Browser QA：desktop/mobile、keyboard focus、無水平 overflow、console error 0。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不接 OpenAI 生成；不做 DB persistence；不做多角色對話。

---

## Batch TDF-004 - 客戶資料一鍵建場與合規 gate

目標：從既有客戶資料安全建出 setup draft，並補上真實客戶進劇場的保護。

- [ ] 建立 server/service contract：`buildTheaterMaterialFromClient(clientId)` 或同等 BFF，scope 由 `requireCurrentMember()` 推導。
- [ ] 載入 client / family / policy / visit / confirmed interview facts，輸出 known facts、missing fields、inferences、sensitivity warnings。
- [ ] `/theater` `帶客戶資料建場` 可選 owner 可讀客戶；org manager 不得讀 member 客戶明細。
- [ ] `sensitivityLevel` 高敏感客戶需 explicit confirmation、reason、riskAccepted 才可建場。
- [ ] setup draft review 可區分已知、待確認、推論；未知項可轉成旁白 NPC 待問問題。
- [ ] 不刪改 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [ ] API proof：unauth 401、越權 403、高敏感缺 reason blocked、正常 demo client 可產出 draft。
- [ ] Browser QA：desktop/mobile 建場流程、錯誤狀態、console error 0。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；動 schema 才跑 Prisma。

進行中註記：2026-06-20 新增 LV3 pre-visit → theater handoff source/proof slice：`src/domains/theater/visit-handoff.ts` 可把 `VisitPlan`、`Client`、準備包 SPIN question reasoning evidence、family/policy/objection/material/compliance gap 轉成 `TheaterBuildPacket` 已知素材，保留 `FACT` / `INFERENCE` / `UNKNOWN` 分層；高敏感客戶缺 `reason`/`riskAccepted` 時回 `BLOCKED_SENSITIVE` 且 `canStartSimulation=false`。本 slice 不建立 BFF、不宣稱 TDF-004 完成、不改 Theater legacy enum/scoring/schema、不呼叫 provider、不寫 CRM。Proof：`pnpm visit:theater-handoff-dry-run` 通過，確認 READY packet、NPC ≤ 4、未知不升格成 fact、email/phone 不外洩。

進行中註記：2026-06-20 續補 member-scoped persisted visit package → theater build BFF proof：新增 `GET /api/visits/[id]/theater-handoff`，由 `requireCurrentMember()` 推導 org/member/unit，讀 DB `VisitPlan` + client detail policy，回傳 client-safe summary、knownMaterials、warnings/missing、`TheaterBuildPacket`。`/theater/build?visitPlanId=...` 會優先讀此 server-owned handoff，失敗才退回舊 `clientId` 預載。新增 `pnpm visit:theater-bff-qa` 覆蓋 unauth 401、missing 404、demo persisted visit 200、email/phone/raw private sentinel 0、desktop/mobile theater build 無 overflow。TDF-004 仍未完成，因為尚未提供完整 client selector、高敏感 reason/riskAccepted UI 與 full customer-data build review flow。

進行中註記：2026-06-20 續補 persisted visit package → theater build 高敏感 gate：`GET /api/visits/[id]/theater-handoff` 保持 read-only，新增 `POST /api/visits/[id]/theater-handoff` 僅接受 `riskAccepted=true` 與 8 字以上 reason，通過後寫 `InteractionEvent` audit（metadata source `visit_theater_handoff_approval`）並回傳 READY handoff；`/theater/build?visitPlanId=...&source=previsit` 新增準備包來源審查 panel，顯示 known facts / inferences / unknowns source counts、source preview 與高敏感確認 UI，approval 後才允許進 setup review。新增 `pnpm visit:theater-gate-qa` 覆蓋 unauth 401、高敏感缺 approval blocked、invalid approval 400、approved audit write、email/phone/raw private sentinel 0、desktop/mobile no overflow 與 no-provider proof。TDF-004 仍未完成，因為 `/theater` client selector、越權 403 與完整 owner-readable client-data build flow 尚待補。

進行中註記：2026-06-20 續補 `/theater` client selector + owner-scoped client-data build review：新增 `src/domains/theater/client-build.ts` pure builder、`src/lib/theater/client-build-repository.ts`、`GET /api/theater/client-builds` 與 `GET /api/theater/client-builds/[clientId]`。列表只回 owner-readable client build options；detail 由 current member scope 推導 org/member/unit，同 org 但非 owner 回 `403 CLIENT_FORBIDDEN`。`/theater` 的 `帶客戶資料建場` 改讀此 BFF，選客戶後先顯示 known facts / inference / unknown review；`/theater/build?clientId=...&source=client` 也改讀同一 BFF，移除舊 `/api/clients/[id]` fallback。高敏感 client 直建場回 `BLOCKED_SENSITIVE` 且 `canStartSimulation=false`，需改走準備包 high-sensitive approval flow。新增 `pnpm theater:client-build-qa` 覆蓋 unauth 401、member 200、manager 403、高敏感 blocked、email/phone/raw private sentinel 0、desktop/mobile no overflow 與 no-provider proof。TDF-004 仍未完成，因 Route B multi-character session 與完整 production theater migration 另屬 TDF-005/ITA-003。

範圍外：不完成 Route B multi-character session；不做 public share。

---

## Batch TDF-005 - Route B handoff packet for multi-character Theater

目標：把 TDF setup draft 交接到 ITA-003 Route B migration，避免入口修正與 schema 遷移混在一起。

- [x] 撰寫 migration/compatibility brief：legacy `personaType`、`tension`、`score` 與新 `TheaterCharacter` / feedback 的切換策略。
- [x] 定義 `TheaterSetupDraft -> TheaterScene -> TheaterCharacter[]` handoff contract。
- [x] 定義 director input：場景狀態、scoped history、角色卡、visibility rules、業務員 utterance。
- [x] 定義 character call input：角色卡、addressee、visibility scope、director directive、可見歷史。
- [x] 定義 AiUsageLog 策略：director call、character call、feedback call 都要可追蹤。
- [x] 定義 rollback note：Route B 未啟用時 `/theater` 可停在 setup draft，不宣稱 production multi-character theater。
- [x] 更新 `PLN-015` ITA-003 references，避免雙重任務來源互相打架。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；若動 schema 需 Prisma。

範圍外：不在本卡直接完成 full Route B migration，除非 operator 明確指定本輪進入 ITA-003。

Whole-product review 註記（2026-06-20）：第五輪校準後的下一個建議切片是 `TDF-005a Route B handoff packet and migration compatibility brief`。本切片應先完成文件/contract/proof planning，不直接改 Theater schema：定義 setup draft 到 scene/characters 的 handoff、director/character inputs、群聊/私聊 visibility scope、人物狀態更新邊界、director/character/feedback `AiUsageLog` 策略、Route B disabled rollback note，並同步 `PLN-015` ITA-003，讓後續真正進 migration 時有可 review 邊界。

完成註記（2026-06-20）：`src/domains/theater/route-b-handoff.ts` 已新增 deterministic handoff contract，將 `TheaterBuildPacket` 映射成 `TheaterRouteBScene` / `TheaterRouteBCharacter[]` / visibility rules / state patches / director input / character input / AiUsage plan / runtime rollback boundary。`docs/06_audits-and-reports/AUD-007_theater-route-b-handoff-compatibility-brief-v1.0.md` 記錄 legacy `personaType`、`tension`、`score` 相容策略與 ITA-003 接手邊界。`pnpm theater:route-b-handoff-dry-run` 通過，覆蓋 NPC ≤ 4、unknown 不升格、private/group scoped history、state patch 不寫 confirmed CRM fact、director/character/feedback `AiUsageLog` 要求、Route B disabled rollback 與 no-provider proof。未動 Prisma schema、不呼叫 provider、不寫 DB；production multi-character Theater 仍需 ITA-003/ITA-006 實作。

---

## Batch TDF-006 - Cross-state QA and docs sync

目標：把 direct setup 的入口、訪綱、draft、客戶資料與文件狀態收乾淨。

- [ ] `/theater` 無素材狀態可直接開始劇場訪綱 B。
- [ ] `/theater` 有 legacy SPIN / interview material 時，`從既有訪談轉入` 仍可用。
- [ ] `/theater` 帶客戶資料建場的 known/gap/inference review 通過。
- [ ] 高敏感客戶建場 gate 與 audit proof 通過。
- [ ] Browser QA 保存 desktop/mobile 截圖到 `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/`。
- [ ] 更新 `AGENTS.md`、`PLN-020`、必要 report / issue-question。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma 與 Browser QA。

---

## Current TDF Blockers

- TDF-004 需要 session/BFF guard 可安全推導 current member scope；若 guard 尚未完成，先做 service contract + mocked/demo proof，不宣稱 production-ready。
- 高敏感客戶進劇場需 explicit confirmation、reason、riskAccepted；不得繞過。
- Route B 多角色 schema / director / visibility scope 仍歸 `PLN-015` ITA-003 / ITA-006；TDF-005 只做 handoff packet，除非本輪明確切入 ITA-003。
- Supabase pgvector / RAG 不應成為 TDF-001..TDF-003 的依賴。
