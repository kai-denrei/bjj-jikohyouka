import { describe, it, expect } from 'vitest'
import { loadSession, saveSession, clearSession, finishSession, listHistory, exportJSON, importJSON } from './store'
import type { AssessmentSession } from './types'

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
