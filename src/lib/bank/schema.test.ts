import { describe, it, expect } from 'vitest'
import { QuestionSchema, ScaleSchema, BankMetaSchema } from './schema'

const validQuestion = {
  qid: 'td_takedown_live', v: 2, status: 'active', replaces: 'td_002',
  category: 'takedowns', axis: 'positional', input: 'ladder6',
  text: 'Standing against a resisting same-rank partner, I complete a takedown',
  tier: 'core', scoring: { weight: 1.0, countsToward: 'skill' },
  rationale: 'Rewrite of td_002', flags: [],
}

describe('QuestionSchema', () => {
  it('accepts a valid record', () => {
    expect(QuestionSchema.parse(validQuestion).qid).toBe('td_takedown_live')
  })
  it('accepts future-proofing hooks (§4.6)', () => {
    const q = { ...validQuestion, difficulty: 0.4, abTestGroup: 'b', raterMode: 'observer' }
    expect(QuestionSchema.parse(q).raterMode).toBe('observer')
  })
  it('rejects bad status', () => {
    expect(() => QuestionSchema.parse({ ...validQuestion, status: 'live' })).toThrow()
  })
  it('rejects unknown keys (strict)', () => {
    expect(() => QuestionSchema.parse({ ...validQuestion, weight: 2 })).toThrow()
  })
  it('rejects unknown axis values', () => {
    expect(() => QuestionSchema.parse({ ...validQuestion, axis: 'vibes' })).toThrow()
  })
  it('rejects non-slug qid', () => {
    expect(() => QuestionSchema.parse({ ...validQuestion, qid: 'TD 2!' })).toThrow()
  })
})

describe('ScaleSchema', () => {
  it('accepts a tap scale with anchors', () => {
    const s = { id: 'agree3', kind: 'tap', label: 'Agreement',
      anchors: [{ value: 0, label: 'Not really' }, { value: 1, label: 'Somewhat' }, { value: 2, label: 'Definitely' }],
      secondsPerItem: 6 }
    expect(ScaleSchema.parse(s).anchors).toHaveLength(3)
  })
})

describe('BankMetaSchema', () => {
  it('requires semver', () => {
    expect(() => BankMetaSchema.parse({ bankVersion: 'one', releasedAt: '2026-07-18', changelog: './CHANGELOG.md' })).toThrow()
    expect(BankMetaSchema.parse({ bankVersion: '1.0.0', releasedAt: '2026-07-18', changelog: './CHANGELOG.md' }).bankVersion).toBe('1.0.0')
  })
})

describe('axis scale + slots (phase 3)', () => {
  it('accepts an axis scale with five belt curves and floor', () => {
    const s = ScaleSchema.parse({
      id: 'ability_axis', kind: 'axis', label: 'Where do you start to struggle?',
      secondsPerItem: 6, floor: true,
      anchors: [{ value: 0, label: 'Untrained' }, { value: 100, label: 'Elite' }],
      curves: [
        { belt: 'white', mean: 12, sd: 7, height: 1.0 }, { belt: 'blue', mean: 28, sd: 9, height: 0.55 },
        { belt: 'purple', mean: 45, sd: 11, height: 0.42 }, { belt: 'brown', mean: 62, sd: 13, height: 0.3 },
        { belt: 'black', mean: 74, sd: 14, height: 0.34 }],
    })
    expect(s.curves).toHaveLength(5)
  })
  it('rejects curves with wrong count or unknown belt', () => {
    const base = { id: 'x', kind: 'axis', label: 'l', secondsPerItem: 6,
      anchors: [{ value: 0, label: 'a' }, { value: 100, label: 'b' }] }
    expect(() => ScaleSchema.parse({ ...base, curves: [{ belt: 'white', mean: 1, sd: 1, height: 1 }] })).toThrow()
    expect(() => ScaleSchema.parse({ ...base, curves: Array(5).fill({ belt: 'red', mean: 1, sd: 1, height: 1 }) })).toThrow()
  })
  it('rejects axis scale without curves (must have curves)', () => {
    const base = { id: 'x', kind: 'axis', label: 'l', secondsPerItem: 6,
      anchors: [{ value: 0, label: 'a' }, { value: 100, label: 'b' }] }
    const result = ScaleSchema.safeParse(base)
    expect(result.success).toBe(false)
    expect(result.error?.message).toMatch(/require.*curves/i)
  })
  it('accepts tap scales without curves (they don\'t need them)', () => {
    const base = { id: 'x', kind: 'tap', label: 'l', secondsPerItem: 6,
      anchors: [{ value: 0, label: 'a' }, { value: 100, label: 'b' }] }
    const result = ScaleSchema.safeParse(base)
    expect(result.success).toBe(true)
  })
  it('accepts slots on a question and rejects empty slot strings', () => {
    const q = { ...validQuestion, slots: { what: 'their closed guard', problem: 'Do you pass before they threaten a sweep or submission?' } }
    expect(QuestionSchema.parse(q).slots?.what).toBe('their closed guard')
    // strict schema rejects unknown key 'who'
    expect(() => QuestionSchema.parse({ ...validQuestion, slots: { who: 'x', what: 'x', problem: 'y' } })).toThrow()
    // empty what or problem should throw
    expect(() => QuestionSchema.parse({ ...validQuestion, slots: { what: '', problem: 'y' } })).toThrow()
    expect(() => QuestionSchema.parse({ ...validQuestion, slots: { what: 'x', problem: '' } })).toThrow()
  })
})
