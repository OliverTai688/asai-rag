# 誠問 AI Level 3 Public Launch Gap Research v1.0

> 建立日期：2026-06-19  
> 狀態：研究定稿，供制定 `PLN-018` / `ARC-007` / `ACC-007` 使用  
> 問題：若直接以 Level 3 正式公開上線為目標，還有哪些開發缺口？從不同評估視角檢驗後，下一份計畫應如何制定？

---

## 1. 結論

若 Level 3 定義為「公開註冊、正式收費、可讓顧問/通訊處處理真實客戶資料、client portal 可給客戶登入、super admin 可營運平台」，目前距離 Level 3 **仍然很遠**。不是因為 UI 不夠，而是因為 Level 3 需要一整組可稽核的 production controls：

- 正式 auth/session/tenant isolation。
- DB-backed business runtime。
- 三個 AI 的 `AiUsageLog`、quota、prompt/tool guardrail、資料保存與刪除政策。
- Client portal、share token、客戶資料權利、同意與告知。
- Org admin aggregate-only 與 super admin break-glass audit。
- ECPay production-grade callback/query/idempotency/ledger。
- Security baseline、privacy/data governance、monitoring、backup/restore、incident response。
- 法務文件、AI 免責、保險招攬/網路服務邊界、內控與稽核 evidence。

因此下一份計畫不應只是把 `LCH-009` 加長。建議新增一條獨立的 **Level 3 Public Launch Hardening** workstream：

```text
LCH-001..009 先完成 Level 1/2 runtime foundation
  -> ARC-007 security/privacy/compliance architecture
  -> ACC-007 Level 3 release gates and evidence framework
  -> PLN-018 Level 3 public launch batch tasks
```

---

## 2. Level 3 定義與前提

本文件把 Level 3 定義為：

| 面向 | Level 3 最低定義 |
| --- | --- |
| 使用者 | 外部顧問、通訊處/企業、客戶、平台營運者都能使用正式帳號。 |
| 資料 | 允許真實客戶資料、保單資訊、訪談素材、AI output、分享事件進入 production DB。 |
| 金流 | 可正式收費；付款狀態由 server notification/query 確認，不信任前端 redirect。 |
| AI | 至少三個 AI 模組可穩定使用，成本可控、可稽核、可停用、可追蹤錯誤。 |
| 權限 | member/admin/client/platform session 分離；org manager 不看客戶明細；super admin 查敏感內容需 reason + audit。 |
| 合規 | 有隱私、服務條款、AI 免責、資料權利流程、事故通報/處理流程。 |
| 營運 | 有 monitoring、backup/restore、incident response、release rollback、support playbook。 |

關鍵假設：

- 誠問 AI 若只作「保險顧問 SaaS 工具」，合規重點是個資、資安、AI 免責、資料處理與招攬輔助邊界。
- 若產品開始支援「網路投保業務」或「網路保險服務」，則會進入更高監理要求。金管會法規將網路投保/網路保險服務定義為客戶完成註冊與身分驗證後，透過網路與保經代/保險公司辦理投保或保險服務；該情境需要更強的身分驗證、內控、資安與個資管理。
- 因此 Level 3 計畫必須先有 **Launch Scope Lock**：公開上線第一版是否只是 advisor SaaS，還是包含網路保險服務。若後者成立，需額外法遵審查，不應只靠工程計畫推進。

---

## 3. 外部基準與官方依據

本研究參考下列官方或業界基準：

- 台灣《個人資料保護法》：作為個資蒐集、處理、利用、當事人權利、損害賠償與主管機關處分的基本法律框架。  
  來源：[個人資料保護法 - 全國法規資料庫](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021)
