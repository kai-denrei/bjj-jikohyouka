import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { Question } from '../lib/bank/schema'
import { QuestionCard } from './QuestionCard'

const base = { qid: 'q', v: 1, status: 'draft', category: 'takedowns', axis: 'positional', input: 'ability_axis',
  text: 'Against a same-rank partner in their closed guard, I pass before they threaten a sweep or submission',
  tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] } as Question

describe('QuestionCard', () => {
  it('renders what as eyebrow and problem as the hero heading; who is gone', () => {
    render(<QuestionCard question={{ ...base, slots: { what: 'their closed guard', problem: 'passing before they threaten a sweep or submission' } }} />)
    // problem renders as hero heading with capitalised first letter
    expect(screen.getByRole('heading', { name: 'Passing before they threaten a sweep or submission' })).toBeInTheDocument()
    // what renders as eyebrow (plain text, not a heading)
    expect(screen.getByText('their closed guard')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /their closed guard/i })).toBeNull()
  })
  it('falls back to canonical text as the heading when no slots', () => {
    render(<QuestionCard question={base} />)
    expect(screen.getByRole('heading', { name: base.text })).toBeInTheDocument()
  })
})
