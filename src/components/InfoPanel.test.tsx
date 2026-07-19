import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InfoPanel } from './InfoPanel'

describe('InfoPanel', () => {
  it('renders all four explainer sections when open', () => {
    render(<InfoPanel open onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'How to read this chart' })).toBeInTheDocument()
    expect(screen.getByText(/belt population/)).toBeInTheDocument()
    expect(screen.getByText(/works more often than not/)).toBeInTheDocument()
    expect(screen.getByText(/marks a place to start, not a failure/)).toBeInTheDocument()
    expect(screen.getByText(/mirror, not a measurement/)).toBeInTheDocument()
  })

  it('closes on Escape and on the Close button', () => {
    const fn = vi.fn()
    render(<InfoPanel open onClose={fn} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('renders nothing when closed', () => {
    render(<InfoPanel open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
