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
  - organization must be active。
  - primary unit must belong to the invited organization。
- Success path：
  - updates invited user name/status。
  - updates membership to `ACTIVE`。
  - sets `acceptedAt`。
  - sets `isDefault=true` only if user has no active memberships。
  - writes `AuditLog(resourceType=ORG_INVITE_ACCEPT)` with email hash/masked email and manual token metadata.
- Response masks raw invited email and directs user to `/login`.
- `/signup` is now beta-safe waitlist/invite-required copy; the primary action remains inert and there is no public `/api/signup` route.

---

## 3. QA Proof

Command:

```bash
pnpm beta:invite-accept-qa http://localhost:3000
```

Result:

- Dev auth header is explicit: the current server returned 401 because `.env` does not enable `ALLOW_DEV_AUTH_HEADER=true`.
- Invalid invite token returns 404.
- Wrong invite email returns 403 `INVITE_EMAIL_MISMATCH`.
- Valid invite token accepts membership with 200.
- Accepted response returns `ACTIVE`.
- Response does not include raw invited email.
- DB membership status becomes `ACTIVE`.
- DB membership has `accepted_at`.
- Accepted member cannot use dev auth header when the env is disabled.
- Replayed invite returns 409 `INVITE_ALREADY_ACCEPTED`.
- Expired invite returns 410 `INVITE_EXPIRED`.
- Archived organization invite returns 409 `INVITE_ORGANIZATION_INACTIVE`.
- Accepted invite writes `AuditLog`; proof count `1`.
- Public signup surface exists for controlled messaging, uses invite/waitlist copy, has inert primary action, and exposes no public signup API.

Evidence IDs from successful run:

- Organization: `demo_org_asai_personal`.
- Accepted membership: `beta_invite_membership_mqkjlbrz_valid`.
- Audit log: `audit_invite_accept_beta_invite_membership_mqkjlbrz_valid`.
- Expired membership: `beta_invite_membership_mqkjlbrz_expired`.
- Archived organization invite: `beta_invite_membership_mqkjlbrz_archived`.

---

## 4. Known Limits

This is not the full ALA-002 completion:

- It does not create a production app session after accept.
- It does not prove browser dashboard access for the accepted member in the current `.env`, because dev auth header is intentionally disabled.
- It does not send real invite email.
- It does not implement Supabase Auth / Magic Link / OAuth / production password flow.
- It changes `/signup` to controlled beta-safe messaging, but does not persist waitlist requests.
- It does not provide Browser QA for `/invite/[token]`; only API/script proof is complete.

Recommended next step:

```text
ALA-002 continuation: choose beta auth provider and implement invite accept -> controlled login/session handoff.
```
