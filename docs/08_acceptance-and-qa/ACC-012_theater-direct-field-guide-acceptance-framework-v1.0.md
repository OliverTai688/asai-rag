# 誠問 AI Theater Direct Field Guide Acceptance Framework v1.0

> 建立日期：2026-06-19  
> 適用範圍：`PLN-020_theater-direct-field-guide-batch-tasks-v1.0.md` 的 TDF workstream。  
> 關聯文件：`RES-019`、`RES-003`、`ARC-004`、`PLN-015`、`ACC-006`。

---

## 1. 驗收目標

TDF workstream 完成時必須證明：

1. **入口正確**：沒有顧問訪談 / SPIN session 時，仍可用劇場訪綱 B 開始建場。
2. **素材可信**：setup draft 能區分 fact / confirmed / inference / unknown，並保留 source provenance。
3. **可進可退**：Route B 未完成時可停在 setup draft review，不假裝多角色 production-ready。
4. **合規安全**：真實客戶、高敏感客戶、org/member visibility 都有 guard。
5. **工程可驗收**：每張卡有 tsc、lint、必要 Browser/API proof。

---

## 2. Hard Rule Checklist

- [ ] 不刪除、不 optional 化 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [ ] 不破壞 SPIN legacy `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF` 狀態機。
- [ ] 除 TDF-005 handoff 或 ITA-003/ITA-006 外，不改 Theater legacy enum/scoring/schema。
- [ ] OpenAI/Anthropic call 若有新增，成功與錯誤都寫 `AiUsageLog`。
- [ ] 不手改 `src/generated/`。
- [ ] Org manager 不得看到 member 客戶明細、逐字稿、私聊或 setup private payload。
- [ ] 高敏感客戶進劇場需要 explicit confirmation、reason、riskAccepted。

---

## 3. Direct Setup Acceptance

- [ ] `/theater` 第一屏可見三入口：劇場訪綱建場、帶客戶資料建場、從既有訪談轉入。
- [ ] 無 SPIN / interview material 時，劇場訪綱建場仍可點擊。
- [ ] 空狀態不再要求先完成 AI 了解客戶。
- [ ] Quickstart legacy `spinId` / `clientId` / `autoCreate` path 不破。
- [ ] Start CTA disabled 狀態只因必要 setup draft 不完整，不因缺 SPIN 而 disabled。

---

## 4. Theater Field Outline Acceptance

- [ ] `RES-003` 七段訪綱已萃取為 TS outline。
- [ ] 每段含 coreQuestions、followUps、goal、dataSource、purpose 或等價欄位。
- [ ] 訪綱 B 可以逐段推進，不跳段。
- [ ] 核心題未答可標 unknown，不可偽造答案。
- [ ] 輸出 schema 至少涵蓋：場域概述、角色卡、關係張力、三層次摘要、核心場景、待確認問題。

---

## 5. Setup Draft Acceptance

- [ ] `TheaterSetupDraft` 或同等 contract 有焦點客戶。
- [ ] NPC 不超過 4。
- [ ] 每個角色 draft 有公開立場、沒說出口的、外顯行為、source/factStatus。
- [ ] 每段關係張力有 source/factStatus。
- [ ] 基本假設預設是 inference，除非有明確 confirmed evidence。
- [ ] unknown 會留在待確認問題，不被升格成 fact。
- [ ] 使用者可在進劇場前 review / edit setup draft。

---

## 6. Client Data Build Acceptance

- [ ] Client-bound build 由 server/session scope 推導 current member，不接受前端 organizationId/userId。
- [ ] 無權限 client 回 403 或等價 guard。
- [ ] 高敏感 client 缺 reason/riskAccepted 時 blocked。
- [ ] known facts、missing fields、inferences、sensitivity warnings 清楚分區。
- [ ] 寫回 CRM 不是 TDF 預設行為；若有寫回，必須走 confirmation card 與 audit。
- [ ] 不把 org manager aggregate 權限升格成 client-detail 權限。

---

## 7. Route B Handoff Acceptance

- [ ] setup draft 能映射到 TheaterScene / TheaterCharacter handoff contract。
- [ ] director input 明確含 scoped history、visibility rules、角色卡、業務員 utterance。
- [ ] private/group mode 的 visibility scope 有資料結構。
- [ ] Route B 未啟用時 UI 不宣稱可進入 production 多角色劇場。
- [ ] migration/rollback/compatibility note 已連到 `PLN-015` ITA-003。

---

## 8. UI / Browser QA

- [ ] `/theater` desktop 無水平 overflow。
- [ ] `/theater` mobile 無水平 overflow，setup flow 不遮擋主要 CTA。
- [ ] 三入口有 accessible name，keyboard focus 可見。
- [ ] Wizard/sheet/dialog 開關與 escape/focus return 行為合理。
- [ ] Error / empty / loading 狀態不互相覆蓋。
- [ ] 截圖保存到 `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/`。

---

## 9. Verification

每張卡完成前：

- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`。
- [ ] 跑 `pnpm lint:changed`。
- [ ] 動 schema 跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [ ] 改 API 跑 unauth / forbidden / success 或等價 proof。
- [ ] 改 UI 用 Browser 或 headless Chrome 做 desktop/mobile proof。
- [ ] 更新 `PLN-020` 與 `AGENTS.md` 勾選狀態。

---

## 10. Hard Stop Conditions

遇到以下情況不得標完成：

- 無 SPIN / 顧問訪談時仍不能開始劇場訪綱建場。
- setup draft 將 inference 或 unknown 顯示成 confirmed fact。
- 高敏感客戶可無 reason/riskAccepted 進劇場。
- Org manager 可讀 member 客戶明細或 private setup payload。
- 新增 AI call 未寫 `AiUsageLog`。
- Route B 未完成卻宣稱多角色劇場已 production-ready。
