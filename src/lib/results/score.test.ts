import { describe, it, expect } from 'vitest'
import { scoreAnswers, PROVISIONAL_NORMALIZATION } from './score'
import type { Bank } from '../bank/schema'

const bank: Bank = {
  meta: { bankVersion: '1.0.0', releasedAt: '2026-07-18', changelog: './CHANGELOG.md' },
  categories: [
    { id: 'takedowns', name: 'Takedowns', axis: 'positional', weight: 1.2 },
    { id: 'mount_top', name: 'Mount top', axis: 'positional', weight: 1.0 },
    { id: 'meta_qualities', name: 'Meta Qualities', axis: 'meta', weight: 1.0 },
  ],
  scales: [
    { id: 'ladder6', kind: 'tap', label: 'L', secondsPerItem: 6, anchors: [{ value: 0, label: 'a' }, { value: 5, label: 'b' }] },
    { id: 'agree3', kind: 'tap', label: 'A', secondsPerItem: 6, anchors: [{ value: 0, label: 'a' }, { value: 2, label: 'b' }] },
    { id: 'know_check', kind: 'tap', label: 'K', secondsPerItem: 6, anchors: [{ value: 0, label: 'a' }, { value: 2, label: 'b' }] },
    { id: 'frequency10', kind: 'tap', label: 'F', secondsPerItem: 6, anchors: [{ value: 0, label: 'never' }, { value: 3, label: 'always' }] },
  ],
  questions: [
    { qid: 'td_a', v: 1, status: 'active', category: 'takedowns', axis: 'positional', input: 'ladder6', text: 'q', tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] },
    { qid: 'td_b', v: 1, status: 'active', category: 'takedowns', axis: 'positional', input: 'ladder6', text: 'q', tier: 'drilldown', scoring: { weight: 2, countsToward: 'skill' }, flags: [] },
    { qid: 'td_draft', v: 1, status: 'draft', category: 'takedowns', axis: 'positional', input: 'ladder6', text: 'q', tier: 'drilldown', scoring: { weight: 1, countsToward: 'skill' }, flags: [] },
    { qid: 'td_joy', v: 1, status: 'active', category: 'takedowns', axis: 'psychological', input: 'agree3', text: 'q', tier: 'drilldown', scoring: { weight: 1, countsToward: 'none' }, flags: [] },
    { qid: 'td_know', v: 1, status: 'active', category: 'takedowns', axis: 'psychological', input: 'know_check', text: 'q', tier: 'drilldown', scoring: { weight: 1, countsToward: 'none' }, flags: [] },
    { qid: 'mt_a', v: 1, status: 'active', category: 'mount_top', axis: 'positional', input: 'ladder6', text: 'q', tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] },
    { qid: 'mq_inverted', v: 1, status: 'draft', category: 'meta_qualities', axis: 'meta', input: 'frequency10', text: 'q', tier: 'drilldown', scoring: { weight: 1, countsToward: 'skill' }, flags: ['inverted'] },
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
  it('draft skill question answered but not counted in activeCount → uncertainty is narrow when all active answered', () => {
    const r = scoreAnswers({ td_a: a('td_a', 3), td_b: a('td_b', 2), td_draft: a('td_draft', 4) }, bank)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    // activeCount should exclude draft (only td_a and td_b are active) = 2
    expect(td.activeCount).toBe(2)
    // answered is 3 (td_a, td_b, td_draft all answered)
    expect(td.answered).toBe(3)
    // answered >= activeCount → narrow
    expect(td.uncertainty).toBe('narrow')
  })
  it('avoidance insight only fires for agree3 raw 0; know_check raw 0 does not trigger', () => {
    // answer td_b low (score 20) and both psychological questions with raw 0
    const r = scoreAnswers({ td_b: a('td_b', 1), td_know: a('td_know', 0), td_joy: a('td_joy', 1) }, bank)
    const td = r.categories.find(c => c.categoryId === 'takedowns')!
    expect(td.score).toBe(20)
    // No insight: td_know (know_check) raw 0 does not count, td_joy (agree3) raw 1 (not 0)
    expect(r.insights).toEqual([])

    // Same scenario but td_joy raw 0 with agree3 → insight fires
    const r2 = scoreAnswers({ td_b: a('td_b', 1), td_know: a('td_know', 0), td_joy: a('td_joy', 0) }, bank)
    const td2 = r2.categories.find(c => c.categoryId === 'takedowns')!
    expect(td2.score).toBe(20)
    expect(r2.insights).toEqual([{ categoryId: 'takedowns', kind: 'avoidance', text: expect.stringContaining('loop feeds itself') }])
  })
  it('inverted flag: frequency10 raw 3 (max) → category score 0; raw 0 → category score 100', () => {
    // mq_inverted is a draft frequency10 question with flags: ['inverted'], countsToward: 'skill'
    // frequency10 normalizes as raw/3; inverted means 1-(raw/3)
    // raw 3 → norm 1.0 → inverted 0.0 → score 0
    const rMax = scoreAnswers({ mq_inverted: a('mq_inverted', 3) }, bank)
    const mqMax = rMax.categories.find(c => c.categoryId === 'meta_qualities')!
    expect(mqMax.score).toBe(0)

    // raw 0 → norm 0.0 → inverted 1.0 → score 100
    const rMin = scoreAnswers({ mq_inverted: a('mq_inverted', 0) }, bank)
    const mqMin = rMin.categories.find(c => c.categoryId === 'meta_qualities')!
    expect(mqMin.score).toBe(100)
  })
})
