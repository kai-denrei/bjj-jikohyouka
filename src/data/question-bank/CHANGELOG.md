# Question Bank Changelog

## [Unreleased — drafts]

- Verdict #6 dimensions decision: three new first-class meta-quality categories — `pressure`, `connection`, `mind_games` (axis: meta, weight: 1.0).
- Migrated to `pressure`: `mq_pressure_weight`, `mq_feedback_pressure`.
- Migrated to `connection`: `mq_no_guard_recovery`.
- New draft questions (from Gerald's verdict #6 stems, pending review): `pr_top_pressure_core`, `pr_weight_settle`, `pr_pressure_no_escape` (pressure); `cn_frames_core`, `cn_hip_shoulder_read`, `cn_transition_no_gap` (connection); `mg_exchange_core`, `mg_bait_reaction`, `mg_pattern_read` (mind_games).
- Sweep guard: `sweepQuestions` now filters to `axis === 'positional'` only — sweep stays at 15 regardless of new meta core drafts.
- §10 ability-axis rework: all 15 core sweep drafts + drilldown ladder6 items (td, cgb, hgb categories) + meta-qualities ladder6 items converted to `input: "ability_axis"` with `slots` (who/what/problem). Deleted redundant belt_threshold drafts: `td_belt_takedowns`, `cgb_belt_submissions`, `hgb_belt_sweeps`.
- §9 seed content: 15 sweep rewrites (ladder6, core), 3 pilot drilldown categories (takedowns, closed_guard_bottom, half_guard_bottom), ~10 meta-qualities items, ~8 reputation items — all `status: "draft"`, pending Gerald review.
- Review flags for Gerald: hgb_underhook_live/hgb_crossface_deal possible near-duplicate (merge decision); hgb_deep_half_live slot framing (situation is half guard, deep half is the entry); mq_pressure_weight problem is opponent-subject by design ("Do they give up...").

## 1.0.0 — 2026-07-18

- Initial conversion of v0.1 `skill-assessment.json` (173 questions, 15 categories). All records `active`, inputs `slider10`/`belt_curve`, qids preserved from v0.1.
- Review flags (verdict #6 review): `pr_top_pressure_core` — `what` names the dimension itself ("Top pressure — Relaxed pressure…", double-pressure circularity; consider a concrete moment like "A dominant pin"); `mg_exchange_core` — "The exchange" under-specifies the situation. Both from Gerald's stems — his wording call. The earlier `mq_pressure_weight` opponent-subject note: that item now lives in the pressure category, framing unchanged.
