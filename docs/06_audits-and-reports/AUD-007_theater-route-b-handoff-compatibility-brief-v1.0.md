# 誠問 AI Theater Route B Handoff Compatibility Brief v1.0

> 建立日期：2026-06-20  
> 狀態：TDF-005a completed handoff contract  
> 關聯任務：`PLN-020` TDF-005、`PLN-015` ITA-003  
> 關聯驗收：`ACC-012` Route B Handoff Acceptance、`ACC-006` Theater Acceptance

## 1. Scope

本 brief 定義 `TheaterBuildPacket` / TDF setup draft 進入 Route B 多角色劇場前的交接邊界。這不是 Prisma migration，也不是 production 多角色 runtime；它先建立可 review 的 handoff contract，讓後續 ITA-003/ITA-006 接 schema、director、character call 與 feedback 時不再混用 legacy Theater 的 `personaType`、`tension`、`score`。

交付檔案：

- `src/domains/theater/route-b-handoff.ts`
- `scripts/theater-route-b-handoff-dry-run.ts`
- `scripts/theater-route-b-handoff-dry-run.mjs`
- `package.json` script：`pnpm theater:route-b-handoff-dry-run`

## 2. Handoff Contract

`buildTheaterRouteBHandoff(packet)` 將 `TheaterBuildPacket` 映射成：

- `TheaterRouteBScene`：場景、scenario、characters、relationships、objections、narratorQuestions、visibilityRules、statePatches。
- `TheaterRouteBCharacter[]`：焦點客戶必在場，NPC 上限 4；每個角色拆成 `knownFacts`、`personaHints`、`unknowns`、`exemplarLines`。
- `TheaterRouteBVisibilityRule[]`：固定支援 `GROUP`、`PRIVATE`、`DIRECTOR_ONLY`、`NARRATOR`。
- `TheaterRouteBStatePatch[]`：人物狀態或關係張力只寫 scene private state / relationship state / narrator queue；`requiresConfirmation=true` 且 `writesConfirmedCrmFact=false`。

資料邊界：

- confirmed/fact material 才能作角色背景。
- inference 只可作 persona hint 或 private state，不能在角色台詞中宣稱為確認事實。
- unknown 只進 narrator questions 或待確認 state patch。
- handoff builder 會移除 email、phone 與 raw private sentinel 字串。

## 3. Director And Character Inputs

`buildTheaterRouteBDirectorInput(handoff, options)` 定義導演呼叫輸入：

- `sceneState`
- `scopedHistory`
- `characterCards`
- `visibilityRules`
- `salespersonUtterance`
- `allowedActions`
- `aiUsageLogRequired=true`

`buildTheaterRouteBCharacterInput(handoff, options)` 定義角色呼叫輸入：

- 單一 `characterCard`
- `addresseeCharacterId`
- `visibilityScope`
- `directorDirective`
- `visibleHistory`
- `aiUsageLogRequired=true`

私聊規則：角色只看得到 `GROUP` turn，以及 speaker/addressee 包含自己的 `PRIVATE` turn；看不到其他角色私聊，也看不到 `DIRECTOR_ONLY`。

## 4. AiUsageLog Strategy

handoff build 本身是 deterministic pure function，不呼叫 provider、不寫 DB。

後續 Route B runtime 一旦接 provider，三種呼叫都必須可追蹤：

- `DIRECTOR`：選 speaker、addressee、visibility scope、演出指令。
- `CHARACTER`：依角色卡、導演指令與可見歷史生成回應。
- `FEEDBACK`：生成五視角質化回饋與合規提醒。

每種 call plan 均要求：

- `requiresAiUsageLog=true`
- `logOn=SUCCESS_AND_PROVIDER_ERROR`
- `storesRawProviderPayload=false`

## 5. Legacy Compatibility

legacy Theater 欄位處理策略：

- `personaType`：只供舊單角色 session 讀取相容；Route B 不從 legacy enum 推導角色人格。
- `tension`：不進 Route B 新主流程；人物狀態改以 `statePatches` 表達，且不可寫成 CRM confirmed fact。
- `score`：只供舊 session 顯示；Route B feedback 由 ITA-004 五視角質化回饋接手，不沿用總分作新主流程。

Rollback / disabled note：

- Route B 未啟用時，`/theater` 可以停在 setup draft / handoff review。
- UI 不得宣稱可進入 production multi-character theater。
- 本 slice 不改 Prisma、不寫 DB、不啟動 provider call。

## 6. Proof

`pnpm theater:route-b-handoff-dry-run` 覆蓋：

- focus client exists。
- NPC count capped at 4。
- extra NPC trimmed。
- unknown gaps stay narrator questions。
- inference remains persona hint / private state boundary。
- visibility scopes include group/private/director/narrator。
- Route B runtime disabled by default。
- rollback note explicit。
- director / character / feedback calls all require `AiUsageLog`。
- director input keeps scoped history labels。
- character input sees group + own private thread only。
- character input cannot see other private thread or director-only history。
- state patch requires confirmation and cannot write confirmed CRM fact。
- handoff string values contain no email/phone/raw private sentinel。

## 7. Next ITA-003 Entry

下一輪若切入 ITA-003，應以本 handoff contract 為輸入，先做 schema/migration draft：

- `TheaterScene`
- `TheaterCharacter`
- `TheaterTurn` speaker/addressee/visibility scope
- `TheaterStatePatch` or equivalent scene state store
- `TheaterFeedback` five-view qualitative output
- success/error `AiUsageLog` proof for director/character/feedback provider calls

若尚未要動 schema，下一個安全切片是 TDF-006 cross-state QA，確認 `/theater` 三入口、client build review、previsit handoff review 與 high-sensitive gate 在 desktop/mobile 仍一致。
