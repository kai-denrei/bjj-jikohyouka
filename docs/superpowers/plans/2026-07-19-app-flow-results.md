# App, Flow & Results (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user-facing assessment app on top of the phase-1 bank: tap-only input widgets (§5), intake (§6), resumable sweep→drill-down flow (§7), provisional scoring + Results v2 (§8, §4.3), and §9 seed content in draft status.

**Architecture:** Pure logic modules (`src/lib/results/`, `src/lib/flow.ts`) tested headlessly; React components driven entirely by bank data (no question text in components — brief §10); localStorage persistence with raw answers so scoring stays recomputable. App is a single-page state machine in `App.tsx` — no router.

**Tech Stack:** React 19 + TypeScript + Vite (existing), zod (existing), vitest + jsdom + @testing-library/react (new dev deps), @fontsource packages for fonts. No chart library — radar is hand-rolled SVG. No sliders anywhere (§5).

## Global Constraints

- Brief at repo root `skill-check-v0.2-build-brief.md`; §5–§9 are this phase's spec. Phase-1 modules already exist: `src/lib/bank/schema.ts` (types `Bank`, `Question`, `Scale`, `Category`), `src/lib/bank/load.ts` (`loadBank`), `src/lib/bank/lint.ts`, bank data in `src/data/question-bank/` (bank 1.0.0: 173 active, all slider10/belt_curve).
- **No question text, anchor labels, or category names hard-coded in components** — everything renders from the bank (brief §10). Copy that is app-chrome (buttons, intro, epigraph) is specified verbatim below and IS allowed in components.
- **Tap-only inputs.** Never render an `<input type="range">`. Minimum tap target height 48px (`--tap: 48px`).
- **Scoring normalization is PROVISIONAL** (deban pm.md open question #3, undecided by Gerald). It must live in ONE table in `score.ts` with a comment block marking it provisional. Stored results keep RAW answers (`{qid, v, raw}` per §4.3) so re-scoring after the decision changes nothing stored.
- **Psychological/`countsToward !== "skill"` items never enter category scores** (brief §4.2); enjoyment answers feed insights only.
- **Kill the single composite %** — no overall score anywhere on the results page (§8).
- **Bands** (ladder math, rung = score/20): `Unmapped (<20) · Learning (20–39) · Drilling (40–59) · Positional (60–79) · Rolling (80–99) · Weapon (100)`.
- **Design tokens (binding):** background `--mat:#F4F4F1`; text `--ink:#23304A`; secondary `--ink-2:#6B7284`; hairline `--line:#D8DAD3`; interaction accent `--accent:#35509E`; belt colors ONLY where they mean rank: `--belt-white:#E9E7E0` (always with 1px `--line` border), `--belt-blue:#3F6BB5`, `--belt-purple:#6E4C9F`, `--belt-brown:#7A5230`, `--belt-black:#1A1A1A`; radius `6px`. Fonts: Bricolage Grotesque (display, weights 600–800), Atkinson Hyperlegible (body), IBM Plex Mono (counters/data). No other hues, no gradients, no emoji in UI chrome. Signature element: the **belt-stripe progress bar** (Task 6) — one per app, nothing else competes with it.
- **Copy register:** sentence case, active voice, honest. Verbatim strings specified per task. Never comparative-to-others framing (§8: progress vs self).
- Mobile-first at 390px; single column; content max-width 560px centered on wider screens; visible keyboard focus (`:focus-visible` outline `2px solid var(--accent)`); respect `prefers-reduced-motion`.
- All §9 content ships `status: "draft"` with `rationale` containing `PLACEHOLDER — pending Gerald review`. Drafts NEVER render without `?bank=draft`.
- `npm run bank:validate` must exit 0 after every content change; run it in any task that touches `src/data/question-bank/`.
- Commit trailer on every commit: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

```
src/styles/tokens.css              # design tokens + base element styles (Task 1)
src/lib/results/types.ts           # StoredAnswer, Intake, AssessmentSession, zod schemas (Task 2)
src/lib/results/store.ts           # localStorage session + history + export/import (Task 2)
src/lib/results/score.ts           # provisional scoring: (answers, bank) → Report (Task 3)
src/lib/flow.ts                    # pure flow helpers: sweep/drilldown selection, recommendations (Task 6)
src/components/inputs/TapScale.tsx     # all tap scales incl. slider10-as-chips (Task 4)
src/components/inputs/BeltCurve.tsx    # showcase draw-across-belts widget (Task 4)
src/components/inputs/QuestionInput.tsx# dispatcher by scale.kind (Task 4)
src/components/IntakeStep.tsx          # belt/years/style/sessions chips (Task 5)
src/components/BeltStripeBar.tsx       # signature progress bar (Task 6)
src/components/QuestionScreen.tsx      # one-question-at-a-time runner (Task 6)
src/components/InterimScreen.tsx       # post-sweep light result + recommendations (Task 6)
src/components/results/Radar.tsx       # hand-rolled SVG radar (Task 7)
src/components/results/BandList.tsx    # sorted analytic list (Task 7)
src/components/results/ResultsPage.tsx # assembly: radar hero, bands, gaps, insights, export (Task 7)
src/App.tsx                        # state machine wiring all screens (Task 6/7 modify)
src/data/question-bank/questions/{positional,meta-qualities,reputation}.json  # +drafts (Task 8)
scripts/screenshot-walkthrough.mjs # playwright capture at 390px (Task 9)
```

---

### Task 1: UI test infra, fonts, design tokens, app shell

**Files:**
- Modify: `package.json`, `vite.config.ts` (or create `vitest.config.ts`), `src/main.tsx`
- Create: `src/styles/tokens.css`
- Replace: `src/App.tsx`, delete `src/App.css`, gut `src/index.css` (keep only an import of tokens.css)
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: CSS custom properties named exactly as in Global Constraints; classes `.btn` (accent-filled primary button), `.btn-quiet` (outline), `.chip` (tap chip, `min-height: var(--tap)`), `.mono` (Plex Mono). App renders screen `intro` with a Start button. Later tasks import `src/styles/tokens.css` ambiently (imported once in `main.tsx`).

- [ ] **Step 1: Install deps**

```bash
npm i -D jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm i @fontsource/bricolage-grotesque @fontsource/atkinson-hyperlegible @fontsource/ibm-plex-mono
```

- [ ] **Step 2: Configure vitest for jsdom.** In `vite.config.ts` add a `test` block (import `defineConfig` from `vitest/config`):

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.ts'],
}
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
afterEach(() => { cleanup(); localStorage.clear() })
```

Note: the phase-1 node tests (fs reads) still pass under jsdom — vitest's jsdom env keeps node builtins. Verify with `npm test` (42 existing tests must stay green).

- [ ] **Step 3: Write the failing shell test** — `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('opens on the intro screen with honest framing and a start button', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Skill-Check' })).toBeInTheDocument()
    expect(screen.getByText(/structured mirror/i)).toBeInTheDocument()
    expect(screen.getByText(/r ≈ \.29/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start the sweep' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run to verify it fails** — `npx vitest run src/App.test.tsx` → FAIL (old template App).

- [ ] **Step 5: Implement.** `src/styles/tokens.css` — the tokens from Global Constraints as `:root` custom props, plus:

```css
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
:root {
  --mat:#F4F4F1; --ink:#23304A; --ink-2:#6B7284; --line:#D8DAD3; --accent:#35509E;
  --belt-white:#E9E7E0; --belt-blue:#3F6BB5; --belt-purple:#6E4C9F; --belt-brown:#7A5230; --belt-black:#1A1A1A;
  --radius:6px; --tap:48px;
  --font-display:'Bricolage Grotesque', system-ui, sans-serif;
  --font-body:'Atkinson Hyperlegible', system-ui, sans-serif;
  --font-mono:'IBM Plex Mono', ui-monospace, monospace;
}
body { background: var(--mat); color: var(--ink); font-family: var(--font-body); margin: 0; }
#root { max-width: 560px; margin: 0 auto; padding: 16px; min-height: 100dvh; }
h1, h2, h3 { font-family: var(--font-display); letter-spacing: -0.01em; }
button { font: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn { min-height: var(--tap); width: 100%; border: 0; border-radius: var(--radius); background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; }
.btn-quiet { min-height: var(--tap); width: 100%; border: 1px solid var(--line); border-radius: var(--radius); background: transparent; color: var(--ink); cursor: pointer; }
.chip { min-height: var(--tap); border: 1px solid var(--line); border-radius: var(--radius); background: #fff; color: var(--ink); cursor: pointer; padding: 8px 12px; text-align: left; }
.chip[aria-pressed="true"] { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.mono { font-family: var(--font-mono); font-size: 13px; color: var(--ink-2); }
```

`src/main.tsx`: import the three @fontsource packages (weights: bricolage 600+700, atkinson 400+700, plex-mono 400) and `./styles/tokens.css`; drop the old index.css import (gut `src/index.css` to a single comment or delete + remove import). `src/App.tsx`: minimal state machine skeleton —

```tsx
import { useState } from 'react'
type Screen = 'intro' | 'intake' | 'sweep' | 'interim' | 'category' | 'results'
export default function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  if (screen === 'intro') return (
    <main>
      <h1>Skill-Check</h1>
      <p>A structured mirror for your grappling — not a verdict. Self-assessed skill correlates about r ≈ .29 with measured skill, so treat every number here as a starting point for a conversation with your training.</p>
      <button className="btn" onClick={() => setScreen('intake')}>Start the sweep</button>
    </main>
  )
  return <main /> // subsequent screens land in Tasks 5–7
}
```

Delete `src/App.css`, remove template assets usage (`src/assets/react.svg` import etc.).

- [ ] **Step 6: Run** — `npx vitest run src/App.test.tsx` PASS, then full `npm test` (42 + 1 green), then `npm run build` (validate → tsc → vite all green).

- [ ] **Step 7: Commit** — `feat(app): design tokens, fonts, jsdom test infra, intro shell`

---

### Task 2: Results store (§4.3 persistence)

**Files:**
- Create: `src/lib/results/types.ts`, `src/lib/results/store.ts`
- Test: `src/lib/results/store.test.ts`

**Interfaces:**
- Produces (types.ts):

```ts
import { z } from 'zod'
export const StoredAnswerSchema = z.object({
  qid: z.string(), v: z.number().int().min(1),
  raw: z.union([z.number(), z.array(z.number()), z.null()]),  // null = N/A tap
}).strict()
export const IntakeSchema = z.object({
  belt: z.enum(['white', 'blue', 'purple', 'brown', 'black']),
  years: z.enum(['<1', '1-3', '3-6', '6-10', '10+']),
  style: z.enum(['gi', 'nogi', 'both']),
  sessionsPerWeek: z.enum(['1-2', '3-4', '5+']),
}).strict()
export const AssessmentSessionSchema = z.object({
  bankVersion: z.string(), startedAt: z.string(), updatedAt: z.string(),
  intake: IntakeSchema.nullable(),
  answers: z.record(z.string(), StoredAnswerSchema),
  completedCategories: z.array(z.string()),
}).strict()
export const ExportFileSchema = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(AssessmentSessionSchema),
}).strict()
export type StoredAnswer = z.infer<typeof StoredAnswerSchema>
export type Intake = z.infer<typeof IntakeSchema>
export type AssessmentSession = z.infer<typeof AssessmentSessionSchema>
```

- Produces (store.ts): `loadSession(): AssessmentSession | null` (zod-validated; corrupt → null), `saveSession(s): void` (stamps `updatedAt`), `clearSession(): void`, `finishSession(s): void` (append to history, newest first, cap 20, clear current), `listHistory(): AssessmentSession[]`, `exportJSON(): string` (ExportFile of history + current if any), `importJSON(text): { ok: true; imported: number } | { ok: false; error: string }` (validates, MERGES into history by `startedAt` uniqueness). Storage keys `skillcheck.session.v1` / `skillcheck.history.v1`.

- [ ] **Step 1: Failing test** — `src/lib/results/store.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { loadSession, saveSession, clearSession, finishSession, listHistory, exportJSON, importJSON } from './store'
import type { AssessmentSession } from './types'

const session = (over: Partial<AssessmentSession> = {}): AssessmentSession => ({
  bankVersion: '1.0.0', startedAt: '2026-07-19T10:00:00Z', updatedAt: '2026-07-19T10:00:00Z',
  intake: null, answers: { td_002: { qid: 'td_002', v: 1, raw: [8, 6, 4, 2, 1] } },
  completedCategories: ['takedowns'], ...over,
})

describe('results store', () => {
  it('round-trips a session and stamps updatedAt on save', () => {
    expect(loadSession()).toBeNull()
    saveSession(session())
    const loaded = loadSession()!
    expect(loaded.answers.td_002.raw).toEqual([8, 6, 4, 2, 1])
    expect(loaded.updatedAt >= '2026-07-19T10:00:00Z').toBe(true)
  })
  it('returns null on corrupt storage instead of throwing', () => {
    localStorage.setItem('skillcheck.session.v1', '{nope')
    expect(loadSession()).toBeNull()
  })
  it('finishSession moves current to history newest-first and clears current', () => {
    saveSession(session({ startedAt: 'a' })); finishSession(loadSession()!)
    saveSession(session({ startedAt: 'b' })); finishSession(loadSession()!)
    expect(loadSession()).toBeNull()
    expect(listHistory().map(s => s.startedAt)).toEqual(['b', 'a'])
  })
  it('export → import round-trip merges without duplicates', () => {
    saveSession(session({ startedAt: 'a' })); finishSession(loadSession()!)
    const blob = exportJSON()
    const res = importJSON(blob)
    expect(res).toEqual({ ok: true, imported: 0 })  // same startedAt → merged, not duplicated
    expect(listHistory()).toHaveLength(1)
  })
  it('rejects invalid import with a message, storage untouched', () => {
    const res = importJSON('{"schemaVersion":2}')
    expect(res.ok).toBe(false)
    expect(listHistory()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run** → FAIL (module missing). **Step 3: Implement** types.ts exactly as in Interfaces; store.ts with a `readJson(key, schema)` helper (try/parse/validate → null). **Step 4: Run** → 5 PASS, full suite green. **Step 5: Commit** — `feat(results): session store with export/import (§4.3 raw answers)`

---

### Task 3: Provisional scoring

**Files:**
- Create: `src/lib/results/score.ts`
- Test: `src/lib/results/score.test.ts`

**Interfaces:**
- Consumes: `Bank`, `Question` from `../bank/schema`; `StoredAnswer` from `./types`.
- Produces:

```ts
export type Band = 'Unmapped' | 'Learning' | 'Drilling' | 'Positional' | 'Rolling' | 'Weapon'
export interface CategoryScore {
  categoryId: string; name: string; axis: string
  score: number | null            // 0–100, null when nothing answered
  band: Band | null
  answered: number; activeCount: number
  uncertainty: 'none' | 'wide' | 'medium' | 'narrow'
  toNextBand: number | null       // points to next band edge, null at Weapon/unscored
}
export interface Insight { categoryId: string; kind: 'avoidance'; text: string }
export interface Report { bankVersion: string; categories: CategoryScore[]; insights: Insight[] }
export function scoreAnswers(answers: Record<string, StoredAnswer>, bank: Bank): Report
```

- **The PROVISIONAL normalization table** (raw → 0..1), one exported const so the future decision is a one-place change:

```ts
// PROVISIONAL normalization — pm.md open question #3 (cross-input comparability)
// is UNDECIDED by Gerald. Stored results keep raw answers (§4.3), so changing
// this table re-scores everything consistently and breaks nothing stored.
export const PROVISIONAL_NORMALIZATION: Record<string, (raw: number | number[]) => number> = {
  ladder6: r => (r as number) / 5,
  belt_threshold: r => (r as number) / 5,
  frequency10: r => (r as number) / 3,
  received_feedback: r => (r as number) / 2,
  know_check: r => (r as number) / 2,
  agree3: r => (r as number) / 2,          // never reaches skill scores (countsToward gate)
  belt_curve: r => (r as number[]).reduce((a, b) => a + b, 0) / ((r as number[]).length * 10),
  slider10: r => ((r as number) - 1) / 9,
}
```

- Rules: only `scoring.countsToward === 'skill'` and `status === 'active'` (plus `draft` when the answered qid is a draft — score whatever was answered) questions enter category scores; `raw === null` (N/A) answers are skipped; category score = `100 * Σ(norm·weight) / Σweight`; band edges 20/40/60/80/100 per Global Constraints; uncertainty: 0 answered `none`, 1 `wide`, `< activeCount` `medium`, `≥ activeCount` `narrow`; insight `avoidance` when an `agree3` answer in the category has `raw === 0` AND category score < 40, text verbatim: `You rated this position low and don't enjoy it. That loop feeds itself — low-stakes positional rounds here beat avoiding it.`

- [ ] **Step 1: Failing test** — `src/lib/results/score.test.ts` (build a small in-memory `Bank` fixture; do NOT load the real bank — unit isolation):

```ts
import { describe, it, expect } from 'vitest'
import { scoreAnswers, PROVISIONAL_NORMALIZATION } from './score'
import type { Bank } from '../bank/schema'

const bank: Bank = {
  meta: { bankVersion: '1.0.0', releasedAt: '2026-07-18', changelog: './CHANGELOG.md' },
  categories: [
    { id: 'takedowns', name: 'Takedowns', axis: 'positional', weight: 1.2 },
    { id: 'mount_top', name: 'Mount top', axis: 'positional', weight: 1.0 },
  ],
  scales: [
    { id: 'ladder6', kind: 'tap', label: 'L', secondsPerItem: 6, anchors: [{ value: 0, label: 'a' }, { value: 5, label: 'b' }] },
    { id: 'agree3', kind: 'tap', label: 'A', secondsPerItem: 6, anchors: [{ value: 0, label: 'a' }, { value: 2, label: 'b' }] },
  ],
  questions: [
    { qid: 'td_a', v: 1, status: 'active', category: 'takedowns', axis: 'positional', input: 'ladder6', text: 'q', tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] },
    { qid: 'td_b', v: 1, status: 'active', category: 'takedowns', axis: 'positional', input: 'ladder6', text: 'q', tier: 'drilldown', scoring: { weight: 2, countsToward: 'skill' }, flags: [] },
    { qid: 'td_joy', v: 1, status: 'active', category: 'takedowns', axis: 'psychological', input: 'agree3', text: 'q', tier: 'drilldown', scoring: { weight: 1, countsToward: 'none' }, flags: [] },
    { qid: 'mt_a', v: 1, status: 'active', category: 'mount_top', axis: 'positional', input: 'ladder6', text: 'q', tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] },
  ],
}
const a = (qid: string, raw: number | number[] | null) => ({ qid, v: 1, raw })

describe('scoreAnswers (provisional)', () => {
  it('weights within category: ladder 5 (w1) + ladder 2 (w2) → 100*(1*1 + 0.4*2)/3 = 60', () => {
    const r = scoreAnswers({ td_a: a('td_a', 5), td_b: a('td_b', 2) }, bank)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.score).toBe(60)
    expect(td.band).toBe('Positional')
    expect(td.toNextBand).toBe(20)
  })
  it('psychological answers never move the score but do fire the avoidance insight when score < 40', () => {
    const r = scoreAnswers({ td_b: a('td_b', 1), td_joy: a('td_joy', 0) }, bank)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.score).toBe(20)
    expect(r.insights).toEqual([{ categoryId: 'takedowns', kind: 'avoidance', text: expect.stringContaining('loop feeds itself') }])
  })
  it('single answer → wide uncertainty; unanswered category → null score, none', () => {
    const r = scoreAnswers({ td_a: a('td_a', 3) }, bank)
    expect(r.categories.find(c => c.categoryId === 'takedowns')!.uncertainty).toBe('wide')
    const mt = r.categories.find(c => c.categoryId === 'mount_top')!
    expect(mt.score).toBeNull(); expect(mt.uncertainty).toBe('none')
  })
  it('N/A raw is skipped, belt_curve normalizes by mean/10', () => {
    expect(PROVISIONAL_NORMALIZATION.belt_curve([10, 10, 10, 10, 10])).toBe(1)
    const r = scoreAnswers({ td_a: a('td_a', null) }, bank)
    expect(r.categories.find(c => c.categoryId === 'takedowns')!.score).toBeNull()
  })
  it('score 100 is Weapon with no next band', () => {
    const r = scoreAnswers({ td_a: a('td_a', 5), td_b: a('td_b', 5) }, bank)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.band).toBe('Weapon'); expect(td.toNextBand).toBeNull()
  })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** per Interfaces (band edges: `<20, <40, <60, <80, <100, ===100`; round scores to nearest integer with `Math.round`). **Step 4: Run** → 5 PASS + suite green. **Step 5: Commit** — `feat(results): provisional scoring with one-table normalization`

---

### Task 4: Input widgets

**Files:**
- Create: `src/components/inputs/TapScale.tsx`, `src/components/inputs/BeltCurve.tsx`, `src/components/inputs/QuestionInput.tsx`
- Test: `src/components/inputs/inputs.test.tsx`

**Interfaces:**
- Consumes: `Scale` type from `../../lib/bank/schema`.
- Produces:

```ts
// TapScale: all kind:'tap' scales AND kind:'slider' legacy rendered as chips
interface TapScaleProps { scale: Scale; value: number | null; onChange: (v: number | null) => void }
// BeltCurve: value = number[5] of 1–10 per belt column (W,B,P,Br,Bk order), null until first tap
interface BeltCurveProps { scale: Scale; value: number[] | null; onChange: (v: number[]) => void }
// QuestionInput: dispatcher — kind 'curve' → BeltCurve, else TapScale
interface QuestionInputProps { scale: Scale; value: number | number[] | null; onChange: (v: number | number[] | null) => void }
```

- Render contract (the tests below pin it): TapScale renders one `.chip` button per anchor, **full anchor label as the button text**, stacked vertically for scales with ≥4 anchors, in a horizontal row (`.chip-row`) for ≤3-anchor scales and for `belt_threshold`; selected chip has `aria-pressed="true"`; `scale.na === true` adds a final chip labeled `N/A` which calls `onChange(null)`; `scale.id === 'belt_threshold'` prefixes each chip with a belt swatch `<span class="belt-dot" data-belt="white|blue|purple|brown|black">` (values 1–5; value 0 "Untrained" gets no dot) colored via the belt tokens; **kind `slider` (slider10 legacy)** renders 10 numeric chips 1–10 in a row (anchor labels shown once as caption under the row: first and last anchor label). BeltCurve renders 5 columns labeled from `scale.anchors` labels; each column is 10 stacked tap cells (`button` role, `aria-label` like `White: 7 of 10`); tapping cell k in column i produces a new array where column i = k, other columns keep prior value (default 5 for untouched columns on first tap).

- [ ] **Step 1: Failing tests** — `src/components/inputs/inputs.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TapScale } from './TapScale'
import { BeltCurve } from './BeltCurve'
import { QuestionInput } from './QuestionInput'
import { loadBank } from '../../lib/bank/load'

const bank = loadBank()
const scale = (id: string) => bank.scales.find(s => s.id === id)!

describe('TapScale', () => {
  it('renders every ladder6 anchor as a full-label chip', () => {
    render(<TapScale scale={scale('ladder6')} value={null} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: "I don't know what to do here" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Works vs bigger/higher rank — could teach it' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })
  it('fires onChange with the anchor value and marks selection', () => {
    const fn = vi.fn()
    const { rerender } = render(<TapScale scale={scale('ladder6')} value={null} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Works in drilling / cooperative' }))
    expect(fn).toHaveBeenCalledWith(2)
    rerender(<TapScale scale={scale('ladder6')} value={2} onChange={fn} />)
    expect(screen.getByRole('button', { name: 'Works in drilling / cooperative' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('belt_threshold offers N/A (→ null) and belt swatches for ranked chips', () => {
    const fn = vi.fn()
    render(<TapScale scale={scale('belt_threshold')} value={null} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'N/A' }))
    expect(fn).toHaveBeenCalledWith(null)
    expect(document.querySelectorAll('.belt-dot')).toHaveLength(5)  // W B P Br Bk, not Untrained
  })
  it('legacy slider10 renders as 10 tap chips, never a range input', () => {
    render(<TapScale scale={scale('slider10')} value={null} onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(10)
    expect(document.querySelector('input[type="range"]')).toBeNull()
  })
})

describe('BeltCurve', () => {
  it('renders 5 belt columns of 10 cells and sets the tapped column', () => {
    const fn = vi.fn()
    render(<BeltCurve scale={scale('belt_curve')} value={null} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'White: 8 of 10' }))
    expect(fn).toHaveBeenCalledWith([8, 5, 5, 5, 5])
  })
})

describe('QuestionInput', () => {
  it('dispatches curve scales to BeltCurve and tap scales to TapScale', () => {
    render(<QuestionInput scale={scale('belt_curve')} value={null} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Black: 1 of 10' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** to the render contract (add `.chip-row`, `.belt-dot` styles to tokens.css: dot 12px circle, `[data-belt="white"]` uses `--belt-white` + border). **Step 4: Run** → PASS + suite green. **Step 5: Commit** — `feat(app): tap-only input widgets incl. belt-curve showcase`

---

### Task 5: Intake step (§6)

**Files:**
- Create: `src/components/IntakeStep.tsx`
- Test: `src/components/IntakeStep.test.tsx`

**Interfaces:**
- Consumes: `Intake` type from `../lib/results/types`.
- Produces: `IntakeStep({ onSubmit }: { onSubmit: (i: Intake | null) => void })`. Four chip groups with these exact group labels and chip labels: `Belt` → White/Blue/Purple/Brown/Black; `Time training` → <1 yr / 1–3 yrs / 3–6 yrs / 6–10 yrs / 10+ yrs; `Style` → Gi / No-gi / Both; `Sessions per week` → 1–2 / 3–4 / 5+. Copy line verbatim: `Your belt changes what a strong profile looks like. This stays on your device.` Buttons: `Continue` (disabled until all four picked) and `Skip for now` (→ `onSubmit(null)`).

- [ ] **Step 1: Failing test** — `src/components/IntakeStep.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IntakeStep } from './IntakeStep'

describe('IntakeStep', () => {
  it('submits the four choices', () => {
    const fn = vi.fn()
    render(<IntakeStep onSubmit={fn} />)
    expect(screen.getByText(/stays on your device/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Purple' }))
    fireEvent.click(screen.getByRole('button', { name: '3–6 yrs' }))
    fireEvent.click(screen.getByRole('button', { name: 'Both' }))
    fireEvent.click(screen.getByRole('button', { name: '3–4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(fn).toHaveBeenCalledWith({ belt: 'purple', years: '3-6', style: 'both', sessionsPerWeek: '3-4' })
  })
  it('skip submits null', () => {
    const fn = vi.fn()
    render(<IntakeStep onSubmit={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(fn).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2–5:** RED → implement → GREEN → commit `feat(app): intake step (§6)`

---

### Task 6: Flow — sweep, drill-downs, resumability, signature progress bar

**Files:**
- Create: `src/lib/flow.ts`, `src/components/BeltStripeBar.tsx`, `src/components/QuestionScreen.tsx`, `src/components/InterimScreen.tsx`
- Modify: `src/App.tsx` (wire intro → intake → sweep → interim → category runs → results trigger)
- Test: `src/lib/flow.test.ts`, `src/App.flow.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5; `loadBank` (import the bank ONCE in App via a `src/lib/bankInstance.ts` — create it here: `export const bank = loadBank()` — components receive data as props, never load themselves). NOTE for the browser: `loadBank` uses node `fs`, which does not bundle. `bankInstance.ts` must instead import the five JSON files directly (`import meta from '../data/question-bank/bank.meta.json'` etc.) and assemble the same `Bank` shape with zod parsing. This is the ONLY place allowed to import bank JSON.
- Produces (flow.ts, pure):

```ts
export function includeDrafts(search: string): boolean            // '?bank=draft' → true
export function visibleQuestions(bank: Bank, drafts: boolean): Question[]  // active + (draft if flag), never retired
export function sweepQuestions(bank: Bank, drafts: boolean): Question[]    // tier core, one per category in categories order; when drafts=true a draft core REPLACES the active core of the same category
export function drilldownQuestions(bank: Bank, categoryId: string, drafts: boolean): Question[]
export function recommendedDrilldowns(report: Report, bank: Bank): string[]  // 3 lowest non-null scored category ids + any category with score ≤ 40 (≈ ladder ≤2), deduped, positional axis only
```

- `BeltStripeBar({ total, done }: { total: number; done: number })` — the signature: a horizontal bar styled as a belt (height 14px, `--ink` background, radius 3px) with `total` stripe slots; `done` of them filled with `--mat`-colored stitched stripes (2px white gaps). Renders `role="progressbar"` with `aria-valuenow={done}` `aria-valuemax={total}`.
- `QuestionScreen({ questions, answers, onAnswer, onDone, heading }: { questions: Question[]; answers: Record<string, StoredAnswer>; onAnswer: (a: StoredAnswer) => void; onDone: () => void; heading: string })` — one question at a time; header line 1 `.mono`: `heading` (e.g. `Takedowns & Wrestling · 3 of 15`); shows question text as `<h2>`, `QuestionInput` below; auto-advances 250ms after an answer (`setTimeout`; skipped under reduced-motion → advance immediately); `Back` quiet button; calls `onDone()` after the last question.
- `InterimScreen({ report, onPick, onResults, recommended }: ...)` — copy verbatim: heading `First picture`, sub `Fifteen answers is a sketch. Sharpen the categories that matter to you.`; a chip per recommended category (label = category name), a `See results` primary button, plus a quiet chip row for every other positional category under `Or pick any category`.
- App wiring: on mount, if `loadSession()` returns a session, show resume banner with `Continue where you left off` / `Start over` (Start over → `clearSession()`); every `onAnswer` → `saveSession`; sweep completion computes report (`scoreAnswers`) for InterimScreen; `completedCategories` tracks finished drill-downs; header shows `BeltStripeBar` with total = positional category count, done = completedCategories.length; `See results` → results screen (Task 7 renders it; until then a stub `<h2>Results</h2>` is fine and Task 7 replaces it).

- [ ] **Step 1: Failing tests** — `src/lib/flow.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { includeDrafts, sweepQuestions, drilldownQuestions, recommendedDrilldowns, visibleQuestions } from './flow'
import { loadBank } from './bank/load'
import { scoreAnswers } from './results/score'

const bank = loadBank()  // node loader is fine in tests

describe('flow selection', () => {
  it('parses the draft flag', () => {
    expect(includeDrafts('?bank=draft')).toBe(true)
    expect(includeDrafts('')).toBe(false)
  })
  it('sweep = 15 core questions, one per category, in category order', () => {
    const qs = sweepQuestions(bank, false)
    expect(qs).toHaveLength(15)
    expect(qs.map(q => q.category)).toEqual(bank.categories.map(c => c.id))
    expect(qs.every(q => q.tier === 'core' && q.status === 'active')).toBe(true)
  })
  it('drilldown excludes the core item and retired items', () => {
    const qs = drilldownQuestions(bank, 'takedowns', false)
    expect(qs.every(q => q.tier === 'drilldown' && q.status !== 'retired')).toBe(true)
    expect(qs.length).toBeGreaterThan(3)
  })
  it('never returns retired questions in any mode', () => {
    expect(visibleQuestions(bank, true).every(q => q.status !== 'retired')).toBe(true)
  })
  it('recommends the 3 lowest categories', () => {
    const answers = Object.fromEntries(sweepQuestions(bank, false).map((q, i) => [q.qid, { qid: q.qid, v: q.v, raw: i < 3 ? 2 : 8 }]))
    const recs = recommendedDrilldowns(scoreAnswers(answers, bank), bank)
    expect(recs).toHaveLength(3)
    expect(recs).toEqual(bank.categories.slice(0, 3).map(c => c.id))
  })
})
```

`src/App.flow.test.tsx` (RTL integration smoke):

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { bank } from './lib/bankInstance'

describe('App flow', () => {
  it('intro → intake → first sweep question from the bank', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    const firstCore = bank.questions.find(q => q.tier === 'core' && q.category === bank.categories[0].id)!
    expect(screen.getByRole('heading', { name: firstCore.text })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
  it('offers resume when a session exists', () => {
    localStorage.setItem('skillcheck.session.v1', JSON.stringify({
      bankVersion: '1.0.0', startedAt: 'x', updatedAt: 'x', intake: null,
      answers: {}, completedCategories: [],
    }))
    render(<App />)
    expect(screen.getByRole('button', { name: 'Continue where you left off' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** flow.ts + bankInstance.ts (browser-safe JSON imports + zod parse; add `"resolveJsonModule": true` to tsconfig.app.json if absent) + the three components + App wiring per Interfaces. **Step 4: Run** → all PASS; `npm run build` green; `npm run dev` and click through intro→intake→sweep manually. **Step 5: Commit** — `feat(app): sweep→drill-down flow, resumable sessions, belt-stripe progress`

---

### Task 7: Results v2 (§8)

**Files:**
- Create: `src/components/results/Radar.tsx`, `src/components/results/BandList.tsx`, `src/components/results/ResultsPage.tsx`
- Modify: `src/App.tsx` (replace results stub)
- Test: `src/components/results/results.test.tsx`

**Interfaces:**
- Consumes: `Report`, `CategoryScore` from `../../lib/results/score`; store fns for export/import/history.
- Produces: `ResultsPage({ report, onRetakeCategory }: { report: Report; onRetakeCategory: (categoryId: string) => void })`.
- Render contract: **analytic view first** — `BandList` (sorted desc by score, null-score categories last under a `Not yet mapped` subheading): each row shows category name, band name in a `.mono` chip, score as `NN / 100` mono text, `+N to <next band>` line when `toNextBand !== null`, and when `uncertainty === 'wide'` the caveat `rough estimate — drill down to sharpen`; a `Sharpen` quiet button per row calls `onRetakeCategory(categoryId)`. `Radar` below the list as **shareable hero**: SVG 320×320, one axis per positional category with a non-null score (skip unscored axes), polygon `fill: var(--accent)` at 0.2 opacity, `stroke: var(--accent)`, axis labels 10px Atkinson, no grid rainbow — three concentric hairline rings only. NO composite percentage anywhere. Insights section: one card per `report.insights` entry. Footer epigraph verbatim: `"All models are wrong; some are useful." — George Box` plus line `Self-assessment tracks measured skill at about r ≈ .29. Use this as a mirror, not a scoreboard.` Buttons: `Download JSON` (Blob download of `exportJSON()`), `Import JSON` (file input → `importJSON`, re-render). Retake diff: when `listHistory()` contains a previous session with the same `bankVersion`, each BandList row also shows `then NN → now NN` in `.mono` (compute previous report via `scoreAnswers(prev.answers, bank)`). Belt-stage lens (§8, only when intake was given): one line above the band list, framed as guidance not judgment, from this exact Saulo mapping — white: `At white belt, survival and escapes are the profile that matters — low guard-passing numbers are expected, not a gap.` blue: `Blue belt is escape season — judge this profile by how rarely you stay stuck.` purple: `Purple is where guard depth typically leads the profile.` brown: `At brown, passing pressure usually carries the profile.` black: `At black belt the profile is refinement — spread matters more than any single axis.` (`ResultsPage` gains optional prop `belt?: Intake['belt'] | null`.)

- [ ] **Step 1: Failing test** — `src/components/results/results.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultsPage } from './ResultsPage'
import type { Report } from '../../lib/results/score'

const report: Report = {
  bankVersion: '1.0.0',
  categories: [
    { categoryId: 'a', name: 'Alpha', axis: 'positional', score: 80, band: 'Rolling', answered: 5, activeCount: 5, uncertainty: 'narrow', toNextBand: 20 },
    { categoryId: 'b', name: 'Beta', axis: 'positional', score: 30, band: 'Learning', answered: 1, activeCount: 8, uncertainty: 'wide', toNextBand: 10 },
    { categoryId: 'c', name: 'Gamma', axis: 'positional', score: null, band: null, answered: 0, activeCount: 8, uncertainty: 'none', toNextBand: null },
  ],
  insights: [{ categoryId: 'b', kind: 'avoidance', text: 'That loop feeds itself — positional rounds beat avoiding it.' }],
}

describe('ResultsPage', () => {
  it('sorts scored categories desc, parks unscored under Not yet mapped, no composite %', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    const rows = screen.getAllByRole('listitem').map(li => li.textContent)
    expect(rows[0]).toContain('Alpha')
    expect(rows[1]).toContain('Beta')
    expect(screen.getByText('Not yet mapped')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/overall|\d+%/)
  })
  it('marks wide uncertainty and shows the epigraph', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    expect(screen.getByText(/rough estimate — drill down to sharpen/)).toBeInTheDocument()
    expect(screen.getByText(/All models are wrong; some are useful/)).toBeInTheDocument()
    expect(screen.getByText(/r ≈ \.29/)).toBeInTheDocument()
  })
  it('renders the radar with one polygon and skips unscored axes', () => {
    const { container } = render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    expect(container.querySelectorAll('svg polygon')).toHaveLength(1)
    expect(container.querySelector('svg')!.textContent).not.toContain('Gamma')
  })
  it('shows insight cards', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    expect(screen.getByText(/loop feeds itself/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2–5:** RED → implement → GREEN (+ full suite, `npm run build`) → commit `feat(app): results v2 — band list, radar hero, insights, export/import`

---

### Task 8: §9 seed content, all draft (placeholders for Gerald)

**Files:**
- Modify: `src/data/question-bank/questions/positional.json` (append draft records)
- Create: `src/data/question-bank/questions/meta-qualities.json`, `src/data/question-bank/questions/reputation.json`
- Modify: `src/data/question-bank/categories.json` (add `meta_qualities` + `reputation` category defs)
- Modify: `src/data/question-bank/CHANGELOG.md` (unreleased-drafts note)
- Regenerate + commit: `docs/bank-review.md`
- Test: `src/lib/bank/seed-content.test.ts`

**Interfaces / content rules:**
- Every new record: `status: "draft"`, `v: 1`, `rationale` starting `PLACEHOLDER — pending Gerald review; ` then the design reason, qids as semantic slugs.
- 15 sweep rewrites: input `ladder6`, `tier: "core"`, one per positional category, `replaces` = that category's current core qid (e.g. `td_takedown_live` replaces `td_002`). Pattern: outcome + resistance + opponent context (e.g. `Standing against a resisting same-rank partner, I complete a takedown`). Must pass the wording linter with ZERO warnings.
- 3 pilot drill-down categories (`takedowns`, `closed_guard_bottom`, `half_guard_bottom`): each gets one `belt_threshold` item, one `frequency10` item, one `agree3` enjoyment item (`axis: "psychological"`, `countsToward: "none"`), and 4–6 `ladder6` rewrites of existing items (with `replaces`; rationale notes which v0.1 items each proposes to supersede — do NOT retire anything yet).
- `meta-qualities.json`: ~10 items, category `meta_qualities`, `axis: "meta"`, tier drilldown, observable-event wording covering: pressure, connection/flow, composure, timing/anticipation, chaining, defense depth (early/mid/late escapes), adaptability. Mix of ladder6/frequency10/received_feedback inputs.
- `reputation.json`: ~8 items, category `reputation`, `axis: "reputation"`, input `received_feedback`, `countsToward: "context"`, two halves: skill reputation (4) and training-partner quality (4, including the negatively-valenced ones — flags include `needs_gerald_review` on those). Partner items get `countsToward: "none"`.
- categories.json additions: `{ "id": "meta_qualities", "name": "Meta-qualities", "axis": "meta", "weight": 1.0, "description": "What makes someone hard to deal with, regardless of position" }` and `{ "id": "reputation", "name": "Reputation & partners", "axis": "reputation", "weight": 1.0, "description": "What people have told you — memories of events, not self-judgment" }`.

- [ ] **Step 1: Failing test** — `src/lib/bank/seed-content.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { loadBank } from './load'
import { lintText } from './lint'

describe('§9 seed drafts', () => {
  const bank = loadBank()
  const drafts = bank.questions.filter(q => q.status === 'draft')
  it('exist and are all marked placeholder', () => {
    expect(drafts.length).toBeGreaterThanOrEqual(40)
    expect(drafts.every(q => q.rationale?.startsWith('PLACEHOLDER — pending Gerald review'))).toBe(true)
  })
  it('15 draft sweep rewrites, one per positional category, ladder6, with lineage', () => {
    const sweep = drafts.filter(q => q.tier === 'core')
    expect(sweep).toHaveLength(15)
    expect(new Set(sweep.map(q => q.category)).size).toBe(15)
    expect(sweep.every(q => q.input === 'ladder6' && typeof q.replaces === 'string')).toBe(true)
  })
  it('draft sweep + meta items pass the wording linter clean', () => {
    const strict = drafts.filter(q => q.tier === 'core' || q.category === 'meta_qualities')
    for (const q of strict) expect(lintText(q.qid, q.text), q.qid).toEqual([])
  })
  it('psychological and partner items never count toward skill', () => {
    const noSkill = drafts.filter(q => q.axis === 'psychological' || q.flags.includes('needs_gerald_review'))
    expect(noSkill.length).toBeGreaterThan(0)
    expect(noSkill.every(q => q.scoring.countsToward !== 'skill')).toBe(true)
  })
  it('active bank is untouched: still 173 active', () => {
    expect(bank.questions.filter(q => q.status === 'active')).toHaveLength(173)
  })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Author the content** per rules (the implementer drafts wording; run `npm run bank:validate` iteratively — zero errors required, warnings on drafts must be zero for sweep/meta per the test). **Step 4:** `npm run bank:review` and commit the regenerated `docs/bank-review.md`. **Step 5: Run** suite + `npm run build` → green. **Step 6: Commit** — `feat(bank): §9 seed content as drafts — sweep rewrites, pilot drilldowns, meta-qualities, reputation`

---

### Task 9: Walkthrough verification + screenshots

**Files:**
- Create: `scripts/screenshot-walkthrough.mjs`, `docs/screenshots/` (committed PNGs)
- Modify: `README.md` (Dev section: how to run the app + walkthrough)

**Interfaces:**
- Consumes: the running dev server; playwright (`npm i -D playwright` + `npx playwright install chromium` — single headless instance per kainode browser hygiene, closed after run).

- [ ] **Step 1:** Install playwright + chromium.
- [ ] **Step 2:** Write `scripts/screenshot-walkthrough.mjs`: launch chromium headless at 390×844 (`deviceScaleFactor: 2`), visit `http://localhost:5173`, capture: `01-intro.png`; click `Start the sweep` → `02-intake.png`; click `Skip for now` → `03-sweep-question.png`; answer 15 sweep questions by clicking the third chip each time (waiting for auto-advance) → `04-interim.png`; click `See results` → `05-results.png`; also capture `06-draft-mode.png` at `/?bank=draft` first question. Save under `docs/screenshots/`, then `browser.close()`.
- [ ] **Step 3:** With the dev server running, run the script; **open each PNG and look at it** — blank frames, overlapping text, or missing fonts are failures to fix before committing. Verify: intro copy, chip labels present, progress bar visible, results shows bands + radar, no composite %.
- [ ] **Step 4:** Update README Dev section (walkthrough command). Full `npm test` + `npm run build` green.
- [ ] **Step 5: Commit** — `docs: screenshot walkthrough of the assessment flow`

---

## Phase-2 Definition of Done (brief §10 mapped)

- Sweep → drill-down → results works at 390px, tap-only; belt_curve functions on showcase questions → Tasks 4–7, verified in Task 9 screenshots
- No question text hard-coded in components → enforced by bank-driven props (spot-check in final review)
- Drafts NOT activated, never rendered without `?bank=draft` → Tasks 6/8
- Old v0.1 import: raw-answer storage + `replaces` lineage exists; full import mapping of v0.1 downloaded files stays OPEN (needs a real fixture file from the live site — qa.md)
- Execution-gap readout (§8) DEFERRED: bank 1.0.0 content is slider10-only, so knowledge-vs-live sub-scores are not computable; it becomes buildable when the §9 ladder6/know_check drafts are activated. Recorded as the first item of the results-phase-2 backlog, not silently dropped.
- Screenshot walkthrough committed → Task 9

## After completion

- `/deban sync`: provisional normalization decision (arch/pm), §9 drafts awaiting review (pm), any dead ends.
- Telegram Gerald: drafts ready for review via `bank:review` + `?bank=draft` playtest link.
