import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('opens on the visual intro landing with hero line, r≈.29, and a start button', () => {
    render(<App />)
    // Visual landing hero line (verdict #8)
    expect(screen.getByText('All Models are Wrong, Some are useful, Belt Colors are only moderately so.')).toBeInTheDocument()
    // Honest-framing copy including the r≈.29 figure
    expect(screen.getByText(/r ≈ \.29/)).toBeInTheDocument()
    // Start button unchanged
    expect(screen.getByRole('button', { name: 'Start the sweep' })).toBeInTheDocument()
  })
})
