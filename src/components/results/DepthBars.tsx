/**
 * DepthBars — depth-sounding bar chart (Task 2, verdict #5)
 *
 * Bars HANG from a top baseline. Deeper bar = deeper game.
 * Sorted descending by score; unscored categories rendered as empty hatch slots at end.
 * Design: --accent fill 0.75, shortName labels, mono score at tip, --line-strong baseline.
 * Hand-rolled SVG. No literals — consume tokens only.
 */
import type { CategoryScore } from '../../lib/results/score'

interface DepthBarsProps {
  categories: CategoryScore[]
}

const CHART_WIDTH = 340
const CHART_HEIGHT = 180
const MAX_BAR_HEIGHT = CHART_HEIGHT - 20 // leave room for score label at tip
const BAR_AREA_TOP = 12 // baseline sits here
const SLOT_WIDTH = 20
const SLOT_GAP = 4
const LABEL_AREA_HEIGHT = 28

// Total SVG height includes label area beneath chart
const SVG_HEIGHT = BAR_AREA_TOP + CHART_HEIGHT + LABEL_AREA_HEIGHT

function shortLabel(shortName: string | undefined, name: string): string {
  return shortName ?? name
}

export function DepthBars({ categories }: DepthBarsProps) {
  const scored = [...categories]
    .filter(c => c.axis === 'positional' && c.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number))

  const unscored = categories.filter(c => c.axis === 'positional' && c.score === null)

  const all = [...scored, ...unscored]
  const n = all.length
  if (n === 0) return null

  // Layout: fit all bars into CHART_WIDTH
  const totalSlots = n
  const slotW = Math.min(SLOT_WIDTH, (CHART_WIDTH - (totalSlots - 1) * SLOT_GAP) / totalSlots)
  const barW = Math.max(slotW - 2, 4)
  const totalUsed = totalSlots * slotW + (totalSlots - 1) * SLOT_GAP
  const startX = (CHART_WIDTH - totalUsed) / 2

  const baselineY = BAR_AREA_TOP // top of bar area = baseline

  return (
    <svg
      data-testid="depth-bars"
      width={CHART_WIDTH}
      height={SVG_HEIGHT}
      viewBox={`0 0 ${CHART_WIDTH} ${SVG_HEIGHT}`}
      aria-label="Depth bar chart"
      overflow="visible"
      style={{ display: 'block', maxWidth: '100%', margin: '0 auto' }}
    >
      {/* Top baseline — strong hairline */}
      <line
        data-testid="baseline"
        x1={0}
        y1={baselineY}
        x2={CHART_WIDTH}
        y2={baselineY}
        stroke="var(--line-strong)"
        strokeWidth={1}
      />

      {scored.map((cat, i) => {
        const score = cat.score as number
        const barH = Math.round((score / 100) * MAX_BAR_HEIGHT)
        const x = startX + i * (slotW + SLOT_GAP)
        const barX = x + (slotW - barW) / 2

        // Bar hangs from baseline
        const barY = baselineY

        return (
          <g key={cat.categoryId}>
            {/* Hanging bar */}
            <rect
              data-score={score}
              x={barX}
              y={barY}
              width={barW}
              height={barH}
              fill="var(--accent)"
              fillOpacity={0.75}
            />
            {/* Score label at bar tip (bottom of bar) */}
            <text
              x={barX + barW / 2}
              y={barY + barH + 10}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--ink-2)"
            >
              {score}
            </text>
            {/* ShortName label below bar area */}
            <text
              x={barX + barW / 2}
              y={baselineY + CHART_HEIGHT + 14}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--ink-2)"
              transform={`rotate(-45, ${barX + barW / 2}, ${baselineY + CHART_HEIGHT + 14})`}
            >
              {shortLabel(cat.shortName, cat.name)}
            </text>
          </g>
        )
      })}

      {/* Unscored: empty hatch slots at the end */}
      {unscored.map((cat, i) => {
        const slotIndex = scored.length + i
        const x = startX + slotIndex * (slotW + SLOT_GAP)
        const slotX = x + (slotW - barW) / 2

        return (
          <g key={cat.categoryId} data-testid="empty-slot">
            {/* Hatch outline */}
            <rect
              x={slotX}
              y={baselineY}
              width={barW}
              height={MAX_BAR_HEIGHT}
              fill="none"
              stroke="var(--line)"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
            {/* ShortName label */}
            <text
              x={slotX + barW / 2}
              y={baselineY + CHART_HEIGHT + 14}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--line)"
              transform={`rotate(-45, ${slotX + barW / 2}, ${baselineY + CHART_HEIGHT + 14})`}
            >
              {shortLabel(cat.shortName, cat.name)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
