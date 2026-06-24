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

- [x] `/theater/[sessionId]` 先以 persisted Route B session DTO 渲染焦點客戶與 NPC（NPC <= 4），不使用 mock success 取代正式資料來源。
- [x] Stage map person/edge model 由 `characters`、Route B `scene/sourceMetadata`、stored turns、relationship evidence 與 `sceneState.statePatches` 推導；不讀 legacy Theater store 或 client-provided org/member/client scope 作 business truth。
- [x] 每個 stage person 顯示簡要角色/狀態，以及 `fact` / `inference` / `unknown` 或等價來源標籤；缺口顯示為待確認，不得補造收入、職位、家庭、保單、病史或資產。
- [x] 關係邊或關係摘要顯示 evidence label，能追到準備包、訪談、關係圖或 Route B source metadata，但不暴露 raw private transcript / raw provider payload。
- [x] 點人物可切換或建立對該人的 private lane；group/private visibility badge 清楚可辨，私聊內容不自動外洩到群聊。
- [x] active speaker 與 addressee 在 stage map 上可辨識；沒有 AI runtime 時仍可用 deterministic advisor turn / stored turn 呈現。
- [x] 旁白補問與人物狀態 proposal 可在 stage map 上操作或明確可抵達；不得要求顧問輸入 raw session/person id 作主要流程。
- [x] 人物狀態更新只作 stage proposal，固定標示 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`，不寫 confirmed CRM fact。
- [x] S1 不呼叫 provider；proof 必須明確顯示 `providerCallAttempted=false`、`AiUsageLog` count 不變，不能假造 success usage。
- [x] 權限 proof 覆蓋 member owner read 200、manager/non-owner read 404；response/page 不含 private sentinel。
- [x] Desktop/mobile 無水平 overflow，mobile 輸入區不遮擋 stage map 主要操作。
- [x] 若 Supabase DB/DNS 無法連線，僅可提交 proof-plan、fixture/source contract 或 blocked report；不得把 fixture 當作 DB-backed browser proof。

Evidence（2026-06-23 LV3-ROUTE-B-STAGE-MAP-ACCEPTANCE-RECONCILE-001）：
`ITA-003f/S1` 已於 2026-06-21 完成 source/UI/DB-backed proof；`DEMO_QA_BASE_URL=http://localhost:3000 pnpm theater:route-b-session-ui-qa` 建立 persisted Route B session，覆蓋 owner browser read、manager 404、desktop/mobile relationship stage map、click-to-private-chat、relationship evidence、group/private lanes、guarded-disabled provider proof、state proposal boundary、no horizontal overflow、private sentinel 0 與 THEATER `AiUsageLog` count unchanged。2026-06-23 另新增 `pnpm theater:route-b-stage-map-acceptance-reconcile-qa`，靜態檢查本 checklist、`/theater/[sessionId]` source markers、`theater:route-b-session-ui-qa` proof markers、`PLN-015` implementation note 與 2026-06-21 loop report 對齊。這只代表 no-provider relationship stage map acceptance 已 reconciled；不代表 live director/character/feedback provider、external NANDA publication、正式法遵審閱或 relationship confirmation advisor-state persistence 已完成。

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

### 5.9 Route B live next-turn provider route acceptance

`ITA-003n` 若把 injected provider contract 接成 owner-scoped live provider route，完成前必須額外滿足：

