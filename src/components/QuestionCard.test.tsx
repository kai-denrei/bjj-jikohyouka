import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { Question } from '../lib/bank/schema'
import { QuestionCard } from './QuestionCard'

const base = { qid: 'q', v: 1, status: 'draft', category: 'takedowns', axis: 'positional', input: 'ability_axis',
  text: 'Against a same-rank partner in their closed guard, I pass before they threaten a sweep or submission',
  tier: 'core', scoring: { weight: 1, countsToward: 'skill' }, flags: [] } as Question

describe('QuestionCard', () => {
  it('renders slots as who-chip, big what, problem line', () => {
    render(<QuestionCard question={{ ...base, slots: { who: 'same rank', what: 'their closed guard', problem: 'Do you pass before they threaten a sweep or submission?' } }} />)
    expect(screen.getByText('vs SAME RANK')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Their closed guard' })).toBeInTheDocument()
    expect(screen.getByText('Do you pass before they threaten a sweep or submission?')).toBeInTheDocument()
  })
  it('falls back to canonical text as the heading when no slots', () => {
    render(<QuestionCard question={base} />)
    expect(screen.getByRole('heading', { name: base.text })).toBeInTheDocument()
  })
})
