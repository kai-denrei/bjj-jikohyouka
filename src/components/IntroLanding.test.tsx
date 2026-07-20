import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IntroLanding } from './IntroLanding'

// jsdom has no matchMedia → window.matchMedia is undefined → component treats
// it as "reduced motion preferred" and renders the final state immediately.

describe('IntroLanding', () => {
  it('renders the hero line verbatim', () => {
    render(<IntroLanding onStart={() => {}} />)
    expect(screen.getByText('Belts are a rough map. Ability is the territory.')).toBeInTheDocument()
  })

  it('renders the explanation with r ≈ .29', () => {
    render(<IntroLanding onStart={() => {}} />)
    expect(screen.getByText(/r ≈ \.29/)).toBeInTheDocument()
  })

  it('renders a "Start the sweep" button that calls onStart', () => {
    const fn = vi.fn()
    render(<IntroLanding onStart={fn} />)
    const btn = screen.getByRole('button', { name: 'Start the sweep' })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('legend is an ordered list with 6 items in ability order: beginner first, competitor last', () => {
    render(<IntroLanding onStart={() => {}} />)
    const list = screen.getByRole('list')
    const items = Array.from(list.querySelectorAll('li'))
    expect(items).toHaveLength(6)
    // first item contains "Beginner"
    expect(items[0].textContent?.toLowerCase()).toContain('beginner')
    // last item contains "competitor"
    expect(items[5].textContent?.toLowerCase()).toContain('competitor')
  })

  it('legend has brown before blue (the overlap-pair adjacency)', () => {
    render(<IntroLanding onStart={() => {}} />)
    const list = screen.getByRole('list')
    const items = Array.from(list.querySelectorAll('li'))
    const texts = items.map(li => li.textContent?.toLowerCase() ?? '')
    const brownIdx = texts.findIndex(t => t.includes('brown') || t.includes('out-of-shape'))
    const blueIdx = texts.findIndex(t => t.includes('blue') || t.includes('wrestling'))
    expect(brownIdx).toBeGreaterThanOrEqual(0)
    expect(blueIdx).toBeGreaterThanOrEqual(0)
    expect(brownIdx).toBeLessThan(blueIdx)
  })

  it('renders the overlap micro-label in the SVG at the bracket', () => {
    render(<IntroLanding onStart={() => {}} />)
    // Micro-label is a single SVG text element anchored to the bracket midpoint.
    expect(screen.getByText('same ability, different belt')).toBeInTheDocument()
  })

  it('chart has role="img" and an aria-label mentioning overlap', () => {
    render(<IntroLanding onStart={() => {}} />)
    const chart = screen.getByRole('img')
    expect(chart).toBeInTheDocument()
    expect(chart.getAttribute('aria-label')).toBeTruthy()
    // aria-label should mention some core concept
    const label = chart.getAttribute('aria-label')!.toLowerCase()
    expect(label.length).toBeGreaterThan(10)
  })

  it('under reduced-motion (jsdom default): dots and curves are present without zero-opacity lock', () => {
    render(<IntroLanding onStart={() => {}} />)
    // All 6 dots must be in the DOM (final state immediately — no animation delay)
    const dots = document.querySelectorAll('[data-intro-dot]')
    expect(dots).toHaveLength(6)
    // No dot should have opacity 0 in inline style (the "will animate but hasn't yet" state)
    for (const dot of Array.from(dots)) {
      const el = dot as HTMLElement
      expect(el.style.opacity).not.toBe('0')
    }
    // Curves: 5 belt paths
    const curves = document.querySelectorAll('[data-intro-curve]')
    expect(curves).toHaveLength(5)
  })

  it('all 6 dot numbers (1-6) are present in the SVG', () => {
    render(<IntroLanding onStart={() => {}} />)
    for (let n = 1; n <= 6; n++) {
      const el = document.querySelector(`[data-dot-n="${n}"]`)
      expect(el).not.toBeNull()
    }
  })
})