- [x] Provider-candidate API 必須 owner-scoped，從 server-side `RouteBSessionSnapshot` 與 `GET /next-turn` draft 取得 business truth；browser 不得提交 raw org/member/client/session truth、raw private transcript、direct private dialog 或 provider payload。
- [x] Provider input 必須包含 `RouteBProviderPromptContext`，並保留 12 類異議、18 條紅線、5 條 severe immediate、13 條 post-review、`legalAdviceIncluded=false`、`writesConfirmedCrmFact=false` 與 `storesRawProviderPayload=false`。
- [x] Success path 必須在回傳 append candidate 前寫 THEATER `AiUsageLog` success row，並回安全 `usageLogId`、provider/model/token summary、candidate actor/visibility/content、安全旗標；不得儲存 raw provider body。
- [x] Provider error / malformed output / schema mismatch path 必須先寫 sanitized THEATER `AiUsageLog` error row，再回 safe error code；不得產生 append candidate，不回 raw provider error/body。
- [x] Guard paths（unauth、manager/foreign、blocked draft、quota exceeded、provider disabled、missing key、raw sentinel input）不得呼叫 provider、不得寫 fake usage、不得 append theater turn。
- [x] `/theater/[sessionId]` 只能在 provider candidate 含 safe `usageLogId`、`requiresAdvisorConfirmation=true`、`writesConfirmedCrmFact=false`、`storesRawProviderPayload=false`、`rawPrivateTranscriptIncluded=false` 時啟用 existing append confirmation。
- [x] AgentFacts-style manifest 必須新增 live provider candidate capability / endpoint / DTO/evidence refs，且 readiness 仍為 `internal-only`；不得宣稱 external-ready、external-registered 或正式 NANDA publication。
- [x] 需跑新的 provider route QA（例如 `pnpm theater:route-b-next-turn-provider-route-qa`）、`pnpm theater:route-b-next-turn-provider-dry-run`、`pnpm theater:route-b-next-turn-append-dry-run`、`pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若只剩 browser screenshot residual，可交由 operator 自行重跑，不得取代 provider `AiUsageLog` proof。

ITA-003n evidence note（2026-06-22）：新增 owner-scoped `POST /api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate`，由 persisted `RouteBSessionSnapshot` 與 server-side next-turn draft 建立 provider input，注入 `RouteBProviderPromptContext`，只在 session/quota/key/input guard 通過後呼叫 OpenAI JSON mode。Success path 先寫 THEATER/OpenAI `AiUsageLog` 與 org usage，再回 safe append candidate + `usageLogId`；provider error / schema mismatch 先寫 sanitized error usage log；guard paths維持 no-provider/no-fake-usage/no-append。`/theater/[sessionId]` 只在 candidate 安全旗標與 `usageLogId` 俱全時啟用既有 append confirmation。`pnpm theater:route-b-next-turn-provider-route-qa`、`pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false` 通過；剩餘純瀏覽器截圖或成本型手動點擊 proof 可由 operator 在 dev server + provider key 可用時自行重跑，不阻擋下一輪 source-backed `ITA-005d`。

### 5.10 Route B meeting-signal runtime context acceptance

`LV3-THEATER-MEETING-SIGNAL-RUNTIME-CONTEXT-001` 若把 persisted meeting-derived relationship signal grounding 接進 next-turn / provider prompt context，完成前必須額外滿足：

- [ ] `buildTheaterRouteBNextTurnDraft()` 必須從 `RouteBSessionSnapshot.scene.sourceGrounding.meetingRelationshipSignals` 產出 least-disclosure grounding summary，至少包含 card count、unknown count、narrator-question count、safe card summaries 與 source/action/priority labels；不得回 raw meeting session id、person id、sourceReferenceIds、raw transcript 或 raw provider payload。
- [ ] `buildRouteBProviderPromptContext()` 或 next-turn provider input 必須消費上述 grounding summary 作為 roleplay/evidence context，並保持 `registryReadiness=internal-only`、`storesRawProviderPayload=false`、`rawPrivateTranscriptAllowed=false`、`directPrivateDialogAllowed=false`。
- [ ] Provider-disabled draft path 不得呼叫 provider、不得寫 fake `AiUsageLog`；live provider path 若使用該 context，success/error 仍必須先寫 THEATER `AiUsageLog` 並只回 safe append candidate。
- [ ] `/theater/[sessionId]` 的 next-turn preview 必須能顯示 runtime 已使用 meeting-signal grounding 的摘要或 guard flag，但不得要求顧問輸入 raw session/person id。
- [ ] AgentFacts-style manifest 必須新增 runtime context evidence refs / proof command，且不得宣稱 external-ready、external-registered 或正式 NANDA publication。
- [ ] 需跑 `pnpm theater:route-b-next-turn-dry-run`、`pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm theater:route-b-next-turn-provider-dry-run`、`pnpm theater:meeting-signal-session-source-qa`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若只剩 live browser/API/DB screenshot evidence，可交由 operator 用既有 Route B session 自行重跑，不得取代 source/runtime context proof。

### 5.11 Route B relationship-edge-shadow runtime context acceptance

`REL-004f` 若把 persisted RelationshipEdge shadow source grounding 接進 next-turn / provider prompt context，完成前必須額外滿足：

- [x] `buildTheaterRouteBNextTurnDraft()` 必須從 `RouteBSessionSnapshot.scene.sourceGrounding.relationshipEdgeShadow` 產出 least-disclosure grounding summary，至少包含 source member count、candidate edge count、edge type/status counts、warning codes、unsupported relation count 與 formal-schema/no-write boundary；不得回 draft edge ids、source/target node ids、sourceReferenceIds、raw private transcript 或 raw provider payload。
- [x] `buildRouteBProviderPromptContext()` 或 next-turn provider input 必須消費上述 grounding summary 作為 relationship readiness context，並保持 `registryReadiness=internal-only`、`storesRawProviderPayload=false`、`rawPrivateTranscriptAllowed=false`、`directPrivateDialogAllowed=false`。
- [x] Provider-disabled draft path 不得呼叫 provider、不得寫 fake `AiUsageLog`；live provider path 若使用該 context，success/error 仍必須先寫 THEATER `AiUsageLog` 並只回 safe append candidate。
- [x] `/theater/[sessionId]` 的 next-turn preview 必須能顯示 runtime 已使用 relationship-edge-shadow grounding 的摘要或 guard flag，但不得要求顧問輸入 raw session/person/edge id。
- [x] AgentFacts-style manifest 必須新增 runtime context evidence refs / proof command，且不得宣稱 external-ready、external-registered 或正式 NANDA publication。
- [x] 需跑 `pnpm theater:route-b-next-turn-dry-run`、`pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm theater:route-b-next-turn-ui-contract-qa`、`pnpm theater:relationship-edge-shadow-session-source-qa`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

REL-004f evidence note（2026-06-24）：Route B next-turn draft/provider prompt context 已消費 `relationshipEdgeShadowGrounding`，UI next-turn preview 新增 `data-route-b-next-turn-edge-shadow-runtime-grounding` safe panel；proof 維持 no-provider/no fake usage/no schema/no DB write/no confirmed CRM fact。正式 `RelationshipEdge` table、external registry publication、live provider cost proof 仍未完成。

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

### 6.4 Route B objection / red-line source library acceptance

`ITA-005a` 若先完成 no-provider 異議庫與紅線規則 source library，完成前必須額外滿足：

- [x] Domain library 必須包含 12 類異議，每類有說法、背後擔憂、回應方向、適用角色、trigger signals，且明確標示 roleplay inference 不等於 CRM confirmed fact。
- [x] Domain library 必須包含 18 條紅線規則，其中 accepted severe five（代簽、代墊、保證獲利、吸金、未做 KYC 即推商品）為 `IMMEDIATE`，其餘一般紅線為 `POST_REVIEW`。
- [x] Feedback contract / persisted review 必須消費同一份 library summary，不得保留只知道 5 條 severe 的孤立紅線來源。
- [x] Red-line not-applicable 必須保留 audit record；不得刪除 finding 或把誤判標記變成正式法遵結論。
- [x] Library 與 review proof 必須顯示 `providerCallAttempted=false`、`aiUsageLogWritten=false`、`writesConfirmedCrmFact=false`，且不回 raw provider/private/contact/policy sentinel。
- [x] AgentFacts-style manifest 必須新增 `route-b-objection-red-line-library` capability / DTO/evidence refs / proof command，且保持 `registryReadiness=internal-only`。
- [x] 需跑 `pnpm theater:route-b-objection-red-line-library-dry-run`、`pnpm theater:route-b-feedback-dry-run`、`pnpm theater:route-b-feedback-review-qa`、`pnpm theater:route-b-feedback-provider-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。
- [ ] 後續若接 live director/character/feedback provider prompt，仍需另做 success/error `AiUsageLog` proof、visibility-safe prompt boundary 與 UI/browser evidence；本 source-library proof 不等於 live provider runtime 完成。

