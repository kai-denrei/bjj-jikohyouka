import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from './App'
import { bank } from './lib/bankInstance'

describe('App flow', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })
  it('intro → intake → first sweep question from the bank', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    const firstCore = bank.questions.find(q => q.tier === 'core' && q.category === bank.categories[0].id)!
    expect(screen.getByRole('heading', { name: firstCore.text })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
  it('offers resume when a session exists', () => {
    localStorage.setItem('skillcheck.session.v1', JSON.stringify({
      bankVersion: '1.0.0', startedAt: 'x', updatedAt: 'x', intake: null,
      answers: {}, completedCategories: [],
    }))
    render(<App />)
    expect(screen.getByRole('button', { name: 'Continue where you left off' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument()
  })
})
