# bjj-jikohyouka — BJJ Skill-Check v0.2

Standalone rebuild of the BJJ Skill-Check (v0.1 PoC:
[jelaludo/grapplingprimitives](https://github.com/jelaludo/grapplingprimitives),
live at grapplingprimitives.com/modules/skill-check/).

**Start here: [`skill-check-v0.2-build-brief.md`](skill-check-v0.2-build-brief.md).**
Read it fully before touching code. The core deliverable is the Question Bank
System (brief §4) — versioned, validated question content fully decoupled from
code — plus tap-only input widgets, a sweep→drill-down flow, and Results v2.
Question content is iterated by Gerald; all drafted content ships as
`status: "draft"` and never reaches production without review.

## Layout

- `skill-check-v0.2-build-brief.md` — the working brief (Appendix B is the running brainstorm log; keep appending)
- `src/data/legacy/skill-assessment.v0.1.json` — frozen v0.1 content (173 questions, 15 categories), vendored from upstream `main` on 2026-07-18; conversion source for bank 1.0.0. Note its internal `metadata` block is stale (says 126/11) — trust the records.
- `src/data/question-bank/` — the v0.2 bank lives here (layout per brief §4.1); not yet built

## Dev

```bash
npm install
npm run dev
```

Planned bank commands (brief §4.4, not yet implemented): `bank:validate`, `bank:release`, `bank:review`.
