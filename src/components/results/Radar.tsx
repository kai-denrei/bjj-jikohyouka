import type { CategoryScore } from '../../lib/results/score'

interface RadarProps {
  categories: CategoryScore[]
}

const SIZE = 320
const CENTER = SIZE / 2
const RINGS = 3
const MAX_RADIUS = CENTER - 56 // leave room for labels
const LABEL_R_OFFSET = 18

// Short display names for radar axis labels — keeps the chart readable at 390px
const SHORT_NAME: Record<string, string> = {
  takedowns: 'Takedowns',
  guard_top: 'Guard Pass',
  guard_bottom: 'Guard Ret.',
  closed_guard_top: 'Closed (T)',
  closed_guard_bottom: 'Closed (B)',
  open_guard_top: 'Open Pass',
  open_guard_bottom: 'Open (B)',
  half_guard_top: 'Half (T)',
  half_guard_bottom: 'Half (B)',
  mount_top: 'Mount (T)',
  mount_bottom: 'Mount (B)',
  back_mount_top: 'Back (T)',
  back_mount_bottom: 'Back (B)',
  leg_locks: 'Leg Locks',
  wrist_locks: 'Wrists',
}

function shortLabel(categoryId: string, fullName: string): string {
  return SHORT_NAME[categoryId] ?? fullName
}

function polarToXY(angle: number, radius: number): { x: number; y: number } {
  // Start from top (−π/2), go clockwise
  const rad = (angle * Math.PI) / 180 - Math.PI / 2
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  }
}

export function Radar({ categories }: RadarProps) {
  // Only positional categories with a non-null score get an axis
  const scored = categories.filter(c => c.axis === 'positional' && c.score !== null)

  if (scored.length < 3) {
    return null
  }

  const n = scored.length
  const angleStep = 360 / n

  // Build polygon points — score is 0-100, normalize to radius
  const polygonPoints = scored
    .map((cat, i) => {
      const angle = i * angleStep
      const r = ((cat.score as number) / 100) * MAX_RADIUS
      const { x, y } = polarToXY(angle, r)
      return `${x},${y}`
    })
    .join(' ')

  // Ring radii at 1/3, 2/3, 3/3 of MAX_RADIUS
  const ringRadii = Array.from({ length: RINGS }, (_, i) => ((i + 1) / RINGS) * MAX_RADIUS)

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="Skill radar"
      overflow="visible"
      style={{ display: 'block', maxWidth: '100%', margin: '0 auto' }}
    >
      {/* Concentric hairline rings */}
      {ringRadii.map(r => (
        <circle
          key={r}
          cx={CENTER}
          cy={CENTER}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={0.5}
        />
      ))}

      {/* Axis spokes */}
      {scored.map((_, i) => {
        const angle = i * angleStep
        const { x, y } = polarToXY(angle, MAX_RADIUS)
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="var(--line)"
            strokeWidth={0.5}
          />
        )
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="var(--accent)"
        fillOpacity={0.2}
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Axis labels — use short names to prevent clipping at 390 px viewport */}
      {scored.map((cat, i) => {
        const angle = i * angleStep
        const labelR = MAX_RADIUS + LABEL_R_OFFSET
        const { x, y } = polarToXY(angle, labelR)
        const textAnchor =
          Math.abs(x - CENTER) < 4 ? 'middle' : x < CENTER ? 'end' : 'start'
        return (
          <text
            key={cat.categoryId}
            x={x}
            y={y}
            fontSize={10}
            fontFamily="'Atkinson Hyperlegible', system-ui, sans-serif"
            fill="var(--ink-2)"
            textAnchor={textAnchor}
            dominantBaseline="middle"
          >
            {shortLabel(cat.categoryId, cat.name)}
          </text>
        )
      })}
    </svg>
  )
}
