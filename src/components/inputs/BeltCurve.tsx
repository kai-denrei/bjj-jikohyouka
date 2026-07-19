import type { Scale } from '../../lib/bank/schema'
import '../../styles/tokens.css'

export interface BeltCurveProps {
  scale: Scale
  value: number[] | null
  onChange: (v: number[]) => void
}

// BeltCurve renders 5 belt columns, each with 10 stacked tap cells (1–10)
// Columns correspond to scale.anchors (W, B, P, Br, Bk order)
// value is number[5], null until first tap; untouched columns default to 5
export function BeltCurve({ scale, value, onChange }: BeltCurveProps) {
  const anchors = scale.anchors // should be 5 anchors

  function handleTap(colIndex: number, cellValue: number) {
    const current = value ?? [5, 5, 5, 5, 5]
    const next = [...current]
    next[colIndex] = cellValue
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {anchors.map((anchor, colIndex) => {
        const colValue = value ? value[colIndex] : null
        return (
          <div key={anchor.value} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-2)', marginBottom: 4 }}>
              {anchor.label}
            </div>
            {Array.from({ length: 10 }, (_, i) => {
              const cellVal = 10 - i // render 10 at top, 1 at bottom
              const isSelected = colValue === cellVal
              return (
                <button
                  key={cellVal}
                  className="chip"
                  aria-pressed={isSelected ? 'true' : 'false'}
                  aria-label={`${anchor.label}: ${cellVal} of 10`}
                  onClick={() => handleTap(colIndex, cellVal)}
                  style={{ padding: '4px 8px', minHeight: 'var(--tap)' }}
                >
                  {cellVal}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
