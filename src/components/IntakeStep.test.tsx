import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IntakeStep } from './IntakeStep'

describe('IntakeStep', () => {
  it('submits the four choices', () => {
    const fn = vi.fn()
    render(<IntakeStep onSubmit={fn} />)
    expect(screen.getByText(/stays on your device/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Purple' }))
    fireEvent.click(screen.getByRole('button', { name: '3–6 yrs' }))
    fireEvent.click(screen.getByRole('button', { name: 'Both' }))
    fireEvent.click(screen.getByRole('button', { name: '3–4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(fn).toHaveBeenCalledWith({ belt: 'purple', years: '3-6', style: 'both', sessionsPerWeek: '3-4' })
  })
  it('skip submits null', () => {
    const fn = vi.fn()
    render(<IntakeStep onSubmit={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(fn).toHaveBeenCalledWith(null)
  })
})
