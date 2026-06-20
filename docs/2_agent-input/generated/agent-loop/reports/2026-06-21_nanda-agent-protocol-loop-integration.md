# 2026-06-21 NANDA / AgentFacts Protocol Loop Integration

## Scope

- User goal: every AI in ASAI should align with MIT Project NANDA / AgentFacts protocol design and remain expandable for future registration.
- Loop type: development-loop rule update and research-to-practice bridge.
- Product source changed: none.
- External registry publication: none.
- Provider calls: none.

## Research Basis

Sources checked on 2026-06-21:

- Project NANDA GitHub / project page: NANDA originated at MIT and focuses on the internet of AI agents, index/discovery, protocol-neutral interop, and governance.
- `projnanda/agentfacts-format`: AgentFacts describes AI agents with machine-readable metadata such as capabilities, endpoints, performance/trust credentials, dynamic routing, and multimodal support.
- `projnanda/adapter`: NANDA Adapter positions local agents as persistent, discoverable, interoperable agents with multi-framework support, multi-protocol communication, global index discovery, and SSL support.
- arXiv `Beyond DNS: Unlocking the Internet of AI Agents via the NANDA Index and Verified AgentFacts`: NANDA index resolves to dynamic, cryptographically verifiable AgentFacts, supports schema-validated capability assertions, privacy-preserving discovery, key rotation/revocation, and adaptive resolution.
- arXiv `Using the NANDA Index Architecture in Practice`: enterprise framing includes global discovery, cryptographically verifiable capability attestation, cross-protocol interoperability across MCP / A2A / NLWeb / HTTPS, Zero Trust Agentic Access, and Agent Visibility and Control.
- arXiv `A Survey of AI Agent Registry Solutions`: compares MCP `mcp.json`, A2A Agent Cards, and NANDA AgentFacts as registry metadata models.

## Interpretation For ASAI

We should not treat NANDA alignment as "install a library and done." For this repo, the useful development-loop requirement is:

1. Every AI module has an internal AgentFacts-style manifest.
2. Every manifest is least-disclosure and declares capability, endpoint/action, input/output schema, auth/session scope, data classes, quota/cost, `AiUsageLog` policy, version, and readiness.
3. Every AI module has a registry readiness state:
   - `internal-only`
   - `registry-draft`
   - `external-ready`
   - `external-registered`
4. External NANDA / third-party registry publication requires explicit operator approval.
5. Each AI loop report must include `NANDA alignment` if an AI module is touched.

## Changes

- Updated `AGENTS.md`:
  - Added `NANDA / AgentFacts AI Protocol Loop` under strategic guardrails.
  - Added executable `NANDA / AgentFacts AI Protocol Alignment Batch Tasks` (`NAP-001` to `NAP-005`).
- Updated `lv3-immersive-loop.md`:
  - Added NANDA / AgentFacts protocol alignment requirements.
  - Added report requirement for a `NANDA alignment` section when AI work is touched.
  - Expanded quiet review from five frames to six frames.
- Updated `lv3-whole-product-gap-review-loop.md`:
  - Added NANDA / AgentFacts protocol readiness to evaluation scope.
  - Expanded whole-product review lens to six frames.
- Updated `loop-state.json`:
  - Added user preferences requiring NANDA / AgentFacts alignment.
  - Added `NAP` as a priority workstream.
  - Added `lv3-nanda-agentfacts-protocol-readiness` to candidate queue.

## Next Practical Slice

Recommended next NANDA-specific slice:

```text
Run NAP-001 AI module inventory and NANDA mapping:
Inventory all AI route/module/agent-like workflows; map agent id, owner surface, capability, endpoint/action, input/output DTO, auth/session scope, data class, provider posture, quota, AiUsageLog policy, and registry readiness. Produce an alignment report and do not change runtime behavior.
```

This is intentionally a research-to-practice slice: it turns NANDA research into an executable inventory and prepares NAP-002 internal manifest schema implementation.

## Validation

- `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8'))"`: pass.
- `git diff --check -- AGENTS.md docs/2_agent-input/generated/agent-loop/prompts/lv3-immersive-loop.md docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md docs/2_agent-input/generated/agent-loop/loop-state.json docs/2_agent-input/generated/agent-loop/reports/2026-06-21_nanda-agent-protocol-loop-integration.md`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.

## DB / Prisma

- No DB write.
- No Prisma schema change.
- No external registry call.
- No OpenAI/Anthropic provider call.

## Git

- Stage only this loop's related files.
- Push remains skipped by user instruction unless the user explicitly restores push.
