# Viz Polish (Verdict #2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four visual refinements from Gerald's play-test verdict #2: riding labels, intersection dots, drop who-chip, and segmented sweep progression bar.

**Architecture:** All changes are confined to existing files — no new files. BellCurveAxis gets a refactored `gaussianY` exported helper + dots + extended label logic. QuestionCard drops its `vs WHO` chip. BeltStripeBar gets a full new contract. QuestionScreen drops its own heading line. App.tsx wires updated bar props during sweep vs category mode.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library, Vite.

## Global Constraints

- Branch: `axis-viz-polish` — commit there, NO branch creation.
- Commit trailer required: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- `npm test` AND `npm run build` must be green before final commit.
- No new files (extend existing test files only).
- No new colors — use only existing CSS tokens: `var(--belt-*)`, `var(--line)`, `var(--accent)`, `var(--ink)`, `var(--ink-2)`.
- Report written to `/Users/minikai/Dev/bjj-jikohyouka/.superpowers/sdd/viz-polish-report.md`.

---

### Key constants and formulas (reference for all tasks)

```
// BellCurveAxis geometry (from BellCurveAxis.tsx):
VIEW_W=360, VIEW_H=170, PLOT_X0=10, PLOT_X1=350, PLOT_W=340
PLOT_TOP=10, PLOT_H=120, AXIS_Y=138, LABEL_Y=155

// ability_axis curves (from scales.json):
white:  mean=12, sd=7,  height=1.0
blue:   mean=28, sd=9,  height=0.55
purple: mean=45, sd=11, height=0.42
brown:  mean=62, sd=13, height=0.30
black:  mean=74, sd=14, height=0.34

// Suppression threshold: curve height at x < 2% of PLOT_H (< 2.4px)
// White at axis value 62: exponent = -((62-12)^2)/(2*7^2) ≈ -25.5 → effectively 0 → suppressed ✓
// Black at axis value 12: exponent = -((12-74)^2)/(2*14^2) ≈ -9.6 → effectively 0 → suppressed ✓

// Segment counts in BeltStripeBar:
// Sweep total = sweepQs.length (= positionalCategories.length = 15)
// Category drill-down total = positionalCategories.length = 15
```

---

### Task 1: Factor gaussianY + add intersection dots to BellCurveAxis

**Files:**
- Modify: `src/components/inputs/BellCurveAxis.tsx`
- Modify: `src/components/inputs/inputs.test.tsx`

**Interfaces:**
- Produces: exported `gaussianAxisHeight(axisVal: number, mean: number, sd: number, height: number): number` — returns the normalized height in PLOT_H units (0..height) for a given axis value.
- Produces: SVG `<circle>` elements with `data-testid="curve-dot"` and `data-belt={belt}` for each curve whose height at the line's x is ≥ 2% of PLOT_H.

**Context:**
The current `gaussianY(svgX, mean, sd, height)` function is private. We need to split it so both the path builder and the dot renderer use the same math. The active display value for dots is the same logic as `washValue` — prioritize staged > hover ghost > committed.

**Step-by-step:**

- [ ] **Step 1: Export a pure gaussian helper**

In `src/components/inputs/BellCurveAxis.tsx`, RENAME the existing internal `gaussianY` to `gaussianAxisHeight` and change its signature to take an `axisVal` (0–100) instead of `svgX`. Export it. Update `buildGaussianPath` to use it.

The function currently computes: `axisVal = ((svgX - PLOT_X0) / PLOT_W) * 100` internally, then applies the gaussian. Factor that conversion out so the exported function works directly on axis values.

