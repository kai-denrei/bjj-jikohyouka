import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { Question } from '../lib/bank/schema'
import { QuestionCard } from './QuestionCard'

const base = { qid: 'q', v: 1, status: 'draft', category: 'takedowns', axis: 'positional', input: 'ability_axis',
  text: 'Against a same-rank partner in their closed guard, I pass before they threaten a sweep or submission',
  tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] } as Question

describe('QuestionCard', () => {
  it('renders what heading and problem line from slots; who-chip is absent', () => {
    render(<QuestionCard question={{ ...base, slots: { who: 'same rank', what: 'their closed guard', problem: 'Do you pass before they threaten a sweep or submission?' } }} />)
    // who-chip must NOT be in the DOM
    expect(screen.queryByText('vs SAME RANK')).toBeNull()
    // what renders as heading
    expect(screen.getByRole('heading', { name: 'Their closed guard' })).toBeInTheDocument()
    // problem renders
    expect(screen.getByText('Do you pass before they threaten a sweep or submission?')).toBeInTheDocument()
  })
  it('falls back to canonical text as the heading when no slots', () => {
    render(<QuestionCard question={base} />)
    expect(screen.getByRole('heading', { name: base.text })).toBeInTheDocument()
  })
})
