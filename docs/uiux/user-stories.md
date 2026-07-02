# User Stories — 誠問 AI

> Stories adapted to the real product (insurance-advisory SaaS). The generic template's "workflow modeling" stories map onto concrete advisor surfaces. Personas: **Advisor (業務員/member)**, **Manager (org admin)**, **Operator (super admin)**, **Client (client portal)**.

## Primary persona: Advisor

### Story 1 — Understand a client (≈ "Create Workflow")
As an **advisor**, I want to run an AI-guided interview (`AI 了解客戶`) from a real client conversation, so that I can turn what I learned into a structured client profile and a preparation pack — standardizing how I understand each client.
- Surfaces: `/interview`, writeback → `/crm/[clientId]`, `/pre-visit`.

### Story 2 — Add a person to the relationship network (≈ "Add Workflow Node")
As an **advisor**, I want to add family members / social ties to a client's relationship graph, so that each node represents a real person and decision influence in the household.
- Surface: `/crm/[clientId]/relationships` (React Flow node canvas).

### Story 3 — Edit a person/record's attributes (≈ "Edit Node Attributes")
As an **advisor**, I want to edit a person's role, occupation, financial dependency, decision role, and relationship context, so that every node has clear, source-tagged (fact / inference / unknown) attributes.
- Surfaces: relationship graph person editor; CRM detail.

### Story 4 — Configure the engagement (≈ "Configure Rules")
As an **advisor**, I want to define the visit/roleplay setup — focus client, objections, sensitivities, what is confirmed vs. inferred — so that the AI reflects real professional judgement, not guesses.
- Surfaces: `/theater/build`, `/pre-visit/[planId]`.

### Story 5 — Review completeness (≈ "Review Workflow Completeness")
As an **advisor**, I want to review whether a client profile / preparation pack / report is complete (known vs. to-confirm, compliance gaps, issue readiness), so that I can safely use it as an SOP or client-facing artifact.
- Surfaces: `/crm/[clientId]/gap-analysis`, `/pre-visit/[planId]`, `/issues`, `/reports`.

### Story 6 — Use AI assistance (≈ "Use AI Assistance")
As an **advisor**, I want AI to help generate and improve interviews, preparation packs, roleplay scenes, meeting summaries, and reports, so that I can quickly turn professional knowledge into structured, reviewable output — with every AI call tracked and every writeback confirmed.
- Surfaces: `問誠問 AI` assistant, `/interview`, `/theater`, `/pre-visit/[planId]/notes` (AI meeting), `/reports`.

## Manager (org admin)

### Story 7 — See who needs coaching
As a **manager**, I want the first screen of `/team` to answer *"who needs coaching and what is the next step"* using aggregates only, so that I can coach without seeing member client details.

## Client (client portal)

### Story 8 — Read my report safely
As a **client**, I want a mobile-first, trustworthy, simple report page (`/share/[token]`) with visible compliance disclaimer, so that I can understand and act on what my advisor prepared.

## Cross-cutting UX requirements
- Each page must make the **primary task** and **next action** obvious; CTA hierarchy is unambiguous.
- AI output is always **fact / inference / unknown** separated; inferences never silently become confirmed facts.
- Works in **both dark (primary) and light** themes, desktop + mobile, with AA contrast and reduced-motion support.
