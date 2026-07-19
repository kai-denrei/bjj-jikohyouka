import { describe, it, expect } from 'vitest'
import { scoreAnswers, PROVISIONAL_NORMALIZATION } from './score'
import type { Bank } from '../bank/schema'

const bank: Bank = {
  meta: { bankVersion: '1.0.0', releasedAt: '2026-07-18', changelog: './CHANGELOG.md' },
  categories: [
    { id: 'takedowns', name: 'Takedowns', axis: 'positional', weight: 1.2 },
    { id: 'mount_top', name: 'Mount top', axis: 'positional', weight: 1.0 },
  ],
  scales: [
    { id: 'ladder6', kind: 'tap', label: 'L', secondsPerItem: 6, anchors: [{ value: 0, label: 'a' }, { value: 5, label: 'b' }] },
    { id: 'agree3', kind: 'tap', label: 'A', secondsPerItem: 6, anchors: [{ value: 0, label: 'a' }, { value: 2, label: 'b' }] },
  ],
  questions: [
    { qid: 'td_a', v: 1, status: 'active', category: 'takedowns', axis: 'positional', input: 'ladder6', text: 'q', tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] },
    { qid: 'td_b', v: 1, status: 'active', category: 'takedowns', axis: 'positional', input: 'ladder6', text: 'q', tier: 'drilldown', scoring: { weight: 2, countsToward: 'skill' }, flags: [] },
    { qid: 'td_joy', v: 1, status: 'active', category: 'takedowns', axis: 'psychological', input: 'agree3', text: 'q', tier: 'drilldown', scoring: { weight: 1, countsToward: 'none' }, flags: [] },
    { qid: 'mt_a', v: 1, status: 'active', category: 'mount_top', axis: 'positional', input: 'ladder6', text: 'q', tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] },
  ],
}
const a = (qid: string, raw: number | number[] | null) => ({ qid, v: 1, raw })

describe('scoreAnswers (provisional)', () => {
  it('weights within category: ladder 5 (w1) + ladder 2 (w2) → 100*(1*1 + 0.4*2)/3 = 60', () => {
    const r = scoreAnswers({ td_a: a('td_a', 5), td_b: a('td_b', 2) }, bank)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.score).toBe(60)
    expect(td.band).toBe('Positional')
    expect(td.toNextBand).toBe(20)
  })
  it('psychological answers never move the score but do fire the avoidance insight when score < 40', () => {
    const r = scoreAnswers({ td_b: a('td_b', 1), td_joy: a('td_joy', 0) }, bank)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.score).toBe(20)
    expect(r.insights).toEqual([{ categoryId: 'takedowns', kind: 'avoidance', text: expect.stringContaining('loop feeds itself') }])
  })
  it('single answer → wide uncertainty; unanswered category → null score, none', () => {
    const r = scoreAnswers({ td_a: a('td_a', 3) }, bank)
    expect(r.categories.find(c => c.categoryId === 'takedowns')!.uncertainty).toBe('wide')
    const mt = r.categories.find(c => c.categoryId === 'mount_top')!
    expect(mt.score).toBeNull(); expect(mt.uncertainty).toBe('none')
  })
  it('N/A raw is skipped, belt_curve normalizes by mean/10', () => {
    expect(PROVISIONAL_NORMALIZATION.belt_curve([10, 10, 10, 10, 10])).toBe(1)
    const r = scoreAnswers({ td_a: a('td_a', null) }, bank)
    expect(r.categories.find(c => c.categoryId === 'takedowns')!.score).toBeNull()
  })
  it('score 100 is Weapon with no next band', () => {
    const r = scoreAnswers({ td_a: a('td_a', 5), td_b: a('td_b', 5) }, bank)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.band).toBe('Weapon'); expect(td.toNextBand).toBeNull()
  })
})
