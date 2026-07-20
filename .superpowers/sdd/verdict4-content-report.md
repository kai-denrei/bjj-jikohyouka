# Verdict-4 Content Alignment Report

**Branch:** verdict-4  
**Date:** 2026-07-20  
**Scope:** 21 ability_axis draft records (13 positional drilldowns + 8 meta-qualities) aligned to Gerald's 2026-07-20 style pass

---

## Style Guide Extracted from Gerald's 15 Sweep Problems

**Pattern:** `what` = short noun phrase naming the situation (possessive where applicable); `problem` = gerund or noun phrase, task + failure pressure, no "Do you…?" wrapper, no question mark.

Examples from his 15:
- "takedown against full resistance"
- "passing before they threaten a sweep or submission"
- "Framing, Escaping, reaching half-guard before they attack"
- "Deny crossface and seize the attack tempo"

**AI-draft anti-patterns removed:** "Do you X before Y?", "Does their X put them into Y?", verbose conditional clauses, question marks.

---

## Before → After Table: 13 Positional Drilldowns

| qid | Before `what` | Before `problem` | After `what` | After `problem` |
|-----|--------------|-----------------|-------------|----------------|
| td_kuzushi_live | standing grip exchanges | Does your grip fighting create an opening for entry before they reset? | Standing grip exchanges | Winning the grip battle to create an entry before they reset |
| td_double_leg_live | a double-leg drill | Do you change levels, drive through, and finish with correct head position? | A double-leg drill | Changing levels, driving through, and finishing with head position |
| td_double_leg_live_roll | free rolling from standing | Do you shoot and complete a double-leg against full resistance? | Free rolling from standing | Shooting and finishing a double-leg against full resistance |
| td_defend_counter_live | their takedown shot | Do you sprawl or redirect and end up on top or back to neutral? | Their takedown shot | Sprawling or redirecting to top or neutral |
| td_clinch_entry | a standing clinch | Do you create a takedown entry within 10 seconds? | A standing clinch | Creating a takedown entry before the clinch stalls |
| cgb_break_to_sub | my closed guard after posture break | Do you enter a submission they must actively defend? | My closed guard after posture break | Threading a submission they must defend before they recover posture |
| cgb_hip_angle | my closed guard attacks | Do you shift hips off-center before each attack to weaken their frame? | My closed guard attacks | Shifting hips off-center before each attack to break their frame |
| cgb_sweep_when_needed | my closed guard when submissions stall | Do you complete a hip-bump or scissor sweep when they shut down your attacks? | My closed guard when submissions stall | Hip-bump or scissor sweep when they shut down attacks |
| cgb_posture_break_standing | my closed guard when they stand | Do you break their base before they begin a pass? | My closed guard when they stand | Breaking their base before they begin a pass |
| hgb_underhook_live | my half guard under crossface | Do you frame and swim to the underhook before they flatten you? | My half guard under crossface | Framing and swimming to the underhook before they flatten you |
| hgb_pass_prevent | my half guard under their pass | Do you retain the leg entanglement or recover guard before they reach side control? | My half guard under their pass | Retaining the entanglement or recovering guard before they reach side control |
| hgb_deep_half_live | my deep half guard | Do you sweep or return to top against their defensive base? | My deep half guard | Sweeping or reaching top against their defensive base |
| hgb_crossface_deal | my half guard under heavy crossface | Do you frame, create space, and regain initiative within five seconds? | My half guard under heavy crossface | Framing, creating space, and regaining initiative before they flatten you |

---

## Before → After Table: 8 Meta-Qualities

| qid | Before `what` | Before `problem` | After `what` | After `problem` |
|-----|--------------|-----------------|-------------|----------------|
| mq_pressure_weight | my top pins | Do they give up the position before you attack? | My top pins | Opponents conceding position before you attack |
| mq_composure_bad_spot | their dominant position | Do you frame, breathe, and plan before they attack? | Their dominant position | Framing, breathing, and planning before they attack |
| mq_timing_entry | a shifted base or broken grip | Do you enter before they can reset? | A shifted base or broken grip | Entering before they reset |
| mq_chain_second_attack | my first submission attempt | Does their defense put them into your next attack? | My first submission attempt | Their defense feeding your next attack |
| mq_defense_early | their submission setup | Do you strip the grip or frame before they reach a finishing position? | Their submission setup | Stripping the grip or framing before they reach a finish |
| mq_defense_late | a near-finished submission | Do you create space or change the angle before you tap? | A near-finished submission | Creating space or changing the angle before tapping |
| mq_adapt_unfamiliar_guard | an unfamiliar guard style | Do you find a passing entry within the first minute? | An unfamiliar guard style | Finding a passing entry before the first minute ends |
| mq_adapt_body_type | a size or reach mismatch | Does your attack rate stay above zero in the first two rounds? | A size or reach mismatch | Keeping your attack rate above zero through the first two rounds |

---

## Validation Results

- `npm run bank:validate`: OK — 0 errors, 0 new warnings (8 pre-existing on active records unchanged)
- `npm run bank:review`: docs/bank-review.md regenerated (612 lines)
- `npm test`: 182/182 passed
- `npm run build`: clean (98ms)

---

## Self-Review: Voice Check (21 Problems Read in Head Next to Gerald's 15)

**Strong matches:**
- `td_defend_counter_live`: "Sprawling or redirecting to top or neutral" — tight, same economy as "Clearing their knee shield and advancing to side control or KoB/NS"
- `cgb_sweep_when_needed`: "Hip-bump or scissor sweep when they shut down attacks" — concrete, no committee padding
- `mq_timing_entry`: "Entering before they reset" — matches the spare directness of "takedown against full resistance"
- `mq_composure_bad_spot`: "Framing, breathing, and planning before they attack" — matched pattern of "Framing, Escaping, reaching half-guard before they attack"

**Three records I'm least sure about:**

1. **mq_chain_second_attack** — `"Their defense feeding your next attack"` — nominalized/abstract. Gerald uses gerunds. Alternative to consider: "Chaining to a second attack as their defense opens the angle". Kept current version because Gerald's own "Deny crossface and seize the attack tempo" uses a noun-phrase structure and this is an observable outcome at the meta-qualities level. Flag for review.

2. **mq_pressure_weight** — `"Opponents conceding position before you attack"` — describes a thing that happens to them, not a task you do. Stays in spirit of "partners concede position from my weight alone" (Appendix B), but the gerund is third-person passive in feel. Alternative: "Partners conceding the position before you attack" (more direct attribution). Flag for review.

3. **cgb_break_to_sub** — `"Threading a submission they must defend before they recover posture"` — "threading" is less standard in the genre than "entering" or "catching". Alternative: "Entering a submission before they recover posture". Kept "threading" to preserve the "they must defend" sub-clause (it's the observable pressure signal). Flag for review.

---

## Notes

- All qids, status, replaces, flags (incl. needs_gerald_review where present), v, scoring, category, axis, tier unchanged.
- `what` capitalization normalized to sentence case on all records (matches deriveText behavior — first char uppercased).
- "within 10 seconds" (td_clinch_entry) reworded to "before the clinch stalls" — more observable, less arbitrary than a timer. Time window was AI-invented; stalling is the real failure.
- "within five seconds" (hgb_crossface_deal) reworded to "before they flatten you" — same reasoning.
