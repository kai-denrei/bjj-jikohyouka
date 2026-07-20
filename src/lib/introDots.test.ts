import { describe, it, expect } from 'vitest'
import { INTRO_DOTS, dotY } from './introDots'

describe('INTRO_DOTS', () => {
  it('has exactly 6 entries', () => {
    expect(INTRO_DOTS).toHaveLength(6)
  })

  it('n values are 1..6 in order', () => {
    expect(INTRO_DOTS.map(d => d.n)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('dots are sorted by x ascending', () => {
    const xs = INTRO_DOTS.map(d => d.x)
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1])
    }
  })

  it('dots 2 and 3 are the overlap pair: brown at x=42, blue at x=43', () => {
    const dot2 = INTRO_DOTS.find(d => d.n === 2)!
    const dot3 = INTRO_DOTS.find(d => d.n === 3)!
    expect(dot2.belt).toBe('brown')
    expect(dot2.x).toBe(42)
    expect(dot3.belt).toBe('blue')
    expect(dot3.x).toBe(43)
  })

  it('dots 2 and 3 are adjacent in the array (legend adjacency)', () => {
    const idx2 = INTRO_DOTS.findIndex(d => d.n === 2)
    const idx3 = INTRO_DOTS.findIndex(d => d.n === 3)
    expect(idx3).toBe(idx2 + 1)
  })
})

describe('dotY', () => {
  const tolerance = 0.01

  it('beginner white (x=3) height ≈ 0.438', () => {
    const dot = INTRO_DOTS.find(d => d.n === 1)!
    expect(dotY(dot)).toBeCloseTo(0.438, 2)
  })

  it('brown out-of-shape (x=42) height ≈ 0.097', () => {
    const dot = INTRO_DOTS.find(d => d.n === 2)!
    expect(Math.abs(dotY(dot) - 0.097)).toBeLessThan(tolerance)
  })

  it('blue wrestling-bg (x=43) height ≈ 0.142', () => {
    const dot = INTRO_DOTS.find(d => d.n === 3)!
    expect(Math.abs(dotY(dot) - 0.142)).toBeLessThan(tolerance)
  })

  it('purple 3-years (x=67) height ≈ 0.057', () => {
    const dot = INTRO_DOTS.find(d => d.n === 4)!
    expect(Math.abs(dotY(dot) - 0.057)).toBeLessThan(tolerance)
  })

  it('black avg (x=74) height ≈ 0.340', () => {
    const dot = INTRO_DOTS.find(d => d.n === 5)!
    expect(Math.abs(dotY(dot) - 0.340)).toBeLessThan(tolerance)
  })

  it('black competitor (x=94) height ≈ 0.128', () => {
    const dot = INTRO_DOTS.find(d => d.n === 6)!
    expect(Math.abs(dotY(dot) - 0.128)).toBeLessThan(tolerance)
  })
})
