import { describe, it, expect } from 'vitest'
import { includeDrafts, includeAdmin, sweepQuestions, drilldownQuestions, recommendedDrilldowns, visibleQuestions } from './flow'
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
  it('draft mode sweep stays positional-only at 15 despite new meta core drafts', () => {
    const qs = sweepQuestions(bank, true)
    expect(qs).toHaveLength(15)
    expect(qs.every(q => {
      const cat = bank.categories.find(c => c.id === q.category)
      return cat?.axis === 'positional'
    })).toBe(true)
  })
  it('drilldown excludes the core item and retired items', () => {
    const qs = drilldownQuestions(bank, 'takedowns', false)
    expect(qs.every(q => q.tier === 'drilldown' && q.status !== 'retired')).toBe(true)
    // After cutover: pilot drilldowns are active ability_axis items
    expect(qs.length).toBeGreaterThan(0)
    expect(qs.every(q => q.input === 'ability_axis')).toBe(true)
  })
  it('never returns retired questions in any mode', () => {
    expect(visibleQuestions(bank, true).every(q => q.status !== 'retired')).toBe(true)
  })
  it('recommends the 3 lowest categories', () => {
    // After cutover all sweep questions use ability_axis (raw: 1–100)
    // Give first 3 categories low raw (20) and rest high (80) to pin 3 lowest = first 3 positional
    const answers = Object.fromEntries(sweepQuestions(bank, false).map((q, i) => [q.qid, { qid: q.qid, v: q.v, raw: i < 3 ? 20 : 80 }]))
    const recs = recommendedDrilldowns(scoreAnswers(answers, bank), bank)
    expect(recs).toHaveLength(3)
    expect(recs).toEqual(bank.categories.slice(0, 3).map(c => c.id))
  })

  it('draft mode drill-downs return draft questions for a pilot category', () => {
    const qs = drilldownQuestions(bank, 'takedowns', true)
    expect(qs.every(q => q.status === 'draft')).toBe(true)
    // After cutover: ability_axis pilot drilldowns are active; remaining drafts are frequency10/agree3 supplements
    // for a non-pilot category, should still be empty
    const mountQs = drilldownQuestions(bank, 'mount_top', true)
    expect(mountQs).toEqual([])
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

  it('any remaining draft pilot questions never include v0.1 input formats (slider10 or belt_curve)', () => {
    const qs = drilldownQuestions(bank, 'takedowns', true)
    // If drafts exist in pilot categories, they must not be v0.1 format
    expect(qs.every(q => q.input !== 'slider10' && q.input !== 'belt_curve')).toBe(true)
  })
})

describe('includeAdmin', () => {
  it('returns true when ?admin param is present (key forms)', () => {
    expect(includeAdmin('?admin')).toBe(true)
    expect(includeAdmin('?bank=draft&admin')).toBe(true)
    expect(includeAdmin('?admin=1')).toBe(true)
  })
  it('returns true when value is "admin" (value forms)', () => {
    // ?=admin — empty key, value "admin"
    expect(includeAdmin('?=admin')).toBe(true)
    // ?mode=admin — arbitrary key with value "admin"
    expect(includeAdmin('?mode=admin')).toBe(true)
    // case-insensitive value
    expect(includeAdmin('?mode=Admin')).toBe(true)
    // mixed: ?bank=draft&mode=admin
    expect(includeAdmin('?bank=draft&mode=admin')).toBe(true)
  })
  it('returns false when admin param is absent', () => {
    expect(includeAdmin('')).toBe(false)
    expect(includeAdmin('?bank=draft')).toBe(false)
    // substring match in value must NOT count — only exact "admin" value
    expect(includeAdmin('?mode=administrator')).toBe(false)
  })
})

describe('includeDrafts', () => {
  it('returns true for ?bank=draft', () => {
    expect(includeDrafts('?bank=draft')).toBe(true)
    expect(includeDrafts('?other=x&bank=draft')).toBe(true)
  })
  it('returns false for empty search', () => {
    expect(includeDrafts('')).toBe(false)
  })
  it('returns false when bank param has a different value', () => {
    // Regression: substring "draft" inside a longer value must NOT match
    expect(includeDrafts('?bank=predraft')).toBe(false)
    expect(includeDrafts('?bank=DRAFT')).toBe(false)
  })
})
