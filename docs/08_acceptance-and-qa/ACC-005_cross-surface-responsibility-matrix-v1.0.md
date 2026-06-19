# 誠問 AI Cross-surface Responsibility Matrix v1.0

> 建立日期：2026-06-18  
> 更新日期：2026-06-19  
> 關聯計畫：`PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`  
> 關聯驗收：`ACC-004_multi-role-saas-architecture-acceptance-framework-v1.0.md`  
> 狀態：PSA-010 QA baseline complete；production integration 仍受 blockers 限制。

本文件是 PSA-010 的跨介面責任矩陣。它用來確認每個核心功能在 front office / client portal、member admin、org admin、super admin 之間的責任邊界，並標示目前已落地的程式碼契約、仍需實作的 runtime integration，以及 operator 必須補齊的外部條件。

---

## 1. Responsibility Matrix

| 功能面 | Front office / client portal | Member admin | Org admin | Super admin | 資料邊界與目前狀態 |
| --- | --- | --- | --- | --- | --- |
| CRM / Client / Policy | 客戶不進入內部 CRM；未來 client portal 只看授權報告、預約、回覆、補資料。 | 只看 own / assigned clients；必須保留 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。 | 只看 unit/member health、輔導指標與彙總，不看客戶明細、保單明細或對話全文。 | 預設看租戶健康、事件與支援 metadata；敏感內容需 break-glass reason 與 audit。 | `/team` 已移除 client store 熱點與明細依賴；CRM runtime 仍有 mock/store 來源，需 PSA-005 後續轉 DB service。 |
| SPIN | 客戶只能透過報告或授權摘要看到顧問整理內容；不看內部陪談 session。 | 顧問操作自己的 SPIN session；不得破壞 `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF` 狀態機。 | 看完成率、卡關階段、輔導熱點與訓練建議。 | 看 AI usage、錯誤、成本與稽核事件；不預設讀取全文。 | Sidebar/page naming 已對齊 AI 了解客戶；未改 SPIN 狀態機。AiUsageLog 實寫仍需每個 AI route audit。 |
| Theater | 客戶不進入演練；可看顧問輸出的正式報告。 | 顧問使用 AI 劇場演練，保留 typed persona enum。 | 看訓練覆蓋率、常見異議、輔導佇列與 member health。 | 看用量、失敗率、成本與支援事件；敏感 transcript 需 break-glass。 | Theater enum 未改；評分 JSON/API 未改。AiUsageLog 實寫仍需 route 層逐一確認。 |
| Pre-visit | 未來 client portal 可回覆預訪問題、補資料、確認預約。 | 顧問建立與使用訪前準備包。 | 看準備覆蓋率、逾期/風險分布與 coaching queue。 | 看 aggregate usage、錯誤與支援事件。 | UI 已現代化；`/api/ai/visit` 未被 PSA 改動。DB-backed plan 與 client portal 回覆仍待 integration。 |
| Reports | token share 與 client login 都只能看授權報告；合規免責可見。 | 顧問編輯、分享、追蹤報告。 | 看報告完成率、分享成效與 coaching 指標，不看個別客戶內容。 | 看分享事件、錯誤、付款/方案能力；敏感報告需 break-glass。 | `ShareMeta` 已加入 branding / portal / CTA contract；正式 DB-backed share lookup 與 client authorization 仍待接。 |
| Share / Client Portal | 支援 organization/unit branding；client login route 已存在；客戶只進授權 surface。 | 顧問建立 share token 與後續追蹤。 | 通訊處品牌可出現在 share page；看彙總成效。 | 稽核 token/share 事件與支援問題；不得預設繞過客戶授權。 | `/share/[token]` 可視化 contract 完成；client session provider 與 portal DB records 未接。 |
| Billing / Plan | `/pricing` 與購買流程導向綠界，不以 redirect 當唯一成功依據。 | 個人/團隊購買後能力由 `PlanConfig` 啟用；協作者上限不可只靠前端。 | Org owner/admin 管理席次、unit、AI quota、branding、client portal capability。 | Super admin 管理 plan config、付款狀態、交易查詢與異常。 | Provider-neutral schema/domain/UI 已完成；正式 ECPay API route、CheckMacValue、callback URL 與 DB migration 未完成。 |
| Member Settings | 客戶不看內部 member 設定。 | `/settings` 管理個人資料、通知、AI 偏好、個人整合、預設 workspace；個人版 owner 可進入 collaborator 入口但仍受 plan limit。 | Org admin 不讀 member private settings；只可看必要 member metadata 與 aggregate usage。 | 預設不看個人私密設定；support 需 audit 才能協助。 | 現有 `/settings` 可作 member settings surface；需補 DB-backed `member_settings`/profile/preferences API，且不可混入 org-wide policy。 |
| Org Settings / Team / Units | 客戶不看內部 org 設定；client portal 只吃被授權的 branding/client portal config。 | 一般 member 不可改 organization-wide settings；只能讀必要 workspace metadata。 | `/org/settings` 或 `/team/settings` 管理 members、seats、unit scope、branding、client portal、AI quota、coaching queue；manager 只能看/改授權 scope。 | 管理租戶、方案能力、平台事件與 impersonation。 | `PlanConfig`、`OrganizationUnit` schema/domain 已完成；仍需 org settings route/API、server-side invite endpoint、role-scoped settings policy。 |
| AiUsageLog | 客戶不看成本 log。 | 可看自己的用量摘要或額度提醒。 | 看 unit/member aggregate usage 與 coaching/成本指標。 | 看跨租戶成本、錯誤、provider usage 與 audit evidence。 | AGENTS 硬規則要求每次 OpenAI/Anthropic 呼叫寫 `AiUsageLog`；PSA 未新增 AI 呼叫。後續 AI route 改動必須逐 route 驗證。 |

