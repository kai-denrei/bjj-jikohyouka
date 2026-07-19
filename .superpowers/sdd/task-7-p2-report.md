# Task 7 Phase 2 Report — Results v2

**Date:** 2026-07-19
**Branch:** app-phase2
**Commit:** 1fe9ef6

## Status: DONE

### What was built

Three new components under `src/components/results/`:

- **`Radar.tsx`** — SVG 320×320, polar coord layout, one axis per positional category with a non-null score (Gamma and unscored axes skipped), data polygon with `var(--accent)` stroke + 0.2 fill-opacity, three concentric hairline rings at 1/3 / 2/3 / 3/3 radius, 10px Atkinson axis labels with dynamic text-anchor.
- **`BandList.tsx`** — Sorted desc by score; scored rows show category name, band chip (`.mono`), `NN / 100`, `+N to next band`, `then NN → now NN` retake diff when history exists, `rough estimate — drill down to sharpen` for wide uncertainty, and a Sharpen quiet button. Unscored categories park under a `Not yet mapped` separator.
- **`ResultsPage.tsx`** — Composes BandList + Radar + Insights cards + footer epigraph + Download/Import JSON. Belt-stage lens paragraph (verbatim Saulo copy per belt) appears above BandList when `belt` prop is provided. Retake diff computed by `scoreAnswers(prev.answers, bank)` against the most recent history entry with matching `bankVersion`. No composite percentage anywhere.

`src/App.tsx` modified to import and render `<ResultsPage>` in the results screen, passing `report`, `onRetakeCategory` (opening category drill-down), and `belt` from `session?.intake?.belt`.

### Test results

All **77 tests pass** across 15 test files. 4 new tests in `results.test.tsx` all green:
- sort order + No composite %
- wide uncertainty caveat + epigraph text + r ≈ .29
- radar polygon count + Gamma exclusion
- insight card text

`npm run build` clean (348 kB JS, 7.9 kB CSS, 81 ms).

### Concerns / notes

- `onRerender` prop on `ResultsPage` is optional and unused in App; import side-effects after JSON import don't auto-reload the report state — a follow-up could thread a re-score callback through App if this matters.
- Retake diff pulls the first history session matching `bankVersion`; there's no session timestamp disambiguation yet.
- No composite percentage verified by regex test on `document.body.textContent`.

## Fix Report

**Date:** 2026-07-19
**Branch:** app-phase2
**Fixer agent:** claude-sonnet-4-6

### Fix 1 — Radar label clipping

Changed `MAX_RADIUS` from `CENTER - 32` (128) to `CENTER - 56` (104) in `Radar.tsx`.
Changed `labelR` from `MAX_RADIUS + 16` to `MAX_RADIUS + 18` (so 122).
Added `overflow="visible"` attribute to the `<svg>` element.

New test `radar: 15 axis labels, outer ring r≤104, overflow visible` asserts:
- 15 `<text>` elements render in the svg when given 15 scored positional categories
- `svg[overflow]` attribute equals `"visible"`
- Max circle `r` among all concentric ring circles is ≤ 104 (CENTER − 56)

### Fix 2 — Import JSON must re-render

Added `const [historyVersion, setHistoryVersion] = useState(0)` to `ResultsPage`.
Changed `const history = listHistory()` to `const history = useMemo(() => listHistory(), [historyVersion])`.
In the `importJSON` success handler, replaced `onRerender?.()` with `setHistoryVersion(v => v + 1)`.
Removed `onRerender` from the `ResultsPageProps` interface and the function signature entirely.
No change needed in `App.tsx` — it was not passing `onRerender`.

New test `import JSON triggers re-render and shows then diff for matching bankVersion` asserts:
- After firing a file change event with a valid export JSON (session for `bankVersion: '1.0.0'`
  with a `td_001` slider10 answer), the rendered output contains a `then X → now Y` diff string.
- Uses `vi.stubGlobal('FileReader', ...)` mock that calls `onload` synchronously.

### Fix 3 — Interpolate next band name

Added `NEXT_BAND: Record<Band, Band | null>` map to `BandList.tsx` with the chain:
`Unmapped → Learning → Drilling → Positional → Rolling → Weapon → null`.
Changed `+{cat.toNextBand} to next band` to `+{cat.toNextBand} to {NEXT_BAND[cat.band]}`.
The span now renders only when `cat.toNextBand !== null` AND `NEXT_BAND[cat.band] !== null`.

New test `BandList shows next band name in to-next hint` asserts:
- Alpha (band=Rolling, toNextBand=20) renders `+20 to Weapon`
- Beta (band=Learning, toNextBand=10) renders `+10 to Drilling`
- The old generic string `/to next band/` is absent from the DOM

### Test results

All **80 tests pass** across 15 test files (up from 77 — 3 new tests added).
`npm run build` clean (348 kB JS, 7.9 kB CSS).

### Files changed

- `src/components/results/Radar.tsx` — MAX_RADIUS, labelR, overflow attribute
- `src/components/results/ResultsPage.tsx` — historyVersion state, useMemo, removed onRerender
- `src/components/results/BandList.tsx` — NEXT_BAND map, updated to-next-band label
- `src/components/results/results.test.tsx` — 3 new tests added
