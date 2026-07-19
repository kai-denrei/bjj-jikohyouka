import type { Report } from '../lib/results/score'
import type { Bank } from '../lib/bank/schema'

export interface InterimScreenProps {
  report: Report
  onPick: (categoryId: string) => void
  onResults: () => void
  recommended: string[]
  bank: Bank
}

export function InterimScreen({ report: _report, onPick, onResults, recommended, bank }: InterimScreenProps) {
  const positionalCategories = bank.categories.filter(c => c.axis === 'positional')
  const otherCategories = positionalCategories.filter(c => !recommended.includes(c.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ margin: 0 }}>First picture</h2>
        <p style={{ margin: '8px 0 0', color: 'var(--ink-2)' }}>
          Fifteen answers is a sketch. Sharpen the categories that matter to you.
        </p>
      </div>

      {recommended.length > 0 && (
        <div className="chip-row">
          {recommended.map(id => {
            const cat = bank.categories.find(c => c.id === id)
            if (!cat) return null
            return (
              <button key={id} type="button" className="chip" onClick={() => onPick(id)}>
                {cat.name}
              </button>
            )
          })}
        </div>
      )}

      <button type="button" className="btn" onClick={onResults}>
        See results
      </button>

      {otherCategories.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink-2)' }}>Or pick any category</p>
          <div className="chip-row">
            {otherCategories.map(cat => (
              <button key={cat.id} type="button" className="btn-quiet" onClick={() => onPick(cat.id)}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