```typescript
// EXPORTED — used by both path builder and dot renderer
// Returns normalized height in PLOT_H units (same as before: 0..height)
export function gaussianAxisHeight(
  axisVal: number,
  mean: number,
  sd: number,
  height: number
): number {
  const exponent = -((axisVal - mean) ** 2) / (2 * sd ** 2)
  return height * Math.exp(exponent)
}

/** Evaluate gaussian at SVG x for one curve — internal use for path builder */
function gaussianAtSvgX(
  svgX: number,
  mean: number,
  sd: number,
  height: number
): number {
  const axisVal = ((svgX - PLOT_X0) / PLOT_W) * 100
  return gaussianAxisHeight(axisVal, mean, sd, height)
}

/** Build a smooth SVG path for a gaussian curve */
function buildGaussianPath(mean: number, sd: number, height: number): string {
  const STEPS = 180
  const points: [number, number][] = []
  for (let i = 0; i <= STEPS; i++) {
    const svgX = PLOT_X0 + (i / STEPS) * PLOT_W
    const normalised = gaussianAtSvgX(svgX, mean, sd, height)
    const svgY = AXIS_Y - normalised * PLOT_H
    points.push([svgX, svgY])
  }
  return (
    `M${PLOT_X0},${AXIS_Y} ` +
    `L${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} ` +
    `L${PLOT_X1},${AXIS_Y} Z`
  )
}
```

- [ ] **Step 2: Run existing tests to confirm refactor doesn't break anything**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run src/components/inputs/inputs.test.tsx
```
Expected: all existing BellCurveAxis tests pass.

- [ ] **Step 3: Determine the "dots line" value**

In the component, add a derived value that represents the axis position for dots. Dots ride the SAME line as the wash/labels. Use `displayValue` (which is already `staged ?? committed`). Additionally, the hover ghost line (`ghostX`) should also show dots when visible. So:

```typescript
// The value at which to render intersection dots.
// Priority: staged > hover ghost > committed (same as displayValue but also includes ghostX)
const dotsAxisValue: number | null =
  staged !== null ? staged
  : ghostX !== null ? ghostX
  : (value !== null && value > 0 ? value : null)
```

- [ ] **Step 4: Render intersection dots inside the SVG**

In the SVG body, after the committed/staged line rendering, add a dot section. Place it AFTER the belt curve paths but BEFORE the vertical lines so dots appear on top of curves and behind lines (visually cleaner). Actually per spec the dots should be on TOP of everything, so place them AFTER the vertical lines.

```typescript
{/* Intersection dots — one per belt curve at the active line position */}
{dotsAxisValue !== null && (() => {
  const lineX = axisToSvgX(dotsAxisValue)
  return curves
    .filter(curve => {
      const h = gaussianAxisHeight(dotsAxisValue, curve.mean, curve.sd, curve.height)
      return h * PLOT_H >= PLOT_H * 0.02  // suppress if < 2% of plot height
    })
    .map(curve => {
      const h = gaussianAxisHeight(dotsAxisValue, curve.mean, curve.sd, curve.height)
      const cy = AXIS_Y - h * PLOT_H
      const isWhite = curve.belt === 'white'
      return (
        <circle
          key={curve.belt}
          data-testid="curve-dot"
          data-belt={curve.belt}
          cx={lineX}
          cy={cy}
          r={4.5}
          fill={`var(--belt-${curve.belt})`}
          stroke={isWhite ? 'var(--line)' : 'white'}
          strokeWidth={1}
        />
      )
    })
})()}
```

Note: white belt fill token is `var(--belt-white)` from `BELT_FILL`. White dot stroke is `var(--line)` per spec.

- [ ] **Step 5: Run existing tests again**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run src/components/inputs/inputs.test.tsx
```
Expected: all pass (no existing test references dots yet).

- [ ] **Step 6: Write dot tests in inputs.test.tsx**

Append to the `describe('BellCurveAxis', ...)` block in `src/components/inputs/inputs.test.tsx`:

