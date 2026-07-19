import { z, ZodSchema } from 'zod'
import {
  AssessmentSessionSchema,
  ExportFileSchema,
  type AssessmentSession,
  type ExportFile,
} from './types'

const SESSION_KEY = 'skillcheck.session.v1'
const HISTORY_KEY = 'skillcheck.history.v1'
const HISTORY_LIMIT = 20

/**
 * Safely read and validate JSON from localStorage.
 * Returns null if missing, invalid JSON, or validation fails.
 * Never throws.
 */
function readJson<T>(key: string, schema: ZodSchema): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    const validated = schema.parse(parsed)
    return validated as T
  } catch {
    return null
  }
}

/**
 * Safely write validated JSON to localStorage.
 * Never throws.
 */
function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // silently fail
  }
}

/**
 * Load the current session from storage.
 * Returns null if no session exists or storage is corrupt.
 */
export function loadSession(): AssessmentSession | null {
  return readJson<AssessmentSession>(SESSION_KEY, AssessmentSessionSchema)
}

/**
 * Save a session to storage, stamping updatedAt to current time (or keeping if already in future).
 */
export function saveSession(s: AssessmentSession): void {
  const now = new Date().toISOString()
  const updated: AssessmentSession = {
    ...s,
    updatedAt: now,
  }
  writeJson(SESSION_KEY, updated)
}

/**
 * Clear the current session from storage.
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

/**
 * Finish the current session: move it to history (newest-first),
 * cap history at HISTORY_LIMIT, and clear current.
 */
export function finishSession(s: AssessmentSession): void {
  const history = listHistory()
  history.unshift(s) // newest first
  if (history.length > HISTORY_LIMIT) {
    history.splice(HISTORY_LIMIT)
  }
  writeJson(HISTORY_KEY, history)
  clearSession()
}

/**
 * List all completed sessions from history, newest-first.
 */
export function listHistory(): AssessmentSession[] {
  return readJson<AssessmentSession[]>(HISTORY_KEY, z.array(AssessmentSessionSchema)) ?? []
}

/**
 * Export all sessions (history + current if any) as JSON string.
 */
export function exportJSON(): string {
  const history = listHistory()
  const current = loadSession()
  const sessions = current ? [current, ...history] : history
  const file: ExportFile = {
    schemaVersion: 1,
    sessions,
  }
  return JSON.stringify(file)
}

/**
 * Import sessions from a JSON string.
 * Merges by startedAt uniqueness (no duplicates).
 * Never modifies storage if import is invalid.
 * Returns { ok: true; imported: number } or { ok: false; error: string }
 */
export function importJSON(
  text: string
): { ok: true; imported: number } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(text)
    const file = ExportFileSchema.parse(parsed)

    // Build a map of existing sessions by startedAt
    const existing = new Map<string, AssessmentSession>()
    listHistory().forEach(s => {
      existing.set(s.startedAt, s)
    })

    // Merge imported sessions, counting only new ones
    let imported = 0
    file.sessions.forEach(s => {
      if (!existing.has(s.startedAt)) {
        existing.set(s.startedAt, s)
        imported++
      }
    })

    // Convert map back to array, newest-first, capped
    const merged = Array.from(existing.values()).sort(
      (a, b) => b.startedAt.localeCompare(a.startedAt)
    )
    if (merged.length > HISTORY_LIMIT) {
      merged.splice(HISTORY_LIMIT)
    }
    writeJson(HISTORY_KEY, merged)

    return { ok: true, imported }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
