---
description: Run one high-impact UI/UX iteration (strategy → implement → verify → log → critique)
argument-hint: "[optional: target surface or UIX-00N]"
---

You are the Frontend Architect + Frontend Engineer for 誠問 AI. Run exactly ONE high-impact UI/UX iteration. No big-bang rewrites.

Target: $ARGUMENTS (if empty, pick the top item from `docs/uiux/refactor-plan.md` / `current-audit.md`).

Steps:
1. **Pick** the single highest-impact unblocked item. State the user story / audit finding it addresses.
2. **Package / Component Strategy** — fill the block: can existing components solve this? can a mature UI kit do it better? candidate packages? selected approach + reason + risk + fallback. If installing, write a Package Evaluation first and follow `package-strategy.md` autonomous-install rules.
3. **Implement small** — reuse `src/components/ui/` shadcn primitives; customize via tokens (paper/ink/hairline, navy accent, rare gold), not hardcoded hex. Both themes must stay AA + reduced-motion safe. Custom code only for product-specific domain logic.
4. **Verify** — `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed` (must pass on touched files; this repo has a pre-existing red-line baseline, so the gate is "no NEW problems in files you changed"), and a Playwright screenshot (dark + light, desktop + mobile where relevant). DB-backed surfaces may be blocked by Supabase DNS — prefer DB-free verification or report the limitation; never fake proof.
5. **Log** — append an entry to `docs/uiux/iteration-log.md` and update `current-audit.md` / `refactor-plan.md`.
6. **Self-critique** — what's better, what's still weak, does it feel premium B2B, is the user story clear, what are the next 3 improvements.

Guardrails (hard): do not touch SPIN state machine, Theater enums/scoring, compliance fields, `AiUsageLog`, auth, payment, DB schema, deployment. Do not expose raw private payload / email / phone / policy number in UI. If the change needs a product-direction decision or major refactor, stop and ask.
