/**
 * BellCurveAxis — staged-commit ability axis widget.
 *
 * Design intent: placement is STAGED, commit is EXPLICIT.
 *   • No default position — the question asks "where do you START to
 *     struggle?" and pre-seeding an answer would bias the response.
 *   • The left / right regions around the line ("works" / "struggles") are
 *     semantic landmarks, not just range endpoints.
 *   • Interaction by modality:
 *     - Mouse/pen: hover shows ghost line live; click commits immediately.
 *     - Touch: drag stages the line; Confirm button commits.
 *     - Keyboard: arrows stage; Enter/Space commits.
 *
 *   Anti-slider rationale — Appendix A of the task brief (2026-07-19):
 *   slider fatigue (all values feel equally valid), anchoring to the default
 *   position, and the failure of precision for a perceptual/spatial judgment.
 *   Tap-to-place, especially with visible gaussian curves as landmarks,
 *   produces more reliable self-assessment than continuous range inputs in
 *   skill-mapping contexts.
 */

import { useRef, useState } from 'react'
import type { Scale } from '../../lib/bank/schema'
import '../../styles/tokens.css'

export interface BellCurveAxisProps {
  scale: Scale
  value: number | null
  onChange: (v: number) => void
}

// SVG geometry constants
const VIEW_W = 360
const VIEW_H = 170
const PLOT_X0 = 10   // axis left edge in SVG units
const PLOT_X1 = 350  // axis right edge
const PLOT_W = PLOT_X1 - PLOT_X0  // 340
const PLOT_TOP = 10  // top of plot area
const PLOT_H = 120   // height available for curves
const AXIS_Y = 138   // y of the horizontal axis line
const LABEL_Y = 155  // y of endpoint labels

const BELT_ORDER = ['white', 'blue', 'purple', 'brown', 'black'] as const
type BeltName = typeof BELT_ORDER[number]

// Token lookup: white curve uses --line stroke (matches background on --mat)
const BELT_STROKE: Record<BeltName, string> = {
  white:  'var(--line)',
  blue:   'var(--belt-blue)',
  purple: 'var(--belt-purple)',
  brown:  'var(--belt-brown)',
  black:  'var(--belt-black)',
}
const BELT_FILL: Record<BeltName, string> = {
  white:  'var(--belt-white)',
  blue:   'var(--belt-blue)',
  purple: 'var(--belt-purple)',
  brown:  'var(--belt-brown)',
  black:  'var(--belt-black)',
}

/**
 * Pure helper: convert a pointer clientX to an axis value 1–100 (rounded).
 * Exported for direct unit testing — SVG has no layout in jsdom so component
 * click tests exercise the keyboard path; this helper covers the math.
 */
export function clientXToAxis(
  clientX: number,
  rect: { left: number; width: number }
): number {
  const fraction = (clientX - rect.left) / rect.width
  const raw = Math.round(fraction * 100)
  return Math.max(1, Math.min(100, raw))
}

/** Map axis value 0–100 to SVG x coordinate */
function axisToSvgX(v: number): number {
  return PLOT_X0 + (v / 100) * PLOT_W
}

/** Evaluate gaussian at SVG x for one curve */
function gaussianY(
  svgX: number,
  mean: number,
  sd: number,
  height: number
): number {
  const axisVal = ((svgX - PLOT_X0) / PLOT_W) * 100
  const exponent = -((axisVal - mean) ** 2) / (2 * sd ** 2)
  return height * Math.exp(exponent)
}

/** Build a smooth SVG path for a gaussian curve */
function buildGaussianPath(mean: number, sd: number, height: number): string {
  const STEPS = 180
  const points: [number, number][] = []
  for (let i = 0; i <= STEPS; i++) {
    const svgX = PLOT_X0 + (i / STEPS) * PLOT_W
    const normalised = gaussianY(svgX, mean, sd, height)
    const svgY = AXIS_Y - normalised * PLOT_H
    points.push([svgX, svgY])
  }
  // Close shape down to the axis
  return (
    `M${PLOT_X0},${AXIS_Y} ` +
    `L${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} ` +
    `L${PLOT_X1},${AXIS_Y} Z`
  )
}

/** Find the nearest curve to a given axis value (for aria-valuetext) */
function nearestBelt(curves: NonNullable<Scale['curves']>, v: number): string {
  // Deterministic tie-break: first curve in scale.curves order wins if distances are equal.
  let closest = curves[0]
  let minDist = Math.abs(v - curves[0].mean)
  for (const c of curves) {
    const d = Math.abs(v - c.mean)
    if (d < minDist) { minDist = d; closest = c }
  }
  return closest.belt.charAt(0).toUpperCase() + closest.belt.slice(1)
}

/** Compute the synthetic plot-area rect from an SVG element's bounding rect */
function plotRect(svg: SVGSVGElement): { left: number; width: number } {
  const rect = svg.getBoundingClientRect()
  return {
    left: rect.left + (PLOT_X0 / VIEW_W) * rect.width,
    width: (PLOT_W / VIEW_W) * rect.width,
  }
}

