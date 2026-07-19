/**
 * BellCurveAxis — tap-to-place ability axis widget.
 *
 * Design intent: this is NOT a slider.
 *   • Tap/click places a vertical line at a semantic position on the ability
 *     distribution. There is no draggable handle.
 *   • No default position — the question asks "where do you START to
 *     struggle?" and pre-seeding an answer would bias the response.
 *   • The left / right regions around the line ("works" / "struggles") are
 *     semantic landmarks, not just range endpoints. A slider UX collapses
 *     the meaning of those regions into abstract numbers; a tap-to-place
 *     lets the practitioner aim directly at a perceived landmark on the
 *     distribution curve rather than nudging a handle.
 *
 *   Anti-slider rationale — Appendix A of the task brief (2026-07-19):
 *   slider fatigue (all values feel equally valid), anchoring to the default
 *   position, and the failure of precision for a perceptual/spatial judgment.
 *   Tap-to-place, especially with visible gaussian curves as landmarks,
 *   produces more reliable self-assessment than continuous range inputs in
 *   skill-mapping contexts.
 */

import { useRef } from 'react'
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

export function BellCurveAxis({ scale, value, onChange }: BellCurveAxisProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const curves = scale.curves ?? []
  const startAnchor = scale.anchors.find(a => a.value === 0)?.label ?? 'Untrained'
  const endAnchor = scale.anchors.find(a => a.value === 100)?.label ?? 'Elite'

  // Whether the vertical line is shown (value placed and non-zero)
  const showLine = value !== null && value > 0
  const lineX = showLine ? axisToSvgX(value!) : null

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    // Construct a synthetic plot-area rect to reuse clientXToAxis's unified math
    const plotRect = {
      left: rect.left + (PLOT_X0 / VIEW_W) * rect.width,
      width: (PLOT_W / VIEW_W) * rect.width,
    }
    onChange(clientXToAxis(e.clientX, plotRect))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const current = value ?? 50
    const delta = e.key === 'ArrowRight' ? 2 : -2
    const next = Math.max(1, Math.min(100, current + delta))
    onChange(next)
  }

  const ariaValueText = value != null && value > 0
    ? `${value} of 100 — around ${nearestBelt(curves, value)}`
    : value === 0
    ? 'No answer yet'
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
        aria-valuenow={value ?? 0}
        aria-valuetext={ariaValueText}
        aria-label={scale.label}
        onClick={handleSvgClick}
        onKeyDown={handleKeyDown}
      >
        {/* Left-of-line wash (appears behind curves) */}
        {showLine && lineX !== null && (
          <rect
            x={PLOT_X0}
            y={PLOT_TOP}
            width={lineX - PLOT_X0}
            height={AXIS_Y - PLOT_TOP}
            fill="var(--accent)"
            fillOpacity={0.07}
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

        {/* Vertical placement line */}
        {showLine && lineX !== null && (
          <>
            <line
              data-testid="axis-line"
              x1={lineX} y1={PLOT_TOP}
              x2={lineX} y2={AXIS_Y}
              stroke="var(--accent)"
              strokeWidth={2}
            />
            {/* "works" microlabel — left of line, anchored to line */}
            {lineX > PLOT_X0 + 18 && (
              <text
                x={lineX - 6}
                y={PLOT_TOP + 14}
                className="mono"
                fill="var(--accent)"
                fontSize={10}
                textAnchor="end"
              >
                works
              </text>
            )}
            {/* "struggles" microlabel — right of line */}
            {lineX < PLOT_X1 - 24 && (
              <text
                x={lineX + 6}
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

      {/* Floor chip — "No answer to this yet" */}
      {scale.floor && (
        <div style={{ marginTop: 12 }}>
          <button
            className="chip"
            aria-pressed={value === 0}
            onClick={() => onChange(0)}
            style={{ width: '100%' }}
          >
            No answer to this yet
          </button>
        </div>
      )}
    </div>
  )
}
