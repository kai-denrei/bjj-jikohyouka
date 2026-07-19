import { describe, it, expect } from 'vitest'
import { includeDrafts, sweepQuestions, drilldownQuestions, recommendedDrilldowns, visibleQuestions } from './flow'
import { loadBank } from './bank/load'
import { scoreAnswers } from './results/score'

const bank = loadBank()  // node loader is fine in tests

describe('flow selection', () => {
  it('parses the draft flag', () => {
    expect(includeDrafts('?bank=draft')).toBe(true)
    expect(includeDrafts('')).toBe(false)
  })
  it('sweep = 15 core questions, one per positional category, in category order', () => {
    const qs = sweepQuestions(bank, false)
    expect(qs).toHaveLength(15)
    // Only positional categories have active core items; meta/reputation are draft-only
    const positionalCategoryIds = bank.categories.filter(c => c.axis === 'positional').map(c => c.id)
    expect(qs.map(q => q.category)).toEqual(positionalCategoryIds)
    expect(qs.every(q => q.tier === 'core' && q.status === 'active')).toBe(true)
  })
  it('drilldown excludes the core item and retired items', () => {
    const qs = drilldownQuestions(bank, 'takedowns', false)
    expect(qs.every(q => q.tier === 'drilldown' && q.status !== 'retired')).toBe(true)
    expect(qs.length).toBeGreaterThan(3)
  })
  it('never returns retired questions in any mode', () => {
    expect(visibleQuestions(bank, true).every(q => q.status !== 'retired')).toBe(true)
  })
  it('recommends the 3 lowest categories', () => {
    const answers = Object.fromEntries(sweepQuestions(bank, false).map((q, i) => [q.qid, { qid: q.qid, v: q.v, raw: i < 3 ? 2 : 8 }]))
    const recs = recommendedDrilldowns(scoreAnswers(answers, bank), bank)
    expect(recs).toHaveLength(3)
    expect(recs).toEqual(bank.categories.slice(0, 3).map(c => c.id))
  })

  it('draft mode drill-downs return only draft questions for a pilot category', () => {
    const qs = drilldownQuestions(bank, 'takedowns', true)
    expect(qs.every(q => q.status === 'draft')).toBe(true)
    expect(qs.length).toBeGreaterThan(0)
  })

  it('draft mode drill-downs return empty array for non-pilot categories', () => {
    const qs = drilldownQuestions(bank, 'mount_top', true)
    expect(qs).toEqual([])
  })

  it('non-draft mode drill-downs return only active questions (unchanged)', () => {
    const qs = drilldownQuestions(bank, 'takedowns', false)
    expect(qs.every(q => q.status === 'active')).toBe(true)
    expect(qs.length).toBeGreaterThan(0)
  })
})
