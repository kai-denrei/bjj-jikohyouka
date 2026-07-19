import { useState, useRef, useEffect } from 'react'
import type { Question, Bank } from '../lib/bank/schema'
import type { StoredAnswer } from '../lib/results/types'
import { QuestionInput } from './inputs/QuestionInput'
import { QuestionCard } from './QuestionCard'
import { InfoPanel } from './InfoPanel'
import { AdminEditor } from './AdminEditor'

function usePrefersReducedMotion(): boolean {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

export interface QuestionScreenProps {
  questions: Question[]
  answers: Record<string, StoredAnswer>
  onAnswer: (a: StoredAnswer) => void
  onDone: () => void
  withinRunCounter?: boolean
  bank: Bank
  initialIndex?: number
  admin?: boolean
}

export function QuestionScreen({ questions, answers, onAnswer, onDone, withinRunCounter, bank, initialIndex = 0, admin = false }: QuestionScreenProps) {
  const [index, setIndex] = useState(initialIndex)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Guard: if there are no questions, fire onDone immediately so the user is never stranded
  useEffect(() => {
    if (questions.length === 0) {
      onDone()
    }
  }, []) // fire once on mount

  // Sync index when initialIndex changes (e.g. mid-sweep resume jump)
  useEffect(() => {
    if (pendingTimer.current !== null) {
      clearTimeout(pendingTimer.current)
      pendingTimer.current = null
    }
    setIndex(initialIndex)
  }, [initialIndex])

  // Clear any pending advance timer on unmount
  useEffect(() => {
    return () => {
      if (pendingTimer.current !== null) {
        clearTimeout(pendingTimer.current)
        pendingTimer.current = null
      }
    }
  }, [])

  const current = questions[index]

  const scale = current ? bank.scales.find(s => s.id === current.input) : null

  const currentValue = current ? (answers[current.qid]?.raw ?? null) : null

  function advance() {
    if (index >= questions.length - 1) {
      onDone()
    } else {
      setIndex(i => i + 1)
    }
  }

  function handleAnswer(raw: number | number[] | null) {
    if (!current) return
    // Cancel any pending advance from a previous answer before scheduling a new one
    if (pendingTimer.current !== null) {
      clearTimeout(pendingTimer.current)
      pendingTimer.current = null
    }
    const stored: StoredAnswer = { qid: current.qid, v: current.v, raw }
    onAnswer(stored)
    if (reducedMotion) {
      advance()
    } else {
      pendingTimer.current = setTimeout(() => {
        pendingTimer.current = null
        advance()
      }, 250)
    }
  }

  function handleBack() {
    if (index > 0) {
      // Cancel any pending advance so Back doesn't race with the timer
      if (pendingTimer.current !== null) {
        clearTimeout(pendingTimer.current)
        pendingTimer.current = null
      }
      setIndex(i => i - 1)
    }
  }

  if (!current || !scale) return null

  const isAxisScale = scale.kind === 'axis'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {withinRunCounter && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
            {index + 1} of {questions.length}
          </span>
        </div>
      )}
      {isAxisScale && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
      )}
      <QuestionCard question={current} />
      <QuestionInput
        scale={scale}
        value={currentValue}
        onChange={handleAnswer}
        resetKey={current.qid}
      />
      {index > 0 && (
        <button type="button" className="btn-quiet" onClick={handleBack}>
          Back
        </button>
      )}
      <AdminEditor key={current.qid} question={current} onSaved={() => {}} admin={admin} />
      <InfoPanel open={infoPanelOpen} onClose={() => setInfoPanelOpen(false)} />
    </div>
  )
}
