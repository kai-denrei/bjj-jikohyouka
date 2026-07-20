# Visual Landing Page (Verdict #7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the text intro with a visual landing: the overlapping belt bell-curves as hero, six numbered example-grappler dots on the curves, an ability-ordered legend that teaches the overlap by adjacency, the r≈.29 honesty explanation, and the Start button.

**Architecture:** One new `IntroLanding.tsx` reusing the shared gaussian (`gaussianAxisHeight`, already exported from BellCurveAxis) so the landing curves match the widget exactly. App's `intro` screen renders it instead of the current text block. Dot data is a small typed const (belt, x, curveHeight, label) — computed positions from the plan, verified against the shared gaussian in a test.

**Tech Stack:** existing (React/TS/vitest). Hand-rolled SVG. No new deps.

## Global Constraints

- Dark tokens only (`--mat/--surface/--ink/--ink-2/--line/--line-strong/--accent`, `--belt-*`); fonts Bricolage Grotesque (display) / Atkinson (body) / Plex Mono (legend figures + dot numbers). No new colors, no `#fff`/`#000` literals (tokens.test enforces).
- Belt curves use the SAME params as the ability_axis scale (white 12/7, blue 28/9, purple 45/11, brown 62/13, black 74/14; peak heights 1.0/0.55/0.42/0.30/0.34) via the shared gaussian — landing and widget must be visually identical curves. Black-belt curve stroked `--line-strong`, white `--line` (both-extremes rule).
- Dot positions (x, on-curve height verified in test): beginner white x3 h.438 · brown-oos x42 h.097 · blue-wrestling x43 h.142 · purple-18 x67 h.057 · black-avg x74 h.340 · black-comp x94 h.128.
- Dots NUMBERED BY ABILITY ASCENDING (1 beginner … 6 competitor). Chart shows small numbered pips (belt-colored fill, number in Plex Mono); FULL labels live only in the legend (prevents 390px collision).
- The overlap signature: a faint vertical bracket at x≈42 linking dots 2 (brown-oos) and 3 (blue-wrestling) with a `.mono` micro-label `same ability, different belt`.
- Reveal animation (curves draw L→R, dots pop in order, bracket last, ~1.2s) MUST respect `prefers-reduced-motion` (final state immediately). jsdom test asserts final state present.
- Copy verbatim: hero line `Belts are a rough map. Ability is the territory.` ; explanation `Belt color tracks ability loosely — and self-ratings track it even more loosely, about r ≈ .29. This is a mirror, not a measurement.` ; button `Start the sweep` (unchanged label, existing handler).
- Accessibility: chart has `role="img"` + `aria-label` summarizing the overlap thesis; legend is a real `<ol>`; Start is a real button; keyboard focus ring intact.
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure
```
src/components/IntroLanding.tsx        # the landing (chart + legend + copy + Start)
src/components/IntroLanding.test.tsx
src/lib/introDots.ts                   # typed dot data + ability ordering (shared with test)
src/App.tsx                            # intro screen renders IntroLanding
scripts/screenshot-walkthrough.mjs     # 01-intro recapture
```

---

### Task 1: Dot data + gaussian-verified positions

**Files:** create `src/lib/introDots.ts`, test `src/lib/introDots.test.ts`.

**Interfaces:** export `type IntroDot = { n: number; belt: 'white'|'blue'|'purple'|'brown'|'black'; x: number; label: string }` and `INTRO_DOTS: IntroDot[]` — the 6 dots, sorted by x ascending, n = 1..6 in that order. Also export `dotY(dot, gaussian)` helper: returns the on-curve normalized height using the shared `gaussianAxisHeight` (import from BellCurveAxis or wherever it's exported — grep; if it's not exported from a lib module, export it from a small `src/lib/gaussian.ts` and have BellCurveAxis import from there — do the extraction in this task so both share one source).

- [ ] Failing test: `INTRO_DOTS` has 6 entries, n 1..6 in x-ascending order; dots 2 and 3 are brown/blue at x 42/43 (the overlap pair, adjacent); each dot's `dotY` via the real gaussian matches the plan's height within 0.01 (beginner .438, brown .097, blue .142, purple .057, black-avg .340, comp .128).
- [ ] Implement (extract `gaussian.ts` if needed so landing + widget share it). Full `npm test` + build. Commit `feat(landing): intro dot data on the shared gaussian`.

### Task 2: IntroLanding component + App wiring + reveal

**Files:** create `IntroLanding.tsx` + test; modify `App.tsx` (intro screen); recapture `01-intro.png`.

**Contract:** SVG hero chart (reuse curve-path builder; 5 curves, both-extremes stroke rule), 6 numbered pips at (x, dotY), the overlap bracket + micro-label at x≈42, endpoint labels `Untrained`/`Elite` (`.mono`). Below: `<ol>` legend, ability-ordered, each `<li>` = mono number + belt-color pip + label + mono x-figure; the brown/blue adjacency is the visible payoff. Then the explanation `<p>` (verbatim) and the `Start the sweep` button (existing onClick from App). Reveal: CSS/JS animation gated on a `usePrefersReducedMotion`-style check (reuse the widget's pattern) — reduced motion renders final state. `role="img"` + aria-label on the chart.

- [ ] Failing tests: renders hero line, all 6 legend labels in ability order (assert DOM order: beginner first, competitor last, brown before blue), the overlap micro-label, the explanation with `r ≈ .29`, and a `Start the sweep` button that fires the handler; chart has role img + aria-label; under reduced-motion the final dots/curves are present (no zero-opacity permanent state).
- [ ] Implement + wire into App intro. Full `npm test` + build. Dev-server + headless screenshot check (LOOK at 01-intro.png: curves visible incl. black on dark, 6 numbered dots on-curve, brown+blue dots near-coincident with the bracket, legend readable, no label collision at 390px). Recapture 01-intro.png. Commit `feat(app): visual landing — belts are a map, ability is the territory`.

### Task 3: Final review + merge (controller)

Whole-branch review (fable): curve fidelity vs the widget, dot on-curve accuracy, overlap-thesis legibility, reduced-motion correctness, dark contrast, copy fidelity, no collision at 390px (via the committed screenshot). Fix wave if needed. This branch ALSO carries the SHA-token commit — verify the deployed token will equal HEAD. Merge on Yes; push auto-deploys.

## Definition of Done
- Intro is the annotated bell-curve hero; 6 dots on-curve; overlap pair visibly coincident with the bracket; ability-ordered legend; r≈.29 explanation; Start works.
- Curves identical to the assessment widget (shared gaussian); black-belt visible on dark.
- Reduced-motion safe; no label collision at 390px (screenshot-verified); tests green.
