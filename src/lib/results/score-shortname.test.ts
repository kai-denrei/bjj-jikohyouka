/**
 * score-shortname.test.ts — CategoryScore gains shortName? (Task 1)
 * Tests that scoreAnswers copies shortName from bank category into CategoryScore.
 */
import { describe, it, expect } from 'vitest'
import { scoreAnswers } from './score'
import type { Bank } from '../bank/schema'

const bankWithShortNames: Bank = {
  meta: { bankVersion: '1.0.0', releasedAt: '2026-07-20', changelog: './CHANGELOG.md' },
  categories: [
    { id: 'takedowns', name: 'Takedowns & Wrestling', shortName: 'Takedowns', axis: 'positional', weight: 1.2 },
    { id: 'guard_top', name: 'Guard Passing (Top)', shortName: 'Guard Pass', axis: 'positional', weight: 1.0 },
    { id: 'meta_qualities', name: 'Meta-qualities', axis: 'meta', weight: 1.0 },
  ],
  scales: [
    { id: 'ladder6', kind: 'tap', label: 'L', secondsPerItem: 6,
      anchors: [{ value: 0, label: 'a' }, { value: 5, label: 'b' }] },
  ],
  questions: [
    { qid: 'td_a', v: 1, status: 'active', category: 'takedowns', axis: 'positional',
      input: 'ladder6', text: 'q', tier: 'core',
      scoring: { weight: 1, countsToward: 'skill' }, flags: [] },
  ],
}

describe('CategoryScore shortName', () => {
  it('copies shortName from bank category when present', () => {
    const r = scoreAnswers({ td_a: { qid: 'td_a', v: 1, raw: 3 } }, bankWithShortNames)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.shortName).toBe('Takedowns')
  })

  it('shortName is undefined when bank category has no shortName', () => {
    const r = scoreAnswers({}, bankWithShortNames)
    const meta = r.categories.find(c => c.categoryId === 'meta_qualities')!
    expect(meta.shortName).toBeUndefined()
  })

  it('shortName is copied even for unscored categories', () => {
    const r = scoreAnswers({}, bankWithShortNames)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.shortName).toBe('Takedowns')
  })
})
