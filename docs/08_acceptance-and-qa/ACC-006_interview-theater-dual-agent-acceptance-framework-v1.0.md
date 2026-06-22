# 誠問 AI Interview × Theater Dual Agent Acceptance Framework v1.0

> 建立日期：2026-06-18  
> 適用範圍：`PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md` 的 ITA workstream。  
> 關聯文件：`ARC-004`、`AUD-004`、`RES-003`、`RES-004`、`RES-010`。

---

## 1. 驗收目標

每張 ITA 卡完成時必須同時滿足：

1. **訪談可信**：逐段訪談、自然追問、素材可被分成事實/推論/未知。
2. **產出可用**：客戶輪廓表、對話準備卡、PQ、Issue Readiness、劇場場景能被顧問編輯與確認。
3. **劇場安全**：多角色、visibility scope、私聊/群聊、導演編排不杜撰真實客戶事實。
4. **回饋可輔導**：五視角質化回饋取代總分，紅線偵測可解釋且可標不適用。
5. **合規與成本可追蹤**：合規欄位不被刪改；每次 AI call 寫 `AiUsageLog`。

---

## 2. Hard Rule Checklist

- [ ] 不刪除、不 optional 化 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [ ] 不破壞 SPIN legacy `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF` 狀態機。
- [ ] Theater schema 只在 ITA-003/ITA-006 依 Route B 遷移，不在其他卡片順手改。
- [ ] OpenAI/Anthropic 每次呼叫寫 `AiUsageLog`，錯誤也要記錄。
- [ ] 不手改 `src/generated/`。
- [ ] Org manager 不看 member 客戶明細、逐字稿、私聊內容。
- [ ] 高敏感客戶進劇場需要 explicit confirmation 與 audit reason。

---

## 3. Interview Acceptance

- [ ] 訪談依 outline 順序推進，不跳段。
- [ ] 每段核心題未完成前，不允許標段落完成。
- [ ] 回答素材標記 `FACT`、`CONFIRMED`、`INFERENCE`、`UNKNOWN` 或等價資料結構。
- [ ] AI 回覆不把推論寫成事實；未知資訊要追問或標未知。
- [ ] 獨立模式不寫回 CRM。
- [ ] 客戶資料模式寫回前必須顯示確認卡。
- [ ] 產出的客戶輪廓表與對話準備卡可編輯。
- [ ] 人格推論只能用白話描述，不顯示分數或硬類型標籤。

---

## 4. Issue / PQ Acceptance

- [ ] PQ 題庫引用 `RES-010` 或後續業務核准版本。
- [ ] Issue 0-5 使用 Issue Readiness Level，不作成交率或客戶好壞評分。
- [ ] IRL 至少檢查：事實完整度、問題表徵、風險與因應、決策準備、顧問行動性。
- [ ] IRL 顯示缺口與下一步，不只顯示數字。
- [ ] Client-facing share page 不顯示內部 IRL 分數。
- [ ] Org admin 只能看 IRL 彙總與輔導指標。

---

## 5. Theater Acceptance

- [ ] 多角色劇場有焦點客戶；NPC 不超過 4。
- [ ] 每個 `TheaterCharacter` 有角色、人格模型、if-then、示範台詞或同等 contract。
- [ ] 每個 turn 有 speaker、addressee、visibility scope。
- [ ] 私聊內容不自動外洩到群聊。
- [ ] 被問到的角色必答；連續發言上限有防搶話設計。
- [ ] 不保留舊單角色 tension/score 作新主流程。
- [ ] NPC 不得補造保單、收入、家庭、病史、資產等未提供事實。

### 5.1 Route B relationship-graph stage map acceptance

`ITA-003f/S1` 若只做 no-provider stage map，完成前必須額外滿足：

