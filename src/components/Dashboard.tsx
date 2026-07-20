/**
 * Dashboard.tsx — Task 3, verdict #5
 *
 * Post-sweep hub: replaces InterimScreen.
 * Layout: VizTabs on top → Deep dives rows → Meta section → footer buttons.
 * Dark-palette tokens only (no literals).
 */
import { bank } from '../lib/bankInstance'
import { drilldownQuestions } from '../lib/flow'
import { VizTabs } from './results/VizTabs'
import type { Report } from '../lib/results/score'
import type { AssessmentSession } from '../lib/results/types'

export interface DashboardProps {
  report: Report
  session: AssessmentSession | null
  onPick: (categoryId: string) => void
  onResults: () => void
  availableCategoryIds: Set<string>
  drafts: boolean
  onShowDimensions?: () => void
  /** When true: session was finished & saved — rows become non-clickable, note shown */
  finished?: boolean
  /** Called when user clicks "Start new assessment" in finished mode */
  onStartOver?: () => void
}

/** Count qids in session.answers that belong to drilldown questions for categoryId. */
function answeredDrilldownCount(
  session: AssessmentSession | null,
  categoryId: string,
  drafts: boolean,
): number {
  if (!session) return 0
  const drilldownQs = drilldownQuestions(bank, categoryId, drafts)
  return Object.keys(session.answers).filter(qid =>
    drilldownQs.some(q => q.qid === qid),
  ).length
}

/** CategoryRow component — positional or meta. */
interface CategoryRowProps {
  categoryId: string
  displayName: string
  band: string | null
  isAvailable: boolean
  isCompleted: boolean
  drilldownTotal: number
  drilldownAnswered: number
  onPick: (categoryId: string) => void
  /** When true, always render as a non-clickable div regardless of isAvailable */
  finished?: boolean
}

function CategoryRow({
  categoryId,
  displayName,
  band,
  isAvailable,
  isCompleted,
  drilldownTotal,
  drilldownAnswered,
  onPick,
  finished = false,
}: CategoryRowProps) {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 0',
    borderBottom: '1px solid var(--line)',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    cursor: isAvailable ? 'pointer' : 'default',
    color: 'var(--ink)',
  }

  const inner = (
    <>
      {/* Completed dot */}
      {isCompleted && (
        <span className="mono" style={{ color: 'var(--accent)', flexShrink: 0 }}>
          ●
        </span>
      )}

      {/* Short name */}
      <span style={{ flex: 1, fontWeight: 500 }}>{displayName}</span>

      {/* Band chip */}
      {band && (
        <span
          className="mono"
          style={{
            fontSize: 11,
            padding: '2px 6px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            color: 'var(--ink-2)',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          {band}
        </span>
      )}

      {/* Drill-down state */}
      {drilldownTotal === 0 ? (
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--ink-2)', flexShrink: 0 }}
        >
          Not yet written
        </span>
      ) : (
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', flexShrink: 0 }}>
          {drilldownAnswered}/{drilldownTotal}
        </span>
      )}
    </>
  )

  if (isAvailable && !finished) {
    return (
      <button
        type="button"
        data-testid="category-row"
        style={rowStyle}
        onClick={() => onPick(categoryId)}
        aria-label={`${displayName} drill-down`}
      >
        {inner}
      </button>
    )
  }

  return (
    <div
      data-testid="category-row"
      style={rowStyle}
      aria-label={finished ? `${displayName}` : `${displayName} — not available`}
    >
      {inner}
    </div>
  )
}

export function Dashboard({
  report,
  session,
  onPick,
  onResults,
  availableCategoryIds,
  drafts,
  onShowDimensions,
  finished = false,
  onStartOver,
}: DashboardProps) {
  // Completed categories come from the session
  const completedSet = new Set(session?.completedCategories ?? [])

  // Positional categories in bank order
  const positionalBankCats = bank.categories.filter(c => c.axis === 'positional')
  // Meta categories in bank order
  const metaBankCats = bank.categories.filter(c => c.axis === 'meta')

  function renderCategoryRow(categoryId: string) {
    // Find the score entry for this category
    const scoreEntry = report.categories.find(c => c.categoryId === categoryId)
    const bankCat = bank.categories.find(c => c.id === categoryId)

    const displayName = scoreEntry?.shortName ?? scoreEntry?.name ?? bankCat?.shortName ?? bankCat?.name ?? categoryId
    const band = scoreEntry?.band ?? null

    const drilldownQs = drilldownQuestions(bank, categoryId, drafts)
    const drilldownTotal = drilldownQs.length
    const drilldownAnswered = answeredDrilldownCount(session, categoryId, drafts)

    const isAvailable = availableCategoryIds.has(categoryId)
    const isCompleted = completedSet.has(categoryId)

    return (
      <CategoryRow
        key={categoryId}
        categoryId={categoryId}
        displayName={displayName}
        band={band}
        isAvailable={isAvailable}
        isCompleted={isCompleted}
        drilldownTotal={drilldownTotal}
        drilldownAnswered={drilldownAnswered}
        onPick={onPick}
        finished={finished}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* VizTabs block */}
      <VizTabs categories={report.categories} />

      {/* Deep dives section */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>Deep dives</h2>

        {/* Finished-mode note + start-over button */}
        {finished && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink-2)' }}>
              Saved. Start a new assessment to keep filling the map.
            </p>
            {onStartOver && (
              <button type="button" className="btn" onClick={onStartOver}>
                Start new assessment
              </button>
            )}
          </div>
        )}

        {/* Positional rows */}
        <div style={{ marginBottom: 16 }}>
          {positionalBankCats.map(cat => renderCategoryRow(cat.id))}
        </div>

        {/* Meta section — only rendered when at least one meta category has available drilldowns */}
        {(() => {
          const availableMetaCats = metaBankCats.filter(
            cat => drilldownQuestions(bank, cat.id, drafts).length > 0,
          )
          if (availableMetaCats.length === 0) return null
          return (
            <div>
              <p
                style={{
                  margin: '0 0 4px',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Cross-cutting
              </p>
              {availableMetaCats.map(cat => renderCategoryRow(cat.id))}
            </div>
          )
        })()}
      </div>

      {/* Footer buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={onResults}>
          Full report
        </button>
        {onShowDimensions && (
          <button type="button" className="btn-quiet" onClick={onShowDimensions}>
            What we measure
          </button>
        )}
      </div>
    </div>
  )
}
