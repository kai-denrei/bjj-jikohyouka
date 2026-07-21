import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('opens on the visual intro landing with hero line, r ≈ 0.29 framing, and a start button', () => {
    render(<App />)
    // Visual landing hero line (verdict #8)
    expect(screen.getByText('All Models are Wrong, Some are useful, Belt Colors are only moderately so.')).toBeInTheDocument()
    // Corrected honest-framing copy (verdict #9): weak-correlation phrasing
    expect(screen.getByText(/r ≈ 0\.29 means a weak positive correlation/)).toBeInTheDocument()
    // Start button unchanged
    expect(screen.getByRole('button', { name: 'Start the sweep' })).toBeInTheDocument()
  })
})
