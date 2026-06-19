# 誠問 AI Private Beta Invite Accept Proof v1.0

> 建立日期：2026-06-19  
> 狀態：ALA-002 partial implementation proof  
> 關聯計畫：`docs/05_execution-plans/PLN-022_aggressive-launch-acceleration-batch-tasks-v1.0.md`  
> 關聯驗收：`docs/08_acceptance-and-qa/ACC-014_private-beta-release-gates-v1.0.md`

---

## 1. 本輪目標

在不啟用 public signup、不寄 production email、不接正式 auth provider 的前提下，建立 private beta manual invite token 的最小 server path。

---

## 2. 完成內容

- 新增 `POST /api/invite/[token]/accept`。
- Token 暫採 existing `OrganizationMember.id`，作為 manual invite token。
- Endpoint 驗證：
  - token exists。
  - request email must match invited user email。
  - membership status must be `INVITED`。
  - `invitedAt` must exist and be within 14 days。
  - accepted invite cannot be replayed。
- Success path：
  - updates invited user name/status。
  - updates membership to `ACTIVE`。
  - sets `acceptedAt`。
  - sets `isDefault=true` only if user has no active memberships。
  - writes `AuditLog(resourceType=ORG_INVITE_ACCEPT)` with email hash/masked email and manual token metadata.
- Response masks raw invited email and directs user to `/login`.

---

## 3. QA Proof

Command:

```bash
node scripts/beta-invite-accept-qa.mjs http://localhost:3000
```

Result:

- Invalid invite token returns 404.
- Wrong invite email returns 403 `INVITE_EMAIL_MISMATCH`.
- Valid invite token accepts membership with 200.
- Accepted response returns `ACTIVE`.
- Response does not include raw invited email.
- DB membership status becomes `ACTIVE`.
- DB membership has `accepted_at`.
- Replayed invite returns 409 `INVITE_ALREADY_ACCEPTED`.
- Expired invite returns 410 `INVITE_EXPIRED`.
- Accepted invite writes `AuditLog`; proof count `1`.

Evidence IDs from successful run:

- Organization: `demo_org_asai_personal`.
- Accepted membership: `beta_invite_membership_mqkill56_valid`.
- Expired membership: `beta_invite_membership_mqkill56_expired`.

---

## 4. Known Limits

This is not the full ALA-002 completion:

- It does not create a production app session after accept.
- It does not send real invite email.
- It does not implement Supabase Auth / Magic Link / OAuth / production password flow.
- It does not change `/signup` into a fully functional waitlist or invite-required form.
- It does not provide Browser QA for `/invite/[token]`; only API/script proof is complete.

Recommended next step:

```text
ALA-002 continuation: choose beta auth provider and implement invite accept -> controlled login/session handoff.
```

