# ACC-008 誠問 AI ECPay Test Flow Checklist

狀態：Private beta readiness draft  
建立日期：2026-06-19  
適用範圍：`LCH-009` ECPay test flow / billing checkout / callback / query proof  
禁止事項：本文件不授權 production payment、refund、charge、真實通知、真實 email 或 production checkout enablement。

---

## 1. 目的

此 checklist 定義 ECPay 付款流程從「仍關閉」到「可在 staging 測試」的最小驗收。正式收費必須等所有 test flow proof、法務/營運核可與 production approval 完成後才可開啟。

---

## 2. 預設安全狀態

Private beta 前，系統必須維持：

- [ ] `featureFlags.billingCheckoutEnabled = false`
- [ ] `providerPolicy.paymentProviderMode = "disabled"` 或 staging/test-only 等價模式
- [ ] production email disabled
- [ ] production notification disabled
- [ ] checkout UI 顯示「聯絡管理員 / 尚未啟用正式付款」
- [ ] 所有 billing/platform settings mutation 寫入 `AuditLog`

Readiness gate 應將正式 checkout 視為 disabled，直到本 checklist 完成。

---

## 3. ECPay Test Credentials 與環境

Operator 需確認：

- [ ] Test MerchantID 已建立。
- [ ] Test HashKey / HashIV 已設定於環境變數或 secret manager；不得寫入 repo/report。
- [ ] ReturnURL / OrderResultURL / ClientBackURL 指向 staging domain。
- [ ] Callback domain 可由 ECPay test environment 打到。
- [ ] Timezone 與 order timestamp 一致。
- [ ] Test credentials 與 production credentials 完全分離。

Report 只允許記錄：

```text
provider: ECPay
mode: test
merchant_id_masked: 2000***123
callback_domain: staging.example.com
credentials_source: secret manager / hosting env
```

---

## 4. CheckMacValue 驗證

必須完成：

- [ ] 建立 checkout payload 時產生 CheckMacValue。
- [ ] Callback 收到 payload 時重新計算並比對 CheckMacValue。
- [ ] Query order status 時驗證 provider response signature。
- [ ] CheckMacValue mismatch 回 400/403，不更新訂單狀態。
- [ ] 不把 raw callback payload、HashKey、HashIV 寫入 repo/report。

---

## 5. 訂單狀態與 Audit

Test flow 至少需覆蓋：

- [ ] 建立 pending order。
- [ ] Test card / ATM / WebATM 任一成功付款。
- [ ] Callback 將 order 狀態改為 paid/succeeded。
- [ ] Query API 可對帳同一 order。
- [ ] Failed / canceled / expired case 不會啟用方案。
- [ ] 每次狀態變更寫 `AuditLog`，metadata 只保留 masked provider id、status、order id、changed fields。

---

## 6. UI / BFF 驗收

Staging test flow 需驗收：

- [ ] Pricing/Purchase UI 在 checkout disabled 時不會導向真付款。
- [ ] SUPER_ADMIN 或 billing owner 才能切換 checkout test mode。
- [ ] Checkout action 必須通過 BFF，不得由 client 直接拼 ECPay payload。
- [ ] 成功付款後方案/額度更新可在 member/org UI 看到。
- [ ] 失敗付款有 partial-success / failed feedback，不假裝成功。

---

## 7. Production Enablement Gate

Production checkout 只能在以下事項完成後開啟：

- [ ] Test flow proof 附截圖/API evidence。
- [ ] Callback/query proof 附 order id masked evidence。
- [ ] Legal/terms/payment notice 已審閱。
- [ ] Refund/void 流程與客服責任已定義。
- [ ] Monitoring/alerting 已啟用。
- [ ] Backup/rollback runbook 已完成。
- [ ] Owner 或 designated approver 明確核可 production payment。

---

## 8. 目前 blocker

- ECPay production credentials 尚未提供。
- Callback domain 與 HTTPS hosting 尚未完成。
- CheckMacValue implementation / callback / query API 尚未落地。
- Refund / void / customer support process 尚未定義。
- Production payment approval 尚未取得。

