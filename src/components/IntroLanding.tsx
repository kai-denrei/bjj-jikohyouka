/**
 * IntroLanding — visual hero for the BJJ Skill-Check intro screen (verdict #7).
 *
 * Renders an SVG bell-curve chart with the same 5 belt curves as BellCurveAxis
 * (identical gaussian params / shared function), 6 numbered example-grappler
 * dots sitting on their respective curves, an overlap bracket at x≈42 linking
 * dots 2 & 3 (brown/blue at the same ability), and an ability-ordered legend.
 *
 * Architecture contract:
 * - Curves computed via gaussianAxisHeight from src/lib/gaussian (shared source).
 * - Dot data from src/lib/introDots (typed, tested, ability-ascending).
 * - Animation: curves draw L→R, dots pop in order, bracket last, ~1.2s total.
 *   Gated on usePrefersReducedMotion — if reduced motion OR jsdom (no matchMedia),
 *   everything renders at final state immediately.
 */

import { useEffect, useRef, useState } from 'react'
import { gaussianAxisHeight } from '../lib/gaussian'
import { INTRO_DOTS, dotY } from '../lib/introDots'
import type { IntroDot } from '../lib/introDots'
import '../styles/tokens.css'

// ── SVG geometry ─────────────────────────────────────────────────────────────
// Kept intentionally identical to BellCurveAxis so curves look the same.
const VIEW_W   = 360
const VIEW_H   = 170
const PLOT_X0  = 10
const PLOT_X1  = 350
const PLOT_W   = PLOT_X1 - PLOT_X0   // 340
const PLOT_H   = 120
const AXIS_Y   = 138
const LABEL_Y  = 155

// Belt render order (same as BellCurveAxis — white on bottom, black on top)
const BELT_ORDER = ['white', 'blue', 'purple', 'brown', 'black'] as const
type BeltName = 'white' | 'blue' | 'purple' | 'brown' | 'black'

// ── Token references (no literals) ──────────────────────────────────────────
const BELT_STROKE: Record<BeltName, string> = {
  white:  'var(--line)',
  blue:   'var(--belt-blue)',
  purple: 'var(--belt-purple)',
  brown:  'var(--belt-brown)',
  black:  'var(--line-strong)',
}
const BELT_FILL: Record<BeltName, string> = {
  white:  'var(--belt-white)',
  blue:   'var(--belt-blue)',
  purple: 'var(--belt-purple)',
  brown:  'var(--belt-brown)',
  black:  'var(--belt-black)',
}

/** Belt curve params — MUST match scales.json ability_axis */
const BELT_PARAMS: Record<BeltName, { mean: number; sd: number; height: number }> = {
  white:  { mean: 12, sd: 7,  height: 1.00 },
  blue:   { mean: 28, sd: 9,  height: 0.55 },
  purple: { mean: 45, sd: 11, height: 0.42 },
  brown:  { mean: 62, sd: 13, height: 0.30 },
  black:  { mean: 74, sd: 14, height: 0.34 },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function axisToSvgX(v: number): number {
  return PLOT_X0 + (v / 100) * PLOT_W
}

function buildGaussianPath(belt: BeltName): string {
  const { mean, sd, height } = BELT_PARAMS[belt]
  const STEPS = 180
  const points: [number, number][] = []
  for (let i = 0; i <= STEPS; i++) {
    const svgX = PLOT_X0 + (i / STEPS) * PLOT_W
    const axisVal = ((svgX - PLOT_X0) / PLOT_W) * 100
    const h = gaussianAxisHeight(axisVal, mean, sd, height)
    const svgY = AXIS_Y - h * PLOT_H
    points.push([svgX, svgY])
  }
  return (
    `M${PLOT_X0},${AXIS_Y} ` +
    `L${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} ` +
    `L${PLOT_X1},${AXIS_Y} Z`
  )
}

/** Dot circle y in SVG space */
function dotSvgY(dot: IntroDot): number {
  return AXIS_Y - dotY(dot) * PLOT_H
}

// ── Reduced motion hook ──────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  // If matchMedia is not available (jsdom, old environments) → treat as reduced.
  if (typeof window === 'undefined' || !window.matchMedia) return true
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  // Stateful so it reacts to OS changes mid-session.
  const [reduced, setReduced] = useState(mq.matches)
  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return reduced
}