ITA-005a evidence note（2026-06-22）：`pnpm theater:route-b-objection-red-line-library-dry-run` 通過 35 checks，覆蓋 12 類異議、18 條紅線、5 severe immediate、13 standard post-review、自然異議選取、標不適用仍保留 audit、feedback contract/review 消費完整 library、no provider/fake usage/CRM fact/private sentinel。`pnpm theater:route-b-feedback-dry-run`、`pnpm theater:route-b-feedback-review-qa`、`pnpm theater:route-b-feedback-provider-dry-run`、`pnpm ai:protocol-registry-qa` 同步通過。

### 6.5 Route B objection / red-line provider prompt-context acceptance

`ITA-005b` 若把異議庫與紅線規則接入 provider prompt/runtime DTO，而尚未開啟 live provider route，完成前必須額外滿足：

- [x] `RouteBProviderPromptContext` 必須引用同一份 ITA-005a library summary，包含 12 類異議、18 條紅線、5 條 immediate severe 與 13 條 post-review ids。
- [x] Prompt context 必須依角色/情境選取 bounded objection cues，但 cue 的 `factBoundary` 仍是 `roleplay-inference-not-confirmed-fact`；不得把異議 cue 當 confirmed CRM fact。
- [x] `TheaterRouteBNextTurnProviderInput.promptContext` 必須存在，且 provider input 仍只使用 next-turn preview / guard evidence / persistence envelope / prompt context；不得包含 raw private transcript、direct private dialog、raw provider body、email、phone、secret、token、cookie、OTP。
- [x] `TheaterRouteBFeedbackProviderInput.promptContext` 必須存在；`redLineReview.allRules` 必須覆蓋完整 18 條紅線，而不只 severe five。
- [x] Prompt context / allRules 必須固定 `legalAdviceIncluded=false`、`writesConfirmedCrmFact=false`、`storesRawProviderPayload=false`、`rawPrivateTranscriptAllowed=false`，且 provider enablement 仍要求 success/error `AiUsageLog`。
- [x] Existing next-turn / feedback provider success/error paths 必須仍先寫 usage record 才回 success 或 sanitized provider error；本 prompt-context proof 不得假裝 live OpenAI/Anthropic route 已開。
- [x] AgentFacts-style manifest 必須新增 `route-b-provider-prompt-context` capability / action / DTO/evidence refs / `pnpm theater:route-b-provider-prompt-context-dry-run` proof command，且保持 `registryReadiness=internal-only`。
- [x] 需跑 `pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm theater:route-b-next-turn-provider-dry-run`、`pnpm theater:route-b-feedback-provider-dry-run`、`pnpm theater:route-b-objection-red-line-library-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。
- [ ] 後續若接 live provider route 或即時嚴重紅線 UI，仍需另做 owner-scoped API/browser proof、provider success/error `AiUsageLog` proof、UI no-overflow/a11y proof；若只剩截圖，可交由 operator 自行重跑，不得以 docs-only proof 取代 source work。

ITA-005b evidence note（2026-06-22）：新增 `RouteBProviderPromptContext` 與 provider input wiring。靜態 dry-run 覆蓋 12/18 library counts、selected objection cues、5 immediate severe、13 post-review、no legal advice、no CRM fact write、no provider call/fake usage、no private/provider sentinel；next-turn 與 feedback provider dry-run 也確認 promptContext 已進入 provider input 並保留 success/error `AiUsageLog` contract。尚未宣稱 live provider route、即時 UI 或 external registry ready。

### 6.6 Route B severe red-line warning preview acceptance

`ITA-005c` 若把 severe immediate 紅線接進 Route B 劇場 UI / guarded preview，而尚未開啟 live provider route，完成前必須額外滿足：

- [x] `RouteBSevereRedLineWarningPreview` 必須從 `RouteBProviderPromptContext` 或同一份 ITA-005a library source 生成，不得另建一份不一致的 severe list。
- [x] Preview 必須只包含 accepted severe five：代簽、代墊、保證獲利、吸金、未做 KYC 即推商品；每項維持 `severity=SEVERE`、`detectionMode=IMMEDIATE`。
- [x] Preview / UI 必須標示 watchlist-only 或 advisor warning only；不得自動阻斷對話、不得把提醒當正式違規結論、不得提供法律意見。
- [x] Preview / UI 必須顯示 evidence-or-not-applicable posture，且 not-applicable 仍保留 audit record。
- [x] No-provider proof 必須顯示 `providerCallAttempted=false`、`aiUsageLogWritten=false`、`writesConfirmedCrmFact=false`，且 provider 啟用前仍需要 success/error `AiUsageLog` proof。
- [x] `/theater/[sessionId]` Route B stage 必須有 advisor-facing severe red-line panel；UI 不得要求顧問輸入 raw session/person id，也不得暴露 raw private transcript、raw provider payload、email、phone、policy number、secret、token、cookie、OTP。
- [x] AgentFacts-style manifest 必須新增 `route-b-severe-red-line-warning-preview` capability / action / DTO/evidence refs / proof command，且保持 `registryReadiness=internal-only`。
- [x] 需跑 `pnpm theater:route-b-severe-red-line-preview-dry-run`、`pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若只剩 browser screenshot residual，可交由 operator 用既有 Route B session 自行重跑，不得以截圖蒐集取代 source/UI contract。

