# UI/UX Acceptance Checklist — 誠問 AI

> Run per iteration against the touched surfaces. Tick only what is actually verified (screenshot / tsc / lint / browser). Adapted to an insurance-advisory SaaS.

## User Story Clarity
- [ ] User understands what the page is for
- [ ] User knows the first action
- [ ] User understands the next action
- [ ] CTA hierarchy is clear
- [ ] User can complete the primary task

## Workflow / Record Logic
- [ ] Record/flow start is clear (focus client, today's main line, session start)
- [ ] Sequence is clear (interview segments, SPIN phases, theater turns)
- [ ] Branching is understandable (group/private, fact/inference/unknown)
- [ ] Selected node/record is obvious
- [ ] Incomplete / to-confirm items are visible
- [ ] Validation / compliance gaps are actionable

## Node / Record Editing
- [ ] Inspector / detail is easy to find
- [ ] Selected record details are clear
- [ ] Required fields are visible
- [ ] Rule/attribute editing is understandable
- [ ] Exceptions / unknowns can be documented
- [ ] Changes have clear feedback and persist (refresh-safe)

## Professional UI
- [ ] Typography hierarchy is clear
- [ ] Spacing is consistent
- [ ] Icons feel mature (Lucide, consistent stroke, not emoji)
- [ ] Colors are controlled (navy anchor, rare gold, neutral base)
- [ ] Cards and panels feel professional (hairline, no heavy shadow)
- [ ] Interface does not feel childish

## Theme (dark primary + light)
- [ ] Dark theme is the default and renders correctly
- [ ] Light theme renders correctly (no broken contrast)
- [ ] No FOUC on first load
- [ ] Toggle is keyboard + screen-reader accessible
- [ ] AA contrast in both themes

## Package Usage
- [ ] Standard UI components use mature packages when suitable
- [ ] Custom code is limited to product-specific logic
- [ ] New packages are documented (evaluation + decision log)
- [ ] New packages improve maintainability or UX

## States
- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Success state
- [ ] Disabled state
- [ ] Hover state
- [ ] Focus state

## Responsive
- [ ] Desktop usable (1440)
- [ ] Tablet usable
- [ ] Mobile usable (390), no horizontal overflow

## Safety (regulated product)
- [ ] No SPIN state-machine / Theater enum / compliance-field change
- [ ] No auth / payment / DB schema / deployment change
- [ ] `AiUsageLog` untouched on any AI path
- [ ] No raw private payload / email / phone / policy number exposed in UI
