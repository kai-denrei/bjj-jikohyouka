import { describe, it, expect } from 'vitest'
import { loadBank } from './load'
import { lintText } from './lint'

describe('§9 seed drafts', () => {
  const bank = loadBank()
  const drafts = bank.questions.filter(q => q.status === 'draft')
  it('exist and are all marked placeholder', () => {
    expect(drafts.length).toBeGreaterThanOrEqual(40)
    expect(drafts.every(q => q.rationale?.startsWith('PLACEHOLDER — pending Gerald review'))).toBe(true)
  })
  it('15 draft sweep rewrites, one per positional category, ladder6, with lineage', () => {
    const sweep = drafts.filter(q => q.tier === 'core')
    expect(sweep).toHaveLength(15)
    expect(new Set(sweep.map(q => q.category)).size).toBe(15)
    expect(sweep.every(q => q.input === 'ladder6' && typeof q.replaces === 'string')).toBe(true)
  })
  it('draft sweep + meta items pass the wording linter clean', () => {
    const strict = drafts.filter(q => q.tier === 'core' || q.category === 'meta_qualities')
    for (const q of strict) expect(lintText(q.qid, q.text), q.qid).toEqual([])
  })
  it('psychological and partner items never count toward skill', () => {
    const noSkill = drafts.filter(q => q.axis === 'psychological' || q.flags.includes('needs_gerald_review'))
    expect(noSkill.length).toBeGreaterThan(0)
    expect(noSkill.every(q => q.scoring.countsToward !== 'skill')).toBe(true)
  })
  it('active bank is untouched: still 173 active', () => {
    expect(bank.questions.filter(q => q.status === 'active')).toHaveLength(173)
  })
})
