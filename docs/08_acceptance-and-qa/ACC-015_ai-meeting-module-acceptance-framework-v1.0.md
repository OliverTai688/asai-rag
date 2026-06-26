# 誠問 AI AI Meeting Module Acceptance Framework v1.0

> 建立日期：2026-06-20  
> 狀態：驗收框架，供 `PLN-023` 各卡使用  
> 研究依據：`docs/07_research-and-design/RES-023_ai-meeting-module-research-v1.0.md`  
> 架構依據：`docs/02_architecture-and-rules/ARC-010_ai-meeting-module-architecture-v1.0.md`

---

## 1. 驗收原則

AI Meeting Module 的驗收重點不是「會議頁面多漂亮」，而是：捕捉真實、摘要可被引用回原文、跨會議記憶真的懂客戶、隱私邊界不外洩、用量被記錄、寫回需確認。

每張 AMM 卡至少交付：

- code 或文件變更。
- API proof：401/403/404/400/200/201/429/503 依情境覆蓋。
- Cross-role proof：member、manager/org admin 至少覆蓋受影響角色。
- Private leakage proof：response 不含 raw audio、raw prompt、provider payload、foreign org/client 資料。
- Browser proof（若改 UI）：desktop 1440×1000 / mobile 390×844 console error 0、無水平 overflow、refresh persistence。
- `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

---

## 2. 捕捉（Capture）Gates

- 可建立 `CLIENT_MEETING` session 並帶 `clientId` / `visitPlanId`（scope 由 server session 推導，不信任前端）。
- 手動筆記、文字、語音 final transcript 皆能 append 成 `InterviewTurn`，帶 `occurredAt`。
- 語音沿用既有 realtime/transcribe；**raw audio 不入庫**，只存 transcript + 結構化記憶。
- 清空 browser storage / 重新登入後，transcript 與會議可從 DB 讀回。
- mic 權限被拒 / 瀏覽器不支援時退回文字模式，不阻斷會議建立。

---

## 3. 摘要與引用（Summary & Citation）Gates

- `MeetingSummary` 含 headline、summary、decisions、actionItems、openQuestions、participants。
- 每要點 / 行動項帶 `MeetingCitation`（turnId + occurredAt + memoryIds）。
- citation 只引用**已存在**的 turn/memory；不得引用未發生內容（防幻覺）。
- 手動筆記與 live transcript 一起被納入摘要。
- 摘要可重生覆蓋（supersedes 前一份），不污染或刪改 transcript。
- 未知項以 openQuestions / UNKNOWN 呈現，不被升格成 confirmed fact。

---

## 4. 跨會議對答（Memory Chat）Gates

- 對答 grounding 包含本場 transcript **與本客戶過去會議記憶 + CRM/保單/家庭/報告投影**。
- 答案分 facts / inferences / unknowns，並帶 citations。
- 不重述已確認事實當新發現；不把 inference 當 fact。
- member 不能對無權限客戶對答（403）；跨成員客戶記憶預設不可見（member-private）。
- 檢索套用 `visibilityScope`：`MEMBER_PRIVATE` 不外洩、`ORG_AGGREGATE_ONLY` 不回明細。

---

## 5. AI 用量 Gates

每條會議 AI route 必須證明：

- session/token scope。
- provider call 前檢查 capability/quota。
- success `AiUsageLog`（summary / chat / realtime）。
- provider 嘗試失敗寫 error `AiUsageLog`。
- quota-blocked 回 429，不呼叫 provider、不偽造 usage。
- trace 連 `interviewSessionId` / `interviewTurnId`，可被 super admin 逐輪用量審計。
- 納入 `pnpm ai:usage-audit` 覆蓋（新增 route 不得留 audit gap）。

---

## 6. 隱私與合規 Gates

- 會議 DTO 為 member-private（transcript/memory/summary）。
- org aggregate API 不回 transcript、memory text、summary 正文、客戶姓名/電話/email、保單號、報告全文。
- 合規欄位 `complianceChecklist`、`sensitivityLevel`、`kycStatus` 保留、不得 optional。
- 敏感客戶會議與寫回需 reason / riskAccepted gating。
- raw audio 預設不保存。

---

## 7. 寫回 Gates

- 行動項 → follow-up task；confirmed fact → CRM candidate；inference → insight；unknown → follow-up。
- confirmed + 人工勾選才寫回；inference checked 不變 CRM fact。
- 所有寫回建立 audit / interaction event。
- 敏感客戶寫回缺 reason / riskAccepted 時 blocked。

---

## 8. Browser QA Matrix

| Viewport | Required checks |
| --- | --- |
| Desktop 1440×1000 | no console error, no horizontal overflow, transcript/summary 可見, citation 可點回 turn, refresh persistence |
| Mobile 390×844 | no console error, no horizontal overflow, 輸入區不遮擋, 主要動作可達 |

Required contexts：fresh browser context、cleared storage、relogin / demo auth header、authorized 與 unauthorized role/session。

---

## 9. Reporting Template

```markdown
## <date> - <card id> <title>

### Goal
- ...

### Changes
- ...

### Data / DB / Prisma
- ...

### API Proof
- ...（含 401/403/429/success/error AiUsageLog）

### Memory / Citation Proof
- ...（跨會議引用、citation 連回 turn、fact/inference/unknown 分流）

### Browser Proof
- ...

### Privacy / Boundary Proof
- ...（manager aggregate 無 transcript/客戶明細、raw audio 不入庫）

### Validation
- `pnpm exec tsc --noEmit --pretty false`: pass/fail
- `pnpm lint:changed`: pass/fail
- Prisma / Browser / custom QA: pass/fail

### Remaining Blockers
- ...

### Next Recommended Entry
- ...
```
