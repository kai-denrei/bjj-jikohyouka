import type { Scale } from '../../lib/bank/schema'
import '../../styles/tokens.css'

export interface TapScaleProps {
  scale: Scale
  value: number | null
  onChange: (v: number | null) => void
}

const BELT_NAMES = ['white', 'blue', 'purple', 'brown', 'black'] as const
type BeltName = typeof BELT_NAMES[number]

// Map anchor value (1-5) to belt name for belt_threshold scale
function beltForValue(v: number): BeltName | null {
  const map: Record<number, BeltName> = { 1: 'white', 2: 'blue', 3: 'purple', 4: 'brown', 5: 'black' }
  return map[v] ?? null
}

export function TapScale({ scale, value, onChange }: TapScaleProps) {
  const isBeltThreshold = scale.id === 'belt_threshold'
  const isSlider = scale.kind === 'slider'

  // slider10 legacy: render 10 numeric chips 1-10
  if (isSlider) {
    const chips = Array.from({ length: 10 }, (_, i) => i + 1)
    const firstLabel = scale.anchors[0]?.label ?? ''
    const lastLabel = scale.anchors[scale.anchors.length - 1]?.label ?? ''
    return (
      <div>
        <div className="chip-row">
          {chips.map((n) => (
            <button
              key={n}
              className="chip"
              aria-pressed={value === n ? 'true' : 'false'}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--ink-2)' }}>
          <span>{firstLabel}</span>
          <span>{lastLabel}</span>
        </div>
      </div>
    )
  }

  // Determine layout: horizontal row for ≤3 anchors or belt_threshold
  const anchors = scale.anchors
  const useRow = anchors.length <= 3 || isBeltThreshold

  const chips = anchors.map((anchor) => {
    const belt = isBeltThreshold ? beltForValue(anchor.value) : null
    return (
      <button
        key={anchor.value}
        className="chip"
        aria-pressed={value === anchor.value ? 'true' : 'false'}
        onClick={() => onChange(anchor.value)}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {belt && <span className="belt-dot" data-belt={belt} />}
        {anchor.label}
      </button>
    )
  })

  // N/A chip (only when scale.na === true)
  const naChip = scale.na ? (
    <button
      key="na"
      className="chip"
      aria-pressed={value === null ? 'true' : 'false'}
      onClick={() => onChange(null)}
    >
      N/A
    </button>
  ) : null

  if (useRow) {
    return (
      <div className="chip-row">
        {chips}
        {naChip}
      </div>
    )
  }

  // Vertical stack for ≥4 anchors
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {chips}
      {naChip}
    </div>
  )
}