ITA-005c evidence note（2026-06-22）：`pnpm theater:route-b-severe-red-line-preview-dry-run` 以 domain dry-run + static UI contract QA 覆蓋 `RouteBProviderPromptContext -> RouteBSevereRedLineWarningPreview -> RouteBSevereRedLineWarningPanel`，驗證 5 severe immediate watchlist-only、evidence/not-applicable posture、no provider/fake usage、no legal advice、no CRM fact write、no sensitive sentinel。尚未宣稱 live detection、正式法遵處置、live provider route 或 external registry ready。

### 6.7 Route B severe red-line action workflow acceptance

`ITA-005d` 若把 severe immediate watchlist 變成顧問可操作 action workflow，但尚未接正式法遵處置、通知或 DB persistence，完成前必須額外滿足：

- [x] `RouteBSevereRedLineActionWorkflow` 必須消費同一份 `RouteBSevereRedLineWarningPreview`，不得另建一份不一致的 severe list。
- [x] Action cards 必須只覆蓋 accepted severe five，且每張卡允許 `WATCHING`、`EVIDENCE_NEEDED`、`NOT_APPLICABLE`、`ESCALATE` 四種狀態。
- [x] `NOT_APPLICABLE` 仍需保留 audit posture；`ESCALATE` 只能代表待審閱狀態，不得發真實 notification、不得宣稱正式法遵結論。
- [x] Current persistence 必須明確標示為 UI-local；未來若接 DB，只能 allowlist `ruleId`、`state`、`advisorReasonCode`、`updatedAt`，不得存 raw private transcript、direct private dialog 或 raw provider payload。
- [x] Workflow/UI 必須維持 no-provider proof：`providerCallAttempted=false`、`aiUsageLogWritten=false`、不得 fake usage log；若後續接 live provider 或正式 persistence，需另做 success/error `AiUsageLog` 與 DB proof。
- [x] Workflow/UI 不得自動阻斷對話、不得提供法律意見、不得建立 formal finding without evidence、不得寫 confirmed CRM fact。
- [x] `/theater/[sessionId]` Route B stage 必須顯示 action state control，且 action state control 具 accessible selected state（例如 `aria-pressed`）。
- [x] AgentFacts-style manifest 必須新增 `route-b-severe-red-line-action-workflow` capability / action / DTO/evidence refs / proof command，且保持 `registryReadiness=internal-only`。
- [x] 需跑 `pnpm theater:route-b-red-line-action-workflow-dry-run`、`pnpm theater:route-b-severe-red-line-preview-dry-run`、`pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若只剩 browser screenshot residual，可交由 operator 用既有 Route B session 自行檢查，不得以截圖搜集取代 source/UI contract。

ITA-005d evidence note（2026-06-22）：`pnpm theater:route-b-red-line-action-workflow-dry-run` 以 domain dry-run + static UI/manifest contract QA 覆蓋 `RouteBSevereRedLineWarningPreview -> RouteBSevereRedLineActionWorkflow -> RouteBSevereRedLineWarningPanel`，驗證 5 severe action cards、四種 action states、UI-local persistence allowlist、no provider/no fake usage/no notification/no CRM fact write、no raw private/provider/contact/policy sentinel 與 AgentFacts refs。尚未宣稱正式法遵處置、DB persisted escalation、real notification、live detection 或 external registry ready。

### 6.8 Route B severe red-line action persistence acceptance

`ITA-005e` 若把 severe red-line action workflow 從 UI-local 升級為 owner-scoped session persistence，完成前必須額外滿足：

- [x] Persistence boundary 只能 owner-scoped：`GET/POST /api/theater/route-b/sessions/[sessionId]/red-line-actions` 必須使用 current member、organization、owner 與 `routeBEnabled=true` 查詢；manager/foreign session 應回 404/403。
- [x] Persisted record allowlist 只能包含 `ruleId`、`state`、`advisorReasonCode`、`updatedAt`；不得接受任意 reason text、raw private transcript、direct private dialog、raw provider payload、email、phone、policy number、secret、token、cookie、OTP。
- [x] `state` 只能是 `WATCHING`、`EVIDENCE_NEEDED`、`NOT_APPLICABLE`、`ESCALATE`；`advisorReasonCode` 只能是固定 enum（例如 evidence pending / false-positive context / escalation requested / advisor reviewed）。
- [x] `NOT_APPLICABLE` 仍保留 audit posture；`ESCALATE` 只代表待審閱狀態，不得建立 formal finding、不得發真實 notification、不得寫 confirmed CRM fact。
- [x] `/theater/[sessionId]` Route B stage 必須可讀取/保存 red-line action state，並顯示 persisted record count / latest updated；不得要求顧問輸入 raw session/person id。
- [x] No-provider proof 必須顯示 `providerCallAttempted=false`、`aiUsageLogWritten=false` 或 THEATER `AiUsageLog` count unchanged；此 persistence route 不得 fake usage log。
- [x] AgentFacts-style manifest 必須新增 `route-b-severe-red-line-action-persistence` capability / red-line-actions endpoint / `RouteBRedLineActionPersistenceState` / proof command，且保持 `registryReadiness=internal-only`。
- [x] 需跑 `pnpm theater:route-b-red-line-action-persistence-qa`、`pnpm theater:route-b-red-line-action-workflow-dry-run`、`pnpm theater:route-b-severe-red-line-preview-dry-run`、`pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若 local dev server/DB 已啟動，可再跑 `pnpm theater:route-b-persistence-qa` 取得 live owner write/read、manager denial、DB `scene_state.redLineActionState` 與 refresh/new-context proof；若只剩這類 runtime evidence，可交由 operator 自行重跑，不得以 docs-only proof 取代 source/API/UI work。

