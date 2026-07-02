# UX Flows — 誠問 AI

> One table per key flow. Map user intent → UI element → system feedback → confusion risk → improvement. Update as surfaces are reworked.

## Flow A — Understand a client (`/interview` → CRM/pre-visit writeback)

| Step | User Intent | UI Element | System Feedback | Possible Confusion | Improvement |
|---|---|---|---|---|---|
| 1 | Start understanding a client | `/interview` mode toggle (text / voice) | Conversation hero, mic consent | Is voice saving audio? | Explicit "transcript only, no raw audio" copy |
| 2 | Answer guided questions | Composer + outline stepper | Segment progress, "why this question" plan | Why am I asked this? | Show micro-plan rationale (done in PIM-002) |
| 3 | See structured material | Right drawer (facts/inferences/unknowns) | Live material with source tags | Inference vs fact? | Keep 3-way tag + color, never merge |
| 4 | Confirm & write back | Confirmation card | created / blocked / skipped result | Did anything reach CRM? | Result panel states each candidate's destination |

## Flow B — Relationship network (`/crm/[clientId]/relationships`)

| Step | User Intent | UI Element | System Feedback | Possible Confusion | Improvement |
|---|---|---|---|---|---|
| 1 | See the household | React Flow canvas | Focus client centered, edges | Who is the main client? | Distinct focus node + legend |
| 2 | Add a person | Node toolbar / dialog | New node persists (BFF) | Did it save? refresh-safe? | Remote-confirmed + persist proof |
| 3 | Edit person attributes | Person editor panel | fact/inference/unknown + source | Is this confirmed? | Required status per field |
| 4 | Navigate to a linked client | Linked-node action | Navigate / disabled if no access | Why can't I open this? | Show permission-gated state |

→ UIX-003 will add canvas toolbar + right inspector + premium dark canvas.

## Flow C — Roleplay setup → stage (`/theater/build` → `/theater/[sessionId]`)

| Step | User Intent | UI Element | System Feedback | Possible Confusion | Improvement |
|---|---|---|---|---|---|
| 1 | Choose build source | 3-mode selector | Outline / client-data / from-interview | Do I need SPIN first? | "No prerequisite" copy (TDF-001) |
| 2 | Build the scene | Conversation + setup draft drawer | Scene/characters/known-unknown | Are these real facts? | fact/inference/unknown tags |
| 3 | Enter the stage | Stage graph + lanes | Focus client + NPCs, group/private | Who speaks to whom? | Visibility badges, speaker highlight |
| 4 | Review feedback | 5-view feedback panel | Qualitative only, red-line review | Was I scored? | "No score" copy; qualitative views |

→ UIX-005 will push immersive stage framing.

## Flow D — Dashboard decision center (`/dashboard`)

| Step | User Intent | UI Element | System Feedback | Possible Confusion | Improvement |
|---|---|---|---|---|---|
| 1 | Know today's focus | "今日主線" hero block | Primary line + one next-step CTA | Where do I start? | Single dominant next step (UIX-002) |
| 2 | Scan health | Compact KPI rail | tabular figures, deltas | Too many numbers? | Compact, 4-up, restrained |
| 3 | Act on a task | Task queue | status, navigate | Which is urgent? | Priority + readiness signal |

## Flow E — Theme switch (cross-cutting, UIX-001)

| Step | User Intent | UI Element | System Feedback | Possible Confusion | Improvement |
|---|---|---|---|---|---|
| 1 | Switch dark/light | `ThemeToggle` (top bar / public header) | Instant retheme, persisted | Did it stick? | next-themes localStorage persist |
| 2 | First load | — | Dark by default, no FOUC | Flash on load? | next-themes head script + `disableTransitionOnChange` |
