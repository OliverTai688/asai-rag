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

### 5.4 Route B orchestration runtime integration acceptance

`ITA-003i` 若把 no-provider orchestration 接進 `/api/theater/route-b/runtime`，完成前必須額外滿足：

- [ ] `DIRECTOR` preflight response 的 `runtimeInputPreview.orchestration` 只回 least-disclosure 摘要：director directive、guard evidence、character visible history count、state patch count、safe persistence envelope 與 provider boundary；不得回 raw private transcript、raw provider payload、email、phone、secret、token、cookie、OTP。
- [ ] Runtime orchestration preview 必須保留 `agentId=asai.theater.route_b`、`registryReadiness=internal-only`、`actionId=route-b-orchestration`，不可宣稱 external registration 或 provider production ready。
- [ ] 被點名 `PRIVATE` addressee 必答；缺 `addresseeCharacterId` 或未知 addressee 應回 400 preflight invalid，不得被包成 provider-disabled success。
- [ ] 未點名時，consecutive-speaker guard 必須能避開已連續主導角色；guard evidence 需列出 blocked character ids。
- [ ] Character reply preview 只能統計 group 與該角色相關 private history；其他角色私聊不得進 visible history count。
- [ ] Persistence envelope 固定 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`，provider boundary 固定 `providerCallAttempted=false`、`aiUsageLogWritten=false`，且 provider 啟用前仍需 success/error `AiUsageLog` proof。
- [ ] AgentFacts-style manifest 必須新增 runtime orchestration preview capability / `RouteBOrchestrationRuntimePreview` DTO ref / `runtimeInputPreview.orchestration` evidence ref。
- [ ] 需跑 `pnpm theater:route-b-runtime-qa`、`pnpm theater:route-b-orchestration-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### 5.5 Route B persisted next-turn draft acceptance

`ITA-003j` 若把 persisted Route B session 接到下一回合 draft preview，完成前必須額外滿足：

- [ ] Source contract 必須消費 `RouteBSessionSnapshot`、latest advisor group/private turn 與 `buildTheaterRouteBOrchestrationPlan()`，產出 `CHARACTER` 或 `NARRATOR` next-turn draft envelope。
- [ ] Draft response 只能回 least-disclosure 摘要：selected speaker、addressee、visibility、guard evidence、state patch count、provider boundary 與 blocked reason；不得回 raw private transcript、raw provider payload、email、phone、secret、token、cookie、OTP。
- [ ] 被點名 `PRIVATE` addressee 必答；未點名群聊要能套用 consecutive-speaker guard；沒有 advisor turn 或沒有角色時必須回 `NARRATOR` blocked draft，不得杜撰角色回覆。
- [ ] Persistence envelope 固定 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`；provider disabled preview 不得產生角色台詞、不寫 theater turn、不寫 confirmed CRM fact。
- [ ] No-provider proof 必須明確顯示 `providerCallAttempted=false`、`aiUsageLogWritten=false`；provider 啟用前仍要求 success/error `AiUsageLog`，且不得假寫 usage。
- [ ] AgentFacts-style manifest 必須新增 next-turn capability / `/api/theater/route-b/sessions/[sessionId]/next-turn` endpoint / `TheaterRouteBNextTurnDraft` DTO refs / `pnpm theater:route-b-next-turn-dry-run` proof command，且保持 `registryReadiness=internal-only`。
- [ ] 需跑 `pnpm theater:route-b-next-turn-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；DB host 若仍 blocked，live owner-scoped API evidence 可交由 operator 恢復後重跑，不得把 fixture proof 當 DB proof。

### 5.6 Route B next-turn UI consumption acceptance

`ITA-003k` 若把 next-turn draft preview 接進 `/theater/[sessionId]`，完成前必須額外滿足：

