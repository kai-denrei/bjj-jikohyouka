import type { Intake } from './types'

export const HOURS_PER_SESSION = 1.5
export const WEEKS_PER_YEAR = 48

const YEARS_MID: Record<Intake['years'], number> = {
  '<1':   0.5,
  '1-3':  2,
  '3-6':  4.5,
  '6-10': 8,
  '10+':  12,
}

const SESSIONS_MID: Record<Intake['sessionsPerWeek'], number> = {
  '1-2': 1.5,
  '3-4': 3.5,
  '5+':  6,
}

/** Estimate total mat hours from intake. Returns a rounded integer. */
export function estimateMatHours(intake: Intake): number {
  const yearsMid = YEARS_MID[intake.years]
  const sessionsMid = SESSIONS_MID[intake.sessionsPerWeek]
  return Math.round(yearsMid * sessionsMid * HOURS_PER_SESSION * WEEKS_PER_YEAR)
}

/**
 * Format a mat-hours estimate for display.
 * Rounds to nearest 50 for honesty, formats with thousands comma, prefixes ~.
 * e.g. 1134 → "~1,150 hours"
 */
export function formatHours(n: number): string {
  const rounded = Math.round(n / 50) * 50
  return `~${rounded.toLocaleString('en-US')} hours`
}
