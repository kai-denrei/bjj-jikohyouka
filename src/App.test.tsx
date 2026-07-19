import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('opens on the intro screen with honest framing and a start button', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Skill-Check' })).toBeInTheDocument()
    expect(screen.getByText(/structured mirror/i)).toBeInTheDocument()
    expect(screen.getByText(/r ≈ \.29/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start the sweep' })).toBeInTheDocument()
  })
})