- [ ] Route B session page 必須從 owner-scoped `GET /api/theater/route-b/sessions/[sessionId]/next-turn` 讀取 preview，不由 client 自行推導 speaker/addressee 作正式 truth。
- [ ] UI 必須顯示 next-turn `status`、selected speaker、addressee、visibility scope、state proposal count、guard evidence 與 rationale；blocked narrator state 不得被包成角色成功回覆。
- [ ] UI 必須顯示 no-provider boundary：`providerCallAttempted=false`、`aiUsageLogWritten=false`、`storesRawProviderPayload=false`、`directPrivateDialogReturned=false`、`writesConfirmedCrmFact=false` 或等價欄位。
- [ ] 角色台詞生成與 append confirmation 必須保持 disabled，直到 live director/character provider success/error `AiUsageLog` proof 完成；不得用 placeholder text 當作角色回合寫入。
- [ ] 顧問新增 group/private turn 後可觸發 next-turn preview refresh，但不自動寫入 character/narrator turn、不寫 confirmed CRM fact、不寫 fake usage log。
- [ ] UI/source proof 必須至少跑 `pnpm theater:route-b-next-turn-ui-contract-qa`、`pnpm theater:route-b-next-turn-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若 DB/browser evidence 仍被環境阻擋，可提供 self-runnable residual command，不得花整輪只追截圖。

### 5.7 Route B next-turn provider logging and append-candidate acceptance

`ITA-003l` 若先完成 character/narrator provider usage-log contract，而尚未開啟 live provider route 或 DB append，完成前必須額外滿足：

- [ ] Provider input 必須只使用 next-turn preview / guard evidence / persistence envelope 摘要；不得包含 raw private transcript、direct private dialog、raw provider body、email、phone、secret、token、cookie、OTP。
- [ ] Draft status 不是 `READY`、沒有 latest advisor turn、沒有 selected speaker 或 visibility scope 時，必須回 blocked result；不得呼叫 provider、不得寫 fake `AiUsageLog`、不得產生 append candidate。
- [ ] Success path 必須在回傳 generated append candidate 前寫入 success `AiUsageLog` equivalent record，並帶 usage log id、model、token usage summary。
- [ ] Provider error path 必須在回傳 sanitized provider error 前寫入 error `AiUsageLog` equivalent record；錯誤碼只可回 safe code，不回 raw error message 或 provider body。
- [ ] Success append candidate 必須保持 `requiresAdvisorConfirmation=true`、`writesConfirmedCrmFact=false`、`storesRawProviderPayload=false`、`rawPrivateTranscriptIncluded=false`；後續 persisted turn append 仍需另做 owner-scoped API/UI proof。
- [ ] AgentFacts-style manifest 必須新增 `route-b-next-turn-provider-log-contract` capability / `TheaterRouteBNextTurnProviderInput` / `TheaterRouteBNextTurnProviderRunResult` / `TheaterRouteBNextTurnUsageLogRecord` refs 與 `pnpm theater:route-b-next-turn-provider-dry-run` proof command。
- [ ] 此 acceptance 只證明 provider success/error logging 與 append candidate boundary；不得宣稱 live OpenAI/Anthropic route、DB persisted character turn、feedback provider、或 external registry ready。
- [ ] 需跑 `pnpm theater:route-b-next-turn-provider-dry-run`、`pnpm theater:route-b-next-turn-dry-run`、`pnpm theater:route-b-next-turn-ui-contract-qa`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### 5.8 Route B next-turn append confirmation acceptance

`ITA-003m` 若把 provider append candidate 接到 persisted TheaterTurn confirmation path，完成前必須額外滿足：

- [ ] Append API 必須 owner-scoped；只能由 current member 寫入自己的 Route B session，manager/foreign session 不得寫入。
- [ ] Append request 必須要求 `confirmedByAdvisor=true`、safe `usageLogId`、`generatedTextAllowed=true`、`requiresAdvisorConfirmation=true`、`writesConfirmedCrmFact=false`、`storesRawProviderPayload=false`、`rawPrivateTranscriptIncluded=false`。
- [ ] CHARACTER candidate 必須有已知 `speakerRouteBCharacterId`；PRIVATE candidate 必須有已知 `addresseeRouteBCharacterId`；NARRATOR candidate 不得帶 character speaker 或 private addressee。
- [ ] Append path 本身不得呼叫 provider、不得寫 fake `AiUsageLog`、不得儲存 raw provider payload、不得儲存 raw private transcript、不得寫 confirmed CRM fact。
- [ ] Persisted `RouteBSessionSnapshot` 必須能把 legacy TheaterTurn role 正規化為 Route B actor kind，使 next-turn draft 可辨識最新 advisor turn。
- [ ] UI 只能在已有 provider candidate + usageLogId 時啟用確認寫入；沒有 candidate 時不可用 placeholder 或 mock success 產生角色回合。
- [ ] AgentFacts-style manifest 必須新增 `route-b-next-turn-append-confirmation` capability / `/api/theater/route-b/sessions/[sessionId]/append-candidate` endpoint / `TheaterRouteBNextTurnAppendConfirmation` DTO/evidence refs / `pnpm theater:route-b-next-turn-append-dry-run` proof command，且保持 `registryReadiness=internal-only`。
- [ ] 需跑 `pnpm theater:route-b-next-turn-append-dry-run`、`pnpm theater:route-b-next-turn-provider-dry-run`、`pnpm theater:route-b-next-turn-dry-run`、`pnpm theater:route-b-next-turn-ui-contract-qa`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若 DB/browser live append proof 仍需 operator 自行跑一輪檢查，不得消耗整輪只追截圖。

---

## 6. Feedback / Compliance Acceptance

- [ ] 五視角回饋可選：教練的耳朵、客戶的眼睛、沉默裡的需求、守門的良心、決策的橋。
- [ ] 回饋是質化文字，不輸出總分排名。
- [ ] 紅線偵測嚴重項可即時提示；一般項可事後回饋。
- [ ] 紅線誤判可標不適用。
- [ ] 嚴重紅線包含代簽、代墊、保證獲利、吸金、未做 KYC 即推商品。
- [ ] 合規提醒不取代正式法遵審核或法律意見。

### 6.1 Route B feedback source contract acceptance

`ITA-004a` 若先完成 no-provider feedback contract / runtime preview，完成前必須額外滿足：

- [ ] Domain contract 必須有五視角常數與可選子集；未指定時預設全選：教練的耳朵、客戶的眼睛、沉默裡的需求、守門的良心、決策的橋。
- [ ] Runtime `FEEDBACK` preflight response 的 `runtimeInputPreview.feedback` 只能回 least-disclosure 摘要：selected perspectives、history visibility count、material count、qualitative output contract、red-line labels、provider boundary 與 persistence envelope；不得回 raw private transcript、raw provider payload、email、phone、secret、token、cookie、OTP。
- [ ] Output contract 必須固定 `qualitativeOnly=true`、`totalScoreAllowed=false`、`rankingAllowed=false`，且每個 perspective section 需有 evidence basis。
- [ ] Red-line review 必須包含代簽、代墊、保證獲利、吸金、未做 KYC 即推商品，並允許標記不適用。
- [ ] 合規提醒必須明確不取代正式法遵審核或法律意見。
- [ ] Persistence envelope 固定 `requiresAdvisorConfirmation=true`、`writesConfirmedCrmFact=false`；feedback contract 不得直接寫 confirmed CRM fact。
- [ ] Provider boundary 固定 `providerCallAttempted=false`、`aiUsageLogWritten=false`，且 provider 啟用前仍需 success/error `AiUsageLog` proof。
- [ ] AgentFacts-style manifest 必須新增 feedback capability / `RouteBFeedbackRuntimePreview` / `TheaterRouteBFeedbackContract` DTO refs / `runtimeInputPreview.feedback` evidence ref。
- [ ] 需跑 `pnpm theater:route-b-feedback-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### 6.2 Route B feedback provider usage-log contract acceptance

