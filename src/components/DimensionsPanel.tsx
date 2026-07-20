/**
 * DimensionsPanel.tsx — Task 4, verdict #5
 *
 * Full-screen panel explaining the dimensions we measure.
 * Mirrors the InfoPanel dialog pattern.
 *
 * Positional list: derived live from the bank (axis=positional) — stays in
 * sync with categories.json automatically.
 * Cross-cutting qualities: hardcoded labels + one-line item text.
 * Source for quality names: src/data/question-bank/questions/meta-qualities.json
 */
import { useEffect } from 'react'
import { bank } from '../lib/bankInstance'

interface DimensionsPanelProps {
  open: boolean
  onClose: () => void
}

/** 15 positional situations — read from the bank so the panel never drifts from categories.json */
const POSITIONAL_CATEGORIES = bank.categories
  .filter(c => c.axis === 'positional')
  .map(c => ({ shortName: c.shortName ?? c.name, description: c.description ?? '' }))

/**
 * 7 cross-cutting qualities — labels hardcoded; one-line text is the `text` field
 * of the first question for each quality in meta-qualities.json.
 * Source: src/data/question-bank/questions/meta-qualities.json
 */
const CROSS_CUTTING_QUALITIES = [
  {
    label: 'Pressure',
    text: 'My top pins — Opponents conceding position before you attack',
  },
  {
    label: 'Connection',
    text: 'In my last 10 transitions between dominant positions, my partner recovered guard before I settled the new position',
  },
  {
    label: 'Composure',
    text: 'Their dominant position — Framing, breathing, and planning before they attack',
  },
  {
    label: 'Timing',
    text: 'A shifted base or broken grip — Entering before they reset',
  },
  {
    label: 'Chaining',
    text: 'My first submission attempt — Their defense feeding your next attack',
  },
  {
    label: 'Defense depth',
    text: 'Their submission setup — Stripping the grip or framing before they reach a finish',
  },
  {
    label: 'Adaptability',
    text: 'An unfamiliar guard style — Finding a passing entry before the first minute ends',
  },
] as const

export function DimensionsPanel({ open, onClose }: DimensionsPanelProps) {
  // Handle Escape key
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  function handleScrimClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleScrimClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dimensions-panel-title"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          maxWidth: '600px',
          width: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.40)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2
            id="dimensions-panel-title"
            style={{ margin: 0, fontFamily: 'var(--font-display)' }}
          >
            What we measure
          </h2>
          <button
            type="button"
            className="btn-quiet"
            onClick={onClose}
            style={{ width: 'auto', minWidth: '80px' }}
          >
            Close
          </button>
        </div>

        {/* Intro */}
        <p style={{ margin: '0 0 20px', fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)' }}>
          Fifteen positional situations, plus the qualities that cut across all of them. This map is version 0.2 — it will be wrong in places, and your feedback reshapes it.
        </p>

        {/* Positional list */}
        <div style={{ marginBottom: '24px' }}>
          {POSITIONAL_CATEGORIES.map(cat => (
            <div
              key={cat.shortName}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid var(--line)',
                fontSize: '14px',
                lineHeight: '1.5',
              }}
            >
              <span style={{ fontWeight: 700 }}>{cat.shortName}</span>
              {' — '}
              <span style={{ color: 'var(--ink-2)' }}>{cat.description}</span>
            </div>
          ))}
        </div>

        {/* Cross-cutting qualities */}
        <div style={{ marginBottom: '20px' }}>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 12,
              color: 'var(--ink-2)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Cross-cutting qualities
          </p>
          {CROSS_CUTTING_QUALITIES.map(q => (
            <div
              key={q.label}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid var(--line)',
                fontSize: '14px',
                lineHeight: '1.5',
              }}
            >
              <span style={{ fontWeight: 700 }}>{q.label}</span>
              {' — '}
              <span style={{ color: 'var(--ink-2)' }}>{q.text}</span>
            </div>
          ))}
        </div>

        {/* Closing line */}
        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--ink-2)' }}>
          Missing something you rate in training partners? That's exactly the feedback that changes the map.
        </p>
      </div>
    </div>
  )
}