ITA-005e evidence note（2026-06-22）：新增 `route-b-severe-red-line-action-persistence` domain/API/repository/UI/manifest slice。`RouteBRedLineActionPersistenceState` 將 5 條 severe action cards 正規化為 owner-scoped `sceneState.redLineActionState`，只持久化 `ruleId/state/advisorReasonCode/updatedAt`；`/api/theater/route-b/sessions/[sessionId]/red-line-actions` 提供 current-member GET/POST，`/theater/[sessionId]` 守門紅線面板可讀取/保存狀態並顯示 persisted count/latest updated。`pnpm theater:route-b-red-line-action-persistence-qa` 覆蓋 domain allowlist、route/repository/UI/manifest source contract、no provider/no fake `AiUsageLog`、no notification/no CRM fact/no raw private/provider/contact/policy sentinel。`pnpm theater:route-b-persistence-qa` 已擴充為 live DB proof command；若本輪未啟動 dev server，可由 operator 直接重跑取得 runtime evidence。

### 6.9 Route B severe red-line action feedback consumption acceptance

`ITA-005f` 若把 persisted red-line action state 接入 feedback review，但尚未接 visit preparation / AI meeting notes 或正式法遵處置，完成前必須額外滿足：

- [x] `RouteBSessionSnapshot.scene.redLineActionState` 必須由 owner-scoped persisted `sceneState.redLineActionState` 產生；若沒有 persisted state，必須回到 safe default action state，不得讀 client-submitted owner/org ids。
- [x] `TheaterRouteBFeedbackReview` 必須輸出 `redLineActionState` summary，至少包含 recordCount、watching/evidenceNeeded/notApplicable/escalate counts、`consumedByFeedbackReview=true`、`ownerScopedSessionOnly=true`、`noProviderCall=true`、`writesConfirmedCrmFact=false`、`triggersExternalNotification=false`、`noLegalAdvice=true`、`noFormalFinding=true`。
- [x] Matching red-line findings 必須附上 per-rule `actionContext`，但 `ESCALATE` 與 `EVIDENCE_NEEDED` 仍只能作 advisor context，不得自動建立正式法遵 finding、real notification、provider call 或 CRM confirmed fact。
- [x] `/theater/[sessionId]` 五視角回顧面板必須顯示 action-state source、升級審閱/需要佐證 counts 與 per-finding advisor action context；不得要求顧問輸入 raw session/person id。
- [x] AgentFacts-style manifest 必須新增 `route-b-red-line-action-feedback-consumption` capability/action/DTO/evidence refs，且保持 `registryReadiness=internal-only`。
- [x] 需跑 `pnpm theater:route-b-feedback-review-qa`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若只剩 live browser/DB visual confirmation，可由 operator 以既有 Route B session 自行重跑，不得以 docs-only proof 取代 source/domain/UI contract。

ITA-005f evidence note（2026-06-22）：新增 persisted red-line action state 的 feedback consumption bridge。`src/domains/theater/route-b-session.ts` 將 `redLineActionState` 納入 `RouteBSessionSnapshot.scene`，`src/lib/theater/route-b-session-bff-repository.ts` 從 `sceneState.redLineActionState` 安全讀取或 fallback default，`buildTheaterRouteBFeedbackReview()` 產生 `TheaterRouteBFeedbackReview.redLineActionState` summary 並將 per-rule `actionContext` 附到 matching findings。`/theater/[sessionId]` 五視角回顧面板顯示 `sceneState.redLineActionState` source、升級/佐證 counts 與 advisor action context。`pnpm theater:route-b-feedback-review-qa` 覆蓋 domain dry-run + UI/API/repository/manifest static contract，驗證 no-provider/no fake `AiUsageLog`、no notification、no legal/formal finding、no CRM fact write、no raw private/provider/contact/policy sentinel；`pnpm ai:protocol-registry-qa` 驗證 AgentFacts refs。尚未宣稱 visit preparation / AI meeting notes consumption、formal compliance workflow、real notification、live detection 或 external registry ready。

### 6.10 Route B red-line action downstream consumption acceptance

`ITA/AMM-005g` 或任何把 Route B persisted red-line action context 接到 visit preparation package / AI meeting notes / downstream advisor workspace 的 slice，完成前必須額外滿足：

