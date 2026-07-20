/**
 * HeatMap — band heat grid (Task 2, verdict #5)
 *
 * Single-hue indigo ramp keyed to bands. 5 cells per row.
 * Unscored cells: hatch/outline only — gaps visible, never hidden.
 * Scored cells: fill = accent at band opacity, shortName + score.
 * Each cell has role="cell" and aria-label for a11y.
 * Hand-rolled SVG grid via CSS. Tokens only.
 */
import type { CategoryScore, Band } from '../../lib/results/score'

interface HeatMapProps {
  categories: CategoryScore[]
}

// Band → fill opacity on --accent
const BAND_OPACITY: Record<Band, number> = {
  Unmapped: 0,   // use --surface for Unmapped
  Learning: 0.25,
  Drilling: 0.45,
  Positional: 0.65,
  Rolling: 0.85,
  Weapon: 1.0,
}

function getCellBackground(band: Band | null): string {
  if (band === null) return 'transparent'
  if (band === 'Unmapped') return 'var(--surface)'
  const opacity = BAND_OPACITY[band]
  // Build a color-mix or use inline style with opacity
  return `color-mix(in srgb, var(--accent) ${Math.round(opacity * 100)}%, transparent)`
}

function ariaLabel(name: string, band: Band | null): string {
  return `${name}: ${band ?? 'not yet mapped'}`
}

function shortLabel(shortName: string | undefined, name: string): string {
  return shortName ?? name
}

// Hatch pattern as a CSS background (SVG data URI)
// %2339415A equals var(--line) #39415A — CSS custom properties cannot reach inside SVG data URIs; keep in sync with tokens.css
const HATCH_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cline x1='0' y1='0' x2='0' y2='6' stroke='%2339415A' stroke-width='0.5'/%3E%3C/svg%3E\")"

export function HeatMap({ categories }: HeatMapProps) {
  const positional = categories.filter(c => c.axis === 'positional')
  if (positional.length === 0) return null

  // Group categories into rows of 5 for proper ARIA table > row > cell structure
  const rows: CategoryScore[][] = []
  for (let i = 0; i < positional.length; i += 5) {
    rows.push(positional.slice(i, i + 5))
  }

  return (
    <div
      data-testid="heat-map"
      role="table"
      aria-label="Skill heat map"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 4,
        maxWidth: 340,
        margin: '0 auto',
      }}
    >
      {rows.map((row, rowIdx) => (
        <div key={`row-${rowIdx}`} role="row" style={{ display: 'contents' }}>
          {row.map(cat => {
            const isUnscored = cat.score === null
            const label = shortLabel(cat.shortName, cat.name)

            return (
              <div
                key={cat.categoryId}
                role="cell"
                aria-label={ariaLabel(cat.name, cat.band)}
                style={{
                  position: 'relative',
                  height: 48,
                  borderRadius: 3,
                  border: '1px solid var(--line)',
                  background: isUnscored
                    ? `${HATCH_BG}, transparent`
                    : getCellBackground(cat.band),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: isUnscored ? 'var(--ink-2)' : 'var(--ink)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    padding: '0 2px',
                    wordBreak: 'break-word',
                  }}
                >
                  {label}
                </span>
                {cat.score !== null && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 8,
                      color: 'var(--ink-2)',
                    }}
                  >
                    {cat.score}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