---

## 2. Route Guard And Visibility Audit

| Surface / route | 預期 guard | 目前檢查結果 | 後續風險 |
| --- | --- | --- | --- |
| `/login`、`/signup`、`/invite/[token]` | 一般 app session；member/collaborator/org roles 分流。 | Route skeleton 與 redirect contract 已建立。 | 尚未接正式 auth provider、server-side session、invite token DB 驗證。 |
| `/client-login`、`/share/[token]` | token access 可讀授權報告；client session 只能看 portal scope。 | Share branding、portal scope、login CTA 已可視化。 | client session 與 DB-backed share lookup 未接，仍不能宣稱正式客戶登入完成。 |
| `/settings` | app session + membership；member-scoped settings only。 | 現有 dashboard settings page 可作 member settings 起點。 | 需避免把 org branding、billing、unit、quota、client portal 設定塞進 member settings；需補 DB-backed member settings API。 |
| `/team` | org admin / manager aggregate-only；不得看 member 客戶明細。 | UI 已改成 coaching console，顯示 unit/member health、用量、席次與輔導佇列。 | 真實資料查詢層需使用 unit scope aggregate filter，不能回到 client-level query。 |
| `/org/settings` 或 `/team/settings` | app session + owner/admin；manager scoped read-only / limited write。 | 尚未建立獨立 org settings surface；目前 `/team` 只承擔 org admin 輔導台。 | 需新增 org settings route/API，承接 members、units、branding、quota、client portal、compliance defaults，並與 `/settings` 分離。 |
| `/super-admin/login`、`/super-admin` | platform-only session；與 app session 分離；敏感讀取需 break-glass。 | Super admin login skeleton、platform domain helper、impersonation/audit schema 與 page contract 已建立；`GET /super-admin` 本機被 staging gate 307 保護。 | 正式 platform auth、MFA、cookie guard、AuditLog 寫入 middleware/server action 未接；視覺 QA 需 staging cookie。 |
| `/pricing` / subscription purchase flow | 付款狀態只信任 server notification/query confirmation。 | 付款 UI 已移除 Stripe/card 假表單，改綠界導轉與 server confirmation contract。 | ECPay credentials、CheckMacValue、callback URL/API route、DB transaction persistence 未接。 |

Empty / loading / error state 現況：PSA-006、PSA-007、PSA-009 主要交付為 deterministic UI/skeleton contract，已有空資料和狀態型文案；正式 DB-backed loading/error flow 仍要在 runtime data migration 與 auth provider 接上後逐頁補驗收。

---

## 3. Consistency Checklist