`ITA-004b` 若先完成 injected provider contract，而尚未開啟 live provider route，完成前必須額外滿足：

- [ ] Provider input 必須只使用 feedback contract 的 preview counts、perspective labels、red-line labels 與 qualitative output rules；不得包含 turn text、private lane content、raw provider body、email、phone、secret、token、cookie、OTP。
- [ ] Success path 必須在回傳 provider feedback result 前寫入 success `AiUsageLog` equivalent record，並帶 usage log id。
- [ ] Provider error path 必須在回傳 sanitized provider error 前寫入 error `AiUsageLog` equivalent record，錯誤碼只可回安全 code，不回 raw error message。
- [ ] Success/error usage records 都不得儲存 provider body、private lane content、confirmed CRM fact 或 advisor/client private transcript。
- [ ] Provider output contract 必須維持 `qualitativeOnly=true`、`totalScoreAllowed=false`、`rankingAllowed=false`，且每個 perspective section 仍需 evidence basis；紅線可標不適用。
- [ ] AgentFacts-style manifest 必須新增 `route-b-feedback-provider-log-contract` capability / `TheaterRouteBFeedbackProviderInput` / `TheaterRouteBFeedbackProviderRunResult` / `TheaterRouteBFeedbackUsageLogRecord` refs 與 `pnpm theater:route-b-feedback-provider-dry-run` proof command。
- [ ] 此 acceptance 只證明 provider success/error logging contract；不得宣稱 live OpenAI/Anthropic runtime route、DB persisted feedback 或 external registry ready。
- [ ] 需跑 `pnpm theater:route-b-feedback-provider-dry-run`、`pnpm theater:route-b-feedback-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### 6.3 Route B feedback persistence and session-end UI acceptance

`ITA-004c` 若把五視角回饋接成可重讀的 session review，完成前必須額外滿足：

- [ ] Feedback persistence boundary 必須 owner-scoped；只能讀寫 current member 自己的 Route B session，manager/foreign session 應回 404/403。
- [ ] 回饋資料必須維持 qualitative-only：每個 perspective 有文字、evidence basis、fact/inference/unknown labels 或等價來源；不得回 total score、ranking 或績效排名。
- [ ] Red-line review 必須可標示嚴重項與 `notApplicable`/誤判理由；合規提醒需標明不取代正式法遵審核或法律意見。
- [ ] Persistence envelope 固定 `requiresAdvisorConfirmation=true`、`writesConfirmedCrmFact=false`；feedback 不得直接寫 confirmed CRM fact 或修改 client/policy compliance 欄位。
- [ ] API/UI 不得儲存或回傳 raw provider payload、raw private transcript、direct private dialog、email、phone、policy number、secret、token、cookie、OTP。
- [ ] `/theater/[sessionId]` 必須有低噪音 session-end feedback panel：可選五視角、產生/讀回 feedback、顯示 evidence/red-line/not-applicable 狀態，且沒有 feedback 時給出明確下一步。
- [ ] 若本 slice 先做 no-provider/deterministic persistence，proof 必須顯示 `providerCallAttempted=false`、`aiUsageLogWritten=false` 或 `AiUsageLog` count unchanged；若開啟 live provider，success/error 必須先寫 `AiUsageLog` 後才回 result。
- [ ] AgentFacts-style manifest 必須新增 `route-b-feedback-persistence` 或等價 capability / endpoint / DTO/evidence refs / proof command，且保持 `registryReadiness=internal-only`。
- [ ] 需跑 `pnpm theater:route-b-feedback-dry-run`、`pnpm theater:route-b-feedback-provider-dry-run`、新 feedback persistence/UI proof、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若只有額外截圖或 DB append residual evidence，可交由 operator 自行重跑，不得讓它取代本 slice 的 source proof。

ITA-004c evidence note（2026-06-22）：`pnpm theater:route-b-feedback-review-qa` 以 deterministic domain dry-run + static API/repository/UI contract QA 覆蓋五視角、紅線 notApplicable、no score/ranking、no raw provider/private/contact/policy sentinel、owner-scoped repository selectors、`sceneState.feedbackReview` persistence、`/theater/[sessionId]` session-end panel 與 AgentFacts manifest refs。剩餘 manager/foreign live DB denial screenshot 屬可由 operator 自行重跑的 residual evidence，不取代本 source proof，也不阻擋下一輪做 `ITA-005a` 紅線/異議 source library 或 live provider wiring。

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
