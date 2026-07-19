import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TapScale } from './TapScale'
import { BeltCurve } from './BeltCurve'
import { BellCurveAxis, clientXToAxis } from './BellCurveAxis'
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

describe('clientXToAxis', () => {
  it('maps clientX to an axis value 1–100, clamped and rounded', () => {
    const rect = { left: 100, width: 400 }
    // dead center → 50
    expect(clientXToAxis(300, rect)).toBe(50)
    // quarter way → 25
    expect(clientXToAxis(200, rect)).toBe(25)
    // exactly at right edge → 100
    expect(clientXToAxis(500, rect)).toBe(100)
    // beyond right → clamped to 100
    expect(clientXToAxis(600, rect)).toBe(100)
    // at left edge → 0 → clamped to 1
    expect(clientXToAxis(100, rect)).toBe(1)
    // before left edge → clamped to 1
    expect(clientXToAxis(50, rect)).toBe(1)
    // rounds: 24.5 → 25 (not 24)
    expect(clientXToAxis(198, rect)).toBe(25) // (198-100)/400 = 0.245 → round to 25
  })
  it('works with a synthetic plot-area rect (handleSvgClick use case)', () => {
    // Simulates a 360-wide SVG with plot area at x∈[10,350] (PLOT_X0=10, PLOT_W=340)
    // Scaled to screen width 340: left=110 (100 + 10/360*340), width=340*(340/360)
    const plotRect = { left: 110, width: 321.111 }
    // Click at screen 280 should map to axis ≈50
    // fraction = (280 - 110) / 321.111 ≈ 0.530 → round to 53 (conservative)
    // But let's use a simpler case: click at 110 + 321.111/2 ≈ 270.5 → ~50
    expect(clientXToAxis(270, plotRect)).toBe(50) // (270-110)/321.111 ≈ 0.497 → rounds to 50
  })
})

