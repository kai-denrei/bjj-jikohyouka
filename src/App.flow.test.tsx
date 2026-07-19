import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App'
import { bank } from './lib/bankInstance'
import { sweepQuestions } from './lib/flow'
import { BeltStripeBar } from './components/BeltStripeBar'

const sweepQs = sweepQuestions(bank, false)

describe('BeltStripeBar', () => {
  it('renders total segments with correct data-state attributes', () => {
    render(<BeltStripeBar total={5} done={2} current={2} label="Category" annotation="2/5" />)
    const segments = document.querySelectorAll('[data-state]')
    expect(segments).toHaveLength(5)
    expect(segments[0].getAttribute('data-state')).toBe('done')
    expect(segments[1].getAttribute('data-state')).toBe('done')
    expect(segments[2].getAttribute('data-state')).toBe('current')
    expect(segments[3].getAttribute('data-state')).toBe('todo')
    expect(segments[4].getAttribute('data-state')).toBe('todo')
  })

  it('renders label and annotation text', () => {
    render(<BeltStripeBar total={15} done={3} label="Takedowns & Wrestling" annotation="3/15" />)
    expect(screen.getByText('Takedowns & Wrestling')).toBeInTheDocument()
    expect(screen.getByText('3/15')).toBeInTheDocument()
  })

  it('progressbar aria-valuenow reflects done count', () => {
    render(<BeltStripeBar total={15} done={7} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '7')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '15')
  })
})

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

  it('after answering 2 sweep questions bar annotation shows 2/15 and aria-valuenow=2', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    // Answer Q1 and Q2 (both belt_curve in the default bank)
    fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
    fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
    // Bar should reflect 2 answered
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByText('2/15')).toBeInTheDocument()
  })

  it('bar shows current category name label during sweep', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    // First sweep question's category name should appear as bar label
    const firstCat = bank.categories.find(c => c.id === sweepQs[0].category)!
    expect(screen.getByText(firstCat.name)).toBeInTheDocument()
  })

  // Task 3: Pause/back navigation

  it('mid-sweep Pause → resume banner visible (no reload)', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    // Answer a couple questions, then pause
    fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
    // Pause button should be visible during sweep
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    // Must show resume banner without page reload
    expect(screen.getByRole('button', { name: 'Continue where you left off' })).toBeInTheDocument()
  })

  it('mid-sweep Pause then Continue returns to the same question index', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    // Answer Q1 → advance to Q2
    fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
    // Pause on Q2
    const q2Text = sweepQs[1].text
    expect(screen.getByRole('heading', { name: q2Text })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    // Resume → should land back on Q2
    fireEvent.click(screen.getByRole('button', { name: 'Continue where you left off' }))
    expect(screen.getByRole('heading', { name: q2Text })).toBeInTheDocument()
  })

  it('mid-drilldown Pause → goes to interim', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    // Complete entire sweep to reach interim
    for (const q of sweepQs) {
      if (q.input === 'slider10') {
        fireEvent.click(screen.getByRole('button', { name: '5' }))
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
      }
    }
    // Should now be on interim screen
    expect(screen.getByRole('heading', { name: 'First picture' })).toBeInTheDocument()

    // Deterministically find the takedowns category chip
    const takedownsCategory = bank.categories.find(c => c.id === 'takedowns')!
    const takedownsName = takedownsCategory.name
    const drilldownChip = screen.getByRole('button', { name: takedownsName })
    fireEvent.click(drilldownChip)

    // Should be in a drill-down question screen — has within-run counter or question heading (not "First picture")
    const questionHeadings = screen.getAllByRole('heading')
    const hasQuestion = questionHeadings.some(h => h.textContent !== 'First picture')
    expect(hasQuestion).toBe(true)

    // Pause button should be visible
    const pauseBtn = screen.getByRole('button', { name: 'Pause' })
    expect(pauseBtn).toBeInTheDocument()
    fireEvent.click(pauseBtn)

    // Should return to interim with "First picture" heading
    expect(screen.getByRole('heading', { name: 'First picture' })).toBeInTheDocument()
    // No question input or within-run counter should remain
    expect(screen.queryByText(/^\d+ of \d+$/)).not.toBeInTheDocument()
  })

  it('results → Back to categories → interim', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    // Complete sweep
    for (const q of sweepQs) {
      if (q.input === 'slider10') {
        fireEvent.click(screen.getByRole('button', { name: '5' }))
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
      }
    }
    // On interim → go to results
    fireEvent.click(screen.getByRole('button', { name: 'See results' }))
    expect(screen.queryByRole('heading', { name: 'First picture' })).not.toBeInTheDocument()
    // Back to categories button
    fireEvent.click(screen.getByRole('button', { name: 'Back to categories' }))
    expect(screen.getByRole('heading', { name: 'First picture' })).toBeInTheDocument()
  })

  // Fix 3 pin: after Finish & save, Back to categories button is absent
  it('Back to categories button absent after Finish & save', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start the sweep' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    // Complete sweep
    for (const q of sweepQs) {
      if (q.input === 'slider10') {
        fireEvent.click(screen.getByRole('button', { name: '5' }))
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'White: 10 of 10' }))
      }
    }
    // On interim → go to results
    fireEvent.click(screen.getByRole('button', { name: 'See results' }))
    expect(screen.getByRole('button', { name: 'Back to categories' })).toBeInTheDocument()

    // Finish & save
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Finish & save' }))
    })

    // Back to categories must be gone
    expect(screen.queryByRole('button', { name: 'Back to categories' })).not.toBeInTheDocument()
  })
})
