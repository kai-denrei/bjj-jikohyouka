import { describe, it, expect } from 'vitest'
import { loadBank } from './load'
import { lintText, lintQuestion } from './lint'

describe('§9 seed drafts', () => {
  const bank = loadBank()
  const drafts = bank.questions.filter(q => q.status === 'draft')
  it('exist and are all marked placeholder', () => {
    expect(drafts.length).toBeGreaterThanOrEqual(40)
    expect(drafts.every(q => q.rationale?.startsWith('PLACEHOLDER — pending Gerald review'))).toBe(true)
  })
  it('15 draft sweep rewrites, one per positional category, ability_axis, with lineage', () => {
    const positionalCatIds = new Set(bank.categories.filter(c => c.axis === 'positional').map(c => c.id))
    const sweep = drafts.filter(q => q.tier === 'core' && positionalCatIds.has(q.category))
    expect(sweep).toHaveLength(15)
    expect(new Set(sweep.map(q => q.category)).size).toBe(15)
    expect(sweep.every(q => q.input === 'ability_axis' && typeof q.replaces === 'string')).toBe(true)
  })
  it('draft sweep + meta items pass the wording linter clean', () => {
    const META_CATS = new Set(['meta_qualities', 'pressure', 'connection', 'mind_games'])
    const strict = drafts.filter(q => q.tier === 'core' || META_CATS.has(q.category))
    for (const q of strict) expect(lintText(q.qid, q.text), q.qid).toEqual([])
  })
  it('psychological and reputation partner items never count toward skill', () => {
    // needs_gerald_review is a general content-review marker (can sit on skill
    // questions); the no-skill invariant applies to psychological items and to
    // the reputation set's partner-quality items specifically.
    const noSkill = drafts.filter(
      q => q.axis === 'psychological' || (q.category === 'reputation' && q.flags.includes('needs_gerald_review'))
    )
    expect(noSkill.length).toBeGreaterThan(0)
    expect(noSkill.every(q => q.scoring.countsToward !== 'skill')).toBe(true)
  })
  it('active bank is untouched: still 173 active', () => {
    expect(bank.questions.filter(q => q.status === 'active')).toHaveLength(173)
  })
})

describe('§10 ability-axis rework', () => {
  const bank = loadBank()
  it('all axis drafts carry complete slots', () => {
    // Format per Gerald's 2026-07-20 edit pass: problem is a short precise
    // phrase, NOT a "Do you…?" question — the fixed axis prompt carries the
    // question-ness. The who slot is on its way out (verdict #4).
    const axisDrafts = bank.questions.filter(q => q.status === 'draft' && q.input === 'ability_axis')
    expect(axisDrafts.length).toBeGreaterThanOrEqual(25)
    for (const q of axisDrafts) {
      expect(q.slots, q.qid).toBeDefined()
      expect(q.slots!.what.length, q.qid).toBeGreaterThan(0)
      expect(q.slots!.problem.length, q.qid).toBeGreaterThan(0)
    }
  })
  it('slots are linter-clean on axis drafts', () => {
    const axisDrafts = bank.questions.filter(q => q.status === 'draft' && q.input === 'ability_axis')
    for (const q of axisDrafts) expect(lintQuestion(q), q.qid).toEqual([])
  })
  it('no draft belt_threshold or ladder6 skill items remain', () => {
    const stale = bank.questions.filter(q => q.status === 'draft' && ['belt_threshold', 'ladder6'].includes(q.input))
    expect(stale.map(q => q.qid)).toEqual([])
  })
  it('active bank still untouched: 173 active', () => {
    expect(bank.questions.filter(q => q.status === 'active')).toHaveLength(173)
  })
})
