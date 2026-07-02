# Package / Component Strategy — 誠問 AI

> Package-first for standard UI; custom code only for product-specific domain logic. Evaluate before installing.

## Already in the repo (prefer these)
| Concern | Package | Status |
|---|---|---|
| Base components | shadcn/ui (`src/components/ui/`) + Base UI | installed |
| Styling/tokens | Tailwind CSS v4 + ARC-003 token system | installed |
| Icons | `lucide-react` | installed |
| Node canvas | `reactflow` (v11) | installed (relationship graph, theater stage) |
| Forms / validation | `react-hook-form` + `zod` | installed |
| Toasts | `sonner` | installed |
| Theming | `next-themes` | **added in UIX-001** |

## Not yet installed — install only when an iteration needs them
| Concern | Candidate | When to add |
|---|---|---|
| Complex tables (sort/filter/paginate) | `@tanstack/react-table` | when a surface needs real data-grid behavior beyond static lists |
| Purposeful animation | `framer-motion` / Motion Primitives | only when motion clarifies a flow (not decoration) |
| Premium accents | Magic UI / Aceternity patterns | extract patterns, adapt to ARC-003; never paste marketing sections |

## Custom code stays for (do not package-ize)
- SPIN state machine (`SITUATION → PROBLEM → IMPLICATION → NEED_PAYOFF`)
- Theater Route B orchestration, visibility scoping, feedback views
- Relationship graph semantics (fact/inference/unknown, edge derivation)
- AI writeback boundaries (confirmed → CRM candidate; inference → insight; unknown → follow-up)
- BFF DTO/privacy boundaries, `AiUsageLog` policy

## Package Evaluation template (write before any install)
```md
## Package Evaluation
### Package
### Problem It Solves
### Why Existing Code Is Not Enough
### Why This Package Is Suitable
### Integration Risk
### Bundle / Complexity Risk
### Accessibility Consideration
### Decision  (Install / Do not install)
```

## Autonomous install allowed when
Solves a clear standard UI problem · stable & widely used · fits Next 16 / React 19 / Tailwind v4 · no architecture change · does not touch auth/payment/DB/deploy · improves a11y/maintainability/UX · no dependency sprawl.

## Stop and ask when
Paid / unclear license · major migration · changes build tool / routing / auth / DB / payment / deploy · serious dependency conflict · large bundle with unclear value · SSR/hydration issues that aren't trivially fixable.

## Decision log
| Date | Package | Decision | Reason |
|---|---|---|---|
| 2026-06-26 | `next-themes@^0.4.6` | Install | No theme mechanism existed; canonical SSR-safe dark/light for "dark-first". Zero architecture/auth/DB impact. |
