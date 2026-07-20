import { useState } from 'react'
import type { Question } from '../lib/bank/schema'
import type { LintWarning } from '../lib/bank/lint'

export interface AdminEditorProps {
  question: Question
  onSaved: () => void
  admin: boolean
}

// Derive which file a question belongs to based on axis
function fileForQuestion(question: Question): 'positional' | 'meta-qualities' | 'reputation' {
  if (question.axis === 'meta') return 'meta-qualities'
  if (question.axis === 'reputation') return 'reputation'
  return 'positional'
}

export function AdminEditor({ question, onSaved, admin }: AdminEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState(question.text)
  const [what, setWhat] = useState(question.slots?.what ?? '')
  const [problem, setProblem] = useState(question.slots?.problem ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [warnings, setWarnings] = useState<LintWarning[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!admin || !import.meta.env.DEV) return null
  if (question.status !== 'draft') return null

  if (!expanded) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => setExpanded(true)}
        >
          Edit
        </button>
      </div>
    )
  }

  async function handleSave() {
    setStatus('saving')
    setErrorMsg(null)
    setWarnings([])

    const changes: { text?: string; slots?: { what: string; problem: string } } = question.slots
      ? { slots: { what, problem } }
      : { text }

    try {
      const res = await fetch('/__bank/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: fileForQuestion(question),
          qid: question.qid,
          changes,
        }),
      })
      const data = await res.json() as { ok: boolean; warnings?: LintWarning[]; error?: string }
      if (data.ok) {
        setWarnings(data.warnings ?? [])
        setStatus('saved')
        setTimeout(() => {
          onSaved()
          window.location.reload()
        }, 600)
      } else {
        setErrorMsg(data.error ?? 'Unknown error')
        setStatus('error')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setStatus('error')
    }
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {question.slots ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor={`admin-what-${question.qid}`} style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              what
            </label>
            <input
              id={`admin-what-${question.qid}`}
              aria-label="what"
              type="text"
              value={what}
              onChange={e => setWhat(e.target.value)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                padding: '6px 8px',
                border: '1px solid var(--line)',
                borderRadius: 4,
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor={`admin-problem-${question.qid}`} style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              problem
            </label>
            <input
              id={`admin-problem-${question.qid}`}
              aria-label="problem"
              type="text"
              value={problem}
              onChange={e => setProblem(e.target.value)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                padding: '6px 8px',
                border: '1px solid var(--line)',
                borderRadius: 4,
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
            />
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor={`admin-text-${question.qid}`} style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            text
          </label>
          <textarea
            id={`admin-text-${question.qid}`}
            aria-label="text"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              padding: '6px 8px',
              border: '1px solid var(--line)',
              borderRadius: 4,
              background: 'var(--bg)',
              color: 'var(--ink)',
              resize: 'vertical',
            }}
          />
        </div>
      )}

      <button
        type="button"
        className="btn"
        onClick={() => void handleSave()}
        disabled={status === 'saving' || status === 'saved'}
      >
        Save
      </button>

      {warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {warnings.map((w, i) => (
            <span key={i} className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              ⚠ {w.kind}: {w.match}
            </span>
          ))}
        </div>
      )}

      {status === 'saved' && (
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          Saved — reloading…
        </span>
      )}

      {status === 'error' && errorMsg && (
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          Error: {errorMsg}
        </span>
      )}

      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
        Edits draft questions only. Saving reloads the page.
      </span>
    </div>
  )
}