- [x] Domain-level consumer 必須從 owner-scoped `RouteBSessionSnapshot.scene.redLineActionState`、persisted `sceneState.feedbackReview` 或等價 server-owned feedback review DTO 讀取 action context；不得信任 browser 提供的 raw org/client/session/person id。（2026-06-22：`buildVisitRouteBRedLineContextFromFeedbackReview()` 消費 `TheaterRouteBFeedbackReview` DTO，proof: `pnpm visit:route-b-red-line-context-dry-run`。）
- [x] Output 必須分離 facts / inferences / unknowns / advisor cautions / evidence-needed next steps，且 `ESCALATE` / `EVIDENCE_NEEDED` 只能作 advisor context，不得自動建立 legal finding、real notification、provider call 或 CRM confirmed fact write。（2026-06-22：`VisitRouteBRedLineContext` 轉成 `VisitQuestionEvidence.source=theater_route_b_red_line`，狀態維持 `unknown` / `inference`。）
- [x] Visit preparation package domain consumer 若為第一個落地面，必須把 action context 轉成準備包中的合規提醒 / 佐證待補 / 下一步問題，不覆寫原本的 relationship graph fact/inference/unknown 標記。（2026-06-22：P/I/N question reasoning 會消費 red-line evidence；S 題維持現況盤點。）
- [x] Visit preparation BFF/UI 若要自動載入 persisted theater feedback review，必須補 owner-scoped route/session join proof，不得要求 advisor 輸入 raw session/person ids。（2026-06-22：新增 `GET /api/visits/[id]/route-b-red-line-context` 與 `getVisitRouteBRedLineContextForMember()`，由 owner-scoped VisitPlan 重新推導 `routeBSourcePacketId`，再查 current member/organization/owner/client scoped Route B session 的 persisted `sceneState.feedbackReview`；`/pre-visit/[planId]` 顯示「劇場紅線回帶」面板且不要求輸入 raw session/person ids。Proof: `pnpm visit:route-b-red-line-context-bff-qa`。）
- [x] AI meeting notes consumer 若為第一個落地面，必須先審核目前 worktree 中 notes prototype 的範圍，避免把未驗證 prototype 當 committed baseline；meeting note output 不得保存 raw private transcript 或 raw provider payload。（2026-06-22：本輪明確不採用 untracked `/notes` local Zustand prototype；改接正式 `/pre-visit/[planId]/notes` + owner-scoped `MeetingWorkspace`。Notes page 只從 `GET /api/visits/[id]/route-b-red-line-context` 取 status/summary/items/proof 安全集合，MeetingWorkspace 顯示 `meeting-route-b-red-line-context` 面板並把提醒併入 manual note draft；不保存 raw private transcript、raw provider payload、raw theater session id 或 person id。Proof: `pnpm meeting:route-b-red-line-context-qa`。）
- [x] AgentFacts-style manifest 必須新增 downstream consumption capability/action/DTO/evidence refs，保持 `registryReadiness=internal-only`，且不得宣稱 external registry ready。（2026-06-22：`asai.visit.preparation_package` 與 `asai.meeting.prototype` manifest 已新增 downstream capability/action/DTO/evidence refs，皆維持 internal-only。）
- [x] 需跑對應 source proof（例如 visit-prep/meeting consumption QA）、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若只剩 browser/dev-server visual confirmation，可交由 operator 自行重跑，不得讓 docs-only proof 取代 source/domain/API/UI work。（2026-06-22：domain proof、visit-prep BFF/UI contract proof、meeting notes consumer contract proof 已新增；本輪驗收紀錄見 loop report。）

AMM-005j global notes hub quarantine evidence（2026-06-22）：`/notes` 已改為 accepted-source entrypoint，而非採納 untracked quick-note local prototype。Page source 宣告 `data-local-note-store="disabled"`、`data-accepted-notes-source="/pre-visit/[planId]/notes"`，只導向已驗收的 preparation package notes / CLIENT_MEETING workspace；`pnpm meeting:notes-hub-quarantine-qa` 驗證 `/notes` 不 import `@/components/notes`、`@/domains/note/store`、`useNoteStore`、`QuickNoteComposer`、`SEED_NOTES` 或 browser-local note storage，並驗證 `asai.meeting.prototype` manifest/registry refs。此 evidence 不代表 quick-note server persistence、CRM writeback、正式法遵審閱、real notification、live detection 或 external registry publication 已完成。

### 6.11 Route B red-line compliance-review intake acceptance

`ITA-005k` 若把 Route B red-line action context 接成 disabled/no-provider 的審閱候選 intake，完成前必須額外滿足：