```typescript
it('intersection dots appear when value is 62 — 2 to 5 dots with data-belt, white absent', () => {
  render(<BellCurveAxis scale={axis()} value={62} onChange={() => {}} />)
  const dots = document.querySelectorAll('[data-testid="curve-dot"]')
  // At axis 62: white (mean=12, sd=7, height=1.0) → exponent ≈ -25.5 → ~0 → suppressed
  // black (mean=74, sd=14, height=0.34) → some height → present
  // At least 2 and at most 5 curves should show
  expect(dots.length).toBeGreaterThanOrEqual(2)
  expect(dots.length).toBeLessThanOrEqual(5)
  // Each dot has data-belt
  for (const dot of Array.from(dots)) {
    expect(dot.getAttribute('data-belt')).toBeTruthy()
  }
  // White dot should be absent (height ≈ 0 at 62)
  expect(document.querySelector('[data-testid="curve-dot"][data-belt="white"]')).toBeNull()
})

it('intersection dots: each visible dot has a different cy (heights differ)', () => {
  render(<BellCurveAxis scale={axis()} value={45} onChange={() => {}} />)
  const dots = document.querySelectorAll('[data-testid="curve-dot"]')
  const cys = Array.from(dots).map(d => d.getAttribute('cy'))
  // All cy values should be unique (different belt heights at axis=45)
  const unique = new Set(cys)
  expect(unique.size).toBe(cys.length)
})

it('dots ride the hover ghost line when mouse pointer moves', () => {
  render(<BellCurveAxis scale={axis()} value={null} onChange={() => {}} />)
  const svg = document.querySelector('svg[role="slider"]')!
  // No dots before hover
  expect(document.querySelectorAll('[data-testid="curve-dot"]')).toHaveLength(0)
  // Simulate mouse hover (pointerMove with mouse pointerType)
  fireEvent.pointerMove(svg, { pointerType: 'mouse', clientX: 200 })
  // Dots should appear (ghostX set)
  const dots = document.querySelectorAll('[data-testid="curve-dot"]')
  expect(dots.length).toBeGreaterThan(0)
})

it('black dot absent at axis value 12 (suppressed — height < 2% of plot)', () => {
  render(<BellCurveAxis scale={axis()} value={12} onChange={() => {}} />)
  // black: mean=74, sd=14, height=0.34 → exponent = -((12-74)^2)/(2*196) ≈ -9.7 → ~0
  expect(document.querySelector('[data-testid="curve-dot"][data-belt="black"]')).toBeNull()
})
```

