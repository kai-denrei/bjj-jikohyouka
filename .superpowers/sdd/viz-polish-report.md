# Viz Polish (Verdict #2) — Implementation Report

**Date:** 2026-07-19  
**Branch:** axis-viz-polish  
**Plan:** docs/superpowers/plans/2026-07-19-viz-polish.md

## Status: COMPLETE

All 5 spec changes implemented, 137/137 tests pass, build clean.

## Commits (2e9e445 → 83d8d22)

| Hash | Description |
|---|---|
| `217e953` | feat(bell-curve): factor gaussianAxisHeight + add riding intersection dots |
| `5c6d3de` | feat(bell-curve): riding labels follow hover ghost line |
| `ec4a34c` | fix(bell-curve): use var(--belt-white) token for dot stroke, not hardcoded 'white' |
| `b9fad84` | feat(question-card): remove who-chip rendering |
| `a24b9d8` | feat(bar+screen): segmented sweep progression bar, remove heading line |
| `83d8d22` | feat(info-panel): add dots one-liner to section 1 |

## Test Summary

**137 tests / 18 test files — all pass**  
**Build:** `npm run build` clean (77ms, 0 TS errors)

New tests added:
- `inputs.test.tsx`: 5 new (4 dot tests + 1 riding-label hover ghost test) → 28 total
- `QuestionCard.test.tsx`: rewrote slot test to assert chip absent → 2 total
- `InfoPanel.test.tsx`: 1 new assertion for dots one-liner → 3 total
- `App.flow.test.tsx`: 3 new (BeltStripeBar unit × 3) + 2 new App flow tests → 39 total

## Changes Implemented

### 1. Intersection dots (BellCurveAxis.tsx)
- Exported `gaussianAxisHeight(axisVal, mean, sd, height)` from the private `gaussianY` refactor.
- Added `dotsAxisValue` (staged > ghostX > committed) as the active line position.
- Rendered `<circle data-testid="curve-dot" data-belt={belt}>` for each belt curve whose normalized height ≥ 0.02 (≥ 2% of PLOT_H) at the line position.
- White-belt dot: `stroke="var(--line)"`. Other dots: `stroke="var(--belt-white)"` (token, not hardcoded).

### 2. Riding labels on ghost line (BellCurveAxis.tsx)
- `works`/`struggles` microlabels now also appear alongside the hover ghost line (not just staged/committed).
- Same edge guards as before: suppress `works` within 18px of left edge, suppress `struggles` within 24px of right edge.

### 3. Drop who-chip (QuestionCard.tsx)
- Removed the `vs {WHO}` `.mono` chip rendering entirely.
- `what` heading and `problem` paragraph still render. No-slots fallback unchanged.
- Slot data stays in the bank JSON.

### 4. Segmented BeltStripeBar (BeltStripeBar.tsx + QuestionScreen.tsx + App.tsx)
- `BeltStripeBar` new contract: `{ total, done, current?, label?, annotation? }`.
- Segments: `data-state="done"` (filled `var(--ink)`) / `"current"` (2px `var(--accent)` stroke) / `"todo"` (1px `var(--line)` hairline).
- Label row below bar: `.mono` left = label, right = annotation.
- `QuestionScreen` heading line removed (`heading` prop kept in interface, renamed `_heading` in destructure to suppress TS error).
- `App.tsx` wires sweep bar: `done=sweepAnsweredCount`, `current=sweepCurrentIndex` (first unanswered), `label=category name`, `annotation=N/15`. Category drill-down uses `done=completedCategories.length`, `current=findIndex(activeCategory)`.

### 5. InfoPanel one-liner (InfoPanel.tsx)
- Appended to section 1 paragraph: `The dots show where your line crosses each curve — one position can be a strong blue and a middling purple at the same time.`

## Concerns / Deferred

- **Reviewer finding (resolved):** Task 1 initially used hardcoded `'white'` for dot stroke. Fixed in `ec4a34c` to use `var(--belt-white)` token.
- **`heading` prop in QuestionScreen:** Still in the public interface (App passes it for potential future use). Now silenced via `_heading` rename — clean but the prop is dead weight. Could be removed in a future cleanup pass.
- **Sweep `sweepQs.length` vs `positionalCategories.length`:** Both are 15 in the default bank. The annotation uses `sweepQs.length` for sweep mode which is correct — it reflects the actual sweep count, not the hardcoded category count.
- **jsdom SVG geometry:** The hover-ghost label test required mocking `getBoundingClientRect` because jsdom returns zero-size rects for SVG elements. Pattern documented in the test.

## Fix Report

**Commit:** d683bb1  
**Subject:** Axis visualization polish: Fix within-run counter, borderless done segments, dead prop removal

**Fixes applied:**
1. **Within-run counter (Fix 1):** Replaced `heading` prop with `withinRunCounter?: boolean`. When true, renders "{index+1} of {questions.length}" right-aligned above question card. App passes `withinRunCounter={true}` ONLY on category drill-down; sweep bar annotation already carries global progress.
2. **Borderless done segments (Fix 2):** BeltStripeBar done segments now border-free; current segments retain 2px accent stroke; todo segments keep 1px line hairline.
3. **Dead prop removal (Fix 3):** `heading` fully removed from QuestionScreenProps interface and all App.tsx call sites (sweep & category). Tests updated.

**Test results:** 137 passed (18 files, all green)  
**Build:** Clean (77ms, 0 TS errors)  
**Concerns:** None.
