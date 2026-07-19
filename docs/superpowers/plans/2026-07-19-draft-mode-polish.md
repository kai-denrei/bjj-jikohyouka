# Draft-Mode Polish (Verdict #3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make draft mode the coherent product: radar as the sweep payoff, drafts-only drill-downs (no v0.1 remnants), pause/back navigation everywhere, and an `?admin` mode where Gerald edits draft questions in-app.

**Architecture:** Flow-selection change in `flow.ts` (draft mode → drafts only in drill-downs); InterimScreen rebuilt around the existing `Radar` component; a small nav affordance in App's header; admin editing = pure `applyBankEdit` lib + a vite dev-server middleware that writes draft records back to disk + an inline editor in QuestionCard under `?admin`.

**Tech Stack:** Existing stack. The admin write-path is a vite `configureServer` middleware — dev-only by construction (absent from production builds).

## Global Constraints

- Verdict source: brief Appendix B "verdict #3" entry (2026-07-19). Active bank stays 173 untouched — "discarding" old formats means EXCLUDING them from draft-mode flow, not retiring records (retirement is a bank-release decision, out of scope).
- Admin mode: query param `admin` (any value; `?admin` or `?bank=draft&admin`). Editing allowed ONLY on `status: "draft"` records — the middleware hard-rejects everything else. Writes preserve 2-space indent + trailing newline. Response includes `lintQuestion` warnings for the edited record.
- Design tokens/classes as established; no new hues. Radar reused as-is from `src/components/results/Radar.tsx`.
- Session autosave already exists — navigation surfaces it, never introduces a second persistence path.
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

```
src/lib/flow.ts                       # drilldownQuestions draft-mode change (Task 1)
src/components/InterimScreen.tsx      # radar-hero rebuild (Task 2)
src/App.tsx                           # nav affordances + admin wiring (Tasks 2–4)
src/components/QuestionScreen.tsx     # pause affordance passthrough (Task 3)
src/lib/bank/adminEdit.ts             # pure edit-application lib (Task 4)
scripts/vite-bank-admin.ts            # vite middleware using adminEdit (Task 4)
vite.config.ts                        # plugin registration (Task 4)
src/components/AdminEditor.tsx        # inline editor UI (Task 4)
src/lib/flow.ts                       # + includeAdmin(search) helper (Task 4)
```

---

### Task 1: Drafts-only drill-downs in draft mode

**Files:** Modify `src/lib/flow.ts`; test `src/lib/flow.test.ts`.

