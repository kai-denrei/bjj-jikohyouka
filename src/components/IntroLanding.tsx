/**
 * IntroLanding — visual hero for the BJJ Skill-Check intro screen (verdict #7).
 *
 * Renders an SVG bell-curve chart with the same 5 belt curves as BellCurveAxis
 * (identical gaussian params / shared function), 6 numbered example-grappler
 * dots sitting on their respective curves, an overlap bracket at x≈42 linking
 * dots 2 & 3 (brown/blue at the same ability), and interactive per-dot overlays.
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
const VIEW_W        = 360
const VIEW_H        = 185   // +15 for micro-label row below the axis-endpoint labels
const PLOT_X0       = 10
const PLOT_X1       = 350
const PLOT_W        = PLOT_X1 - PLOT_X0   // 340
const PLOT_H        = 120
const AXIS_Y        = 138
const LABEL_Y       = 155
const MICRO_LABEL_Y = 171   // row below LABEL_Y for the overlap annotation

// ── Overlay dimensions ────────────────────────────────────────────────────────
const OVERLAY_W     = 140   // fixed width of the tooltip rect
const OVERLAY_H     = 38    // fixed height (two text lines + padding)
const OVERLAY_PAD   = 6

// ── Overlap pair rendering constants ─────────────────────────────────────────
// Dots 2 and 3 sit at x=42 and x=43 — near-coincident. Small horizontal nudges
// (≤3 x-units) keep them at their honest positions while ensuring both are
// individually visible. Smaller pip radius so pips don't swallow each other.
const OVERLAP_PIP_R = 7           // radius for the overlap-pair dots (vs 9 for others)
const OVERLAP_NUDGE = 2           // x-units each dot moves away from the midpoint

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
  // Default true: no-matchMedia environments (jsdom, SSR) render final state immediately.
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    // Guard inside the effect — hooks are always called unconditionally.
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
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
  /** When a saved session exists, the footer offers resume instead of a bare
   *  start — the visual landing still shows for returning visitors. */
  onContinue?: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function IntroLanding({ onStart, onContinue }: IntroLandingProps) {
  const reduced = usePrefersReducedMotion()

  // How many dots are "popped in" so far during animation
  const [dotsVisible, setDotsVisible] = useState(reduced ? INTRO_DOTS.length : 0)
  const [curvesVisible, setCurvesVisible] = useState(reduced)
  const [bracketVisible, setBracketVisible] = useState(reduced)

  // Active overlay dot (n value)
  const [activeDot, setActiveDot] = useState<number | null>(null)

  // Track the last pointer type to distinguish touch vs mouse
  const lastPointerType = useRef<string>('mouse')

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

  // Handle SVG background click (dismiss overlay)
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    // Only dismiss if the click target is the SVG root or a non-dot element
    const target = e.target as Element
    if (!target.closest('[data-intro-dot]')) {
      setActiveDot(null)
    }
  }

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
        All Models are Wrong, Some are useful, Belt Colors are only moderately so.
      </h1>

      {/* ── SVG hero chart ── */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{
          width: '100%',
          display: 'block',
          marginBottom: 8,
          overflow: 'visible',
        }}
        role="img"
        aria-label="Bell curves showing the ability distribution for each belt. A blue belt with a wrestling background and a brown belt who is out of shape can have the same ability score — the overlap pair shows belt rank and ability diverge."
        onClick={handleSvgClick}
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

        {/* Overlap bracket — clear connector linking dots 2 and 3.
            Always in DOM; opacity-only animation prevents layout shift. */}
        <g
          data-intro-bracket
          style={{
            opacity: bracketVisible ? 1 : 0,
            transition: reduced ? 'none' : 'opacity 0.3s ease-in',
          }}
        >
          {/* Vertical connector — solid 1.5px in --accent, to the right of dots */}
          <line
            x1={overlapX + 14} y1={bracketTop - 5}
            x2={overlapX + 14} y2={bracketBottom + 5}
            stroke="var(--accent)"
            strokeWidth={1.5}
          />
          {/* Top tick */}
          <line
            x1={overlapX + 9}  y1={bracketTop - 5}
            x2={overlapX + 19} y2={bracketTop - 5}
            stroke="var(--accent)"
            strokeWidth={1.5}
          />
          {/* Bottom tick */}
          <line
            x1={overlapX + 9}  y1={bracketBottom + 5}
            x2={overlapX + 19} y2={bracketBottom + 5}
            stroke="var(--accent)"
            strokeWidth={1.5}
          />
          {/* Micro-label — centered in its own row below "Untrained / Elite".
              Anchored to the overlap x so it reads as pointing at the bracket. */}
          <text
            x={overlapX}
            y={MICRO_LABEL_Y}
            fontFamily="var(--font-mono)"
            fontSize={9}
            fill="var(--accent)"
            textAnchor="middle"
          >
            Similar Ability, Different Belts
          </text>
        </g>

        {/* Numbered dots — each belt-colored pip with Plex Mono number */}
        {INTRO_DOTS.map((dot, i) => {
          // Overlap pair (n=2 and n=3): nudge apart so both pips are individually visible.
          const isOverlap = dot.n === 2 || dot.n === 3
          const nudgeDir  = dot.n === 2 ? -1 : dot.n === 3 ? 1 : 0
          const cx = axisToSvgX(dot.x) + nudgeDir * (OVERLAP_NUDGE / 100) * PLOT_W
          const cy = dotSvgY(dot)
          const visible = i < dotsVisible
          const belt = dot.belt as BeltName
          const pipR = isOverlap ? OVERLAP_PIP_R : 9
          const isActive = activeDot === dot.n

          // Dot stroke: overlap pair gets a clear 1px --mat outline so a partly-
          // overlapping back pip still reads; others use the both-extremes rule.
          const dotStroke = isOverlap
            ? 'var(--mat)'
            : belt === 'white' ? 'var(--line)'
            : belt === 'black' ? 'var(--line-strong)'
            : 'var(--belt-white)'

          // Clamp overlay x so [overlayLeft, overlayLeft+OVERLAY_W] stays within [PLOT_X0, PLOT_X1]
          const rawLeft = cx - OVERLAY_W / 2
          const overlayX = Math.max(PLOT_X0, Math.min(rawLeft, PLOT_X1 - OVERLAY_W))

          // Position above the dot; flip below if dot is near the top
          const overlayAbove = cy >= 50
          const overlayY = overlayAbove ? cy - pipR - 8 - OVERLAY_H : cy + pipR + 8

          function handlePointerDown(e: React.PointerEvent) {
            lastPointerType.current = e.pointerType
          }

          function handleClick(e: React.MouseEvent) {
            e.stopPropagation()
            if (lastPointerType.current === 'touch') {
              // Touch: toggle
              setActiveDot(prev => prev === dot.n ? null : dot.n)
            } else {
              // Mouse click (from keyboard Enter/Space or direct click already handled by enter/leave)
              setActiveDot(dot.n)
            }
          }

          function handleMouseEnter() {
            if (lastPointerType.current !== 'touch') {
              setActiveDot(dot.n)
            }
          }

          function handleMouseLeave() {
            if (lastPointerType.current !== 'touch') {
              setActiveDot(null)
            }
          }

          function handleKeyDown(e: React.KeyboardEvent) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setActiveDot(prev => prev === dot.n ? null : dot.n)
            }
          }

          function handleFocus() {
            setActiveDot(dot.n)
          }

          function handleBlur() {
            // Only clear if this dot is currently active; next dot's onFocus re-sets.
            if (activeDot === dot.n) {
              setActiveDot(null)
            }
          }

          return (
            <g
              key={dot.n}
              data-intro-dot={dot.n}
              data-dot-n={dot.n}
              role="button"
              tabIndex={0}
              aria-label={`Dot ${dot.n}: ${dot.label}`}
              aria-expanded={isActive}
              style={{
                opacity: visible ? 1 : 0,
                transition: reduced ? 'none' : 'opacity 0.2s ease-in',
                cursor: 'pointer',
              }}
              onPointerDown={handlePointerDown}
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              {/* Belt-colored circle */}
              <circle
                cx={cx}
                cy={cy}
                r={pipR}
                fill={BELT_FILL[belt]}
                stroke={dotStroke}
                strokeWidth={1.5}
              />
              {/* Focus ring — visible accent stroke when dot is active/focused */}
              {isActive && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={pipR + 3}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              )}
              {/* Number label */}
              <text
                x={cx}
                y={cy + 3}
                fontFamily="var(--font-mono)"
                fontSize={isOverlap ? 9 : 10}
                fontWeight={600}
                fill={belt === 'white' ? 'var(--mat)' : belt === 'black' ? 'var(--ink)' : 'var(--mat)'}
                textAnchor="middle"
              >
                {dot.n}
              </text>

              {/* Per-dot overlay — only visible when this dot is active.
                  pointerEvents:none prevents touch taps on the overlay text
                  from bubbling up to the dot toggle and dismissing it. */}
              {isActive && (
                <g data-dot-overlay={dot.n} style={{ pointerEvents: 'none' }}>
                  <rect
                    x={overlayX}
                    y={overlayY}
                    width={OVERLAY_W}
                    height={OVERLAY_H}
                    rx={4}
                    fill="var(--mat)"
                    stroke="var(--line)"
                    strokeWidth={1}
                  />
                  <text
                    x={overlayX + OVERLAY_PAD}
                    y={overlayY + OVERLAY_PAD + 10}
                    fontFamily="var(--font-body)"
                    fontSize={10}
                    fill="var(--ink)"
                  >
                    {dot.label}
                  </text>
                  <text
                    x={overlayX + OVERLAY_PAD}
                    y={overlayY + OVERLAY_PAD + 24}
                    fontFamily="var(--font-mono)"
                    fontSize={9}
                    fill="var(--ink-2)"
                  >
                    x{dot.x}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {/* ── Hint line ── */}
      <p className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', margin: '0 0 12px', textAlign: 'center' }}>
        Tap a dot to see who&apos;s who
      </p>

      {/* ── Explanation ── */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--ink-2)',
          margin: '0 0 20px',
          lineHeight: 1.6,
        }}
      >
        r&nbsp;≈&nbsp;0.29 means a weak positive correlation. People sometimes square it
        (r&sup2;&nbsp;≈&nbsp;0.29&sup2;&nbsp;≈&nbsp;0.084&nbsp;=&nbsp;8%) for simple linear models. For our BJJ context it just
        means that &ldquo;self-assessment of skills is not that accurate&rdquo; — self-assessment and actual skill
        are related, but only modestly. Why bother? To directionally identify areas to work on, and some
        amount of introspection can&apos;t hurt. When answering, picture the vast range of all the
        people you&apos;ve trained with; the young prodigies, the octopus-like purple belt leg-locker addict,
        the slow-heavy older black belt, the tiny brown belt with impeccable technique, the flow-gods,
        the omg-so-heavy-wtf wizards able to redirect and pinpoint their weight effortlessly where it
        stalls you the most, etc. Think &apos;Where does my game start to struggle?&apos;, answer honestly,
        perhaps get some insights.
      </p>

      {/* ── Footer: resume when a session exists, else start ── */}
      {onContinue ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn" onClick={onContinue}>
            Continue where you left off
          </button>
          <button className="btn-quiet" onClick={onStart}>
            Start over
          </button>
        </div>
      ) : (
        <button className="btn" onClick={onStart}>
          Start the sweep
        </button>
      )}
    </div>
  )
}
