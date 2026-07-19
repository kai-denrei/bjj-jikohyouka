# Final whole-branch review fixes — app-phase2 (2026-07-19)

Base: 7e21aae → Head: c01def5 (5 commits). All fixes implemented via subagent-driven
development with per-fix review; both reviews Approved.

## Fix 1 (CRITICAL) — dead-end on category with no available drill-downs
Commit: 32e53cc

- `App.tsx`: module-level `availableCategoryIds: Set<string>` computed with
  `drilldownQuestions(bank, c.id, drafts)` per category; passed as a prop to
  `ResultsPage` → `BandList` (BandList stays bank-agnostic, data-via-props).
- `BandList.tsx`: scored rows only render `Sharpen` when
  `availableCategoryIds.has(cat.categoryId)`; unscored categories without
  available drill-downs are omitted from "Not yet mapped" entirely; the section
  header is suppressed when no unscored category qualifies.
- `QuestionScreen.tsx` (defensive layer): mount-time `useEffect` fires
  `onDone()` when `questions.length === 0`; renders null meanwhile. Never
  strands the user even if routing reaches an empty category.
- Result: `meta_qualities` / `reputation` (all-draft questions) can no longer
  produce a blank screen in production mode.

## Fix 2 (Important) — finishSession wired, retake diff organically reachable
Commit: 32e53cc

- `ResultsPage.tsx`: new `session` + `onFinish` props; `.btn-quiet`
  "Finish & save" button in the footer row calls `finishSession(session)`,
  bumps the same `historyVersion` state used for import re-render (so
  `prevScores` re-derives and the "then → now" diff appears), then disables
  itself with label "Saved".
- `App.tsx`: passes `session={session}` and `onFinish={() => setSessionAndRef(null)}`
  — in-memory session cleared; `finishSession` already clears localStorage, so
  the resume banner offers nothing on reload and the next run starts fresh.

## Fix 3 — 05-results recaptured full-page
Commit: c01def5

- `scripts/screenshot-walkthrough.mjs`: `save()` gained an optional
  `fullPage = false` param; only the `05-results` call site passes `true`.
- Rerun against live dev server (:5173, verified up), single headless
  chromium, closed in `finally`. `03-sweep-question.png` and
  `06-draft-mode.png` picked up pixel-level diffs from the rerun and were
  committed alongside.

### Visual observations of the new 05-results.png (controller-verified)
- Full page captured (780×5166 @2x): all 15 band rows visible — 13 at
  Drilling 56/100, Guard Retention (Bottom) and Wrist Locks at Learning
  22/100, each with band chip, score, "+N to <band>" hint, wide-uncertainty
  caveat, and Sharpen button.
- NO "Not yet mapped" section and no Meta/Reputation rows — Fix 1 visibly
  landed.
- Radar hero: all 15 short-name axis labels (Takedowns, Guard Pass, Guard
  Ret., Closed (T/B), Open Pass, Open (B), Half (T/B), Mount (T/B),
  Back (T/B), Leg Locks, Wrists) fully legible, none clipped at the SVG edge.
- George Box epigraph and the r ≈ .29 caveat present above the footer.
- Footer button row: Download JSON, Import JSON, and the new
  "Finish & save" — Fix 2 visibly landed.

## Fix 4 — triage items
Commits: b021ef0, 28ea49b, 16934f3

- 4a (b021ef0): `QuestionScreen.heading` widened to
  `string | ((index: number) => string)`; App's sweep screen passes a
  function resolving the current question's category name — breadcrumb now
  reads e.g. "Takedowns & Wrestling · 3 of 15". Drill-down string path
  unchanged. No existing test asserted "Sweep ·" (verified by grep), so no
  test adjustments were needed.
- 4b (16934f3): `git rm` of `src/assets/react.svg`, `src/assets/vite.svg`,
  `src/assets/hero.png`, `public/icons.svg` after grep confirmed zero
  references (index.html/CSS included). `public/favicon.svg` untouched.
- 4c (28ea49b): FileReader stub restore moved to
  `afterEach(() => vi.unstubAllGlobals())` in `results.test.tsx`; unused
  `OriginalFileReader` capture removed (would have been TS6133).

## Test evidence (controller-run, final head c01def5)
- `npm test -- --run`: 16 files, **90/90 passed** (86 → 90; +4 new: empty-
  drilldown category hidden, Sharpen absent for unavailable scored category,
  QuestionScreen empty-questions fires onDone once, Finish & save →
  listHistory() length 1 + button "Saved"/disabled).
- `npm run build`: clean, zero TS errors.
- `npm run bank:validate`: **OK, 0 errors** (3 pre-existing [vague] warnings:
  hgt_002, mb_002, bmb_003).
- All 5 commits carry the `Co-Authored-By: Claude Fable 5` trailer (verified
  via `git log --format`).

## Review notes (non-blocking, from per-fix reviews)
- `session`/`onFinish` are optional on `ResultsPageProps` (brief suggested
  required); safe because the button disables when session is null.
- The empty-dep `onDone` effect would double-fire under React StrictMode;
  app does not use StrictMode and the pattern was brief-prescribed.

## Fix Wave 2

Two regression fixes committed to `app-phase2`.

### Fix A — self-diff after Finish & save (`ResultsPage.tsx`)

Changed `history.find(s => s.bankVersion === report.bankVersion)` to
`history.find(s => s.bankVersion === report.bankVersion && s.startedAt !== session?.startedAt)`
so the just-saved session is excluded from the prev-score lookup. Without
this fix, `finishSession` writes the session to history and `historyVersion`
bumps immediately, causing the freshly-saved entry to match as "previous"
and every row showed a misleading `then N → now N` diff.

Test pin added: renders with a session, clicks Finish & save, asserts no
`/then \d+ → now \d+/` text before or after.

### Fix B — post-finish Sharpen strands on blank screen (`App.tsx` + `BandList.tsx` + `ResultsPage.tsx`)

Two-part fix:

1. `App.tsx` `handlePickCategory`: added early-return guard `if (!sessionRef.current) return`
   so clicking Sharpen after `onFinish` sets session to null cannot navigate
   to `screen='category'` (which render-guards on `session` → blank screen).

2. `BandList.tsx`: added optional `sharpenDisabled?: boolean` prop to both
   `BandListProps` and `BandRowProps`; wired as `disabled={sharpenDisabled}`
   on both the scored-row Sharpen button and the unscored-row Sharpen button.
   `ResultsPage.tsx` passes `sharpenDisabled={finished}` to BandList so all
   Sharpen buttons disable the moment the session is saved.

Test pin added: renders with a session + 3 available categories, verifies
Sharpen buttons enabled, clicks Finish & save, asserts all Sharpen buttons
are disabled.

### Test counts
- Before: 90/90 passed
- After: 92/92 passed (+2 new pins)
- `npm run build`: clean, zero TS errors.