- [x] Intake consumer 必須從 owner-scoped `TheaterRouteBFeedbackReview.redLineActionState` / per-rule `actionContext`、`VisitRouteBRedLineContext` 或等價 server-owned DTO 讀取 context；不得信任 browser 提供的 raw org/client/session/person id。
- [x] Output 只能是 advisor/compliance-review candidate，例如 `ruleId`、action state、advisorReasonCode、source surface、evidence refs、review status、safe summary、createdAt/updatedAt；不得建立 formal legal/compliance finding、不得發 real notification、不得呼叫 provider、不得寫 confirmed CRM fact。
- [x] 若同輪新增 persistence，DB 或 metadata allowlist 不得保存 raw private transcript、direct private dialog、raw provider payload、email、phone、policy number、secret、token、cookie、OTP、payment data 或任意未結構化敏感 reason text。
- [x] UI 必須明確標示「待審閱候選 / 需要佐證 / 不代表正式法遵處置」，並保留 disabled/no-provider/no-notification/no-formal-finding guardrails；不得把 `ESCALATE` 呈現為已送出正式通報。
- [x] Cross-surface handoff 若從 visit prep 或 meeting notes 進入 intake，必須保留 facts / inferences / unknowns / advisor cautions / evidence-needed labels；inference 不得升格為 confirmed fact。
- [x] AgentFacts-style manifest 必須新增 internal-only capability/action/DTO/evidence refs，例如 `route-b-red-line-compliance-review-intake`，且不得宣稱 external registry ready、public discovery、cross-org access 或 signed publication。
- [x] 需新增可重跑 proof command（建議 `pnpm theater:route-b-compliance-review-intake-qa` 或等價命名），並跑 `pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若剩餘只是 live browser screenshot / dev-server visual check，可交由 operator 自行重跑，不得讓 docs-only evidence 取代 source/API/UI work。

ITA-005k evidence note（2026-06-22）：新增 `route-b-red-line-compliance-review-intake` source/API/UI contract。`buildRouteBComplianceReviewIntakeFromFeedbackReview()` 只從 owner-scoped persisted `TheaterRouteBFeedbackReview.redLineFindings.actionContext` 建立 `ESCALATE` / `EVIDENCE_NEEDED` 候選，候選 DTO 只含 `ruleId`、action state、advisorReasonCode、source surface、evidence refs、review status、safe summary 與 timestamps；`NOT_APPLICABLE` / `WATCHING` 不進候選。`GET /api/theater/route-b/sessions/[sessionId]/compliance-review-intake` 使用 current member / organization / owner / `routeBEnabled=true` scope，沒有 feedback review 時回 no-store empty guard。`/theater/[sessionId]` 新增「待審閱候選」panel，標示需要佐證 / 升級候選 / 不代表正式法遵處置，且顯示 no-provider、no fake `AiUsageLog`、no notification、no formal finding、no confirmed CRM fact guardrails。本輪未新增 candidate persistence；formal compliance workflow、real notification、live detection 與 external registry publication 仍未啟用。

### 6.12 Route B red-line compliance-review queue acceptance

`ITA-005l` 若把 disabled/no-provider intake 往上整理成劇場工作台的審閱佇列，完成前必須額外滿足：

- [x] Queue consumer 必須由 current member / organization / owner / `routeBEnabled=true` scope 查詢 Route B sessions，再由 persisted `sceneState.feedbackReview` 重新建立 intake；不得信任 browser 提供 raw org/client/session/person id。
- [x] Queue output 只能包含 session metadata、intake id、candidate counts、needs-evidence/escalation counts、top severity 與 safe candidates；不得建立 formal legal/compliance finding、不得發 real notification、不得呼叫 provider、不得寫 confirmed CRM fact。
- [x] 本輪不得新增 queue/candidate persistence；若未來新增 persistence，allowlist 必須排除 raw private transcript、direct private dialog、raw provider payload、email、phone、policy number、secret、token、cookie、OTP、payment data。
- [x] Theater workbench UI 必須明確標示「審閱佇列 / 待審閱候選 / 需要佐證 / 不代表正式法遵處置」，並保留 no-provider/no-notification/no-formal-finding/no-CRM-fact guardrails；不得把 `ESCALATE` 呈現為已送出正式通報。
- [x] AgentFacts-style manifest 必須新增 internal-only queue capability/action/endpoint/DTO/evidence refs，例如 `route-b-red-line-compliance-review-queue`，且不得宣稱 external registry ready、public discovery、cross-org access 或 signed publication。
- [x] 需新增可重跑 proof command `pnpm theater:route-b-compliance-review-queue-qa`，並跑 `pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。若剩餘只是 live browser screenshot / dev-server visual check，可交由 operator 自行重跑，不得讓 docs-only evidence 取代 source/API/UI work。

ITA-005l evidence note（2026-06-22）：新增 `route-b-red-line-compliance-review-queue` source/API/UI contract。`buildRouteBComplianceReviewQueue()` 只接收已驗證 `RouteBComplianceReviewIntake`，自動排除沒有候選的 session，並輸出 disabled/no-provider queue counts 與 safe candidates。`GET /api/theater/route-b/compliance-review-queue` 使用 current member scope + owner-scoped repository `findMany` 讀取 Route B sessions，不新增 queue/candidate persistence。`/theater` 工作台右欄新增「審閱佇列」panel，顯示待審閱、需要佐證、升級候選 counts 與進 session 檢視入口，並標示未建立正式 finding、未發通知、未寫入 CRM fact、未呼叫 provider。Formal compliance workflow、real notification、live detection 與 external registry publication 仍未啟用。

### 6.13 Relationship confirmation deck to theater handoff acceptance

`ITA-RCG-001` 若把 preparation package 的 relationship confirmation cards 接進 Route B theater handoff，完成前必須額外滿足：

- [x] Handoff consumer 必須由 server/domain 端重建或驗證 `buildVisitRelationshipConfirmationDeck()` 的 safe card output；不得信任 browser 提供 raw org/client/session/person id。
- [x] Theater handoff output 必須把 card 轉成 `knownMaterials`、`sourceSummary`、旁白補問或等價 DTO，且保留 `fact` / `inference` / `unknown`、evidence refs、question/rationale 與 advisor-confirmation posture；inference/unknown 不得升格為 confirmed CRM fact。
- [x] 若同輪沒有 card-state persistence，UI/report 必須明確標示顧問 selection 仍是 local/next-slice；不得宣稱 refresh/new-context 已保存 selection。
- [x] 不得呼叫 OpenAI/Anthropic；若 provider guard 仍 disabled，必須明確提供 no-provider/no fake `AiUsageLog` proof。
- [x] AgentFacts-style manifest 若新增 action/DTO refs，必須保持 `registryReadiness=internal-only`，不得宣稱 external registry ready、public discovery、cross-org access 或 signed publication。
- [x] 需跑 `pnpm visit:relationship-confirmation-dry-run`、`pnpm visit:theater-handoff-dry-run`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；若只剩 browser screenshot，可交由 operator 自行重跑，不得讓 docs-only evidence 取代 source/domain handoff work。

