import { describe, it, expect } from 'vitest'
import { loadBank } from './load'
import { lintQuestion } from './lint'

describe('§9 bank cutover 1.1.0 — post-cutover invariants', () => {
  const bank = loadBank()

  it('retired count is exactly 173 (all v0.1 slider10/belt_curve)', () => {
    const retired = bank.questions.filter(q => q.status === 'retired')
    expect(retired).toHaveLength(173)
    // All retired items should be the old v0.1 input formats
    const retiredInputs = new Set(retired.map(q => q.input))
    expect(retiredInputs.has('slider10') || retiredInputs.has('belt_curve')).toBe(true)
    // No ability_axis items should be retired
    expect(retired.filter(q => q.input === 'ability_axis')).toHaveLength(0)
  })

  it('active count = 28, all ability_axis', () => {
    const active = bank.questions.filter(q => q.status === 'active')
    expect(active).toHaveLength(28)
    expect(active.every(q => q.input === 'ability_axis')).toBe(true)
  })

  it('active = 15 cores + 13 pilot drilldowns', () => {
    const active = bank.questions.filter(q => q.status === 'active')
    const cores = active.filter(q => q.tier === 'core')
    const drilldowns = active.filter(q => q.tier === 'drilldown')
    expect(cores).toHaveLength(15)
    expect(drilldowns).toHaveLength(13)
  })

  it('15 active sweep cores, one per positional category, ability_axis, with lineage', () => {
    const positionalCatIds = new Set(bank.categories.filter(c => c.axis === 'positional').map(c => c.id))
    const sweepCores = bank.questions.filter(q =>
      q.status === 'active' && q.tier === 'core' && positionalCatIds.has(q.category)
    )
    expect(sweepCores).toHaveLength(15)
    expect(new Set(sweepCores.map(q => q.category)).size).toBe(15)
    expect(sweepCores.every(q => q.input === 'ability_axis' && typeof q.replaces === 'string')).toBe(true)
  })

  it('zero active slider10 or belt_curve items', () => {
    const active = bank.questions.filter(q => q.status === 'active')
    expect(active.filter(q => q.input === 'slider10')).toHaveLength(0)
    expect(active.filter(q => q.input === 'belt_curve')).toHaveLength(0)
  })

  it('new meta categories (pressure/connection/mind_games) still draft', () => {
    const META_CATS = new Set(['pressure', 'connection', 'mind_games'])
    const metaActive = bank.questions.filter(q => META_CATS.has(q.category) && q.status === 'active')
    expect(metaActive).toHaveLength(0)
    const metaDraft = bank.questions.filter(q => META_CATS.has(q.category) && q.status === 'draft')
    expect(metaDraft.length).toBeGreaterThan(0)
  })

  it('reputation items still all draft', () => {
    const repActive = bank.questions.filter(q => q.category === 'reputation' && q.status === 'active')
    expect(repActive).toHaveLength(0)
  })

  it('psychological and reputation partner items never count toward skill', () => {
    // needs_gerald_review is a general content-review marker (can sit on skill
    // questions); the no-skill invariant applies to psychological items and to
    // the reputation set's partner-quality items specifically.
    const noSkill = bank.questions.filter(
      q => q.axis === 'psychological' || (q.category === 'reputation' && q.flags.includes('needs_gerald_review'))
    )
    expect(noSkill.every(q => q.scoring.countsToward !== 'skill')).toBe(true)
  })
})

describe('§10 ability-axis rework — post-cutover', () => {
  const bank = loadBank()

  it('all active ability_axis items carry complete slots', () => {
    const axisActive = bank.questions.filter(q => q.status === 'active' && q.input === 'ability_axis')
    expect(axisActive.length).toBeGreaterThanOrEqual(28)
    for (const q of axisActive) {
      expect(q.slots, q.qid).toBeDefined()
      expect(q.slots!.what.length, q.qid).toBeGreaterThan(0)
      expect(q.slots!.problem.length, q.qid).toBeGreaterThan(0)
    }
  })

  it('slots are linter-clean on active axis items', () => {
    const axisActive = bank.questions.filter(q => q.status === 'active' && q.input === 'ability_axis')
    for (const q of axisActive) expect(lintQuestion(q), q.qid).toEqual([])
  })

  it('no active belt_threshold or ladder6 items', () => {
    const stale = bank.questions.filter(q => q.status === 'active' && ['belt_threshold', 'ladder6'].includes(q.input))
    expect(stale.map(q => q.qid)).toEqual([])
  })
})
