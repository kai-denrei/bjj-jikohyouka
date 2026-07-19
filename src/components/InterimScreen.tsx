import { Radar } from './results/Radar'
import type { Report } from '../lib/results/score'

export interface InterimScreenProps {
  report: Report
  onPick: (categoryId: string) => void
  onResults: () => void
  recommended: string[]
  availableCategoryIds: Set<string>
}

export function InterimScreen({ report, onPick, onResults, recommended, availableCategoryIds }: InterimScreenProps) {
  // Recommended chips: only those present in availableCategoryIds
  const availableRecommended = recommended.filter(id => availableCategoryIds.has(id))

  // Other chips: categories in the report that have a score, not in recommended, and in availableCategoryIds
  const positionalScored = report.categories.filter(
    c => c.axis === 'positional' && c.score !== null
  )
  const otherAvailable = positionalScored.filter(
    c => !recommended.includes(c.categoryId) && availableCategoryIds.has(c.categoryId)
  )

  const hasAnyDrilldowns = availableRecommended.length > 0 || otherAvailable.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Radar categories={report.categories} />

      <div>
        <h2 style={{ margin: 0 }}>First picture</h2>
        <p style={{ margin: '8px 0 0', color: 'var(--ink-2)' }}>
          Fifteen answers is a sketch. Sharpen the categories that matter to you.
        </p>
      </div>

      {hasAnyDrilldowns ? (
        <>
          {availableRecommended.length > 0 && (
            <div className="chip-row">
              {availableRecommended.map(id => {
                const cat = report.categories.find(c => c.categoryId === id)
                if (!cat) return null
                return (
                  <button key={id} type="button" className="chip" onClick={() => onPick(id)}>
                    {cat.name}
                  </button>
                )
              })}
            </div>
          )}

          {otherAvailable.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink-2)' }}>Or pick any category</p>
              <div className="chip-row">
                {otherAvailable.map(cat => (
                  <button key={cat.categoryId} type="button" className="btn-quiet" onClick={() => onPick(cat.categoryId)}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="mono" style={{ color: 'var(--ink-2)', margin: 0 }}>
          Drill-downs are coming to more categories as questions are approved.
        </p>
      )}

      <button type="button" className="btn" onClick={onResults}>
        See results
      </button>
    </div>
  )
}
