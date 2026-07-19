import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TapScale } from './TapScale'
import { BeltCurve } from './BeltCurve'
import { QuestionInput } from './QuestionInput'
import { loadBank } from '../../lib/bank/load'

const bank = loadBank()
const scale = (id: string) => bank.scales.find(s => s.id === id)!

describe('TapScale', () => {
  it('renders every ladder6 anchor as a full-label chip', () => {
    render(<TapScale scale={scale('ladder6')} value={null} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: "I don't know what to do here" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Works vs bigger/higher rank — could teach it' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })
  it('fires onChange with the anchor value and marks selection', () => {
    const fn = vi.fn()
    const { rerender } = render(<TapScale scale={scale('ladder6')} value={null} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Works in drilling / cooperative' }))
    expect(fn).toHaveBeenCalledWith(2)
    rerender(<TapScale scale={scale('ladder6')} value={2} onChange={fn} />)
    expect(screen.getByRole('button', { name: 'Works in drilling / cooperative' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('belt_threshold offers N/A (→ null) and belt swatches for ranked chips', () => {
    const fn = vi.fn()
    render(<TapScale scale={scale('belt_threshold')} value={null} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'N/A' }))
    expect(fn).toHaveBeenCalledWith(null)
    expect(document.querySelectorAll('.belt-dot')).toHaveLength(5)  // W B P Br Bk, not Untrained
  })
  it('legacy slider10 renders as 10 tap chips, never a range input', () => {
    render(<TapScale scale={scale('slider10')} value={null} onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(10)
    expect(document.querySelector('input[type="range"]')).toBeNull()
  })
})

describe('BeltCurve', () => {
  it('renders 5 belt columns of 10 cells and sets the tapped column', () => {
    const fn = vi.fn()
    render(<BeltCurve scale={scale('belt_curve')} value={null} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'White: 8 of 10' }))
    expect(fn).toHaveBeenCalledWith([8, 5, 5, 5, 5])
  })
})

describe('QuestionInput', () => {
  it('dispatches curve scales to BeltCurve and tap scales to TapScale', () => {
    render(<QuestionInput scale={scale('belt_curve')} value={null} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Black: 1 of 10' })).toBeInTheDocument()
  })
})
