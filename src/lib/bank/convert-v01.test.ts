import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { convertV01 } from './convert-v01'
import { QuestionSchema } from './schema'

const v01 = JSON.parse(readFileSync('src/data/legacy/skill-assessment.v0.1.json', 'utf8'))
const { meta, categories, questions } = convertV01(v01, '2026-07-18')

describe('convertV01', () => {
  it('converts all 173 questions across 15 categories (NOT the stale metadata block counts)', () => {
    expect(questions).toHaveLength(173)
    expect(categories).toHaveLength(15)
  })
  it('every record passes QuestionSchema', () => {
    for (const q of questions) QuestionSchema.parse(q)
  })
  it('exactly 15 core-tier items, one per category (v0.1 diagnostic flag)', () => {
    const core = questions.filter(q => q.tier === 'core')
    expect(core).toHaveLength(15)
    expect(new Set(core.map(q => q.category)).size).toBe(15)
  })
  it('25 belt-curve items become belt_curve input with showcase_curve flag', () => {
    const curves = questions.filter(q => q.input === 'belt_curve')
    expect(curves).toHaveLength(25)
    expect(curves.every(q => q.flags.includes('showcase_curve'))).toBe(true)
  })
  it('everything else is legacy slider10', () => {
    expect(questions.filter(q => q.input === 'slider10')).toHaveLength(148)
  })
  it('level weights map basic/intermediate/advanced → 1.0/1.5/2.0', () => {
    const byLevel = (lvl: string) => questions.find(q => q.legacy?.level === lvl)!
    expect(byLevel('basic').scoring.weight).toBe(1.0)
    expect(byLevel('intermediate').scoring.weight).toBe(1.5)
    expect(byLevel('advanced').scoring.weight).toBe(2.0)
  })
  it('psychological items never count toward skill (brief §4.2)', () => {
    const psych = questions.filter(q => q.legacy?.type === 'psychological')
    expect(psych.length).toBeGreaterThan(0)
    expect(psych.every(q => q.axis === 'psychological' && q.scoring.countsToward === 'none')).toBe(true)
  })
  it('qids are the original v0.1 ids, v=1, status active, no replaces', () => {
    const td2 = questions.find(q => q.qid === 'td_002')!
    expect(td2).toMatchObject({ v: 1, status: 'active' })
    expect(td2.replaces).toBeUndefined()
  })
  it('meta is bank 1.0.0', () => {
    expect(meta).toEqual({ bankVersion: '1.0.0', releasedAt: '2026-07-18', changelog: './CHANGELOG.md' })
  })
})