describe('BellCurveAxis', () => {
  const axis = () => bank.scales.find(s => s.id === 'ability_axis')!

  it('renders five belt curves, endpoint labels, and the fixed prompt from scale data', () => {
    render(<BellCurveAxis scale={axis()} value={null} onChange={() => {}} />)
    expect(document.querySelectorAll('svg path[data-belt]')).toHaveLength(5)
    expect(screen.getByText('Untrained')).toBeInTheDocument()
    expect(screen.getByText('Elite')).toBeInTheDocument()
    expect(screen.getByText('Where do you start to struggle?')).toBeInTheDocument()
  })

  it('mouse click commits immediately — pointerMove then click fires onChange once', () => {
    const fn = vi.fn()
    render(<BellCurveAxis scale={axis()} value={null} onChange={fn} />)
    const svg = document.querySelector('svg[role="slider"]')!
    // pointerMove with mouse pointerType — should NOT commit
    fireEvent.pointerMove(svg, { pointerType: 'mouse', clientX: 200 })
    expect(fn).not.toHaveBeenCalled()
    // click commits immediately
    fireEvent.click(svg, { clientX: 200 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('touch drag stages without committing; Confirm button commits and disappears', () => {
    const fn = vi.fn()
    render(<BellCurveAxis scale={axis()} value={null} onChange={fn} />)
    const svg = document.querySelector('svg[role="slider"]')!
    // No Confirm button initially
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
    // Touch drag: pointerDown + pointerMove + pointerUp
    fireEvent.pointerDown(svg, { pointerType: 'touch', clientX: 150, pointerId: 1 })
    fireEvent.pointerMove(svg, { pointerType: 'touch', clientX: 180, pointerId: 1 })
    fireEvent.pointerUp(svg, { pointerType: 'touch', clientX: 180, pointerId: 1 })
    // onChange should NOT have been called yet
    expect(fn).not.toHaveBeenCalled()
    // Confirm button should now be visible
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).toBeInTheDocument()
    // Clicking Confirm commits
    fireEvent.click(confirmBtn)
    expect(fn).toHaveBeenCalledTimes(1)
    // Confirm disappears after commit
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
  })

  it('no Confirm button when nothing is staged', () => {
    render(<BellCurveAxis scale={axis()} value={50} onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
  })

  it('keyboard ArrowRight from unplaced does not commit; Enter commits at 52', () => {
    const fn = vi.fn()
    render(<BellCurveAxis scale={axis()} value={null} onChange={fn} />)
    const slider = screen.getByRole('slider')
    // ArrowRight from unplaced — stages at 52 (50+2) but does NOT commit
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(fn).not.toHaveBeenCalled()
    // Enter commits
    fireEvent.keyDown(slider, { key: 'Enter' })
    expect(fn).toHaveBeenCalledWith(52)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('keyboard arrow keys still work from a placed value', () => {
    const fn = vi.fn()
    render(<BellCurveAxis scale={axis()} value={50} onChange={fn} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '50')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/around (White|Blue|Purple|Brown|Black)/)
    // ArrowLeft stages without committing
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(fn).not.toHaveBeenCalled()
    // Space commits staged
    fireEvent.keyDown(slider, { key: ' ' })
    expect(fn).toHaveBeenCalledWith(48)
  })

  it('keyboard arrows clamp to 1–100', () => {
    const fn = vi.fn()
    render(<BellCurveAxis scale={axis()} value={1} onChange={fn} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    fireEvent.keyDown(slider, { key: 'Enter' })
    expect(fn).toHaveBeenCalledWith(1) // clamped, not -1
  })

  it('floor chip commits 0 immediately and clears any staged line', () => {
    const fn = vi.fn()
    render(<BellCurveAxis scale={axis()} value={null} onChange={fn} />)
    const svg = document.querySelector('svg[role="slider"]')!
    // Stage something via touch
    fireEvent.pointerDown(svg, { pointerType: 'touch', clientX: 150, pointerId: 1 })
    fireEvent.pointerMove(svg, { pointerType: 'touch', clientX: 180, pointerId: 1 })
    fireEvent.pointerUp(svg, { pointerType: 'touch', clientX: 180, pointerId: 1 })
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    // Floor chip clears staged and commits 0 immediately
    fireEvent.click(screen.getByRole('button', { name: 'No answer to this yet' }))
    expect(fn).toHaveBeenCalledWith(0)
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
  })

  it('renders the vertical line only when placed, with no staged line', () => {
    const fn = vi.fn()
    const { rerender } = render(<BellCurveAxis scale={axis()} value={null} onChange={fn} />)
    expect(document.querySelector('[data-testid="axis-line"]')).toBeNull()
    expect(document.querySelector('[data-testid="axis-line-staged"]')).toBeNull()
    rerender(<BellCurveAxis scale={axis()} value={62} onChange={fn} />)
    expect(document.querySelector('[data-testid="axis-line"]')).not.toBeNull()
    expect(screen.getByText('works')).toBeInTheDocument()
    expect(screen.getByText('struggles')).toBeInTheDocument()
  })

  it('staged ghost line has strokeDasharray; committed line does not', () => {
    render(<BellCurveAxis scale={axis()} value={null} onChange={() => {}} />)
    // Trigger keyboard staging
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    // Staged line should appear
    const stagedLine = document.querySelector('[data-testid="axis-line-staged"]')
    expect(stagedLine).not.toBeNull()
    expect(stagedLine!.getAttribute('stroke-dasharray')).toBeTruthy()
    // No committed line yet
    expect(document.querySelector('[data-testid="axis-line"]')).toBeNull()
  })

  it('aria-valuenow reflects staged when staged is present, else committed', () => {
    const { rerender } = render(<BellCurveAxis scale={axis()} value={null} onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    // Neither staged nor committed — no aria-valuenow
    expect(slider.hasAttribute('aria-valuenow')).toBe(false)
    // Stage via keyboard
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    // aria-valuenow should reflect staged value (52)
    expect(slider).toHaveAttribute('aria-valuenow', '52')
    // After commit, rerender with committed value
    fireEvent.keyDown(slider, { key: 'Enter' })
    rerender(<BellCurveAxis scale={axis()} value={52} onChange={() => {}} />)
    expect(slider).toHaveAttribute('aria-valuenow', '52')
  })

  it('QuestionInput dispatches axis scales to BellCurveAxis', () => {
    render(<QuestionInput scale={axis()} value={null} onChange={() => {}} />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })
})