export function BellCurveAxis({ scale, value, onChange }: BellCurveAxisProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  // staged: position placed but not yet committed. null = nothing staged.
  const [staged, setStaged] = useState<number | null>(null)
  // ghostX: mouse-hover ghost position (mouse/pen only, not touch)
  const [ghostX, setGhostX] = useState<number | null>(null)

  const curves = scale.curves ?? []
  const startAnchor = scale.anchors.find(a => a.value === 0)?.label ?? 'Untrained'
  const endAnchor = scale.anchors.find(a => a.value === 100)?.label ?? 'Elite'

  // The "active display" position: staged takes priority, else committed value
  const displayValue = staged ?? (value !== null && value > 0 ? value : null)
  // What to show in the chart:
  //   - committed line (solid, data-testid="axis-line"): value > 0 and not staged
  //   - staged ghost line (dashed, data-testid="axis-line-staged"): staged !== null
  //   - hover ghost line: ghostX !== null (mouse/pen hover, no staged, no committed)
  const showCommittedLine = value !== null && value > 0 && staged === null
  const showStagedLine = staged !== null
  // The wash and microlabels track: staged > hover ghost > committed
  const washValue = displayValue
  const showWash = washValue !== null

  const committedLineX = showCommittedLine ? axisToSvgX(value!) : null
  const stagedLineX = showStagedLine ? axisToSvgX(staged!) : null
  // Hover ghost: only when no staged line and not committed (or could show over committed too)
  const hoverLineX = ghostX !== null && !showStagedLine ? axisToSvgX(ghostX) : null
  const washLineX = washValue !== null ? axisToSvgX(washValue) : null

  // ── Pointer helpers ──────────────────────────────────────────────────────

  function getPointerType(e: React.PointerEvent | React.MouseEvent): string {
    // fireEvent.pointer* in jsdom may not set pointerType on the synthetic event
    // but sets it as a property; React wraps it, so we read from nativeEvent or cast
    const pe = e as React.PointerEvent
    return (pe.nativeEvent as any)?.pointerType ?? (pe as any).pointerType ?? 'mouse'
  }

  function clientXToAxisFromSvg(clientX: number): number {
    const svg = svgRef.current
    if (!svg) return 50
    return clientXToAxis(clientX, plotRect(svg))
  }

  // ── Mouse / Pen handlers ─────────────────────────────────────────────────

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pt = getPointerType(e)
    if (pt === 'touch') return  // handled by touch path
    // Mouse/pen: update ghost hover position live
    setGhostX(clientXToAxisFromSvg(e.clientX))
  }

  function handlePointerLeave(e: React.PointerEvent<SVGSVGElement>) {
    const pt = getPointerType(e)
    if (pt === 'touch') return
    // Clear hover ghost (but keep any touch/keyboard staged state)
    setGhostX(null)
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    // Click commits immediately for mouse/pen
    const axisVal = clientXToAxisFromSvg(e.clientX)
    setGhostX(null)
    setStaged(null)
    onChange(axisVal)
  }

  // ── Touch handlers ───────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const pt = getPointerType(e)
    if (pt !== 'touch') return
    // Capture pointer so move events come to us even if touch leaves the element
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    const axisVal = clientXToAxisFromSvg(e.clientX)
    setStaged(axisVal)
  }

  function handlePointerMoveTouch(e: React.PointerEvent<SVGSVGElement>) {
    const pt = getPointerType(e)
    if (pt !== 'touch') return
    const axisVal = clientXToAxisFromSvg(e.clientX)
    setStaged(axisVal)
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const pt = getPointerType(e)
    if (pt !== 'touch') return
    // Keep staged — pointerUp does NOT commit for touch. Confirm button commits.
    const axisVal = clientXToAxisFromSvg(e.clientX)
    setStaged(axisVal)
  }

  function handleConfirm() {
    if (staged === null) return
    const toCommit = staged
    setStaged(null)
    onChange(toCommit)
  }

  // ── Keyboard handler ─────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      // Initialize from staged > committed > 50 (unplaced)
      const current = staged ?? (value !== null && value > 0 ? value : 50)
      const delta = e.key === 'ArrowRight' ? 2 : -2
      const next = Math.max(1, Math.min(100, current + delta))
      setStaged(next)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (staged !== null) {
        handleConfirm()
      }
      return
    }
  }

  // ── Combined pointer handlers (merge mouse and touch paths) ──────────────

  function handleUnifiedPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pt = getPointerType(e)
    if (pt === 'touch') {
      handlePointerMoveTouch(e)
    } else {
      handlePointerMove(e)
    }
  }

  // ── Aria ─────────────────────────────────────────────────────────────────

  const ariaDisplayValue = staged ?? (value !== null && value > 0 ? value : null)
  const ariaValueText = ariaDisplayValue !== null
    ? `${ariaDisplayValue} of 100 — around ${nearestBelt(curves, ariaDisplayValue)}`
    : value === 0
    ? 'No answer to this yet'
    : 'Not placed'

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Prompt label */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--ink-2)',
          margin: '0 0 8px',
        }}
      >
        {scale.label}
      </p>

      {/* SVG chart — role slider for keyboard/aria. aria-valuemin=1 because value 0 is the floor chip's, a separate control */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
        role="slider"
        tabIndex={0}
        aria-valuemin={1}
        aria-valuemax={100}
        {...(ariaDisplayValue !== null ? { 'aria-valuenow': ariaDisplayValue } : {})}
        aria-valuetext={ariaValueText}
        aria-label={scale.label}
        onClick={handleSvgClick}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handleUnifiedPointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* Left-of-line wash (tracks staged/hover/committed, appears behind curves) */}
        {showWash && washLineX !== null && (
          <rect
            x={PLOT_X0}
            y={PLOT_TOP}
            width={washLineX - PLOT_X0}
            height={AXIS_Y - PLOT_TOP}
            fill="var(--accent)"
            fillOpacity={showStagedLine ? 0.05 : 0.07}
          />
        )}

        {/* Gaussian curves — white→black paint order */}
        {BELT_ORDER.map((belt) => {
          const curve = curves.find(c => c.belt === belt)
          if (!curve) return null
          return (
            <path
              key={belt}
              data-belt={belt}
              d={buildGaussianPath(curve.mean, curve.sd, curve.height)}
              fill={BELT_FILL[belt]}
              fillOpacity={0.28}
              stroke={BELT_STROKE[belt]}
              strokeWidth={1.5}
            />
          )
        })}

        {/* Horizontal axis line */}
        <line
          x1={PLOT_X0} y1={AXIS_Y}
          x2={PLOT_X1} y2={AXIS_Y}
          stroke="var(--line)"
          strokeWidth={1}
        />

        {/* Endpoint labels */}
        <text
          x={PLOT_X0}
          y={LABEL_Y}
          className="mono"
          fill="var(--ink-2)"
          fontSize={11}
          textAnchor="start"
        >
          {startAnchor}
        </text>
        <text
          x={PLOT_X1}
          y={LABEL_Y}
          className="mono"
          fill="var(--ink-2)"
          fontSize={11}
          textAnchor="end"
        >
          {endAnchor}
        </text>

        {/* Hover ghost line (mouse/pen hover, no staged) */}
        {hoverLineX !== null && (
          <line
            x1={hoverLineX} y1={PLOT_TOP}
            x2={hoverLineX} y2={AXIS_Y}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="4 3"
            opacity={0.4}
          />
        )}

        {/* Staged ghost line (dashed, accent color, 0.6 opacity) */}
        {showStagedLine && stagedLineX !== null && (
          <>
            <line
              data-testid="axis-line-staged"
              x1={stagedLineX} y1={PLOT_TOP}
              x2={stagedLineX} y2={AXIS_Y}
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={0.6}
            />
            {/* "works" microlabel — left of staged line */}
            {stagedLineX > PLOT_X0 + 18 && (
              <text
                x={stagedLineX - 6}
                y={PLOT_TOP + 14}
                className="mono"
                fill="var(--accent)"
                fontSize={10}
                textAnchor="end"
                opacity={0.6}
              >
                works
              </text>
            )}
            {/* "struggles" microlabel — right of staged line */}
            {stagedLineX < PLOT_X1 - 24 && (
              <text
                x={stagedLineX + 6}
                y={PLOT_TOP + 14}
                className="mono"
                fill="var(--ink-2)"
                fontSize={10}
                textAnchor="start"
                opacity={0.6}
              >
                struggles
              </text>
            )}
          </>
        )}

        {/* Committed vertical placement line (solid) */}
        {showCommittedLine && committedLineX !== null && (
          <>
            <line
              data-testid="axis-line"
              x1={committedLineX} y1={PLOT_TOP}
              x2={committedLineX} y2={AXIS_Y}
              stroke="var(--accent)"
              strokeWidth={2}
            />
            {/* "works" microlabel — left of committed line */}
            {committedLineX > PLOT_X0 + 18 && (
              <text
                x={committedLineX - 6}
                y={PLOT_TOP + 14}
                className="mono"
                fill="var(--accent)"
                fontSize={10}
                textAnchor="end"
              >
                works
              </text>
            )}
            {/* "struggles" microlabel — right of committed line */}
            {committedLineX < PLOT_X1 - 24 && (
              <text
                x={committedLineX + 6}
                y={PLOT_TOP + 14}
                className="mono"
                fill="var(--ink-2)"
                fontSize={10}
                textAnchor="start"
              >
                struggles
              </text>
            )}
          </>
        )}
      </svg>

      {/* Confirm button — touch only, visible while staged !== null */}
      {staged !== null && (
        <div style={{ marginTop: 8 }}>
          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      )}

      {/* Floor chip — "No answer to this yet" */}
      {scale.floor && (
        <div style={{ marginTop: 12 }}>
          <button
            className="chip"
            aria-pressed={value === 0}
            onClick={() => {
              setStaged(null)
              setGhostX(null)
              onChange(0)
            }}
            style={{ width: '100%' }}
          >
            No answer to this yet
          </button>
        </div>
      )}
    </div>
  )
}
