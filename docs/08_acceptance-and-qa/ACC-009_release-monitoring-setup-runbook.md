# 誠問 AI Release Monitoring Setup Runbook

> 文件號：ACC-009  
> 狀態：Private beta gate ready；production ingestion 尚需 operator proof  
> 對應 batch：`LCH-009` Production Controls And Release QA  
> 建立日期：2026-06-19

---

## 1. Scope

本文件定義誠問 AI 上線前的錯誤監控最小方案。目標不是在 local/staging 假裝 production monitoring 已完成，而是讓 release readiness gate、operator 手動步驟、QA 指令與 production blocker 狀態可以被重複驗證。

適用範圍：

- Server runtime errors：Next.js route handlers、server components、BFF/repository exceptions。
- Client runtime errors：browser-side React errors、hydration/runtime exceptions。
- Release operations：deploy 後錯誤追蹤、alert routing、incident owner、rollback decision。

不在本文件範圍：

- 正式 public launch 的完整 uptime monitoring、synthetic checks、provider dashboard long-term SLO。
- AI 品質評估與 prompt tracing；這些應由後續 Level 3 hardening workstream 補齊。

---

## 2. Env Contract

Production-like runtime 至少需要以下其中一個 DSN 才能讓 `release-readiness` 的 `monitoring` gate 轉為 `pass`：

- `SENTRY_DSN`：server/runtime error monitoring DSN。
- `NEXT_PUBLIC_SENTRY_DSN`：browser/client error monitoring DSN。

建議但不作為目前 readiness gate 必填：

- `SENTRY_ENVIRONMENT`：例如 `staging`、`production`。
- `SENTRY_RELEASE`：部署版號或 git SHA。
- `SENTRY_TRACES_SAMPLE_RATE`：若啟用 performance tracing，須用低取樣率並先經合規審查。

安全規則：

- 不得把 secret、cookie、raw authorization header、private request body、完整客戶資料、保單號碼、AI prompt/response 原文送進 monitoring event。
- Public DSN 本身不是密鑰，但 repo 與 report 仍不得輸出實際 production DSN 值。
- Monitoring event 的 user context 僅可使用內部 ID 或 hash，不可使用客戶姓名、電話、email、policy number。

---

## 3. Readiness Gate Behavior

`GET /api/platform/release-readiness` 的 `productionControls.controls` 必須包含：

```json
{
  "key": "monitoring",
  "label": "Error monitoring configured"
}
```

Gate 判斷：

- 若 `SENTRY_DSN` 與 `NEXT_PUBLIC_SENTRY_DSN` 皆未設定：`monitoring.status = "blocked"`。
- 若任一 DSN 存在：`monitoring.status = "pass"`，代表 env contract 已滿足，不代表 production ingestion 已由 operator 實測。

Production approval 前，operator 仍需完成第 4 節 checklist，並在 release issue 中附上不含 secret 的 ingestion proof。

---

## 4. Operator Checklist

Production 或正式 staging 前，由 operator 完成：

- 建立 Sentry 或等價 monitoring project，環境至少區分 `staging` / `production`。
- 設定 `SENTRY_DSN` 或 `NEXT_PUBLIC_SENTRY_DSN` 到部署環境；不得提交到 repo。
- 設定 alert recipient、incident owner、on-call channel 與 escalation policy。
- 觸發一個安全的 staging sample error，確認事件可進入 monitoring dashboard。
- 檢查 sample event 內沒有 cookie、authorization header、raw request body、保單號碼、客戶 email/phone、AI prompt/response 原文。
- 記錄 release、environment、alert route、sample event id；不要記錄 DSN。
- 在 production cutover 前再次執行 `pnpm monitoring:readiness-qa` 與 `pnpm demo:release-readiness-qa`。

若 operator 無法在 release window 前完成以上項目，`monitoring` 必須維持 release blocker，不得以 mock success 或只存在文件取代。

---

## 5. QA Commands

Local/staging readiness proof：

```bash
pnpm monitoring:readiness-qa
pnpm demo:release-readiness-qa
pnpm build
```

`pnpm monitoring:readiness-qa` 驗證：

- `release-readiness` API 需要 platform session；一般 member session 回 403。
- Platform readiness response 包含 `monitoring` control。
- Live runtime 的 monitoring gate 為 `blocked` 或 `pass`，且不回傳 DSN。
- Source/env contract 仍以 `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN` 判斷。
- Dry-run 模擬證明無 DSN 為 blocked，server/public DSN 任一存在為 pass。
- 本 runbook 含 env contract、operator checklist、PII/cookie/prompt 禁止規則。

---

## 6. Acceptance Criteria

- [ ] `release-readiness` API 的 `monitoring` control 存在。
- [ ] 無 DSN 時，`monitoring` 在 release readiness 中維持 `blocked`。
- [ ] 設定 `SENTRY_DSN` 或 `NEXT_PUBLIC_SENTRY_DSN` 後，gate 可轉為 `pass`。
- [ ] QA output 不輸出 DSN、cookie、token、private payload。
- [ ] Operator 已附上不含 secret 的 staging sample ingestion proof。
- [ ] Alert route、incident owner、rollback contact 已確認。

---

## 7. Current Private Beta Decision

截至 2026-06-19，本 repo 已完成 monitoring readiness gate、env contract、operator checklist 與可重跑 QA。若部署環境未設定 `SENTRY_DSN` 或 `NEXT_PUBLIC_SENTRY_DSN`，release readiness 會繼續把 monitoring 標為 blocker。

這表示 `LCH-009` 的「建立 Sentry 或等價錯誤監控方案；若暫不接，寫入 release blocker」已可驗收；但 public production 前仍需要 operator 完成實際 provider 專案、DSN、alert 與 sample ingestion proof。