- [ ] `/theater/[sessionId]` 先以 persisted Route B session DTO 渲染焦點客戶與 NPC（NPC <= 4），不使用 mock success 取代正式資料來源。
- [ ] Stage map person/edge model 由 `characters`、Route B `scene/sourceMetadata`、stored turns、relationship evidence 與 `sceneState.statePatches` 推導；不讀 legacy Theater store 或 client-provided org/member/client scope 作 business truth。
- [ ] 每個 stage person 顯示簡要角色/狀態，以及 `fact` / `inference` / `unknown` 或等價來源標籤；缺口顯示為待確認，不得補造收入、職位、家庭、保單、病史或資產。
- [ ] 關係邊或關係摘要顯示 evidence label，能追到準備包、訪談、關係圖或 Route B source metadata，但不暴露 raw private transcript / raw provider payload。
- [ ] 點人物可切換或建立對該人的 private lane；group/private visibility badge 清楚可辨，私聊內容不自動外洩到群聊。
- [ ] active speaker 與 addressee 在 stage map 上可辨識；沒有 AI runtime 時仍可用 deterministic advisor turn / stored turn 呈現。
- [ ] 旁白補問與人物狀態 proposal 可在 stage map 上操作或明確可抵達；不得要求顧問輸入 raw session/person id 作主要流程。
- [ ] 人物狀態更新只作 stage proposal，固定標示 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`，不寫 confirmed CRM fact。
- [ ] S1 不呼叫 provider；proof 必須明確顯示 `providerCallAttempted=false`、`AiUsageLog` count 不變，不能假造 success usage。
- [ ] 權限 proof 覆蓋 member owner read 200、manager/non-owner read 404；response/page 不含 private sentinel。
- [ ] Desktop/mobile 無水平 overflow，mobile 輸入區不遮擋 stage map 主要操作。
- [ ] 若 Supabase DB/DNS 無法連線，僅可提交 proof-plan、fixture/source contract 或 blocked report；不得把 fixture 當作 DB-backed browser proof。

### 5.2 Route B runtime preflight acceptance

`ITA-003g` 若只做 no-provider runtime preflight，完成前必須額外滿足：

- [ ] `DIRECTOR` / `CHARACTER` / `FEEDBACK` 在 provider gate 前輸出 `runtimeInputPreview` 或等價 safe DTO，且不包含 raw private transcript、raw provider body、email、phone、secret、token、cookie、OTP。
- [ ] Preview 明確對齊 internal AgentFacts-style manifest：`agentId=asai.theater.route_b`、Route B action id、owner surface、endpoint、`registryReadiness=internal-only`。
- [ ] Preview 明確列出必填欄位與 `missingFields`；缺 director utterance、未知 character id、缺 director directive 等應回 400 preflight invalid，不得被包裝成 provider-disabled success。
- [ ] Preview 顯示 visibility-safe history summary；character preview 只能看 group 與自己相關 private history，不可看其他角色私聊或 director-only history。
- [ ] Preview 顯示 `AiUsageLog` plan：provider 啟用後 director/character/feedback 都必須 success/error logging，且不得儲存 provider body。
- [ ] Provider 未啟用時回 guarded-disabled，證明 `providerCallAttempted=false`、`aiUsageLogWritten=false`、THEATER `AiUsageLog` count 不變。
- [ ] 若 provider env flag 已開但 success/error `AiUsageLog` proof 尚未完成，runtime 必須回 provider-not-implemented / blocked posture，不得呼叫 provider。
- [ ] 需跑 `pnpm theater:route-b-runtime-qa`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### 5.3 Route B orchestration contract acceptance

`ITA-003h` 若只做 no-provider director / character orchestration contract，完成前必須額外滿足：

- [ ] Orchestration source contract 能把 latest advisor group/private turn 轉成 director input、speaker/addressee/visibility directive、character reply input plan 與 persistence envelope。
- [ ] 被點名角色必答；若沒有點名，連續發言上限要能避開已連續主導的角色。
- [ ] Character reply input 只能看到 group history 與該角色相關 private lane，不可看到其他角色私聊或 director-only history。
- [ ] Unknown gap 只能進 narrator queue 或 `requiresConfirmation=true` 的 state proposal；不得寫 confirmed CRM fact。
- [ ] Persistence envelope 固定 `writesConfirmedCrmFact=false`，且不得儲存 raw provider payload、raw private transcript、email、phone、secret、token、cookie、OTP。
- [ ] No-provider proof 必須明確顯示 `providerCallAttempted=false`、`aiUsageLogWritten=false`，且 provider 啟用前仍要求 success/error `AiUsageLog`。
- [ ] AgentFacts-style manifest 必須新增 orchestration capability/action/DTO refs/proof command，且保持 `registryReadiness=internal-only`。
- [ ] 需跑 `pnpm theater:route-b-orchestration-dry-run`、`pnpm theater:route-b-handoff-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## 6. Feedback / Compliance Acceptance

- [ ] 五視角回饋可選：教練的耳朵、客戶的眼睛、沉默裡的需求、守門的良心、決策的橋。
- [ ] 回饋是質化文字，不輸出總分排名。
- [ ] 紅線偵測嚴重項可即時提示；一般項可事後回饋。
- [ ] 紅線誤判可標不適用。
- [ ] 嚴重紅線包含代簽、代墊、保證獲利、吸金、未做 KYC 即推商品。
- [ ] 合規提醒不取代正式法遵審核或法律意見。

---

## 7. Data / DB Acceptance

- [ ] 所有 persisted business records 有 `organizationId`。
- [ ] 需要 unit aggregation 的資料有 `unitId` 或可推導 fallback。
- [ ] Demo seed 包含訪綱、PQ/Issue definitions、劇場模板或能重建的 seed material。
- [ ] Reset 只清 demo scenario，不刪真實資料。
- [ ] RAG 文件有敏感資料邊界；高敏感資料不得預設進 RAG。
- [ ] pgvector 啟用與索引有可重複驗證步驟。

---

## 8. UI / Browser QA

- [ ] `/interview` desktop/mobile 無水平 overflow。
- [ ] 開始訪談、送出回答、段落前進、生成準備卡可操作。
- [ ] 鍵盤 focus 可見，主要 button 有 accessible name。
- [ ] `/theater` setup 與 session mobile 不遮擋輸入區。
- [ ] 群聊/私聊可辨識，但不暴露不該看的內容。
- [ ] 重要頁面保存截圖到 `docs/06_audits-and-reports/screenshots/modern-ui/`。

---

## 9. Verification

每張卡完成前：

- [ ] 跑 `pnpm lint:changed`。
- [ ] 動 schema 跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [ ] 需要 DB 實套時，跑 migration 或 `pnpm prisma db push --accept-data-loss`，並記錄結果。
- [ ] 改 AI route 時，用不產生成本的錯誤路徑或 mock input 驗證 `AiUsageLog` error logging；正式 OpenAI smoke 需明確記錄是否跳過以避免成本。
- [ ] 改 UI 時用 Browser 或 headless Chrome 檢查 desktop/mobile。
- [ ] 更新 `PLN-015` 與 `AGENTS.md` 勾選狀態。

---

## 10. Hard Stop Conditions

遇到以下情況不得標完成：

- Theater schema 改動沒有 migration/rollback/compatibility note。
- AI route 沒寫 `AiUsageLog`。
- Org manager 可看到 member 客戶明細或逐字稿。
- 高敏感客戶可無確認進劇場。
- Issue score 被用成成交率、客戶價值分或績效排名。
- Production UI 依賴 `/api/mock/*` 作為業務資料來源。