// ── Animation phases ─────────────────────────────────────────────────────────
// 0: nothing visible (start)
// 1: curves drawn
// 2: dots appearing (incremented per dot with a short delay)
// 3: bracket visible
const CURVE_DRAW_MS  = 600
const DOT_DELAY_MS   = 100  // each dot pops in this many ms apart, after curves done
const BRACKET_DELAY  = CURVE_DRAW_MS + DOT_DELAY_MS * INTRO_DOTS.length + 100

// ── Props ────────────────────────────────────────────────────────────────────

export interface IntroLandingProps {
  onStart: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function IntroLanding({ onStart }: IntroLandingProps) {
  const reduced = usePrefersReducedMotion()

  // How many dots are "popped in" so far during animation
  const [dotsVisible, setDotsVisible] = useState(reduced ? INTRO_DOTS.length : 0)
  const [curvesVisible, setCurvesVisible] = useState(reduced)
  const [bracketVisible, setBracketVisible] = useState(reduced)

  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (reduced) return  // final state already; no timers needed

    // Curve draw: after a tick, mark curves visible (CSS clip-path or opacity)
    const t0 = setTimeout(() => setCurvesVisible(true), 50)
    timerRefs.current.push(t0)

    // Dots pop in one by one after curves have drawn
    for (let i = 0; i < INTRO_DOTS.length; i++) {
      const t = setTimeout(() => {
        setDotsVisible(i + 1)
      }, CURVE_DRAW_MS + i * DOT_DELAY_MS)
      timerRefs.current.push(t)
    }

    // Bracket last
    const tb = setTimeout(() => setBracketVisible(true), BRACKET_DELAY)
    timerRefs.current.push(tb)

    return () => {
      timerRefs.current.forEach(clearTimeout)
      timerRefs.current = []
    }
  }, [reduced])

  // Overlap pair: the two dots with x≈42/43
  const overlapX = axisToSvgX(42.5)  // midpoint between x42 and x43
  const dot2 = INTRO_DOTS[1]  // brown x42
  const dot3 = INTRO_DOTS[2]  // blue x43
  const bracketTop    = dotSvgY(dot3)  // blue is higher (h=0.14 > brown h=0.09)
  const bracketBottom = dotSvgY(dot2)

  // Curve paths (pre-built once)
  const curvePaths = BELT_ORDER.map(belt => ({
    belt,
    d: buildGaussianPath(belt),
  }))

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {/* ── Hero headline ── */}
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(22px, 5vw, 28px)',
          lineHeight: 1.2,
          margin: '0 0 16px',
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
        }}
      >
        Belts are a rough map. Ability is the territory.
      </h1>

      {/* ── SVG hero chart ── */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{
          width: '100%',
          display: 'block',
          marginBottom: 16,
          overflow: 'visible',
        }}
        role="img"
        aria-label="Bell curves showing the ability distribution for each belt. A blue belt with a wrestling background and a brown belt who is out of shape can have the same ability score — the overlap pair shows belt rank and ability diverge."
      >
        {/* Curves — white→black paint order */}
        {curvePaths.map(({ belt, d }) => {
          const b = belt as BeltName
          return (
            <path
              key={belt}
              data-intro-curve={belt}
              d={d}
              fill={BELT_FILL[b]}
              fillOpacity={curvesVisible ? 0.34 : 0}
              stroke={BELT_STROKE[b]}
              strokeWidth={1.5}
              style={{
                transition: reduced ? 'none' : `fill-opacity ${CURVE_DRAW_MS}ms ease-out, stroke-opacity ${CURVE_DRAW_MS}ms ease-out`,
                strokeOpacity: curvesVisible ? 1 : 0,
              }}
            />
          )
        })}

        {/* Horizontal axis */}
        <line
          x1={PLOT_X0} y1={AXIS_Y}
          x2={PLOT_X1} y2={AXIS_Y}
          stroke="var(--line)"
          strokeWidth={1}
        />

        {/* Endpoint labels */}
        <text x={PLOT_X0} y={LABEL_Y} className="mono" fill="var(--ink-2)" fontSize={11} textAnchor="start">
          Untrained
        </text>
        <text x={PLOT_X1} y={LABEL_Y} className="mono" fill="var(--ink-2)" fontSize={11} textAnchor="end">
          Elite
        </text>

        {/* Overlap bracket — faint vertical bracket linking dots 2 and 3 */}
        {bracketVisible && (
          <g style={{ transition: reduced ? 'none' : 'opacity 0.3s ease-in' }}>
            {/* Vertical line */}
            <line
              x1={overlapX + 14} y1={bracketTop - 4}
              x2={overlapX + 14} y2={bracketBottom + 4}
              stroke="var(--line-strong)"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            {/* Top tick */}
            <line
              x1={overlapX + 10} y1={bracketTop - 4}
              x2={overlapX + 18} y2={bracketTop - 4}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
            {/* Bottom tick */}
            <line
              x1={overlapX + 10} y1={bracketBottom + 4}
              x2={overlapX + 18} y2={bracketBottom + 4}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
          </g>
        )}

        {/* Numbered dots — each belt-colored pip with Plex Mono number */}
        {INTRO_DOTS.map((dot, i) => {
          const cx = axisToSvgX(dot.x)
          const cy = dotSvgY(dot)
          const visible = i < dotsVisible
          const belt = dot.belt as BeltName

          // Dot stroke: both-extremes rule
          const dotStroke =
            belt === 'white' ? 'var(--line)'
            : belt === 'black' ? 'var(--line-strong)'
            : 'var(--belt-white)'

          return (
            <g
              key={dot.n}
              data-intro-dot={dot.n}
              data-dot-n={dot.n}
              style={{
                opacity: visible ? 1 : 0,
                transition: reduced ? 'none' : 'opacity 0.2s ease-in',
              }}
            >
              {/* Belt-colored circle */}
              <circle
                cx={cx}
                cy={cy}
                r={9}
                fill={BELT_FILL[belt]}
                stroke={dotStroke}
                strokeWidth={1.5}
              />
              {/* Number label */}
              <text
                x={cx}
                y={cy + 4}
                fontFamily="var(--font-mono)"
                fontSize={10}
                fontWeight={600}
                fill={belt === 'white' ? 'var(--mat)' : belt === 'black' ? 'var(--ink)' : 'var(--mat)'}
                textAnchor="middle"
              >
                {dot.n}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Overlap micro-label (below chart, above legend) */}
      {bracketVisible && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-2)',
            margin: '0 0 12px',
            textAlign: 'center',
          }}
        >
          same ability, different belt
        </p>
      )}

      {/* ── Ability-ordered legend ── */}
      <ol
        role="list"
        style={{
          margin: '0 0 16px',
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {INTRO_DOTS.map(dot => {
          return (
            <li
              key={dot.n}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--ink)',
              }}
            >
              {/* Mono number */}
              <span
                className="mono"
                style={{ width: 16, flexShrink: 0, color: 'var(--ink-2)', textAlign: 'right' }}
              >
                {dot.n}
              </span>
              {/* Belt-colored pip */}
              <span
                className="belt-dot"
                data-belt={dot.belt}
                style={{ flexShrink: 0 }}
              />
              {/* Label */}
              <span style={{ flex: 1 }}>{dot.label}</span>
              {/* Ability axis figure */}
              <span className="mono" style={{ flexShrink: 0, color: 'var(--ink-2)' }}>
                x{dot.x}
              </span>
            </li>
          )
        })}
      </ol>

      {/* ── Explanation ── */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--ink-2)',
          margin: '0 0 20px',
          lineHeight: 1.5,
        }}
      >
        Belt color tracks ability loosely — and self-ratings track it even more loosely,
        about r&nbsp;≈&nbsp;.29. This is a mirror, not a measurement.
      </p>

      {/* ── Start button ── */}
      <button className="btn" onClick={onStart}>
        Start the sweep
      </button>
    </div>
  )
}