**Interfaces:** `drilldownQuestions(bank, categoryId, drafts)` — when `drafts === true`, return ONLY `status === 'draft'` drilldown-tier questions of the category (was: drafts + actives merged). When `drafts === false`, unchanged (actives only). Everything downstream (Sharpen gating via `availableCategoryIds`, interim category chips) already derives from this function — verify by test that in draft mode a category WITHOUT drafts yields `[]` (and confirm App's `availableCategoryIds` recomputes from the same call — read App, adjust only if it hardcodes something).

- [ ] Failing tests: draft mode + pilot category (takedowns) → all returned questions are drafts (no slider10/belt_curve inputs, no v0.1 qids); draft mode + non-pilot category (e.g. `mount_top`) → `[]`; non-draft mode unchanged (actives only, existing test still green).
- [ ] Implement (one filter change). Full `npm test` + `npm run build`. Commit: `feat(flow): draft mode drill-downs are drafts-only — no v0.1 remnants`

### Task 2: Radar-hero interim

**Files:** Modify `src/components/InterimScreen.tsx`, `src/App.tsx` (pass what's needed); test in `src/App.flow.test.tsx` + component test.

**Interfaces:** InterimScreen props become `{ report, recommended, availableCategoryIds, onPick, onResults }`. Render order: (1) `Radar` with the report's positional categories — THE hero, first element, full width; (2) heading `First picture` + sub copy (unchanged wording); (3) recommendation chips (only categories present in `availableCategoryIds`); (4) `Or pick any category` quiet chips (same filter); (5) `See results` button. If NO categories are available for drill-down (draft mode, few pilots), sections 3–4 collapse to a single line: `Drill-downs are coming to more categories as questions are approved.` (`.mono`, ink-2).

- [ ] Failing tests: interim renders an `svg` with a polygon BEFORE the `First picture` heading in DOM order; category chips exclude unavailable categories; the no-drilldowns fallback line renders when availableCategoryIds is empty.
- [ ] Implement. Full suite + build. Commit: `feat(app): radar is the sweep payoff — interim leads with the spider chart`

### Task 3: Pause/back navigation

**Files:** Modify `src/App.tsx`, `src/components/QuestionScreen.tsx`; tests in `src/App.flow.test.tsx`.

**Interfaces:** A persistent quiet exit affordance during question runs, next to the belt bar: button `Pause` (`.btn-quiet`, compact — width auto). Behavior: during SWEEP → `saveSession` already ran per answer; navigate to `intro` where the existing resume banner offers `Continue where you left off` (verify the banner shows without a reload — App must re-read `loadSession()` or keep state; simplest: a `paused` state flag that renders the resume banner path). During CATEGORY drill-down → back to `interim` (report recomputed from current answers). On RESULTS → a quiet `Back to categories` button → `interim`. QuestionScreen's existing per-question `Back` stays.

- [ ] Failing tests: mid-sweep Pause → resume banner visible; clicking `Continue where you left off` returns to the SAME question index; mid-drilldown Pause → interim renders; results → `Back to categories` → interim.
- [ ] Implement. Full suite + build. Commit: `feat(app): pause and back navigation at any point`

### Task 4: `?admin` in-app question editing (local dev only)

**Files:** Create `src/lib/bank/adminEdit.ts`, `scripts/vite-bank-admin.ts`, `src/components/AdminEditor.tsx`; modify `vite.config.ts`, `src/lib/flow.ts` (`includeAdmin`), `src/components/QuestionScreen.tsx` (render AdminEditor under admin); tests `src/lib/bank/adminEdit.test.ts` + component test.

**Interfaces:**
- `adminEdit.ts` (pure, node-safe): `applyBankEdit(fileContent: string, qid: string, changes: { text?: string; slots?: { who: string; what: string; problem: string } }): { ok: true; updated: string; warnings: LintWarning[] } | { ok: false; error: string }` — parses the questions-file JSON, finds qid, REJECTS unless `status === 'draft'` (`error: 'only draft questions are editable'`), rejects unknown qid, applies changes, re-validates the record against `QuestionSchema` (reject on failure), returns re-serialized file (2-space indent + trailing newline) plus `lintQuestion` warnings for the updated record.
- `scripts/vite-bank-admin.ts`: `bankAdminPlugin()` vite plugin; `configureServer` registers POST `/__bank/update` accepting `{ file: 'positional' | 'meta-qualities' | 'reputation', qid, changes }`; reads `src/data/question-bank/questions/<file>.json`, runs `applyBankEdit`, writes on ok, responds JSON `{ ok, warnings }` or `{ ok: false, error }` with 400. File whitelist ONLY (never a path from the client).
- `flow.ts`: `includeAdmin(search: string): boolean` (`admin` param present).
- `AdminEditor.tsx`: `{ question, onSaved }` — collapsed `Edit` quiet button under the question card (admin mode only); expands to: textarea `text`, three inputs `who/what/problem` (only when the question has slots), `Save` button POSTing to `/__bank/update` (derive `file` from the question's category: `meta_qualities` → meta-qualities, `reputation` → reputation, else positional). On response: show warnings inline (`.mono`, one per line) if any; on ok show `Saved — reloading…` then `location.reload()` after 600ms (vite JSON import reload makes stale in-memory bank unavoidable; session survives via localStorage). On error show it inline. Note under the form: `Edits draft questions only. Saving reloads the page.`
- QuestionScreen renders `<AdminEditor question={current} …/>` below the input when admin flag (new prop `admin?: boolean` threaded from App like resetKey).

- [ ] Failing tests (adminEdit): edits a draft's text → ok, updated JSON parses, record changed, trailing newline preserved; rejects active qid; rejects unknown qid; returns linter warnings when the new text contains `reliably`; rejects a change that empties a slot (schema).
- [ ] Failing tests (AdminEditor): renders only in admin mode; Save POSTs the right payload (fetch mocked) and shows returned warnings.
- [ ] Implement lib → plugin → UI. Manual check: `npm run dev`, open `?bank=draft&admin`, edit a draft's problem text, confirm the JSON file on disk changed and the app reloaded with the new text. Full suite + build (production build must NOT include the middleware — it's a dev-server plugin, verify `dist/` has no `/__bank` references).
- [ ] Commit: `feat(admin): in-app draft question editing behind ?admin (dev-server write-back)`

### Task 5: Final review + merge

Whole-branch review (fable) with focus on: the admin write-path's guardrails (draft-only, file whitelist, dev-only), flow purity in draft mode, interim DOM order, nav state machine soundness. Then merge to main.

## Definition of Done

- Draft-mode run: sweep (cards+axis) → radar-first interim → drafts-only drill-downs (pilots) or honest coming-soon line → results; Pause works everywhere; no v0.1 question ever renders in draft mode.
- `?admin`: Gerald edits a draft in-app; file changes on disk; linter warnings surface; active records untouchable.
- 137+ tests green; build green; production bundle free of admin middleware.
