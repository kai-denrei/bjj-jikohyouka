import { useState } from 'react'
import type { Intake } from '../lib/results/types'
import '../styles/tokens.css'

export interface IntakeStepProps {
  onSubmit: (intake: Intake | null) => void
}

export function IntakeStep({ onSubmit }: IntakeStepProps) {
  const [belt, setBelt] = useState<string | null>(null)
  const [years, setYears] = useState<string | null>(null)
  const [style, setStyle] = useState<string | null>(null)
  const [sessionsPerWeek, setSessionsPerWeek] = useState<string | null>(null)

  const isComplete = belt && years && style && sessionsPerWeek

  const handleContinue = () => {
    if (isComplete) {
      onSubmit({
        belt: belt as any,
        years: years as any,
        style: style as any,
        sessionsPerWeek: sessionsPerWeek as any,
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
        Your belt changes what a strong profile looks like. This stays on your device.
      </p>

      {/* Belt */}
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Belt</legend>
        <div className="chip-row">
          {['White', 'Blue', 'Purple', 'Brown', 'Black'].map((label) => (
            <button
              key={label}
              type="button"
              className="chip"
              aria-pressed={belt === label.toLowerCase() ? 'true' : 'false'}
              onClick={() => setBelt(label.toLowerCase())}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Time training */}
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Time training</legend>
        <div className="chip-row">
          {[
            { label: '<1 yr', value: '<1' },
            { label: '1–3 yrs', value: '1-3' },
            { label: '3–6 yrs', value: '3-6' },
            { label: '6–10 yrs', value: '6-10' },
            { label: '10+ yrs', value: '10+' },
          ].map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={years === value ? 'true' : 'false'}
              onClick={() => setYears(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Style */}
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Style</legend>
        <div className="chip-row">
          {[
            { label: 'Gi', value: 'gi' },
            { label: 'No-gi', value: 'nogi' },
            { label: 'Both', value: 'both' },
          ].map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={style === value ? 'true' : 'false'}
              onClick={() => setStyle(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Sessions per week */}
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Sessions per week</legend>
        <div className="chip-row">
          {[
            { label: '1–2', value: '1-2' },
            { label: '3–4', value: '3-4' },
            { label: '5+', value: '5+' },
          ].map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={sessionsPerWeek === value ? 'true' : 'false'}
              onClick={() => setSessionsPerWeek(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          type="button"
          className="btn"
          disabled={!isComplete}
          onClick={handleContinue}
        >
          Continue
        </button>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => onSubmit(null)}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
