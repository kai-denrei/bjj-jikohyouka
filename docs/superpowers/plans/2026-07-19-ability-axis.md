# Ability-Axis Input System (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace prose-question + labeled-scale answering with Gerald's ability-axis system: structured question cards (who/what/problem slots), one-click vertical-line selection over overlapping belt bell-curves, reworked draft content, and an "i" explainer.

**Architecture:** Curves are DATA in `scales.json` (five gaussian params), not code — the widget renders whatever the scale defines. `slots` is an optional question field; `text` remains canonical for review/linting. Draft records are restructured in place (draft lifecycle permits edits without `v` bumps). Raw answer = x-position 0–100; the floor chip stores 0.

**Tech Stack:** Existing stack (React 19, TS, zod, vitest/jsdom). No new dependencies. Hand-rolled SVG for curves.

## Global Constraints

- Design tokens binding (from phase 2): belt colors ONLY where they mean rank — the five curves use `--belt-*` tokens; `--belt-white` curve gets a `--line` stroke for visibility on `--mat`. Interaction accent `--accent:#35509E` for the vertical line. No new hues.
- Brainstorm source of truth: brief Appendix B entries dated 2026-07-19 (structured cards; ability-axis; Kimura test case). Reference chart: `docs/reference-belt-curves.webp`. Curves in-app are STYLIZED (illustrative), never presented as data.
- The committed datum is an x-position: vertical line + region highlight. Left of line = works more often than not; right = where it starts to fail. NO percentage language, no "reliably" (linter word).
- Floor chip label verbatim: `No answer to this yet` → stores `raw: 0`. Semantics comment required in schema: ability_axis floor ≠ belt_threshold N/A (null = skip; 0 = scored floor).
- Continuous-input caveat (anti-slider research, brief Appendix A) must be argued in code comments on the widget: no handle, no default position, semantic landmarks — tap-to-place, not drag-from-default.
- Keyboard accessibility: widget is `role="slider"`, `aria-valuemin=0 aria-valuemax=100`, arrow keys move the line ±2, aria-valuetext like `62 of 100 — around brown belt`.
- Wording linter now also lints `slots` strings (who/what/problem) on non-retired questions.
- All content changes are DRAFT records only; active bank stays 173 untouched; `npm run bank:validate` 0 errors after every content task.
- No question text/slot text hard-coded in components; the fixed prompt `Where do you start to struggle?` is scale data (`scales.json` label), not component copy.
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

```
src/lib/bank/schema.ts                 # + kind 'axis', curves/floor on Scale; slots on Question (Task 1)
src/data/question-bank/scales.json     # + ability_axis record with curve params (Task 1)
src/lib/bank/lint.ts                   # + lintQuestion(q) covering text + slots (Task 1)
src/lib/bank/validate.ts               # lint call switches to lintQuestion (Task 1)
src/lib/results/score.ts               # + ability_axis normalization (Task 2)
src/components/inputs/BellCurveAxis.tsx# the widget (Task 3)
src/components/inputs/QuestionInput.tsx# + kind 'axis' dispatch (Task 3)
src/components/QuestionCard.tsx        # slots-aware question rendering (Task 4)
src/components/QuestionScreen.tsx      # uses QuestionCard; "i" button when axis (Tasks 4–5)
src/components/InfoPanel.tsx           # the explainer overlay (Task 5)
src/components/results/ResultsPage.tsx # "i" button placement (Task 5)
src/lib/bank/review.ts                 # renders slots line in bank:review (Task 6)
src/data/question-bank/questions/*.json# draft rework in place (Task 6)
scripts/screenshot-walkthrough.mjs     # + 07/08 captures (Task 7)
```

---

### Task 1: Schema, scale data, slot-aware linter

**Files:**
- Modify: `src/lib/bank/schema.ts`, `src/data/question-bank/scales.json`, `src/lib/bank/lint.ts`, `src/lib/bank/validate.ts`
- Test: `src/lib/bank/schema.test.ts` (extend), `src/lib/bank/lint.test.ts` (extend)