ITA-RCG-001 evidence note（2026-06-22）：`buildVisitTheaterHandoff()` 會 domain-side 重建 safe `VisitRelationshipConfirmationDeck`，輸出 `knownMaterials` 與 `sourceSummary.evidenceSummary.relationshipConfirmation`，並保留 `localAdvisorStatePersisted=false`、`providerCallAttempted=false`、`aiUsageLogWritten=false`、`writesConfirmedCrmFact=false`。`pnpm visit:theater-handoff-dry-run` 驗證 8 張關係確認卡進 theater materials，unknown cards 進 narrator confirmation questions，且不進 confirmed facts；`pnpm ai:protocol-registry-qa` 驗證 manifest 仍為 internal-only / no external publication。

`ITA-RCG-002` 若先建立 relationship confirmation card-state 的 transient server boundary，而尚未做 DB persistence，完成前必須額外滿足：

- [x] `GET/POST /api/visits/[id]/relationship-confirmation-state` 必須使用 current member / owner-scoped VisitPlan lookup；不得相信 browser raw org/member/client id。
- [x] State record allowlist 只能包含 `cardId`、`state`、`updatedAt`、`sourceReferenceIds`、`safeNoteSummary`；不得保存 person label、relationship detail、confirmation prompt、raw private transcript、raw provider payload、email、phone、policy number、secret、token、cookie、OTP 或 confirmed CRM fact。
- [x] `safeNoteSummary` 必須 redacted contact sentinels；未知 card id 必須被 dropped 而不是寫入 envelope。
- [x] Boundary 必須明確標示 `currentPersistence=local-only-ui-state`、`requiresProductDecision=true`、`persistedToDatabase=false`；不得宣稱 refresh/new-context persistence 已完成。
- [x] Proof 必須顯示 no provider call、no fake `AiUsageLog`、no confirmed CRM fact write、no raw private/provider payload、no external registry publication。
- [x] AgentFacts-style manifest 必須新增 guarded/internal-only endpoint/action/DTO/evidence refs 與 `pnpm visit:relationship-confirmation-state-boundary-dry-run` proof command。
- [x] 需跑 `pnpm visit:relationship-confirmation-state-boundary-dry-run`、`pnpm visit:relationship-confirmation-dry-run`、`pnpm visit:theater-handoff-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

ITA-RCG-002 evidence note（2026-06-22）：新增 relationship confirmation card-state transient boundary。Domain helper `buildVisitRelationshipConfirmationStateBoundary()` 把 local advisor selections 正規化為最小 allowlist，API route 只用 current member scoped VisitPlan 推導 deck 並回 no-store JSON，不呼叫 provider、不寫 DB、不寫 confirmed CRM fact。`pnpm visit:relationship-confirmation-state-boundary-dry-run` 覆蓋 domain record allowlist、contact sentinel redaction、unknown card drop、route source contract、no provider/no fake usage/no DB persistence；`pnpm ai:protocol-registry-qa` 驗證 AgentFacts refs 仍為 internal-only/guarded。

`ITA-RCG-003` 若把 preparation page 的 local card state 接到 transient boundary 並作為 theater build 前置檢查，完成前必須額外滿足：

- [x] `/pre-visit/[planId]` 的「建立劇場舞台」與右側劇場入口必須共用同一條 handler，並在 `router.push(theaterHref)` 前 POST `/api/visits/[id]/relationship-confirmation-state`。
- [x] UI 只能送 `cardId`、`state`、`updatedAt`；不得送 person label、relationship detail、confirmation prompt、raw transcript、provider payload、email、phone、policy number、secret/token/cookie/OTP 或 payment data。
- [x] Relationship confirmation panel 必須顯示 validated record count，以及 `currentPersistence=local-only-ui-state`、`requiresProductDecision=true`、`persistedToDatabase=false`。
- [x] Quickstart / local demo flow 不得被 server boundary 阻擋；正式持久化仍需 product/schema decision。
- [x] AgentFacts-style manifest 必須新增 internal-only UI bridge evidence refs 與 `pnpm visit:relationship-confirmation-state-ui-qa` proof command。
- [x] 需跑 `pnpm visit:relationship-confirmation-state-ui-qa`、`pnpm visit:relationship-confirmation-state-boundary-dry-run`、`pnpm visit:relationship-confirmation-dry-run`、`pnpm visit:theater-handoff-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

ITA-RCG-003 evidence note（2026-06-22）：`/pre-visit/[planId]` 已將 relationship confirmation card state 提升到頁面層，右上主 CTA 與劇場卡共用 `handlePrimaryAction()`，在劇場建場跳轉前先送 transient boundary；panel 顯示 boundary badge、已驗證/已確認/轉追問數、`currentPersistence` / `requiresProductDecision` / `persistedToDatabase` guardrail 與 no-provider/no-DB/no-CRM-write proof。新增 `pnpm visit:relationship-confirmation-state-ui-qa` 靜態驗證 UI route wiring、validation-before-push、panel guardrails、route no Prisma persistence 與 package script。

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
