# 誠問 AI Private Beta Launch Scope And Risk Register v1.0

> 建立日期：2026-06-19  
> 狀態：ALA-001 release scope lock，供 private beta go/no-go 與後續 `ALA-002..008` 使用  
> 關聯計畫：`docs/05_execution-plans/PLN-022_aggressive-launch-acceleration-batch-tasks-v1.0.md`  
> 關聯架構：`docs/02_architecture-and-rules/ARC-009_beta-production-boundary-architecture-v1.0.md`  
> 關聯驗收：`docs/08_acceptance-and-qa/ACC-014_private-beta-release-gates-v1.0.md`

---

## 1. Launch Scope Lock

第一個可積極推進的外部上線目標定義為 **Level 2 Controlled Private Beta**，不是 Level 3 Public Launch。

### 1.1 Beta 可承諾

- 受邀保險顧問與少量通訊處可登入 private beta。
- 顧問可管理客戶基本資料、家庭/保單摘要、訪談準備、AI output draft、報告分享。
- 三個 AI 模組可作顧問輔助：`問誠問 AI`、`AI 了解客戶`、`AI 劇場演練`。
- 通訊處主管只看 aggregate/coaching/unit/member health，不看客戶明細或逐字稿。
- 客戶入口先採 token-scoped share / client portal，不承諾完整 client account。
- 自助正式金流預設關閉；private beta 可採免費、人工合約或人工啟用方案。

### 1.2 Beta 不可承諾

- 不承諾網路投保或網路保險服務。
- 不承諾 AI output 可替代正式保險商品建議。
- 不承諾法律、稅務、財務或投資建議。
- 不開放 public self-serve signup。
- 不啟用 production self-serve checkout / payment / refund。
- 不寄送 production email / notification。
- 不保存 raw audio。
- 不執行 production DB destructive operation。

### 1.3 Scope Change Rule

若要解除任一限制，必須新增 issue-question 並建立對應 release gate，不可在一般 batch 裡順手開啟。

---

## 2. Risk Register

| 風險 | 等級 | 觸發情境 | Mitigation | Gate |
| --- | --- | --- | --- | --- |
| 跨租戶資料洩漏 | P0 | 前端傳入 org/user/client scope 被信任；manager 重用 member detail API | Server session 推導 scope、shared policy helper、negative tests、org aggregate DTO sentinel | Gate 2, Gate 3 |
| AI 成本暴衝 | P0 | Public/beta user 大量呼叫 AI；provider retry 失控 | Per-org/per-user/per-module quota、kill switch、usage alert、429 before provider call | Gate 4 |
| AI 被誤認為正式保險商品建議 | P0 | UI/報告文字把 AI output 包裝成最終建議 | Beta disclaimer、fact/inference/unknown、人工確認、scope lock wording | Gate 1, Gate 4 |
| Client token 被濫用 | P1 | 分享 token 外流、暴力測試、expired token 仍可用 | Expiry、revocation、event audit、rate limit、client-scoped session、workspace API 401/403 | Gate 2, Gate 3 |
| Billing 半套誤啟用 | P1 | 前端 redirect 直接啟用 plan；checkout flag 誤開 | `ENABLE_SELF_SERVE_CHECKOUT=false`、server notification/query/idempotency、manual activation audit | Gate 6 |
| Monitoring 只有文件沒有 live proof | P1 | private beta 出錯但無 alert/trace | Monitoring ingestion proof、readiness gate blocked if missing、PII-safe logs | Gate 5 |
| Super admin 成無痕後門 | P1 | support/platform user 直接讀敏感資料 | Platform session 分離、break-glass reason/scope/expiry、every sensitive read audit | Gate 2 |
| Production mock/dev shortcut 外漏 | P1 | production-like env 仍允許 mock API 或 dev auth header | `ALLOW_MOCK_API=false`、`ALLOW_DEV_AUTH_HEADER=false`、QA proof | Gate 1, Gate 2 |
| 真實客戶資料缺刪除/停止處理流程 | P1 | beta user 輸入真實資料後要求刪除 | Data rights playbook、support process、audit log、manual deletion guard | Gate 1, Gate 5 |
| Legacy SPIN/Theater 與新主流程混淆 | P2 | 使用者以為 legacy flow 是新版 Route B production-ready | Feature flag、staging gate、navigation naming、明確 blocker note | Gate 3, Gate 4 |

