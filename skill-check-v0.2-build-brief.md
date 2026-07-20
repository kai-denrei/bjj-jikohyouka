# Skill-Check v0.2 — Build Brief for Claude Code
*Repo: github.com/jelaludo/grapplingprimitives · Live v0.1: grapplingprimitives.com/modules/skill-check/*
*Author: Gerald (with research/design notes from a prior Claude session, condensed in Appendix A & B)*

> **How to use this file:** This is the working brief for v0.2 of the BJJ Skill-Check. Read it fully before touching code. Explore the existing module first (`src/data/skill-assessment.json` and the skill-check components) and confirm your understanding of the v0.1 architecture back to me before making changes. Question CONTENT is still being iterated by Gerald — your job is to build the SYSTEM so content can iterate without code changes, plus the v0.2 UX. Seed question sets you draft are proposals in `draft` status, not final.

---

## 1. Context — what v0.1 is

- 15 positional categories, 173 questions in one JSON file (`src/data/skill-assessment.json`), each with type/level/weight metadata.
- Input: 1–10 confidence slider; ~26 questions use a "draw across belt levels" curve widget (W/B/P/Br/Bk).
- Two modes: Short (15Q, one per category) and Full (173Q, linear).
- Output: overall confidence %, 15-axis radar chart, per-category bar list, download/retake.
- No user intake (belt/experience not asked), no persistence between sessions, no versioning of question content.

## 2. Product philosophy (bake into copy and design decisions)

1. **"All models are wrong, some are useful."** The tool openly acknowledges self-assessment limits (research: self-rated skill correlates ~0.3 with measured skill). Honesty is a feature — show it in the intro copy and in uncertainty displays. Never present scores as objective truth; present them as a structured mirror.
2. **Observable events over introspection.** Questions describe things that happen ("my partner recovers guard mid-transition") rather than felt qualities ("my transitions are smooth"). Vague-trait self-ratings are the least valid kind.
3. **Belts are opponents, not self-labels.** Never ask "are you purple-level at X." Do ask "does X work against a purple belt." Opponent-anchored outcomes are how real instructors calibrate.
4. **Received feedback is data.** "People have told me…" items are memories of events, not self-judgments — better calibrated, and they can surface training-partner qualities (good/bad partner) that pure skill questions miss.
5. **The gap is the product.** Knowledge-vs-execution gaps, self-vs-coach gaps (future), expected-vs-actual belt profile gaps — deltas are more actionable than levels.

## 3. v0.2 scope

### In scope
- **A. Question Bank System** (§4) — the core deliverable. Versioned, validated, migratable content layer, fully decoupled from code.
- **B. New input widgets** (§5): 6-point execution ladder, compact belt-threshold, bounded frequency, received-feedback, yes/partly/no knowledge check. Keep the draw-a-curve widget as a component, used only where the bank says so.
- **C. Intake step** (§6): belt, time training, gi/no-gi/both, sessions per week. 4 taps max.
- **D. Flow restructure** (§7): one assessment, two depths — 15-question sweep routes into optional per-category drill-downs. Resumable. No item-level progress bar; show "category m of n".
- **E. Results v2** (§8): sorted analytic view + radar hero, named bands, execution-gap readout, per-category uncertainty, localStorage persistence with export/import JSON, retake diff view.
- **F. Seed content in draft status** (§9): rewritten 15 sweep questions, drill-down rewrites for 3 pilot categories (takedowns, closed guard bottom, half guard bottom), new Meta-Qualities set, new Reputation/Partner set. All `status: "draft"` pending Gerald's review.

### Out of scope for v0.2 (do not build)
- Accounts/backend, coach-share links, anonymized response logging, IRT/adaptive item selection beyond the sweep→drill-down routing, percentile norms. (Design the schemas so none of these are blocked later — see §4.6.)

## 4. Question Bank System (the robust content-management layer)

Motivation: "we're unlikely to hit perfection on the first try." Question wording will be revised many times; old saved results must not break; every change must be reviewable.

### 4.1 Layout

```
src/data/question-bank/
  bank.meta.json          # bankVersion (semver), releasedAt, changelog pointer
  categories.json         # category defs: id, name, axis, weight, belt-stage emphasis
  questions/
    positional.json       # question records (see schema)
    meta-qualities.json
    reputation.json
  scales.json             # input-type definitions incl. every anchor label
  CHANGELOG.md            # human-readable, one section per bank release
  archive/                # frozen snapshots: bank-1.0.0.json (generated on release)
```

v0.1's `skill-assessment.json` gets converted into this format as bank `1.0.0` (archived, status `retired` where superseded) so old downloaded results remain interpretable.

### 4.2 Question record schema

```jsonc
{
  "qid": "td_takedown_live",        // stable forever, never reused, semantic slug
  "v": 2,                            // bumped on ANY wording/scale change
  "status": "active",               // draft | active | retired
  "replaces": "td_002",             // lineage to v0.1 ids (or earlier qids)
  "category": "takedowns",
  "axis": "positional",             // positional | meta | reputation | knowledge | psychological
  "input": "ladder6",               // ladder6 | belt_threshold | frequency10 | received_feedback | know_check | belt_curve | agree3
  "text": "Standing against a resisting same-rank partner, I complete a takedown",
  "tier": "core",                   // core (sweep) | drilldown
  "scoring": { "weight": 1.0, "countsToward": "skill" },  // skill | context | none
  "rationale": "Rewrite of td_002; behavioral + opponent-anchored (brief §2.2-2.3)",
  "flags": []                        // e.g. "showcase_curve" to force the draw widget
}
```

Rules: `qid` is immutable and never recycled; edits bump `v` and get a CHANGELOG entry; deletions are `status: retired` (never removed from file); `psychological` items (enjoyment, avoidance) NEVER average into skill scores — they render as separate insights.

### 4.3 Stored results format (forward compatibility)

Every saved/downloaded result records: `bankVersion`, and per answer `{qid, v, raw}`. Scoring is a pure function `(answers, bank) → report` living in one module. Category scores normalize to 0–100 regardless of input type so results remain comparable across bank versions at the category level even when individual questions changed. When rendering a diff against an old result, match by `qid`; if `v` differs, show the category comparison but mark the item-level comparison as "question changed since then."

### 4.4 Validation tooling (must ship)

`npm run bank:validate` (also wire into build/CI):
- JSON Schema (or zod) check on every record; unique qids; no qid reuse from archive; every `replaces` target exists in archive; every `input` exists in scales.json; every category referenced exists.
- **Wording linter**: warn on vague quantifiers and introspection words in question text — `reliably, consistently, often, usually, good at, comfortable, confident` — outside of scale-anchor labels. Warn on normative self-comparison phrasing (`better than, average, most people at my level`). These warnings force the observable-event rewrite discipline.
- Report counts: active questions per category/tier, estimated completion time per mode (≈6s per tap item, ≈12s per curve).

`npm run bank:release`: bumps bankVersion, snapshots to `archive/`, stamps CHANGELOG.

`npm run bank:review`: renders the active + draft bank to a single readable markdown file (question text grouped by category, with input type and anchors) so Gerald can review content in one page without reading JSON.

### 4.5 Draft workflow

`status: draft` questions never appear in production. Add a dev-only query param (`?bank=draft`) that includes drafts so wording can be play-tested on the live widgets before activation.

### 4.6 Future-proofing hooks (schema only, no implementation)

Leave optional fields in the schema, unused for now: `difficulty` (future IRT), `abTestGroup`, `raterMode` ("self" | "observer" — for the future coach-compare feature, most questions should be phrasable about a third person).

## 5. Input widgets

All tap-based (no sliders — research: sliders add dropout, time, and start-position bias; this matters at 100+ items on mobile). Every point fully labeled. One component per input type, driven entirely by `scales.json`.

**ladder6** — the workhorse. 0–5, anchors:
0 "I don't know what to do here" · 1 "I know the steps, haven't drilled much" · 2 "Works in drilling / cooperative" · 3 "Works in positional sparring vs less experienced" · 4 "Works in free rolling vs same rank" · 5 "Works vs bigger/higher rank — could teach it"
(Encodes knowledge→execution→opponent-level in one answer; enables the execution-gap readout.)

**belt_threshold** — compact replacement for most belt-curve questions. Prompt suffix: "…works reliably against opponents up to:" chips `[Untrained] [W] [B] [P] [Br] [Bk]` + "N/A". One tap. Rationale: drawn curves are always monotone-decreasing, so the crossing point carries the information. The original **belt_curve** widget stays for the few `showcase_curve`-flagged questions (it's the product's signature interaction — use sparingly).

**frequency10** — "In my last 10 rolls (that started standing / where I was mounted / …): `0 · 1–2 · 3–5 · 6+`". Bounded window, counts not adverbs.

**received_feedback** — "Training partners or coaches have told me…" options: `Never · Once or twice · Several times, several people`. Memories of events, not self-judgment.

**know_check** — knowledge floor items: `No · Roughly · Yes, incl. grips/details`.

**agree3** — psychological items only (enjoyment/avoidance): `Not really · Somewhat · Definitely`. Excluded from skill scoring.

## 6. Intake (before sweep, skippable)

Belt (W/B/P/Br/Bk), years training (chips: <1, 1–3, 3–6, 6–10, 10+), gi/no-gi/both, sessions per week (chips). Stored with results; used for (a) belt-stage interpretation on results (Saulo framing: white→survival, blue→escapes, purple→guard, brown→passing, black→refinement), (b) future norms. Copy: one line explaining why ("your belt changes what a strong profile looks like").

## 7. Flow

Sweep = 15 core-tier questions (one per category, ladder6), ~3 min. On completion, show a light interim result + "sharpen your picture": recommended drill-downs (3 lowest + any category answered at ladder 1–2, suggesting a knowledge/execution split worth probing), plus free choice. Each drill-down = that category's active drilldown-tier questions (~8–12, ~2 min), completable independently, resumable via localStorage. "Full assessment" = all categories, presented category-by-category with per-category completion ("8 of 15 categories"), never a 173-item wall.

## 8. Results v2

- **Analytic view first**: categories as a sorted dot/bar list with named bands. Bands (from ladder math, tune freely): `Unmapped (<1) · Learning (1–2) · Drilling (2–3) · Positional (3–4) · Rolling (4–5) · Weapon (5)`. Show distance-to-next-band.
- **Radar stays as the shareable hero** (downloads/social) — consider grouping to 6–8 super-axes for legibility; detail lives in the list.
- **Execution-gap readout**: per category, split knowledge-tier vs live-tier scores; call out categories where knowledge outruns execution by ≥2 ladder steps ("you don't need more study here — you need positional rounds") and the reverse ("you hit this live but can't articulate it — worth understanding why it works").
- **Uncertainty**: category scored only by 1 sweep item → wide band + "rough estimate — drill down to sharpen"; full drill-down → narrow band; results older than 6 months render as stale.
- **Belt-stage lens** (if intake given): overlay expected emphasis for user's belt; frame as guidance, not judgment.
- **Kill the single composite %** as the headline. If kept at all, demote it visually.
- **Psychological/avoidance insight**: low enjoyment + low score in same category → gentle callout of the avoidance loop.
- **Persistence**: auto-save to localStorage; export/import JSON (schema per §4.3); on retake, per-category slope view "then → now". Frame progress vs self, never vs others.
- Footer epigraph: "All models are wrong; some are useful." + one honest sentence about self-assessment limits.

## 9. Seed content to draft (all `status: "draft"`)

1. **15 sweep questions** — one per category, ladder6, behavioral rewrite of the current short-mode set. Follow the pattern: outcome + resistance + opponent context. Run them through the wording linter.
2. **3 pilot drill-down categories** (takedowns, closed_guard_bottom, half_guard_bottom): rewrite existing items per the templates in Appendix B; merge/retire redundant confidence items; each category ends with exactly one agree3 enjoyment item and gains one belt_threshold and one frequency10 item.
3. **Meta-Qualities set (new, ~10 items)** — the "what makes someone great" axis, every item an observable event or outcome. Cover: pressure ("partners concede position from my weight alone, before I attack"), connection/flow ("when I transition between dominant positions, my partner recovers guard in the middle: never/sometimes/usually"), composure ("in bad positions I keep breathing steady and think in options rather than surviving on adrenaline"), timing/anticipation, chaining ("when my first attack fails I'm already entering the second"), defense depth (early/mid/late-stage escapes framing), adaptability (unfamiliar guard/body type).
4. **Reputation & Partner set (new, ~8 items, received_feedback input)** — two halves: skill reputation ("people have asked me to show them a technique", "higher belts have commented on my pressure/guard") and **training-partner quality**, including negatively-valenced items handled with care: "partners have told me I roll too hard for the room", "newer people seek me out to roll", "I've been asked to go lighter with smaller partners more than once", "coaches trust me to roll safely with beginners". Score as its own small section ("Reputation") — never merged into the skill radar; the partner items surface as qualitative insights ("you may be the guy people avoid" is a gift when worded kindly — draft the insight copy carefully and flag it for Gerald's review).

## 10. Definition of done

- v0.1 content archived as bank 1.0.0; new bank validates clean; `bank:review` output generated and committed for Gerald's content review.
- Sweep → drill-down → results flow works on mobile viewport (390px) with tap-only inputs; belt_curve still functions on showcase questions.
- Old v0.1 downloaded results can still be imported (best-effort category-level mapping via `replaces`).
- Wording linter catches a seeded bad example (test it).
- No question text hard-coded in components — everything renders from the bank.
- Screenshot walkthrough of the new flow attached to the PR; drafts NOT activated.

---

## Appendix A — Research digest (why these choices)

Full report lives in `skill-check-research-report.md` (same session). One-line versions: self-assessed skill ≈ r .29 vs objective (Zell & Krizan 2014); systematic overestimation, improved by concrete criteria + repeated feedback cycles (2023 meta, 160 studies); better-than-average bias d=.78 lives in normative comparisons — avoid them in inputs; 7±labeled points beat 1–10 unlabeled; sliders worsen dropout/time/bias vs buttons (Bosch & Revilla 2019; Funke); completion falls off a cliff past ~15 linear questions (Survicate n=267k) → multistage routing (Duolingo DET pattern); Miller's pyramid / EPA supervision ladders inspired ladder6; Kluger & DeNisi: feedback vs-self + specific goal helps, normative feedback often backfires; radar >8 axes unreadable — keep as hero, analyze in sorted list; FMS: composites hide the signal, item/category level is where diagnosis lives; Glicko: show uncertainty, let it widen with staleness. BJJ side: Gracie tests score Details/Conviction/Reflexes (= knowledge/execution/pressure split); instructors promote on relative rolling outcomes across belts (validates belt-as-opponent anchoring); Saulo belt stages give expected-profile lenses; ecological camp (Souders): measure task accomplishment against resistance, not technique recall.

## Appendix B — Brainstorm log (running notes, keep appending)

- **Ladder ↔ belts**: decided belts are opponent anchors, not scale labels (self-labeling by belt reimports normative bias + gym variance). Ladder6 top rungs are the compressed belt-curve.
- **Belt-curve compression insight**: drawn curves are always monotone → the threshold crossing is the sufficient statistic → belt_threshold chip widget; keep the beautiful curve UI for a few showcase questions. (Gerald likes the curve; screen-fit was the concern — see IMG_9082.)
- **0-level**: "totally unknown" floor rung confirmed wanted.
- **Honesty framing**: r≈.29 disclosed openly; Box quote as epigraph.
- **Coach-compare (future v0.3+)**: same sweep answered *about* the student by coach/partner; the deltas are the product — Johari-style blind spots (self high/other low) and hidden strengths (self low/other high). Schema hook: `raterMode`.
- **Observable events**: the master rewrite move for intangibles — "intense relaxed pressure" → partners concede position from weight alone; "flow" → partner doesn't recover guard mid-transition.
- **"People have told me…"**: received-feedback items double as a window into training-partner quality (good/bad partner), not just effectiveness. New Reputation set born from this.
- **2026-07-19 — §9 draft content review notes (agent)**: 55 drafts landed (`?bank=draft` to play-test; docs/bank-review.md to read). Items flagged for Gerald's content pass, worst first:
  - `ogb_butterfly_sweep_live`: "stands or sits in my butterfly guard" — standing opponent is the unusual case; suggest dropping "stands or".
  - `wl_wrist_lock_live`: "causes them to tap or escape" — escape isn't a successful wrist lock; suggest "that they must urgently defend or tap to".
  - `rep_beginners_seek_roll`: "because they feel they can learn" infers the beginner's motive; suggest stripping the causal clause.
  - `mq_no_guard_recovery`: negatively-valenced frequency item — now flagged `inverted` and scored 1−norm mechanically; confirm the direction reads right in results.
  - `mq_feedback_pressure`: "feel pinned" is a reported sensation, not behavior — spec's own phrasing ("partners concede position from my weight alone") is stronger.
  - Minor phrasing: `td_kuzushi_live` ("at my level" vs "same-rank"), `cgb_hip_angle` ("so" purpose-phrasing), `hgb_deep_half_live` ("return to top" ambiguity), `mq_adapt_body_type` (ladder6 is a weak scale fit — frequency10?).
  - `rep_comp_advice`: pre-competition advice is a neutral event — insight copy should not read it as pure endorsement.
- **Open questions for Gerald** (park here, don't block): Should meta-qualities appear in the sweep or only post-sweep? Gi vs no-gi split scores or one profile? How to phrase negative partner-quality insights kindly? When to start anonymized logging (v0.3?)? Super-axis grouping for the radar hero — which 6–8?
- **2026-07-19 — Gerald: re-parse brainstorm (no coding yet)**: Questions and answers too verbose — need 一目瞭然 parsing. Proposal: structured question cards instead of prose sentences — slots rendered as UI: `vs SAME RANK` (opponent chip) / `THEIR CLOSED GUARD` (situation, possessive disambiguates who/what) / short task line ("Do you pass before they threaten a sweep or submission?"). Reusable answer pattern: `<situation/problem> vs what rank do my solutions dip below 50%?` — belt_threshold promoted to default scale. Agent notes: schema absorbs this as optional `slots` field + qid/`v`/`replaces` machinery (the §4 insurance case); costs to resolve: knowledge floor (rung 0 confirmed-keep) and white/blue-belt compression → possible synthesis: threshold row with floor chips `[No answer yet] [<50% vs anyone] [W][B][P][Br][Bk]`, phrase 50% as "works more often than not" (avoid false precision). Parked: does ladder6 survive in the sweep for granularity?; does execution-gap get redefined under threshold-only answers?; fixed slot vocabulary vs free text (fixed makes linter+UI trivial).
- **2026-07-19 — Gerald: bell-curve ability-axis input (still emerging, no coding)**: Building on the structured-card re-parse — the answer to EVERY skill question becomes one fixed prompt, "where do you start to struggle with this?", answered by ONE click on a continuous ability axis decorated with the overlapping belt bell-curves (Gerald's Belt Color Expectations chart: wide within-belt distributions, overlapping — avg purple > avg blue, but right-tail purples beat left-tail blacks). Reference image: Screen Shot 2022-08-31 (beltchecker-informed curves). Test case: Gerald's Kimura system — works vs almost anyone EXCEPT really good/heavier browns and above-average blacks → click lands ~2/3 into brown curve; chips cannot express this, the axis can.
  Agent analysis: (1) deletes the vague-quantifier class from answers entirely — the click IS the quantifier; (2) largely dissolves pm normalization question #3 — one shared continuous axis, raw = x, retake diff = dx ("your Kimura moved right past avg brown"); (3) six-vs-seven chip debate goes moot (left edge = untrained/white tail geometrically); (4) natural heir to belt_curve as THE signature interaction; (5) chart teaches the honesty thesis (belts as overlapping distributions) while measuring.
  Design-around concerns: knowledge floor still needed ("No answer to this yet" escape chip = rung 0); this is continuous input — anti-slider research (Appendix A) applies, mitigated by no-handle/no-default tap + semantic landmarks, must be argued explicitly not ignored; overlap ambiguity — commit the datum as an x-position (vertical line + highlighted region), curve-riding cursor stays as hover flavor only.
  Parked: mobile precision at 390px (~350px usable axis); does execution-gap redefine as (knowledge-floor answered) × (axis position); stylized curves in-app vs real beltchecker data (methods page); does ladder6 survive anywhere once this lands.
- **2026-07-19 — Gerald play-test verdict #1 (ability-axis commit)**: tap-commit too fast. New interaction: desktop = moving line follows the pointer, click commits; mobile = slide/drag moves the vertical line, explicit press commits. Keyboard follows suit: arrows move without committing, Enter/Space commits (resolves the review's one-shot-nudge a11y finding). The 250ms auto-advance stays, now firing only after an explicit commit.
- **2026-07-19 — Gerald play-test verdict #2 (viz polish)**: (1) works/struggles labels must ride the moving line; (2) "fun effect" — dots rolling on the curves at the line's intersection with EACH belt curve, making the overlap thesis kinetic (one x = great blue = mid purple = bottom-tail black); (3) "vs SAME RANK" chip unneeded now — the axis answer subsumes the opponent dimension (slot data kept, rendering dropped); (4) progression needs more than "9 of 15" — root cause found: the belt-stripe bar never advanced during the sweep (only counted drill-downs). Redesign per /tufte-viz: 15-segment track (done=filled, current=accent stroke, upcoming=hairline), advances per sweep answer, current category name integrated beneath, small 9/15 terminal annotation, duplicate header line removed.
- **2026-07-19 — Gerald play-test verdict #3 (draft-mode as the product)**: (1) completing the 15-question sweep should land on the SPIDER CHART as the main element (flips the phase-2 "analytic list first" ordering — radar becomes the sweep payoff); (2) drill-downs still surface v0.1 remnants where the mechanism half-works — draft mode must be pure new-format (drafts only; categories without drafts simply aren't drill-downable yet); (3) old-format items ("I can counter mount escape attempts" + 50-cell curve grids) are DISCARDED from the play-test experience — formal retirement of v0.1 actives deferred to a bank release decision; (4) `?admin` mode for direct in-app question editing (local dev only — vite middleware writes draft records back to the JSON files, linter feedback on save); (5) intuitive stop/pause/back navigation at any point (session already autosaves — surface it).
- **2026-07-20 — Gerald verdict #4 + first live edit pass**: edited all 15 sweep questions in-app via ?admin (the tool works). New canonical style: problem = short precise phrase ("takedown against full resistance"), no "Do you…?" wrapper. Directives: (1) the who slot ("vs any rank") is an obsolete remnant — remove the structure entirely (axis answer subsumes opponent); (2) flip card hierarchy — the category/what ("Standing Exchanges"/"Their Guard") becomes a quiet eyebrow, the QUESTION/problem becomes the visual hero; (3) the canonical full-sentence text field is likely redundant for slotted questions — derive it from slots instead of hand-maintaining; (4) remaining axis drafts (pilot + meta) should be aligned to the new style: simplify, shorter, precise.
- **2026-07-20 — Gerald verdict #5 (flow + viz + taxonomy + dark redesign)**: 15-question diagnostic pace is right. (1) Result viz gets TABS: spider chart / inverted bar chart showing "depth" / heat-map-of-sorts. (2) Make EXPLICIT what we judge the dimensions of grappling to be — the model must be visible, not implicit in category names. (3) Suspected missing dimensions: the abstract ones — "pressure", "connection", among others (meta-qualities has items for these but they're not first-class dimensions in any viz; promotion to visible dimensions = Gerald's model decision, needs a written proposal). (4) Post-sweep deep-dive flow is confusing — unclear where it goes and how it feeds in. Replace with a DASHBOARD hub: every category with follow-up deep-dives, answered-state visible, easily navigable back. (5) Dark mode by default; modern redesign.
