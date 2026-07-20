/**
 * radar-shortname.test.tsx — Radar uses shortName from CategoryScore (Task 1)
 * Verifies the SHORT_NAME hardcoded map is gone, replaced by category.shortName ?? name.
 */
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Radar } from './Radar'
import type { CategoryScore } from '../../lib/results/score'

function makeScore(overrides: Partial<CategoryScore> & { categoryId: string; name: string }): CategoryScore {
  return {
    axis: 'positional',
    score: 60,
    band: 'Positional',
    answered: 3,
    activeCount: 5,
    uncertainty: 'narrow',
    toNextBand: 20,
    shortName: undefined,
    ...overrides,
  }
}

const threeScored: CategoryScore[] = [
  makeScore({ categoryId: 'takedowns', name: 'Takedowns & Wrestling', shortName: 'Takedowns' }),
  makeScore({ categoryId: 'guard_top', name: 'Guard Passing (Top)', shortName: 'Guard Pass' }),
  makeScore({ categoryId: 'open_guard_top', name: 'Open Guard Passing (Top)', shortName: 'Open Pass Top' }),
]

describe('Radar shortName labels', () => {
  it('uses shortName when provided', () => {
    const { container } = render(<Radar categories={threeScored} />)
    const texts = Array.from(container.querySelectorAll('text')).map(el => el.textContent)
    expect(texts).toContain('Takedowns')
    expect(texts).toContain('Guard Pass')
    expect(texts).toContain('Open Pass Top')
    // Full names must NOT appear (confirm SHORT_NAME map is not being used)
    expect(texts).not.toContain('Takedowns & Wrestling')
    expect(texts).not.toContain('Guard Passing (Top)')
  })

  it('falls back to name when shortName is absent', () => {
    const fallback: CategoryScore[] = [
      makeScore({ categoryId: 'a', name: 'Alpha Category', shortName: undefined }),
      makeScore({ categoryId: 'b', name: 'Beta Category', shortName: undefined }),
      makeScore({ categoryId: 'c', name: 'Gamma Category', shortName: undefined }),
    ]
    const { container } = render(<Radar categories={fallback} />)
    const texts = Array.from(container.querySelectorAll('text')).map(el => el.textContent)
    expect(texts).toContain('Alpha Category')
    expect(texts).toContain('Beta Category')
    expect(texts).toContain('Gamma Category')
  })

  it('does NOT have a SHORT_NAME hardcoded map — confirmed by shortName override working', () => {
    // If SHORT_NAME map existed, it would shadow the shortName prop for known IDs.
    // Provide a non-standard shortName for 'takedowns' — should use it, not the hardcoded value.
    const custom: CategoryScore[] = [
      makeScore({ categoryId: 'takedowns', name: 'Takedowns & Wrestling', shortName: 'TDs Custom' }),
      makeScore({ categoryId: 'guard_top', name: 'Guard Passing (Top)', shortName: 'GP Custom' }),
      makeScore({ categoryId: 'guard_bottom', name: 'Guard Retention (Bottom)', shortName: 'GR Custom' }),
    ]
    const { container } = render(<Radar categories={custom} />)
    const texts = Array.from(container.querySelectorAll('text')).map(el => el.textContent)
    expect(texts).toContain('TDs Custom')
    expect(texts).not.toContain('Takedowns')  // would be the old SHORT_NAME value
  })
})
