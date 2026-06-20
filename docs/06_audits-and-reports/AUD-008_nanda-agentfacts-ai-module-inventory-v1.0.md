# 誠問 AI NANDA / AgentFacts AI Module Inventory v1.0

> 建立日期：2026-06-21  
> 對應 workstream：`NAP-001`  
> 範圍：ASAI 內部 AI module / AI route / agent-like workflow inventory 與 AgentFacts-style readiness mapping。  
> 不做：external NANDA registry publication、public discovery endpoint、credential signing、cross-org agent access、live provider smoke。

---

## 1. Scope

本文件完成 `NAP-001 AI module inventory and NANDA mapping`。它把目前 ASAI 的 AI 能力整理成內部 AgentFacts-style inventory，目的不是宣稱正式 NANDA compatible，而是讓下一張 `NAP-002` 可以建立可驗證的 `AgentProtocolManifest` schema 與 static QA。

本輪只做文件與靜態/source proof：

- 沒有新增或修改 product runtime source。
- 沒有呼叫 OpenAI / Anthropic provider。
- 沒有 DB write、Prisma schema change、Prisma generate 或 db push。
- 沒有外部 registry publication。

---

## 2. Research Basis

本輪核對 primary / project sources：

- [Project NANDA GitHub](https://github.com/projnanda)：NANDA 目標是 agent discovery、capability verification、protocol-neutral interop 與 governance。
- [NANDA Adapter](https://github.com/projnanda/adapter)：adapter 把 local agent 變成 persistent、discoverable、interoperable agent，並提到 multi-framework、multi-protocol、global index 與 SSL support。
- [Beyond DNS: Unlocking the Internet of AI Agents via the NANDA Index and Verified AgentFacts](https://arxiv.org/abs/2507.14263)：NANDA index resolves to dynamic, cryptographically verifiable AgentFacts, with schema-validated capability assertions, key rotation/revocation, and least-disclosure discovery.
- [Using the NANDA Index Architecture in Practice](https://arxiv.org/html/2508.03101v1)：enterprise framing stresses AgentFacts metadata, MCP / A2A / HTTPS interoperability, and Zero Trust Agentic Access.
- [A Survey of AI Agent Registry Solutions](https://arxiv.org/html/2508.03095v1)：compares registry models across security, authentication, scalability, and maintenance.

ASAI interpretation：先做 internal, least-disclosure manifest；對外 registry/signing/public discovery 需要 operator approval。

---

## 3. Static Proof Baseline

`node scripts/ai-usage-route-audit.mjs` on 2026-06-21:

| Field | Result |
| --- | --- |
| overall | `pass` |
| routeCount | `23` |
| providerReadyRouteCount | `13` |
| noProviderRouteCount | `10` |
| routesWithGaps | `[]` |
| discoveryGaps | `0` |
| modules | `CHAT`, `INTERVIEW`, `RAG`, `REPORT`, `SPIN`, `THEATER`, `VISIT` |

This proves route discovery and AiUsage/no-provider posture coverage. NAP-002 later added AgentFacts-style manifest completeness proof through `pnpm ai:protocol-registry-qa`.

---

## 4. Readiness Rubric

| State | Meaning in ASAI |
| --- | --- |
| `internal-only` | Capability is usable or documented inside ASAI but is not externally approved, signed, discoverable, or registered. It may still have an internal manifest and static proof. |
| `registry-draft` | Internal manifest exists and passes static QA, but is not externally published or signed. |
| `external-ready` | Manifest is least-disclosure, schema-valid, versioned, signed/exportable, and operator has approved publication path, but it is not yet registered. |
| `external-registered` | Published to an approved external registry/discovery endpoint with revocation/key rotation and rollback proof. |

Current result：all modules remain `internal-only`. None are `registry-draft`, `external-ready`, or `external-registered`.

---

## 5. Six-frame Gap Review

1. **Advisor workflow and onboarding**  
   AI entrypoints are now operable (`問誠問 AI`, `AI 了解客戶`, previsit, Route B theater), but the advisor cannot inspect a unified capability map that says what each AI can safely do, which data it uses, and which actions are deterministic vs provider-backed.

2. **Source-of-truth and BFF**  
   Most production-relevant AI routes have session/quota/AiUsage evidence via BFF audit. NAP-002 now adds a single internal manifest schema that maps those routes to module identity, capabilities, input/output DTO, auth scope, data classes, and proof commands.

3. **AI reasoning and evidence**  
   Visit/report/SPIN/interview/theater routes expose facts/inferences/unknowns in several DTOs, but this is not declared in a cross-module manifest. External metadata must not reveal raw prompts, raw provider payload, raw transcripts, policy numbers, email/phone, secrets, tokens, or raw audio.

4. **Theater/relationship immersion**  
   Route B has relationship-stage and no-provider interaction proof, but director/character/feedback provider runtime is still guarded-disabled or legacy-provider scoped. The manifest must separate `THEATER.legacy` from `THEATER.route-b` so the product does not imply live multi-character AI is externally available before provider success/error `AiUsageLog` proof.

5. **QA, compliance, and release-proof**  
   Existing proof commands now include `pnpm ai:protocol-registry-qa`, which verifies manifest completeness, forbidden sentinel absence, readiness state consistency, and no external publication.

6. **NANDA / AgentFacts protocol**  
   ASAI now has the internal AgentFacts-style manifest schema. Remaining work is NAP-003 source alignment/adoption per module and NAP-004 platform-only internal registry surface.

---

## 6. Module Inventory

| Agent id | Owner surface | Capability summary | Endpoint / action boundary | Input / output DTO boundary | Auth / session scope | Data classes | Provider posture | Quota / AiUsage policy | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `asai.chat.assistant` | Global assistant / dashboard shell | Advisor assistant chat, allowed tool intents, conversation persistence | `POST /api/ai/chat` | chat messages in, streamed assistant response and persisted conversation/message out | `requireCurrentMember`; organization/member/unit from server session | advisor prompt, assistant reply, tool command metadata | `provider_ready` OpenAI | quota before provider; success/error `AiUsageLog` required | `internal-only` |
| `asai.interview.companion` | `/interview`, interview session workspace | Advisor companion interview, output draft, memory loop, reflection/planning, writeback cards | `/api/ai/interview`, `/outputs`, `/sessions*`, `/writebacks`, `/plans`, `/reflections*` | messages/materials/memory candidates in; draft, reflection, plan, confirmation/writeback DTO out | `requireCurrentMember`; owner-scoped persisted session | confirmed facts, inferences, unknowns, transcript-derived memory, high-sensitive approval metadata | mixed: provider-ready plus deterministic BFF | provider routes write success/error `AiUsageLog`; deterministic BFF proves no-provider | `internal-only` |
| `asai.interview.quick_capture` | `/pre-visit/[planId]/notes` and future notes/meeting surfaces | Post-visit note quick-capture into Park memory and downstream previsit/theater handoff | `POST /api/ai/interview/quick-captures` | note + assignment intent + optional approval in; least-disclosure memory/state proposal summary out | `requireCurrentMember`; client/visit scope derived server-side | quick note, memory candidate, narrator question, state proposal | deterministic no-provider | no `AiUsageLog` required; proof must show count unchanged | `internal-only` |
| `asai.interview.realtime_voice` | `/interview` Chinese voice beta | Realtime session minting, event mirror, transcription/correction path | `/realtime-session`, `/realtime-events`, `/transcribe`, `/transcribe-realtime-session` | consent/event/audio bounds in; ephemeral token/session marker/transcript DTO out | `requireCurrentMember`; quota guard before token mint/provider | transcript, correction memory, no raw audio default | provider-or-dry-run / transcription provider / event mirror | session marker or provider success/error `AiUsageLog`; raw audio not stored by default | `internal-only` |
| `asai.spin.advisor` | `/spin` and SPIN suggestions | SPIN conversation and suggestion generation while preserving state machine | `POST /api/ai/spin`, `POST /api/ai/spin-suggestions` | SPIN messages/client context refs in; streamed response/suggestions out | `requireCurrentMember`; DB client/session scope | SPIN stage, client-safe context, conversation content | `provider_ready` OpenAI | quota before provider; success/error `AiUsageLog` required | `internal-only` |
| `asai.visit.preparation_package` | `/pre-visit` | AI-generated visit preparation package with facts/inferences/unknowns | `POST /api/ai/visit` | clientId / provider-safe snapshot in; preparation package + evidence summary out | `requireCurrentMember`; client read permission server-side | client facts, family/policy summary, recommendations, unknowns | `provider_ready` OpenAI | quota before provider; success/error `AiUsageLog` required | `internal-only` |
| `asai.report.generation` | `/reports`, CRM report flows | AI-generated report draft / JSON DTO for report workflows | `POST /api/ai/report` | report prompt/client/report context in; markdown-compatible or JSON DTO out | `requireCurrentMember`; report/client scope server-side | facts, inferences, unknowns, recommendations, report sections | `provider_ready` OpenAI | quota before provider; success/error `AiUsageLog` required | `internal-only` |
| `asai.theater.legacy` | Legacy theater surfaces and staging gate | Legacy theater character response, scoring, setup/build generation | `/api/ai/theater`, `/api/ai/theater/score`, `/api/ai/theater-build` | persona/history/setup inputs in; legacy response/score/build draft out | `requireCurrentMember`; quota guard | persona, history, setup materials, score/feedback | `provider_ready` OpenAI, but product-gated by Route B policy | quota before provider; success/error `AiUsageLog` required | `internal-only` |
| `asai.theater.route_b` | `/theater/[sessionId]`, Route B persisted stage | Multi-character scene/session persistence, group/private turns, state proposals, guarded runtime preview | `/api/theater/route-b/runtime`, `/sessions`, `/sessions/[id]`, `/turns` | handoff/session/turn/state proposal DTOs; no raw provider payload | `requireCurrentMember`; owner-scoped session | stage characters, relationship evidence, group/private turns, state proposal | deterministic BFF; director/character/feedback provider guarded-disabled / not implemented | no fake usage; provider enablement requires success/error `AiUsageLog` proof | `internal-only` |
| `asai.rag.private_beta` | RAG route / future knowledge search | Private beta guarded-disabled RAG posture | `POST /api/rag` | query in; guarded-disabled response out | `requireCurrentMember`; quota checked | query string only; no high-sensitive default ingestion | `guarded_disabled` | no provider call; no fake `AiUsageLog`; future provider route must log success/error | `internal-only` |
| `asai.meeting.prototype` | AI Meeting / notes emerging prototype | Meeting workspace and notes quick-capture concept, not committed product baseline | uncommitted prototype files under `src/app/(dashboard)/notes/`, `src/app/(dashboard)/pre-visit/[planId]/meeting/`, `src/components/meeting/`, `src/domains/note/` | not accepted as product DTO yet | not accepted as session proof yet | meeting notes/transcript-like material | prototype-only; not in route audit | no provider/usage policy accepted yet | `internal-only` / not registry eligible |

---

## 7. Least-disclosure External Blocklist

No internal or future external manifest may expose:

- raw prompt or system prompt text;
- raw provider payload, provider error body, model API key, secret, token, cookie, OTP, ephemeral Realtime token;
- raw private transcript, raw note text, raw audio, or unredacted memory text;
- policy number, email, phone, payment data, billing key, ECPay hash material;
- organization-internal report body, coaching note, platform break-glass reason text;
- client or member identifiers beyond explicit least-disclosure public handles approved for publication.

External registry/export must also include capability allowlist, redaction proof, signed/versioned metadata, revocation/key rotation plan, and operator approval.

---

## 8. NAP-002 Follow-up Evidence

NAP-002 created `src/domains/ai-protocol/manifest.ts` with these required groups:

1. `identity`: `agentId`, name, owner surface, version, status.
2. `capabilities`: capability ids, action list, human-facing label, module enum.
3. `interfaces`: endpoints/actions, method, launch posture, provider posture, modalities.
4. `schemas`: input DTO refs, output DTO refs, evidence DTO refs.
5. `auth`: required session type, scope derivation, role restrictions.
6. `dataClasses`: public/internal/high-sensitive/private-transcript/raw-audio/payment classifications.
7. `privacy`: retention, redaction, no-raw-payload claims, external blocklist.
8. `quotaCost`: `canUseAiModule` gate, `AiUsageLog` success/error/no-provider policy.
9. `proof`: existing commands, source audit references, known blockers.
10. `registry`: readiness state, external publication approval requirement, signing/discovery status.

Accepted proof command set for NAP-002:

```bash
pnpm ai:bff-audit
pnpm ai:protocol-registry-qa
pnpm exec tsc --noEmit --pretty false
pnpm lint:changed
```

---

## 9. Blockers

- **Source adoption blocker**：NAP-003 per-AI source alignment is not complete for most modules; manifests exist, but source owners do not yet all carry module-local protocol evidence, proof command mapping, and next-slice gates.
- **Adapter/export blocker**：NAP-005 local-only adapter/export dry-run is not complete.
- **Product / safety blocker**：Route B provider runtime and five-view feedback still need success/error `AiUsageLog` proof before external capability claims.
- **Operator / production approval blocker**：external NANDA / third-party registry publication, public discovery endpoint, credential signing, key rotation, and cross-org agent access all require explicit approval.
- **Prototype blocker**：AI Meeting / notes prototype remains outside committed baseline and cannot be represented as registry-ready until selected, committed, and validated.

---

## 10. NAP-001 Acceptance

- [x] AI routes / modules / agent-like workflows inventoried.
- [x] Mapping includes agent id, owner surface, capability, endpoint/action, DTO boundary, auth/session scope, data class, provider posture, quota, `AiUsageLog` policy, and registration readiness.
- [x] Non-exposable raw/private data listed.
- [x] Alignment report produced.
- [x] Validation command baseline identified and run for route audit.

---

## 11. NAP-003 Source Adoption Matrix

Quiet gap-research update on 2026-06-21 after `ITA-003g`.

This section converts the remaining `NAP-003` gap into reviewable implementation slices. It does not claim external NANDA compatibility, does not publish a registry, and does not call a provider. The goal is to make each internal manifest traceable to a concrete source owner, proof command, and least-disclosure boundary.

### Six-frame Gap Review

1. **Advisor workflow and onboarding**：the AI workbench can name many AI abilities, but advisors still need confidence that each action is grounded in a verified source owner and not a loose route label.
2. **Source-of-truth and BFF**：`pnpm ai:bff-audit` proves route-level session/quota/usage posture, while NAP-003 must bind each manifest row to source owner files and product-specific DTO boundaries.
3. **AI reasoning and evidence**：visit/report/SPIN/interview/Route B expose facts, inferences, unknowns, and proof notes differently; NAP-003 should normalize what evidence each module promises without exposing raw prompt, provider body, direct private transcript, contact value, or policy identifier.
4. **Theater/relationship immersion**：Route B is partly source-aligned after `ITA-003g`, but legacy theater and five-view feedback still need clear boundaries so the product does not imply live multi-character provider runtime before approval.
5. **QA, compliance, and release-proof**：each module needs a targeted proof command beyond generic manifest QA when the module has domain-specific safety guarantees.
6. **NANDA / AgentFacts protocol**：all modules remain `internal-only`; NAP-003 prepares internal source adoption only. NAP-005 and operator approval are still required before any adapter/export/public discovery path.

### Candidate Scores

| Rank | Candidate | Score | Why |
| --- | --- | ---: | --- |
| 1 | `NAP-003a provider-ready AI source adoption` for CHAT / VISIT / REPORT / SPIN | 91 | Highest safety leverage for active provider routes: ties success/error `AiUsageLog`, session/quota, facts/inferences/unknowns, and state-machine guarantees to source owners without needing provider calls. |
| 2 | `NAP-003b interview memory + quick-capture source adoption` | 88 | Strong LV3 workflow leverage from AI interview into client/previsit/theater writeback; mostly no-provider/DB-backed proof is already available, but source ownership spans many routes. |
| 3 | `NAP-003c theater + RAG source adoption` | 86 | Theater is product-critical and Route B has new preflight proof, but live provider/five-view feedback remains operator-blocked; RAG remains guarded-disabled. |

### Adoption Matrix

| Agent id | Source owner to align | Current source proof | NAP-003 adoption gap | Smallest next slice | Proof command |
| --- | --- | --- | --- | --- | --- |
| `asai.chat.assistant` | `src/app/api/ai/chat/route.ts`; `src/lib/assistant/assistant-chat-repository.ts`; `src/lib/assistant/assistant-tools.ts` | `ai:bff-audit` sees session/quota/success-error usage evidence. | Manifest does not yet point to tool allowlist source and conversation persistence proof as first-class source evidence. | Add manifest/source notes for assistant tool allowlist, conversation/message persistence, and no raw tool payload export. | `pnpm ai:bff-audit`; `pnpm ai:protocol-registry-qa` |
| `asai.visit.preparation_package` | `src/app/api/ai/visit/route.ts`; `src/domains/visit/ai-evidence-dto.ts`; `src/lib/visits/visit-plan-repository.ts` | `bff:visit-report-ai-qa` proves success/error usage and provider-safe snapshot. | Manifest needs source-owner evidence for provider-safe client snapshot and question rationale DTO. | Align visit manifest with evidence DTO source, saved VisitPlan boundary, and theater handoff constraints. | `pnpm bff:visit-report-ai-qa` |
| `asai.report.generation` | `src/app/api/ai/report/route.ts`; `src/lib/report/report-repository.ts`; `src/lib/report/report-dto.ts` | `bff:visit-report-ai-qa` proves success/error usage and JSON DTO. | Manifest needs explicit split between internal report body and client-safe share DTO. | Add source adoption note for JSON response mode, public share separation, and no raw report body export. | `pnpm bff:visit-report-ai-qa`; `pnpm bff:reports-qa` |
| `asai.spin.advisor` | `src/app/api/ai/spin/route.ts`; `src/app/api/ai/spin-suggestions/route.ts`; `src/lib/spin/spin-session-repository.ts` | `spin:source-truth-qa` and `ai:bff-audit` prove BFF source and provider usage posture. | Manifest needs source-owner evidence for preserving `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF`. | Add state-machine source adoption note and proof refs without changing SPIN runtime. | `pnpm spin:source-truth-qa` |
| `asai.interview.companion` | `src/app/api/ai/interview/route.ts`; `src/app/api/ai/interview/outputs/route.ts`; `src/domains/interview/*`; `src/lib/interview/*` | PIM reports prove Park memory, reflection/planning, writeback, and draft writeback. | Manifest covers broad interview ability but not the source-level map from memory/reflection/writeback to confirmation boundaries. | Split source evidence into provider turns, deterministic session/memory routes, writeback confirmation, and draft handoff. | `pnpm interview:cross-mode-qa`; `pnpm interview:draft-writeback-qa` |
| `asai.interview.quick_capture` | `src/app/api/ai/interview/quick-captures/route.ts`; `src/domains/interview/quick-capture.ts` | `interview:quick-capture-ui-qa` proves UI selector, high-sensitive gate, no raw note echo, unchanged usage. | Mostly aligned, but manifest should name current workspace selector and no-provider proof as accepted source evidence. | Mark quick-capture source adoption complete once manifest proof refs include UI selector/current workspace contract. | `pnpm interview:quick-capture-ui-qa` |
| `asai.interview.realtime_voice` | `src/app/api/ai/interview/realtime-session/route.ts`; `src/app/api/ai/interview/realtime-events/route.ts`; `src/app/api/ai/interview/transcribe/route.ts`; `src/lib/interview/realtime-bff.ts` | Realtime BFF QA proves token/session/event mirror bounds; live WebRTC proof remains blocked. | Manifest needs clearer distinction between dry-run/session-marker, transcription provider, and live WebRTC blocker. | Add source adoption note for no raw audio default, ephemeral secret boundary, event mirror allowlist, and live proof blocker. | `pnpm interview:realtime-bff-qa` |
| `asai.theater.legacy` | `src/app/api/ai/theater/route.ts`; `src/app/api/ai/theater/score/route.ts`; `src/app/api/ai/theater-build/route.ts` | `ai:bff-audit` sees provider-ready guarded legacy routes. | Manifest must explicitly preserve legacy enum/scoring while labeling it guarded, not Route B production runtime. | Add legacy source adoption note and blocked-public-claim wording. | `pnpm ai:bff-audit` |
| `asai.theater.route_b` | `src/app/api/theater/route-b/runtime/route.ts`; `src/app/api/theater/route-b/sessions/**`; `src/domains/theater/route-b-handoff.ts`; `src/domains/theater/route-b-session.ts` | `ITA-003g` aligned runtime preflight; session/interactions/stage map have no-provider proof. | Route B is partially complete; live provider success/error `AiUsageLog`, AI role orchestration, and five-view feedback runtime remain open. | Treat Route B source adoption as partial complete; next code slice should be provider-disabled role orchestration contract or provider-approved success/error proof. | `pnpm theater:route-b-runtime-qa`; `pnpm theater:route-b-interaction-qa` |
| `asai.rag.private_beta` | `src/app/api/rag/route.ts`; `src/domains/rag/services/rag.service.ts` | `rag:launch-posture-qa` proves guarded-disabled posture. | Manifest needs source adoption proof that RAG remains disabled and no client/high-sensitive ingestion is claimed. | Add RAG source adoption note with guarded-disabled no-provider proof and ingestion blocker. | `pnpm rag:launch-posture-qa` |
| `asai.meeting.prototype` | Untracked `src/app/(dashboard)/notes/`, `src/app/(dashboard)/pre-visit/[planId]/meeting/`, `src/components/meeting/`, `src/domains/note/` | No accepted committed proof in this baseline. | Must not be advertised as available or registry-eligible until selected, validated, and committed. | Keep as prototype-only; if selected later, first create AMM owner docs/source proof as its own slice. | none accepted yet |

### NAP-003a Recommended Next Slice

Recommended next implementation/proof slice:

`NAP-003a provider-ready AI source adoption for CHAT / VISIT / REPORT / SPIN`

Acceptance intent:

- Do not call providers.
- Add source-owner adoption evidence to `AgentProtocolManifest` records for CHAT, VISIT, REPORT, and SPIN.
- Preserve all current `internal-only` readiness states and disabled publication gates.
- Prove `pnpm ai:bff-audit`, `pnpm ai:protocol-registry-qa`, and targeted module commands remain green.
- Do not alter SPIN state transitions, provider prompts, or response payloads in this slice unless needed for source evidence.

This is intentionally narrower than "finish all NAP-003" so the next automation loop can remain reviewable and avoid mixing interview/theater/RAG/prototype ownership.
