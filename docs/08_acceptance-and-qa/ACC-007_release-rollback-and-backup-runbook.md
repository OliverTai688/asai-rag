# ACC-007 誠問 AI Release Rollback And Backup Runbook

狀態：Private beta readiness draft  
建立日期：2026-06-19  
適用範圍：`LCH-009` production controls / DB backup / migration rollback / release recovery  
禁止事項：本文件不授權 production DB mutation、清表、drop/reset、刪除遠端資料或停用 Supabase public-read。

---

## 1. 目的

此 runbook 定義 private beta 前最小可驗收的備份、回復與 migration rollback 流程。目標不是宣稱 production 完成，而是讓 operator 在 staging/private beta release 前能回答三件事：

1. 發版前是否有可識別的 DB backup。
2. schema / seed / migration 若失敗，是否有明確回復路徑。
3. 若 release 後 API/UI 發生 blocker，是否能快速停用風險功能並保留 audit evidence。

---

## 2. 發版前備份檢查

每次 release candidate 進入 private beta 前，operator 需完成下列檢查並把結果附到 release report：

- [ ] 確認 DB target：local / development / staging / production。
- [ ] 確認 `DATABASE_URL` / `DIRECT_URL` 指向環境；不得把 secret 寫入 report。
- [ ] 匯出 schema snapshot：`pnpm prisma:validate` 通過。
- [ ] 若環境支援 Supabase PITR 或 scheduled backup，確認最近一次 backup timestamp。
- [ ] 若需手動 backup，使用 provider-approved 工具建立 dump；dump 不進 repo。
- [ ] 記錄 backup evidence：時間、環境、operator、工具、是否含 private payload。
- [ ] 確認 backup 檔案存取權限只限 operator / DB admin。

最小 evidence 格式：

```text
backup_id: <provider backup id or internal ticket id>
environment: staging
created_at: 2026-06-19T00:00:00+08:00
operator: <name or role, no secrets>
scope: schema + data / schema only
restore_tested: yes/no
notes: <no raw private payload>
```

---

## 3. Migration / db push 前置門檻

任何 schema 變更進入 staging/private beta 前，必須滿足：

- [ ] PR / commit 清楚列出 schema 變更與影響表。
- [ ] `pnpm prisma:validate` 通過。
- [ ] `pnpm prisma:generate` 通過。
- [ ] 若使用 `prisma db push`，先確認環境不是 production。
- [ ] 若 production migration，必須另有 production approval，不得由 agent 自動執行。
- [ ] 需要資料補值時，優先寫 idempotent backfill；不得清空真實資料。
- [ ] high-risk migration 需列 rollback step 與人工 approval。

---

## 4. Rollback 策略

### 4.1 App rollback

適用於 UI/API regression，但 DB schema 仍相容：

1. 停止 release rollout 或回退部署到上一個 commit/tag。
2. 保留 `AuditLog`、request id、console/server log evidence。
3. 若涉及 production email/notification/payment，先確認開關是否維持 disabled。
4. 執行 smoke：`/login`、`/dashboard`、`/crm`、`/super-admin`、`/share/[token]`。
5. 在 release report 標記 rollback commit、原因、恢復時間。

### 4.2 DB rollback

適用於 schema/data migration 造成不可接受資料或服務風險：

1. 立即停止相關 app traffic 或關閉 feature flag。
2. 確認最近 backup / PITR restore point。
3. 導出目前事故狀態的最小 metadata evidence；不得公開 raw private payload。
4. 由 operator / DB admin 在隔離環境測試 restore。
5. 經 production approval 後才可對 production restore。
6. Restore 後重跑 acceptance：
   - `pnpm prisma:validate`
   - `pnpm exec tsc --noEmit --pretty false`
   - `pnpm demo:preflight`
   - 相關 API/browser smoke

---

## 5. Feature Flag Emergency Stops

若 release blocker 涉及外部副作用，優先使用 platform settings 停用：

- `providerPolicy.productionEmailEnabled = false`
- `providerPolicy.productionNotificationsEnabled = false`
- `featureFlags.billingCheckoutEnabled = false`
- `featureFlags.clientPortalEnabled = false`（若 client portal 有資料揭露風險）
- `featureFlags.impersonationEnabled = false`（若 support access 有風險）
- `featureFlags.breakGlassEnabled = false`（若 sensitive access 有風險）

Platform settings 修改需：

- SUPER_ADMIN role。
- reason。
- `riskAccepted: true`。
- `AuditLog(action=SUPPORT_NOTE, sensitivity=HIGH, resourceType=PLATFORM_SETTINGS)`。

---

## 6. Private Beta Release Smoke

Release rollback 前後都需重跑：

```bash
pnpm exec tsc --noEmit --pretty false
pnpm run lint:changed
pnpm prisma:validate
pnpm demo:preflight
pnpm demo:runtime-audit
DEMO_QA_BASE_URL=http://localhost:3000 pnpm demo:release-readiness-qa
```

若本輪有 DB/schema 變更，另需：

```bash
pnpm prisma:generate
pnpm build
```

---

## 7. 仍需人工處理

- Production DB restore / PITR：需要 operator / DB admin。
- Production migration approval：需要 owner 或 designated approver。
- Backup retention policy：需要營運與資安確認。
- Legal/compliance sign-off：此 runbook 只處理工程回復，不取代法務審閱。

