import { useState, useRef, useEffect } from 'react'
import type { Question, Bank } from '../lib/bank/schema'
import type { StoredAnswer } from '../lib/results/types'
import { QuestionInput } from './inputs/QuestionInput'

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
  heading: string
  bank: Bank
  initialIndex?: number
}

export function QuestionScreen({ questions, answers, onAnswer, onDone, heading, bank, initialIndex = 0 }: QuestionScreenProps) {
  const [index, setIndex] = useState(initialIndex)
  const reducedMotion = usePrefersReducedMotion()
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="mono" style={{ fontSize: 12 }}>
        {heading} · {index + 1} of {questions.length}
      </div>
      <h2 style={{ margin: 0 }}>{current.text}</h2>
      <QuestionInput
        scale={scale}
        value={currentValue}
        onChange={handleAnswer}
      />
      {index > 0 && (
        <button type="button" className="btn-quiet" onClick={handleBack}>
          Back
        </button>
      )}
    </div>
  )
}