| 項目 | 文件契約 | 程式碼契約 | 目前 QA 判定 |
| --- | --- | --- | --- |
| Personal collaborator limit | PRD/ARC/PLN 已列為 super admin `PlanConfig` 控制。 | `PlanConfig` schema/domain helper 已建立；subscription form 預設能力對齊。 | 部分完成。缺 server-side invite endpoint 與 DB 套用驗證。 |
| Member settings vs org settings | `RES-013` 要求 `/settings` 與 `/org/settings` 分離。 | `/settings` 已存在；org settings route/API 尚未建立。 | 待實作。需確認 member settings 不可改 org-wide policy，org settings 不可讀 member private preferences。 |
| Unit scope | Enterprise 支援 headquarters / region / branch。 | `OrganizationUnit` schema 與 `unit-scope.ts` helper 已建立；`/team` UI 用 aggregate-only framing。 | 部分完成。DB schema 未同步；真實 query 需接 aggregate filter。 |
| Demo account DB seed | RES-009/PSA-005 要求 mock 只作 seed material。 | `scripts/seed-demo.mjs`、`demo:preflight`、mock API production guard 已建立。 | 未完成。Supabase DNS/schema engine 阻擋實跑；runtime mock removal 尚未完成。 |
| Runtime mockdata removal | AGENTS 明確要求 runtime UI/service 不再 import mocks 作業務資料。 | 已有盤點與部分 client compliance baseline 修復。 | 未完成。仍需逐 domain 替換 store/service 讀取路徑。 |
| Share branding | 通訊處可自訂品牌出現在 share page。 | `ShareMeta.branding` / `portal` / `ctaConfig` 與分享頁 UI 已完成。 | 部分完成。正式 branding DB source 與 client authorization 未接。 |
| Client portal | 未來支援 client login，且只看授權資料。 | `/client-login` route 與 share portal scope 已建立。 | 骨架完成。缺 auth provider、client session、DB-backed portal records。 |
| Impersonation audit | Super admin 需要 high-strength audit log。 | `PlatformUser`、`ImpersonationSession`、`AuditLog` schema/domain/page contract 已建立。 | 部分完成。缺 DB migration、platform auth、AuditLog 實際寫入路徑。 |
| ECPay billing | 付款採綠界且不得只信任 redirect。 | Provider-neutral billing schema/domain/UI contract 已建立。 | 部分完成。缺 credentials、callback/API route、DB persistence/migration。 |
| AiUsageLog | 每次 OpenAI/Anthropic 呼叫必須記錄成本。 | PSA 未新增 AI provider call；AGENTS 保留硬規則。 | 待後續 AI route audit。任何 AI route 改動前需先查既有寫法。 |

---

## 4. Verification Evidence

2026-06-18 已有驗收紀錄：

- `pnpm prisma:validate`：通過。
- `pnpm prisma:generate`：通過。
- `pnpm exec tsc --noEmit --pretty false`：通過。
- `pnpm lint:changed`：PSA-006、PSA-007、PSA-008、PSA-009、PSA-010 已通過。
- `/team` desktop/mobile screenshot：已保存於 `docs/06_audits-and-reports/screenshots/modern-ui/`。
- `/share/[token]` desktop/mobile screenshot：已保存於 `docs/06_audits-and-reports/screenshots/modern-ui/`。
- `/super-admin` smoke：`GET /super-admin` 回 307 到 `/staging-access?callbackUrl=%2Fsuper-admin`，需 staging access 才能視覺驗收。

Known failed / blocked evidence：

- `pnpm demo:preflight`：Supabase host `db.wwocdcicvpmbdmqvskzi.supabase.co` DNS `ENOTFOUND`；Supabase public env 仍為 placeholder。
- `pnpm prisma db push --accept-data-loss`：連到 `db.wwocdcicvpmbdmqvskzi.supabase.co:5432` 後回 schema engine error；billing/platform/audit 最新 schema 尚未套到 DB。
- PSA-005 的「清空 browser storage 後 demo account 重新登入仍看到完整範例資料」尚未驗收。

---

## 5. Required Manual Work Before Production Claim

1. 補正 Supabase / database env：`DIRECT_URL`、`DATABASE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、必要時 `SUPABASE_SERVICE_ROLE_KEY`。
2. 決定正式 migration 策略：Prisma migration 或受控 `db push`；套用 PSA-003/004/005/008/009 schema。
3. 實跑 `pnpm demo:preflight`、`pnpm demo:seed:reset`，確認 demo account DB data 可重建。
4. 接正式 auth provider：app session、client session、platform session 分離，包含 `/super-admin` platform-only guard 與 MFA。
5. 接正式 ECPay credentials 與 callback domain：MerchantID、HashKey、HashIV、ReturnURL、OrderResultURL、ServerReplyURL/ClientBackURL。
6. 完成 runtime mockdata removal：把業務資料讀取切到 DB service，localStorage 僅保留 UI state。
7. 對所有 OpenAI/Anthropic route 做 AiUsageLog audit，確認沒有 provider call 漏記錄。

---

## 6. PSA-010 Conclusion

PSA-010 的責任矩陣與一致性 QA 已完成。此時可以說 multi-role SaaS 的產品/路由/schema/UI contract 已形成一個可續作的骨架，但不可宣稱 production integration complete。最主要未完成項仍是 PSA-005 runtime mockdata removal / demo DB seed 實跑，以及外部 operator 條件：DB 連線、Supabase env、auth provider、ECPay credentials、staging access。
