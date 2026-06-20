# 2026-06-21 LV3 NAP-005 Local Adapter Export Dry-run

## Scope

- 本輪類型：L2 implementation/proof，normal loop（cadence 2 -> 3），非第五輪 whole-product review。
- Selected slice：`NAP-005 local-only adapter/export dry-run`。
- NANDA alignment：新增 local-only protocol-neutral adapter boundary，從 11 個 internal-only manifest 產生 NANDA AgentFacts-style JSON、MCP descriptor、A2A Agent Card、HTTPS metadata 四種 draft；不宣稱正式 NANDA compatible，不做 external registry publication、public discovery endpoint、signing、cross-org access 或 provider call。

## Candidate Score

1. `NAP-005 local-only adapter/export dry-run`：91/100。完成 NAP-003 source adoption 後的下一個最小可驗收步驟，能把 internal manifests 轉成 least-disclosure export contract，且不需要外部 approval。
2. `BFF-204/205 Theater/RAG AI hardening`：85/100。能處理 Theater/RAG provider/launch blocker，但比本輪 adapter acceptance 更大、較不適合先做。
3. `LV3 release/private-beta registry readiness proof pack`：82/100。可聚合 evidence，但若沒有 adapter code 容易變成文件 proof，低於 NAP-005 的 source/proof 價值。

## Changes

- 新增 `src/domains/ai-protocol/adapter-export.ts`：定義 external publication gate、least-disclosure proof、四種 local-only export shape 與 builder。
- 新增 `scripts/ai-protocol-adapter-dry-run-qa.ts` / `.mjs` 與 `pnpm ai:protocol-adapter-dry-run-qa`。
- 更新 `src/domains/ai-protocol/index.ts` 匯出 adapter helper。
- 更新 `AGENTS.md` NAP-005 checklist 與完成註記。
- 更新 `AUD-008_nanda-agentfacts-ai-module-inventory-v1.0.md` 加入 NAP-005 completion evidence。
- 更新 `issue-question.md` 記錄 external publication / signing / public discovery / cross-org access approval 仍需 operator。
- 更新 `loop-state.json`：normal loop counter 2 -> 3；下一輪建議 `BFF-204/205 Theater/RAG AI hardening`。

## Validation

- PASS：`pnpm ai:protocol-adapter-dry-run-qa`
  - 4 個 export target present：NANDA AgentFacts-style JSON、MCP descriptor、A2A Agent Card、HTTPS metadata。
  - 全部 versioned as `2026-06-21.nap-005`、local-only、operator approval required、public discovery disabled、signing not configured、revocation documented、JSON serializable、no private sentinel、no `external-ready` / `external-registered` claim。
- PASS：`pnpm ai:protocol-registry-qa`
  - 11 manifests 仍為 `internal-only`，publication disabled，source adoption proof 保持通過。
- PASS：`pnpm ai:protocol-readiness-qa`
  - Platform registry/readiness projection 仍 least-disclosure；HTTP API proof skipped because `DEMO_QA_BASE_URL` not set。
- PASS：`pnpm exec tsc --noEmit --pretty false`
- PASS：`pnpm lint:changed`

## Evidence

- `src/domains/ai-protocol/adapter-export.ts` 的 shared gate 明確要求 operator approval、signing material custody/rotation、public discovery endpoint owner/rollback、revocation process、privacy redaction review、cross-organization access policy。
- Adapter dry-run QA 明確證明 no provider invocation、no DB write、no external registry publication、no public endpoint publication。

## DB / Prisma

- 未改 Prisma schema。
- 未執行 `prisma validate/generate/db push`。
- 未做 DB read/write。

## Git

- Start status contained pre-existing dirty/untracked files outside this slice, including manual/index docs, previsit/sidebar edits, AMM/notes prototype files.
- 本輪只會 stage NAP-005 相關檔案並建立本地 commit。
- Push skipped by user instruction.

## Blockers

- Operator approval blocker：external registry publication、signing material custody/rotation、public discovery endpoint、revocation process、privacy redaction review、cross-org agent access。
- Provider approval blocker：Route B director/character/feedback live provider usage、live WebRTC proof 仍需明確 approval 與 success/error `AiUsageLog` proof。
- Prototype blocker：AI Meeting prototype remains internal prototype until selected, validated, committed, and source-adopted.

## Next Recommended Loop

`BFF-204/205 Theater/RAG AI hardening`：用 NAP-003c source adoption 與 NAP-005 adapter proof 反推 Theater legacy / Route B / RAG 的 launch/provider blockers，把 guarded-disabled、provider-disabled、least-disclosure 與 readiness UI/API proof 收斂；不得做 external publication 或 unapproved provider calls。
