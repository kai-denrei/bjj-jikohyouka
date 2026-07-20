/**
 * DimensionsPanel.test.tsx — Task 4, verdict #5
 * TDD: RED phase — these tests fail until DimensionsPanel.tsx is implemented.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DimensionsPanel } from './DimensionsPanel'

describe('DimensionsPanel', () => {
  it('does not render when open=false', () => {
    render(<DimensionsPanel open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders heading "What we measure" when open=true', () => {
    render(<DimensionsPanel open onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'What we measure' })).toBeInTheDocument()
  })

  it('renders intro verbatim text', () => {
    render(<DimensionsPanel open onClose={() => {}} />)
    expect(
      screen.getByText(
        /Fifteen positional situations, three explicit meta-quality dimensions, plus the qualities that cut across all of them\./,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/This map is version 0\.2 — it will be wrong in places, and your feedback reshapes it\./),
    ).toBeInTheDocument()
  })

  it('lists all 15 positional category short names', () => {
    render(<DimensionsPanel open onClose={() => {}} />)
    const shortNames = [
      'Takedowns',
      'Guard Pass',
      'Guard Ret.',
      'Closed Top',
      'Closed Bottom',
      'Open Guard Top',
      'Open Guard',
      'Half Top',
      'Half Bottom',
      'Mount Top',
      'Mount Bottom',
      'Back Take',
      'Back Escape',
      'Leg Locks',
      'Wrist Locks',
    ]
    for (const name of shortNames) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('lists all 15 positional category descriptions', () => {
    render(<DimensionsPanel open onClose={() => {}} />)
    const descriptions = [
      'Standing grappling, throws, and takedown techniques',
      'Passing opponent\'s guard from top position',
      'Maintaining and recovering guard from bottom position',
      'Breaking and passing closed guard',
      'Attacking and controlling from closed guard',
      'Passing various open guard styles',
      'Playing various open guard styles',
      'Passing and controlling from half guard top',
      'Playing and attacking from half guard bottom',
      'Controlling and attacking from mount',
      'Escaping and defending from mount bottom',
      'Controlling and attacking from back mount',
      'Escaping and defending from back mount bottom',
      'Attacking with and defending against leg locks',
      'Attacking with and defending against wrist locks',
    ]
    for (const desc of descriptions) {
      expect(screen.getByText(desc)).toBeInTheDocument()
    }
  })

  it('renders Cross-cutting qualities section heading', () => {
    render(<DimensionsPanel open onClose={() => {}} />)
    expect(screen.getByText('Cross-cutting qualities')).toBeInTheDocument()
  })

  it('lists all 7 quality labels: pressure, connection, composure, timing, chaining, defense depth, adaptability', () => {
    render(<DimensionsPanel open onClose={() => {}} />)
    const labels = [
      'Pressure',
      'Connection',
      'Composure',
      'Timing',
      'Chaining',
      'Defense depth',
      'Adaptability',
    ]
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('renders closing line about feedback', () => {
    render(<DimensionsPanel open onClose={() => {}} />)
    expect(
      screen.getByText(/Missing something you rate in training partners\?/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/That's exactly the feedback that changes the map\./),
    ).toBeInTheDocument()
  })

  it('calls onClose on Escape key', () => {
    const fn = vi.fn()
    render(<DimensionsPanel open onClose={fn} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Close button clicked', () => {
    const fn = vi.fn()
    render(<DimensionsPanel open onClose={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