**Interfaces:**
- Produces on `ScaleSchema`: `kind: z.enum(['tap','curve','slider','axis'])`; optional `floor: z.boolean()` (floor chip present); optional `curves: z.array(z.object({ belt: z.enum(['white','blue','purple','brown','black']), mean: z.number().min(0).max(100), sd: z.number().positive(), height: z.number().positive() }).strict()).length(5)`.
- Produces on `QuestionSchema`: optional `slots: z.object({ who: z.string().min(1), what: z.string().min(1), problem: z.string().min(1) }).strict()`.
- Produces from lint.ts: `lintQuestion(q: { qid: string; text: string; slots?: { who: string; what: string; problem: string } }): LintWarning[]` — runs `lintText` on `text` and each slot string (same qid). `lintText` stays exported.
- scales.json gains (anchors are the axis endpoint labels; curves stylized from the reference chart — white tall/narrow left, widening and flattening rightward, black slightly taller than brown with a long right tail):

```json
{ "id": "ability_axis", "kind": "axis", "label": "Where do you start to struggle?",
  "secondsPerItem": 6, "floor": true,
  "anchors": [ { "value": 0, "label": "Untrained" }, { "value": 100, "label": "Elite" } ],
  "curves": [
    { "belt": "white",  "mean": 12, "sd": 7,  "height": 1.0 },
    { "belt": "blue",   "mean": 28, "sd": 9,  "height": 0.55 },
    { "belt": "purple", "mean": 45, "sd": 11, "height": 0.42 },
    { "belt": "brown",  "mean": 62, "sd": 13, "height": 0.30 },
    { "belt": "black",  "mean": 74, "sd": 14, "height": 0.34 } ] }
```

- validate.ts: replace `warnings.push(...lintText(q.qid, q.text))` with `warnings.push(...lintQuestion(q))`.
- Schema comment (required, verbatim intent): `// floor stores raw 0 (scored floor rung) — distinct from belt_threshold's na (null = skipped as not-applicable)`.

- [ ] **Step 1: Failing tests.** Append to `src/lib/bank/schema.test.ts`:

```ts
describe('axis scale + slots (phase 3)', () => {
  it('accepts an axis scale with five belt curves and floor', () => {
    const s = ScaleSchema.parse({
      id: 'ability_axis', kind: 'axis', label: 'Where do you start to struggle?',
      secondsPerItem: 6, floor: true,
      anchors: [{ value: 0, label: 'Untrained' }, { value: 100, label: 'Elite' }],
      curves: [
        { belt: 'white', mean: 12, sd: 7, height: 1.0 }, { belt: 'blue', mean: 28, sd: 9, height: 0.55 },
        { belt: 'purple', mean: 45, sd: 11, height: 0.42 }, { belt: 'brown', mean: 62, sd: 13, height: 0.3 },
        { belt: 'black', mean: 74, sd: 14, height: 0.34 }],
    })
    expect(s.curves).toHaveLength(5)
  })
  it('rejects curves with wrong count or unknown belt', () => {
    const base = { id: 'x', kind: 'axis', label: 'l', secondsPerItem: 6,
      anchors: [{ value: 0, label: 'a' }, { value: 100, label: 'b' }] }
    expect(() => ScaleSchema.parse({ ...base, curves: [{ belt: 'white', mean: 1, sd: 1, height: 1 }] })).toThrow()
    expect(() => ScaleSchema.parse({ ...base, curves: Array(5).fill({ belt: 'red', mean: 1, sd: 1, height: 1 }) })).toThrow()
  })
  it('accepts slots on a question and rejects empty slot strings', () => {
    const q = { ...validQuestion, slots: { who: 'same rank', what: 'their closed guard', problem: 'Do you pass before they threaten a sweep or submission?' } }
    expect(QuestionSchema.parse(q).slots?.what).toBe('their closed guard')
    expect(() => QuestionSchema.parse({ ...validQuestion, slots: { who: '', what: 'x', problem: 'y' } })).toThrow()
  })
})
```

Append to `src/lib/bank/lint.test.ts`:

```ts
describe('lintQuestion (slots-aware)', () => {
  it('flags vague words inside slot strings', () => {
    const w = lintQuestion({ qid: 'q1', text: 'clean text', slots: { who: 'same rank', what: 'their guard', problem: 'Do you reliably pass?' } })
    expect(w).toEqual([{ qid: 'q1', kind: 'vague', match: 'reliably' }])
  })
  it('is identical to lintText when no slots', () => {
    expect(lintQuestion({ qid: 'q2', text: 'I am confident here' })).toEqual(lintText('q2', 'I am confident here'))
  })
})
```

