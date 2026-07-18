import { describe, it, expect } from 'vitest'
import { lintText } from './lint'

describe('wording linter (brief §4.4)', () => {
  it('catches the seeded bad example (DoD §10)', () => {
    const w = lintText('bad_seed', 'I can reliably pass guard and am better than most people at my level')
    const kinds = w.map(x => x.kind)
    expect(kinds).toContain('vague')
    expect(kinds).toContain('normative')
    expect(w.map(x => x.match)).toEqual(expect.arrayContaining(['reliably', 'better than']))
  })
  it('flags every vague quantifier from the brief list', () => {
    for (const word of ['reliably', 'consistently', 'often', 'usually', 'good at', 'comfortable', 'confident']) {
      expect(lintText('q', `I am ${word} here`), word).toHaveLength(1)
    }
  })
  it('flags normative comparisons', () => {
    for (const phrase of ['better than', 'average', 'most people at my level']) {
      expect(lintText('q', `I am ${phrase} X`), phrase).not.toHaveLength(0)
    }
  })
  it('is case-insensitive and word-bounded', () => {
    expect(lintText('q', 'Usually this works')).toHaveLength(1)
    expect(lintText('q', 'my confidence grows')).toHaveLength(0)  // "confident" must not match inside "confidence"
    expect(lintText('q', 'leverage matters')).toHaveLength(0)     // "average" must not match inside "leverage"
  })
  it('passes clean observable-event wording', () => {
    expect(lintText('q', 'Standing against a resisting same-rank partner, I complete a takedown')).toHaveLength(0)
    expect(lintText('q', 'My partner recovers guard mid-transition')).toHaveLength(0)
  })
})
