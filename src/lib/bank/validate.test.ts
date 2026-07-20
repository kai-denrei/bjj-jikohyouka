import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBank } from './validate'
import { loadRawBank, BANK_DIR, type RawBank } from './load'

const scales = { scales: [
  { id: 'ladder6', kind: 'tap', label: 'L', secondsPerItem: 6,
    anchors: [{ value: 0, label: 'a' }, { value: 5, label: 'b' }] },
  { id: 'belt_curve', kind: 'curve', label: 'C', secondsPerItem: 12,
    anchors: [{ value: 1, label: 'W' }, { value: 5, label: 'Bk' }] } ] }
const categories = { categories: [{ id: 'takedowns', name: 'Takedowns', axis: 'positional', weight: 1.2 }] }
const q = (over: object) => ({
  qid: 'td_x', v: 1, status: 'active', category: 'takedowns', axis: 'positional',
  input: 'ladder6', text: 'Standing against a resisting partner, I complete a takedown',
  tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [], ...over })
const raw = (questions: object[]): RawBank => ({
  meta: { bankVersion: '1.0.0', releasedAt: '2026-07-18', changelog: './CHANGELOG.md' },
  categories, scales, questionFiles: { 'positional.json': { questions } } })

describe('validateBank', () => {
  it('clean fixture → no errors, report counts', () => {
    const r = validateBank(raw([q({})]), [])
    expect(r.errors).toEqual([])
    expect(r.report.perCategory.takedowns).toEqual({ core: 1, drilldown: 0 })
    expect(r.report.estimatedSeconds).toEqual({ sweep: 6, full: 6 })
  })
  it('schema violation → error naming the qid', () => {
    const r = validateBank(raw([q({ status: 'nope' })]), [])
    expect(r.errors.join()).toMatch(/td_x/)
  })
  it('duplicate qid → error', () => {
    expect(validateBank(raw([q({}), q({})]), []).errors.join()).toMatch(/duplicate/i)
  })
  it('unknown input scale → error', () => {
    expect(validateBank(raw([q({ input: 'vibes9' })]), []).errors.join()).toMatch(/vibes9/)
  })
  it('unknown category → error', () => {
    expect(validateBank(raw([q({ category: 'nogi_lounge' })]), []).errors.join()).toMatch(/nogi_lounge/)
  })
  it('replaces target must exist in current bank or archive', () => {
    expect(validateBank(raw([q({ replaces: 'ghost_001' })]), []).errors.join()).toMatch(/ghost_001/)
    const archive = [{ file: 'bank-1.0.0.json', data: { questions: [q({ qid: 'ghost_001' })] } }]
    expect(validateBank(raw([q({ replaces: 'ghost_001' })]), archive).errors).toEqual([])
  })
  it('qid reuse from archive under a different category → error (qids are never recycled)', () => {
    const archive = [{ file: 'bank-1.0.0.json', data: { questions: [q({ qid: 'td_x', category: 'mount_top' })] } }]
    expect(validateBank(raw([q({})]), archive).errors.join()).toMatch(/recycl|reuse/i)
  })
  it('wording warnings surface but are not errors; retired questions are not linted', () => {
    const r = validateBank(raw([
      q({ qid: 'td_bad', text: 'I can reliably win' }),
      q({ qid: 'td_old', status: 'retired', text: 'I am confident and better than average' })]), [])
    expect(r.errors).toEqual([])
    expect(r.warnings.map(w => w.qid)).toEqual(['td_bad'])
  })
  it('curve items cost 12s in estimates', () => {
    const r = validateBank(raw([q({}), q({ qid: 'td_c', tier: 'drilldown', input: 'belt_curve', flags: ['showcase_curve'] })]), [])
    expect(r.report.estimatedSeconds).toEqual({ sweep: 6, full: 18 })
  })
  it('psychological item counting toward skill → error', () => {
    const r = validateBank(raw([q({ qid: 'psych_x', axis: 'psychological', scoring: { weight: 1, countsToward: 'skill' } })]), [])
    expect(r.errors.join()).toMatch(/psychological/)
  })
  it('the real bank on disk validates with zero errors', () => {
    const archDir = join(BANK_DIR, 'archive')
    const archives = readdirSync(archDir).filter(f => f.endsWith('.json')).sort()
      .map(f => ({ file: f, data: JSON.parse(readFileSync(join(archDir, f), 'utf8')) }))
    const r = validateBank(loadRawBank(), archives)
    expect(r.errors).toEqual([])
    expect(r.report.totalActive).toBe(28)
  })
})
