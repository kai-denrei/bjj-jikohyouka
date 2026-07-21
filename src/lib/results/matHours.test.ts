import { describe, it, expect } from 'vitest'
import { estimateMatHours, formatHours } from './matHours'

describe('estimateMatHours', () => {
  it('3-6 yrs × 3-4 sessions → 4.5 × 3.5 × 1.5 × 48 = 1134', () => {
    expect(estimateMatHours({ years: '3-6', sessionsPerWeek: '3-4' })).toBe(1134)
  })
  it('<1 yr × 1-2 sessions → 0.5 × 1.5 × 1.5 × 48 = 54', () => {
    expect(estimateMatHours({ years: '<1', sessionsPerWeek: '1-2' })).toBe(54)
  })
  it('10+ yrs × 5+ sessions → 12 × 6 × 1.5 × 48 = 5184', () => {
    expect(estimateMatHours({ years: '10+', sessionsPerWeek: '5+' })).toBe(5184)
  })
})

describe('formatHours', () => {
  it('1134 → ~1,150 hours', () => {
    expect(formatHours(1134)).toBe('~1,150 hours')
  })
  it('54 → ~50 hours', () => {
    expect(formatHours(54)).toBe('~50 hours')
  })
  it('5184 → ~5,200 hours', () => {
    expect(formatHours(5184)).toBe('~5,200 hours')
  })
  it('100 → ~100 hours (exact multiple of 50)', () => {
    expect(formatHours(100)).toBe('~100 hours')
  })
})
