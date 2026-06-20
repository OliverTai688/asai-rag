# 誠問 AI Realtime Voice × Park-style Interview Memory Acceptance Framework v1.0

> 建立日期：2026-06-19  
> 適用範圍：`PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md` 的 PIM workstream。  
> 關聯文件：`ARC-007`、`RES-017`、`ARC-004`、`PLN-015`、`ACC-006`。

---

## 1. Acceptance Goals

每張 PIM 卡完成時必須證明：

1. **連續訪談**：AI 能記得前面已確認內容，不重複問。
2. **記憶可追溯**：output/reflection/plan 能引用 supporting memory IDs 或等價 evidence。
3. **事實邊界清楚**：fact、confirmed、inference、unknown 不混淆。
4. **兩個訪談共用架構**：顧問陪談與劇場場域建構都使用同一 memory/reflection/planning contract。
5. **中文語音安全接入**：mic consent、fallback、transcript correction、no raw audio default。
6. **合規與成本可追蹤**：AI call 寫 `AiUsageLog`，高敏感資料不外洩。

---

## 2. Hard Rule Checklist

- [ ] 不刪除、不 optional 化 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [ ] 不破壞 SPIN legacy `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF`。
- [ ] 不手改 `src/generated/`。
- [ ] 每次 OpenAI/Anthropic call 成功/錯誤皆寫 `AiUsageLog`。
- [ ] Raw audio 預設不保存。
- [ ] Reflection 不被當成 CRM fact。
- [ ] Org manager 不可讀 transcript、memory text、private reflection、client private payload。

---

## 3. Memory Acceptance

- [ ] User/assistant turn 可產生 memory candidates。
- [ ] Memory 至少包含 source、dataClass、confidence、importance、visibilityScope、retentionPolicy。
- [ ] `voice_transcript` 與 `text_input` 進入同一 memory pipeline。
- [ ] Correction 會 supersede prior uncertain memory。
- [ ] Retrieval 有 org/member/session/client scope filter。
- [ ] Inference 不會被 retrieval prompt 描述為 confirmed fact。

---

## 4. Advisor Companion Acceptance

- [ ] 顧問陪談訪談不重問已 confirmed facts。
- [ ] Issue Readiness/PQ 缺口可從 memory/reflection 推導。
- [ ] Output draft 帶 supporting memory IDs 或等價 evidence。
- [ ] Unknowns 會變成追問或待確認，不會直接生成策略。
- [ ] 準備卡分 confirmed facts、inferred patterns、unknowns、compliance notes。
- [ ] 獨立模式不寫回 CRM。
- [ ] 客戶資料模式寫回前顯示 confirmation card。

---

## 5. Theater Field Build Acceptance

- [ ] 劇場場域建構訪談產生 `TheaterBuildPacket` 或等價資料。
- [ ] 焦點客戶、NPC、關係、異議、場景目標各自保留 fact/inference/unknown。
- [ ] NPC 不超過 4。
- [ ] 資料不足時產生 narrator questions，不杜撰角色事實。
- [ ] 高敏感資料進 Theater 前有 explicit consent / reason / risk boundary。
- [ ] Theater Route B 只能消費 confirmed facts 作為事實。

---

## 6. Reflection / Planning Acceptance

- [ ] Reflection 分 confirmedFacts、inferredPatterns、unknowns、recommendedNextFocus。
- [ ] Reflection 保留 supporting memory IDs。
- [ ] Planning 依 current segment、retrieved memories、latest reflection、Issue/PQ context 決定下一題。
- [ ] Planning 不跳段、不重問、不把 inference 當 fact。
- [ ] AI 對使用者一次只問一題。
- [ ] 中文文案用台灣繁體、白話，不暴露內部 scoring 作為客戶評價。

---

## 7. Voice Acceptance

- [ ] 使用者明確點擊後才請求 mic permission。
- [ ] Consent 說明包含 no raw audio default、transcript retention、敏感資料提醒。
- [ ] Permission denied 時文字模式仍可用。
- [ ] Live transcript visible。
- [ ] Transcript 可修正，修正會進 correction memory。
- [ ] AI speaking/listening/thinking/paused 狀態可辨識。
- [ ] 支援 interrupt/pause/resume 或明確標示尚未支援。
- [ ] Realtime session response 不包含 provider server API key。

---

## 8. API / DB Acceptance

- [ ] Realtime session route unauth 回 401。
- [ ] Quota exceeded 回 429 且不 mint token、不增加 provider usage。
- [ ] Event mirror 不接受 secret/raw cookie/provider key。
- [ ] DB persisted records 全有 `organizationId`。
- [ ] Client-bound records 的 `clientId` 必須經 server-side permission 驗證。
- [ ] 清空 browser storage 後，已保存 session/memory 可恢復。
- [ ] Migration/rollback note 存在；production mutation 需要 approval。

---

## 9. Quick-capture Bridge Acceptance

