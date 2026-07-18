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
