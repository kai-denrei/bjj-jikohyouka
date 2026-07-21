import { useState } from 'react'
import type { Intake } from '../lib/results/types'
import { estimateMatHours, formatHours } from '../lib/results/matHours'
import '../styles/tokens.css'

export interface IntakeStepProps {
  onSubmit: (intake: Intake | null) => void
}

export function IntakeStep({ onSubmit }: IntakeStepProps) {
  const [years, setYears] = useState<Intake['years'] | null>(null)
  const [sessionsPerWeek, setSessionsPerWeek] = useState<Intake['sessionsPerWeek'] | null>(null)

  const isComplete = years !== null && sessionsPerWeek !== null

  const handleContinue = () => {
    if (isComplete) {
      onSubmit({ years: years!, sessionsPerWeek: sessionsPerWeek! })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
        A rough sense of your mat time helps frame the results. This stays on your device.
      </p>

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
              onClick={() => setYears(value as Intake['years'])}
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
              onClick={() => setSessionsPerWeek(value as Intake['sessionsPerWeek'])}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Live hours readout */}
      {isComplete && (
        <div>
          <p
            className="mono"
            style={{ margin: 0, color: 'var(--ink-2)', fontSize: 15 }}
          >
            ≈ {formatHours(estimateMatHours({ years: years!, sessionsPerWeek: sessionsPerWeek! }))} on the mat
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
            assuming ~1.5 h a session, a few weeks off a year
          </p>
        </div>
      )}

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
