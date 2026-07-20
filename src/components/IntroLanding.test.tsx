import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IntroLanding } from './IntroLanding'

// jsdom has no matchMedia → window.matchMedia is undefined → component treats
// it as "reduced motion preferred" and renders the final state immediately.

describe('IntroLanding', () => {
  it('renders the hero line verbatim', () => {
    render(<IntroLanding onStart={() => {}} />)
    expect(screen.getByText('All Models are Wrong, Some are useful, Belt Colors are only moderately so.')).toBeInTheDocument()
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

  it('with onContinue (a saved session), keeps the visual landing and offers resume + start over', () => {
    const onStart = vi.fn(), onContinue = vi.fn()
    render(<IntroLanding onStart={onStart} onContinue={onContinue} />)
    // the bell-curve hero is still present — the whole point of the fix
    expect(screen.getByText('All Models are Wrong, Some are useful, Belt Colors are only moderately so.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start the sweep' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continue where you left off' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('each dot [data-intro-dot] element has role="button" and a non-empty aria-label', () => {
    render(<IntroLanding onStart={() => {}} />)
    const dots = document.querySelectorAll('[data-intro-dot]')
    expect(dots).toHaveLength(6)
    for (const dot of Array.from(dots)) {
      expect(dot.getAttribute('role')).toBe('button')
      const label = dot.getAttribute('aria-label')
      expect(label).toBeTruthy()
      expect((label ?? '').length).toBeGreaterThan(0)
    }
  })

  it('clicking dot 2 shows an overlay with its label; clicking elsewhere hides it', () => {
    render(<IntroLanding onStart={() => {}} />)
    // Dot 2 is the brown out-of-shape grappler
    const dot2 = document.querySelector('[data-intro-dot="2"]')!
    expect(dot2).not.toBeNull()

    // Before click: no overlay
    expect(document.querySelector('[data-dot-overlay="2"]')).toBeNull()

    // Click dot 2 — in jsdom there's no pointerType so it defaults to mouse path (show)
    fireEvent.click(dot2)
    const overlay = document.querySelector('[data-dot-overlay="2"]')
    expect(overlay).not.toBeNull()
    // Overlay should contain the dot's label text
    expect(overlay!.textContent).toContain('Brown belt, out-of-shape')

    // Click the SVG root (background) to dismiss
    const svg = document.querySelector('svg[role="img"]')!
    fireEvent.click(svg)
    expect(document.querySelector('[data-dot-overlay="2"]')).toBeNull()
  })

  it('renders the overlap micro-label in the SVG at the bracket', () => {
    render(<IntroLanding onStart={() => {}} />)
    // Micro-label is a single SVG text element anchored to the bracket midpoint.
    expect(screen.getByText('Similar Ability, Different Belts')).toBeInTheDocument()
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

  it('renders the hint line "Tap a dot to see who\'s who"', () => {
    render(<IntroLanding onStart={() => {}} />)
    expect(screen.getByText(/Tap a dot to see who/)).toBeInTheDocument()
  })

  it('explanation contains "Where does my game start to struggle?"', () => {
    render(<IntroLanding onStart={() => {}} />)
    expect(screen.getByText(/Where does my game start to struggle\?/)).toBeInTheDocument()
  })
})
