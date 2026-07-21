import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IntakeStep } from './IntakeStep'

describe('IntakeStep', () => {
  it('renders 2 chip groups and no Belt or Style group', () => {
    render(<IntakeStep onSubmit={vi.fn()} />)
    expect(screen.getByText('Time training')).toBeInTheDocument()
    expect(screen.getByText('Sessions per week')).toBeInTheDocument()
    expect(screen.queryByText('Belt')).toBeNull()
    expect(screen.queryByText('Style')).toBeNull()
  })

  it('intro copy references mat time not belt', () => {
    render(<IntakeStep onSubmit={vi.fn()} />)
    expect(screen.getByText(/mat time helps frame the results/)).toBeInTheDocument()
  })

  it('Continue disabled until both groups picked', () => {
    render(<IntakeStep onSubmit={vi.fn()} />)
    const continueBtn = screen.getByRole('button', { name: 'Continue' })
    expect(continueBtn).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '3–6 yrs' }))
    expect(continueBtn).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '3–4' }))
    expect(continueBtn).not.toBeDisabled()
  })

  it('shows hours readout once both picks are made', () => {
    render(<IntakeStep onSubmit={vi.fn()} />)
    expect(screen.queryByText(/on the mat/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '3–6 yrs' }))
    expect(screen.queryByText(/on the mat/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '3–4' }))
    // 3-6 yrs × 3-4 sessions = ~1,150 hours
    expect(screen.getByText(/1,150 hours.*on the mat/)).toBeInTheDocument()
    expect(screen.getByText(/assuming.*1\.5 h a session/)).toBeInTheDocument()
  })

  it('submits {years, sessionsPerWeek} on Continue — no belt or style', () => {
    const fn = vi.fn()
    render(<IntakeStep onSubmit={fn} />)
    fireEvent.click(screen.getByRole('button', { name: '3–6 yrs' }))
    fireEvent.click(screen.getByRole('button', { name: '3–4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(fn).toHaveBeenCalledWith({ years: '3-6', sessionsPerWeek: '3-4' })
    const submitted = fn.mock.calls[0][0]
    expect(submitted).not.toHaveProperty('belt')
    expect(submitted).not.toHaveProperty('style')
  })

  it('skip submits null', () => {
    const fn = vi.fn()
    render(<IntakeStep onSubmit={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(fn).toHaveBeenCalledWith(null)
  })
})
