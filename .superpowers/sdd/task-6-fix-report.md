# Task-6 Fix Report

## Edits

### Fix 1 — stale `session` closure in `handleSweepDone` / `handleCategoryDone` (src/App.tsx)
- Added `sessionRef = useRef<AssessmentSession | null>(null)` alongside `session` state.
- Introduced `setSessionAndRef(s)` helper that writes both `sessionRef.current` and calls `setSession(s)` atomically.
- `handleAnswer`, `handleSweepDone`, `handleCategoryDone`, `handleStartOver` now all read from `sessionRef.current` (always current) instead of the stale closure `session`.
- `startNewSession` and `handleResume` write via `setSessionAndRef`.

### Fix 2 — QuestionScreen index not synced to `initialIndex` (src/components/QuestionScreen.tsx)
- Added `useEffect(() => { clearPendingTimer(); setIndex(initialIndex) }, [initialIndex])` — cancels any in-flight auto-advance timer, then resets the displayed index to match the prop.

### Fix 3 — fully-answered sweep resume edge (src/App.tsx)
- In `handleResume`, when `completedCategories.length === 0`, check `sweepQs.every(q => q.qid in resumeSession.answers)`.
- If true (all 15 sweep qids already answered), compute the report via `scoreAnswers` and route to `'interim'` directly.
- Otherwise falls through to the existing `'sweep'` route.

## Tests added (src/App.flow.test.tsx)

**Fix 3 pin** — seeds localStorage with all 15 active sweep qids answered (`belt_curve` → `[5,5,5,5,5]`, `slider10` → `5`), `completedCategories: []`; clicks "Continue where you left off"; asserts `h2 "First picture"` is present (not a question heading).

**Fix 1 structural pin** — renders fresh app, advances through all 15 sweep questions in the instant-advance path (jsdom → `usePrefersReducedMotion()` returns `true`): 13 `belt_curve` questions each answered by clicking "White: 10 of 10"; `gb_002` (`slider10`) clicked "10"; final `wl_003` (`slider10`) clicked "1" (raw=0 score). Asserts interim heading "First picture" present and chip button "Wrist Locks" present in recommended (proving the last answer was captured before `handleSweepDone` ran).

## Test output

```
Tests  72 passed (72)   — 14 test files
Build  ✓ built in 80ms  — no TS errors, no lint failures
```