- 金管會指定非公務機關個人資料檔案安全維護辦法：明確要求個資風險評估、事故應變、重大事故通報、資料安全管理、電子商務資安措施、存取權限控管與稽核。  
  來源：[金融監督管理委員會指定非公務機關個人資料檔案安全維護辦法](https://law.fsc.gov.tw/LawContent.aspx?id=GL000933)
- 金管會保經代網路投保/網路保險服務管理辦法：若誠問 AI 進入網路投保或網路保險服務情境，需注意註冊、身分驗證、資安/個資管理與內控等要求；2025-09-25 修正條文部分於 2027-01-01 施行。  
  來源：[保險代理人公司保險經紀人公司辦理網路投保業務及網路保險服務管理辦法](https://law.fsc.gov.tw/LawContent.aspx?id=GL002548)
- 金管會保經代內控/招攬制度辦法：提供內控、稽核、招攬處理、風險評估、控制作業、監督改善等治理基準。  
  來源：[保險代理人公司保險經紀人公司內部控制稽核制度及招攬處理制度實施辦法](https://law.fsc.gov.tw/LawContent.aspx?id=GL000344)
- 綠界 CheckMacValue 文件：Level 3 金流不可只完成 redirect，必須驗證 CheckMacValue、處理通知冪等與交易查詢確認。  
  來源：[ECPay Developers - 檢查碼機制](https://developers.ecpay.com.tw/29998/)
- OWASP ASVS：作為 Web application security verification 的工程基準。  
  來源：[OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)

---

## 4. 多視角缺口評估

### 4.1 產品與商業視角

| 評估問題 | 目前狀態 | Level 3 缺口 |
| --- | --- | --- |
| 是否可公開註冊？ | `/signup` skeleton 存在。 | 缺正式 auth、email verification、org creation transaction、plan capability、abuse prevention。 |
| 是否可正式收費？ | ECPay schema/domain/UI contract 已有。 | 缺 ECPay API routes、CheckMacValue、ReturnURL/OrderResultURL/ServerReplyURL、query reconcile、idempotency、manual review。 |
| 是否可承接真實客戶資料？ | Prisma model 有多租戶與合規欄位。 | 缺正式資料權限、consent、資料權利流程、資料保留/刪除、備份加密、事故應變。 |
| 是否可提供 client portal？ | `/client-login` 與 share UI skeleton 存在。 | 缺 client session、token authorization、client-scoped APIs、客戶補資料/回覆/預約最小流程。 |
| 是否可支援企業多層級？ | `OrganizationUnit` schema/helper 已有。 | 缺 unit-scoped query enforcement、org settings、invite/seat/unit limits server-side enforcement。 |

判斷：產品輪廓清楚，但 commercial launch 的交易、合約、收費、支援與風險承諾尚未閉環。

### 4.2 工程架構視角

目前 API route 仍主要是：

- AI routes。
- mock routes。
- notification route。
- RAG route。

尚缺 Level 3 必要 runtime APIs：

- `/api/workspace/bootstrap`
- `/api/clients`
- `/api/clients/[id]`
- `/api/member/settings`
- `/api/org/*`
- `/api/share/[token]`
- `/api/client-portal/*`
- `/api/platform/*`
- `/api/billing/ecpay/*`
- `/api/audit/*` 或 platform audit route

Level 3 不能由前端 store 作資料真相源。Zustand 可以保留 UI state/cache，但 business write/read 需要 server API、server action 或 route handler 作權限與資料一致性邊界。

### 4.3 Auth / IAM / 權限視角

Level 3 必須完成四種 session：

| Session | 入口 | 必備控制 |
| --- | --- | --- |
| App session | `/login`、`/signup`、`/invite/[token]` | Supabase Auth、email verification、workspace membership、role guard、session refresh、logout。 |
| Client session | `/client-login` | 客戶身分驗證、授權範圍、share/report/client response scope。 |
| Platform session | `/super-admin/login` | platform-only guard、MFA、IP/device risk、role-specific permissions。 |
| Impersonated session | super admin action | reason、scope、expiry、actor/target binding、visible banner、audit for every read/write。 |

缺口：

- `.env.example` 仍顯示 Supabase public env placeholder。
- 尚未看到 middleware/session helpers 實作。
- 未建立 route guard matrix 的自動化測試。
- Super admin MFA 與 break-glass 尚未接入真實 session。

### 4.4 Tenant Isolation / Data Boundary 視角

Level 3 的核心風險不是「資料寫不進 DB」，而是「資料寫進 DB 後被錯的人看到」。

必須驗證：

- 不信任前端傳入 `organizationId`、`userId`、`unitId`。
- 所有 detail API 由 server session 推導 member/org/unit scope。
- Org manager 只使用 aggregate endpoint，不重用 member detail endpoint。
- Client portal 只讀 authorized reports/responses，不可進 member/org/admin。
- Super admin 預設只看 metadata/aggregate，敏感內容必須 break-glass。
- 若採 Supabase direct client，需要 RLS；若採 server-only Prisma，需明確禁止瀏覽器直接查表，並用 policy helpers + tests 取代 RLS。

建議 Level 3 架構先做一份 `ARC-007` 決策：

```text
Option A: Server-only Prisma + Supabase Auth JWT validation
Option B: Supabase RLS + typed RPC / Data API
Option C: Hybrid, business tables server-only, low-risk public tables RLS
```

對目前 repo 來說，短期較保守的是 Option A 或 C；但需寫出不能由 client 直接存取 business tables 的規則。

### 4.5 個資 / 法遵 / 保險場景視角

誠問 AI 的資料類型會包含：

- 姓名、電話、email、生日、職業、公司、收入。
- 家庭成員、關係、保單、保費、保障額。
- 訪談逐字、Issue/PQ、人格推論、AI 建議。
- 分享事件、客戶回覆、預約意向。

Level 3 必須補：

- 個資蒐集告知與 consent versioning。
- 客戶資料權利流程：查詢、閱覽、複製、更正、停止處理/利用、刪除。
- 行銷拒絕與用途限制。
- 個資事故 response：判斷、控制、通知、通報、矯正預防、事後檢討。
- 資料保留/刪除/匿名化策略。
- 高敏感資料輸入 AI 前的 reason + risk consent。
- AI output 的 fact / inference / unknown 標記與不可替代專業判斷的聲明。
- Vendor/data processor register：OpenAI、Supabase、ECPay、hosting、monitoring。

若公開版本包含網路投保或網路保險服務，還必須先確認公司/合作方資格、身分驗證流程、PIMS/ISO27001/DDoS 防護與保經代內控要求，不應只以一般 SaaS 條款上線。

### 4.6 Security / OWASP ASVS 視角

Level 3 至少應以 OWASP ASVS Level 2 作為 SaaS production gate；super admin、billing、client portal、impersonation 相關路徑應接近更高強度。

缺口分組：

- Authentication：MFA、session rotation、cookie flags、password reset、email verification。
- Authorization：tenant isolation、role/scope tests、negative tests、super admin break-glass。
- Input/output：schema validation、XSS/CSRF/SSRF/command injection prevention。
- Secrets：OpenAI/ECPay/Supabase keys 不可進 client bundle；rotation playbook。
- Dependency：dependency audit、license check、supply-chain review。
- Logging：security logs、audit logs、log redaction、PII-safe error reporting。
- Abuse：rate limiting、bot/signup abuse、AI cost abuse、share token brute force。
- Headers：CSP、HSTS、frame-ancestors、referrer policy、secure cookies。
- File/data import：若未來有 RAG upload，需 malware/size/type/content controls。

### 4.7 AI Governance 視角

Level 3 不只是「AI 會回」。需要：

- AI gateway：統一 provider call，所有 OpenAI/Anthropic 呼叫都經同一層記錄 usage/error/latency/model/requestId。
- Per-org/per-user/per-module quota：超限 429，UI 可理解。
- Prompt/tool allowlist：assistant tool commands 不能任意跳頁或觸發危險操作。
- Prompt injection / data exfiltration tests。
- Sensitive data policy：哪些欄位可送 AI、哪些要遮罩、何時需要 reason/risk consent。
- Output governance：fact/inference/unknown、AI disclaimer、不可視為保險商品建議或法律/財務建議。
- Model fallback / degradation：OpenAI outage 時 graceful fail。
- Cost controls：daily/monthly spend cap、anomaly alert、kill switch。
- Retention：AI input/output retention 與刪除策略。

目前只有 Interview route 明確接 `writeAiUsageLogSafely`；多數 AI routes 仍需補。

### 4.8 Billing / ECPay 視角

Level 3 billing 必須採 server-trusted flow：

```text
Create order
  -> redirect to ECPay
  -> receive server notification
  -> verify CheckMacValue
  -> idempotently write transaction
  -> query ECPay for confirmation when needed
  -> activate plan only after trusted confirmation
  -> audit billing state change
```

缺口：

- MerchantID / HashKey / HashIV / callback domain。
- CheckMacValue implementation + tests。
- Notification route。
- Query/reconcile route。
- Idempotency key / duplicate notification handling。
- PaymentTransaction raw payload redaction。
- Manual activation audit。
- Refund/cancel/failed/expired handling。
- Billing support view for super admin/finance role。

### 4.9 Reliability / SRE / Operations 視角

Level 3 需要從「能跑」進入「出事知道、能修、能回復」：

- Error monitoring：Sentry 或同級工具。
- Structured logging：requestId、orgId hash、route、status、latency，不洩漏 PII。
- Uptime monitoring：front office、login、API health、DB connectivity、ECPay callback。
- AI provider monitoring：latency、429、5xx、cost spike。
- DB backup：備份策略、restore drill、RPO/RTO。
- Migration：staging migration rehearsal、rollback note、data backfill scripts。
- Incident response：severity、owner、communication template、customer notification。
- Status / support：外部狀態或最小公告機制。

目前 `LCH-009` 有列出 monitoring/backup/rollback，但太粗，Level 3 需要獨立 hardening plan。

### 4.10 QA / Release Governance 視角

Level 3 release gate 必須有 evidence，不只是口頭通過。

建議 release candidate 必附：

- `pnpm lint:changed`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm prisma:validate`
- `pnpm demo:preflight`
- `pnpm demo:runtime-audit`
- migration rehearsal output
- e2e smoke screenshots
- API authorization negative tests
- AiUsageLog success/error count evidence
- ECPay test transaction evidence
- backup restore drill evidence
- security checklist / dependency audit
- legal docs approval
- known risk waiver

目前尚未有 `ACC-007` 這種 Level 3 release evidence template。

### 4.11 Support / Admin / Audit 視角

Level 3 不可讓 super admin 成為無痕後門。

缺口：

- Platform auth + MFA。
- Support role 與 finance role separation。
- Impersonation reason/scope/expiry UI。
- Break-glass reason + approval/dual-control policy。
- AuditLog 實際寫入 middleware/server action。
- Audit retention / export。
- Customer support ticket linkage。
- Sensitive read review dashboard。

### 4.12 Legal / Content / Trust 視角

Public launch 前至少需要：

- `/privacy`
- `/terms`
- `/ai-disclaimer`
- `/security`
- subprocessors / vendor list
- contact / data rights request channel
- insurance compliance wording review
- marketing claims review
- pricing and refund/cancellation policy

目前 public site 有 landing/pricing/share，但 legal trust layer 不足。

---

## 5. Level 3 Gap Severity Matrix

| 缺口 | 嚴重度 | 是否阻擋 Level 3 | 原因 |
| --- | --- | --- | --- |
| Auth/session/route guard | P0 | 是 | 未登入或越權直接造成資料外洩。 |
| Tenant isolation tests | P0 | 是 | B2B SaaS 最大風險是跨租戶讀寫。 |
| DB-backed CRUD | P0 | 是 | 無正式資料 runtime 不能處理真實客戶資料。 |
| AiUsageLog + quota | P0 | 是 | 成本不可控且違反 repo hard rule。 |
| Client portal authorization | P0 | 是 | 客戶入口若越權會直接造成個資事故。 |
| ECPay trusted confirmation | P0 | 是 | 只信任 redirect 會造成錯誤開通或金流風險。 |
| Privacy/data rights/retention | P0 | 是 | 真實個資上線必備。 |
| Monitoring/backup/incident | P0 | 是 | 出事無法偵測與復原。 |
| Super admin MFA/audit | P1 | 是，若開 super admin | 平台後台可接觸跨租戶 metadata/敏感支援流程。 |
| Security hardening / ASVS | P1 | 是 | Public attack surface 必須先驗證。 |
| Legal docs / AI disclaimer | P1 | 是 | 保險/AI 場景不可缺少使用邊界。 |
| ISO27001/PIMS readiness | P1/P2 | 視 launch scope | 若做網路投保/網路保險服務，要求會升級。 |
| Performance/load testing | P2 | 通常是 | AI latency、DB query、share page、login 必須有基本壓測。 |

---

## 6. 對既有 `LCH` 的推論

`LCH-001` 到 `LCH-009` 仍然必要，但它們不足以單獨構成 Level 3。

建議關係：

| 既有卡 | Level 3 中的角色 |
| --- | --- |
| `LCH-001` | Level 3 P0 prerequisite：沒有它，所有正式資料都不能上線。 |
| `LCH-002` | Member admin 的 production runtime 起點。 |
| `LCH-003` | Settings 分層與個人/組織政策隔離起點。 |
| `LCH-004` | 三 AI minimum；Level 3 還要補 AI governance / red-team / retention。 |
| `LCH-005` | Demo relogin QA；Level 3 還要補真實 org onboarding 與 production seed separation。 |
| `LCH-006` | Front office/client portal 起點；Level 3 還要補 client identity、data rights、token abuse protection。 |
| `LCH-007` | Org aggregate 起點；Level 3 還要補 unit-scope negative tests。 |
| `LCH-008` | Super admin audit 起點；Level 3 還要補 MFA、support policy、audit review。 |
| `LCH-009` | Release controls 起點；Level 3 需拆成多張 hardening cards。 |

---

## 7. 下一份計畫應如何制定

### 7.1 建議新增文件

1. `ARC-007_security-privacy-compliance-architecture-v1.0.md`
   - 定義 auth/IAM、tenant isolation、RLS/server-only strategy、sensitive data policy、AI gateway、billing trust boundary、audit model。

2. `ACC-007_level-3-public-launch-acceptance-framework-v1.0.md`
   - 定義 Level 3 release gates、evidence template、Go/No-go checklist、risk waiver 格式。

3. `PLN-018_level-3-public-launch-hardening-batch-tasks-v1.0.md`
   - 把 Level 3 拆成可逐張執行的 batch tasks，而不是塞進 `LCH-009`。

### 7.2 建議 `PLN-018` Batch 結構

```text
L3-000 Launch Scope and Regulatory Classification
L3-001 Auth, Session, MFA, and Route Guard Hardening
L3-002 Tenant Isolation and Data Access Policy Tests
L3-003 Production DB-backed Core Workflows
L3-004 AI Gateway, Usage, Quota, Guardrails, and Evaluation
L3-005 Privacy, Consent, Data Rights, Retention, and Incident Process
L3-006 Client Portal and Share Security Hardening
L3-007 Org Admin Aggregate, Org Settings, and Unit Scope Enforcement
L3-008 Super Admin, Break-glass, Impersonation, and Audit Operations
L3-009 ECPay Production Billing, Ledger, Reconcile, and Manual Review
L3-010 Security Baseline, ASVS Evidence, Headers, Secrets, Dependency Audit
L3-011 Observability, Backup/Restore, Migration Rollback, Incident Runbooks
L3-012 Legal Trust Pages, Support Policy, Commercial Terms, Launch Claims Review
L3-013 Full Release Rehearsal and Go/No-go Board
```

### 7.3 建議 Review Nodes

不要做單一超大 PR。建議 review nodes：

1. RN-L3-001：Scope/legal classification + architecture decisions。
2. RN-L3-002：Auth/session/tenant isolation foundation。
3. RN-L3-003：DB-backed core workflows + demo/real data separation。
4. RN-L3-004：AI gateway/quota/guardrails/evaluation。
5. RN-L3-005：Client portal/share/privacy/data rights。
6. RN-L3-006：Org/super admin/audit/MFA。
7. RN-L3-007：ECPay billing/reconcile/ledger。
8. RN-L3-008：Security/observability/backup/incident。
9. RN-L3-009：Legal trust pages + full release rehearsal。

---

## 8. Operator Manual Work

Level 3 需要 operator 補齊或決策：

- Supabase production project/env：URL、anon key、service role、callback URLs、domain。
- Production domain、staging domain、cookie policy、email sender domain。
- OpenAI production project、spend limit、service account/key rotation policy。
- ECPay MerchantID、HashKey、HashIV、ReturnURL、OrderResultURL、ServerReplyURL、ClientBackURL。
- 是否實際提供網路投保/網路保險服務；若是，需要法遵/保經代資格/合作方流程確認。
- Privacy / Terms / AI disclaimer 法務審稿。
- Support email、data rights request mailbox、incident contact。
- Monitoring provider、error alert channels、on-call owner。
- Backup retention policy 與 restore approval。
- Security review / penetration test owner。
- Production launch risk owner 與 Go/No-go 決策人。

---

## 9. 建議最短路徑

若現在直接以 Level 3 為目標，最短但仍安全的路徑是：

```text
Step 1: 完成 LCH-001..009，取得 Level 1/2 runtime foundation
Step 2: 制定 ARC-007，鎖定 auth / tenant / privacy / AI / billing / audit architecture
Step 3: 制定 ACC-007，定義 Level 3 release evidence
Step 4: 執行 PLN-018 L3-000..013
Step 5: 做 staging production rehearsal
Step 6: 外部安全/法務/金流 review
Step 7: Go/No-go board
Step 8: Public launch with monitoring and rollback window
```

不建議跳過 Step 1。Level 3 hardening 必須建立在可運作的 runtime foundation 上，否則會變成「先寫安全文件，但系統本身仍沒有正式資料流」。

---

## 10. Level 3 Go/No-go 摘要

### No-go 條件

- 任一 public/member/org/client/platform route 可未授權進入。
- 任一 tenant data 可跨 organization 讀寫。
- 任一 OpenAI/Anthropic production call 漏寫 `AiUsageLog`。
- AI quota/cost kill switch 不存在。
- ECPay callback 未驗 CheckMacValue 或未做 idempotency。
- Client portal 可看到非授權 client/report。
- Super admin sensitive access 無 reason/audit。
- 無 privacy/terms/AI disclaimer。
- 無 monitoring、backup restore、incident runbook。
- 無 release evidence。

### Go 條件

- 四種 session 與 route guard 完成，且 negative tests 通過。
- 核心資料全 DB-backed，重新登入與跨裝置一致。
- 三個 AI 模組 success/error path 都有 usage/cost/audit evidence。
- Org manager aggregate-only、client portal token/client-scope、super admin break-glass 都有測試。
- ECPay test/prod cutover checklist 完成，正式收費開關可控。
- 個資、AI、保險場景的 public legal/trust pages 完成。
- Security/observability/backup/incident/release evidence 完成。
- Go/No-go owner 簽核。

---

## 11. 最終推論

Level 3 的下一份計畫應以 **hardening and governance** 為中心，而不是 UI 或單一功能開發。`PLN-017` 解的是「產品能不能像真的跑起來」；Level 3 要解的是「產品公開後能不能安全、合規、可收費、可稽核、可復原地營運」。

因此下一步建議不是再問「還缺哪幾頁」，而是建立：

```text
ARC-007: Level 3 安全 / 個資 / 合規 / AI / 金流邊界
ACC-007: Level 3 release gates and evidence
PLN-018: Level 3 public launch hardening batch tasks
```

完成這三份後，`AGENTS.md` 才能新增一條真正以 Level 3 為目標的可執行 workstream。
