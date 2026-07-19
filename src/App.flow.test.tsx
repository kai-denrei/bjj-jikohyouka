import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App'
import { bank } from './lib/bankInstance'
import { sweepQuestions } from './lib/flow'

const sweepQs = sweepQuestions(bank, false)

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

  // Fix 3 pin: fully-answered sweep with no completed categories routes to interim on resume
  it('resume routes to interim when all sweep questions are answered but no categories completed', () => {
    // Build answers for all 15 active sweep qids with valid raw values
    const answers: Record<string, { qid: string; v: number; raw: number | number[] }> = {}
    for (const q of sweepQs) {
      // belt_curve raw is number[5], slider10 raw is number
      const raw = q.input === 'slider10' ? 5 : [5, 5, 5, 5, 5]
      answers[q.qid] = { qid: q.qid, v: 1, raw }
    }
    localStorage.setItem('skillcheck.session.v1', JSON.stringify({
      bankVersion: bank.meta.bankVersion,
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:01:00.000Z',
      intake: null,
      answers,
      completedCategories: [],
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue where you left off' }))
    // Should show interim "First picture" heading, not a sweep question
    expect(screen.getByRole('heading', { name: 'First picture' })).toBeInTheDocument()
  })

  // Fix 1 structural pin: last-question answer is reflected in interim recommended chips
  // jsdom lacks matchMedia → usePrefersReducedMotion returns true → instant advance (no timers)
  it('interim recommended chips reflect all sweep answers including the final question', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))

    // sweepQs order: td_002(belt_curve), gt_002(belt_curve), gb_002(slider10),
    //   cgt_002..ll_003(belt_curve), wl_003(slider10 — last)
    for (let i = 0; i < sweepQs.length; i++) {
      const q = sweepQs[i]
      const isLast = i === sweepQs.length - 1
      if (q.input === 'slider10') {
        // Click chip "10" for high (not last), "1" for lowest (last question = wrist_locks)
        const label = isLast ? '1' : '10'
        fireEvent.click(screen.getByRole('button', { name: label }))
      } else {
        // belt_curve: click "White: 10 of 10" — high score, fires onChange immediately
        fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
      }
    }

    // Should now be on interim screen
    expect(screen.getByRole('heading', { name: 'First picture' })).toBeInTheDocument()

    // wrist_locks scored 0 (slider10 raw=1) — must be in recommended chips
    // If Fix 1 was broken, wrist_locks answer would be missing from the report
    expect(screen.getByRole('button', { name: 'Wrist Locks' })).toBeInTheDocument()
  })

  // Regression: sweepStartIndex stabilization — answering Q1 must NOT immediately jump to Q2
  // The 250ms auto-advance timer must survive the App re-render triggered by handleAnswer.
  it('answering sweep Q1 does not immediately advance before 250ms (sweepStartIndex regression)', () => {
    // Mock matchMedia to report no preference for reduced motion → timer path is taken
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false, // prefers-reduced-motion: no-preference
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
    vi.useFakeTimers()

    try {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
      fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))

      const q1Text = sweepQs[0].text
      const q2Text = sweepQs[1].text

      // Confirm Q1 is displayed
      expect(screen.getByRole('heading', { name: q1Text })).toBeInTheDocument()

      // Answer Q1 — sweepQs[0] is belt_curve type
      fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))

      // Q1 must still be showing — the 250ms timer must NOT have fired yet
      expect(screen.getByRole('heading', { name: q1Text })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: q2Text })).toBeNull()

      // Advance past the 250ms delay → Q2 should now be displayed
      act(() => { vi.advanceTimersByTime(250) })
      expect(screen.getByRole('heading', { name: q2Text })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      })
    }
  })
})
