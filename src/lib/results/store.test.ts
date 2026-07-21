import { describe, it, expect } from 'vitest'
import { loadSession, saveSession, finishSession, listHistory, exportJSON, importJSON } from './store'
import type { AssessmentSession } from './types'
import { AssessmentSessionSchema } from './types'

const session = (over: Partial<AssessmentSession> = {}): AssessmentSession => ({
  bankVersion: '1.0.0', startedAt: '2026-07-18T10:00:00Z', updatedAt: '2026-07-18T10:00:00Z',
  intake: null, answers: { td_002: { qid: 'td_002', v: 1, raw: [8, 6, 4, 2, 1] } },
  completedCategories: ['takedowns'], ...over,
})

describe('results store', () => {
  it('round-trips a session and stamps updatedAt on save', () => {
    expect(loadSession()).toBeNull()
    saveSession(session())
    const loaded = loadSession()!
    expect(loaded.answers.td_002.raw).toEqual([8, 6, 4, 2, 1])
    expect(loaded.updatedAt >= '2026-07-18T10:00:00Z').toBe(true)
  })
  it('returns null on corrupt storage instead of throwing', () => {
    localStorage.setItem('skillcheck.session.v1', '{nope')
    expect(loadSession()).toBeNull()
  })
  it('finishSession moves current to history newest-first and clears current', () => {
    saveSession(session({ startedAt: 'a' })); finishSession(loadSession()!)
    saveSession(session({ startedAt: 'b' })); finishSession(loadSession()!)
    expect(loadSession()).toBeNull()
    expect(listHistory().map(s => s.startedAt)).toEqual(['b', 'a'])
  })
  it('export → import round-trip merges without duplicates', () => {
    saveSession(session({ startedAt: 'a' })); finishSession(loadSession()!)
    const blob = exportJSON()
    const res = importJSON(blob)
    expect(res).toEqual({ ok: true, imported: 0 })  // same startedAt → merged, not duplicated
    expect(listHistory()).toHaveLength(1)
  })
  it('rejects invalid import with a message, storage untouched', () => {
    const res = importJSON('{"schemaVersion":2}')
    expect(res.ok).toBe(false)
    expect(listHistory()).toHaveLength(0)
  })
})

describe('IntakeSchema back-compat', () => {
  it('loads a legacy session with belt+style and strips those keys', () => {
    // simulate old stored JSON that had belt and style
    const legacy = {
      bankVersion: '1.0.0',
      startedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      intake: { belt: 'purple', years: '3-6', style: 'both', sessionsPerWeek: '3-4' },
      answers: {},
      completedCategories: [],
    }
    const parsed = AssessmentSessionSchema.safeParse(legacy)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.intake).toEqual({ years: '3-6', sessionsPerWeek: '3-4' })
      expect((parsed.data.intake as Record<string, unknown>)?.belt).toBeUndefined()
      expect((parsed.data.intake as Record<string, unknown>)?.style).toBeUndefined()
    }
  })
})
