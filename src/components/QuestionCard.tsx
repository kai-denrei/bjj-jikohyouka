import type { Question } from '../lib/bank/schema'

export interface QuestionCardProps {
  question: Question
}

export function QuestionCard({ question }: QuestionCardProps) {
  // If no slots, render legacy behavior: just the full text as an h2
  if (!question.slots) {
    return <h2 style={{ margin: 0 }}>{question.text}</h2>
  }

  const { what, problem } = question.slots

  return (
    <div>
      <div className="mono" style={{ fontSize: 13, letterSpacing: '0.02em', color: 'var(--ink-2)', marginBottom: 12 }}>
        {what}
      </div>
      <h2 style={{ margin: 0 }}>
        {problem.charAt(0).toUpperCase() + problem.slice(1)}
      </h2>
    </div>
  )
}
