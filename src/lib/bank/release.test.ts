import { describe, it, expect } from 'vitest'
import { bumpVersion, snapshot } from './release'
import { loadBank } from './load'

describe('bumpVersion', () => {
  it('bumps parts and resets lower ones', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
  })
})

describe('snapshot', () => {
  it('freezes version, all questions (incl. retired), scales, categories', () => {
    const s = snapshot(loadBank())
    expect(s.bankVersion).toBe('1.0.0')
    expect(s.questions.filter(q => q.status === 'active')).toHaveLength(173)
    expect(s.scales.length).toBe(8)
    expect(s.categories.length).toBe(17)
  })
})
