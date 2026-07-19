import type { Band, CategoryScore } from '../../lib/results/score'

const NEXT_BAND: Record<Band, Band | null> = {
  Unmapped: 'Learning',
  Learning: 'Drilling',
  Drilling: 'Positional',
  Positional: 'Rolling',
  Rolling: 'Weapon',
  Weapon: null,
}

interface BandListProps {
  categories: CategoryScore[]
  onRetakeCategory: (categoryId: string) => void
  prevScores?: Record<string, number | null>
}

export function BandList({ categories, onRetakeCategory, prevScores }: BandListProps) {
  const scored = categories
    .filter(c => c.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number))

  const unscored = categories.filter(c => c.score === null)

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {scored.map(cat => (
        <BandRow
          key={cat.categoryId}
          cat={cat}
          onRetake={onRetakeCategory}
          prevScore={prevScores?.[cat.categoryId] ?? null}
        />
      ))}
      {unscored.length > 0 && (
        <>
          <li
            style={{
              padding: '8px 0 4px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--ink-2)',
              borderTop: '1px solid var(--line)',
              marginTop: 8,
            }}
          >
            Not yet mapped
          </li>
          {unscored.map(cat => (
            <li
              key={cat.categoryId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--line)',
                gap: 8,
              }}
            >
              <span style={{ color: 'var(--ink-2)' }}>{cat.name}</span>
              <button
                className="btn-quiet"
                style={{ width: 'auto', minHeight: 'unset', padding: '4px 10px', fontSize: 13 }}
                onClick={() => onRetakeCategory(cat.categoryId)}
              >
                Sharpen
              </button>
            </li>
          ))}
        </>
      )}
    </ul>
  )
}

interface BandRowProps {
  cat: CategoryScore
  onRetake: (id: string) => void
  prevScore: number | null
}

function BandRow({ cat, onRetake, prevScore }: BandRowProps) {
  return (
    <li
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        padding: '10px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {/* Category name */}
      <span style={{ fontWeight: 500, flex: '1 1 120px' }}>{cat.name}</span>

      {/* Band chip */}
      <span className="mono" style={{ background: 'var(--mat)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--line)' }}>
        {cat.band}
      </span>

      {/* Score */}
      <span className="mono">{cat.score} / 100</span>

      {/* Retake diff */}
      {prevScore !== null && (
        <span className="mono" style={{ color: 'var(--ink-2)' }}>
          then {prevScore} → now {cat.score}
        </span>
      )}

      {/* To next band */}
      {cat.toNextBand !== null && cat.band !== null && NEXT_BAND[cat.band] !== null && (
        <span className="mono" style={{ color: 'var(--ink-2)' }}>
          +{cat.toNextBand} to {NEXT_BAND[cat.band]}
        </span>
      )}

      {/* Wide uncertainty caveat */}
      {cat.uncertainty === 'wide' && (
        <span style={{ fontSize: 12, color: 'var(--ink-2)', width: '100%' }}>
          rough estimate — drill down to sharpen
        </span>
      )}

      {/* Sharpen button */}
      <button
        className="btn-quiet"
        style={{ width: 'auto', minHeight: 'unset', padding: '4px 10px', fontSize: 13 }}
        onClick={() => onRetake(cat.categoryId)}
      >
        Sharpen
      </button>
    </li>
  )
}
