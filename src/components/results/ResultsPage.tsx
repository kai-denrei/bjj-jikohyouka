import { useRef, useState, useMemo } from 'react'
import type { Report } from '../../lib/results/score'
import { scoreAnswers } from '../../lib/results/score'
import { exportJSON, importJSON, listHistory, finishSession } from '../../lib/results/store'
import { bank } from '../../lib/bankInstance'
import { BandList } from './BandList'
import { Radar } from './Radar'
import { InfoPanel } from '../InfoPanel'
import type { AssessmentSession, Intake } from '../../lib/results/types'

const BELT_LENS: Record<NonNullable<Intake['belt']>, string> = {
  white:
    'At white belt, survival and escapes are the profile that matters — low guard-passing numbers are expected, not a gap.',
  blue: 'Blue belt is escape season — judge this profile by how rarely you stay stuck.',
  purple: 'Purple is where guard depth typically leads the profile.',
  brown: 'At brown, passing pressure usually carries the profile.',
  black:
    'At black belt the profile is refinement — spread matters more than any single axis.',
}

interface ResultsPageProps {
  report: Report
  onRetakeCategory: (categoryId: string) => void
  availableCategoryIds: Set<string>
  belt?: Intake['belt'] | null
  session?: AssessmentSession | null
  onFinish?: () => void
}

export function ResultsPage({ report, onRetakeCategory, availableCategoryIds, belt, session, onFinish }: ResultsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [finished, setFinished] = useState(false)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)

  // Compute previous scores from history for retake diff
  const history = useMemo(() => listHistory(), [historyVersion])
  const prev = history.find(s => s.bankVersion === report.bankVersion && s.startedAt !== session?.startedAt)
  let prevScores: Record<string, number | null> | undefined
  if (prev) {
    const prevReport = scoreAnswers(prev.answers, bank)
    prevScores = Object.fromEntries(
      prevReport.categories.map(c => [c.categoryId, c.score])
    )
  }

  function handleDownload() {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bjj-assessment.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFinish() {
    if (!session) return
    finishSession(session)
    setHistoryVersion(v => v + 1)
    setFinished(true)
    onFinish?.()
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result
      if (typeof text !== 'string') return
      const result = importJSON(text)
      if (result.ok) {
        setHistoryVersion(v => v + 1)
      } else {
        alert(`Import failed: ${result.error}`)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>Results</h2>

      {/* Belt-stage lens */}
      {belt && (
        <p
          style={{
            fontStyle: 'italic',
            color: 'var(--ink-2)',
            fontSize: 14,
            marginBottom: 16,
            borderLeft: '3px solid var(--line)',
            paddingLeft: 12,
          }}
        >
          {BELT_LENS[belt]}
        </p>
      )}

      {/* Analytic view: BandList */}
      <BandList
        categories={report.categories}
        onRetakeCategory={onRetakeCategory}
        prevScores={prevScores}
        availableCategoryIds={availableCategoryIds}
        sharpenDisabled={finished}
      />

      {/* Radar hero */}
      <div style={{ margin: '32px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div />
          <button
            type="button"
            aria-label="How this chart works"
            onClick={() => setInfoPanelOpen(true)}
            style={{
              width: '24px',
              height: '24px',
              minHeight: '24px',
              padding: 0,
              border: '1px solid var(--line)',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              color: 'var(--ink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            i
          </button>
        </div>
        <Radar categories={report.categories} />
      </div>

      {/* Insights */}
      {report.insights.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 8 }}>
            Insights
          </h3>
          {report.insights.map((insight, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '12px 16px',
                marginBottom: 8,
                fontSize: 14,
              }}
            >
              {insight.text}
            </div>
          ))}
        </section>
      )}

      {/* Footer epigraph */}
      <footer style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 16 }}>
        <p
          style={{
            fontStyle: 'italic',
            color: 'var(--ink-2)',
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          "All models are wrong; some are useful." — George Box
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
          Self-assessment tracks measured skill at about r ≈ .29. Use this as a mirror, not a
          scoreboard.
        </p>

        {/* Export / Import / Finish */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn-quiet"
            style={{ width: 'auto', flex: '1 1 140px' }}
            onClick={handleDownload}
          >
            Download JSON
          </button>
          <button
            className="btn-quiet"
            style={{ width: 'auto', flex: '1 1 140px' }}
            onClick={() => fileInputRef.current?.click()}
          >
            Import JSON
          </button>
          <button
            className="btn-quiet"
            style={{ width: 'auto', flex: '1 1 140px' }}
            onClick={handleFinish}
            disabled={finished || !session}
          >
            {finished ? 'Saved' : 'Finish & save'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      </footer>

      <InfoPanel open={infoPanelOpen} onClose={() => setInfoPanelOpen(false)} />
    </div>
  )
}
