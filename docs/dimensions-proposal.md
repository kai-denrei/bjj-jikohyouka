# Dimensions model proposal — meta-qualities

**For:** Gerald  
**Date:** 2026-07-20  
**Context:** The app currently tracks seven qualities (pressure, connection, composure, timing, chaining, defense depth, adaptability) as questions inside the `meta_qualities` category — one bucket, one score. This note describes three ways the model could grow, and recommends one.

---

## The problem worth solving

The seven qualities don't feel like a position. Takedowns and guard passing can be isolated: you either hold the position or you don't. Pressure and timing cut through every position — they show up in mount, in guard passing, in escapes. Treating them as a single `meta_qualities` score collapses information that might be worth preserving.

---

## Option A — Keep the single meta bucket (status quo)

The seven questions stay as they are: one category, one score, one row on the dashboard. Questions are tagged `axis: meta` but there is no per-quality breakdown.

**What it costs:** You lose the ability to tell someone "your timing is strong, your chaining is weak." The score is an average over things that may not average well. A person with elite pressure and zero chaining gets the same number as someone mediocre at both.

**What it buys:** Zero migration work. The model is already shipped. If users don't ask for per-quality drill-down, the cost of the ceiling is invisible.

---

## Option B — First-class dimensions with their own drill-downs and viz axes

Each quality becomes its own category: `dim_pressure`, `dim_timing`, etc. Each gets its own sweep question, its own drilldown questions, its own score band, and its own axis on the belt-curve chart.

**What it costs:** Seven new categories roughly double the depth of the question bank. The sweep grows from 15 to ~22 questions (one per positional + one per quality). The viz needs new axes or tabs. The dashboard gains seven more rows. This is a significant scope expansion at a point where the bank is still stabilising. It also presupposes that the qualities are independent enough to score separately — which is an untested assumption.

**What it buys:** Maximum resolution. Gerald can see exactly which quality is holding him back. The chart can show "your pressure is blue-belt-level but your chaining is white-belt-level." That's a richer mirror.

---

## Option C — Cross-cutting overlay scored from tagged items across categories (recommended)

Questions already in the bank get tagged with one or more quality labels (`tags: ["pressure"]`, `tags: ["timing"]`). No new categories are created. A quality score is computed as the weighted average of all tagged answers across the existing positional categories — wherever pressure shows up in mount, in guard passing, in drilldowns — it counts.

The dashboard gains a second section (or tab) showing quality scores derived from the existing data. As users answer more drilldowns, quality scores become more confident. Early in the session the quality bars are wide; after several categories they tighten.

**What it costs:** Tagging every relevant question is editorial work (estimate: 1–2 hours for the current bank, growing with each new question). The scoring logic needs a second pass over answers by tag rather than by category. The quality scores are only as reliable as the coverage — a user who only answers takedown drilldowns gets a "timing" score that's really just takedown timing.

**What it buys:** No scope explosion. The bank stays at 15 positional categories. Quality scores emerge from the same answers already collected — no extra sweep questions. As the bank grows, quality coverage grows for free wherever questions are tagged. The model is extensible: add a new quality label, tag existing questions, quality score appears without architecture changes. This also avoids the independence assumption of Option B: if pressure and chaining always co-vary in practice, the tagging will reveal that naturally (overlapping tags across categories).

---

## Recommendation: Option C

Option A leaves value on the table that users are already implicitly asking for when they tap "What we measure." Option B pays a scope cost the bank isn't ready to absorb — the questions themselves are still marked `draft` and `needs_gerald_review`. Option C threads the needle: it gives per-quality signal from the data already collected, defers the editorial tagging work until the bank stabilises, and doesn't require new UI screens or new sweep questions.

The first milestone for Option C is small: tag the 10 existing `meta_qualities.json` questions with quality labels, add tag-based aggregation to `scoreAnswers`, and surface quality scores as a collapsed section on the dashboard. That can ship as one task without touching the question bank structure or the chart.

---

Decision: (b) — first-class categories for pressure, connection, and mind games, per Gerald 2026-07-20 (verdict #6). Sweep inclusion (15 → 18) still open; current build keeps the sweep at 15 positional.