(Also update the scales-count test in `load.test.ts`: expected id list gains `ability_axis` → 9 scales; and the real-bank scale count anywhere it's pinned — `convert-v01` CLI printed 8 scales historically, that message is not test-pinned, but `snapshot` test pins `s.scales.length` — it reads the CURRENT bank so it becomes 9; update that assertion.)

- [ ] **Step 2:** Run `npx vitest run src/lib/bank/schema.test.ts src/lib/bank/lint.test.ts` → FAIL.
- [ ] **Step 3:** Implement schema fields, scales.json record, `lintQuestion` (lint text + each slot string, concat), validate.ts switch, the floor-semantics comment.
- [ ] **Step 4:** Run those tests + `npm run bank:validate` (0 errors) + FULL `npm test` (fix the two count assertions) + `npm run build` → all green.
- [ ] **Step 5:** Commit — `feat(bank): axis scale kind with belt curves, question slots, slot-aware linter`

---

### Task 2: Scoring for ability_axis

**Files:**
- Modify: `src/lib/results/score.ts`
- Test: `src/lib/results/score.test.ts` (extend)

**Interfaces:**
- Consumes: existing `PROVISIONAL_NORMALIZATION` table.
- Produces: `ability_axis: r => (r as number) / 100` entry (floor 0 → norm 0 → counts as answered at score 0, NOT skipped — only `raw === null` skips).

- [ ] **Step 1: Failing test** (extend fixture bank with an `ability_axis` scale + one question using it):

```ts
it('ability_axis: x/100 provisional; floor 0 counts as an answered zero', () => {
  expect(PROVISIONAL_NORMALIZATION.ability_axis(62)).toBeCloseTo(0.62)
  const r = scoreAnswers({ td_axis: a('td_axis', 0) }, bankWithAxis)
  const td = r.categories.find(c => c.categoryId === 'takedowns')!
  expect(td.score).toBe(0)
  expect(td.answered).toBe(1)   // floor is an answer, not a skip
})
```

- [ ] **Step 2–4:** RED → one-line table entry + fixture → GREEN, full suite, build.
- [ ] **Step 5:** Commit — `feat(results): ability_axis normalization (x/100, floor scores zero)`

---

### Task 3: BellCurveAxis widget

**Files:**
- Create: `src/components/inputs/BellCurveAxis.tsx`
- Modify: `src/components/inputs/QuestionInput.tsx` (kind `axis` dispatch), `src/styles/tokens.css` (`.axis-floor-chip` if needed — reuse `.chip`)
- Test: `src/components/inputs/inputs.test.tsx` (extend)

**Interfaces:**
- Produces: `BellCurveAxis({ scale, value, onChange }: { scale: Scale; value: number | null; onChange: (v: number) => void })`.
- Render contract: SVG `viewBox 0 0 360 170`, plot area x∈[10,350] mapping axis 0–100; five gaussian paths `height * exp(-((x-mean)^2)/(2sd^2))` scaled to plot height ~120, painted white→black order, `fill` = belt token at `fillOpacity 0.28`, `stroke` = belt token (white curve stroke `var(--line)`); endpoint labels from `scale.anchors` in `.mono` under the axis line. Prompt above the chart = `scale.label` (`Where do you start to struggle?`). Tap/click on the SVG → `onChange(round(axisX))`; when `value !== null && value > 0`: vertical accent line at x, left region wash `var(--accent)` at 0.07 opacity, two `.mono` microlabels `works` (left of line) and `struggles` (right); no default position, no drag handle (comment block citing the anti-slider argument: tap-to-place + semantic landmarks + no anchor default). Keyboard: `role="slider"`, `tabIndex=0`, `aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? 0}`, `aria-valuetext` = `${value} of 100 — around ${nearestBeltLabel}` (nearest curve mean; capitalized belt name), ArrowLeft/Right ±2 (clamped 1–100). Floor chip below (only when `scale.floor`): `.chip` labeled `No answer to this yet`, `aria-pressed={value === 0}`, click → `onChange(0)`; when `value === 0` no vertical line renders.
- QuestionInput: `scale.kind === 'axis'` → `BellCurveAxis` (value cast `number | null`).

- [ ] **Step 1: Failing tests** (append to `inputs.test.tsx`):

```tsx
describe('BellCurveAxis', () => {
  const axis = () => bank.scales.find(s => s.id === 'ability_axis')!
  it('renders five belt curves, endpoint labels, and the fixed prompt from scale data', () => {
    render(<BellCurveAxis scale={axis()} value={null} onChange={() => {}} />)
    expect(document.querySelectorAll('svg path[data-belt]')).toHaveLength(5)
    expect(screen.getByText('Untrained')).toBeInTheDocument()
    expect(screen.getByText('Elite')).toBeInTheDocument()
    expect(screen.getByText('Where do you start to struggle?')).toBeInTheDocument()
  })
  it('has slider semantics and arrow-key movement', () => {
    const fn = vi.fn()
    render(<BellCurveAxis scale={axis()} value={50} onChange={fn} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '50')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/around (White|Blue|Purple|Brown|Black)/)
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(fn).toHaveBeenCalledWith(52)
  })
  it('renders the vertical line only when placed, and floor chip stores 0', () => {
    const fn = vi.fn()
    const { rerender } = render(<BellCurveAxis scale={axis()} value={null} onChange={fn} />)
    expect(document.querySelector('[data-testid="axis-line"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'No answer to this yet' }))
    expect(fn).toHaveBeenCalledWith(0)
    rerender(<BellCurveAxis scale={axis()} value={62} onChange={fn} />)
    expect(document.querySelector('[data-testid="axis-line"]')).not.toBeNull()
    expect(screen.getByText('works')).toBeInTheDocument()
    expect(screen.getByText('struggles')).toBeInTheDocument()
  })
  it('QuestionInput dispatches axis scales to BellCurveAxis', () => {
    render(<QuestionInput scale={axis()} value={null} onChange={() => {}} />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2–4:** RED → implement → GREEN (jsdom note: SVG click coordinates need `getBoundingClientRect` mocking or clientX math — compute axis x from `(clientX - rect.left)/rect.width`; in the tests above, tap-position math is exercised via keyboard path; add a direct unit export `clientXToAxis(clientX, rect)` if cleaner). Full suite + build.
- [ ] **Step 5:** Commit — `feat(app): bell-curve ability-axis widget with vertical-line selection`

---

### Task 4: Structured question card

**Files:**
- Create: `src/components/QuestionCard.tsx`
- Modify: `src/components/QuestionScreen.tsx` (render QuestionCard instead of bare `<h2>`)
- Test: `src/components/QuestionCard.test.tsx`

**Interfaces:**
- Produces: `QuestionCard({ question }: { question: Question })`. With `slots`: renders `.mono` chip `vs {who.toUpperCase()}`, `<h2>` = `what` (display font, capitalize first letter), one-line problem `<p>`. Without slots: `<h2>{question.text}</h2>` (exact current behavior — the App.flow tests that find questions by heading text must keep passing for legacy questions).

- [ ] **Step 1: Failing test:**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QuestionCard } from './QuestionCard'
const base = { qid: 'q', v: 1, status: 'draft', category: 'takedowns', axis: 'positional', input: 'ability_axis',
  text: 'Against a same-rank partner in their closed guard, I pass before they threaten a sweep or submission',
  tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] } as const

describe('QuestionCard', () => {
  it('renders slots as who-chip, big what, problem line', () => {
    render(<QuestionCard question={{ ...base, slots: { who: 'same rank', what: 'their closed guard', problem: 'Do you pass before they threaten a sweep or submission?' } }} />)
    expect(screen.getByText('vs SAME RANK')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Their closed guard' })).toBeInTheDocument()
    expect(screen.getByText('Do you pass before they threaten a sweep or submission?')).toBeInTheDocument()
  })
  it('falls back to canonical text as the heading when no slots', () => {
    render(<QuestionCard question={base} />)
    expect(screen.getByRole('heading', { name: base.text })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2–4:** RED → implement + swap into QuestionScreen → GREEN, full suite (App.flow legacy-heading tests must still pass), build.
- [ ] **Step 5:** Commit — `feat(app): structured question card (who/what/problem slots)`

---

### Task 5: Info panel ("i" tab)

**Files:**
- Create: `src/components/InfoPanel.tsx`
- Modify: `src/components/QuestionScreen.tsx` ("i" button when current scale kind is `axis` — QuestionScreen needs the scale; it already looks it up), `src/components/results/ResultsPage.tsx` ("i" button near radar)
- Test: `src/components/InfoPanel.test.tsx`

**Interfaces:**
- Produces: `InfoPanel({ open, onClose }: { open: boolean; onClose: () => void })` — overlay `role="dialog"` `aria-modal="true"` `aria-label="How to read this chart"`, close button `Close` (`.btn-quiet`), Escape closes, background scrim click closes. Trigger buttons: `aria-label="How this chart works"`, visible glyph `i` in a 24px circle (`.mono`, border `--line`).
- Copy VERBATIM (four sections, sentence case):
  1. Heading `How to read this chart`. Body: `Each curve is a belt population. The horizontal axis is ability — further right, harder to deal with. The curves overlap on purpose: an exceptional purple belt is a harder round than an out-of-practice black belt. Belt color is a decent proxy for ability, not a guarantee.`
  2. `One tap answers the question. Place the line where opponents start to shut this down. Left of your line: it works more often than not. Right of your line: where it starts to fail.`
  3. `No answer to this yet is honest data too — it marks a place to start, not a failure.`
  4. `The curves are illustrative — informed by public belt-registration data, directional rather than scientific. Your tap is a self-estimate, and self-assessment tracks measured skill at about r ≈ .29. Read the picture as a mirror, not a measurement.`

- [ ] **Step 1: Failing test:**

```tsx
describe('InfoPanel', () => {
  it('renders all four explainer sections when open', () => {
    render(<InfoPanel open onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'How to read this chart' })).toBeInTheDocument()
    expect(screen.getByText(/belt population/)).toBeInTheDocument()
    expect(screen.getByText(/works more often than not/)).toBeInTheDocument()
    expect(screen.getByText(/marks a place to start, not a failure/)).toBeInTheDocument()
    expect(screen.getByText(/mirror, not a measurement/)).toBeInTheDocument()
  })
  it('closes on Escape and on the Close button', () => {
    const fn = vi.fn()
    render(<InfoPanel open onClose={fn} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(fn).toHaveBeenCalledTimes(2)
  })
  it('renders nothing when closed', () => {
    render(<InfoPanel open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

Plus a QuestionScreen integration assertion: an axis-input question shows a button `How this chart works`; a tap-scale question does not.

- [ ] **Step 2–4:** RED → implement → GREEN, full suite, build.
- [ ] **Step 5:** Commit — `feat(app): info panel explaining the ability-axis chart`

---

### Task 6: Draft content rework + bank:review slots

**Files:**
- Modify: `src/data/question-bank/questions/positional.json`, `meta-qualities.json` (draft records in place), `src/lib/bank/review.ts`, `src/data/question-bank/CHANGELOG.md`
- Regenerate + commit: `docs/bank-review.md`
- Test: `src/lib/bank/seed-content.test.ts` (extend)

**Rework rules (content task — wording quality is the deliverable):**
- Every draft that was `ladder6` or `belt_threshold` (15 sweep + pilot ladder6 rewrites + 3 pilot belt_threshold items) → `input: "ability_axis"` + authored `slots`. The pilot belt_threshold items merge INTO the corresponding axis items where redundant — a merged-away draft record is DELETED (drafts are not released; deletion is legal for drafts, note it in CHANGELOG).
- `slots.who` from a fixed vocabulary (lowercase): `same rank` | `any rank` | `bigger, same rank` | `higher belts`. `slots.what` is possessive and concrete (`their closed guard`, `my half guard`, `standing exchanges`). `slots.problem` is one question sentence ending in `?`, linter-clean.
- Canonical `text` stays a full sentence (review/linter/back-compat) and must agree with the slots.
- `frequency10`, `received_feedback`, `agree3`, `know_check` drafts KEEP their inputs (they are not threshold questions). Meta-qualities ladder6 items → ability_axis with slots; `mq_no_guard_recovery` (frequency10, inverted) stays as-is.
- 2 worked examples to copy the pattern from (author the rest to match):

```jsonc
// sweep, closed_guard_top
{ "qid": "cgt_pass_live", "input": "ability_axis",
  "slots": { "who": "same rank", "what": "their closed guard", "problem": "Do you pass before they threaten a sweep or submission?" },
  "text": "Against a same-rank partner in their closed guard, I pass before they threaten a sweep or submission" }
// pilot, takedowns (was td_belt_takedowns belt_threshold — merged into the axis rewrite)
{ "qid": "td_takedown_live", "input": "ability_axis",
  "slots": { "who": "any rank", "what": "standing exchanges", "problem": "Do you complete a takedown against full resistance?" },
  "text": "In standing exchanges against full resistance, I complete a takedown" }
```

- review.ts: when a question has slots, render the item line as `` - vs {who} — {what} — {problem} `` with the canonical text underneath in italics; drafts keep the `🚧 DRAFT — ` prefix on the slots line.
- CHANGELOG `[Unreleased — drafts]` section gains a rework note incl. the deleted merged records by qid.

- [ ] **Step 1: Failing test** (extend `seed-content.test.ts`):

```ts
it('all axis drafts carry complete slots with fixed who-vocabulary', () => {
  const axisDrafts = bank.questions.filter(q => q.status === 'draft' && q.input === 'ability_axis')
  expect(axisDrafts.length).toBeGreaterThanOrEqual(25)   // 15 sweep + ≥10 pilot/meta rewrites
  for (const q of axisDrafts) {
    expect(q.slots, q.qid).toBeDefined()
    expect(['same rank', 'any rank', 'bigger, same rank', 'higher belts'], q.qid).toContain(q.slots!.who)
    expect(q.slots!.problem.endsWith('?'), q.qid).toBe(true)
  }
})
it('slots are linter-clean on axis drafts', () => {
  const axisDrafts = bank.questions.filter(q => q.status === 'draft' && q.input === 'ability_axis')
  for (const q of axisDrafts) expect(lintQuestion(q), q.qid).toEqual([])
})
it('no draft belt_threshold or ladder6 skill items remain', () => {
  const stale = bank.questions.filter(q => q.status === 'draft' && ['belt_threshold', 'ladder6'].includes(q.input))
  expect(stale.map(q => q.qid)).toEqual([])
})
it('active bank still untouched: 173 active', () => {
  expect(bank.questions.filter(q => q.status === 'active')).toHaveLength(173)
})
```

(Existing seed-content tests: the draft-count ≥40 total and psych/partner rules still hold; the earlier `15 sweep, one per category, input ladder6` assertion must be UPDATED to `input ability_axis` — that is a legitimate spec change from Appendix B, note it in the commit message.)

- [ ] **Step 2–5:** RED → rework content + review.ts → `npm run bank:validate` (0 errors) → `npm run bank:review` regenerate + commit → full suite + build green.
- [ ] **Step 6:** Commit — `feat(bank): rework drafts to ability-axis + slots per Appendix B 2026-07-19`

---

### Task 7: Screenshots + walkthrough

**Files:**
- Modify: `scripts/screenshot-walkthrough.mjs`, `README.md`
- Commit: updated `docs/screenshots/` incl. `07-axis-widget.png`, `08-info-panel.png`

- [ ] **Step 1:** Extend the script: in the `?bank=draft` context, capture the first sweep question (now an axis question) BEFORE tap as part of 06; then click at ~62% of the axis width → `07-axis-widget.png` (vertical line + wash visible); click the `How this chart works` button → `08-info-panel.png`. ONE headless chromium, closed in finally, per machine constraints.
- [ ] **Step 2:** Run with dev server; LOOK at every new/changed PNG (Read tool): five distinguishable curves (white curve visible against background), vertical line at click point, works/struggles microlabels, info panel copy readable. Fix rendering issues before committing.
- [ ] **Step 3:** Full `npm test` + `npm run build`; commit — `docs: axis widget + info panel walkthrough captures`

---

## Phase-3 Definition of Done

- Draft-mode sweep presents structured cards with the bell-curve axis; one tap places the vertical line; floor chip works; keyboard path works.
- Info panel reachable from axis questions and results; copy verbatim.
- All axis drafts slots-complete, fixed who-vocabulary, linter-clean incl. slots; active bank untouched (173); validate 0 errors.
- bank:review renders slots so Gerald reviews the new structure in one page.
- Screenshots 07/08 committed and visually verified.
- NOT in scope: activating any draft; retiring ladder6/belt_threshold scales (actives still use slider10/belt_curve; scale retirement is Gerald's call after play-testing); axis-aware execution-gap.

## After completion

- `/deban sync`: record the axis-system decisions (curves-as-data, floor=0 semantics, in-place draft rework) + close/annotate the ux structured-cards open question.
- Telegram Gerald: play-test link + what to look at.