`PIM-011` 或任何 post-visit quick-capture / notes-to-memory slice 完成前，必須額外滿足：

PIM-011a source-contract proof（2026-06-20）新增 `pnpm interview:quick-capture-bridge-dry-run`，目前只證明 domain helper 的分類、scope、敏感 gate、handoff 與 no-provider posture；尚未證明正式 BFF/API persistence、cross-role denial、refresh/new-context DB readback 或 UI browser proof。

PIM-011b proof-plan boundary（2026-06-20）：若 Supabase/DB proof 尚不可執行，agent 可更新文件與 proof plan，但不得把 PIM-011 宣告為 BFF/API 完成。正式 BFF/API slice 必須以 server session 推導 scope，並以 DB-backed request 證明 owner success、cross-role denial、high-sensitive gate、refresh/new-context readback 與 raw-private-data hygiene。

PIM-011b BFF/API proof（2026-06-21）：新增 `pnpm interview:quick-capture-bff-qa`，已用 local dev server + development DB 證明 owner 201/readback、manager read/write 404、高敏感 client gate、secret/raw payload block、response no private sentinel、raw note 不 echo、turn anchor 不存 raw note、unknown/inference theater handoff 與 `AiUsageLog` unchanged 147->147。此 proof 尚未代表 `/pre-visit/[id]/notes`、meeting workspace 或全站 quick-capture UI selector 已接入。

- [x] Quick-capture note 可先不歸戶，但歸戶或連到 `VisitPlan` / `Client` 時，scope 一律由 server session 推導，不信任前端 `organizationId`、`memberId`、`clientId`、`visitPlanId`。
- [x] Note -> memory mapping 保留 source label、note/turn id、`FACT` / `CONFIRMED` / `INFERENCE` / `UNKNOWN`，且 inference 不得寫成 CRM confirmed fact。
- [x] 手動筆記與語音 transcript 都可以成為 `InterviewMemory` candidate；raw audio 預設不保存，raw private transcript 不進 report/evidence。
- [x] Post-visit note 可補強準備包、meeting summary、narrator questions 或 theater state proposal，但 CRM writeback 必須走 confirmation card 與 audit。
- [x] High-sensitive client note 缺 reason/riskAccepted 時 blocked 或只能保持 private draft。
- [x] No-provider bridge proof 必須顯示 `AiUsageLog` count unchanged；若新增 summary/chat provider route，success/error 都必須寫 `AiUsageLog` 並納入 `pnpm ai:usage-audit`。
- [x] Cross-role proof 覆蓋 member owner success 與 manager/foreign denied；org aggregate API 不回 note text、transcript、memory text 或 client private payload。
- [x] BFF/API proof response DTO 至少包含 note/turn/memory id、source label、data class、fact/inference/unknown 分流、supporting evidence、`requiresConfirmation`；不得包含 raw private transcript、raw provider payload、secret/token sentinel。
- [ ] Browser proof 若接 UI，必須證明顧問可用 selector/context 選「保持私人草稿 / 歸客戶 / 歸拜訪 / 轉待確認」，不得要求 raw client/visit/session ID 作為主要操作。

---

## 10. UI / Browser QA

- [ ] `/interview` desktop 1440x1000 console error 0、無水平 overflow。
- [ ] `/interview` mobile 390x844 console error 0、無水平 overflow。
- [ ] Voice shell consent、permission denied、fallback 狀態有截圖。
- [ ] Memory rail 不遮擋輸入區。
- [ ] Confirmation card 可 keyboard 操作，focus ring 可見。
- [ ] Icon-only controls 有 tooltip / aria-label。

---

## 11. Verification Commands

每張卡依變更範圍執行：

- [ ] `pnpm exec tsc --noEmit --pretty false`
- [ ] `pnpm run lint:changed`
- [ ] 動 schema：`pnpm prisma:validate`
- [ ] 動 schema：`pnpm prisma:generate`
- [ ] 需要 DB 實套：local/development `prisma db push` 或 migration dry-run/proof
- [ ] 動 AI route：success/error `AiUsageLog` proof
- [ ] 動 UI：Browser/headless desktop/mobile screenshot proof
- [ ] PIM-011a source contract：`pnpm interview:quick-capture-bridge-dry-run`
- [x] PIM-011 BFF/API proof：owner member 201/200、manager/foreign 404/403、high-sensitive missing reason blocked、refresh/new-context DB readback、response no private sentinel、`AiUsageLog` unchanged 或 provider success/error log proof

---

## 12. Hard Stop Conditions

不得標完成：

- Raw audio 在未取得 approval 下被保存。
- Provider API key 或 ephemeral token 被寫入 repo/report/evidence。
- Reflection/inference 被寫成 CRM confirmed fact。
- Org manager 可讀逐字稿或 memory text。
- Realtime route 繞過 session/quota guard。
- Theater build packet 把 unknown 當 NPC 事實。
- AI route 沒有 `AiUsageLog` success/error proof。