- [ ] **Step 7: Run new dot tests**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run src/components/inputs/inputs.test.tsx
```
Expected: all pass (including new dot tests).

- [ ] **Step 8: Commit**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && git add src/components/inputs/BellCurveAxis.tsx src/components/inputs/inputs.test.tsx && git commit -m "$(cat <<'EOF'
feat(bell-curve): factor gaussianAxisHeight + add riding intersection dots

Exports gaussianAxisHeight for testability. Dots render at each belt
curve's true height at the active line position (staged/ghost/committed).
Suppressed when curve height < 2% of plot height (no baseline pile-up).
White-belt dot uses var(--line) stroke per design spec.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Riding labels follow ghost line

**Files:**
- Modify: `src/components/inputs/BellCurveAxis.tsx`
- Modify: `src/components/inputs/inputs.test.tsx`

**Context:**
Currently `works`/`struggles` labels only appear when the staged or committed line is visible. They need to also appear when only the hover ghost line is visible. The ghost line renders at `hoverLineX`. Edge guards (suppress near edges) already exist on staged/committed — replicate them for ghost.

**Interfaces:**
- Consumes: `hoverLineX` (already computed), `PLOT_X0 + 18` and `PLOT_X1 - 24` edge guard constants (already in file)

**Step-by-step:**

- [ ] **Step 1: Add works/struggles labels to the hover ghost line block**

In `BellCurveAxis.tsx`, find the hover ghost line block:

```typescript
{/* Hover ghost line (mouse/pen hover, no staged) */}
{hoverLineX !== null && (
  <line
    x1={hoverLineX} y1={PLOT_TOP}
    x2={hoverLineX} y2={AXIS_Y}
    stroke="var(--accent)"
    strokeWidth={2}
    strokeDasharray="4 3"
    opacity={0.4}
  />
)}
```

Replace it with:

```typescript
{/* Hover ghost line (mouse/pen hover, no staged) */}
{hoverLineX !== null && (
  <>
    <line
      x1={hoverLineX} y1={PLOT_TOP}
      x2={hoverLineX} y2={AXIS_Y}
      stroke="var(--accent)"
      strokeWidth={2}
      strokeDasharray="4 3"
      opacity={0.4}
    />
    {hoverLineX > PLOT_X0 + 18 && (
      <text
        x={hoverLineX - 6}
        y={PLOT_TOP + 14}
        className="mono"
        fill="var(--accent)"
        fontSize={10}
        textAnchor="end"
        opacity={0.4}
      >
        works
      </text>
    )}
    {hoverLineX < PLOT_X1 - 24 && (
      <text
        x={hoverLineX + 6}
        y={PLOT_TOP + 14}
        className="mono"
        fill="var(--ink-2)"
        fontSize={10}
        textAnchor="start"
        opacity={0.4}
      >
        struggles
      </text>
    )}
  </>
)}
```

- [ ] **Step 2: Write riding-label hover test**

Append to `describe('BellCurveAxis', ...)` in `inputs.test.tsx`:

```typescript
it('works/struggles labels appear during hover ghost (no value yet)', () => {
  render(<BellCurveAxis scale={axis()} value={null} onChange={() => {}} />)
  const svg = document.querySelector('svg[role="slider"]')!
  // No labels before hover
  expect(document.querySelectorAll('text').length).toBeLessThan(3) // only endpoint labels
  // Hover at center — neither edge
  fireEvent.pointerMove(svg, { pointerType: 'mouse', clientX: 200 })
  // works and struggles should both be visible
  expect(screen.getByText('works')).toBeInTheDocument()
  expect(screen.getByText('struggles')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run src/components/inputs/inputs.test.tsx
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && git add src/components/inputs/BellCurveAxis.tsx src/components/inputs/inputs.test.tsx && git commit -m "$(cat <<'EOF'
feat(bell-curve): riding labels follow hover ghost line

works/struggles microlabels now appear alongside the hover ghost line,
not only when a line is staged or committed. Edge guards preserved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Drop who-chip from QuestionCard

**Files:**
- Modify: `src/components/QuestionCard.tsx`
- Modify: `src/components/QuestionCard.test.tsx`

**Context:**
The `vs {WHO}` chip in `QuestionCard.tsx` renders when `question.slots` is present. The spec says to remove the chip rendering entirely. Slot DATA stays in the bank; `what` and `problem` still render; the no-slots fallback (raw `question.text` as `<h2>`) stays.

**Step-by-step:**

- [ ] **Step 1: Remove the chip, keep what + problem**

Replace `QuestionCard.tsx` component with:

```typescript
import type { Question } from '../lib/bank/schema'

export interface QuestionCardProps {
  question: Question
}

export function QuestionCard({ question }: QuestionCardProps) {
  // If no slots, render legacy behavior: just the full text as an h2
  if (!question.slots) {
    return <h2 style={{ margin: 0 }}>{question.text}</h2>
  }

  const { what, problem } = question.slots

  return (
    <div>
      <h2 style={{ margin: '0 0 12px 0' }}>
        {what.charAt(0).toUpperCase() + what.slice(1)}
      </h2>
      <p style={{ margin: 0, lineHeight: 1.5 }}>
        {problem}
      </p>
    </div>
  )
}
```

Note: `who` is still destructured from slots in the bank schema; we just don't render it.

- [ ] **Step 2: Update QuestionCard test**

Replace `QuestionCard.test.tsx` with:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { Question } from '../lib/bank/schema'
import { QuestionCard } from './QuestionCard'

const base = { qid: 'q', v: 1, status: 'draft', category: 'takedowns', axis: 'positional', input: 'ability_axis',
  text: 'Against a same-rank partner in their closed guard, I pass before they threaten a sweep or submission',
  tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] } as Question

describe('QuestionCard', () => {
  it('renders what heading and problem line from slots; who-chip is absent', () => {
    render(<QuestionCard question={{ ...base, slots: { who: 'same rank', what: 'their closed guard', problem: 'Do you pass before they threaten a sweep or submission?' } }} />)
    // who-chip must NOT be in the DOM
    expect(screen.queryByText('vs SAME RANK')).toBeNull()
    // what renders as heading
    expect(screen.getByRole('heading', { name: 'Their closed guard' })).toBeInTheDocument()
    // problem renders
    expect(screen.getByText('Do you pass before they threaten a sweep or submission?')).toBeInTheDocument()
  })
  it('falls back to canonical text as the heading when no slots', () => {
    render(<QuestionCard question={base} />)
    expect(screen.getByRole('heading', { name: base.text })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run src/components/QuestionCard.test.tsx
```
Expected: both tests pass; `vs SAME RANK` assertion removed, chip-absent assertion added.

- [ ] **Step 4: Commit**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && git add src/components/QuestionCard.tsx src/components/QuestionCard.test.tsx && git commit -m "$(cat <<'EOF'
feat(question-card): remove who-chip rendering

The belt-axis answer subsumes the opponent dimension. Slot data stays
in the bank schema; who field removed from rendering only. what/problem
still render. No-slots fallback unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Segmented BeltStripeBar — new contract

**Files:**
- Modify: `src/components/BeltStripeBar.tsx`
- Modify: `src/components/QuestionScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.flow.test.tsx`

**Context:**

Current `BeltStripeBar` props: `{ total, done }`. New contract: `{ total, done, current?: number | null, label?: string, annotation?: string }`.

Segment states:
- `i < done` → `data-state="done"` → filled `var(--ink)` background
- `i === current` → `data-state="current"` → transparent fill with 2px `var(--accent)` stroke
- else → `data-state="todo"` → hairline `var(--line)` outline only

Below the bar: one flex row, label (`.mono`) on left, annotation (`.mono`) on right.

The `role="progressbar"` with `aria-valuenow=done`, `aria-valuemax=total` stays.

**QuestionScreen:** Remove the `.mono` heading line (`{headingStr} · {index + 1} of {questions.length}`). The `heading` prop stays in the interface but is no longer rendered internally as a separate line.

**App.tsx sweep mode:** `done = count of sweep questions answered`, `current = current question index in sweep`, `label = category name of current question`, `annotation = \`${done + (isCurrentAnswered ? 0 : 0)}/15\`` — actually use `${Object.keys(session.answers).filter(qid => sweepQs.some(q => q.qid === qid)).length}/${sweepQs.length}`.

Simpler: `done = sweepAnsweredCount`, where `sweepAnsweredCount` is computed by filtering `session.answers` keys that match any sweep qid.

**App.tsx category mode:** `done = completedCategories.length`, `current = positionalCategories.findIndex(c => c.id === activeCategory)`, `label = activeCategoryName`, `annotation = \`${completedCategories.length}/${positionalCategories.length}\``.

**App.tsx interim/results:** `done = completedCategories.length`, no `current`, `label = 'First picture'` or `'Results'`, `annotation = \`${completedCategories.length}/${positionalCategories.length}\``.

**App.flow.test.tsx:** Tests asserting old heading text (`Takedowns & Wrestling · 1 of 15`) will break. Replace them with assertions on bar's `label` + `annotation` text, and `aria-valuenow` on the progressbar.

**Step-by-step:**

- [ ] **Step 1: Rewrite BeltStripeBar**

Replace `src/components/BeltStripeBar.tsx` completely:

```typescript
interface BeltStripeBarProps {
  total: number
  done: number
  current?: number | null
  label?: string
  annotation?: string
}

export function BeltStripeBar({ total, done, current = null, label, annotation }: BeltStripeBarProps) {
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={done}
        aria-valuemax={total}
        style={{
          display: 'flex',
          gap: 2,
          height: 8,
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const state: 'done' | 'current' | 'todo' =
            i < done ? 'done'
            : i === current ? 'current'
            : 'todo'
          return (
            <div
              key={i}
              data-state={state}
              style={{
                flex: 1,
                borderRadius: 2,
                backgroundColor:
                  state === 'done' ? 'var(--ink)'
                  : 'transparent',
                border:
                  state === 'current' ? '2px solid var(--accent)'
                  : '1px solid var(--line)',
                boxSizing: 'border-box',
              }}
            />
          )
        })}
      </div>
      {(label || annotation) && (
        <div
          className="mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            marginTop: 4,
            color: 'var(--ink-2)',
          }}
        >
          <span>{label}</span>
          <span>{annotation}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write BeltStripeBar unit tests**

Create a new `describe('BeltStripeBar', ...)` block. Since there's no existing BeltStripeBar test file, add to `src/App.test.tsx` (or check if one exists — if not, add to App.test.tsx which already imports what we need). Actually, write the tests inline in `App.flow.test.tsx` at the top before the App flow describe block.

Add imports to `App.flow.test.tsx`:
```typescript
import { BeltStripeBar } from './components/BeltStripeBar'
```

Add test block before the existing `describe('App flow', ...)`:
```typescript
describe('BeltStripeBar', () => {
  it('renders total segments with correct data-state attributes', () => {
    render(<BeltStripeBar total={5} done={2} current={2} label="Category" annotation="2/5" />)
    const segments = document.querySelectorAll('[data-state]')
    expect(segments).toHaveLength(5)
    // First 2 = done
    expect(segments[0].getAttribute('data-state')).toBe('done')
    expect(segments[1].getAttribute('data-state')).toBe('done')
    // Index 2 = current
    expect(segments[2].getAttribute('data-state')).toBe('current')
    // Rest = todo
    expect(segments[3].getAttribute('data-state')).toBe('todo')
    expect(segments[4].getAttribute('data-state')).toBe('todo')
  })

  it('renders label and annotation text', () => {
    render(<BeltStripeBar total={15} done={3} label="Takedowns & Wrestling" annotation="3/15" />)
    expect(screen.getByText('Takedowns & Wrestling')).toBeInTheDocument()
    expect(screen.getByText('3/15')).toBeInTheDocument()
  })

  it('progressbar aria-valuenow reflects done count', () => {
    render(<BeltStripeBar total={15} done={7} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '7')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '15')
  })
})
```

- [ ] **Step 3: Run BeltStripeBar tests**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run src/App.flow.test.tsx
```
Expected: BeltStripeBar tests pass; App flow tests likely fail due to QuestionScreen heading line still present and App not wired yet.

- [ ] **Step 4: Remove heading line from QuestionScreen**

In `src/components/QuestionScreen.tsx`, remove the heading `<div>` block:

Find this block:
```typescript
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div className="mono" style={{ fontSize: 12 }}>
    {headingStr} · {index + 1} of {questions.length}
  </div>
  {isAxisScale && (
    <button
      ...
    >
      i
    </button>
  )}
</div>
```

Replace with (keep only the info button when axis scale, remove the text div):
```typescript
<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
  {isAxisScale && (
    <button
      type="button"
      aria-label="How this chart works"
      onClick={() => setInfoPanelOpen(true)}
      style={{
        width: '24px',
        height: '24px',
        minHeight: '24px',
        padding: 0,
        border: '1px solid var(--line)',
        borderRadius: '50%',
        backgroundColor: 'transparent',
        color: 'var(--ink)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
      }}
    >
      i
    </button>
  )}
</div>
```

Also remove the `headingStr` line since it's no longer used (but keep `heading` in props interface and the `typeof heading === 'function'` derived value can be removed too — or leave `heading` prop unused to minimize churn. Clean choice: remove the `headingStr` derivation and the heading prop usage inside the component, but keep `heading` in `QuestionScreenProps` interface so App.tsx callers don't need to change their call sites for now):

```typescript
// Remove this line from QuestionScreen body:
const headingStr = typeof heading === 'function' ? heading(index) : heading
```

- [ ] **Step 5: Wire BeltStripeBar in App.tsx during sweep**

In `App.tsx`, compute swept answers count and update the `<BeltStripeBar>` call.

Add before the `return (` statement:
```typescript
// Count how many sweep questions have been answered in the current session
const sweepAnsweredCount = session
  ? sweepQs.filter(q => q.qid in session.answers).length
  : 0

// Current sweep question index (from QuestionScreen's internal state — not available here)
// Use sweepStartIndex + answeredCount approximation? No — we pass it fresh.
// Actually App.tsx doesn't know the current index inside QuestionScreen.
// Solution: track it via a callback or derive from answers.
// Simplest: current = sweepAnsweredCount (the next question to answer = first unanswered)
// This is sweepQs.findIndex(q => !(q.qid in (session?.answers ?? {})))
const sweepCurrentIndex = session
  ? sweepQs.findIndex(q => !(q.qid in session.answers))
  : 0

// Current category name during sweep (for bar label)
const sweepCurrentCategory = sweepCurrentIndex >= 0 && sweepCurrentIndex < sweepQs.length
  ? (bank.categories.find(c => c.id === sweepQs[sweepCurrentIndex].category)?.name ?? 'Sweep')
  : 'Sweep'
```

Update the `<BeltStripeBar>` call in the JSX (in the top `(screen === 'sweep' || screen === 'interim' ...)` block):

```typescript
{(screen === 'sweep' || screen === 'interim' || screen === 'category' || screen === 'results') && (
  <div style={{ marginBottom: 16 }}>
    <BeltStripeBar
      total={positionalCategories.length}
      done={
        screen === 'sweep'
          ? sweepAnsweredCount
          : completedCategories.length
      }
      current={
        screen === 'sweep'
          ? (sweepCurrentIndex >= 0 ? sweepCurrentIndex : null)
          : screen === 'category'
          ? positionalCategories.findIndex(c => c.id === activeCategory)
          : null
      }
      label={
        screen === 'sweep'
          ? sweepCurrentCategory
          : screen === 'category'
          ? activeCategoryName
          : screen === 'interim'
          ? 'First picture'
          : 'Results'
      }
      annotation={
        screen === 'sweep'
          ? `${sweepAnsweredCount}/${sweepQs.length}`
          : `${completedCategories.length}/${positionalCategories.length}`
      }
    />
  </div>
)}
```

- [ ] **Step 6: Update App.flow.test.tsx**

The App flow tests that previously asserted `Takedowns & Wrestling · 1 of 15` style text must be updated. Look for these patterns in `App.flow.test.tsx` and replace them.

In the existing test `'intro → intake → first sweep question from the bank'`, there's no heading-style assertion for the sweep bar text — it only checks for a `heading` match via `screen.getByRole('heading', ...)`. The `progressbar` is checked. So we need to add assertions that the bar shows the right label/annotation.

Add a new test for the sweep bar progression:

```typescript
it('after answering 2 sweep questions, bar annotation shows 2/15 and aria-valuenow=2', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
  fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))

  // Answer Q1 (belt_curve)
  fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
  // Answer Q2 (belt_curve)
  fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))

  // Bar should reflect 2 answered
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  expect(screen.getByText('2/15')).toBeInTheDocument()
})

it('bar shows category label during sweep', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
  fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))

  // First question category
  const firstCat = bank.categories.find(c => c.id === sweepQs[0].category)!
  expect(screen.getByText(firstCat.name)).toBeInTheDocument()
})
```

Also check if any existing test asserts the OLD heading pattern (`Takedowns & Wrestling · 1 of 15`). Looking at the current tests — none do (the heading assertions are for `screen.getByRole('heading', ...)` which checks `<h1>`, `<h2>` etc., not the mono label). So no existing tests need updating for that pattern. The `sweepStartIndex regression` test checks `screen.getByRole('heading', { name: q1Text })` which is the question text as `<h2>`, not the heading line. Safe.

- [ ] **Step 7: Run all tests**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run
```
Expected: all tests pass.

- [ ] **Step 8: Run build**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm run build
```
Expected: clean build with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && git add src/components/BeltStripeBar.tsx src/components/QuestionScreen.tsx src/App.tsx src/App.flow.test.tsx && git commit -m "$(cat <<'EOF'
feat(bar+screen): segmented sweep progression bar, remove heading line

BeltStripeBar: new contract with total/done/current/label/annotation,
segments styled done=filled/current=accent-stroke/todo=hairline.
QuestionScreen: removes mono heading line (bar label/annotation replaces it).
App: wires sweep progress (done=answered count, current=next index,
label=category name, annotation=N/15) during sweep; category index
during drill-downs.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: InfoPanel one-liner + test update

**Files:**
- Modify: `src/components/InfoPanel.tsx`
- Modify: `src/components/InfoPanel.test.tsx`

**Context:**
Append to section 1's paragraph (after `…not a guarantee.`): ` The dots show where your line crosses each curve — one position can be a strong blue and a middling purple at the same time.`

The InfoPanel test currently checks `screen.getByText(/belt population/)` for section 1 content. After appending, the existing matcher still works (it's a regex partial). But check if any test pins the paragraph end — the spec says update if it does. Looking at `InfoPanel.test.tsx`: it uses `/mirror, not a measurement/` for the last section and other partial regexes — none pin the section 1 paragraph end exactly. Safe to append.

**Step-by-step:**

- [ ] **Step 1: Append sentence to section 1**

In `src/components/InfoPanel.tsx`, find:
```
Belt color is a decent proxy for ability, not a guarantee.
```

Replace the full section 1 `<p>`:
```typescript
<p style={{ margin: 0 }}>
  Each curve is a belt population. The horizontal axis is ability — further right, harder to deal with. The curves overlap on purpose: an exceptional purple belt is a harder round than an out-of-practice black belt. Belt color is a decent proxy for ability, not a guarantee. The dots show where your line crosses each curve — one position can be a strong blue and a middling purple at the same time.
</p>
```

- [ ] **Step 2: Update InfoPanel test**

The existing test `screen.getByText(/belt population/)` still works. Add an assertion for the new sentence in `InfoPanel.test.tsx`:

In the `'renders all four explainer sections when open'` test, add:
```typescript
expect(screen.getByText(/dots show where your line crosses each curve/)).toBeInTheDocument()
```

- [ ] **Step 3: Run InfoPanel tests**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run src/components/InfoPanel.test.tsx
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && git add src/components/InfoPanel.tsx src/components/InfoPanel.test.tsx && git commit -m "$(cat <<'EOF'
feat(info-panel): add dots one-liner to section 1

Explains that dots show where the line crosses each belt curve,
making the overlap thesis visible: one position = strong blue, middling purple.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Full test pass + build + report

**Files:**
- Modify: `.superpowers/sdd/viz-polish-report.md` (create dir if needed)

**Step-by-step:**

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm test -- --run 2>&1 | tail -30
```
Expected: all tests pass, zero failures.

- [ ] **Step 2: Run build**

```bash
cd /Users/minikai/Dev/bjj-jikohyouka && npm run build 2>&1 | tail -20
```
Expected: clean build.

- [ ] **Step 3: Write report**

Create `.superpowers/sdd/` directory and write `viz-polish-report.md`:

```bash
mkdir -p /Users/minikai/Dev/bjj-jikohyouka/.superpowers/sdd
```

Write the report with: Status, commits (list), test summary (counts + build), concerns.

- [ ] **Step 4: Final commit**

If the report file is the only change:
```bash
cd /Users/minikai/Dev/bjj-jikohyouka && git add .superpowers/sdd/viz-polish-report.md && git commit -m "$(cat <<'EOF'
docs: viz-polish implementation report

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage check:**

| Spec item | Task |
|---|---|
| 1. Riding labels on ghost/staged/committed | Task 1 (dots) + Task 2 (labels) |
| 2. Intersection dots at true curve height | Task 1 |
| 3. Drop who-chip | Task 3 |
| 4. BeltStripeBar new contract | Task 4 |
| 4a. QuestionScreen removes heading line | Task 4 |
| 4b. App.tsx sweep progress wiring | Task 4 |
| 4c. App.flow tests updated | Task 4 |
| 5. InfoPanel one-liner | Task 5 |
| Tests: riding labels with ghost | Task 2 |
| Tests: dots count 2–5 at 62, data-belt, white absent | Task 1 |
| Tests: who-chip absent | Task 3 |
| Tests: BeltStripeBar segments + label + annotation | Task 4 |
| Tests: App.flow sweep annotation after 2 answers | Task 4 |

**Concerns flagged:**

1. **App.tsx sweep current index**: `sweepCurrentIndex` uses `findIndex(q => !(q.qid in session.answers))` — this finds the first unanswered sweep question, which correctly tracks the active segment for the bar. If ALL questions are answered, returns -1; we pass `null` as `current` in that case (handled in the ternary with `sweepCurrentIndex >= 0 ? sweepCurrentIndex : null`).

2. **QuestionScreen `heading` prop**: The prop stays in `QuestionScreenProps` as `string | ((index: number) => string)`. App.tsx still passes a heading function during sweep and a string during category drill-down. The value is computed internally but not rendered — this dead code is intentional (kept for minimal diff / possible future use). If it causes TypeScript unused-variable warnings, suppress or remove the `headingStr` derivation.

3. **White belt dot fill**: `var(--belt-white)` — verify this token exists in `src/styles/tokens.css`. The existing code already uses `BELT_FILL.white = 'var(--belt-white)'` for curve fills, so it must exist.

4. **Dots IIFE pattern**: The `{dotsAxisValue !== null && (() => { ... })()}` pattern in JSX is valid React but unusual. An alternative is to compute `visibleDots` as a derived array outside the JSX. Either is fine; the plan uses the IIFE for locality. During implementation, prefer the derived-array approach if the IIFE feels unclean.
