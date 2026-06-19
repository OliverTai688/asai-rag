# 誠問 AI Level 3 Auth And Real Invite Proof v1.0

> 建立日期：2026-06-19
> 狀態：Level 3 auth foundation implemented; external provider env pending
> 關聯計畫：`docs/05_execution-plans/PLN-022_aggressive-launch-acceleration-batch-tasks-v1.0.md`

---

## 1. Operator Decision

Operator 於 2026-06-19 決策：

- Level 3 上線目標。
- 允許真實客戶資料。
- 需要三種登入方式：帳號密碼註冊/登入、Google OAuth、Email 驗證碼登入。
- 需要寄送真實 invite email。

---

## 2. Implemented

- `User` 新增 `passwordHash`、`emailVerifiedAt`。
- 新增 `AuthEmailCode` 作為 Email 驗證碼登入 proof/attempt/expiry store。
- Auth.js providers：
  - `password` credentials provider。
  - `email-code` credentials provider。
  - `google` provider：只有 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 存在時啟用。
  - 原 demo provider 改為 `demo-credentials`，只在 non-production explicit env 使用。
- 新增 `POST /api/signup`：
  - 建立 user。
  - 以 server-side scrypt hash 儲存密碼。
  - 建立 personal organization / primary branch / owner membership。
  - 寫 `AuditLog(resourceType=PUBLIC_SIGNUP)`。
- 新增 `POST /api/auth/email-code/request`：
  - 產生 6 位數 code。
  - 寫 `auth_email_codes`。
  - 使用 Resend HTTP API 寄出；provider missing 時 fail-closed 503。
- `/login` UI 顯示帳密、Google、Email 驗證碼三種入口。
- `/signup` UI 改為真註冊表單。
- `/invite/[token]` UI 接上 accept API。
- `/api/org/invites` 在 production 或 `ENABLE_REAL_INVITE_EMAIL=true` 時要求真實寄信 provider；未設定 provider 會 503，不建立假成功。
- `.env.example` 新增 Google OAuth、Resend、`ENABLE_REAL_INVITE_EMAIL` contract。

---

## 3. Proof

Commands:

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma db push
pnpm exec tsc --noEmit --pretty false
pnpm lint:changed
```

API proof:

- `GET /api/auth/providers` 回傳 `password` 與 `email-code`。
- `google` provider 未出現，原因是目前 `.env` 尚未提供 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`。
- `POST /api/signup` 使用 `level3.signup.<timestamp>@asai.local` 回 201，建立 user 與 personal workspace。
- `POST /api/auth/email-code/request` 對 active demo user 回 503 `EMAIL_PROVIDER_NOT_CONFIGURED`，符合 fail-closed gate。

DB operation:

- `pnpm prisma db push` 已同步目前 Supabase target。
- 本輪只新增欄位/表與 demo/test signup proof record；未 drop/reset/delete。

---

## 4. Remaining Level 3 Blockers

- 需要設定 `AUTH_SECRET` production value。
- 需要設定 Google OAuth credentials：
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - Google Console callback URL：`<APP_URL>/api/auth/callback/google`
- 需要設定真實 email provider：
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - DNS / domain sender verification。
- 需要設定 `NEXT_PUBLIC_APP_URL` 為正式網域，invite email 才會產生正式連結。
- 需要跑真實 email ingestion proof：Email code sent、invite email sent、accept link works。
- 真實客戶資料 Level 3 仍需完成 legal/compliance packet、monitoring ingestion、backup/restore proof、AI kill switch proof 與 incident runbook。