---

## 3. Release Gate Checklist

本節把 `ACC-014` Gate 1-7 轉成 ALA release report checklist。狀態只代表本文件完成的 scope lock，不代表 gate 已全面通過。

| Gate | 目前判斷 | 說明 |
| --- | --- | --- |
| Gate 1 Scope and legal boundary | Partial | Scope lock 已完成；beta terms addendum、client data consent template、正式法務核可仍待 ALA-006/operator。 |
| Gate 2 Identity, role, tenant | Partial | LCH/RAS/BFF 已有基礎；invite-only beta account path 與 RAS cross-role alignment 仍待 ALA-002/RAS。 |
| Gate 3 Business runtime | Partial | Client/share/org/super admin 已有多條 BFF；theater persistence、visit/report full BFF 與 beta critical QA matrix 仍待 ALA-003/BFF。 |
| Gate 4 AI control | Partial | 三 AI usage/quota/error path 已推進；per-module kill switch、sensitive-data consent、AI readiness gate 仍待 ALA-004。 |
| Gate 5 Observability and ops | Partial | Runbook/readiness 基礎存在；live monitoring ingestion、PII redaction proof、backup restore proof 仍待 ALA-005/operator。 |
| Gate 6 Billing safety | Partial | Self-serve checkout 應保持 off；ECPay CheckMacValue/notify/query/idempotency proof 仍待 ALA-007/operator credentials。 |
| Gate 7 Beta evidence pack | Blocked | 需 ALA-002..007 完成後建立 `pnpm beta:release-candidate-qa` 與 final evidence pack。 |

---

## 4. UI Wording Scan

2026-06-19 以文字掃描檢查 public/docs 中可能造成 launch scope 誤解的高風險詞：

```bash
rg -n "網路投保|網路保險|正式保險商品建議|保證|必賺|替代.*顧問|替代.*專業|不需.*人工" src docs -S
```

判斷：

- 文件中提到「網路投保 / 網路保險服務」多為 research/blocker/scope-lock 語境，不是產品承諾。
- 本輪未發現需要立即改動的 public UI 文案。
- ALA-006 仍需把 beta UI/flow 中的 AI disclaimer 與「非網路投保 / 非正式商品建議」界線做成可見驗收。

---

## 5. Operator Decisions Needed

1. **Beta real-data policy**：第一批 private beta 是否允許輸入真實客戶資料，或只允許半匿名資料？
2. **Beta participant scope**：第一批外部 beta 人數、通訊處數量與白名單名單。
3. **Auth provider**：private beta 使用 Auth.js credentials invite flow、Supabase Auth email/password、Magic Link、Google OAuth，或其他 provider？
4. **Email policy**：是否允許 staging/beta 寄出真實 invite email？若否，ALA-002 採人工傳送 invite token。
5. **Billing policy**：private beta 是否完全免費、人工合約、或只開 ECPay test mode？
6. **Monitoring provider**：Sentry DSN 或等價 monitoring provider 是否提供給 staging/private beta？
7. **Legal owner**：誰負責審核 beta terms/privacy/AI disclaimer/client data consent？

---

## 6. Next Recommended Entry

最建議下一張卡：

```text
ALA-002 Private beta account and onboarding path
```

原因：scope 已鎖定後，最短上線路徑是建立 invite-only account，不開 public signup、不寄 production email、不啟用 payment。若 auth provider/real email 尚未決策，可以先以 non-production explicit env + manual invite token 完成 beta path proof。

